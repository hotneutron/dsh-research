#!/usr/bin/env python3
"""GET-only GitHub CLI transport for a paused Source deployment.

This constrains this transport; it does not isolate the operator's OS account.
Configuration contains paths and repository identity, never credentials.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', required=True)
    parser.add_argument('argv', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    words = args.argv[1:] if args.argv[:1] == ['--'] else args.argv
    allowed = len(words) >= 2 and words[0] == 'api'
    endpoint = words[1] if allowed else ''
    path = endpoint.split('?', 1)[0]
    repository = 'repos/' + config['repository']
    allowed = allowed and (path in ('user', 'notifications', repository) or path.startswith(repository + '/'))
    index = 2
    while allowed and index < len(words):
        flag = words[index]
        if flag in ('--include', '--paginate', '--slurp'):
            index += 1
        elif flag == '--jq' and index + 1 < len(words):
            index += 2
        elif flag in ('-H', '--header') and index + 1 < len(words):
            header = words[index + 1].split(':', 1)[0].lower()
            allowed = header in ('accept', 'if-none-match', 'x-github-api-version')
            index += 2
        else:
            allowed = False
    # Reject URL/path normalization and a supplied method before invoking gh.
    allowed = allowed and '..' not in path and '%' not in path and not path.startswith('/')
    audit = Path(config['audit'])
    with audit.open('a') as stream:
        stream.write(json.dumps({'at': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'method': 'GET' if allowed else 'refused',
                                'path': path, 'allowed': allowed}) + '\n')
    if not allowed:
        print('Paused deployment transport permits only scoped GitHub API GET reads', file=sys.stderr)
        return 64
    result = subprocess.run([config['executable'], *words, '--method', 'GET'],
                            env={**os.environ, 'GH_PROMPT_DISABLED': '1'}, timeout=90)
    return result.returncode


if __name__ == '__main__':
    sys.exit(main())
