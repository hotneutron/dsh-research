import assert from 'node:assert/strict'
import test from 'node:test'
import { join } from 'node:path'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { modelFixture } from './model-fixture.js'
import { ModelTextAdapter } from '../src/model-transport.js'
import { TraexDriver } from '../src/model-drivers/traex.js'
import { CodexDriver } from '../src/model-drivers/codex.js'
import { ClaudeDriver } from '../src/model-drivers/claude.js'
import { OpenCodeDriver } from '../src/model-drivers/opencode.js'
import { deriveActionId } from '../src/bindings.js'
import { ManifestSchema } from '../src/records.js'
import { NativeReviewDriver } from '../src/review.js'
import { createCpuFixture } from '../examples/synthetic-cpu/fixture.mjs'

for(const transport of ['traex','codex','claude','opencode'] as const)test(`DSH author and separate reviewer use ${transport} for exact review, native execution and settled replay`, {timeout:30000}, async()=>{
  const m=await modelFixture({maxRequests:6,maxInFlight:2,driver:transport})
  let native:any
  let remove:undefined|(()=>void)
  try {
    const original=m.governance.approveContext
    m.governance.approveContext=async(...args)=>({...await original(...args),author_session_id:'m2-author',reviewer_session_id:'m2-reviewer'})
    const reviewer=new ModelTextAdapter({projectRoot:m.root,artifactsRoot:join(m.root,'requests'),driver:transport === 'opencode' ? new OpenCodeDriver() : transport === 'claude' ? new ClaudeDriver() : transport === 'codex' ? new CodexDriver() : new TraexDriver(),governance:m.governance,budget:m.budget,
      route:{...m.route,id:'fixture-reviewer-route',dsh_provider:'fixture-reviewer-dsh',role:'reviewer'}})
    native=await createCpuFixture(join(m.root,'native-project'),{production:true,automaticReview:true,authorLLM:m.tools,authorProvider:'fixture-dsh',authorModel:m.route.model,
      reviewerLLM:reviewer,reviewerProvider:'fixture-reviewer-dsh',reviewerModel:m.route.model,maxAttempts:1,maxTotalTimeoutMs:2000,reviewTimeout:10000})
    const subject=await native.makeSubject('negative')
    const manifest=ManifestSchema.parse({...subject,action_id:deriveActionId(subject)})
    const manifestRef=await native.json('snapshots/extracted-transport-manifest.json',manifest)
    const driver=await NativeReviewDriver.open(native.ctx,{...native.config,reviewContextMaxBytes:262144,deniedTools:native.ctx.tools.schemas().map((t:any)=>t.name),
      reviewContext:async()=>[manifest.plan.snapshot,manifest.candidate.tree,manifest.evaluator.verifier]})
    const review=await driver.review(manifestRef,native.author,AbortSignal.timeout(10000))
    assert.equal(review.decision,'approve');assert.equal(reviewer.receipts.length,1)
    remove=native.adapter.register({toolScope:'author',inheritedTools:[]})
    const request={manifest:manifestRef,review:review.review,expected_revision:review.state_revision}
    native.author.followup(createUserMessage({source:{kind:'user'},content:[{type:'text',text:'Execute only the exact qualified fixture request, then assess its actual result. QUALIFIED_NATIVE_REQUEST_JSON\n'+JSON.stringify(request)}]}))
    await native.author.whenIdle()
    const state=native.table.get('synthetic-m2'),action=state.actions[manifest.action_id]
    assert.equal(action.phase,'settled');assert.equal(state.consumed_attempts,1);assert.equal(state.consumed_review_requests,1)
    const result=await native.collected(action)
    assert.equal(result.evidence.evidence_status,'valid');assert.equal(result.evidence.verifier.verdict,'negative')
    const before=m.budget.snapshot().consumed_requests
    const replay=await native.adapter.run(request,native.author,AbortSignal.timeout(10000))
    assert.equal(replay.replay,true);assert.equal(m.budget.snapshot().consumed_requests,before)
    assert.equal(native.table.get('synthetic-m2').consumed_attempts,1)
    assert.equal(m.budget.snapshot().active,0)
    assert.ok(before>=3)
  } finally {remove?.();await native?.close();await m.close()}
})
