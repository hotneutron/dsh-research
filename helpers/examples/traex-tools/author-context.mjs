import { createHash } from 'node:crypto'

// Keep the authoritative goal/current results without rewriting durable history.
export function selectAuthorContext(options, controls) {
  if (controls.authorContextMode !== 'goal_and_recent_turns' || !options.sessionId?.startsWith('worker-'))
    return {options,selection:null}
  const messages=options.messages??[],count=controls.authorRecentMessages??18
  if (!Number.isSafeInteger(count)||count<6)throw new Error('Explicit author recent-message window must be at least six')
  let start=Math.max(0,messages.length-count)
  while(start>0&&messages[start]?.role==='tool')start--
  const keep=new Set(messages.slice(0,start).filter(m=>m.role==='system'))
  const original=messages.find(m=>m.role==='user')
  if(original)keep.add(original)
  const prefix=messages.slice(0,start).filter(m=>keep.has(m))
  const current=[...prefix,...messages.slice(start)]
  return {options:{...options,messages:current},selection:{mode:'goal_and_recent_turns',
    original_messages:messages.length,selected_messages:current.length,recent_start:start,
    original_goal_message_id:original?.id??null,
    current_suffix_sha256:createHash('sha256').update(JSON.stringify(messages.slice(start))).digest('hex'),
    durable_history_mutated:false,model_token_limit:null}}
}
