import assert from 'node:assert/strict'
import test from 'node:test'
import {mkdtemp,writeFile,chmod,readFile,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {TraexTextAdapter} from '../src/traex.js'
import {decodeModelContext} from '../src/traex-context.js'

test('preloaded context keeps every original byte and role while stdin, tools and accounting stay bounded',async()=>{
 const root=await mkdtemp(join(tmpdir(),'traex-full-project-context-'))
 try{
  const executable=join(root,'fixture-cli')
  await writeFile(executable,`#!${process.execPath}
import {readFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';import assert from 'node:assert/strict';
let stdin='';for await(const chunk of process.stdin)stdin+=chunk;
const doc=readFileSync(join(process.cwd(),'AGENTS.override.md'),'utf8'),request=readFileSync(join(process.cwd(),'request.txt'),'utf8');
assert(doc.includes(request));assert(request.length>1048576);assert(stdin.length<2048);
assert(process.argv.includes('read-only'));assert(process.argv.includes('*'));assert(process.argv.includes('--ephemeral'));
const limit=Number(process.argv.find(a=>a.startsWith('project_doc_max_bytes=')).split('=')[1]);assert(limit>=Buffer.byteLength(doc)+131072);
assert(!process.argv.some(a=>a.includes('max_tokens')||a.includes('maxTokens')));
writeFileSync(process.argv[process.argv.indexOf('--output-last-message')+1],'exact-context-fixture-completed');
for(const e of [{type:'thread.started',thread_id:'fixture'},{type:'turn.completed',usage:{input_tokens:100,output_tokens:20,cached_input_tokens:0,cache_creation_input_tokens:0,reasoning_output_tokens:0}}])process.stdout.write(JSON.stringify(e)+'\\n');
`)
  await chmod(executable,0o700)
  const options={provider:'fixture',model:'DeepSeek-V4.1-Flash',system:'retained system\n中文',messages:[
   {role:'user' as const,content:[{type:'text' as const,text:'0123456789 中文🙂\n'.repeat(100000)}]},
   {role:'user' as const,content:[{type:'text' as const,text:'exact suffix'}]}]}
  const original=structuredClone(options)
  const adapter=new TraexTextAdapter({executable,projectRoot:root,artifactsRoot:join(root,'requests'),model:'DeepSeek-V4.1-Flash',timeoutMs:10000,maxRequests:1,
   contextEncoding:'literal_v1',contextDelivery:'project_doc'})
  const chunks=[];for await(const chunk of adapter.stream(options))chunks.push(chunk)
  assert.equal(chunks.at(-1)?.type,'finish');assert.deepEqual(options,original)
  const receipt=adapter.receipts[0] as any
  assert.equal(receipt.context_delivery,'project_doc');assert.equal(receipt.output_token_cap,null)
  const prompt=await readFile(join(receipt.artifacts,'request.txt'),'utf8')
  // Native framing is preserved; exact decoder locates its own marker.
  const encoded=prompt.slice(prompt.indexOf('\n')+1)
  assert.deepEqual(decodeModelContext(encoded),{system:options.system,messages:options.messages})
  assert.equal(receipt.full_original_native_prompt_retained,true)
  assert.equal(receipt.context_document.size_bytes,Buffer.byteLength(await readFile(receipt.context_document.path,'utf8')))
  assert.equal(adapter.receipts.length,1)
 }finally{await rm(root,{recursive:true,force:true})}
})
