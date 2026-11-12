import assert from 'node:assert/strict'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { NativeCoordinationTools, NativeReviewDriver, AUTHOR_INSTRUCTIONS } from 'dsh-research/native'
import { canonicalJson, progressReport, publishCheckpoint, sha256 } from 'dsh-research'
import { createCpuFixture, text, tool } from './fixture.mjs'

const output = process.argv[2]
if (!output) throw new Error('Usage: node examples/synthetic-cpu/automatic.mjs <fresh-output-directory>')
const authorTools = ['research_run', 'research_review', 'research_propose', 'research_feedback']
const f = await createCpuFixture(output, { automaticReview: true, authorTools })
const { ctx, artifacts, author, authorLLM, reviewerLLM, table, root, json, binding, cases, trace } = f
const projectKey = f.config.projectKey
const disposers = []
function lastTool(options) {
  const message = options.messages.filter(m => m.role === 'tool').at(-1)
  if (!message) throw new Error('Scripted author has no preceding tool result')
  const textValue = message.content.filter(b => b.type === 'text').map(b => b.text).join('')
  return JSON.parse(textValue)
}
function reviewPacket(options) {
  const block = options.messages.flatMap(m => m.content ?? []).findLast(b => b.type === 'text' && b.text.includes('REVIEW_PACKET_JSON\n'))
  if (!block) throw new Error('Missing exact reviewer packet')
  return JSON.parse(block.text.split('REVIEW_PACKET_JSON\n').at(-1))
}
try {
  const coordination = new NativeCoordinationTools(ctx, { artifacts, table, projectKey, authorSessionId: author.id,
    propose: async args => f.makeSubject(args.operation, args) })
  const reviewer = await NativeReviewDriver.open(ctx, { artifacts, table, projectKey, policy: f.policyRef, authorSessionId: author.id,
    deniedTools: authorTools, observe: (event, detail) => trace.push({ event, detail }) })
  for (const definition of coordination.tools()) disposers.push(ctx.tools.register(definition))
  disposers.push(ctx.tools.register(reviewer.tool()))
  disposers.push(f.adapter.register())
  disposers.push(author.ctx.systemPrompt.section({ name: 'dsh-research:author', order: 90, text: AUTHOR_INSTRUCTIONS + '\n' + (await ctx.skills.get('research', { cwd: root })).content, interpolate: false }))

  for (let i = 0; i < 3; i++) reviewerLLM.script.push(options => {
    const packet = reviewPacket(options)
    return text(JSON.stringify({ review_id: packet.review_id, action_id: packet.action_id, manifest_sha256: packet.manifest_sha256,
      request_sha256: packet.request_sha256, decision: packet.frozen_manifest.proposal.operation === 'baseline' ? 'request_changes' : 'approve',
      reason: packet.frozen_manifest.proposal.operation === 'baseline' ? 'Use a materially changed synthetic mode' : 'Exact bounded synthetic proposal is consistent' }))
  })
  const original = await json('snapshots/feedback-original.json', { actor: 'fixture-teammate', message_id: 'comment-1', version: 'v1', text: 'Try baseline' })
  const edited = await json('snapshots/feedback-edited.json', { actor: 'fixture-teammate', message_id: 'comment-1', version: 'v2', text: 'Try positive instead' })
  const page0 = { cursor: 'start', next_cursor: 'page-1', items: [{ message_id: 'comment-1', source_version: 'v1', content: original }] }
  const page1 = { cursor: 'page-1', next_cursor: null, items: [{ message_id: 'comment-1', source_version: 'v2', content: edited }] }
  const scan = await json('snapshots/feedback-scan.json', { source_id: 'fixture-comments', start_cursor: 'start', end_cursor: 'done', pages: [
    { ...page0, capture: await json('snapshots/page-0.json', page0) }, { ...page1, capture: await json('snapshots/page-1.json', page1) }] })
  let negativeProposal, positiveProposal, negativeRun, positiveRun, feedbackItems, effectCheckpoint
  const feedbackArgs = operation => ({ operation, scan: null, item_id: null, disposition: null, reason: null, action: null, evidence: null })
  authorLLM.script.push(
    tool('auto-propose-baseline', { operation: 'baseline', plan_revision: 'design-1', checkpoint: null, feedback_item_id: null }, 'research_propose'),
    options => tool('auto-review-baseline', { manifest: lastTool(options).manifest }, 'research_review'),
    options => { assert.equal(lastTool(options).decision, 'request_changes'); return tool('auto-propose-negative', { operation: 'negative', plan_revision: 'design-2', checkpoint: null, feedback_item_id: null }, 'research_propose') },
    options => { negativeProposal = lastTool(options); return tool('auto-review-negative', { manifest: negativeProposal.manifest }, 'research_review') },
    options => { const result = lastTool(options); assert.equal(result.decision, 'approve'); return tool('auto-run-negative', { manifest: negativeProposal.manifest, review: result.review, expected_revision: result.state_revision }) },
    options => { negativeRun = lastTool(options); assert.equal(negativeRun.status, 'settled'); return tool('auto-feedback-capture', { ...feedbackArgs('capture'), scan }, 'research_feedback') },
    options => { feedbackItems = lastTool(options).items; return tool('auto-feedback-reject-old', { ...feedbackArgs('disposition'), item_id: feedbackItems.find(i => i.source_version === 'v1').item_id, disposition: 'rejected', reason: 'Superseded by the captured edit' }, 'research_feedback') },
    () => tool('auto-propose-positive', { operation: 'positive', plan_revision: 'feedback-design', checkpoint: negativeRun.checkpoint, feedback_item_id: feedbackItems.find(i => i.source_version === 'v2').item_id }, 'research_propose'),
    options => { positiveProposal = lastTool(options); return tool('auto-feedback-adopt', { ...feedbackArgs('disposition'), item_id: feedbackItems.find(i => i.source_version === 'v2').item_id, disposition: 'adopted', reason: 'Frozen proposal changes the synthetic mode', action: positiveProposal.manifest }, 'research_feedback') },
    () => tool('auto-review-positive', { manifest: positiveProposal.manifest }, 'research_review'),
    options => { const result = lastTool(options); assert.equal(result.decision, 'approve'); return tool('auto-run-positive', { manifest: positiveProposal.manifest, review: result.review, expected_revision: result.state_revision }) },
    options => { positiveRun = lastTool(options); return tool('auto-feedback-effect', { ...feedbackArgs('effect'), item_id: feedbackItems.find(i => i.source_version === 'v2').item_id, action: positiveProposal.manifest, evidence: positiveRun.evidence }, 'research_feedback') },
    options => { effectCheckpoint = lastTool(options).checkpoint; return text(JSON.stringify(progressReport('goal_complete', 'The frozen synthetic workflow completed; advisory effects are recorded.'))) },
  )
  author.followup(createUserMessage({ content: [{ type: 'text', text: 'Automatically propose, separately review and run a bounded synthetic path. Handle the captured advisory edit and record its actual effect; do not wait for another human reply.' }], source: { kind: 'user' } }))
  await author.whenIdle()
  const state = table.get(projectKey)
  assert.equal(state.consumed_attempts, 2)
  assert.equal(state.consumed_review_requests, 3)
  assert.equal(state.reserved_timeout_ms, 0)
  assert.equal(state.feedback.cursors['fixture-comments'].cursor, 'done')
  assert.equal(Object.values(state.feedback.items).find(i => i.source_version === 'v2').effect_status, 'executed')
  const negativeEvidence = JSON.parse(Buffer.from(await artifacts.read(negativeRun.evidence)).toString())
  assert.equal(negativeEvidence.evidence_status, 'valid'); assert.equal(negativeEvidence.verifier.verdict, 'negative')
  cases.push({ id: 'automatic-request-changes-new-proposal-and-separate-review', outcome: 'passed' },
    { id: 'valid-negative-autonomous-successor', outcome: 'passed' }, { id: 'feedback-edit-disposition-frozen-change-and-actual-effect', outcome: 'passed' })
  const reviewCount = state.consumed_review_requests
  await reviewer.review(positiveProposal.manifest, author, new AbortController().signal)
  assert.equal(table.get(projectKey).consumed_review_requests, reviewCount)
  await coordination.capture(scan)
  assert.equal(table.get(projectKey).consumed_attempts, 2)
  cases.push({ id: 'review-and-feedback-replay-no-new-attempt', outcome: 'passed' })
  const renamed = await coordination.propose({ operation: 'baseline', plan_revision: 'renamed-only', checkpoint: null, feedback_item_id: null }, author)
  await assert.rejects(reviewer.review(renamed.manifest, author, new AbortController().signal), /Unchanged rejected scientific subject/)
  cases.push({ id: 'unchanged-rejected-subject-cannot-revive-by-plan-name', outcome: 'passed' })

  const release = await json('snapshots/release.json', { checkpoint: effectCheckpoint.sha256, outcome: 'synthetic complete', feedback: Object.values(table.get(projectKey).feedback.items).map(i => ({ source: i.content, disposition: i.disposition, reason: i.reason, effect: i.effect, effect_status: i.effect_status })) })
  const publicationInput = { artifacts, table, projectKey, checkpoint: effectCheckpoint, release, audience: 'fixture-reader', maxAttempts: 2 }
  const failed = await publishCheckpoint({ ...publicationInput, transport: { put: async () => { throw new Error('Controlled lost publication response') }, fetch: async () => null } })
  assert.equal(failed.status, 'unknown'); assert.equal(table.get(projectKey).hold, null)
  const publications = new Map()
  const delivered = await publishCheckpoint({ ...publicationInput, transport: { put: async (id, bytes) => { publications.set(id, Buffer.from(bytes)) },
    fetch: async id => publications.has(id) ? { bytes: publications.get(id), access: true, source: { transport: 'fixture-memory', audience: 'fixture-reader' } } : null } })
  assert.equal(delivered.status, 'verified'); assert.equal(table.get(projectKey).consumed_attempts, 2)
  cases.push({ id: 'publication-failure-and-retry-only-mutate-publication', outcome: 'passed' })
  const events = author.session.snapshotEvents()
  assert.equal(events.filter(e => e.type === 'user/message' && e.data.source.kind === 'user').length, 1)
  const system = events.find(e => e.type === 'system/message')
  assert.ok(JSON.stringify(system).includes('research_review'))
  assert.ok(events.some(e => e.type === 'user/message' && e.data.source.kind === 'runtime-context'))
  const reviewerCut = await ctx.sessionQuery.observeSession(f.reviewerId, { projectionMode: 'none' })
  const reviewerEvents = reviewerCut.events
  reviewerCut[Symbol.dispose]()
  assert.equal(reviewerEvents.filter(e => e.type === 'tool/call').length, 0)
  cases.push({ id: 'effective-prompts-keep-native-context-no-human-gate', outcome: 'passed' })
  await writeFile(join(root, 'receipt.json'), JSON.stringify({ schema_version: 1, timestamp: new Date().toISOString(), binding, cases, trace,
    state: table.get(projectKey), author_events: events, reviewer_events: reviewerEvents,
    scripted_author_requests: authorLLM.requests.length, scripted_reviewer_requests: reviewerLLM.requests.length, external_model_calls: 0,
    synthetic_evaluator_dispatches: 2, human_replies_required: 0, semantic_qualification: 'scripted development only' }, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ receipt: join(root, 'receipt.json'), cases: cases.length, attempts: 2, reviews: 3, status: 'passed' }))
} catch (error) {
  await writeFile(join(root, 'failure.json'), JSON.stringify({ error: String(error), state: table.get(projectKey), trace,
    sessions: [author, ctx.agents.get(f.reviewerId)].filter(Boolean).map(a => ({ id: a.id, events: a.session.snapshotEvents() })) }, null, 2) + '\n', { flag: 'wx' })
  throw error
} finally {
  for (const dispose of disposers.reverse()) dispose()
  await f.close()
}
