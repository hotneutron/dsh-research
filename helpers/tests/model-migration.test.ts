import assert from 'node:assert/strict'
import test from 'node:test'
import {sha256} from '../src/bindings.js'
import {importStoppedModelHistory} from '../src/model-migration.js'
import {ModelRequestBudget} from '../src/model-budget.js'

test('stopped model mapping retains charged failed rows and resolvable original identities',()=>{
 const source=Buffer.from(JSON.stringify({requests:2,maxRequests:5,active:0,ledger:[{ordinal:1,status:'completed',kind:'tools',session_id:'original-author',usage:{output_tokens:20000}},{ordinal:2,status:'unresolved',error:'unknown usage'}]},null,2))
 const ref={uri:'retained/model-history.json',sha256:sha256(source),size_bytes:source.length}
 const mapped=importStoppedModelHistory(source,ref,{scopeId:'same-principal',maxInFlight:1,fence:{snapshot_sha256:ref.sha256,evidence:ref}})
 assert.equal(mapped.snapshot.consumed_requests,2);assert.equal(mapped.snapshot.records[1]?.phase,'unresolved')
 assert.equal((mapped.snapshot.records[1]?.receipt as any).usage,null)
 assert.deepEqual(mapped.identity_index[1],{id:mapped.snapshot.records[1]?.id,original:ref,pointer:'/ledger/1'})
 const budget=new ModelRequestBudget('same-principal',5,1,async()=>{},mapped.snapshot)
 assert.equal(budget.snapshot().consumed_requests,2)
 assert.throws(()=>importStoppedModelHistory(Buffer.from('changed'),ref,{scopeId:'same-principal',maxInFlight:1,fence:{snapshot_sha256:ref.sha256,evidence:ref}}),/identity mismatch/)
})

test('active, missing and duplicated source model history cannot create a fresh budget',()=>{
 for(const old of [{requests:1,maxRequests:5,active:1,ledger:[{ordinal:1,status:'completed'}]},{requests:2,maxRequests:5,active:0,ledger:[{ordinal:1,status:'completed'}]},{requests:2,maxRequests:5,active:0,ledger:[{ordinal:1,status:'completed'},{ordinal:1,status:'unresolved'}]}]){
  const bytes=Buffer.from(JSON.stringify(old)),ref={uri:'retained/source.json',sha256:sha256(bytes),size_bytes:bytes.length}
  assert.throws(()=>importStoppedModelHistory(bytes,ref,{scopeId:'same-principal',maxInFlight:1,fence:{snapshot_sha256:ref.sha256,evidence:ref}}))
 }
})
