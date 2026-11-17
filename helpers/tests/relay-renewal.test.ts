import assert from 'node:assert/strict'
import test from 'node:test'
import {validateReviewedDeadlineRenewal} from '../examples/traex-tools/relay-renewal.mjs'
import {residentPredecessor} from '../examples/traex-tools/relay-state.mjs'

function fixture(){
 const requestRef={sha256:'1'.repeat(64),size_bytes:100,path:'fixture-request'}
 const review={decision:'approve',reason:'transport only',review_id:'original-owner',request_sha256:requestRef.sha256}
 const proposal={max_requests:100,from_per_request_ms:600000,to_per_request_ms:1200000,retained_requests:4,
  token_spending_cap:null,no_scientific_admission:true,all_old_records_and_unknown_usage_retained:true}
 const request={review_id:review.review_id,proposal}
 const completion={session_id:review.review_id,message_id:'original',events:[
  {seq:0,type:'user/message',data:{id:'original',content:[{type:'text',text:JSON.stringify({request_sha256:requestRef.sha256})}]}},
  {seq:1,type:'assistant/message',data:{message:{source:{kind:'model',provider:'fixture'},content:[{type:'text',text:JSON.stringify(review)}]}}},
  {seq:2,type:'turn/end',data:{reason:{kind:'completed'}}}]}
 const snapshot={requests:5,active:0,maxRequests:100,perRequestMs:600000,ledger:[{ordinal:1,status:'unresolved'},{ordinal:2,status:'completed'}],text:['retained'],tools:['retained']}
 const controls={maxRequests:100,perRequestMs:1200000,deadlineRenewal:{reviewer_provider:'fixture',review:{path:'fixture',sha256:'2'.repeat(64),size_bytes:100}}}
 return {snapshot,controls,records:{review,request,completion,proposal,requestRef}}
}
test('actual native approval permits only the bound idle deadline renewal, retaining all history',()=>{
 const {snapshot,controls,records}=fixture(),before=structuredClone(snapshot)
 const proof=validateReviewedDeadlineRenewal(snapshot,controls,records)
 assert.equal(proof.scientific_execution_authorized,false)
 assert.deepEqual(residentPredecessor(snapshot,controls,proof),snapshot)
 assert.deepEqual(snapshot,before)
 assert.throws(()=>residentPredecessor(snapshot,controls),/limits changed/)
})
test('budget/state/request/model/completion drift cannot enlarge a resident deadline',()=>{
 const mutations=[
  (x:any)=>x.snapshot.active=1,
  (x:any)=>x.controls.maxRequests=101,
  (x:any)=>x.records.proposal.to_per_request_ms=600001,
  (x:any)=>x.records.proposal.from_per_request_ms=500000,
  (x:any)=>x.records.proposal.retained_requests=6,
  (x:any)=>x.records.proposal.token_spending_cap=10,
  (x:any)=>x.records.review.decision='defer',
  (x:any)=>x.records.review.request_sha256='0'.repeat(64),
  (x:any)=>x.records.completion.session_id='other',
  (x:any)=>x.records.completion.events[1].data.message.source.kind='tool',
  (x:any)=>x.records.completion.events[1].data.message.source.provider='other',
  (x:any)=>x.records.completion.events[2].data.reason.kind='error',
  (x:any)=>x.records.completion.events[0].data.content[0].text='missing request',
  (x:any)=>x.records.completion.events[1].type='tool/call',
  (x:any)=>x.records.completion.events[1].seq=9,
  (x:any)=>x.records.request.proposal={...x.records.proposal,to_per_request_ms:1400000},
 ]
 for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>validateReviewedDeadlineRenewal(f.snapshot,f.controls,f.records))}
})
