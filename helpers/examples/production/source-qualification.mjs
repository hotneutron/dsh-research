// Explicit disposable Source lifecycle probe; never install in a scientific profile.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { LlmAdapter, ToolCallId } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { SessionId } from '@deepseek-ai/dsh-session'
import { assembleContextFor } from '@deepseek-ai/dsh-agent'

export const name = 'production-source-lifecycle-qualification'
export const inject = ['llm','webServer','agents','tools','sessionController','configEditor']
export async function apply(ctx) {
  assert.equal(process.env.DSH_PRODUCTION_SOURCE_QUALIFICATION,'1')
  let originalAgent, lateCalls=0
  const failures=[]
  ctx.on('internal/status',fiber=>{
    if(fiber.state===3) void fiber.await().catch(error=>failures.push({name:fiber.name,error:String(error)}))
  })
  const config=JSON.parse(await readFile(process.env.DSH_PRODUCTION_RESEARCH_CONFIG,'utf8'))
  const user=JSON.parse(await readFile(resolve(config.project_root,config.initial_user_request.uri),'utf8'))
  const triggerId=`native-cli-user:${user.thread_id}:${user.native_events[0].item.id}`
  let routed=false
  class Scripted extends LlmAdapter {
    async resolveModel(provider,model) { return {provider,id:model,name:model} }
    async *stream(options) {
      if(!routed&&options.tools?.some(tool=>tool.name==='orchestrator_route')&&JSON.stringify(options.messages).includes(triggerId)) {
        routed=true
        const id=ToolCallId(randomUUID()), args=JSON.stringify({decisions:[{kind:'accept',trigger_id:triggerId,title:'Disposable production Source lifecycle qualification',worktree_name:'source-lifecycle-qualification',acknowledgement:'Retain the authorized request; qualify only Source lifecycle.'}]})
        yield {type:'block-start',index:0,blockType:'tool-call'}
        yield {type:'tool-call-delta',index:0,id,name:'orchestrator_route',argumentsDelta:args}
        yield {type:'block-end',index:0,block:{type:'tool-call',id,name:'orchestrator_route',arguments:args}}
        yield {type:'finish',reason:{kind:'tool-calls'}}
        return
      }
      yield {type:'block-start',index:0,blockType:'text'}
      yield {type:'text-delta',index:0,text:'Disposable native Source lifecycle only. No model-selected tools or scientific execution.'}
      yield {type:'block-end',index:0,block:{type:'text',text:'Disposable native Source lifecycle only. No model-selected tools or scientific execution.'}}
      yield {type:'finish',reason:{kind:'stop'}}
    }
  }
  ctx.effect(()=>ctx.llm.registerAdapter(['default-qualification','production-lifecycle-author','production-lifecycle-reviewer'],new Scripted()))
  ctx.effect(()=>ctx.webServer.register({kind:'prefix',path:'/production-lifecycle',handler:async(req,res)=>{
    const json=(status,value)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value))}
    if(req.headers.host!==`127.0.0.1:${ctx.webServer.port}`||req.headers['x-orchestrator-request']!=='1') return json(403,{error:'Local qualification only'})
    try {
      if(req.url==='/production-lifecycle/failures') return json(200,{failures})
      const response=await fetch(`http://127.0.0.1:${ctx.webServer.port}/project-research`,{headers:{'x-orchestrator-request':'1'}})
      assert.ok(response.ok);const current=await response.json();assert.ok(current.state)
      const resolved=await ctx.sessionController.resolveAgent(SessionId(current.state.authority.writer_id));assert.ok(!('error' in resolved))
      const agent=resolved.agent;originalAgent??=agent
      if(req.url==='/production-lifecycle/reload'&&req.method==='POST') {
        const entry=ctx.configEditor.entries().find(entry=>entry.options.id==='production-research-source');assert.ok(entry)
        await entry.fiber.restart()
        return json(200,{reloaded:true,same_native_author:ctx.agents.get(agent.id)===originalAgent})
      }
      if(req.url==='/production-lifecycle/late'&&req.method==='POST') {
        const remove=agent.ctx.tools.register(defineTool({name:'lifecycle_late_bypass',description:'Probe denied late local tool',parameters:{},
          output:{schema:{type:'json'},render:()=>[]},execute:()=>{lateCalls++;return {}}}))
        try {
          const result=await ctx.tools.execute({callId:randomUUID(),name:'lifecycle_late_bypass',arguments:{},agent,signal:AbortSignal.timeout(5000)})
          return json(200,{is_error:result.isError,late_calls:lateCalls})
        } finally { remove() }
      }
      const prompt=await agent.ctx.systemPrompt.assemble(assembleContextFor(agent,AbortSignal.timeout(5000)))
      return json(200,{agent_id:agent.id,same_native_author:agent===originalAgent,status:agent.status,
        goal_sections:prompt.sections.filter(section=>section.name==='project-research-goal').length,
        loop_sections:prompt.sections.filter(section=>section.name==='production-research-loop').length,
        state:current.state,ready:current.ready})
    } catch(error) { return json(409,{error:String(error),stack:error.stack}) }
  }}))
}
