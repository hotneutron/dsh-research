import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DevelopmentPolicySchema, ResearchStateSchema, reserveAction, assertApprovedReview, updateAction } from '../src/admission.js'
import { deriveActionId } from '../src/bindings.js'
import { checkCapture } from '../src/evaluate.js'
import { ProjectArtifacts } from '../src/manifest.js'
import { packets } from './fixtures/packets.js'

function admissionFixture() {
  const p = packets()
  const policy = DevelopmentPolicySchema.parse({ scope: 'synthetic_released_cpu', authority: p.binding.authority, binding: p.binding,
    goal_id: p.manifest.goal.id, goal_revision: p.manifest.goal.revision, max_attempts: 2, max_timeout_ms: 1000, max_total_timeout_ms: 2000,
    max_output_bytes: 8192, allowed_executables: [p.manifest.invocation.executable], allowed_operations: [p.manifest.proposal.operation],
    domain_policy: p.manifest.domain_policy, verifier: p.manifest.evaluator.verifier, entrypoint: p.manifest.candidate.tree,
    reviewer: { session_id: p.review.reviewer.session_id, provider: p.review.reviewer.provider, preset: p.review.reviewer.preset, permissions: p.review.reviewer.permissions },
    allowed_read_prefixes: ['snapshots/'] })
  const policyRef = p.ref('fixture/development-policy.json', policy)
  const state = ResearchStateSchema.parse({ schema_version: 3, consumed_review_requests: 0, review_requests: {}, rejected_subjects: {}, feedback: { cursors: {}, items: {} }, publications: {}, authority: p.binding.authority, binding: p.binding, policy: policyRef, revision: 0,
    stopped: false, consumed_attempts: 0, consumed_timeout_ms: 0, reserved_timeout_ms: 0, consumed_reviews: [], active_action_id: null, actions: {}, hold: null })
  const manifestRef = p.ref('fixture/manifest.json', p.manifest)
  const reviewRef = p.ref('fixture/review.json', p.review)
  const reserve = (current = state, token = 'host-token') => reserveAction(current, p.manifest, manifestRef, p.review, reviewRef, policy, policyRef, 0, token)
  return { ...p, policy, policyRef, state, manifestRef, reviewRef, reserve }
}

test('admission couples attempts, review and full timeout; a replay retains the first claim', () => {
  const p = admissionFixture()
  const admitted = p.reserve()
  assert.equal(admitted.consumed_attempts, 1)
  assert.equal(admitted.consumed_timeout_ms, 1000)
  assert.equal(admitted.reserved_timeout_ms, 1000)
  assert.deepEqual(admitted.consumed_reviews, [p.review.review_id])
  const replay = p.reserve(admitted, 'another-host-token')
  assert.deepEqual(replay, admitted)
  assert.equal(replay.actions[p.manifest.action_id]?.dispatch_token, 'host-token')
})

test('stop, stale revision, exhausted allowance and unfinished action refuse fresh admission', () => {
  const p = admissionFixture()
  assert.throws(() => p.reserve({ ...p.state, stopped: true }), /stopped/)
  assert.throws(() => p.reserve({ ...p.state, revision: 1 }), /revision/)
  assert.throws(() => reserveAction(p.state, p.manifest, p.manifestRef, p.review, p.reviewRef,
    { ...p.policy, max_total_timeout_ms: 999 }, p.policyRef, 0, 'token'), /exhausted/)
  const admitted = p.reserve()
  const { action_id: _id, ...subject } = p.manifest
  const different = { ...subject, plan: { ...subject.plan, revision: 'different-plan' } }
  const manifest = { ...different, action_id: deriveActionId(different) }
  const ref = p.ref('fixture/other-manifest.json', manifest)
  const review = { ...p.review, review_id: 'other-review', action_id: manifest.action_id, manifest: ref, subject: ref, packet: ref }
  assert.throws(() => reserveAction(admitted, manifest, ref, review, p.reviewRef, p.policy, p.policyRef, admitted.revision, 'token-2'), /Unsettled/)
})

test('review for a different action or permission profile cannot admit the subject', () => {
  const p = admissionFixture()
  assert.throws(() => assertApprovedReview(p.manifest, p.manifestRef, { ...p.review, action_id: 'different' }, p.policy), /different subject/)
  assert.throws(() => assertApprovedReview(p.manifest, p.manifestRef, { ...p.review, reviewer: { ...p.review.reviewer, provider: 'different' } }, p.policy), /host-owned profile/)
  assert.throws(() => assertApprovedReview(p.manifest, p.manifestRef, { ...p.review, scope: { ...p.review.scope, bounds: { ...p.review.scope.bounds, timeout_ms: 999 } } }, p.policy), /exact proposed action/)
})

test('corrupt coupled consumption and an action identity rewrite are refused', () => {
  const p = admissionFixture()
  const admitted = p.reserve()
  assert.equal(ResearchStateSchema.safeParse({ ...admitted, consumed_attempts: 0 }).success, false)
  assert.equal(ResearchStateSchema.safeParse({ ...admitted, reserved_timeout_ms: 0 }).success, false)
  assert.equal(ResearchStateSchema.safeParse({ ...admitted, consumed_reviews: [] }).success, false)
  assert.throws(() => updateAction(admitted, p.manifest.action_id, a => ({ ...a, attempt_id: 'reset-attempt' })), /cannot change/)
})

test('capture checking uses the exact retained buffer even when the source file later changes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-capture-'))
  try {
    const artifacts = await ProjectArtifacts.open(root)
    const bytes = Buffer.from('{"score":-1}')
    const ref = await artifacts.write('snapshots/result.json', bytes)
    const captured = await artifacts.read(ref)
    await writeFile(join(root, ref.uri), '{"score":1}')
    const checked = checkCapture(captured, packets().manifest, true)
    assert.equal(checked.result.score, -1)
    assert.equal(checked.sha256, ref.sha256)
    await assert.rejects(artifacts.read(ref), /identity mismatch/)
    assert.equal(checkCapture(captured, packets().manifest, false).valid, false)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('profile scope denies unpermitted paths before lookup, and files cannot escape or overwrite', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-artifacts-'))
  const outside = await mkdtemp(join(tmpdir(), 'dsh-outside-'))
  try {
    const artifacts = await ProjectArtifacts.open(root)
    const scoped = artifacts.withReadPrefixes(['snapshots/'])
    await assert.rejects(scoped.read({ uri: 'protected/nonexistent.json', sha256: '0'.repeat(64), size_bytes: 0 }), /permitted read scope/)
    const ref = await artifacts.write('snapshots/value.json', Buffer.from('released'))
    await assert.rejects(artifacts.write(ref.uri, Buffer.from('overwrite')), /EEXIST/)
    await assert.rejects(artifacts.write('../escape', Buffer.from('bad')), /project root/)
    await writeFile(join(outside, 'value.json'), 'released')
    await symlink(join(outside, 'value.json'), join(root, 'snapshots/escape.json'))
    await assert.rejects(scoped.read({ ...ref, uri: 'snapshots/escape.json' }), /symlink escapes/)
  } finally { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }) }
})
