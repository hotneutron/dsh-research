#!/usr/bin/env python3
"""Write a project-owned Linux user service unit; registration/start are separate."""
import argparse
from pathlib import Path
import re


def unit(args):
    project = Path(args.project).resolve(strict=True)
    runtime = Path(args.runtime).resolve(strict=True)
    home = Path(args.home).resolve(strict=True)
    output = Path(args.output).resolve()
    for path in (runtime, home, output):
        path.relative_to(project)
        if any(c.isspace() or c in '%\\"' for c in str(path)):
            raise ValueError('Service generator requires paths without whitespace, percent, backslash or quotes')
    if not re.fullmatch(r'[a-z][a-z0-9-]{0,70}', args.profile):
        raise ValueError('Invalid profile')
    node = runtime / 'node-v24.9.0-linux-x64/bin/node'
    cli = runtime / 'node_modules/@deepseek-ai/dsh/lib/bin.js'
    if not node.is_file() or not cli.is_file():
        raise ValueError('Pinned runtime not installed')
    return f'''[Unit]
Description=Project-owned DSH default runtime ({args.profile})
ConditionPathExists=!{home}/profiles/{args.profile}/service-control/manually-stopped
StartLimitIntervalSec=300
StartLimitBurst=3

[Service]
Type=simple
WorkingDirectory={project}
Environment="DSH_HOME={home}"
Environment="PATH={runtime}/bin:{node.parent}:/usr/local/bin:/usr/bin:/bin"
ExecStart={node} {cli} --profile {args.profile} --no-open
UMask=0077
StandardOutput=append:{runtime}/service.log
StandardError=append:{runtime}/service.log
Restart=on-failure
SuccessExitStatus=130 143
# The unchanged Runtime's writer lock becomes stale after 30 seconds.
RestartSec=35
KillSignal=SIGINT
KillMode=control-group
TimeoutStopSec=300
SendSIGKILL=no

[Install]
WantedBy=default.target
'''


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for field in ('project', 'runtime', 'home', 'profile', 'output'):
        parser.add_argument('--' + field, required=True)
    args = parser.parse_args()
    content = unit(args)
    with Path(args.output).open('x') as stream:
        stream.write(content)
    print(args.output)
