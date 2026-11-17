#!/usr/bin/env python3
"""Generate project-owned native runtime, resident model relay and Source wake units."""
import argparse
import importlib.util
import json
from pathlib import Path
import re


def generate(args):
    project = Path(args.project).resolve(strict=True)
    paths = {}
    for name in ('runtime', 'home', 'helper', 'config', 'relay_root', 'relay_controls', 'output'):
        path = Path(getattr(args, name)).resolve(strict=name not in ('relay_root', 'output'))
        path.relative_to(project)
        if any(c.isspace() or c in '%\\"' for c in str(path)):
            raise ValueError('Service paths must not contain whitespace, percent, backslash or quotes')
        paths[name] = path
    if not re.fullmatch(r'[a-z][a-z0-9-]{0,60}', args.profile) or not 1024 <= args.port <= 65535:
        raise ValueError('Explicit profile and loopback native port required')
    controls = json.loads(paths['relay_controls'].read_text())
    relay_port = controls.get('listenPort')
    if not isinstance(relay_port, int) or not 1024 <= relay_port <= 65535 or not controls.get('governance_module') or not controls.get('routes'):
        raise ValueError('Governed model relay with fixed loopback port required')
    if not isinstance(args.model_timeout_ms,int) or args.model_timeout_ms<=0:
        raise ValueError('Explicit positive model response deadline required')
    output = paths['output']
    output.mkdir(parents=True, exist_ok=False)
    native = args.profile + '.service'
    relay = args.profile + '-models.service'
    tick = args.profile + '-wake.service'
    stopped = paths['home'] / 'profiles' / args.profile / 'service-control/manually-stopped'
    environment = output / 'production.env'
    values = {'DSH_PRODUCTION_RESEARCH_CONFIG': str(paths['config']),
              'DSH_RESEARCH_MODEL_TRANSPORT_URL': f'http://127.0.0.1:{relay_port}/',
              'DSH_RESEARCH_MODEL_TRANSPORT_TOKEN_FILE': str(paths['relay_root'] / 'private-relay-token'),
              'DSH_RESEARCH_MODEL_TRANSPORT_TIMEOUT_MS': str(args.model_timeout_ms)}
    with environment.open('x') as stream:
        for key, value in values.items():
            stream.write(f'{key}="{value}"\n')
    environment.chmod(0o600)
    specification = importlib.util.spec_from_file_location('native_unit', Path(__file__).with_name('default-systemd.py'))
    generator = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(generator)
    unit_args = argparse.Namespace(project=str(project), runtime=str(paths['runtime']), home=str(paths['home']), profile=args.profile,
                                   output=str(output / native))
    content = generator.unit(unit_args)
    content = content.replace('[Unit]\n', f'[Unit]\nRequires={relay}\nAfter={relay}\n')
    content = content.replace('[Service]\n', f'[Service]\nEnvironmentFile={environment}\n')
    node = paths['runtime'] / 'node-v24.9.0-linux-x64/bin/node'
    content = content.replace(f'ExecStart={node} ', f'ExecStart={node} --use-env-proxy ')
    (output / native).write_text(content)
    (output / relay).write_text(f'''[Unit]
Description=Project-owned protected model transport ({args.profile})
PartOf={native}
ConditionPathExists=!{stopped}
StartLimitIntervalSec=300
StartLimitBurst=3

[Service]
Type=exec
WorkingDirectory={paths['helper']}
ExecStart={node} {paths['helper']}/examples/model-transport/relay.mjs {project} {paths['relay_root']} {paths['relay_controls']}
UMask=0077
Restart=on-failure
RestartSec=35
KillSignal=SIGTERM
KillMode=control-group
TimeoutStopSec=300
SendSIGKILL=no
StandardOutput=append:{output}/models.log
StandardError=append:{output}/models.log
''')
    (output / tick).write_text(f'''[Unit]
Description=Wake retained project research through native Source ({args.profile})
Requisite={native}
After={native}
ConditionPathExists=!{stopped}

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 {paths['helper']}/dist/production-wake.py --port {args.port}
TimeoutStartSec=45
UMask=0077
StandardOutput=append:{output}/wake.log
StandardError=append:{output}/wake.log
''')
    (output / (args.profile + '-wake.timer')).write_text(f'''[Unit]
Description=Existing systemd scheduled Source wake ({args.profile})

[Timer]
OnBootSec=60
OnUnitActiveSec=60
Unit={tick}

[Install]
WantedBy=timers.target
''')
    print(json.dumps({'output': str(output), 'native_unit': native, 'model_unit': relay,
                      'wake_timer': args.profile + '-wake.timer', 'authority_initialized': False}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for field in ('project', 'runtime', 'home', 'helper', 'config', 'relay-root', 'relay-controls', 'profile', 'output'):
        parser.add_argument('--' + field, required=True)
    parser.add_argument('--port', type=int, required=True)
    parser.add_argument('--model-timeout-ms', type=int, required=True)
    generate(parser.parse_args())
