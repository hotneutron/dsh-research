import assert from 'node:assert/strict'
import test from 'node:test'
import { writeFile, readFile, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { modelFixture } from './model-fixture.js'
import { ModelRouteSchema, checkContextApproval } from '../src/model-policy.js'
import { ModelRequestBudget } from '../src/model-budget.js'
import { ModelToolAdapter, parseModelToolSelection } from '../src/model-tools.js'
import { decodeTraexUsage } from '../src/model-drivers/traex.js'
import { SessionId } from '@deepseek-ai/dsh-session'

test('complete governed TraeX response records observed local pins, known usage and unobserved served identity', async()=>{
  const f=await modelFixture()
  try {
    const chunks=await f.run(f.options('unreported-model'))
    assert.equal(chunks.at(-1).type,'finish');assert.equal(await f.modelCalls(),1)
    const receipt=f.text.receipts[0] as any
    assert.equal(receipt.served_identity,'unobserved');assert.equal(receipt.reported_model,null)
    assert.equal(receipt.driver_observation.version,'fixture-1');assert.equal(receipt.driver_observation.executable.sha256,f.route.driver.executable.sha256)
    assert.equal(receipt.usage.outputTokens,600);assert.deepEqual(receipt.diagnostics,['Retained reload diagnostic'])
    assert.equal(f.budget.snapshot().consumed_requests,1);assert.equal(f.budget.snapshot().active,0)
  } finally {await f.close()}
})

for(const delivery of ['stdin','project_document'] as const)test(`native context and native tool selection use one budget in ${delivery} delivery`,async()=>{
  const f=await modelFixture({delivery})
  try {
    const options={...f.options('select-native-tool'),maxTokens:512,tools:[{name:'research_run',description:'Guarded operation',parameters:{type:'object'}}]}
    const chunks=await f.run(options,f.tools)
    assert.equal(chunks.at(-1).reason.kind,'tool-calls');assert.equal(chunks.find(c=>c.type==='tool-call-delta').name,'research_run')
    assert.equal(f.budget.snapshot().consumed_requests,1);assert.equal(await f.modelCalls(),1)
    const receipt=f.text.receipts[0] as any;assert.equal(receipt.output_token_cap,null);assert.equal(receipt.ignored_output_token_hint,512)
    assert.equal(chunks.find(c=>c.type==='tool-call-delta').id,receipt.selection.tool_calls[0].id)
    assert.equal((f.budget.snapshot().records[0]?.receipt as any).selection.tool_calls[0].id,receipt.selection.tool_calls[0].id)
    const retained=JSON.parse(await readFile(join(receipt.artifacts,'private-approved-context.json'),'utf8'))
    assert.deepEqual(retained.tools,options.tools);assert.equal(retained.sessionId,'fixture-author')
    if(delivery==='project_document')assert.ok((await readFile(join(receipt.artifacts,'AGENTS.override.md'),'utf8')).includes('select-native-tool'))
  } finally {await f.close()}
})

test('model substitution, protected/unknown classification and missing auth fail before model debit',async()=>{
  const f=await modelFixture()
  try {
    await assert.rejects(f.run({...f.options(),model:'other-model'}),/substitute/)
    for(const contentClass of ['protected','credential','unknown']){f.classify(contentClass);await assert.rejects(f.run(),/Uncovered/)}
    f.classify('released');f.revoke();await assert.rejects(f.run(),/revoked/)
    assert.equal(await f.modelCalls(),0);assert.equal(f.budget.snapshot().consumed_requests,0)
    assert.throws(()=>ModelRouteSchema.parse({...f.route,exposure:{...f.route.exposure,allowed_classes:['protected']}}))
  } finally {await f.close()}
})

test('UTF8 final input, project document and schema are bounded before version probe/model admission',async()=>{
  for(const delivery of ['stdin','project_document'] as const){
    const f=await modelFixture({delivery})
    try {
      const adapter=f.adapter({limits:{...f.route.limits,max_encoded_input_bytes:100}})
      await assert.rejects(f.run(f.options('汉字😀'.repeat(500)),adapter),/byte bound/)
      assert.equal(await f.modelCalls(),0);assert.equal(f.budget.snapshot().consumed_requests,0)
    } finally {await f.close()}
  }
})

test('executable tamper and observed version mismatch fail before dispatch and debit',async()=>{
  const f=await modelFixture()
  try {
    await assert.rejects(f.run(f.options(),f.adapter({driver:{...f.route.driver,version:'unapproved-version'}})),/Observed driver/)
    await writeFile(f.route.driver.executable.path,'changed executable')
    await assert.rejects(f.run(),/pin differs/)
    assert.equal(await f.modelCalls(),0);assert.equal(f.budget.snapshot().consumed_requests,0)
  } finally {await f.close()}
})

for(const message of ['missing-usage','wrong-model','cli-operation','fatal-cli','incomplete-cli','invalid-selection select-native-tool'])test(`${message} remains charged and emits no executable result`,async()=>{
  const f=await modelFixture()
  try {
    const target=message.includes('selection')?f.tools:f.text
    const options=message.includes('selection')?{...f.options(message),tools:[{name:'research_run',description:'Allowed',parameters:{type:'object'}}]}:f.options(message)
    await assert.rejects(f.run(options,target))
    assert.equal(f.budget.snapshot().consumed_requests,1);assert.equal(f.budget.snapshot().records[0]?.phase,'unresolved')
    assert.equal(target.receipts.length,0);assert.equal(await f.modelCalls(),1)
  } finally {await f.close()}
})

test('large approved UTF8 context succeeds losslessly within a fixed document bound',async()=>{
 const f=await modelFixture({delivery:'project_document'})
 try {
  const adapter=f.adapter({limits:{...f.route.limits,max_encoded_input_bytes:4*1024*1024}})
  const options={...f.options('汉字🙂\n'.repeat(150000)),system:'exact native system 中文'}
  assert.equal((await f.run(options,adapter)).at(-1).type,'finish')
  const receipt=adapter.receipts[0] as any
  const context=JSON.parse(await readFile(join(receipt.artifacts,'private-approved-context.json'),'utf8'))
  assert.deepEqual(context,options);assert.ok(receipt.encoded_input_bytes>1024*1024)
  assert.equal(f.budget.snapshot().consumed_requests,1)
 }finally{await f.close()}
})

test('two accepted concurrent DSH Sessions retain distinct responses, usage and charged ordering',async()=>{
 const f=await modelFixture({role:'planning',maxInFlight:2,maxRequests:2})
 try {
  const a={...f.options('marker-A delay-response'),sessionId:SessionId('session-A')},b={...f.options('marker-B'),sessionId:SessionId('session-B')}
  const results=await Promise.all([f.run(a),f.run(b)])
  assert.deepEqual(results.map(chunks=>chunks.find(c=>c.type==='text-delta').text),['marker-A','marker-B'])
  assert.deepEqual((f.text.receipts as any[]).map(r=>[r.dsh_session_id,r.usage.inputTokens]).sort(),[['session-A',101],['session-B',202]])
  const reopened=new ModelRequestBudget('fixture-auth-scope',2,2,async()=>{},f.budget.snapshot())
  assert.equal(reopened.snapshot().consumed_requests,2)
 }finally{await f.close()}
})

test('required provider-reported identity does not pass from configured model alone',async()=>{
  const f=await modelFixture()
  try {
    const adapter=f.adapter({identity:{...f.route.identity,assurance:'provider_reported'}})
    await assert.rejects(f.run(f.options('unreported-model'),adapter),/identity is unobserved/)
    assert.equal(f.budget.snapshot().consumed_requests,1);assert.equal(adapter.receipts.length,0)
  } finally {await f.close()}
})

test('shared role Session and reviewer tool selection are refused',async()=>{
  const f=await modelFixture({role:'reviewer'})
  try {
    assert.throws(()=>new ModelToolAdapter(f.text,1),/Reviewer/)
    await assert.rejects(f.run({...f.options(),sessionId:SessionId('fixture-author')}),/another research role/)
    const context={},approval={context_sha256:'bad',decision:f.route.exposure.decision,entries:[],before_read:f.route.exposure.decision,author_session_id:'same',reviewer_session_id:'same'}
    assert.throws(()=>checkContextApproval(f.route,context,'same',approval))
    assert.equal(await f.modelCalls(),0);assert.equal(f.budget.snapshot().consumed_requests,0)
  } finally {await f.close()}
})

test('concurrency refusal consumes no model allowance; accepted Sessions retain their own response and usage',async()=>{
  const f=await modelFixture({maxInFlight:1,maxRequests:2})
  try {
    const first=f.run(f.options('marker-A delay-response'))
    await new Promise(resolve=>setTimeout(resolve,20))
    await assert.rejects(f.run(f.options('marker-B')),/capacity/)
    assert.equal((await first).find(c=>c.type==='text-delta').text,'marker-A')
    assert.equal((await f.run(f.options('marker-B'))).find(c=>c.type==='text-delta').text,'marker-B')
    assert.equal(f.budget.snapshot().consumed_requests,2);assert.equal(await f.modelCalls(),2)
    assert.deepEqual((f.text.receipts as any[]).map(r=>[r.cli_thread_id,r.usage.inputTokens]),[['marker-A',101],['marker-B',202]])
    const reopened=new ModelRequestBudget('fixture-auth-scope',2,1,async()=>{},f.budget.snapshot())
    assert.equal(reopened.snapshot().consumed_requests,2);assert.throws(()=>reopened.reserve('new-route','new-session'),/allowance/)
  } finally {await f.close()}
})

test('revocation after durable model admission retains charge and refuses actual launch',async()=>{
  const f=await modelFixture()
  try {
    f.setPersist(async snapshot=>{if(snapshot.consumed_requests===1)f.revoke()})
    await assert.rejects(f.run(),/revoked/)
    assert.equal(f.budget.snapshot().consumed_requests,1);assert.equal(await f.modelCalls(),0)
    assert.equal(f.budget.snapshot().records[0]?.phase,'unresolved')
  } finally {await f.close()}
})

test('cancelled CLI completion cannot publish a finish and remains charged',async()=>{
  const f=await modelFixture()
  try {
    const controller=new AbortController()
    const work=f.run({...f.options('timeout-response'),signal:controller.signal})
    const end=Date.now()+10000
    while(await f.modelCalls()===0&&Date.now()<end)await new Promise(resolve=>setTimeout(resolve,25))
    assert.equal(await f.modelCalls(),1);controller.abort(new Error('Controlled cancellation'))
    await assert.rejects(work)
    assert.equal(f.budget.snapshot().consumed_requests,1);assert.equal(f.budget.snapshot().active,0)
  } finally {await f.close()}
})

test('native choice validation and usage mappings retain falsifiable error paths',()=>{
  const tools=[{name:'research_run',description:'Allowed',parameters:{type:'object'}}]
  const answer=JSON.stringify({text:'Next native operation',tool_calls:[{name:'research_run',arguments:'{}'}]})
  assert.deepEqual(parseModelToolSelection('```json\n'+answer+'\n```',tools,1),parseModelToolSelection(answer,tools,1))
  for(const bad of ['```json\n'+answer,'prose\n```json\n'+answer+'\n```','```json\n'+answer+'\n```\nprose'])assert.throws(()=>parseModelToolSelection(bad,tools,1))
  assert.throws(()=>parseModelToolSelection(answer,[tools[0]!,tools[0]!],1),/Ambiguous/)
  assert.throws(()=>parseModelToolSelection(JSON.stringify({text:'',tool_calls:[{name:'research_run',arguments:'{}'},{name:'research_run',arguments:'{}'}]}),tools,1),/call bound/)
  assert.throws(()=>parseModelToolSelection('{"text":"","tool_calls":[{"name":"shell","arguments":"{}"}]}',tools,1),/absent/)
  assert.throws(()=>parseModelToolSelection('{"text":"","tool_calls":[{"name":"research_run","arguments":"[]"}]}',tools,1),/JSON object/)
  assert.throws(()=>decodeTraexUsage({input_tokens:1,output_tokens:2,cached_input_tokens:3,cache_creation_input_tokens:0,reasoning_output_tokens:0}),/overlap/)
  assert.throws(()=>decodeTraexUsage({input_tokens:Number.MAX_SAFE_INTEGER,output_tokens:Number.MAX_SAFE_INTEGER,cached_input_tokens:0,cache_creation_input_tokens:0,reasoning_output_tokens:0}),/overflow/)
  assert.deepEqual(decodeTraexUsage({input_tokens:100,output_tokens:20,cached_input_tokens:30,cache_creation_input_tokens:10,reasoning_output_tokens:5}),
    {inputTokens:60,outputTokens:20,cacheReadTokens:30,cacheWriteTokens:10,reasoningTokens:5,totalTokens:120})
})
