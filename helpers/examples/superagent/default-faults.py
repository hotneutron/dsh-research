"""Bounded engineering failure strata for the unchanged default runtime."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import sqlite3
import subprocess
import time

CASES = ('review-timeout', 'review-unavailable', 'stale-review', 'review-association', 'review-ack-lost',
         'admission-ack-lost', 'admission-ack-delayed', 'protected-off', 'confirmation-off', 'source-drift',
         'tree-deadline', 'running-loss', 'competing-runtime', 'backup-restore')
REVIEW_HOLDS = {'review-timeout', 'review-unavailable', 'stale-review', 'review-ack-lost'}


def qualification_plan(kind, helper):
    prop = ('AUTH-1' if kind.startswith('review-') or kind == 'stale-review' else
            'AUTH-2' if kind.startswith('admission-') else 'DATA-1' if kind in {'protected-off', 'confirmation-off'} else
            'PROV-1' if kind == 'source-drift' else 'EXEC-1' if kind == 'tree-deadline' else
            'STATE-1' if kind == 'competing-runtime' else 'STATE-2' if kind == 'backup-restore' else 'EXEC-3')
    rows = [{'id': f'{prop}:{kind}:primary', 'assertions': ['predicate']},
            {'id': f'AUTH-4:{kind}:replay', 'assertions': ['predicate']},
            {'id': f'STATE-2:{kind}:reopen', 'assertions': ['predicate']},
            {'id': f'AUTH-3:{kind}:stop', 'assertions': ['predicate']}]
    if kind in REVIEW_HOLDS or kind == 'admission-ack-lost':
        rows.append({'id': f'LOOP-3:{kind}:expired-hold', 'assertions': ['predicate']})
    return {'schema_version': 1, 'scope': f'disposable default native fault {kind}; released inputs; confirmation off',
            'budget': {'max_admissions': 1, 'max_evaluator_dispatches': 1, 'max_review_requests': 2,
                       'max_scripted_author_router_requests_per_process': 40, 'max_wall_seconds': 180,
                       'external_model_calls': 0, 'scientific_gpu_dispatches': 0},
            'required_cells': rows, 'assurance': 'fixture_verified; no scientific or enabled-confirmation adoption',
            'source_pins': {str(p.relative_to(helper)): hashlib.sha256(p.read_bytes()).hexdigest() for p in
                            [helper / 'examples/superagent/fault-worker.mjs', helper / 'examples/superagent/fault-evaluate.mjs',
                             helper / 'examples/superagent/default-faults.py', helper / 'examples/superagent/research-worker.mjs',
                             helper / 'examples/synthetic-cpu/fixture.mjs']}}


def process_observation(root):
    registration = json.loads((root / 'research-worker.json').read_text())
    path = Path(registration['process_marker'])
    path.resolve().relative_to(root.resolve())
    marker = json.loads(path.read_text())
    boot = Path('/proc/sys/kernel/random/boot_id').read_text().strip()
    if boot != marker['boot_id']:
        raise ValueError('Process witness belongs to another boot; no PID signalling or quiescence claim permitted')
    processes, unobservable = [], []
    expected_starts = {x['start_ticks'] for x in marker['processes']}
    for p in Path('/proc').iterdir():
        if not p.name.isdecimal(): continue
        try:
            if p.stat().st_uid != os.getuid(): continue
            line = (p / 'stat').read_text(); fields = line[line.rfind(')') + 2:].split()
            # A different kernel start tick cannot be one of the two retained identities.
            # Only potentially matching identities require namespace visibility.
            if fields[19] not in expected_starts: continue
            if os.readlink(p / 'ns/pid') != marker['pid_namespace']: continue
            nsline = next(x for x in (p / 'status').read_text().splitlines() if x.startswith('NSpid:'))
            processes.append({'host_pid': int(p.name), 'namespace_pid': int(nsline.split()[-1]), 'start_ticks': fields[19], 'state': fields[0]})
        except (FileNotFoundError, ProcessLookupError): continue
        except (PermissionError, StopIteration): unobservable.append(int(p.name))
    observations = []
    for item in marker['processes']:
        matches = [p for p in processes if p['namespace_pid'] == item['namespace_pid'] and p['start_ticks'] == item['start_ticks']]
        if len(matches) > 1: raise ValueError('Ambiguous process identity; no signalling or settlement permitted')
        found = matches[0] if matches else {}
        observations.append({**item, 'host_pid': found.get('host_pid'), 'alive_same_process': bool(found) and found['state'] != 'Z', 'state': found.get('state', 'absent')})
    return {'marker': marker, 'observations': observations, 'unobservable_owned_pids': unobservable,
            'all_stopped': not unobservable and not any(x['alive_same_process'] for x in observations)}


def signal_known_process(root, identity, sig):
    if not hasattr(os, 'pidfd_open') or not hasattr(signal, 'pidfd_send_signal'):
        raise ValueError('Stable PID signalling unavailable; cleanup remains unresolved')
    pid = identity['host_pid']; assert pid and pid > 1
    try: fd = os.pidfd_open(pid)
    except ProcessLookupError: return
    try:
        current = process_observation(root)
        if current['unobservable_owned_pids']: raise ValueError('Process observation incomplete; no PID signal permitted')
        exact = next((x for x in current['observations'] if x['host_pid'] == pid and x['namespace_pid'] == identity['namespace_pid']
                      and x['start_ticks'] == identity['start_ticks'] and x['alive_same_process']), None)
        if exact: signal.pidfd_send_signal(fd, sig)
    finally: os.close(fd)


def cleanup_retained_processes(root):
    before = process_observation(root)
    for x in before['observations']:
        if x['alive_same_process']:
            try:
                signal_known_process(root, x, signal.SIGTERM)
            except ProcessLookupError:
                pass
    deadline = time.monotonic() + 2
    while time.monotonic() < deadline:
        if process_observation(root)['all_stopped']:
            break
        time.sleep(0.05)
    for x in process_observation(root)['observations']:
        if x['alive_same_process']:
            signal_known_process(root, x, signal.SIGKILL)
    after = process_observation(root)
    assert after['all_stopped'], after
    return {'before_operator_cleanup': before, 'after_operator_cleanup': after,
            'authority_reservation_released': False}


def compete(root, runtime, home, profile, env, node, cli):
    original = home / 'profiles' / profile
    name = profile + '-contender'
    target = home / 'profiles' / name
    target.mkdir()
    for filename in ['package.json', 'cordis.yml']:
        shutil.copyfile(original / filename, target / filename)
    (target / 'node_modules').symlink_to(runtime / 'node_modules', target_is_directory=True)
    entries = json.loads((original / 'cordis.patch.yml').read_text())
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
    next(x for x in entries if x.get('id') == 'webserver')['config']['port'] = port
    (target / 'cordis.patch.yml').write_text(json.dumps(entries))
    logpath = root / 'contender-private.log'
    with logpath.open('w') as log:
        child = subprocess.Popen([str(node), str(cli), '--profile', name, '--no-open'], cwd=runtime,
                                 env=env, stdout=log, stderr=subprocess.STDOUT)
        try:
            deadline = time.monotonic() + 8
            found = False
            while time.monotonic() < deadline:
                text = logpath.read_text()
                found = 'Lock file is already being held' in text or 'ELOCKED' in text
                if found or child.poll() is not None: break
                time.sleep(0.1)
            assert found, 'Competing native runtime did not demonstrate the state-directory lock refusal'
            return {'native_lock_refused': found, 'same_store_state_directory': True, 'second_profile': name}
        finally:
            if child.poll() is None:
                child.send_signal(signal.SIGINT); child.wait(timeout=15)


def backup_restore(root):
    # Close the only native writer first. This private recovery set restores into a cold tree.
    dest = root / 'private/latest-native-recovery'
    dest.mkdir(parents=True)
    prefixes = ['snapshots', 'local_artifacts/autoresearch/dsh', 'state', '.autoresearch/dsh', 'home/profiles', 'work']
    required = ['research-worker.json', 'qualification-plan.json', 'default-provider.mjs', 'source-cli', 'default-profile.py', 'default-runtime.py', 'default-faults.py']
    records = []
    sources = []
    for prefix in prefixes:
        path = root/prefix
        if path.exists(): sources.extend(sorted(path.rglob('*')))
    sources.extend(root/name for name in required)
    for source in sources:
        if source.name.endswith(('-wal', '-shm')) or (source.is_dir() and not source.is_symlink()): continue
        uri = source.relative_to(root); target = dest/uri; target.parent.mkdir(parents=True, exist_ok=True)
        mode = source.lstat().st_mode & 0o777
        if source.is_symlink():
            # Dependency references stay references; never expand dependency trees.
            link = os.readlink(source); target.symlink_to(link)
            records.append({'uri': str(uri), 'method': 'symlink_reference', 'target': link, 'mode': mode})
            continue
        if not source.is_file(): raise ValueError('Recovery set includes unsupported filesystem entry')
        if source.suffix in {'.sqlite3', '.sqlite', '.db'}:
            src = sqlite3.connect(source.as_uri()+'?mode=ro', uri=True); dst = sqlite3.connect(target)
            try:
                src.backup(dst); assert dst.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
                assert '\n'.join(src.iterdump()) == '\n'.join(dst.iterdump())
            finally: dst.close(); src.close()
            method = 'supported_sqlite_backup'
        else:
            shutil.copyfile(source,target); method = 'exact_file_copy'; assert source.read_bytes() == target.read_bytes()
        target.chmod(0o600)
        records.append({'uri': str(uri), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'method': method, 'mode': mode})
    names = {x['uri'] for x in records}
    assert set(required) <= names
    assert '.autoresearch/dsh/state.sqlite3' in names
    assert any(x.startswith('state/sessions/') for x in names)
    assert any(x.startswith('state/superagent/') for x in names)
    assert any(x.startswith('home/profiles/') and x.endswith('cordis.patch.yml') for x in names)
    # Quarantine the live tree rather than overlaying it. Recovery must supply every required byte itself.
    original = root/'private/quarantined-live-tree'; original.mkdir()
    for name in prefixes+required:
        source=root/name
        if not source.exists() and not source.is_symlink(): continue
        target=original/name; target.parent.mkdir(parents=True,exist_ok=True); source.rename(target)
    for item in records:
        source=dest/item['uri']; target=root/item['uri']; target.parent.mkdir(parents=True,exist_ok=True)
        assert not target.exists() and not target.is_symlink()
        if item['method']=='symlink_reference': target.symlink_to(item['target'])
        else:
            shutil.copyfile(source,target); target.chmod(item['mode'])
            assert hashlib.sha256(target.read_bytes()).hexdigest()==item['sha256']
    return {'source_writer_closed':True, 'source_store_scientific_state_sessions_and_artifacts':True,
            'source_profile_registration_and_cli_restored':True,'cold_tree_restored':True,
            'same_canonical_project_root':True,'files':records,'stale_cut_applied':False,'ordinary_team_release':False,
            'dependency_references':'Pinned installed consumer remains an external prerequisite; not expanded into the private recovery set'}


def run_fault(kind, api, wait, restart, output, runtime, home, profile, env, node, cli):
    facts = {}
    initialized = wait(lambda: (lambda v: v if v.get('research', {}).get('ready') else None)(api('/default-qualification')), 'Fault worker initialization', seconds=60)
    assert initialized['research']['state']['consumed_attempts'] == 0
    api('/default-qualification/research/start', 'POST', {})
    if kind == 'admission-ack-delayed':
        pending = wait(lambda: (lambda v: v if v.get('research', {}).get('fault', {}).get('entered') else None)(api('/default-qualification')), 'Durable delayed admission')
        assert pending['research']['fault']['native_jobs'] == []
        api('/default-qualification/research/fault/release', 'POST', {})
    if kind == 'running-loss':
        wait(lambda: (lambda v: v if v['research']['state']['active_action_id'] else None)(api('/default-qualification')), 'Admitted running fault', seconds=60)
        wait(lambda: process_observation(output), 'Native producer and child process identities')
        api('/default-qualification/research/fault/before-restart', 'POST', {})
        before = api('/default-qualification')
        restart(crash=True, after_stop=lambda: facts.update({'operator_process_cleanup': cleanup_retained_processes(output)}))
        wait(lambda: api('/orchestrator/api/state')['setup']['accounts'], 'Crash reopen default Store', seconds=45)
        wait(lambda: api('/default-qualification'), 'Crash-reopened native Source binding')
        api('/orchestrator/api/executor/pause', 'POST', {'paused': True})
        api('/default-qualification/research/fault/running-recovery', 'POST', {})
        after = wait(lambda: api('/default-qualification'), 'Fault-reopened native Source binding')
    else:
        settled = wait(lambda: (lambda v: v if v['reported'] and v['tickets'] and any(a.get('report') for a in v['tickets'][0]['assignments']) else None)(api('/default-qualification')), 'Native fault report', seconds=60)
        wait(lambda: api('/orchestrator/api/state')['load']['running'] == 0, 'Fault turn completion')
        if kind == 'tree-deadline':
            facts['process_tree'] = process_observation(output)
            assert facts['process_tree']['all_stopped'], facts['process_tree']
            (output / 'snapshots/fault-process-observation.json').write_text(json.dumps(facts['process_tree']))
        if kind == 'competing-runtime':
            facts['writer_fence'] = compete(output, runtime, home, profile, env, node, cli)
            (output / 'snapshots/fault-competing-writer.json').write_text(json.dumps(facts['writer_fence']))
        if kind != 'backup-restore':
            api('/default-qualification/research/fault/primary-record', 'POST', {})
        api('/default-qualification/research/fault/replay', 'POST', {})
        if kind in REVIEW_HOLDS or kind == 'admission-ack-lost':
            api('/default-qualification/research/fault/expired-hold', 'POST', {})
        api('/orchestrator/api/executor/pause', 'POST', {'paused': True})
        api('/default-qualification/research/fault/before-restart', 'POST', {})
        before = api('/default-qualification')
        restart(after_stop=(lambda: facts.update({'recovery_bundle': backup_restore(output)})) if kind == 'backup-restore' else None)
        wait(lambda: api('/orchestrator/api/state')['setup']['accounts'], 'Fault default Store reopen')
        after = wait(lambda: api('/default-qualification'), 'Fault-reopened native Source binding')
        assert after['research']['state'] == before['research']['state']
        assert after['tickets'] == before['tickets']
    if kind == 'running-loss':
        api('/default-qualification/research/fault/primary-record', 'POST', {})
    if kind == 'backup-restore':
        (output / 'snapshots/fault-recovery-proof.json').write_text(json.dumps(facts['recovery_bundle']))
        api('/default-qualification/research/fault/primary-record', 'POST', {})
    api('/default-qualification/research/fault/reopen-record', 'POST', {})
    # Retained observations are write-once. Reopen replay is checked again but does not rewrite the first observation.
    replay = api('/default-qualification/research/fault/replay', 'POST', {})
    ticket = after['tickets'][0]
    latest = api('/orchestrator/api/tickets/' + ticket['id'])
    assert not any(a.get('report', {}).get('human_action') for a in latest.get('assignments', []) if a.get('report'))
    api('/orchestrator/api/tickets/' + ticket['id'] + '/stop', 'POST', {})
    stopped = api('/default-qualification/research/fault/stop-record', 'POST', {})
    assert stopped['coverage']['complete'], stopped['coverage']
    return {'before_restart': before, 'after_restart': after, 'native_coverage': stopped['coverage'], 'facts': facts,
            'state': stopped['state'], 'case': kind, 'human_replies_required': 0}
