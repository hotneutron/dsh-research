// Scripted transport for a disposable native default-worker qualification.
// Planning, review, admission and Session lifecycle use the installed public services.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NativeCoordinationTools, NativeReviewDriver, AUTHOR_INSTRUCTIONS } from 'dsh-research/native'
import { canonicalJson, publishCheckpoint } from 'dsh-research'
import { text } from '../synthetic-cpu/fixture.mjs'

export async function installAutomatic(f, ctx, author, observe, reopened = false) {
  const coordination = new NativeCoordinationTools(ctx, { artifacts: f.artifacts, table: f.table, projectKey: 'synthetic-m2', authorSessionId: author.id,
    propose: args => { if (!f.makeSubject) throw new Error('Reopened qualification cannot mint a fresh proposal'); return f.makeSubject(args.operation, args) } })
  const driver = await NativeReviewDriver.open(ctx, { artifacts: f.artifacts, table: f.table, projectKey: 'synthetic-m2', policy: f.config.policy,
    authorSessionId: author.id, deniedTools: ['skill'], assertActiveAuthority: f.config.assertActiveAuthority, observe })
  const disposers = [...coordination.tools(), driver.tool()].map(definition => author.ctx.tools.register(definition))
  disposers.push(author.ctx.systemPrompt.section({ name: 'automatic-research', order: 10001, interpolate: false, text: AUTHOR_INSTRUCTIONS }))
  if (!reopened) {
    for (let i = 0; i < 8; i++) f.reviewerLLM.script.push(options => {
      const block = options.messages.flatMap(m => m.content ?? []).findLast(b => b.type === 'text' && b.text.includes('REVIEW_PACKET_JSON\n'))
      const p = JSON.parse(block.text.split('REVIEW_PACKET_JSON\n').at(-1))
      return text(JSON.stringify({ review_id: p.review_id, action_id: p.action_id, manifest_sha256: p.manifest_sha256, request_sha256: p.request_sha256,
        decision: p.frozen_manifest.proposal.operation === 'baseline' ? 'request_changes' : 'approve',
        reason: p.frozen_manifest.proposal.operation === 'baseline' ? 'Change the synthetic mode before admission' : 'Exact bounded synthetic packet is consistent' }))
    })
  }
  const feedbackArgs = operation => ({ operation, scan: null, item_id: null, disposition: null, reason: null, action: null, evidence: null })
  let phase = 0, negative, positive, negativeRun, positiveRun, items, effectCheckpoint, finalPacket
  if (reopened) finalPacket = JSON.parse(await readFile(join(f.root, 'snapshots/automatic-final-packet.json'), 'utf8'))
  let scan
  if (!reopened) {
    const pages = []
    for (const version of ['v1', 'v2']) {
      const content = await f.json(`snapshots/feedback-${version}.json`, { actor: 'fixture-teammate', message_id: 'comment-1', version,
        text: version === 'v1' ? 'Try baseline' : 'Try positive instead' })
      const page = { cursor: version === 'v1' ? 'start' : 'page-1', next_cursor: version === 'v1' ? 'page-1' : null,
        items: [{ message_id: 'comment-1', source_version: version, content }] }
      pages.push({ ...page, capture: await f.json(`snapshots/feedback-page-${version}.json`, page) })
    }
    scan = await f.json('snapshots/feedback-scan.json', { source_id: 'fixture-comments', start_cursor: 'start', end_cursor: 'done', pages })
  }
  const last = messages => {
    const message = messages.filter(m => m.role === 'tool').at(-1)
    assert.ok(message, 'Native automatic transition requires its preceding tool result')
    return JSON.parse(message.content.filter(b => b.type === 'text').map(b => b.text).join(''))
  }
  const call = (name, args) => ({ name, args })
  const propose = (operation, plan_revision, checkpoint = null, feedback_item_id = null) => call('research_propose', { operation, plan_revision, checkpoint, feedback_item_id })
  return {
    close() { disposers.reverse().forEach(dispose => dispose()) },
    packet() { return finalPacket ?? { request: { mode: 'automatic' } } },
    async step(messages) {
      if (reopened) return null
      switch (phase++) {
        case 0: return propose('baseline', 'design-1')
        case 1: return call('research_review', { manifest: last(messages).manifest })
        case 2: assert.equal(last(messages).decision, 'request_changes'); return propose('negative', 'design-2')
        case 3: negative = last(messages); return call('research_review', { manifest: negative.manifest })
        case 4: { const r = last(messages); assert.equal(r.decision, 'approve'); return call('research_run', { manifest: negative.manifest, review: r.review, expected_revision: r.state_revision }) }
        case 5: negativeRun = last(messages); assert.equal(negativeRun.status, 'settled'); return call('research_feedback', { ...feedbackArgs('capture'), scan })
        case 6: items = last(messages).items; return call('research_feedback', { ...feedbackArgs('disposition'), item_id: items.find(i => i.source_version === 'v1').item_id,
          disposition: 'rejected', reason: 'Superseded by the durably captured edit' })
        case 7: return propose('positive', 'feedback-design', negativeRun.checkpoint, items.find(i => i.source_version === 'v2').item_id)
        case 8: positive = last(messages); return call('research_feedback', { ...feedbackArgs('disposition'), item_id: items.find(i => i.source_version === 'v2').item_id,
          disposition: 'adopted', reason: 'Change the frozen synthetic mode using the captured version', action: positive.manifest })
        case 9: return call('research_review', { manifest: positive.manifest })
        case 10: { const r = last(messages); assert.equal(r.decision, 'approve'); finalPacket = { manifestRef: positive.manifest, manifest: { action_id: positive.action_id },
          request: { manifest: positive.manifest, review: r.review, expected_revision: r.state_revision } }; return call('research_run', finalPacket.request) }
        case 11: positiveRun = last(messages); assert.equal(positiveRun.status, 'settled'); return call('research_feedback', { ...feedbackArgs('effect'),
          item_id: items.find(i => i.source_version === 'v2').item_id, action: positive.manifest, evidence: positiveRun.evidence })
        case 12:
          effectCheckpoint = last(messages).checkpoint
          await f.json('snapshots/automatic-final-packet.json', finalPacket)
          return call('orchestrator_report', { state: 'progress', human_action: null, summary: `Automatic reviewed successor settled; feedback effect ${canonicalJson(effectCheckpoint)}` })
        default: return null
      }
    },
    async prepare(mode) {
      const proposal = await coordination.propose({ operation: mode, plan_revision: `drill-${mode}`, checkpoint: null, feedback_item_id: null }, author)
      const review = await driver.review(proposal.manifest, author, AbortSignal.timeout(5000))
      assert.equal(review.decision, 'approve', canonicalJson(review))
      const manifest = JSON.parse(Buffer.from(await f.artifacts.read(proposal.manifest)).toString())
      return { manifestRef: proposal.manifest, manifest,
        request: { manifest: proposal.manifest, review: review.review, expected_revision: review.state_revision } }
    },
    async drill() {
      const state = f.table.get('synthetic-m2')
      assert.equal(state.consumed_attempts, 2); assert.equal(state.consumed_review_requests, 3)
      const actions = Object.values(state.actions)
      const evidence = await Promise.all(actions.map(async a => JSON.parse(Buffer.from(await f.artifacts.read(a.evidence)).toString())))
      assert.ok(evidence.some(e => e.evidence_status === 'valid' && e.verifier.verdict === 'negative'))
      assert.equal(Object.values(state.feedback.items).find(i => i.source_version === 'v2').effect_status, 'executed')
      assert.equal(state.feedback.cursors['fixture-comments'].cursor, 'done')
      const count = state.consumed_attempts, reviews = state.consumed_review_requests
      const replay = await driver.review(finalPacket.manifestRef, author, AbortSignal.timeout(5000))
      assert.equal(replay.replay, true)
      await coordination.capture(scan)
      const renamed = await coordination.propose({ operation: 'baseline', plan_revision: 'renamed-rejection', checkpoint: null, feedback_item_id: null }, author)
      await assert.rejects(driver.review(renamed.manifest, author, AbortSignal.timeout(5000)), /Unchanged rejected/)
      const release = await f.json('snapshots/automatic-release.json', { checkpoint: effectCheckpoint, outcome: 'synthetic feedback effect executed' })
      const input = { artifacts: f.artifacts, table: f.table, projectKey: 'synthetic-m2', checkpoint: effectCheckpoint, release, audience: 'fixture-reader', maxAttempts: 2 }
      const failed = await publishCheckpoint({ ...input, transport: { put: async () => { throw new Error('Controlled publication outage') }, fetch: async () => null } })
      assert.equal(failed.status, 'unknown'); assert.equal(f.table.get('synthetic-m2').hold, null)
      const memory = new Map()
      const delivered = await publishCheckpoint({ ...input, transport: { put: async (id, bytes) => { memory.set(id, bytes) },
        fetch: async id => memory.has(id) ? { bytes: memory.get(id), access: true, source: { transport: 'fixture-memory' } } : null } })
      assert.equal(delivered.status, 'verified')
      assert.equal(f.table.get('synthetic-m2').consumed_attempts, count); assert.equal(f.table.get('synthetic-m2').consumed_review_requests, reviews)
      const liveReviewer = ctx.agents.get('m2-reviewer')
      let reviewerEvents = liveReviewer?.session.snapshotEvents()
      if (!reviewerEvents) { const cut = await ctx.sessionQuery.observeSession('m2-reviewer', { projectionMode: 'none' }); try { reviewerEvents = cut.events } finally { cut[Symbol.dispose]() } }
      const reports = author.session.snapshotEvents().filter(e => e.type === 'tool/call' && e.data.name === 'orchestrator_report')
      assert.ok(reports.length)
      const humanActionNull = reports.every(e => JSON.parse(e.data.arguments).human_action === null)
      assert.ok(humanActionNull)
      return { evidence, publication: delivered, reviewer_events: reviewerEvents, human_action_null: humanActionNull, assertions: { request_changes_new_subject: true, valid_negative_successor: true,
        feedback_versions_and_actual_effect: true, unchanged_rejection_refused: true, publication_retry_no_science_replay: true } }
    },
  }
}
