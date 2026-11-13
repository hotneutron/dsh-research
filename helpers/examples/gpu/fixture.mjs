import { readFile } from 'node:fs/promises'
import { hostname } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { ManifestSchema, ReviewSchema, ResearchStateSchema, deriveActionId, canonicalJson, sha256 } from 'dsh-research'
import { NativeResearchAdapter } from 'dsh-research/native'
import { createCpuFixture, text } from '../synthetic-cpu/fixture.mjs'
import { createGpuGuard } from './guard.mjs'

export async function createGpuFixture(output, options = {}) {
  const timeout = options.timeoutMs ?? 1000
  const f = await createCpuFixture(output, { timeoutMs: timeout })
  f.unregister?.()
  try {
    const stub = options.stub ?? false
    const producerBytes = await readFile(fileURLToPath(new URL('./producer.py', import.meta.url)))
    const guardBytes = await readFile(fileURLToPath(new URL('./guard.mjs', import.meta.url)))
    const producer = stub ? f.policy.entrypoint : await f.artifacts.write('snapshots/gpu-producer.py', producerBytes)
    const guard = await f.artifacts.write('snapshots/gpu-guard.mjs', guardBytes)
    const namespace = await f.json('snapshots/gpu-lease-namespace.json', { root: options.leaseRoot ?? '/tmp/fixture-gpu-leases', protocol: 'existing autoresearch SHA256(resource) POSIX flock' })
    const qualification = await f.json('snapshots/gpu-qualification.json', { assurance: 'fixture_verified', scope: 'GPU guard/native workflow qualification only; no scientific deployment', funded_models: 0 })
    const budget = await f.json('snapshots/gpu-budget.json', { purpose: 'C_qual', max_attempts: 2, per_attempt_timeout_ms: timeout, total_reservation_ms: timeout * 2 })
    const resource = { host: options.host ?? (stub ? 'fixture-host' : hostname()), device_uuid: options.deviceUuid ?? 'GPU-c80fe196-e3ba-82ff-7233-d9804f701864' }
    const environment = { CUDA_VISIBLE_DEVICES: resource.device_uuid, PYTHONDONTWRITEBYTECODE: '1', CUDA_CACHE_DISABLE: '1' }
    const effective = await f.json('snapshots/gpu-profile.json', { scope: 'project_gpu_development', resource, guard, namespace, producer, qualification, budget, physical_GPU: !stub })
    const binding = { ...f.binding, profile: { ...f.binding.profile, revision: 'gpu-qualification-v1', effective, assurance: 'fixture_verified' } }
    const policy = { ...f.policy, scope: 'project_gpu_development', binding, entrypoint: producer, max_attempts: 2,
      max_timeout_ms: timeout, max_total_timeout_ms: timeout * 2, allowed_executables: [stub ? process.execPath : options.python ?? '/usr/bin/python3'],
      allowed_operations: ['positive', 'negative', 'incomplete'],
      gpu: { resource, guard, qualification, budget, lease_namespace: namespace, environment, purpose: 'C_qual' } }
    const policyRef = await f.json('snapshots/gpu-policy.json', policy)
    // This is an explicitly disposable engineering registration; never rebind Accorde's scientific authority.
    await f.table.update(f.config.projectKey, s => ResearchStateSchema.parse({ ...s, binding, policy: policyRef }))
    const json = f.json
    const defaultStub = {
      identity: guard,
      async preflight(context) {
        const version = randomUUID()
        const observation = await json(`local_artifacts/autoresearch/dsh/gpu-qualification/preflight-observation-${version}.json`, { physical_GPU: false })
        return json(`local_artifacts/autoresearch/dsh/gpu-qualification/preflight-${version}.json`, {
          schema_version: 1, kind: 'gpu_preflight', manifest: context.manifestRef, guard, resource, ready: options.ready ?? true, observation })
      },
      async settle(context) {
        const version = randomUUID()
        const observation = await json(`local_artifacts/autoresearch/dsh/gpu-qualification/terminal-observation-${version}.json`, { physical_GPU: false })
        return json(`local_artifacts/autoresearch/dsh/gpu-qualification/settlement-${version}.json`, {
          schema_version: 1, kind: 'gpu_settlement', manifest: context.manifestRef, guard, resource,
          action_id: context.action_id, attempt_id: context.attempt_id, dispatch_token: context.dispatch_token,
          admitted_revision: context.admitted_revision, native_terminal: context.native_terminal, capture: context.capture,
          lease: observation, observation, complete_unit: options.completeUnit ?? true,
          process_tree_quiescent: true, device_context_quiescent: options.quiescent ?? true, lease_released: true,
          ...options.settlementOverride,
        })
      },
    }
    const gpu = options.guardFactory ? options.guardFactory(defaultStub) : stub ? defaultStub : createGpuGuard({ ctx: f.ctx, artifacts: f.artifacts, identity: guard, resource, namespace })
    const adapter = await NativeResearchAdapter.open(f.ctx, { ...f.config, policy: policyRef, gpu })
    const unregister = adapter.register()
    const ptx = producerBytes.toString().match(/PTX = """([\s\S]*?)"""/)?.[1]
    if (!ptx) throw new Error('Frozen PTX definition missing')
    let ordinal = 0
    async function prepare(operation = 'positive') {
      ordinal++
      const input = await json(`snapshots/gpu-input-${ordinal}.json`, { values: [1, 2, 3], project_root: f.root,
        host: resource.host, device_uuid: resource.device_uuid, lease_root: options.leaseRoot ?? '/tmp/fixture-gpu-leases', ptx_sha256: sha256(Buffer.from(ptx)) })
      const schema = await json(`snapshots/gpu-output-schema-${ordinal}.json`, { score: 'finite_number', gpu_receipt_uri: 'string', gpu_receipt_sha256: 'string', gpu_receipt_size: 'finite_number' })
      const base = await f.makeSubject(operation)
      const inventory = await json(`snapshots/gpu-inventory-${ordinal}.json`, { files: [producer, guard, namespace], relevant_untracked: false, submodules: [] })
      const interpreter = await json(`snapshots/gpu-interpreter-${ordinal}.json`, { executable: policy.allowed_executables[0], node: process.version, scope: 'disposable qualification; full interpreter closure remains a separate target-profile obligation' })
      const subject = { ...base, binding, architecture: effective,
        candidate: { ...base.candidate, tree: producer, content_inventory: inventory }, evaluator: { ...base.evaluator, interpreter },
        inputs: [{ artifact: input, version: 'gpu-qualification-v1', split: 'synthetic', purpose: 'C_qual', access: 'released' }],
        invocation: { executable: policy.allowed_executables[0], argv: [join(f.root, producer.uri), join(f.root, input.uri), operation], cwd: f.root, env: environment },
        bounds: { timeout_ms: timeout, max_attempts: 2, timeout_reservation_ms: timeout * 2, concurrency: 1, resource_policy: policyRef },
        proposal: { decision: 'continue', operation, retry: null, prerequisites: [qualification] },
        ...(!stub ? { output: { schema, required_fields: { score: 'finite_number', gpu_receipt_uri: 'string', gpu_receipt_sha256: 'string', gpu_receipt_size: 'finite_number' }, additional_fields: false } } : {}) }
      const manifest = ManifestSchema.parse({ ...subject, action_id: deriveActionId(subject) })
      const manifestRef = await json(`snapshots/gpu-manifest-${ordinal}.json`, manifest)
      const request = await json(`snapshots/gpu-review-request-${ordinal}.json`, { action_id: manifest.action_id, manifest: manifestRef })
      const reviewId = `gpu-review-${ordinal}`
      f.reviewerLLM.script.push(text(JSON.stringify({ decision: 'approve', action_id: manifest.action_id, manifest_sha256: manifestRef.sha256, request_sha256: request.sha256, review_id: reviewId })))
      f.reviewer.followup(createUserMessage({ content: [{ type: 'text', text: canonicalJson({ manifest: manifestRef, request }) }], source: { kind: 'user' } }))
      await f.reviewer.whenIdle()
      const completion = await json(`snapshots/gpu-review-completion-${ordinal}.json`, { session_id: f.reviewerId, provider: policy.reviewer.provider, events: f.reviewer.session.snapshotEvents() })
      const proposal = await json(`snapshots/gpu-proposal-${ordinal}.json`, manifest.proposal)
      const review = ReviewSchema.parse({ schema_version: 1, kind: 'review', binding, review_id: reviewId, subject_kind: 'scientific_action', request,
        packet: manifestRef, subject: manifestRef, manifest: manifestRef, checkpoint: null, action_id: manifest.action_id, author_session_id: f.author.id,
        reviewer: { ...policy.reviewer, assurance: 'fixture_verified' }, completion, status: 'completed', decision: 'approve',
        reason: 'Scripted disposable engineering review; no paid/scientific review qualification', evidence: [],
        scope: { consumable_once: true, proposal, bounds: manifest.bounds, prerequisites: [qualification] }, hold: null })
      return { manifest, manifestRef, request: { manifest: manifestRef, review: await json(`snapshots/gpu-review-${ordinal}.json`, review), expected_revision: f.table.get(f.config.projectKey).revision } }
    }
    return { ...f, binding, policy, policyRef, adapter, prepare, gpu, close: async () => { unregister(); await f.close() } }
  } catch (error) { await f.close(); throw error }
}
