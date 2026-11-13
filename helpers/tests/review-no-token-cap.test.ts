import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NativeCoordinationTools, NativeReviewDriver } from 'dsh-research/native'
import type { GenerateOptions } from '@deepseek-ai/dsh-llm'
import { ManifestSchema } from 'dsh-research'
import { DevelopmentPolicySchema } from '../src/admission.js'
import { createCpuFixture, text } from '../examples/synthetic-cpu/fixture.mjs'

test('native reviewer completes without a token cap, replays once and keeps its prospective request limit', { timeout: 10000 }, async () => {
  const parent = await mkdtemp(join(tmpdir(), 'dsh-review-uncapped-'))
  const f = await createCpuFixture(join(parent, 'project'), { automaticReview: true, maxReviews: 1 })
  try {
    assert.ok(f.policy.review_limits)
    assert.ok(!Object.hasOwn(f.policy.review_limits, 'max_tokens'))
    assert.equal(DevelopmentPolicySchema.parse({ ...f.policy, review_limits: { ...f.policy.review_limits, max_tokens: 512 } }).review_limits?.max_tokens, 512)
    f.reviewerLLM.script.push((options: GenerateOptions) => {
      assert.equal(options.maxTokens, undefined)
      assert.equal(options.tools?.length ?? 0, 0)
      const block = options.messages.flatMap(m => m.content).findLast(b => b.type === 'text' && b.text.includes('REVIEW_PACKET_JSON\n'))
      assert.ok(block && block.type === 'text')
      const packet = JSON.parse(block.text.split('REVIEW_PACKET_JSON\n').at(-1)!)
      return text(JSON.stringify({ decision: 'approve', reason: 'Exact bounded synthetic packet', review_id: packet.review_id,
        action_id: packet.action_id, manifest_sha256: packet.manifest_sha256, request_sha256: packet.request_sha256 }))
    })
    const coordination = new NativeCoordinationTools(f.ctx, { artifacts: f.artifacts, table: f.table, projectKey: 'synthetic-m2', authorSessionId: f.author.id,
      propose: async args => ManifestSchema.omit({ action_id: true }).parse(await f.makeSubject(args.operation, args)) })
    const driver = await NativeReviewDriver.open(f.ctx, { artifacts: f.artifacts, table: f.table, projectKey: 'synthetic-m2', policy: f.policyRef,
      authorSessionId: f.author.id, deniedTools: [] })
    const proposal = await coordination.propose({ operation: 'negative', plan_revision: 'uncapped', checkpoint: null, feedback_item_id: null }, f.author)
    const review = await driver.review(proposal.manifest, f.author, AbortSignal.timeout(5000))
    assert.equal(review.status, 'completed'); assert.equal(review.decision, 'approve')
    assert.equal((await driver.review(proposal.manifest, f.author, AbortSignal.timeout(5000))).replay, true)
    const successor = await coordination.propose({ operation: 'positive', plan_revision: 'next', checkpoint: null, feedback_item_id: null }, f.author)
    await assert.rejects(driver.review(successor.manifest, f.author, AbortSignal.timeout(5000)), /Review scope\/budget is unavailable/)
    assert.equal(f.reviewerLLM.requests.length, 1)
    assert.equal(f.table.get('synthetic-m2')!.consumed_review_requests, 1)
    assert.equal(f.table.get('synthetic-m2')!.consumed_attempts, 0)
  } finally { await f.close(); await rm(parent, { recursive: true, force: true }) }
})
