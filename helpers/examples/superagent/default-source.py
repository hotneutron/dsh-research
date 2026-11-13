#!/usr/bin/env python3
"""Native CLI fixture for a disposable default Source; never accesses GitHub."""
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parent
if not (root / 'disposable-qualification.json').is_file():
    raise RuntimeError('Disposable source fixture marker required')
args = sys.argv[1:]
with (root / 'source-cli.jsonl').open('a') as stream:
    stream.write(json.dumps({'argv': args}) + '\n')
if args[:2] == ['api', 'user']:
    print(json.dumps({'login': 'fixture-agent', 'id': 900001}))
elif args[:2] == ['api', 'repos/fixture/default-runtime']:
    print(json.dumps({'name': 'fixture/default-runtime', 'push': True}))
elif args and args[0] == 'api':
    if '--method' in args or '-X' in args or '-f' in args or '-F' in args:
        print(json.dumps({'id': 900003, 'html_url': 'https://github.com/fixture/default-runtime/issues/1#issuecomment-900003'}))
    elif any('/issues/' in part and '/comments' not in part for part in args):
        print(json.dumps({'number': 1, 'title': 'Frozen engineering qualification', 'state': 'open', 'body': '',
                          'user': {'login': 'fixture-owner'}, 'created_at': '2026-11-12T00:00:00Z',
                          'html_url': 'https://github.com/fixture/default-runtime/issues/1'}))
    else:
        print('[]')
elif args[:2] == ['auth', 'git-credential']:
    sys.exit(0)
else:
    print('Unsupported fixture CLI request', file=sys.stderr)
    sys.exit(64)
