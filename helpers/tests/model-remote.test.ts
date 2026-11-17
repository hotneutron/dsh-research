import assert from 'node:assert/strict'
import test from 'node:test'
import {createServer} from 'node:http'
import {mkdtemp,writeFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {RemoteModelAdapter} from '../examples/model-transport/remote-model.mjs'

test('generic remote transport preserves complete native context and rejects model drift/failed partial results',async()=>{
 const root=await mkdtemp(join(tmpdir(),'model-remote-')),token=join(root,'token');await writeFile(token,'fixture-private-token')
 const keys=['DSH_RESEARCH_MODEL_TRANSPORT_URL','DSH_RESEARCH_MODEL_TRANSPORT_TOKEN_FILE','DSH_RESEARCH_MODEL_TRANSPORT_TIMEOUT_MS'],original=keys.map(key=>process.env[key]),bodies:any[]=[]
 let fail=false
 const server=createServer(async(req,res)=>{const parts=[];for await(const chunk of req)parts.push(chunk);bodies.push(JSON.parse(Buffer.concat(parts).toString()));
  if(fail)res.write(JSON.stringify({type:'tool-call-delta',index:0,id:'should-not-emit',name:'research_run',argumentsDelta:'{}'})+'\n')
  res.end(JSON.stringify({type:'usage',usage:{inputTokens:10,outputTokens:10,totalTokens:20}})+'\n'+JSON.stringify({type:'finish',reason:{kind:fail?'error':'stop'}})+'\n')})
 await new Promise<void>(yes=>server.listen(0,'127.0.0.1',yes));const address=server.address();assert.ok(address&&typeof address!=='string')
 process.env.DSH_RESEARCH_MODEL_TRANSPORT_URL='http://127.0.0.1:'+address.port+'/'
 process.env.DSH_RESEARCH_MODEL_TRANSPORT_TOKEN_FILE=token;process.env.DSH_RESEARCH_MODEL_TRANSPORT_TIMEOUT_MS='5000'
 const options={provider:'qualified-route',model:'qualified-model',sessionId:'reviewer',system:'original system',messages:[{role:'user',content:[{type:'text',text:'history 中文🙂'.repeat(10000)}]},{role:'user',content:[{type:'text',text:'current exact packet'}]}]}
 try {
  const adapter=new RemoteModelAdapter('text',{provider:options.provider,model:options.model});const chunks=[]
  for await(const chunk of adapter.stream(options))chunks.push(chunk)
  assert.deepEqual(bodies[0],options);assert.equal(chunks.at(-1)?.type,'finish')
  await assert.rejects(async()=>{for await(const _ of adapter.stream({...options,model:'other'})){}},/substitute/);assert.equal(bodies.length,1)
  fail=true;const rejected:any[]=[]
  await assert.rejects(async()=>{for await(const chunk of adapter.stream(options))rejected.push(chunk)},/complete usage/)
  assert.equal(rejected.length,0)
 } finally {keys.forEach((key,index)=>{if(original[index]===undefined)delete process.env[key];else process.env[key]=original[index]});await new Promise<void>(yes=>server.close(()=>yes()));await rm(root,{recursive:true,force:true})}
})
