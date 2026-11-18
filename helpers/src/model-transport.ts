import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile, realpath, lstat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'
import type { StreamChunk, TokenUsage } from '@deepseek-ai/dsh-llm'
import { canonicalJson, sha256, verifyBytes } from './bindings.js'
import { ByteRef } from './records.js'
import { ModelRouteSchema, checkContextApproval, frozenJson } from './model-policy.js'
import type { ExecutablePin, ModelGovernance, ModelRoute } from './model-policy.js'
import { ModelRequestBudget } from './model-budget.js'
export * from './model-policy.js'
export * from './model-budget.js'
export * from './model-migration.js'

export type ModelOptions = Parameters<LlmAdapter['stream']>[0]
export interface EncodedModelInput { stdin: string; document: string | null; instructions: string; schema: unknown | null;
  /** Qualified bound for native CLI-generated framing, separate from materialized stdin/doc bytes. */
  native_context_bytes?: number }
export interface DriverObservation { executable: ExecutablePin; runtime: ExecutablePin[]; version: string;
  launch: { executable: ExecutablePin; interpreter: ExecutablePin | null } }
export interface DriverCompletion {
  text: string; raw_usage: unknown; thread_id: string | null; reported_provider: string | null; reported_model: string | null;
  diagnostics: string[]; elapsed_ms: number; terminal: unknown
}
export class ModelOwnershipError extends Error {
  constructor(message: string, readonly evidence: unknown) { super(message); this.name = 'ModelOwnershipError' }
}
export class ModelDriverFailure extends Error {
  constructor(message: string, readonly evidence: unknown) { super(message); this.name = 'ModelDriverFailure' }
}
export interface TextModelDriver {
  readonly id: string
  encode(context: unknown, instructions: string, schema: unknown | null, delivery: ModelRoute['driver']['context_delivery']): EncodedModelInput
  observe(route: Readonly<ModelRoute>, requestRoot: string, signal: AbortSignal, input?: Readonly<EncodedModelInput>): Promise<DriverObservation>
  disposeObservation?(requestRoot: string, ownershipUnknown: boolean): Promise<void>
  run(route: Readonly<ModelRoute>, input: EncodedModelInput, requestRoot: string, signal: AbortSignal, beforeLaunch: () => Promise<void>, assertDispatch: () => void): Promise<DriverCompletion>
  usage(raw: unknown): TokenUsage
}
export interface ModelTransportConfig {
  projectRoot: string; artifactsRoot: string; route: ModelRoute; driver: TextModelDriver;
  governance: ModelGovernance; budget: ModelRequestBudget
}

/** JSON wire semantics: omitted optional object fields stay omitted; no coercion of invalid data. */
function jsonContext(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(jsonContext)
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype)
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, jsonContext(item)]))
  canonicalJson(value)
  return value
}
async function bounded<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  let remove = () => {}
  const interrupted = new Promise<never>((_, reject) => {
    const abort = () => reject(signal.reason ?? new Error('Model preflight cancelled'))
    signal.addEventListener('abort', abort, { once: true }); remove = () => signal.removeEventListener('abort', abort)
  })
  try { return await Promise.race([operation, interrupted]) } finally { remove() }
}
async function verifyPin(pin: ExecutablePin) {
  const bytes = await readFile(pin.path)
  if (bytes.length !== pin.size_bytes || sha256(bytes) !== pin.sha256) throw new Error('Pinned executable/runtime/context identity changed')
}
async function privateRequestDirectory(project: string, artifacts: string, id: string) {
  const root = await realpath(project), relative = artifacts.slice(project.length + 1)
  let current = root
  for (const part of relative.split('/')) {
    current = join(current, part)
    try {
      const entry = await lstat(current)
      if (entry.isSymbolicLink() || !entry.isDirectory()) throw new Error('Private transport namespace cannot traverse symlinks/files')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      try { await mkdir(current, { mode: 0o700 }) }
      catch (creation) {
        if ((creation as NodeJS.ErrnoException).code !== 'EEXIST') throw creation
        const concurrent = await lstat(current)
        if (concurrent.isSymbolicLink() || !concurrent.isDirectory()) throw new Error('Concurrent private namespace is not a directory')
      }
    }
  }
  const path = join(current, id)
  await mkdir(path, { mode: 0o700 })
  return path
}

