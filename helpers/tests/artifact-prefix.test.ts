import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,stat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {NativeCoordinationTools,NativeReviewDriver} from 'dsh-research/native'
import {ManifestSchema} from 'dsh-research'
import {createCpuFixture} from '../examples/synthetic-cpu/fixture.mjs'

test('project-owned proposal and review prefixes retain returned refs without root snapshots',async()=>{
  const parent=await mkdtemp(join(tmpdir(),'dsh-project-prefix-'))
  const f=await createCpuFixture(join(parent,'project'),{automaticReview:true})
  const prefix='local_artifacts/autoresearch/dsh/goal/planning'
  try{
    const coordination=new NativeCoordinationTools(f.ctx,{artifactPrefix:prefix,artifacts:f.artifacts,table:f.table,projectKey:'synthetic-m2',authorSessionId:f.author.id,
      propose:async args=>ManifestSchema.omit({action_id:true}).parse(await f.makeSubject(args.operation,args))})
    const proposal=await coordination.propose({operation:'negative',plan_revision:'prefix-v1',checkpoint:null,feedback_item_id:null},f.author)
    assert.ok(proposal.manifest.uri.startsWith(prefix+'/proposals/'))
    const manifest=JSON.parse(Buffer.from(await f.artifacts.read(proposal.manifest)).toString())
    assert.equal(manifest.action_id,proposal.action_id)
    let checks=0
    const driver=await NativeReviewDriver.open(f.ctx,{artifactPrefix:prefix,artifacts:f.artifacts,table:f.table,projectKey:'synthetic-m2',policy:f.policyRef,authorSessionId:f.author.id,deniedTools:[],
      assertActiveAuthority:async()=>{if(++checks===2)await f.table.update('synthetic-m2',s=>({...s,stopped:true,revision:s.revision+1}))}})
    await driver.review(proposal.manifest,f.author,AbortSignal.timeout(3000))
    const current=f.table.get('synthetic-m2');assert.ok(current)
    const intent=Object.values(current.review_requests)[0];assert.ok(intent)
    assert.ok(intent.request.uri.startsWith(prefix+'/reviews/'))
    const request=JSON.parse(Buffer.from(await f.artifacts.read(intent.request)).toString())
    assert.equal(request.manifest.sha256,proposal.manifest.sha256)
    await assert.rejects(stat(join(f.root,'snapshots/proposals')),/ENOENT/)
    await assert.rejects(stat(join(f.root,'snapshots/reviews')),/ENOENT/)
  }finally{await f.close();await rm(parent,{recursive:true,force:true})}
})
