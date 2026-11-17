import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as wait } from 'node:timers/promises'
import { modelFixture } from './model-fixture.js'
import { sha256 } from '../src/bindings.js'

for(const transport of ['traex','mixed','mixed-claude'] as const)test(`native file fencing and retained restart work for ${transport} routes`, {timeout:30000}, async()=>{
  const f=await modelFixture({driver:transport === 'mixed-claude' ? 'claude' : transport === 'mixed' ? 'codex' : 'traex'}), root=join(f.root,'relay')
  const port=async()=>{const server=createServer();await new Promise<void>(yes=>server.listen(0,'127.0.0.1',yes));const address=server.address();assert.ok(address&&typeof address!=='string');const value=address.port;await new Promise<void>(yes=>server.close(()=>yes()));return value}
  const firstPort=await port(),secondPort=await port(),configPath=join(f.root,'transport.json')
  const moduleBytes=await readFile(new URL('../examples/model-transport/governance-fixture.mjs',import.meta.url)),uri='proofs/governance.mjs'
  await writeFile(join(f.root,uri),moduleBytes)
  const config={listenPort:firstPort,maxRequestBytes:200000,budget:{scope_id:'fixture-auth-scope',max_requests:8,max_in_flight:1},
    routes:{tools:transport !== 'traex' ? {...f.route,driver:{...f.route.driver,id:'traex-exec-v1',codex:undefined,claude:undefined,auto_context:[]},authentication:{...f.route.authentication,protected_reference:'fixture:no-credential'}} : f.route,text:{...f.route,id:'fixture-reviewer-route',role:'reviewer',dsh_provider:'fixture-reviewer-dsh'}},
    governance_module:{uri,sha256:sha256(moduleBytes),size_bytes:moduleBytes.length},fixture_before_read:f.route.exposure.decision}
  await writeFile(configPath,JSON.stringify(config))
  const processes:Array<{child:ReturnType<typeof spawn>;done:Promise<number|null>;errors:()=>string}>=[]
  const start=(path:string)=>{
    const child=spawn(process.execPath,[fileURLToPath(new URL('../examples/model-transport/relay.mjs',import.meta.url)),f.root,root,path],{stdio:['ignore','pipe','pipe']})
    let errors='';child.stderr.on('data',value=>errors+=value)
    const value={child,done:new Promise<number|null>((yes,no)=>{child.once('error',no);child.once('close',code=>yes(code))}),errors:()=>errors};processes.push(value);return value
  }
  const ready=async(p:ReturnType<typeof start>)=>{
    const end=Date.now()+10000
    while(Date.now()<end){assert.equal(p.child.exitCode,null,p.errors());try{const token=await readFile(join(root,'private-relay-token'),'utf8');const response=await fetch(`http://127.0.0.1:${firstPort}/status`,{headers:{'x-relay-token':token},signal:AbortSignal.timeout(1000)});if(response.ok)return token}catch{}await wait(25)}throw new Error('Relay readiness timeout')
  }
  try {
    const first=start(configPath),token=await ready(first)
    const reviewResponse=await fetch(`http://127.0.0.1:${firstPort}/text`,{method:'POST',headers:{'x-relay-token':token,'content-type':'application/json'},body:JSON.stringify({...f.options('marker-A'),sessionId:'fixture-reviewer',provider:'fixture-reviewer-dsh'})})
    const reviewBody=await reviewResponse.text();assert.ok(reviewBody.includes('\"type\":\"finish\"'),reviewBody)
    const request=async(body:unknown)=>{const response=await fetch(`http://127.0.0.1:${firstPort}/tools`,{method:'POST',headers:{'x-relay-token':token,'content-type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.text()}}
    const value=await request({...f.options('marker-A'),tools:[]});assert.ok(value.body.includes('"type":"finish"'))
    const statePath=join(root,'private-model-budget.json')
    const readState=async()=>JSON.parse(await readFile(statePath,'utf8'))
    assert.equal((await readState()).consumed_requests,2)
    const before=await readFile(statePath)
    const contenderConfig=join(f.root,'contender.json');await writeFile(contenderConfig,JSON.stringify({...config,listenPort:secondPort}))
    const contender=start(contenderConfig);assert.equal(await contender.done,1);assert.match(contender.errors(),/writer lock/)
    assert.deepEqual(await readFile(statePath),before)
    await request({...f.options(),messages:[{role:'user',content:[{type:'text',text:'x'.repeat(250000)}]}]})
    assert.equal((await readState()).consumed_requests,2)
    assert.ok((JSON.parse(await readFile(join(root,'private-receiving-failures.json'),'utf8'))).length)
    first.child.kill('SIGTERM');assert.equal(await first.done,0)
    const resumed=start(configPath);await ready(resumed)
    assert.equal((await readState()).consumed_requests,2)
    const second=await request({...f.options('marker-B'),tools:[]});assert.ok(second.body.includes('marker-B'))
    assert.equal((await readState()).consumed_requests,3)
    resumed.child.kill('SIGTERM');assert.equal(await resumed.done,0)
    assert.equal((await readState()).active,0)
  } finally {
    for(const p of processes){if(p.child.exitCode===null&&p.child.signalCode===null)p.child.kill('SIGTERM');await p.done}
    await f.close()
  }
})
