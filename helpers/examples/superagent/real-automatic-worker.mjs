// Real-model native protocol qualification on a disposable default worker.
import assert from 'node:assert/strict'
import { NativeCoordinationTools, NativeReviewDriver, AUTHOR_INSTRUCTIONS } from 'dsh-research/native'

export async function installRealAutomatic(f, ctx, author) {
  const coordination = new NativeCoordinationTools(ctx, { artifacts: f.artifacts, table: f.table, projectKey: 'synthetic-m2', authorSessionId: author.id,
    propose: args => { if (!f.makeSubject) throw new Error('Reopened qualification cannot mint a fresh proposal'); return f.makeSubject(args.operation, args) } })
  const review = await NativeReviewDriver.open(ctx, { artifacts: f.artifacts, table: f.table, projectKey: 'synthetic-m2', policy: f.config.policy,
    authorSessionId: author.id, deniedTools: ['skill'], assertActiveAuthority: f.config.assertActiveAuthority })
  const disposers = [...coordination.tools(), review.tool()].map(tool => author.ctx.tools.register(tool))
  disposers.push(author.ctx.systemPrompt.section({ name: 'real-model-qualification', order: 10001, interpolate: false, text: AUTHOR_INSTRUCTIONS +
    '\nThis is a finite software qualification, with zero Accorde scientific authority. Until a user message contains EXACT_RESEARCH_PACKET, reply briefly that you await the exact packet; do not call tools or report. ' +
    'Once the exact packet arrives: propose baseline/design-1 as an initial candidate for review. Its baseline operation does not satisfy the stated negative-result objective; retain the actual request_changes review. ' +
    'Then propose negative/design-2, review it and run only with the returned exact manifest/review/state_revision. After its actual settled valid negative, propose positive/successor-1 with that checkpoint, obtain new review and run. ' +
    'Use null feedback_item_id. Do not capture feedback in this model-only qualification. After both actual settled actions, call orchestrator_report with state=progress, human_action=null, then finish. ' +
    'Do not fabricate tool outcomes or references, invent another action, reopen uncertainty or wait for human input. All arguments must match the actual native tool schemas.' }))
  const state = () => f.table.get('synthetic-m2')
  const packet = () => {
    const action = Object.values(state().actions).at(-1)
    return action ? { request: { manifest: action.manifest, review: action.review, expected_revision: action.admitted_revision - 1 } } : { request: { mode: 'real-model' } }
  }
  return {
    close() { disposers.reverse().forEach(dispose => dispose()) },
    packet,
    async drill() {
      const current = state(), actions = Object.values(current.actions), reviews = Object.values(current.review_requests)
      assert.equal(current.consumed_attempts, 2)
      assert.ok(reviews.some(r => r.phase === 'request_changes'))
      assert.ok(reviews.filter(r => r.phase === 'completed').length >= 2)
      assert.ok(reviews.every(r => r.native_message_id && r.completion && r.receipt))
      assert.ok(actions.every(a => a.phase === 'settled'))
      const evidence = await Promise.all(actions.map(async a => JSON.parse(Buffer.from(await f.artifacts.read(a.evidence)).toString())))
      assert.ok(evidence.some(e => e.evidence_status === 'valid' && e.verifier.verdict === 'negative'))
      assert.ok(evidence.some(e => e.evidence_status === 'valid' && e.verifier.verdict === 'positive'))
      const count = current.consumed_attempts, reviewCount = current.consumed_review_requests
      const replay = await f.adapter.run(packet().request, author, AbortSignal.timeout(10000))
      assert.equal(replay.replay, true)
      assert.equal(state().consumed_attempts, count); assert.equal(state().consumed_review_requests, reviewCount)
      return { evidence, replay, reviewer_count: reviewCount, action_count: count, semantic_scope: 'declared synthetic negative/successor qualification only' }
    },
  }
}
