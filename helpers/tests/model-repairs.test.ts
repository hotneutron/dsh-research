import assert from 'node:assert/strict'
import test from 'node:test'
import {mkdtemp,symlink,readdir,rm,writeFile,readFile,chmod} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {modelFixture} from './model-fixture.js'
import {ModelTextAdapter,ModelOwnershipError} from '../src/model-transport.js'
import type {DriverObservation} from '../src/model-transport.js'
import {ModelRequestBudget} from '../src/model-budget.js'
import {TraexDriver} from '../src/model-drivers/traex.js'

test('pre-existing private request symlink cannot receive context or executable files',async()=>{
 const f=await modelFixture(),outside=await mkdtemp(join(tmpdir(),'model-outside-'))
 try {
  await symlink(outside,join(f.root,'requests'))
  await assert.rejects(f.run(),/cannot traverse symlinks/)
  assert.deepEqual(await readdir(outside),[]);assert.equal(await f.modelCalls(),0);assert.equal(f.budget.snapshot().consumed_requests,0)
 }finally{await f.close();await rm(outside,{recursive:true,force:true})}
})

test('launch uses frozen interpreter bytes even when the original runtime changes after admission',async()=>{
 const f=await modelFixture({ownRuntime:true})
 try {
  f.setPersist(async snapshot=>{if(snapshot.consumed_requests===1){await chmod(f.route.driver.runtime[0]!.path,0o700);await writeFile(f.route.driver.runtime[0]!.path,'replaced runtime')}})
  assert.equal((await f.run()).at(-1).type,'finish');assert.equal(await f.modelCalls(),1)
  const receipt=f.text.receipts[0] as any;assert.notEqual(receipt.driver_observation.launch.interpreter.path,f.route.driver.runtime[0]!.path)
  assert.equal(receipt.driver_observation.launch.interpreter.sha256,f.route.driver.runtime[0]!.sha256)
 }finally{await f.close()}
})

test('authority revocation during driver preparation is rechecked at actual launch',async()=>{
 const f=await modelFixture()
 try {
  class RevokingDriver extends TraexDriver {
   override async run(...args:Parameters<TraexDriver['run']>){await readFile(join(args[2],'private-approved-context.json'));f.revoke();return super.run(...args)}
  }
  const adapter=new ModelTextAdapter({projectRoot:f.root,artifactsRoot:join(f.root,'requests'),route:f.route,driver:new RevokingDriver(),governance:f.governance,budget:f.budget})
  await assert.rejects(f.run(f.options(),adapter),/revoked/)
  assert.equal(await f.modelCalls(),0);assert.equal(f.budget.snapshot().consumed_requests,1)
 }finally{await f.close()}
})

test('caller schema mutation cannot change the admitted input bytes or output schema',async()=>{
 const f=await modelFixture()
 try {
  const schema:any={type:'object',properties:{text:{type:'string'}}}
  f.setPersist(async snapshot=>{if(snapshot.consumed_requests===1)schema.extra='x'.repeat(2000000)})
  const result=await f.text.complete(f.options(),{instructions:'Return the selected JSON response',schema,validate:JSON.parse})
  const receipt=result.receipt as any
  assert.ok(receipt.encoded_input_bytes<100000)
  assert.deepEqual(JSON.parse(await readFile(join(receipt.artifacts,'output-schema.json'),'utf8')),{type:'object',properties:{text:{type:'string'}}})
 }finally{await f.close()}
})

