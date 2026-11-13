"""Default-worker serving GPU guard stratum with unchanged original authority."""
import hashlib
import json
import time


def read_context_marker(path):
    try: value=json.loads(path.read_text())
    except (FileNotFoundError,json.JSONDecodeError): return None
    return value if isinstance(value,dict) and value.get('phase')=='gpu_context_created' else None


def qualification_plan(helper, crash=False):
    names = ['examples/superagent/default-runtime.py', 'examples/superagent/research-worker.mjs',
             'examples/superagent/default-provider.mjs', 'examples/superagent/serving-runtime.py', 'dist/native.js', 'dist/gpu.js']
    return {'schema_version': 1, 'scope': 'Default native serving producer/guard C_qual; no scientific authority adoption',
        'budget': {'max_wall_seconds': 900, 'max_admissions': 3, 'max_review_requests': 0, 'max_physical_gpu_units': 3,
                   'per_complete_unit_seconds': 180, 'aggregate_evaluator_ms': 540000, 'external_model_calls': 0},
        'cells': (['source-ticket', 'live-CUDA-context', 'native-runtime-crash', 'reopen-no-duplicate', 'unknown-preserves-reservation', 'same-inode-global-lease'] if crash else
                  ['source-ticket', 'guarded-gpu-positive', 'controlled-incomplete-publication', 'live-context-deadline',
                  'same-inode-global-lease', 'same-attempt-replay', 'unchanged-original-authority', 'native-store-reopen', 'ticket-stop']),
        'source_pins': {name: hashlib.sha256((helper/name).read_bytes()).hexdigest() for name in names}}


def run_serving(api, wait, output, restart, started_at, cases, injected, plan, crash=False):
    if crash:
        marker=output/'local_artifacts/autoresearch/dsh/serving-output-1/private-context.json'
        observed=wait(lambda:read_context_marker(marker),'Actual GPU context before runtime crash',seconds=30)
        assert observed['phase']=='gpu_context_created'
        before=api('/default-qualification');assert before['research']['state']['consumed_attempts']==1
        restart(crash=True)
        wait(lambda:api('/orchestrator/api/state')['setup']['accounts'],'Crash recovery native Store')
        api('/orchestrator/api/executor/pause','POST',{'paused':True})
        after=wait(lambda:(lambda x:x if x.get('research',{}).get('ready') else None)(api('/default-qualification')),'Recovered GPU registration')
        replay=api('/default-qualification/research/replay','POST',{})
        assert replay['state']['consumed_attempts']==1 and replay['state']['reserved_timeout_ms']==180000
        assert replay['state']['hold']['kind']=='unknown_execution'
        cases.append({'id':'live-GPU-runtime-crash-reopen-keeps-original-reservation','status':'passed'})
        assert time.monotonic()-started_at<=plan['budget']['max_wall_seconds']
        return {'schema_version':1,'scope':plan['scope'],'cases':cases,'before_crash':before,'after_restart':after,'replay':replay,'gpu_context_marker':observed,
            'qualification_plan_sha256':hashlib.sha256((output/'qualification-plan.json').read_bytes()).hexdigest(),'native_cells':plan['cells'],
            'scientific_dispatches':0,'authority_handoffs':0,'qualification_wall_seconds':time.monotonic()-started_at,
            'limitations':['Missing native terminal remains unknown after physical cleanup; no reservation released','Scripted reviewer/source and C_qual scope only']}
    def completed():
        value = api('/default-qualification'); state = value.get('research',{}).get('state',{})
        if state.get('hold'):
            (output/'unresolved-serving-snapshot.json').write_text(json.dumps(value,indent=2)+'\n')
            raise RuntimeError('Native serving execution entered an owned hold')
        return value if value.get('reported') and state.get('consumed_attempts') == 1 else None
    snapshot = wait(completed, 'Default-worker serving GPU completion', seconds=200)
    ticket = snapshot['tickets'][0]; state = snapshot['research']['state']; action = next(iter(state['actions'].values()))
    assert action['phase']=='settled' and action['evidence'] and state['reserved_timeout_ms']==0
    api('/default-qualification/research/replay','POST',{})
    incomplete=api('/default-qualification/research/serving-incomplete','POST',{})
    assert incomplete['state']['consumed_attempts']==2
    deadline=api('/default-qualification/research/serving-deadline','POST',{})
    assert deadline['state']['consumed_attempts']==3 and deadline['state']['reserved_timeout_ms']==3000
    cases.append({'id':'default-serving-positive-incomplete-live-context-deadline-replay','status':'passed'})
    api('/orchestrator/api/executor/pause','POST',{'paused':True})
    before=api('/default-qualification');restart()
    wait(lambda:api('/orchestrator/api/state')['setup']['accounts'],'Serving native Store reopened')
    after=wait(lambda:(lambda x:x if x.get('research',{}).get('ready') else None)(api('/default-qualification')),'Serving registration restored')
    assert after['tickets']==before['tickets'] and after['research']['state']==before['research']['state']
    api('/default-qualification/research/replay','POST',{})
    api('/orchestrator/api/tickets/'+ticket['id']+'/stop','POST',{})
    api('/default-qualification/research/stop','POST',{})
    cases.append({'id':'default-serving-reopen-reservation-ticket-stop','status':'passed'})
    elapsed=time.monotonic()-started_at;assert elapsed<=plan['budget']['max_wall_seconds']
    return {'schema_version':1,'scope':plan['scope'],'cases':cases,'before_restart':before,'after_restart':after,
        'original':injected['original'],'incomplete':incomplete,'deadline':deadline,'qualification_wall_seconds':elapsed,
        'qualification_plan_sha256':hashlib.sha256((output/'qualification-plan.json').read_bytes()).hexdigest(),
        'scientific_dispatches':0,'authority_handoffs':0,'limitations':['Scripted reviewer/source; project native guard and CUDA execution are real',
        'Incomplete case is a declared conservative publication of a physically complete unit','Deadline retains uncertainty/reservation',
        'Scientific profile/context/aggregate-admission adoption remains held']}
