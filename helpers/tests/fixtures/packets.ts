import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { canonicalJson, deriveActionId, sha256 } from '../../src/bindings.js'
import { CheckpointSchema, EvidenceSchema, ManifestSchema, ReviewSchema } from '../../src/records.js'
import type { ArtifactReference, BoundIdentity } from '../../src/records.js'

/** Retained synthetic bytes, never represented as a real project authorization. */
export function packets(projectRoot = '/tmp/dsh-research-synthetic-project') {
  const artifacts = new Map<string, Uint8Array>()
  function ref(uri: string, content: unknown): ArtifactReference {
    const bytes = content instanceof Uint8Array ? content : Buffer.from(typeof content === 'string' ? content : canonicalJson(content))
    artifacts.set(uri, bytes)
    return { uri, sha256: sha256(bytes), size_bytes: bytes.byteLength }
  }
  const contractBytes = readFileSync(new URL('../../../docs/contracts.md', import.meta.url))
  const registerBytes = readFileSync(new URL('../../../docs/compatibility.json', import.meta.url))
  const register = JSON.parse(registerBytes.toString())
  const version = contractBytes.toString().match(/^Contract version: `([^`]+)`\./m)![1]!
  const row = register.rows.find((r: { contract_version: string }) => r.contract_version === version)
  const fixturePolicy = ref('fixture/policy.json', { standing_scope: 'synthetic CPU development only', confirmation: 'off' })
  const profile = ref('fixture/profile.json', { confirmation: 'off', launcher: 'not_enabled', reviewer: 'scripted', version: 1 })
  const require = createRequire(import.meta.url)
  const corePackageBytes = readFileSync(new URL('../../package.json', import.meta.url))
  const corePackageVersion = JSON.parse(corePackageBytes.toString()).version as string
  const releaseNames = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-agent', '@deepseek-ai/dsh-agent-loop', '@deepseek-ai/dsh-agent-loop-testkit', '@deepseek-ai/dsh-session', '@deepseek-ai/dsh-llm', '@deepseek-ai/dsh-subagent', '@deepseek-ai/dsh-storage', '@deepseek-ai/dsh-storage-domain', '@deepseek-ai/dsh-storage-sqlite', '@deepseek-ai/dsh-session-query', '@deepseek-ai/dsh-session-projection']
  const runtimeReleases = releaseNames.map(name => {
    const bytes = readFileSync(require.resolve(`${name}/package.json`))
    return { name, version: JSON.parse(bytes.toString()).version as string, content: ref(`fixture/releases/${name}/package.json`, bytes) }
  })
  const binding: BoundIdentity = {
    contract_ref: { id: 'dsh-research/research-loop', version, artifact: ref('contract/snapshot.md', contractBytes) },
    compatibility_row_ref: {
      register: ref('contract/compatibility.json', registerBytes), contract_version: version,
      row_id: row.row_id, row_sha256: sha256(canonicalJson(row)), table_sha256: register.table_sha256,
    },
    authority: { project_id: 'synthetic', project_root: projectRoot, authority_id: 'synthetic-authority', writer_id: 'fixture-writer', registration: fixturePolicy },
    profile: {
      revision: 'fixture-v1', effective: profile, lock: ref('fixture/lock.yaml', readFileSync(new URL('../../pnpm-lock.yaml', import.meta.url))),
      releases: [{ name: 'dsh-research', version: corePackageVersion, content: ref('fixture/package.json', corePackageBytes) }, ...runtimeReleases],
      confirmation: 'off', assurance: 'implemented',
    },
  }
  const bounds = { timeout_ms: 1000, max_attempts: 2, timeout_reservation_ms: 2000, concurrency: 1 as const, resource_policy: fixturePolicy }
  const output = { schema: ref('fixture/output-schema.json', { score: 'finite_number' }), required_fields: { score: 'finite_number' as const }, additional_fields: false as const }
  const context = ref('fixture/context.json', { purpose: 'encoding demonstration' })
  const candidate = ref('fixture/candidate.txt', 'synthetic evaluator; no scientific execution')
  const proposal = { decision: 'diagnose' as const, operation: 'inspect-synthetic-negative', prerequisites: [], retry: null }
  const subject = {
    schema_version: 1 as const, kind: 'manifest' as const, binding, author_session_id: 'fixture-author', original_prompt: 'synthetic M1 fixture',
    goal: { id: 'fixture', revision: 'r1', context, checkpoint: null },
    plan: { revision: 'r1', snapshot: context, purpose: 'deliberate' as const }, architecture: profile,
    candidate: { commit: 'synthetic-commit', tree: candidate, configuration: candidate, snapshot_kind: 'content_snapshot' as const, content_inventory: candidate },
    evaluator: { verifier: candidate, interpreter: ref('fixture/interpreter.txt', process.version), environment: ref('fixture/environment.json', { cwd: projectRoot }) },
    inputs: [{ artifact: ref('fixture/released-input.json', { input: 1 }), version: '1', split: 'fixture', purpose: 'conformance', access: 'released' as const }],
    invocation: { executable: process.execPath, argv: ['--version'], cwd: projectRoot, env: {} },
    bounds, output, domain_policy: fixturePolicy, proposal,
  }
  const manifest = ManifestSchema.parse({ ...subject, action_id: deriveActionId(subject) })
  const manifestRef = ref('fixture/manifest.json', manifest)
  const result = { score: -1 }
  const captured = ref('fixture/result.json', result)
  const identity = ref('fixture/identity.json', { subject: manifestRef.sha256 })
  const settlement = ref('fixture/settlement.json', { classification: 'synthetic normal completion' })
  const balance = { consumed_attempts: 1, reserved_timeout_ms: 0, costs: [] }
  const evidence = EvidenceSchema.parse({
    schema_version: 1, kind: 'evidence', binding, action_id: manifest.action_id, attempt_id: 'fixture-attempt-1', manifest: manifestRef,
    admission: { authority_id: 'synthetic-authority', committed_revision: 1, acknowledgement: ref('fixture/admission.json', { synthetic: true }), action_id: manifest.action_id, attempt_id: 'fixture-attempt-1', manifest_sha256: manifestRef.sha256 },
    native: { owner_session_id: 'fixture-author', producer: 'synthetic', job_id: 'synthetic-job', tool_call_id: null },
    terminal: { status: 'completed', raw_status: 'synthetic-completed', exit_code: 0, signal: null, timeout: false, abort: false, ownership_resolved: true, settlement },
    identity: { expected: identity, before: identity, after: identity, matches: true },
    capture: { artifact: captured, complete: true, overflow: false, parser_input_sha256: captured.sha256 }, output_schema: output, result,
    verifier: { identity: candidate, result: ref('fixture/verifier.json', { verdict: 'negative' }), verdict: 'negative' },
    evidence_status: 'valid', scientific_status: 'eligible', costs: [], remaining: balance,
  })
  const evidenceRef = ref('fixture/evidence.json', evidence)
  const review = ReviewSchema.parse({
    schema_version: 1, kind: 'review', binding, review_id: 'fixture-review', subject_kind: 'scientific_action',
    request: ref('fixture/review-request.json', { manifest: manifestRef }), packet: manifestRef, subject: manifestRef,
    manifest: manifestRef, checkpoint: null, action_id: manifest.action_id, author_session_id: 'fixture-author',
    reviewer: { session_id: 'fixture-reviewer', provider: 'scripted-review', preset: profile, permissions: fixturePolicy, assurance: 'implemented' },
    completion: ref('fixture/review-completion.json', { synthetic: true }), status: 'completed', decision: 'approve', reason: 'synthetic exact subject', evidence: [evidenceRef],
    scope: { consumable_once: true, proposal: ref('fixture/proposal.json', proposal), bounds, prerequisites: [] }, hold: null,
  })
  const checkpoint = CheckpointSchema.parse({
    schema_version: 1, kind: 'checkpoint', binding, checkpoint_id: 'fixture-checkpoint', goal_id: 'fixture',
    question: 'Does a valid negative remain valid?', hypothesis: 'The bound score may be negative', alternative: 'synthetic baseline',
    evidence_status: 'valid', scientific_outcome: 'negative', rationale: 'Negative is a domain result', uncertainty: ['Synthetic evidence proves encoding only'],
    evidence: [evidenceRef], reviews: [ref('fixture/review.json', review)], balance, stopped: false, decision: 'diagnose', next_action: manifestRef, hold: null, feedback: [], exhaustion: null,
  })
  return { artifacts, ref, binding, contractBytes, registerBytes, manifest, evidence, review, checkpoint }
}
