#!/usr/bin/env python3
"""Exercise the unchanged default web/Source/Store/DshExecutor in a fresh profile."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import time
import urllib.error
import urllib.request
import uuid


def run(args):
    if args.fault:
        args.automatic = True
    if args.automatic:
        args.research = True
    runtime = Path(args.runtime).resolve(strict=True)
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=False)
    helper = Path(__file__).resolve().parents[2]
    node = runtime / 'node-v24.9.0-linux-x64/bin/node'
    cli = runtime / 'node_modules/@deepseek-ai/dsh/lib/bin.js'
    profile = 'default-qualification-' + uuid.uuid4().hex[:12]
    (output / 'disposable-qualification.json').write_text(json.dumps({'profile': profile, 'scientific_authority': False}) + '\n')
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    home, state = output / 'home', output / 'state'
    # Retain the provider with its profile; imports resolve through the pinned installed consumer.
    (output / 'node_modules').symlink_to(runtime / 'node_modules', target_is_directory=True)
    provider = output / 'default-provider.mjs'
    shutil.copyfile(Path(__file__).with_name('default-provider.mjs'), provider)
    source = output / 'source-cli'
    shutil.copyfile(Path(__file__).with_name('default-source.py'), source)
    source.chmod(0o700)
    profile_tool = helper / 'dist/default-profile.py'
    if not profile_tool.is_file():
        profile_tool = helper / 'scripts/default-profile.py'
    shutil.copyfile(profile_tool, output / 'default-profile.py')
    shutil.copyfile(Path(__file__), output / 'default-runtime.py')
    fault_module = None
    if args.fault:
        path = Path(__file__).with_name('default-faults.py')
        shutil.copyfile(path, output / 'default-faults.py')
        spec = importlib.util.spec_from_file_location('default_qualification_faults', path)
        fault_module = importlib.util.module_from_spec(spec); spec.loader.exec_module(fault_module)
        if args.fault not in fault_module.CASES: raise ValueError('Unknown bounded fault case')
    cmd = ['python3', str(profile_tool), '--project', str(output), '--runtime', str(runtime),
           '--home', str(home), '--state', str(state), '--profile', profile, '--port', str(port), '--qualification-provider', str(provider)]
    prepared = json.loads(subprocess.check_output(cmd, text=True))
    env = {**os.environ, 'DSH_HOME': str(home), 'DSH_RESEARCH_DISPOSABLE_QUALIFICATION': str(output),
           'DSH_RESEARCH_GUARDED_QUALIFICATION': '1' if args.research else '0',
           'DSH_RESEARCH_AUTOMATIC_QUALIFICATION': '1' if args.automatic else '0',
           'DSH_RESEARCH_FAULT_QUALIFICATION': args.fault or '',
           'PATH': str(node.parent) + os.pathsep + os.environ['PATH']}
    log = (output / 'runtime.log').open('w')
    process = None
    receipt_to_publish = None
    calls, cases = [], []
    started_at = time.monotonic()
    qualification_plan = None
    if args.automatic:
        # Frozen before any provider request, reviewer dispatch or evaluator admission.
        qualification_plan = {'schema_version': 1, 'scope': 'scripted released-input default worker; confirmation off',
            'budget': {'max_admissions': 5, 'max_evaluator_dispatches': 4, 'max_review_requests': 6,
                       'max_scripted_author_router_requests_per_process': 40, 'max_wall_seconds': 180,
                       'external_model_calls': 0, 'scientific_gpu_dispatches': 0},
            'required_cells': [
                {'id': 'AUTH-1:native-separate-review', 'assertions': ['distinct_reviewer', 'completed_exact_reviews', 'reviewer_has_no_tools']},
                {'id': 'LOOP-1:native-changed-successor', 'assertions': ['request_changes_then_new_subject', 'negative_then_reviewed_successor', 'human_action_null']},
                {'id': 'FB-1:native-edit-capture', 'assertions': ['two_source_versions', 'durable_cursor_and_dispositions']},
                {'id': 'FB-2:native-actual-effect', 'assertions': ['changed_frozen_action', 'settled_evidence_link']},
                {'id': 'FB-3:publication-retry', 'assertions': ['outage_no_research_hold', 'same_scientific_charge']},
                {'id': 'AUTH-4:native-replay', 'assertions': ['same_action_no_new_charge']},
                {'id': 'EXEC-1:native-deadline', 'assertions': ['terminal_timeout', 'terminal_stopped', 'ineligible', 'no_running_job']},
                {'id': 'PROV-3:native-malformed-output', 'assertions': ['bool_score_refused', 'ineligible']},
                {'id': 'EXEC-3:native-unknown', 'assertions': ['hold_preserves_reservation', 'replay_no_new_charge']},
                {'id': 'STATE-2:native-reopen', 'assertions': ['identical_state', 'retained_feedback_reviews_publications']},
                {'id': 'AUTH-3:native-stop', 'assertions': ['ended_ticket_refuses_tool']}],
            'assurance': 'scripted native engineering; no semantic or universal property qualification',
            'source_pins': {str(p.relative_to(helper)): hashlib.sha256(p.read_bytes()).hexdigest() for p in
                            [helper / 'examples/superagent/research-worker.mjs', helper / 'examples/superagent/automatic-worker.mjs',
                             helper / 'examples/synthetic-cpu/fixture.mjs']}}
        if fault_module: qualification_plan = fault_module.qualification_plan(args.fault, helper)
        (output / 'qualification-plan.json').write_text(json.dumps(qualification_plan, indent=2) + '\n')

    def api(path, method='GET', body=None, expected=200):
        request = urllib.request.Request(f'http://127.0.0.1:{port}' + path, method=method,
            headers={'x-orchestrator-request': '1', 'content-type': 'application/json'},
            data=None if body is None else json.dumps(body).encode())
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                status, value = response.status, json.load(response)
        except urllib.error.HTTPError as error:
            status, raw = error.code, error.read()
            try:
                value = json.loads(raw)
            except ValueError:
                value = {'error': raw.decode(errors='replace')[:500]}
        recorded = value
        if method == 'GET' and path == '/default-qualification' and status == 200:
            research = value.get('research') or {}
            state_view = research.get('state') or {}
            recorded = {'snapshot_summary': True, 'ready': research.get('ready'), 'reported': value.get('reported'),
                        'tickets': len(value.get('tickets', [])), 'requests': len(value.get('requests', [])),
                        'state_revision': state_view.get('revision'), 'consumed_attempts': state_view.get('consumed_attempts'),
                        'reserved_timeout_ms': state_view.get('reserved_timeout_ms')}
        if len(calls) < 1024:
            calls.append({'path': path, 'method': method, 'status': status, 'response': recorded})
        assert status == expected, (path, status, value)
        return value

    def wait(predicate, description, seconds=30):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError('DSH exited; see runtime.log')
            try:
                value = predicate()
                if value:
                    return value
            except (OSError, AssertionError):
                pass
            time.sleep(0.15)
        raise TimeoutError(description)

    def start():
        return subprocess.Popen([str(node), str(cli), '--profile', profile, '--no-open'],
                                cwd=runtime, env=env, stdout=log, stderr=subprocess.STDOUT)

    def restart_fault(crash=False, after_stop=None):
        nonlocal process
        process.send_signal(signal.SIGKILL if crash else signal.SIGINT)
        process.wait(timeout=30)
        if after_stop: after_stop()
        if crash:
            # The existing native writer lock has a 30-second stale interval.
            time.sleep(35)
        process = start()

    def save(block, value):
        current = api('/orchestrator/api/settings')
        view = next(x for x in current['sources'] if x['id'] == block[7:]) if block.startswith('source:') else current['blocks'][block]
        result = api('/orchestrator/api/settings/' + block, 'PUT', {'value': value, 'revision': view['revision']})
        if result.get('restarting'):
            # Native setup restarts after returning the save response. Let it finish before the next write.
            time.sleep(0.5)
            wait(lambda: api('/orchestrator/api/state'), 'Post-save runtime management')
        return result

    try:
        process = start()
        wait(lambda: api('/orchestrator/api/state'), 'Initial management API')
        api('/orchestrator/api/executor/pause', 'POST', {'paused': True})
        # Save all non-account blocks while setup is pending; then resolve fixture accounts last.
        save('eval', {'mode': 'observe', 'model': {'provider': 'default-qualification', 'model': 'router'}})
        save('executor', {'model': {'provider': 'default-qualification', 'model': 'worker'}, 'maxWorkers': 1,
                          'directory': str(output / 'work'), 'prepare': '', 'blockedCommands': []})
        save('policy', {'rules': [], 'sources': {'github': {'allowed': [{'id': 'fixture-owner'}]}}})
        save('source:github', {'enabled': True, 'config': {'repository': 'fixture/default-runtime', 'cli': str(source)}})
        wait(lambda: api('/orchestrator/api/state')['setup']['accounts'], 'Default setup completion')
        wait(lambda: api('/default-qualification'), 'Qualification SourceHost binding')
        current = api('/orchestrator/api/settings')
        stale = current['blocks']['executor']['revision']
        value = {**current['blocks']['executor']['value'], 'maxWorkers': 2}
        api('/orchestrator/api/settings/executor', 'PUT', {'value': value, 'revision': stale})
        api('/orchestrator/api/settings/executor', 'PUT', {'value': value, 'revision': stale}, expected=409)
        save('executor', {**value, 'maxWorkers': 1})
        configured_source = next(x for x in api('/orchestrator/api/settings')['sources'] if x['id'] == 'github')['value']
        save('source:github', {**configured_source, 'enabled': False})
        assert api('/default-qualification/filtered', 'POST', {})['result'] == 'filtered'
        save('source:github', configured_source)
        baseline = api('/default-qualification')
        injected = api('/default-qualification/inject', 'POST', {})
        assert [x['result'] for x in injected['results'][:2]] == ['stored', 'duplicate']
        assert injected['results'][2]['human'] is False
        paused = api('/default-qualification')
        assert paused['tickets'] == [] and len(paused['requests']) == len(baseline['requests'])
        cases.append({'id': 'source-normalization-allowlist-dedup-paused', 'status': 'passed'})
        api('/orchestrator/api/executor/pause', 'POST', {'paused': False})
        if fault_module:
            result = fault_module.run_fault(args.fault, api, wait, restart_fault, output, runtime, home, profile, env, node, cli)
            result.update({'schema_version': 1, 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
                'scope': 'bounded native default fault stratum; no scientific authority or protected inputs',
                'prepared': prepared, 'qualification_wall_seconds': time.monotonic() - started_at,
                'qualification_plan_sha256': hashlib.sha256((output / 'qualification-plan.json').read_bytes()).hexdigest(),
                'external_model_calls': 0, 'scientific_dispatches': 0, 'external_messages': 0,
                'cases': [{'id': args.fault, 'status': 'passed'}],
                'limitations': ['This finite fault stratum cannot qualify semantic science, enabled confirmation or legacy authority handoff']})
            assert result['qualification_wall_seconds'] <= qualification_plan['budget']['max_wall_seconds']
            assert result['state']['consumed_attempts'] <= qualification_plan['budget']['max_admissions']
            assert result['state']['consumed_review_requests'] <= qualification_plan['budget']['max_review_requests']
            receipt_to_publish = result
            return result
        if args.research:
            initialized = wait(lambda: (lambda x: x if x.get('research', {}).get('ready') else None)(api('/default-qualification')), 'Guarded default worker initialization')
            assert initialized['research']['state']['consumed_attempts'] == 0
            if not args.automatic:
                api('/default-qualification/research/refusals', 'POST', {})
            api('/default-qualification/research/start', 'POST', {})
        snapshot = wait(lambda: (lambda x: x if x['tickets'] and x['reported'] and any(a.get('report') for a in x['tickets'][0]['assignments']) else None)(api('/default-qualification')),
                        'Native worker assignment/report')
        ticket = snapshot['tickets'][0]
        assert len(snapshot['tickets']) == 1
        worker_events = snapshot['events'][ticket['id']]
        assert any(e['type'] == 'user/message' and injected['original']['text'] in json.dumps(e) for e in worker_events)
        assert any(e['type'] == 'tool/result' and 'reported' in json.dumps(e) for e in worker_events)
        assert ticket['execution']['directory'].startswith(str(output / 'work') + '/')
        cases.append({'id': 'default-DshExecutor-native-session-source-input-report', 'status': 'passed', 'ticket_id': ticket['id']})
        if args.research:
            scientific = snapshot['research']
            assert scientific['state']['consumed_attempts'] == (2 if args.automatic else 1)
            association = next(iter(scientific['state']['actions'].values()))
            assert association['phase'] == 'settled' and association['evidence'] and association['checkpoint']
            research_calls = {e['data']['callId'] for e in worker_events if e['type'] == 'tool/call' and e['data']['name'] == 'research_run'}
            assert any(e['type'] == 'tool/result' and e['data']['message']['toolCallId'] in research_calls
                       and not e['data']['message'].get('isError') for e in worker_events)
            if args.automatic:
                reviewer_events = scientific['reviewer_events']
                assert reviewer_events and not any(e['type'] == 'tool/call' for e in reviewer_events)
                assert scientific['author'] != 'm2-reviewer'
                reviews = list(scientific['state']['review_requests'].values())
                assert len(reviews) == 3 and [r['phase'] for r in reviews] == ['request_changes', 'completed', 'completed']
                assert all(r['native_message_id'] and r['completion'] and r['receipt'] for r in reviews)
                assert 'human_action' not in ticket or ticket['human_action'] is None
            api('/default-qualification/research/replay', 'POST', {})
            cases.append({'id': 'default-worker-guarded-native-research-and-replay', 'status': 'passed'})
        wait(lambda: api('/orchestrator/api/state')['load']['running'] == 0, 'Worker turn completion')
        if args.research:
            if args.automatic:
                api('/default-qualification/research/automatic', 'POST', {})
                api('/default-qualification/research/refusals', 'POST', {})
                cases.append({'id': 'default-automatic-separate-review-negative-feedback-successor', 'status': 'passed'})
                api('/default-qualification/research/validity', 'POST', {})
                cases.append({'id': 'default-native-deadline-and-malformed-output-refusal', 'status': 'passed'})
            unknown = api('/default-qualification/research/unknown', 'POST', {})
            assert unknown['state']['consumed_attempts'] == (5 if args.automatic else 2) and unknown['state']['reserved_timeout_ms'] == 2000
            cases.append({'id': 'default-worker-unknown-launch-retains-charge', 'status': 'passed'})
        api('/orchestrator/api/executor/pause', 'POST', {'paused': True})
        if args.automatic:
            api('/default-qualification/research/continuity-snapshot', 'POST', {})
        before = api('/default-qualification')
        process.send_signal(signal.SIGINT)
        process.wait(timeout=30)
        process = start()
        wait(lambda: api('/orchestrator/api/state')['setup']['accounts'], 'Reopen default Store')
        after = wait(lambda: api('/default-qualification'), 'Reopened SourceHost binding')
        assert api('/orchestrator/api/state')['paused'] is True
        assert after['tickets'] == before['tickets']
        if args.research:
            assert after['research']['state'] == before['research']['state']
            if args.automatic:
                api('/default-qualification/research/continuity', 'POST', {})
            api('/default-qualification/research/replay', 'POST', {})
            cases.append({'id': 'default-worker-reopen-preserves-research-authority', 'status': 'passed'})
        # Source input persists, even though the disposable provider's in-memory audit resets on restart.
        reinjected = api('/default-qualification/inject', 'POST', {})
        assert reinjected['results'][0]['result'] == 'duplicate'
        restored_source = api('/default-qualification')['stored_original']
        assert restored_source == before['stored_original']
        assert before['stored_original']['text'] == injected['original']['text']
        cases.append({'id': 'default-Store-graceful-reopen-retains-ticket-input-pause', 'status': 'passed'})
        api('/orchestrator/api/tickets/' + ticket['id'] + '/stop', 'POST', {})
        detail = api('/orchestrator/api/tickets/' + ticket['id'])
        assert detail['stage'] == 'ended'
        native_coverage = None
        if args.research:
            stopped = api('/default-qualification/research/stop', 'POST', {})
            native_coverage = stopped.get('coverage')
            if args.automatic:
                assert native_coverage['complete'], native_coverage
        cases.append({'id': 'management-revision-conflict-and-human-stop', 'status': 'passed'})
        elapsed = time.monotonic() - started_at
        if qualification_plan:
            assert elapsed <= qualification_plan['budget']['max_wall_seconds']
            assert after['research']['state']['consumed_review_requests'] <= qualification_plan['budget']['max_review_requests']
        receipt = {'schema_version': 1, 'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'scope': 'unchanged default web bundle, Source kind, Store and DshExecutor',
                   'prepared': prepared, 'cases': cases, 'before_restart': before, 'after_restart': after, 'restored_source': restored_source,
                   'guarded_research': bool(args.research),
                   'automatic_research': bool(args.automatic),
                   'native_coverage': native_coverage,
                   'qualification_plan_sha256': hashlib.sha256((output / 'qualification-plan.json').read_bytes()).hexdigest() if qualification_plan else None,
                   'qualification_wall_seconds': elapsed,
                   'synthetic_admitted_attempts': after['research']['state']['consumed_attempts'] if args.research else 0,
                   'retained_unknown_reservation_ms': after['research']['state']['reserved_timeout_ms'] if args.research else 0,
                   'external_messages': 0, 'external_model_calls': 0, 'scientific_dispatches': 0,
                   'pins': {name: hashlib.sha256((runtime / name).read_bytes()).hexdigest() for name in ['package-lock.json', 'node_modules/dsh-superagent/lib/index.js']},
                   'qualification_source_pins': {name: hashlib.sha256((output / name).read_bytes()).hexdigest() for name in
                        ['default-profile.py', 'default-runtime.py', 'default-provider.mjs', 'source-cli']},
                   'limitations': ['Native Source transport is a disposable CLI fixture; production account and human intake acceptance remain separate',
                                   'Scripted native model answers qualify mechanics, not scientific reasoning or independent scientific review',
                                   'Synthetic qualification state is explicit; no hosted scientific authority/budget or GPU campaign is initialized or migrated']}
        receipt_to_publish = receipt
        return receipt
    finally:
        cleanup_ok = False
        try:
            if process and process.poll() is None:
                process.send_signal(signal.SIGINT)
                try: process.wait(timeout=30)
                except subprocess.TimeoutExpired:
                    process.kill(); process.wait(timeout=10)
                    raise RuntimeError('Disposable runtime required forced cleanup; native graceful settlement is unqualified')
            cleanup_ok = True
        finally:
            log.close()
            (output / 'api-trace.json').write_text(json.dumps(calls, indent=2) + '\n')
            if cleanup_ok and receipt_to_publish is not None:
                receipt_to_publish['qualification_wall_seconds'] = time.monotonic() - started_at
                if qualification_plan:
                    assert receipt_to_publish['qualification_wall_seconds'] <= qualification_plan['budget']['max_wall_seconds'], 'Whole qualification including cleanup exceeded its frozen window'
                receipt_to_publish['runtime_cleanup'] = 'graceful_complete_before_receipt_publication'
                (output / 'receipt.json').write_text(json.dumps(receipt_to_publish, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--research', action='store_true', help='Qualify guarded research tools inside the default worker')
    parser.add_argument('--automatic', action='store_true', help='Qualify native automatic proposal/review/feedback and bounded validity drills')
    parser.add_argument('--fault', help='Qualify one bounded native failure/recovery stratum')
    result = run(parser.parse_args())
    print(json.dumps({'status': 'passed', 'cases': len(result['cases'])}))