test('leader close cannot cancel descendant escalation or reopen an unresolved model scope', {timeout:15000}, async()=>{
 const f=await modelFixture()
 try {
  const controller=new AbortController(),work=f.run({...f.options('owned-descendant'),signal:controller.signal})
  const until=Date.now()+5000
  let child=0
  while(Date.now()<until){try{child=Number(await readFile(join(f.root,'child-pid.txt'),'utf8'));if(child)break}catch{}await new Promise(resolve=>setTimeout(resolve,25))}
  assert.ok(child);await new Promise(resolve=>setTimeout(resolve,350));controller.abort(new Error('Controlled leader shutdown'))
  await assert.rejects(work)
  assert.equal(f.budget.snapshot().consumed_requests,1)
  let alive=true;try{process.kill(child,0)}catch{alive=false}
  if(alive){assert.ok(f.budget.snapshot().hold);assert.throws(()=>f.budget.reserve('other-route','other-session'),/ownership is unresolved/)}
  const snapshot=f.budget.snapshot()
  if(snapshot.hold)assert.throws(()=>new ModelRequestBudget(snapshot.scope_id,snapshot.max_requests,snapshot.max_in_flight,async()=>{},snapshot),/fenced history/)
 }finally{await f.close()}
})

test('an existing reservation cannot admit or launch after another request holds the shared scope',async()=>{
 const f=await modelFixture({maxInFlight:2})
 try {
  const a=f.budget.reserve('a','a'),b=f.budget.reserve('b','b');await a.admit();await a.fail('unknown group',{pid:1},true)
  await assert.rejects(b.admit(),/ownership is unresolved/);await b.fail('held prerequisite')
  assert.equal(f.budget.snapshot().consumed_requests,1)
 }finally{await f.close()}
 const g=await modelFixture({maxInFlight:2})
 try {
  class HeldDriver extends TraexDriver {
   override async run(...args:Parameters<TraexDriver['run']>){const a=g.budget.reserve('a','a');await a.admit();await a.fail('unknown group',{},true);return super.run(...args)}
  }
  const adapter=new ModelTextAdapter({projectRoot:g.root,artifactsRoot:join(g.root,'requests'),route:g.route,driver:new HeldDriver(),governance:g.governance,budget:g.budget})
  await assert.rejects(g.run(g.options(),adapter),/ownership is unresolved/)
  assert.equal(await g.modelCalls(),0);assert.equal(g.budget.snapshot().consumed_requests,2)
 }finally{await g.close()}
})

test('cancelled process observation is awaited before capacity release and retains late ownership evidence',async()=>{
 const f=await modelFixture()
 try {
  let entered=false
  class DrainingProbe extends TraexDriver {
   override async observe(..._args:Parameters<TraexDriver['observe']>):Promise<DriverObservation>{entered=true;await new Promise(resolve=>setTimeout(resolve,100));throw new ModelOwnershipError('Probe descendants unresolved',{phase:'version-probe'})}
  }
  const adapter=new ModelTextAdapter({projectRoot:f.root,artifactsRoot:join(f.root,'requests'),route:f.route,driver:new DrainingProbe(),governance:f.governance,budget:f.budget})
  const controller=new AbortController(),work=f.run({...f.options(),signal:controller.signal},adapter);const rejected=assert.rejects(work,/descendants unresolved/)
  while(!entered)await new Promise(resolve=>setTimeout(resolve,5));controller.abort()
  await new Promise(resolve=>setTimeout(resolve,20));assert.equal(f.budget.snapshot().active,1)
  await rejected;assert.ok(f.budget.snapshot().hold);assert.equal(f.budget.snapshot().consumed_requests,0)
 }finally{await f.close()}
})

test('cancellation during durable settlement preserves charge/receipt and emits no native tool blocks',async()=>{
 const f=await modelFixture()
 try {
  const controller=new AbortController()
  f.setPersist(async snapshot=>{if(snapshot.records.some(record=>record.phase==='completed'))controller.abort(new Error('Controlled settle cancellation'))})
  const emitted:any[]=[]
  await assert.rejects(async()=>{for await(const chunk of f.tools.stream({...f.options('select-native-tool'),tools:[{name:'research_run',description:'Guarded',parameters:{type:'object'}}],signal:controller.signal}))emitted.push(chunk)})
  assert.equal(emitted.length,0);assert.equal(f.budget.snapshot().consumed_requests,1);assert.equal(f.budget.snapshot().records[0]?.phase,'completed')
 }finally{await f.close()}
})
