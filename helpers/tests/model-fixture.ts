import { mkdtemp, mkdir, readFile, writeFile, chmod, rm, realpath } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { canonicalJson, sha256 } from '../src/bindings.js'
import { ModelRouteSchema, contextEntries } from '../src/model-policy.js'
import type { ModelGovernance } from '../src/model-policy.js'
import { ModelTextAdapter, ModelRequestBudget } from '../src/model-transport.js'
import { TraexDriver } from '../src/model-drivers/traex.js'
import { CodexDriver } from '../src/model-drivers/codex.js'
import { ClaudeDriver } from '../src/model-drivers/claude.js'
import { OpenCodeDriver } from '../src/model-drivers/opencode.js'
import { ModelToolAdapter } from '../src/model-tools.js'
import type { ModelBudgetSnapshot, ModelOptions } from '../src/model-transport.js'
import { SessionId } from '@deepseek-ai/dsh-session'
import { execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { decodeModelContext } from '../src/model-context.js'

export async function modelFixture(settings: { maxRequests?: number; maxInFlight?: number; delivery?: 'stdin' | 'project_document'; role?: 'author' | 'reviewer' | 'planning'; ownRuntime?: boolean; driver?: 'traex' | 'codex' | 'claude' | 'opencode' } = {}) {
  let fixtureNode = process.env.DSH_MODEL_FIXTURE_NODE ?? process.execPath
  const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-model-transport-')))
  if (settings.ownRuntime) { const target=join(root,'fixture-node');await writeFile(target,await readFile(fixtureNode),{mode:0o500});fixtureNode=target }
  await mkdir(join(root, 'proofs'))
  await writeFile(join(root, 'fixture-marker.json'), '{"kind":"disposable_model_protocol_qualification","external_model_calls":0}')
  const ref = async (name: string) => {
    const bytes = Buffer.from(canonicalJson({ kind: 'scripted_fixture_evidence', name, external_model_calls: 0 }))
    const uri = 'proofs/' + name + '.json'; await writeFile(join(root, uri), bytes)
    return { uri, sha256: sha256(bytes), size_bytes: bytes.length }
  }
  const model = settings.driver === 'claude' ? 'claude-fixture-model' : 'fixture-model'
  const keyPath = join(root,'fixture-key')
  if(['claude','opencode'].includes(settings.driver??'')) await writeFile(keyPath,'dsh-scripted-fixture-key',{mode:0o600})
  const driver = settings.driver === 'opencode' ? new OpenCodeDriver() : settings.driver === 'claude' ? new ClaudeDriver() : settings.driver === 'codex' ? new CodexDriver() : new TraexDriver()
  const executable = join(root, 'fixture-cli.mjs')
  await writeFile(executable, `#!${fixtureNode}
import {readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {decodeModelContext} from '${new URL('../dist/model-context.js', import.meta.url).href}';
if(process.argv.includes('--version')){process.stdout.write('fixture-1\\n');process.exit(0)}
const codex=process.argv.includes('app-server'),claude=process.argv.includes('--bare');
const opcode=!!process.env.OPENCODE_CONFIG_CONTENT;
const opcodeConfig=opcode?JSON.parse(process.env.OPENCODE_CONFIG_CONTENT):null;
if(opcode&&process.argv.includes('debug')){
 if(process.argv.includes('config')){opcodeConfig.provider['dsh-model-provider'].options.apiKey=process.env.DSH_MODEL_API_KEY;process.stdout.write(JSON.stringify(opcodeConfig));}
 else process.stdout.write(JSON.stringify({name:'dsh-model',mode:'primary',prompt:opcodeConfig.agent['dsh-model'].prompt,permission:[{permission:'*',pattern:'*',action:'deny'}],tools:{bash:false,read:false,task:false,invalid:false}}));
 process.exit(0);
}
let prompt='',rpcTurn=null;
if(codex||claude){
 const {createInterface}=await import('node:readline');
 const lines=createInterface({input:process.stdin});
 for await(const line of lines){
  const r=JSON.parse(line);
  if(claude&&r.type==='user'){prompt=r.message.content[0].text;break;}
  if(r.id===1)process.stdout.write(JSON.stringify({id:1,result:{}})+'\\n');
  if(r.id===2)process.stdout.write(JSON.stringify({id:2,result:{model:'fixture-model',modelProvider:'openai',cwd:process.cwd(),approvalPolicy:'never',sandbox:{type:'readOnly',networkAccess:false},instructionSources:[],thread:{id:'fixture-thread',ephemeral:true}}})+'\\n');
  if(r.id===3){rpcTurn=r.params;prompt=r.params.input[0].text;process.stdout.write(JSON.stringify({id:3,result:{turn:{id:'fixture-turn'}}})+'\\n');break;}
 }
 lines.close();
}else for await(const chunk of process.stdin)prompt+=chunk;

if(!codex&&!claude&&!opcode&&process.argv.includes('-c'))prompt+=readFileSync('AGENTS.override.md','utf8');
if(codex){
 const controls=process.argv.filter((v,i)=>process.argv[i-1]==='-c');
 if(!controls.includes('features.shell_tool=false')||!controls.includes('features.hooks=false')||!controls.includes('project_doc_max_bytes=0')||!controls.includes('skills.include_instructions=false')||!process.argv.includes('--no-daemon'))process.exit(3);
 const cat=JSON.parse(readFileSync(JSON.parse(controls.find(v=>v.startsWith('model_catalog_json=')).slice('model_catalog_json='.length)),'utf8'));
 if(cat.models[0].apply_patch_tool_type!==null||cat.models[0].shell_type!=='disabled'||cat.models[0].experimental_supported_tools.length||cat.models[0].multi_agent_version!=='disabled')process.exit(3);
}

appendFileSync('${join(root,'model-called.txt')}', 'called\\n');
if(prompt.includes('fatal-cli'))process.exit(4);
if(prompt.includes('owned-descendant')){
 const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},1000); /* dsh-model-qualification-orphan */"],{stdio:'ignore'});
 writeFileSync('${join(root,'child-pid.txt')}',String(child.pid));
 await new Promise(resolve=>setTimeout(resolve,300));
 await new Promise(resolve=>setTimeout(resolve,10000));
}
if(!codex&&!claude&&!opcode&&(!process.argv.includes('--disallowed-tool')||!process.argv.includes('--ephemeral')))process.exit(3);
if(prompt.includes('delay-response'))await new Promise(resolve=>setTimeout(resolve,500));
if(prompt.includes('timeout-response'))await new Promise(resolve=>setTimeout(resolve,10000));
const marker=prompt.includes('marker-A')?'marker-A':prompt.includes('marker-B')?'marker-B':'fixture-response';
const start=prompt.indexOf('COMPLETE_MODEL_CONTEXT_LITERAL_V1\\n'),end=prompt.lastIndexOf('END_COMPLETE_MODEL_CONTEXT_LITERAL_V1\\n')+'END_COMPLETE_MODEL_CONTEXT_LITERAL_V1\\n'.length;
const context=decodeModelContext(prompt.slice(start,end));
const allText=context.messages.flatMap(message=>message.content??[]).filter(block=>block.type==='text').map(block=>block.text).join('\\n');
const native=allText.match(/QUALIFIED_NATIVE_REQUEST_JSON\\n([^\\n]+)/);
const settled=JSON.stringify(context.messages).includes('settled');
const reviewText=context.messages.flatMap(message=>message.content??[]).findLast(block=>block.type==='text'&&block.text.includes('REVIEW_PACKET_JSON\\n'))?.text;
const packet=reviewText?JSON.parse(reviewText.split('REVIEW_PACKET_JSON\\n').at(-1)):null;
const tool=prompt.includes('select-native-tool');
const structured=opcode?opcodeConfig.agent['dsh-model'].prompt.includes('Return JSON matching this schema:'):claude?process.argv[process.argv.indexOf('--system-prompt')+1].includes('Return JSON matching this schema:'):codex?rpcTurn.outputSchema!==null:process.argv.includes('--output-schema');
const answer=structured?JSON.stringify({text:marker,tool_calls:native&&!settled?[{name:'research_run',arguments:native[1]}]:native?[]:tool?[{name:prompt.includes('invalid-selection')?'shell':'research_run',arguments:'{"expected_revision":3}'}]:[]}):packet?JSON.stringify({decision:'approve',reason:'Exact scripted fixture source/limits are consistent; no live model/science claim',review_id:packet.review_id,action_id:packet.action_id,manifest_sha256:packet.manifest_sha256,request_sha256:packet.request_sha256}):marker;
const answerPath=process.argv[process.argv.indexOf('--output-last-message')+1];
if(!codex&&!claude&&!opcode)writeFileSync(answerPath,prompt.includes('answer-drift')?'different-answer':answer);
const usage=prompt.includes('zero-usage')?{input_tokens:0,cached_input_tokens:0,cache_write_input_tokens:0,output_tokens:0,reasoning_output_tokens:0}:prompt.includes('missing-usage')?{}:{input_tokens:marker==='marker-A'?101:202,output_tokens:600,cached_input_tokens:0,cache_creation_input_tokens:0,cache_write_input_tokens:0,reasoning_output_tokens:100};
if(opcode){
 if(process.env.OPENCODE_PURE!=='true'||process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS!=='true'||process.env.OPENCODE_DISABLE_CLAUDE_CODE!=='true'||opcodeConfig.permission['*']!=='deny')process.exit(3);
 const doc=opcodeConfig.agent['dsh-model'].prompt;
 const system=doc+'\\nYou are powered by the model named ${model}. The exact model ID is dsh-model-provider/${model}\\nHere is some useful information about the environment you are running in:\\n<env>\\n  Working directory: '+process.cwd()+'\\n  Workspace root folder: /\\n  Is directory a git repo: no\\n  Platform: '+process.platform+"\\n  Today's date: "+new Date().toDateString()+'\\n</env>';
 const response=await fetch(opcodeConfig.provider['dsh-model-provider'].options.baseURL+'/chat/completions',{method:'POST',headers:{authorization:'Bearer '+process.env.DSH_MODEL_API_KEY,'content-type':'application/json'},body:JSON.stringify({model:'${model}',stream:true,messages:[{role:'system',content:system},{role:'user',content:prompt}]})});
 if(!response.ok)process.exit(7);await response.text();
 const session='ses-fixture',message='msg-fixture';
 const tokens=prompt.includes('missing-usage')?{}:{input:usage.input_tokens,output:Math.max(0,usage.output_tokens-(usage.reasoning_output_tokens??0)),reasoning:usage.reasoning_output_tokens??0,cache:{read:0,write:0},total:usage.input_tokens+usage.output_tokens};
 if(prompt.includes('inconsistent-usage'))tokens.total++;
 const part=(id,type,extra={})=>({id,type,sessionID:session,messageID:message,...extra});
 const events=[{type:'step_start',part:part('prt-start','step-start')},
 {type:prompt.includes('cli-operation')?'tool_use':'text',part:part('prt-text','text',{text:prompt.includes('encoded-credential-echo')?process.env.DSH_MODEL_API_KEY:answer,time:{start:1,end:2}})},
 ...(prompt.includes('incomplete-cli')?[]:[{type:'step_finish',part:part('prt-finish','step-finish',{reason:prompt.includes('truncated')?'length':'stop',tokens,cost:0})}]),
 ...(prompt.includes('duplicate-terminal')?[{type:'step_start',part:part('prt-start2','step-start')}]:[])];
 for(const event of events){let line=JSON.stringify({...event,sessionID:session});if(prompt.includes('encoded-credential-echo'))line=line.replaceAll(process.env.DSH_MODEL_API_KEY,[...process.env.DSH_MODEL_API_KEY].map(c=>String.fromCharCode(92)+'u'+c.charCodeAt(0).toString(16).padStart(4,'0')).join(''));process.stdout.write(line+'\\n');}
}else if(claude){
 if(!process.argv.includes('--tools')||process.argv[process.argv.indexOf('--tools')+1]!==''||!process.argv.includes('--disable-slash-commands')||!process.argv.includes('--strict-mcp-config')||process.env.ANTHROPIC_API_KEY!=='dsh-scripted-fixture-key')process.exit(3);
 const session='claude-fixture-session',model=prompt.includes('wrong-model')?'claude-wrong-model':'${model}';
 const counters={input_tokens:usage.input_tokens,cache_read_input_tokens:usage.cached_input_tokens,cache_creation_input_tokens:usage.cache_creation_input_tokens,output_tokens:usage.output_tokens};
 const events=[{type:'system',subtype:'init',cwd:process.cwd(),session_id:session,tools:[],mcp_servers:[],model,permissionMode:'dontAsk',slash_commands:[],apiKeySource:'ANTHROPIC_API_KEY',claude_code_version:'fixture-1',skills:[],plugins:[]},
 {type:'stream_event',event:{type:'message_start',message:{id:'claude-response',type:'message',role:'assistant',model,usage:prompt.includes('missing-usage')?{}:counters}}},
 {type:'stream_event',event:{type:'content_block_start',index:0,content_block:{type:prompt.includes('cli-operation')?'tool_use':'text',text:''}}},
 {type:'stream_event',event:{type:'content_block_delta',index:0,delta:{type:'text_delta',text:answer}}},
 {type:'assistant',message:{id:'claude-response',type:'message',role:'assistant',model,content:[{type:'text',text:answer}]}},
 {type:'stream_event',event:{type:'content_block_stop',index:0}},
 {type:'stream_event',event:{type:'message_delta',delta:{stop_reason:prompt.includes('truncated')?'max_tokens':'end_turn'},usage:{output_tokens:usage.output_tokens}}},
 ...(prompt.includes('incomplete-cli')?[]:[{type:'stream_event',event:{type:'message_stop'}}]),
 ...(prompt.includes('hook-event')?[{type:'system',subtype:'hook_started'}]:[]),
 ...(prompt.includes('duplicate-terminal')?[{type:'stream_event',event:{type:'message_start',message:{id:'second',role:'assistant',model}}}]:[]),
 {type:'result',subtype:'success',is_error:false,num_turns:1,stop_reason:'end_turn',terminal_reason:'completed',permission_denials:[],subagent_stats:{spawned:0,max_depth:0},result:prompt.includes('answer-drift')?'different-answer':answer,usage:prompt.includes('invalid-terminal-counters')?{}:counters,modelUsage:{[model]:{}}}];
 for(const event of events)process.stdout.write(JSON.stringify({...event,session_id:session,parent_tool_use_id:null})+'\\n');
}else if(codex){
 const raw={threadId:'fixture-thread',turnId:'fixture-turn',responseId:'fixture-response',usage:{inputTokens:usage.input_tokens,cachedInputTokens:usage.cached_input_tokens,cacheWriteInputTokens:usage.cache_write_input_tokens,outputTokens:usage.output_tokens,reasoningOutputTokens:usage.reasoning_output_tokens,totalTokens:usage.input_tokens+usage.output_tokens},usageMetadata:{metadata:{input_tokens:usage.input_tokens,output_tokens:usage.output_tokens,total_tokens:usage.input_tokens+usage.output_tokens,input_tokens_details:{cached_tokens:usage.cached_input_tokens,cache_write_tokens:usage.cache_write_input_tokens},output_tokens_details:{reasoning_tokens:usage.reasoning_output_tokens}}}};
 const events=[{method:'rawResponseItem/completed',params:{threadId:'fixture-thread',turnId:'fixture-turn',item:{type:'message',role:'user',content:[{type:'input_text',text:prompt}]}}},{method:'item/started',params:{threadId:'fixture-thread',turnId:'fixture-turn',item:{type:prompt.includes('cli-operation')?'commandExecution':'reasoning'}}},
 ...(prompt.includes('model-rerouted')?[{method:'model/rerouted',params:{threadId:'fixture-thread',turnId:'fixture-turn'}}]:[]),
 {method:'item/agentMessage/delta',params:{threadId:'fixture-thread',turnId:'fixture-turn',delta:prompt.includes('answer-drift')?'different-answer':answer}},
 {method:'item/completed',params:{threadId:'fixture-thread',turnId:'fixture-turn',item:{type:'agentMessage',text:answer}}},
 ...(prompt.includes('incomplete-cli')?[]:[{method:'rawResponse/completed',params:raw}]),
 ...(prompt.includes('continuation')?[{method:'rawResponse/completed',params:{...raw,responseId:'second-response',usage:null,usageMetadata:null}}]:[]),
 ...(prompt.includes('duplicate-terminal')?[{method:'rawResponse/completed',params:raw}]:[]),
 ...(prompt.includes('post-terminal')?[{method:'item/completed',params:{item:{type:'contextCompaction'}}}]:[]),
 {method:'turn/completed',params:{threadId:'fixture-thread',turn:{id:'fixture-turn',status:'completed',items:[{type:'agentMessage',text:answer}]}}}];
 for(const event of events)process.stdout.write(JSON.stringify(event)+'\\n');
}else{
for(const event of [{type:'thread.started',thread_id:marker},...(codex?[{type:'turn.started'}]:[]),
 {type:'item.completed',item:{type:prompt.includes('cli-operation')?'command_execution':'error',message:prompt.includes('model-rerouted')?'model rerouted: fixture-model -> other':'Retained reload diagnostic'}},
 ...(codex?[{type:'item.completed',item:{type:'agent_message',text:answer}}]:[]),
 ...(prompt.includes('incomplete-cli')?[]:[{type:'turn.completed',usage,...(codex||prompt.includes('unreported-model')?{}:{provider:'fixture-provider',model:prompt.includes('wrong-model')?'wrong-model':'${model}'})}]),
 ...(prompt.includes('duplicate-terminal')?[{type:'turn.completed',usage}]:[]),
 ...(prompt.includes('post-terminal')?[{type:'item.completed',item:{type:'agent_message',text:'late'}}]:[])])process.stdout.write(JSON.stringify(event)+'\\n');
}
`)
  await chmod(executable, 0o700)
  const pin = async (path: string) => { const bytes = await readFile(path); return { path, sha256: sha256(bytes), size_bytes: bytes.length } }
  const catalogPath = join(root,'fixture-model-catalog.json')
  if(settings.driver === 'opencode') await writeFile(catalogPath,canonicalJson({model_id:model,context_tokens:128000,output_tokens:32000}))
  if(settings.driver === 'codex') await writeFile(catalogPath,canonicalJson({models:[{slug:'fixture-model',apply_patch_tool_type:'freeform',shell_type:'unified_exec',experimental_supported_tools:['clock'],model_messages:{instructions_template:'Unapproved catalog instructions'}}]}))
  let fixtureServer: ReturnType<typeof createServer> | null = null
  let fixtureBaseURL='https://fixture.invalid/v1'
  if(settings.driver==='opencode'){
    fixtureServer=createServer(async(req,res)=>{
      let body='';for await(const chunk of req)body+=chunk
      const packet=JSON.parse(body);const context:any=decodeModelContext(packet.messages[1].content)
      const allText=context.messages.flatMap((message:any)=>message.content??[]).filter((block:any)=>block.type==='text').map((block:any)=>block.text).join('\n')
      const serialized=JSON.stringify(context), marker=serialized.includes('marker-A')?'marker-A':serialized.includes('marker-B')?'marker-B':'fixture-response'
      const native=allText.match(/QUALIFIED_NATIVE_REQUEST_JSON\n([^\n]+)/),settled=serialized.includes('settled')
      const reviewText=context.messages.flatMap((message:any)=>message.content??[]).findLast((block:any)=>block.type==='text'&&block.text.includes('REVIEW_PACKET_JSON\n'))?.text
      const review=reviewText?JSON.parse(reviewText.split('REVIEW_PACKET_JSON\n').at(-1)):null
      const structured=packet.messages[0].content.includes('Return JSON matching this schema:')
      const answer=serialized.includes('encoded-credential-echo')?'dsh-scripted-fixture-key':structured?JSON.stringify({text:marker,tool_calls:native&&!settled?[{name:'research_run',arguments:native[1]}]:native?[]:serialized.includes('select-native-tool')?[{name:'research_run',arguments:'{"expected_revision":3}'}]:[]}):review?JSON.stringify({decision:'approve',reason:'Scripted fixture source only',review_id:review.review_id,action_id:review.action_id,manifest_sha256:review.manifest_sha256,request_sha256:review.request_sha256}):marker
      const input=marker==='marker-A'?101:202,output=serialized.includes('zero-usage')?0:600
      const usage={prompt_tokens:serialized.includes('zero-usage')?0:input,completion_tokens:output,total_tokens:serialized.includes('inconsistent-usage')?input+output+1:input+output,prompt_tokens_details:{cached_tokens:0},completion_tokens_details:{reasoning_tokens:100}}
      if(serialized.includes('zero-usage'))usage.total_tokens=0
      const base={id:'chat_fixture',object:'chat.completion.chunk',model:context.model,created:1}
      const chunks=[...(serialized.includes('split-credential-echo')?[{...base,choices:[{index:0,delta:{role:'assistant',content:'dsh-scripted-'},finish_reason:null}]},{...base,choices:[{index:0,delta:{content:'fixture-key'},finish_reason:null}]}]:[{...base,choices:[{index:0,delta:{role:'assistant',content:answer},finish_reason:null}]}]),{...base,choices:[{index:0,delta:{},finish_reason:serialized.includes('truncated')?'length':'stop'}]},...(serialized.includes('missing-usage')?[]:[{...base,choices:[],usage}])]
      res.writeHead(200,{'content-type':'text/event-stream'});for(const chunk of chunks)res.write('data: '+JSON.stringify(chunk)+'\n\n');if(serialized.includes('usage-then-hang')){res.write('data: [DONE]\n\n');res.flushHeaders()}else res.end('data: [DONE]\n\n')
    })
    await new Promise<void>(yes=>fixtureServer!.listen(0,'127.0.0.1',yes));const address=fixtureServer.address() as any;fixtureBaseURL='http://127.0.0.1:'+address.port+'/v1'
  }
  const route = ModelRouteSchema.parse({ schema_version: 1, id: 'fixture-route', provider: 'fixture-provider', model,
    dsh_provider: 'fixture-dsh', role: settings.role ?? 'author',
    driver: { id: driver.id, implementation: await ref('implementation'), executable: await pin(executable), runtime: [await pin(fixtureNode)],
      version: 'fixture-1', qualification: await ref('qualification'), context_delivery: settings.delivery ?? 'stdin', ...(settings.driver === 'opencode' ? {opencode:{sdk:'openai-compatible-chat',api_key_file:keyPath,base_url:fixtureBaseURL,model_catalog:await pin(catalogPath)}} : {}), ...(settings.driver === 'claude' ? {claude:{api_key_file:keyPath}} : {}), ...(settings.driver === 'codex' ? {codex:{home:root,model_catalog:await pin(catalogPath)}} : {}), auto_context: ['codex','opencode'].includes(settings.driver??'') ? [{file:await pin(catalogPath),content_class:'runtime'}] : [], auto_context_basis: await ref('automatic-context') },
    identity: { assurance: 'requested_only', basis: await ref('identity') },
    authentication: { principal: 'fixture-only', class: 'scripted_fixture', use_mode: 'unattended', protected_reference: ['claude','opencode'].includes(settings.driver??'') ? keyPath : settings.driver === 'codex' ? root : 'fixture:no-credential', basis: await ref('auth') },
    exposure: { allowed_classes: ['runtime', 'released'], confirmation: 'off', authority: await ref('authority'), decision: await ref('exposure') },
    separation: settings.role === 'planning' ? null : { basis: await ref('separation'), preset: await ref('preset'), permissions: await ref('permissions') },
    limits: { timeout_ms: 2000, preflight_timeout_ms: 10000, max_encoded_input_bytes: 1024*1024, max_capture_bytes: 1024*1024, max_answer_bytes: 128*1024 } })
  const beforeRead = await ref('before-read')
  let allowed = true, classification = 'released'
  const snapshots: ModelBudgetSnapshot[] = []
  let persistence: (snapshot: ModelBudgetSnapshot) => Promise<void> = async snapshot => { snapshots.push(structuredClone(snapshot)) }
  const budget = new ModelRequestBudget('fixture-auth-scope', settings.maxRequests ?? 8, settings.maxInFlight ?? 2, snapshot => persistence(snapshot))
  const governance: ModelGovernance = {
    async verifyRoute(current) {
      if (!allowed) throw new Error('Actual fixture grant/auth use is revoked')
      return { route_sha256: sha256(canonicalJson(current)), authority: current.exposure.authority }
    },
    async approveContext(current, context) {
      if (!allowed) throw new Error('Actual fixture exposure is revoked')
      return { context_sha256: sha256(canonicalJson(context)), decision: current.exposure.decision, before_read: beforeRead,
        entries: contextEntries(context).map(entry => ({ ...entry, content_class: classification })),
        author_session_id: 'fixture-author', reviewer_session_id: 'fixture-reviewer' }
    },
  }
  const adapter = (overrides: Partial<typeof route> = {}) => new ModelTextAdapter({ projectRoot: root, artifactsRoot: join(root,'requests'),
    route: { ...route, ...overrides }, driver, governance, budget })
  const text = adapter()
  let tools: ModelToolAdapter | null = null
  const options = (message = 'fixture-response'): ModelOptions => ({ provider: 'fixture-dsh', model,
    sessionId: SessionId(settings.role === 'reviewer' ? 'fixture-reviewer' : 'fixture-author'),
    messages: [{ role: 'user', content: [{ type: 'text', text: message }] }] })
  const run = async (value = options(), target: { stream(value: ModelOptions): AsyncIterable<unknown> } = text) => {
    const chunks: any[] = []; for await (const chunk of target.stream(value)) chunks.push(chunk); return chunks
  }
  const modelCalls = async () => { try { return (await readFile(join(root,'model-called.txt'),'utf8')).trim().split('\n').length } catch(error) { if((error as NodeJS.ErrnoException).code==='ENOENT')return 0;throw error } }
  return {root,route,text,get tools(){return tools??=new ModelToolAdapter(text,1)},governance,budget,snapshots,adapter,options,run,modelCalls,
    revoke:()=>{allowed=false}, classify:(value:string)=>{classification=value}, setPersist:(value:typeof persistence)=>{persistence=value},
    close:async()=>{
      try{const pid=Number(await readFile(join(root,'child-pid.txt'),'utf8'));const cmd=execFileSync('ps',['-p',String(pid),'-o','command='],{encoding:'utf8'});if(cmd.includes('dsh-model-qualification-orphan'))process.kill(pid,'SIGKILL')}catch{}
      if(fixtureServer)await new Promise<void>(yes=>fixtureServer!.close(()=>yes()))
      await rm(root,{recursive:true,force:true})
    }}
}
