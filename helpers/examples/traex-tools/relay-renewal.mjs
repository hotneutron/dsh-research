import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')

export function validateReviewedDeadlineRenewal(snapshot,controls,records){
 const {review,request,completion,proposal,requestRef}=records
 if(snapshot.active!==0||snapshot.maxRequests!==controls.maxRequests||proposal.max_requests!==controls.maxRequests)
  throw new Error('Reviewed deadline handoff requires unchanged idle request allowance')
 if(proposal.from_per_request_ms!==snapshot.perRequestMs||proposal.to_per_request_ms!==controls.perRequestMs
  ||!Number.isSafeInteger(proposal.to_per_request_ms)||proposal.to_per_request_ms<=proposal.from_per_request_ms||proposal.to_per_request_ms>3600000)
  throw new Error('Reviewed deadline values do not match the exact handoff')
 if(!Number.isSafeInteger(proposal.retained_requests)||proposal.retained_requests>snapshot.requests
  ||proposal.token_spending_cap!==null||proposal.no_scientific_admission!==true||proposal.all_old_records_and_unknown_usage_retained!==true)
  throw new Error('Reviewed deadline handoff does not preserve original consumption')
 if(review.decision!=='approve'||review.review_id!==completion.session_id||review.request_sha256!==requestRef.sha256
  ||!isDeepStrictEqual(request.proposal,proposal)||request.review_id!==review.review_id)
  throw new Error('Deadline approval is not bound to the original request/proposal')
 const events=completion.events
 if(!Array.isArray(events)||!events.length||events.some((event,index)=>event.seq!==index)||events.some(event=>event.type==='tool/call'))
  throw new Error('Deadline approval has no complete tool-free native completion')
 const end=events.findLast(event=>event.type==='turn/end'),answer=events.findLast(event=>event.type==='assistant/message')
 const messageId=completion.continuation_message_id??completion.message_id
 const input=events.find(event=>event.type==='user/message'&&event.data.id===messageId)
 if(end?.data.reason.kind!=='completed'||answer?.data.message.source.kind!=='model'
  ||answer.data.message.source.provider!==controls.deadlineRenewal.reviewer_provider
  ||!input?.data.content.some(block=>block.type==='text'&&block.text.includes(requestRef.sha256)))
  throw new Error('Deadline approval lacks the matching actual native model request')
 const output=JSON.parse(answer.data.message.content.filter(block=>block.type==='text').map(block=>block.text).join(''))
 for(const key of ['decision','reason','review_id','request_sha256'])if(output[key]!==review[key])throw new Error('Deadline review differs from actual native output')
 return {qualified:true,from_ms:proposal.from_per_request_ms,to_ms:proposal.to_per_request_ms,
  retained_requests:snapshot.requests,approval:controls.deadlineRenewal.review,request:requestRef,scientific_execution_authorized:false}
}

export async function loadReviewedDeadlineRenewal(controls,snapshotBytes){
 const renewal=controls.deadlineRenewal
 if(!renewal)return null
 if(digest(snapshotBytes)!==renewal.predecessor_sha256)throw new Error('Deadline handoff predecessor bytes changed')
 const read=async ref=>{
  const bytes=await readFile(ref.path)
  if(bytes.length!==ref.size_bytes||digest(bytes)!==ref.sha256)throw new Error('Deadline review artifact identity changed')
  return JSON.parse(bytes.toString('utf8'))
 }
 const review=await read(renewal.review),request=await read(renewal.request),completion=await read(renewal.completion),proposal=await read(renewal.proposal)
 for(const [name,value]of [['request',renewal.request],['completion',renewal.completion],['proposal',renewal.proposal]]){
  if(review[name]?.sha256!==value.sha256||review[name]?.size_bytes!==value.size_bytes)throw new Error('Deadline review references a different '+name)
 }
 return validateReviewedDeadlineRenewal(JSON.parse(snapshotBytes.toString('utf8')),controls,{review,request,completion,proposal,requestRef:renewal.request})
}