/** DSH text adapter; driver mechanics, trusted project authority and one shared model budget are explicit. */
export class ModelTextAdapter extends LlmAdapter {
  readonly receipts: unknown[] = []
  readonly route: Readonly<ModelRoute>
  private readonly config: ModelTransportConfig
  constructor(config: ModelTransportConfig) {
    super()
    const route = frozenJson(ModelRouteSchema.parse(config.route))
    const projectRoot = resolve(config.projectRoot), artifactsRoot = resolve(config.artifactsRoot)
    if (!artifactsRoot.startsWith(projectRoot + '/') || route.driver.id !== config.driver.id)
      throw new Error('Explicit project-owned transport namespace and matching driver required')
    if (!config.governance?.verifyRoute || !config.governance?.approveContext) throw new Error('Trusted project authorization and classification are required')
    this.route = route; this.config = { ...config, projectRoot, artifactsRoot, route }
  }
  override async resolveModel(provider: string, model: string) {
    if (provider !== this.route.dsh_provider || model !== this.route.model) throw new Error('Cannot substitute the accepted model/provider route')
    return { provider, id: model, name: model }
  }
  private async readRef(ref: ReturnType<typeof ByteRef.parse>) {
    const relative = ByteRef.parse(ref).uri
    if (relative.startsWith('/') || relative.split(/[\\/]/).includes('..')) throw new Error('Transport evidence must belong to the project')
    const root = await realpath(this.config.projectRoot), path = await realpath(join(root, relative))
    if (!path.startsWith(root + '/')) throw new Error('Transport evidence escaped the canonical project')
    const bytes = await readFile(path); verifyBytes(ref, bytes)
  }
  async complete<T = null>(options: ModelOptions, selection?: {
    instructions: string; schema: unknown; validate(text: string): T
  }): Promise<{ completion: DriverCompletion; usage: TokenUsage; value: T; receipt: unknown }> {
    const outerSignal = options.signal ?? new AbortController().signal
    outerSignal.throwIfAborted()
    const reservation = this.config.budget.reserve(this.route.id, options.sessionId ?? '<unobserved>')
    let requestRoot = join(this.config.artifactsRoot, reservation.record.id)
    let partial: unknown = null
    let settled = false
    let ownershipUnknown = false
    try {
      await this.resolveModel(options.provider, options.model)
      if (!options.sessionId) throw new Error('An observed DSH Session is required for model transport')
      if (options.temperature !== undefined || options.stop?.length || options.reasoningEffort !== undefined)
        throw new Error('Driver has no qualified mapping for requested sampling controls')
      if (!selection && options.tools?.length) throw new Error('Text model transport does not expose native execution tools')
      if (selection && this.route.role === 'reviewer') throw new Error('Reviewer cannot select native execution tools')
      if (options.messages.some(message => message.content.some(block => ['image', 'audio', 'video'].includes(block.type))))
        throw new Error('Text driver has no qualified native media mapping')
      const signal = AbortSignal.any([outerSignal, AbortSignal.timeout(this.route.limits.preflight_timeout_ms)])
      const { signal: _signal, ...nativeOptions } = options
      const context = frozenJson(jsonContext(nativeOptions)), contextHash = sha256(canonicalJson(context))
      const grant = await bounded(this.config.governance.verifyRoute(this.route, signal), signal)
      if (grant.route_sha256 !== sha256(canonicalJson(this.route)) || canonicalJson(grant.authority) !== canonicalJson(this.route.exposure.authority))
        throw new Error('Host authority proof is not bound to this exact route')
      const refs = [this.route.driver.implementation, this.route.driver.qualification, this.route.driver.auto_context_basis,
        this.route.identity.basis, this.route.authentication.basis, this.route.exposure.authority, this.route.exposure.decision,
        ...(this.route.separation ? Object.values(this.route.separation) : [])]
      await bounded(Promise.all(refs.map(ref => this.readRef(ref))), signal)
      const approval = await bounded(this.config.governance.approveContext(this.route, context, options.sessionId, signal), signal)
      checkContextApproval(this.route, context, options.sessionId, approval)
      await bounded(this.readRef(approval.before_read), signal)
      const instructions = selection?.instructions ?? 'Return the requested answer from the complete approved DSH context. CLI tools and external operations are disabled.'
      const input = frozenJson(this.config.driver.encode(context, instructions, selection?.schema ?? null, this.route.driver.context_delivery))
      const automaticBytes = this.route.driver.auto_context.reduce((sum, item) => sum + item.file.size_bytes, 0)
      const nativeContextBytes = input.native_context_bytes ?? 0
      if (!Number.isSafeInteger(nativeContextBytes) || nativeContextBytes < 0) throw new Error('Native context byte bound is invalid')
      const encodedBytes = Buffer.byteLength(input.stdin) + (input.document === null ? 0 : Buffer.byteLength(input.document))
        + (input.schema === null ? 0 : Buffer.byteLength(canonicalJson(input.schema))) + automaticBytes
        + nativeContextBytes
      if (!Number.isSafeInteger(encodedBytes) || encodedBytes > this.route.limits.max_encoded_input_bytes) throw new Error('Final encoded model input exceeds its declared byte bound')
      await bounded(Promise.all(this.route.driver.auto_context.map(value => verifyPin(value.file))), signal)
      requestRoot = await privateRequestDirectory(this.config.projectRoot, this.config.artifactsRoot, reservation.record.id)
      // A process-owning observer must finish bounded teardown before its reservation can be released.
      const observation = await this.config.driver.observe(this.route, requestRoot, signal, input)
      if (observation.version !== this.route.driver.version || canonicalJson(observation.executable) !== canonicalJson(this.route.driver.executable)
        || canonicalJson(observation.runtime) !== canonicalJson(this.route.driver.runtime)) throw new Error('Observed driver version/distribution is not approved')
      signal.throwIfAborted()
      await writeFile(join(requestRoot, 'private-approved-context.json'), canonicalJson(context), { mode: 0o600 })
      await writeFile(join(requestRoot, 'preflight.json'), canonicalJson({ route_id: this.route.id, route_sha256: grant.route_sha256,
        session_id: options.sessionId, context_sha256: contextHash, approval, observation, encoded_input_bytes: encodedBytes,
        encoded_input_sha256: sha256(canonicalJson(input)), native_context_bytes_bound: nativeContextBytes, output_token_cap: null }), { mode: 0o600 })
      // Recheck the trusted authority and payload decision after asynchronous version/file reads.
      const fresh = await bounded(this.config.governance.verifyRoute(this.route, signal), signal)
      if (canonicalJson(fresh) !== canonicalJson(grant)) throw new Error('Model authority changed before admission')
      await reservation.admit()
      outerSignal.throwIfAborted()
      const dispatchGrant = await bounded(this.config.governance.verifyRoute(this.route, signal), signal)
      const dispatchApproval = await bounded(this.config.governance.approveContext(this.route, context, options.sessionId, signal), signal)
      checkContextApproval(this.route, context, options.sessionId, dispatchApproval)
      if (canonicalJson(dispatchGrant) !== canonicalJson(grant) || canonicalJson(dispatchApproval) !== canonicalJson(approval))
        throw new Error('Model authority/context permission changed after durable admission')
      const runSignal = AbortSignal.any([outerSignal, AbortSignal.timeout(this.route.limits.timeout_ms)])
      const completion = await this.config.driver.run(this.route, input, requestRoot, runSignal, async () => {
        const latestApproval = await bounded(this.config.governance.approveContext(this.route, context, options.sessionId!, runSignal), runSignal)
        checkContextApproval(this.route, context, options.sessionId!, latestApproval)
        const latestGrant = await bounded(this.config.governance.verifyRoute(this.route, runSignal), runSignal)
        if (canonicalJson(latestGrant) !== canonicalJson(grant) || canonicalJson(latestApproval) !== canonicalJson(approval))
          throw new Error('Authority/exposure changed at the actual model launch boundary')
      }, () => this.config.budget.assertDispatch())
      partial = completion
      if (completion.reported_provider !== null && completion.reported_provider !== this.route.provider
        || completion.reported_model !== null && completion.reported_model !== this.route.model) throw new Error('Provider-reported model identity conflicts with the route')
      if (this.route.identity.assurance === 'provider_reported' && (completion.reported_provider === null || completion.reported_model === null))
        throw new Error('Required served-model identity is unobserved')
      const usage = this.config.driver.usage(completion.raw_usage)
      const value = selection ? selection.validate(completion.text) : null as T
      runSignal.throwIfAborted()
      const receipt = { schema_version: 1, request_id: reservation.record.id, ordinal: reservation.record.ordinal,
        route_id: this.route.id, dsh_session_id: options.sessionId, driver_observation: observation,
        configured_provider: this.route.provider, configured_model: this.route.model,
        reported_provider: completion.reported_provider, reported_model: completion.reported_model,
        served_identity: completion.reported_model === null || completion.reported_provider === null ? 'unobserved' : 'provider_reported',
        cli_thread_id: completion.thread_id, context_sha256: contextHash, input_sha256: sha256(canonicalJson(input)),
        encoded_input_bytes: encodedBytes, native_context_bytes_bound: nativeContextBytes, raw_usage: completion.raw_usage, usage, diagnostics: completion.diagnostics,
        elapsed_ms: completion.elapsed_ms, artifacts: requestRoot, selection: selection ? value : null,
        output_token_cap: null, ignored_output_token_hint: options.maxTokens ?? null, scientific_execution_authorized: false }
      await writeFile(join(requestRoot, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 })
      await reservation.settle(receipt)
      settled = true
      outerSignal.throwIfAborted()
      runSignal.throwIfAborted()
      this.receipts.push(receipt)
      return { completion, usage, value, receipt }
    } catch (error) {
      ownershipUnknown = error instanceof ModelOwnershipError
      if (!settled) await reservation.fail(String(error), error instanceof ModelOwnershipError || error instanceof ModelDriverFailure ? error.evidence : partial, error instanceof ModelOwnershipError)
      throw error
    } finally {
      await this.config.driver.disposeObservation?.(requestRoot, ownershipUnknown)
    }
  }
  override async *stream(options: ModelOptions): AsyncGenerator<StreamChunk> {
    const result = await this.complete(options)
    options.signal?.throwIfAborted()
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text: result.completion.text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: result.completion.text } }
    yield { type: 'usage', usage: result.usage }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}
