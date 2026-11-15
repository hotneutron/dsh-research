#!/usr/bin/env python3
"""Invoke the existing project Source wakeup; never initialize research authority."""
import argparse
import json
from pathlib import Path
import time
import urllib.error
import urllib.request


def wake(args):
    if not 1024 <= args.port <= 65535:
        raise ValueError('Explicit loopback port required')
    deadline = time.monotonic() + 30
    headers = {'x-orchestrator-request': '1', 'content-type': 'application/json'}
    url = f'http://127.0.0.1:{args.port}'
    while True:
        try:
            request = urllib.request.Request(url + '/project-research', headers=headers)
            with urllib.request.urlopen(request, timeout=3) as response:
                current = json.load(response)
            break
        except (OSError, urllib.error.URLError):
            if time.monotonic() >= deadline:
                raise
            time.sleep(1)
    state = current.get('state')
    if not state or state['stopped']:
        return {'status': 'inactive', 'authority_created': False}
    request = urllib.request.Request(url + '/project-research/wake', data=b'{}', headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 409:
            return {'status': 'held', 'detail': json.load(error), 'authority_created': False}
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, required=True)
    args = parser.parse_args()
    print(json.dumps(wake(args)))
