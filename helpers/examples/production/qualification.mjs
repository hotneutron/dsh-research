// Explicit disposable native qualification; source/model transports are scripted.
import assert from 'node:assert/strict'
import { join, resolve } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { NativeProductionResearch } from 'dsh-research/native'
import { DecisionSubjectSchema, canonicalJson } from 'dsh-research'
import { createCpuFixture, text } from '../synthetic-cpu/fixture.mjs'

const root = resolve(process.argv[2] ?? '')
if (!process.argv[2]) throw new Error('Usage: production/qualification.mjs <fresh-disposable-root>')
const sandbox = { mode: 'workspace-write', sessionId: 'm2-author', workspaceRoot: root }
const f = await createCpuFixture(root, { production: true, automaticReview: true,
  executionSandbox: sandbox, executionSandboxResolver: () => sandbox,
  maxAttempts: 4, maxReviews: 8, maxTotalTimeoutMs: 8000, actionTimeoutMs: 2000 })
let loop
let authorityActive = true
const extra = []
const checks = [], started = performance.now()
const check = (id, detail = {}) => checks.push({ id, status: 'passed', ...detail })
try {
  for (let index = 0; index < 20; index++) f.authorLLM.script.push(text('Native outcome notice observed; qualification driver owns this scripted test.'))
  for (let index = 0; index < 12; index++) f.reviewerLLM.script.push(options => {
    const packet = options.messages.flatMap(message => message.content ?? []).findLast(block => block.type === 'text' && block.text.includes('REVIEW_PACKET_JSON\n'))
    const value = JSON.parse(packet.text.split('REVIEW_PACKET_JSON\n').at(-1))
    assert.ok(value.permitted_context?.length)
    const reject = value.frozen_manifest?.proposal.operation === 'baseline'
    return text(JSON.stringify({ decision: reject ? 'request_changes' : 'approve',
      reason: reject ? 'Baseline does not meet this frozen negative/positive control objective; change the operation before admission' : 'Exact bounded subject and declared fixture premises are consistent',
      review_id: value.review_id, action_id: value.action_id, manifest_sha256: value.manifest_sha256, request_sha256: value.request_sha256 }))
  })
  const state = () => f.table.get('synthetic-m2')
  const read = async ref => JSON.parse(Buffer.from(await f.artifacts.read(ref)).toString())
  const evidence = async current => Promise.all(Object.values(current.actions).filter(action => action.evidence).map(action => read(action.evidence)))
  const hooks = {
    propose: args => f.makeSubject(args.operation, args),
    reviewContext: async subject => subject.kind === 'research_decision'
      ? [subject.scope, subject.domain_assessment, subject.checkpoint, ...subject.evidence]
      : [subject.plan.snapshot, subject.candidate.tree, subject.candidate.configuration, subject.evaluator.verifier],
    async decision(kind, rationale, current) {
      const actions = Object.values(current.actions), latest = actions.at(-1)
      assert.ok(latest?.checkpoint)
      const assessment = await f.json('local_artifacts/autoresearch/dsh/production-qualification/decision-assessment.json',
        { kind: 'synthetic_fixture_decision_assessment', goal: 'Observe the two declared valid negative/positive controls',
          action_ids: actions.map(action => action.action_id), claimed_completion: kind === 'goal_completion' })
      return DecisionSubjectSchema.parse({ schema_version: 1, kind: 'research_decision', subject_id: 'fixture-goal-completion', subject_kind: kind,
        binding: current.binding, author_session_id: f.author.id, goal_id: f.policy.goal_id, goal_revision: f.policy.goal_revision,
        checkpoint: latest.checkpoint, scope: f.binding.profile.effective, rationale, evidence: actions.map(action => action.evidence),
        alternatives: actions.map(action => action.checkpoint), rebrainstorm: null, domain_assessment: assessment,
        bounds: { timeout_ms: 2000, max_attempts: 4, timeout_reservation_ms: 8000, concurrency: 1, resource_policy: f.policyRef }, human_question: null })
    },
    async assertDecisionPremises(subject, current) {
      if (subject.subject_kind !== 'goal_completion') throw new Error('Synthetic controls establish no scientific exhaustion')
      const values = await evidence(current)
      assert.equal(values.length, 2)
      assert.ok(values.every(value => value.evidence_status === 'valid' && value.scientific_status === 'eligible'))
      assert.ok(values.some(value => value.verifier.verdict === 'negative'))
      assert.ok(values.some(value => value.verifier.verdict === 'positive'))
      assert.equal(current.active_action_id, null)
    }
  }
  loop = await NativeProductionResearch.open(f.ctx, { ...f.config, executionShell: f.ctx.shell,
    executionSandbox: { profile: f.binding.profile.effective, resolve: () => sandbox },
    assertActiveAuthority: async owner => { assert.ok(authorityActive, 'Current Ticket/pause authority is inactive'); assert.equal(owner, f.author); assert.equal(f.ctx.agents.get(owner.id), owner) },
    artifactPrefix: 'local_artifacts/autoresearch/dsh/production-qualification', hooks, reviewContextMaxBytes: 262144 })
  const execute = async (name, args) => {
    const result = await f.ctx.tools.execute({ callId: randomUUID(), name, arguments: args, agent: f.author, signal: AbortSignal.timeout(10000) })
    if (result.isError) return { error: result }
    return { value: JSON.parse(result.content.filter(block => block.type === 'text').map(block => block.text).join('')) }
  }
  const call = async (name, args) => {
    const result = await execute(name, args); assert.ok(!result.error, canonicalJson(result)); return result.value
  }
  extra.push(f.author.ctx.tools.register(defineTool({ name: 'orchestrator_report', description: 'Native report guard qualification', parameters: {
    state: { type: 'string', required: true }, summary: { type: 'string', required: true }, human_action: { type: 'string' } },
    output: { schema: { type: 'json' }, render: () => [] }, execute: () => ({ reported: true }) })))
  let lateCalls = 0
  extra.push(f.author.ctx.tools.register(defineTool({ name: 'late_bypass', description: 'Qualification bypass must remain denied', parameters: {},
    output: { schema: { type: 'json' }, render: () => [] }, execute: () => { lateCalls++; return {} } })))
  const late = await execute('late_bypass', {}); assert.ok(late.error); assert.equal(lateCalls, 0)
  check('late-local-native-bypass-refused')
  const premature = await execute('orchestrator_report', { state: 'ready', summary: 'Premature completion' })
  assert.ok(premature.error)
  check('premature-native-ticket-completion-refused')
  authorityActive = false
  const paused = await execute('research_propose', { operation: 'baseline', plan_revision: 'paused', checkpoint: null, feedback_item_id: null })
  assert.ok(paused.error); assert.equal(state().consumed_attempts, 0); assert.equal(state().consumed_review_requests, 0)
  authorityActive = true
  check('current-ticket-pause-authority-refused-before-action-or-review')
  const baseline = await call('research_propose', { operation: 'baseline', plan_revision: 'baseline-1', checkpoint: null, feedback_item_id: null })
  const rejected = await call('research_review', { manifest: baseline.manifest })
  assert.equal(rejected.decision, 'request_changes'); assert.equal(state().consumed_attempts, 0)
  check('native-separate-request-changes-before-admission')
  const intent = state().review_requests[rejected.request_id]
  await f.table.update('synthetic-m2', current => ({ ...current, revision: current.revision + 1,
    review_requests: { ...current.review_requests, [rejected.request_id]: { ...intent, phase: 'unknown', native_message_id: null, receipt: null, completion: null } },
    hold: { kind: 'review_unavailable', owner: f.author.id, reason: 'Controlled lost publication acknowledgement after actual native completion',
      evidence: [intent.request], affected: [intent.action_id], exit_condition: 'Recover actual native reviewer input and completion', next_check: 'Native Session catalog', reassess_at: new Date(Date.now()+60000).toISOString() } }))
  const awake = await loop.wake('Reconcile the actual original reviewer completion through the existing Source wake')
  assert.equal(awake.status, 'queued'); await f.author.whenIdle()
  const recovered = await call('research_review', { manifest: baseline.manifest })
  assert.equal(recovered.decision, 'request_changes'); assert.equal(recovered.replay, true)
  assert.equal(state().review_requests[rejected.request_id].native_message_id, intent.native_message_id)
  assert.equal(state().hold, null); assert.equal(state().consumed_review_requests, 1)
  check('lost-native-review-ack-recovered-without-new-dispatch')
  const status = await call('research_status', {})
  const item = status.feedback.find(value => value.source_id.startsWith('native-review:'))
  assert.ok(item && item.captured_revision > 0)
  check('actual-native-review-feedback-capture', { captured_revision: item.captured_revision })
  const feedbackArgs = { operation: 'disposition', scan: null, item_id: item.item_id, disposition: 'adopted',
    reason: 'Attempt to reuse unchanged rejected plan', action: baseline.manifest, evidence: null }
  const unchanged = await execute('research_feedback', feedbackArgs)
  assert.ok(unchanged.error); assert.match(JSON.stringify(unchanged), /materially changed|unchanged/)
  check('direct-feedback-unchanged-adoption-refused')
  const negative = await call('research_propose', { operation: 'negative', plan_revision: 'changed-negative', checkpoint: null,
    feedback_item_id: item.item_id, feedback_reason: 'Change the operation to the declared negative control in response to this exact reviewer source version' })
  const review = await call('research_review', { manifest: negative.manifest })
  assert.equal(review.decision, 'approve')
  const negativeRun = await call('research_run', { manifest: negative.manifest, review: review.review, expected_revision: review.state_revision })
  assert.equal(negativeRun.status, 'settled')
  await f.author.whenIdle()
  const inspected = await call('research_status', {})
  assert.equal(inspected.actions[0].evidence.verifier.verdict, 'negative')
  assert.ok(inspected.actions[0].evidence.costs.length)
  check('author-observes-actual-negative-and-native-costs')
  const applied = inspected.feedback.find(value => value.item_id === item.item_id)
  assert.equal(applied.effect_status, 'executed'); assert.ok(applied.effect_checkpoint)
  assert.ok(state().actions[negativeRun.action_id].admitted_revision > applied.captured_revision)
  check('prospective-feedback-changed-action-review-execution-effect')
  const notices = Object.values(state().loop.notifications)
  assert.equal(notices.length, 1); assert.equal(notices[0].status, 'observed'); assert.ok(notices[0].observation)
  check('native-outcome-inbox-durably-observed')
  const counts = [state().consumed_attempts, state().consumed_review_requests, state().consumed_timeout_ms]
  const replay = await call('research_run', { manifest: negative.manifest, review: review.review, expected_revision: review.state_revision })
  assert.equal(replay.replay, true)
  assert.deepEqual([state().consumed_attempts, state().consumed_review_requests, state().consumed_timeout_ms], counts)
  assert.equal(Object.keys(state().loop.notifications).length, 1)
  check('settled-replay-no-charge-review-or-notice')
  const positive = await call('research_propose', { operation: 'positive', plan_revision: 'positive-successor', checkpoint: negativeRun.checkpoint, feedback_item_id: null })
  const positiveReview = await call('research_review', { manifest: positive.manifest })
  const positiveRun = await call('research_run', { manifest: positive.manifest, review: positiveReview.review, expected_revision: positiveReview.state_revision })
  assert.equal(positiveRun.status, 'settled'); await f.author.whenIdle()
  check('bounded-review-and-actual-successor')
  const manual = await execute('orchestrator_report', { state: 'progress', summary: 'Unreviewed steering attempt', human_action: 'Choose another scientific direction' })
  assert.ok(manual.error)
  check('unreviewed-human-scientific-steering-refused')
  const completion = await call('research_conclude', { kind: 'goal_completion', rationale: 'Both exact synthetic valid negative/positive controls are observed; the finite engineering objective is fulfilled' })
  assert.equal(completion.status, 'complete'); assert.equal(completion.human_action, null)
  assert.equal(state().stopped, true); assert.equal(state().loop.decision.kind, 'goal_completion')
  assert.equal((await read(completion.review)).subject_kind, 'goal_completion')
  check('independently-reviewed-goal-completion')
  const stopped = await execute('research_propose', { operation: 'positive', plan_revision: 'after-complete', checkpoint: positiveRun.checkpoint, feedback_item_id: null })
  assert.ok(stopped.error)
  check('completed-goal-cannot-mint-successor')
  const final = state()
  const completedWake = await loop.wake('Completed scope remains inactive')
  assert.equal(completedWake.status, 'held')
  await writeFile(join(root, 'receipt.json'), JSON.stringify({ kind: 'production_native_protocol_qualification', at: new Date().toISOString(),
    checks, whole_seconds: (performance.now() - started) / 1000, state: final, semantic_scope: 'Explicit scripted native controls; no live production science or team-publication claim',
    external_model_calls: 0, scientific_gpu_dispatches: 0, native_evaluator_dispatches: 2 }, null, 2)+'\n', { flag: 'wx' })
  console.log(JSON.stringify({ passed: checks.length, receipt: join(root, 'receipt.json') }))
} catch (error) {
  await writeFile(join(root, 'failure.json'), JSON.stringify({ checks, error: String(error), stack: error.stack }, null, 2)+'\n', { flag: 'wx' }); throw error
} finally { for (const dispose of extra.reverse()) dispose(); loop?.close(); await f.close() }
