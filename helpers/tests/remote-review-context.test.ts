import assert from 'node:assert/strict'
import test from 'node:test'
import {createServer} from 'node:http'
import {mkdtemp,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {RemoteTraexAdapter} from '../examples/traex-tools/remote-model.mjs'

const packet='REVIEW_PACKET_JSON\n'+JSON.stringify({review_id:'retained-review',action_id:'retained-action',request_sha256:'a'.repeat(64),manifest_sha256:'b'.repeat(64),full_source:'中文🙂 source'.repeat(100)})
const history=[{role:'user',id:'historical',content:[{type:'text',text:'x'.repeat(20*1024*1024)}]},
 {role:'system',content:[{type:'text',text:'exact system'}]},
 {role:'user',id:'retained',content:[{type:'text',text:packet}]},{role:'user',content:[{type:'text',text:'exact suffix'}]}]

test('native HTTP projection is opt-in and keeps complete current packet, system, suffix and input objects',async()=>{
 const root=await mkdtemp(join(tmpdir(),'remote-review-'));const token=join(root,'token');await writeFile(token,'synthetic-test-token')
 const keys=['DSH_RESEARCH_REAL_MODELS_URL','DSH_RESEARCH_REAL_MODELS_TOKEN_FILE','DSH_RESEARCH_REVIEW_CONTEXT_MODE']
 const original=keys.map(key=>process.env[key]);const bodies:any[]=[]
 const server=createServer(async(req,res)=>{const parts=[];for await(const chunk of req)parts.push(chunk);bodies.push(JSON.parse(Buffer.concat(parts).toString()));res.end(JSON.stringify({type:'usage',usage:{inputTokens:0,outputTokens:0,totalTokens:0}})+'\n'+JSON.stringify({type:'finish',reason:{kind:'stop'}})+'\n')})
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string')
 process.env.DSH_RESEARCH_REAL_MODELS_URL='http://127.0.0.1:'+address.port+'/';process.env.DSH_RESEARCH_REAL_MODELS_TOKEN_FILE=token
 try {
  const options={model:'DeepSeek-V4.1-Flash',sessionId:'reviewer',system:'top system',messages:history}
  process.env.DSH_RESEARCH_REVIEW_CONTEXT_MODE='latest_frozen_packet'
  const adapter=new RemoteTraexAdapter('text');for await(const _chunk of adapter.stream(options)){}
  assert.equal(bodies.length,1);assert.equal(bodies[0].system,options.system)
  assert.deepEqual(bodies[0].messages,history.slice(1));assert.equal(history[0]!.content[0]!.text.length,20*1024*1024)
  assert.equal(adapter.receipts[0].context_selection.original_messages,4);assert.equal(adapter.receipts[0].durable_native_history_mutated,false)
  assert.ok(Buffer.byteLength(JSON.stringify(bodies[0]))<16*1024*1024)
  delete process.env.DSH_RESEARCH_REVIEW_CONTEXT_MODE
  const smaller={...options,messages:[{...history[0],content:[{type:'text',text:'retained historical input'}]},...history.slice(1)]}
  for await(const _chunk of new RemoteTraexAdapter('text').stream(smaller)){}
  assert.deepEqual(bodies[1].messages,smaller.messages)
  process.env.DSH_RESEARCH_REVIEW_CONTEXT_MODE='invalid'
  await assert.rejects(async()=>{for await(const _chunk of new RemoteTraexAdapter('text').stream(options)){}},/Unsupported/)
  assert.equal(bodies.length,2)
  process.env.DSH_RESEARCH_REVIEW_CONTEXT_MODE='latest_frozen_packet'
  const malformed={...options,messages:[{role:'user',content:[{type:'text',text:'REVIEW_PACKET_JSON\n{"review_id":"unbound"}'}]}]}
  await assert.rejects(async()=>{for await(const _chunk of new RemoteTraexAdapter('text').stream(malformed)){}},/identity/)
  assert.equal(bodies.length,2)
 } finally {
  keys.forEach((key,index)=>{if(original[index]===undefined)delete process.env[key];else process.env[key]=original[index]})
  await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(root,{recursive:true,force:true})
 }
})
