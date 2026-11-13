"""Additional real-model default-worker stratum; no scientific project adoption."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import time


def qualification_plan(helper):
    names = ['examples/superagent/real-runtime.py', 'examples/superagent/real-automatic-worker.mjs',
             'examples/superagent/research-worker.mjs', 'examples/superagent/default-provider.mjs',
             'examples/traex-tools/remote-model.mjs', 'examples/synthetic-cpu/fixture.mjs', 'dist/review.js', 'dist/traex.js', 'dist/traex-tools.js']
    return {'schema_version': 1, 'scope': 'Real DeepSeek author/reviewer through default Source/Store/DshExecutor; synthetic released engineering inputs',
        'budget': {'max_wall_seconds': 900, 'max_model_requests': 32, 'per_model_request_seconds': 120,
                   'max_admissions': 5, 'max_review_requests': 6, 'aggregate_evaluator_ms': 10000, 'scientific_gpu_dispatches': 0},
        'required_cells': ['original-source-ticket', 'real-author-tool', 'real-separate-review', 'request-changes-new-proposal',
                           'valid-negative-reviewed-successor', 'same-action-replay', 'native-store-reopen', 'native-ticket-stop'],
        'source_pins': {name: hashlib.sha256((helper / name).read_bytes()).hexdigest() for name in names}}


def run_real(api, wait, output, restart, started_at, cases, injected, plan):
    def observed():
        value = api('/default-qualification')
        state = (value.get('research') or {}).get('state', {})
        if state.get('hold'):
            (output / 'unresolved-native-snapshot.json').write_text(json.dumps(value, indent=2) + '\n')
            raise RuntimeError('Real native research entered an owned hold; no blind model or action retry')
        return value if value.get('reported') and state.get('consumed_attempts') == 2 else None
    snapshot = wait(observed, 'Real model author/reviewer and two settled native actions', seconds=800)
    ticket = snapshot['tickets'][0]
    assert len(snapshot['tickets']) == 1
    events = snapshot['events'][ticket['id']]
    assert any(e['type'] == 'user/message' and injected['original']['text'] in json.dumps(e) for e in events)
    assert any(e['type'] == 'tool/call' and e['data']['name'] == 'research_review' for e in events)
    reviews = snapshot['research']['reviewer_events']
    assert reviews and not any(e['type'] == 'tool/call' for e in reviews)
    assert snapshot['research']['author'] != 'm2-reviewer'
    assert snapshot['real_models']['worker'] and len(snapshot['real_models']['reviewer']) >= 3
    assert all(r['usage'] and r['completed'] for r in snapshot['real_models']['worker'] + snapshot['real_models']['reviewer'])
    assertions = api('/default-qualification/research/real-model', 'POST', {})
    cases.append({'id': 'real-default-author-review-changes-negative-successor-replay', 'status': 'passed'})
    api('/orchestrator/api/executor/pause', 'POST', {'paused': True})
    wait(lambda: api('/orchestrator/api/state')['load']['running'] == 0, 'Real worker idle before reopen')
    before = api('/default-qualification')
    restart()
    wait(lambda: api('/orchestrator/api/state')['setup']['accounts'], 'Real model default Store reopened')
    after = wait(lambda: (lambda value: value if value.get('research', {}).get('ready') else None)(api('/default-qualification')), 'Real native registration reopened')
    assert after['tickets'] == before['tickets']
    assert after['research']['state'] == before['research']['state']
    assert api('/orchestrator/api/state')['paused'] is True
    api('/default-qualification/research/replay', 'POST', {})
    cases.append({'id': 'real-model-native-store-reopen-replay', 'status': 'passed'})
    api('/orchestrator/api/tickets/' + ticket['id'] + '/stop', 'POST', {})
    api('/default-qualification/research/stop', 'POST', {})
    cases.append({'id': 'real-model-native-ticket-stop', 'status': 'passed'})
    elapsed = time.monotonic() - started_at
    assert elapsed <= plan['budget']['max_wall_seconds']
    assert after['research']['state']['consumed_review_requests'] <= 6
    return {'schema_version': 1, 'scope': plan['scope'], 'cases': cases, 'before_restart': before, 'after_restart': after,
        'original': injected['original'], 'assertions': assertions, 'native_cells': plan['required_cells'], 'qualification_wall_seconds': elapsed,
        'qualification_plan_sha256': hashlib.sha256((output / 'qualification-plan.json').read_bytes()).hexdigest(),
        'scientific_dispatches': 0, 'GPU_dispatches': 0, 'authority_handoffs': 0,
        'limitations': ['Fixture GitHub Source remains synthetic', 'Real reasoning covers declared synthetic protocol criteria, not scientific/domain acceptance',
                       'No Accorde authority activation or migration', 'Earlier scripted fault/feedback strata retain separate scope']}
