import assert from 'node:assert/strict'
import test from 'node:test'
import {selectAuthorContext} from '../examples/traex-tools/author-context.mjs'

test('author context retains system, original goal and complete recent call/results without editing history',()=>{
  const system={role:'system',content:[{type:'text',text:'Original authority and current goal'}]}
  const goal={role:'user',id:'original-goal',source:{kind:'user'},content:[{type:'text',text:'Approved research'}]}
  const messages=[system,goal,...Array.from({length:20},(_,i)=>({role:i%2?'tool':'assistant',id:'m'+i,content:[{type:'text',text:i===19?'FULL_AUTHORITATIVE_STATUS':'old'}]}))]
  const options={sessionId:'worker-original',messages,system:'unchanged',tools:[{name:'research_run'}]}
  const before=structuredClone(options),result=selectAuthorContext(options,{authorContextMode:'goal_and_recent_turns',authorRecentMessages:7})
  assert.equal(result.options.messages[0],system);assert.equal(result.options.messages[1],goal)
  assert.equal(result.options.messages.at(-1),messages.at(-1));assert.equal(result.options.tools,options.tools)
  assert.equal(result.options.system,options.system);assert.ok(result.selection)
  assert.notEqual(result.options.messages[2]?.role,'tool');assert.deepEqual(options,before)
})
test('historical behavior and non-author routes retain the original complete request',()=>{
  const request={sessionId:'reviewer',messages:[]}
  assert.equal(selectAuthorContext(request,{}).options,request)
  assert.equal(selectAuthorContext(request,{authorContextMode:'goal_and_recent_turns'}).options,request)
  assert.throws(()=>selectAuthorContext({sessionId:'worker-one',messages:[]},{authorContextMode:'goal_and_recent_turns',authorRecentMessages:1}))
})
