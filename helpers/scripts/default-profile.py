#!/usr/bin/env python3
"""Prepare a new project-owned profile for the unchanged default superagent bundle.

Does not start a service, configure scientific authority, or copy credentials.
"""
import argparse
import json
from pathlib import Path
import re


def prepare(args):
    project = Path(args.project).resolve(strict=True)
    runtime = Path(args.runtime).resolve(strict=True)
    home = Path(args.home).resolve()
    state = Path(args.state).resolve()
    if not re.fullmatch(r'[a-z][a-z0-9-]{0,70}', args.profile):
        raise ValueError('Use a profile name containing lowercase letters, digits and hyphens')
    for path in (home, state):
        path.relative_to(project)
    module_root = runtime / 'node_modules'
    for name, expected in (('@deepseek-ai/cordis', '4.0.5-alpha.1'), ('@deepseek-ai/dsh', '0.2.1-alpha.2'),
                           ('@deepseek-ai/dsh-agent', '0.2.1-alpha.2'), ('dsh-superagent', '0.1.0')):
        actual = json.loads((module_root / name / 'package.json').read_text())['version']
        if actual != expected:
            raise ValueError(f'{name}: expected {expected}, installed {actual}')
    profile = home / 'profiles' / args.profile
    profile.mkdir(parents=True, exist_ok=False)
    (profile / 'node_modules').symlink_to(module_root, target_is_directory=True)
    package = {'name': 'dsh-profile-' + args.profile, 'private': True,
               'dsh': {'profile': {'bundles': ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-superagent']}}}
    (profile / 'package.json').write_text(json.dumps(package, indent=2) + '\n')
    (profile / 'cordis.yml').write_text('[]\n')
    # JSON is valid YAML; no generated JavaScript expressions or shell expansions.
    entries = [
        {'id': 'webserver', 'config': {'host': '127.0.0.1', 'port': args.port}},
        {'id': 'session-persistence-jsonl', 'config': {'root': str(state / 'sessions')}},
        {'id': 'session-query-sqlite', 'config': {'path': str(state / 'session-query.sqlite3'), 'openAt': 'never'}},
        {'id': 'storage-json', 'config': {'root': str(state / 'storages')}},
        {'id': 'dsh-superagent', 'config': {'stateDir': str(state / 'superagent')}},
    ]
    if args.qualification_provider:
        provider = Path(args.qualification_provider).resolve(strict=True)
        entries.extend([
            {'id': 'llm-deepseek', 'disabled': True}, {'id': 'llm-deepseek-account', 'disabled': True},
            {'id': 'agent-default-model', 'config': {'provider': 'default-qualification', 'model': 'router'}},
            {'insert': [{'id': 'default-qualification', 'name': str(provider)}]},
        ])
    (profile / 'cordis.patch.yml').write_text(json.dumps(entries, indent=2) + '\n')
    return {'profile': args.profile, 'project': str(project), 'home': str(home), 'state': str(state),
            'profile_directory': str(profile), 'runtime': str(runtime), 'port': args.port,
            'qualification': bool(args.qualification_provider), 'started': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for field in ('project', 'runtime', 'home', 'state', 'profile'):
        parser.add_argument('--' + field, required=True)
    parser.add_argument('--port', type=int, required=True)
    parser.add_argument('--qualification-provider')
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error('port must be between 1024 and 65535')
    print(json.dumps(prepare(args), indent=2))
