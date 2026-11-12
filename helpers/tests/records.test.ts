import assert from 'node:assert/strict'
import test from 'node:test'
import { canonicalJson, deriveActionId, readEnvelope, sha256, verifyCompatibility, verifyManifest } from '../src/bindings.js'
import { CheckpointSchema, EvidenceSchema, ManifestSchema, ReviewSchema } from '../src/records.js'
import { packets } from './fixtures/packets.js'

test('four record encodings round-trip and retain a valid negative', () => {
  const p = packets()
  for (const [schema, value] of [[ManifestSchema, p.manifest], [EvidenceSchema, p.evidence], [ReviewSchema, p.review], [CheckpointSchema, p.checkpoint]] as const)
    assert.deepEqual(schema.parse(JSON.parse(JSON.stringify(value))), value)
  assert.equal(p.evidence.scientific_status, 'eligible')
  assert.equal(p.evidence.verifier.verdict, 'negative')
  assert.equal(p.checkpoint.decision, 'diagnose')
})

test('finite typed output and complete capture reject controlled violation witnesses', () => {
  const p = packets()
  const variants = [
    { ...p.evidence, result: { score: true } },
    { ...p.evidence, result: { score: NaN } },
    { ...p.evidence, result: { score: Infinity } },
    { ...p.evidence, result: {} },
    { ...p.evidence, result: { score: -1, undeclared: 1 } },
    { ...p.evidence, capture: { ...p.evidence.capture, complete: false } },
    { ...p.evidence, capture: { ...p.evidence.capture, overflow: true } },
    { ...p.evidence, capture: { ...p.evidence.capture, parser_input_sha256: '0'.repeat(64) } },
    { ...p.evidence, terminal: { ...p.evidence.terminal, status: 'timed_out', timeout: true, exit_code: 0 } },
    { ...p.evidence, terminal: { ...p.evidence.terminal, status: 'unknown', settlement: null } },
    { ...p.evidence, identity: { ...p.evidence.identity, after: p.manifest.plan.snapshot, matches: true } },
  ]
  for (const v of variants) assert.equal(EvidenceSchema.safeParse(v).success, false)
})

test('review and checkpoint refuse self-approval, missing completion and unowned continuation', () => {
  const p = packets()
  assert.equal(ReviewSchema.safeParse({ ...p.review, reviewer: { ...p.review.reviewer, session_id: 'fixture-author' } }).success, false)
  assert.equal(ReviewSchema.safeParse({ ...p.review, completion: null }).success, false)
  assert.equal(ReviewSchema.safeParse({ ...p.review, status: 'unavailable', decision: 'defer', hold: null }).success, false)
  assert.equal(CheckpointSchema.safeParse({ ...p.checkpoint, stopped: true }).success, false)
  assert.equal(ManifestSchema.safeParse({ ...p.manifest, bounds: { ...p.manifest.bounds, max_attempts: true } }).success, false)
  assert.equal(ManifestSchema.safeParse({ ...p.manifest, binding: { ...p.binding, profile: { ...p.binding.profile, confirmation: 'enabled' } } }).success, false)
})

test('logical identity excludes transport Session but includes changed scientific subject', () => {
  const p = packets()
  const { action_id, ...subject } = p.manifest
  verifyManifest(p.manifest, p.contractBytes, p.registerBytes)
  assert.equal(deriveActionId(subject), action_id)
  assert.equal(deriveActionId({ ...subject, author_session_id: 'redelivery-session' }), action_id)
  assert.notEqual(deriveActionId({ ...subject, invocation: { ...subject.invocation, argv: ['--changed'] } }), action_id)
  assert.throws(() => verifyManifest({ ...p.manifest, invocation: { ...subject.invocation, argv: ['--changed'] } }, p.contractBytes, p.registerBytes), /Logical action identity/)
  assert.throws(() => canonicalJson({ unknown: undefined }), /finite JSON/)
  assert.throws(() => canonicalJson(Array(1)), /finite JSON/)
})

test('compatibility binding refuses missing current row and content or version drift', () => {
  const p = packets()
  verifyCompatibility(p.binding, p.contractBytes, p.registerBytes)
  const missing = JSON.parse(p.registerBytes.toString())
  missing.rows = missing.rows.filter((r: { contract_version: string }) => r.contract_version !== p.binding.contract_ref.version)
  const missingBytes = Buffer.from(JSON.stringify(missing))
  const missingRef = { ...p.binding.compatibility_row_ref, register: p.ref('fixture/missing-register.json', missingBytes) }
  assert.throws(() => verifyCompatibility({ ...p.binding, compatibility_row_ref: missingRef }, p.contractBytes, missingBytes), /row missing/)
  assert.throws(() => verifyCompatibility(p.binding, Buffer.from('changed'), p.registerBytes), /Artifact identity mismatch/)
  assert.throws(() => verifyCompatibility({ ...p.binding, compatibility_row_ref: { ...p.binding.compatibility_row_ref, row_sha256: '0'.repeat(64) } }, p.contractBytes, p.registerBytes), /row hash/)
  assert.throws(() => verifyCompatibility({ ...p.binding, contract_ref: { ...p.binding.contract_ref, version: 'old' } }, p.contractBytes, p.registerBytes), /version binding/)
})

test('envelope binding is read from exact accepted declaration, with drift refusal', () => {
  const p = packets()
  const declaration = { id: 'fixture-envelope', version: '1', accepted_policy: p.manifest.domain_policy, owner: 'fixture-owner', binding: true,
    window: { start: '2026-11-11T00:00:00Z', end: '2026-11-12T00:00:00Z' }, denominator: 2, unit: 'process_wall_seconds', ceiling: 60, allocation_rule: p.manifest.domain_policy }
  const bytes = Buffer.from(JSON.stringify(declaration))
  const ref = p.ref('fixture/envelope.json', bytes)
  assert.equal(readEnvelope(ref, bytes).binding, true)
  const changed = Buffer.from(JSON.stringify({ ...declaration, binding: false }))
  assert.notEqual(sha256(changed), ref.sha256)
  assert.throws(() => readEnvelope(ref, changed), /Artifact identity mismatch/)
})
