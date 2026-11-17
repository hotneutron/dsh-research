#!/usr/bin/env python3
"""Qualify Source reload and writer refusal with disposable native default providers."""
import argparse
import hashlib
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
    root=Path(args.project).resolve(strict=True)
    runtime=Path(args.runtime).resolve(strict=True)
    helper=Path(args.helper).resolve(strict=True) if args.helper else Path(__file__).resolve().parents[2]
    output=Path(args.output).resolve(); output.relative_to(root); output.mkdir(parents=True,exist_ok=False)
    (output/'disposable-qualification.json').write_text(json.dumps({'scope':'Source lifecycle only','scientific_authority':False,'external_models':False})+'\n')
    template=json.loads(Path(args.template).read_text()); assert template['project_root']==str(root)
    profile='source-lifecycle-'+uuid.uuid4().hex[:8]
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
    home=output/'home';state=output/'native-state';config_path=output/'config.json'
    source=output/'source.mjs';probe=output/'probe.mjs'
    shutil.copyfile(helper/'examples/production/source.mjs',source)
    shutil.copyfile(Path(args.probe).resolve(strict=True) if args.probe else helper/'examples/production/source-qualification.mjs',probe)
    (output/'node_modules').symlink_to(runtime/'node_modules')
    config={**template,'project_key':profile,'authority_id':profile+'-disposable','goal_id':profile,
            'artifact_prefix':str((output/'artifacts').relative_to(root)),
            'native_state_dir':str(state/'superagent'),'state_path':str((state/'superagent/science.sqlite3').relative_to(root)),
            'models':{'transport':'disposable_scripted','author_provider':'production-lifecycle-author','reviewer_provider':'production-lifecycle-reviewer','author_model':'scripted','reviewer_model':'scripted'},
            'reviewer_session_id':profile+'-reviewer','profile_revision':profile+'-v1',
            'goal_text':'User-authorized disposable package Source lifecycle qualification. No model-selected tools, science or external messages.'}
    # The Source recipe uses the canonical artifact namespace even for qualification.
    config['artifact_prefix']='local_artifacts/autoresearch/dsh/'+profile
    config_path.write_text(json.dumps(config,indent=2)+'\n')
    prepared=json.loads(subprocess.check_output(['python3',str(helper/'dist/default-profile.py'),'--project',str(root),'--runtime',str(runtime),
        '--home',str(home),'--state',str(state),'--profile',profile,'--port',str(port),'--qualification-provider',str(probe)],text=True))
    patch=Path(prepared['profile_directory'])/'cordis.patch.yml';entries=json.loads(patch.read_text());entries.append({'insert':[{'id':'production-research-source','name':str(source)}]});patch.write_text(json.dumps(entries,indent=2)+'\n')
    node=runtime/'node-v24.9.0-linux-x64/bin/node';cli=runtime/'node_modules/@deepseek-ai/dsh/lib/bin.js'
    env={**os.environ,'DSH_HOME':str(home),'DSH_PRODUCTION_RESEARCH_CONFIG':str(config_path),'DSH_PRODUCTION_SOURCE_QUALIFICATION':'1',
         'DSH_RESEARCH_DISPOSABLE_QUALIFICATION':str(output)}
    processes=[];checks=[]
    def start(home_path,logname):
        stream=(output/logname).open('w');p=subprocess.Popen([str(node),str(cli),'--profile',profile,'--no-open'],cwd=root,
            env={**env,'DSH_HOME':str(home_path)},stdout=stream,stderr=subprocess.STDOUT);processes.append((p,stream));return p
    def api(path,body=None,expected=200):
        request=urllib.request.Request(f'http://127.0.0.1:{port}'+path,headers={'x-orchestrator-request':'1','content-type':'application/json'},data=None if body is None else json.dumps(body).encode())
        try:
            with urllib.request.urlopen(request,timeout=10) as response: status,value=response.status,json.load(response)
        except urllib.error.HTTPError as error:
            status=error.code;raw=error.read()
            try:value=json.loads(raw)
            except ValueError:value={'error':raw.decode(errors='replace')[:500]}
        assert status==expected,(path,status,value);return value
    def wait(function,seconds=20):
        end=time.monotonic()+seconds
        while time.monotonic()<end:
            try:
                value=function()
                if value:return value
            except (OSError,AssertionError):pass
            time.sleep(.1)
        raise TimeoutError('Native Source lifecycle observation timed out')
    def save(block,value):
        settings=api('/orchestrator/api/settings');old=next(row for row in settings['sources'] if row['id']==block[7:]) if block.startswith('source:') else settings['blocks'][block]
        request=urllib.request.Request(f'http://127.0.0.1:{port}/orchestrator/api/settings/'+block,method='PUT',headers={'x-orchestrator-request':'1','content-type':'application/json'},data=json.dumps({'value':value,'revision':old['revision']}).encode())
        try:
            with urllib.request.urlopen(request,timeout=10) as response:result=json.load(response)
        except urllib.error.HTTPError as error:raise RuntimeError((block,error.code,error.read().decode(errors='replace'))) from error
        if result.get('restarting'):time.sleep(.5);wait(lambda:api('/orchestrator/api/state'))
    try:
        p=start(home,'runtime.log');wait(lambda:api('/orchestrator/api/state'))
        api('/orchestrator/api/executor/pause',{'paused':True})
        save('eval',{'mode':'auto','timeoutSeconds':30,'model':{'provider':'production-lifecycle-author','model':'scripted'}})
        save('executor',{'model':{'provider':'production-lifecycle-author','model':'scripted'},'maxWorkers':1,'directory':str(output/'work'),'prepare':'','blockedCommands':[]})
        settings=api('/orchestrator/api/settings');policy=settings['blocks']['policy']['value'];policy['rules']=[{'id':'source-fixture','name':'Source lifecycle fixture','enabled':True,'instruction':'Accept only explicitly authorized project-research native-cli-user/dsh-research intake for disposable Source lifecycle qualification. No scientific tools or external messages.'}]
        policy['sources']={'project-research':{'allowed':[{'id':'native-cli-user'},{'id':'dsh-research'}],'bots':[]},'github':{'allowed':[]}}
        save('policy',policy)
        # Configure fixture identity directly; all GitHub observation and outbound accounts remain disabled.
        fixture_cli=output/'fixture-gh';shutil.copyfile(helper/'examples/superagent/default-source.py',fixture_cli);fixture_cli.chmod(0o700)
        save('source:github',{'enabled':True,'config':{'repository':'fixture/default-runtime','cli':str(fixture_cli)}})
        wait(lambda:api('/orchestrator/api/state')['setup']['accounts'])
        configured=next(row for row in api('/orchestrator/api/settings')['sources'] if row['id']=='github')['value']
        save('source:github',{**configured,'enabled':False})
        api('/orchestrator/api/executor/pause',{'paused':False});api('/project-research/start',{})
        initial=wait(lambda:(v if (v:=api('/production-lifecycle')).get('status')=='idle' and v.get('ready') else None))
        (output/'initial-observation.json').write_text(json.dumps(initial,indent=2)+'\n')
        assert initial['goal_sections']==initial['loop_sections']==1,(initial['goal_sections'],initial['loop_sections']);original=initial['state'];assert original['consumed_attempts']==0
        api('/production-lifecycle/reload',{});after=wait(lambda:api('/project-research'));assert after['state']==original
        api('/project-research/wake',{});reopened=wait(lambda:(v if (v:=api('/production-lifecycle')).get('status')=='idle' and v.get('ready') else None))
        assert reopened['same_native_author'] and reopened['goal_sections']==reopened['loop_sections']==1 and reopened['state']==original
        checks.append({'id':'loaded-author-Source-reload-same-author-state-single-prompt','status':'passed'})
        assert api('/production-lifecycle/late',{})=={'is_error':True,'late_calls':0};checks.append({'id':'late-local-tool-refused','status':'passed'})
        api('/orchestrator/api/executor/pause',{'paused':True});api('/project-research/wake',{},expected=409);assert api('/project-research')['state']==original
        checks.append({'id':'actual-operator-pause-refused-with-zero-consumption','status':'passed'})
        api('/orchestrator/api/executor/pause',{'paused':False});ticket=api('/project-research')['open_tickets'][0];api('/orchestrator/api/tickets/'+ticket['id']+'/stop',{})
        api('/project-research/wake',{},expected=409);assert api('/project-research')['state']==original
        checks.append({'id':'actual-ended-native-Ticket-refuses-resume','status':'passed'})
        p.send_signal(signal.SIGINT);p.wait(timeout=30)
        clone_home=output/'clone-home';shutil.copytree(home,clone_home,symlinks=True)
        clone_patch=clone_home/'profiles'/profile/'cordis.patch.yml';rows=json.loads(clone_patch.read_text())
        for row in rows:
            if row.get('id')=='dsh-superagent':row['config']['stateDir']=str(output/'clone-state/superagent')
            elif row.get('id')=='storage-json':row['config']['root']=str(output/'clone-state/storages')
            elif row.get('id')=='session-persistence-jsonl':row['config']['root']=str(output/'clone-state/sessions')
            elif row.get('id')=='session-query-sqlite':row['config']['path']=str(output/'clone-state/query.sqlite3')
        clone_patch.write_text(json.dumps(rows,indent=2)+'\n');clone=start(clone_home,'clone-refusal.log')
        def refusal():
            value=api('/production-lifecycle/failures')
            return value if any('Scientific writer must use the configured canonical native runtime lock' in item['error'] for item in value['failures']) else None
        refused=wait(refusal)
        (output/'clone-native-failure.json').write_text(json.dumps(refused,indent=2)+'\n')
        clone.send_signal(signal.SIGINT);clone.wait(timeout=30)
        checks.append({'id':'cloned-native-lock-directory-refuses-shared-science-writer','status':'passed'})
        (output/'receipt.json').write_text(json.dumps({'kind':'disposable_default_Source_lifecycle_qualification','at':time.time(),'checks':checks,
            'original_state':original,'external_model_calls':0,'scientific_admissions':0,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'scope':'Actual default Source/Store/Agent and public plugin Fiber restart; scripted model with explicit new disposable authority'},indent=2)+'\n')
        print(json.dumps({'passed':len(checks),'receipt':str(output/'receipt.json')}))
    except BaseException as error:
        (output/'failure.json').write_text(json.dumps({'checks':checks,'error':str(error)},indent=2)+'\n');raise
    finally:
        for p,stream in processes:
            if p.poll() is None:p.send_signal(signal.SIGINT)
            try:p.wait(timeout=30)
            except subprocess.TimeoutExpired:p.kill();p.wait(timeout=10)
            stream.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--helper')
    parser.add_argument('--probe')
    for name in ('project','runtime','template','output'):parser.add_argument('--'+name,required=True)
    run(parser.parse_args())
