import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { GenerateOptions } from '@deepseek-ai/dsh-llm'
import { NativeCoordinationTools, NativeReviewDriver } from 'dsh-research/native'
import { ManifestSchema } from 'dsh-research'
import { createCpuFixture, text } from '../examples/synthetic-cpu/fixture.mjs'

for (const conflictingAck of [false, true]) test(`concurrent replay preserves completed review with ${conflictingAck ? 'conflicting' : 'matching'} late acknowledgement`, { timeout: 10000 }, async () => {
  const parent = await mkdtemp(join(tmpdir(), 'dsh-review-replay-'))
  const f = await createCpuFixture(join(parent, 'project'), { automaticReview: true })
  const published = Promise.withResolvers<void>(), release = Promise.withResolvers<void>()
  const original = f.ctx.subagents.startActivation.bind(f.ctx.subagents)
  let nativeMessageId = ''
  f.ctx.subagents.startActivation = async (spec: Parameters<typeof original>[0]) => {
    const result = await original(spec); nativeMessageId = result.messageId; published.resolve(); await release.promise;
    return conflictingAck ? { ...result, messageId: 'conflicting-native-message' } : result
  }
  const script = (options: GenerateOptions) => {
    const block = options.messages.flatMap(m => m.content).findLast(b => b.type === 'text' && b.text.includes('REVIEW_PACKET_JSON\n'))
    assert.ok(block && block.type === 'text')
    const p = JSON.parse(block.text.split('REVIEW_PACKET_JSON\n').at(-1)!)
    return text(JSON.stringify({ decision: 'approve', reason: 'Exact bounded packet', review_id: p.review_id,
      action_id: p.action_id, manifest_sha256: p.manifest_sha256, request_sha256: p.request_sha256 }))
  }
  try {
    f.reviewerLLM.script.push(script, script)
    const coordination = new NativeCoordinationTools(f.ctx, { artifacts: f.artifacts, table: f.table, projectKey: 'synthetic-m2', authorSessionId: f.author.id,
      propose: async args => ManifestSchema.omit({ action_id: true }).parse(await f.makeSubject(args.operation, args)) })
    const driver = await NativeReviewDriver.open(f.ctx, { artifacts: f.artifacts, table: f.table, projectKey: 'synthetic-m2', policy: f.policyRef, authorSessionId: f.author.id, deniedTools: [] })
    const proposal = await coordination.propose({ operation: 'negative', plan_revision: 'first', checkpoint: null, feedback_item_id: null }, f.author)
    const pending = driver.review(proposal.manifest, f.author, AbortSignal.timeout(5000))
    await published.promise
    assert.ok(nativeMessageId)
    await f.ctx.agents.get(f.reviewerId)!.whenIdle()
    const replay = await driver.review(proposal.manifest, f.author, AbortSignal.timeout(5000))
    assert.equal(replay.status, 'completed'); assert.equal(replay.replay, true)
    if (conflictingAck) await f.table.update('synthetic-m2', current => ({ ...current, revision: current.revision + 1,
      review_requests: Object.fromEntries(Object.entries(current.review_requests).map(([id, value]) => [id, { ...value, native_message_id: nativeMessageId }])) }))
    release.resolve()
    const result = await pending
    assert.equal(result.status, 'completed')
    assert.deepEqual(result.review, replay.review)
    if (conflictingAck) assert.equal(Object.values(f.table.get('synthetic-m2')!.review_requests)[0]!.native_message_id, nativeMessageId)
    assert.equal(f.table.get('synthetic-m2')!.consumed_review_requests, 1)
    f.ctx.subagents.startActivation = original
    const successor = await coordination.propose({ operation: 'positive', plan_revision: 'changed', checkpoint: null, feedback_item_id: null }, f.author)
    assert.equal((await driver.review(successor.manifest, f.author, AbortSignal.timeout(5000))).decision, 'approve')
    assert.equal(f.table.get('synthetic-m2')!.consumed_attempts, 0)
  } finally { release.resolve(); f.ctx.subagents.startActivation = original; await f.close(); await rm(parent, { recursive: true, force: true }) }
})
