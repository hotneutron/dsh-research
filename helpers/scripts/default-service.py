#!/usr/bin/env python3
"""Control a project-owned systemd user unit with persistent intentional-stop state."""
import argparse
import fcntl
import json
from pathlib import Path
import re
import subprocess


def properties(unit):
    raw = subprocess.check_output(['systemctl', '--user', 'show', unit,
        '--property=ActiveState,SubState,MainPID,Result,ControlGroup,NRestarts'], text=True)
    return dict(line.split('=', 1) for line in raw.splitlines())


def remaining(group):
    if not group:
        return []
    if not group.startswith('/') or '..' in Path(group).parts:
        return None
    candidates = [Path(base + group) for base in ('/sys/fs/cgroup', '/sys/fs/cgroup/systemd', '/sys/fs/cgroup/unified')]
    observed, pids = False, set()
    for root in candidates:
        if not root.is_dir():
            continue
        for path in root.rglob('cgroup.procs'):
            observed = True
            try:
                pids.update(int(value) for value in path.read_text().split())
            except OSError:
                return None
    return sorted(pids) if observed else None


def main(args):
    if not re.fullmatch(r'[a-z][a-z0-9-]{0,70}', args.profile) or not re.fullmatch(r'[a-z][a-z0-9-]*\.service', args.unit):
        raise ValueError('Invalid profile or service unit')
    home = Path(args.home).resolve(strict=True)
    control = home / 'profiles' / args.profile / 'service-control'
    control.mkdir(exist_ok=True)
    with (control / 'lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        return controlled(args, control)


def controlled(args, control):
    marker = control / 'manually-stopped'
    if args.command == 'status':
        status = properties(args.unit)
        print(json.dumps({**status, 'remaining_cgroup_pids': remaining(status.get('ControlGroup', '')),
                          'manually_stopped': marker.exists()}, indent=2))
        return 0 if status['ActiveState'] == 'active' else 1
    if args.respect_stop and marker.exists():
        print(json.dumps({'skipped': True, 'reason': 'intentional stop retained'}))
        return 0
    if args.command in ('stop', 'restart'):
        # Persist intent before stopping, including a failed or timed-out shutdown.
        if args.command == 'stop':
            marker.write_text('Intentional stop; only explicit start/restart clears this marker.\n')
        subprocess.run(['systemctl', '--user', 'stop', args.unit], check=True)
    status = properties(args.unit)
    pids = remaining(status.get('ControlGroup', ''))
    if status['ActiveState'] not in ('inactive', 'failed') or status['MainPID'] != '0' or pids != []:
        if args.command == 'start' and status['ActiveState'] == 'active':
            print(json.dumps({'already_running': True}))
            return 0
        raise RuntimeError(f'Service is not quiescent: {status}; remaining cgroup PIDs={pids}')
    if status.get('Result') not in ('success', 'exit-code', 'signal', 'core-dump'):
        raise RuntimeError(f'Unresolved service stop result: {status.get("Result")}')
    if args.command == 'stop':
        if status.get('Result') != 'success':
            raise RuntimeError(f'Intentional stop did not complete successfully: {status.get("Result")}')
        print(json.dumps({'stopped': True, 'remaining_cgroup_pids': pids}))
        return 0
    marker.unlink(missing_ok=True)
    if status['ActiveState'] == 'failed':
        subprocess.run(['systemctl', '--user', 'reset-failed', args.unit], check=True)
    subprocess.run(['systemctl', '--user', 'start', args.unit], check=True)
    print(json.dumps({'started': True}))
    return 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['start', 'stop', 'restart', 'status'])
    for field in ('unit', 'home', 'profile'):
        parser.add_argument('--' + field, required=True)
    parser.add_argument('--respect-stop', action='store_true')
    args = parser.parse_args()
    if args.respect_stop and args.command != 'restart':
        parser.error('--respect-stop applies to restart')
    raise SystemExit(main(args))
