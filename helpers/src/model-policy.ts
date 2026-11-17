import { z } from 'zod'
import { ByteRef } from './records.js'
import { canonicalJson, sha256 } from './bindings.js'

const count = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
export const ExecutablePinSchema = z.strictObject({
  path: z.string().min(1), sha256: z.string().regex(/^[0-9a-f]{64}$/), size_bytes: count,
})
export type ExecutablePin = z.infer<typeof ExecutablePinSchema>
export const ModelRouteSchema = z.strictObject({
  schema_version: z.literal(1), id: z.string().min(1), provider: z.string().min(1), model: z.string().min(1),
  dsh_provider: z.string().min(1), role: z.enum(['author', 'reviewer', 'planning']),
  driver: z.strictObject({ id: z.string().min(1), implementation: ByteRef, executable: ExecutablePinSchema,
    runtime: z.array(ExecutablePinSchema), version: z.string().min(1), qualification: ByteRef,
    codex: z.strictObject({ home: z.string().min(1), model_catalog: ExecutablePinSchema }).optional(),
    claude: z.strictObject({ api_key_file: z.string().min(1) }).optional(),
    context_delivery: z.enum(['stdin', 'project_document']), auto_context: z.array(z.strictObject({
      file: ExecutablePinSchema, content_class: z.string().min(1),
    })), auto_context_basis: ByteRef }),
  identity: z.strictObject({ assurance: z.enum(['requested_only', 'provider_reported']), basis: ByteRef }),
  authentication: z.strictObject({ principal: z.string().min(1), class: z.string().min(1),
    use_mode: z.enum(['interactive', 'unattended', 'shared']), protected_reference: z.string().min(1), basis: ByteRef }),
  exposure: z.strictObject({ allowed_classes: z.array(z.string().min(1)).min(1),
    confirmation: z.literal('off'), authority: ByteRef, decision: ByteRef }),
  separation: z.strictObject({ basis: ByteRef, preset: ByteRef, permissions: ByteRef }).nullable(),
  limits: z.strictObject({ timeout_ms: count, preflight_timeout_ms: count, max_encoded_input_bytes: count,
    max_capture_bytes: count, max_answer_bytes: count }),
}).superRefine((route, ctx) => {
  if (route.role !== 'planning' && !route.separation) ctx.addIssue({ code: 'custom', message: 'Research roles require a qualified separation basis' })
  if (new Set(route.exposure.allowed_classes).size !== route.exposure.allowed_classes.length
    || route.exposure.allowed_classes.some(value => ['protected', 'credential', 'unknown'].includes(value)))
    ctx.addIssue({ code: 'custom', message: 'Off-mode exposure cannot admit protected, credential or unknown context' })
  if (route.driver.auto_context.some(value => !route.exposure.allowed_classes.includes(value.content_class)))
    ctx.addIssue({ code: 'custom', message: 'Automatic context is outside the exposure decision' })
  const paths = [route.driver.executable, ...route.driver.runtime, ...route.driver.auto_context.map(value => value.file)].map(pin => pin.path)
  if (new Set(paths).size !== paths.length) ctx.addIssue({ code: 'custom', message: 'Executable/context inventory paths must be unique' })
  if (route.driver.id === 'codex-app-server-v1') {
    const config = route.driver.codex
    if (!config || config.home !== route.authentication.protected_reference
      || !route.driver.auto_context.some(entry => canonicalJson(entry.file) === canonicalJson(config.model_catalog)))
      ctx.addIssue({ code: 'custom', message: 'Codex requires its protected home reference and classified pinned model catalog' })
    if (route.driver.context_delivery !== 'stdin') ctx.addIssue({ code: 'custom', message: 'Codex only qualifies complete stdin context' })
  } else if (route.driver.codex) ctx.addIssue({ code: 'custom', message: 'Codex controls cannot configure another driver' })
  if (route.driver.id === 'claude-print-v1') {
    if (!route.driver.claude || route.driver.claude.api_key_file !== route.authentication.protected_reference
      || !['anthropic_api_key', 'scripted_fixture'].includes(route.authentication.class))
      ctx.addIssue({ code: 'custom', message: 'Claude bare mode requires its protected API-key reference' })
    if (route.driver.context_delivery !== 'stdin') ctx.addIssue({ code: 'custom', message: 'Claude only qualifies complete stdin context' })
    if (!/^claude-[a-z0-9-]+$/.test(route.model)) ctx.addIssue({ code: 'custom', message: 'Claude requires an explicit full model ID' })
    if (!route.exposure.allowed_classes.includes('runtime')) ctx.addIssue({ code: 'custom', message: 'Claude native SDK framing requires runtime exposure qualification' })
  } else if (route.driver.claude) ctx.addIssue({ code: 'custom', message: 'Claude controls cannot configure another driver' })
})
export type ModelRoute = z.infer<typeof ModelRouteSchema>
export interface ContentEntry { pointer: string; sha256: string; size_bytes: number; content_class: string }
export interface ContextApproval {
  context_sha256: string
  decision: z.infer<typeof ByteRef>
  entries: ContentEntry[]
  /** Evidence from the project reader before any protected content materialization. */
  before_read: z.infer<typeof ByteRef>
  author_session_id: string | null
  reviewer_session_id: string | null
}
export interface ModelGovernance {
  /** Host/project authority must verify the actual grant, auth use and qualification, not just file hashes. */
  verifyRoute(route: Readonly<ModelRoute>, signal: AbortSignal): Promise<{ route_sha256: string; authority: z.infer<typeof ByteRef> }>
  /** A trusted project classifier; it cannot be replaced by client-provided class labels. */
  approveContext(route: Readonly<ModelRoute>, context: unknown, sessionId: string, signal: AbortSignal): Promise<ContextApproval>
}

export function contextEntries(context: unknown): Array<Omit<ContentEntry, 'content_class'>> {
  const entries: Array<Omit<ContentEntry, 'content_class'>> = []
  const walk = (value: unknown, pointer: string) => {
    if (Array.isArray(value)) { value.forEach((item, index) => walk(item, `${pointer}/${index}`)); return }
    if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value)) walk(item, pointer + '/' + key.replaceAll('~', '~0').replaceAll('/', '~1'))
      return
    }
    const bytes = canonicalJson(value)
    entries.push({ pointer, sha256: sha256(bytes), size_bytes: Buffer.byteLength(bytes) })
  }
  walk(context, '')
  return entries
}
export function checkContextApproval(route: ModelRoute, context: unknown, sessionId: string, approval: ContextApproval) {
  if (approval.context_sha256 !== sha256(canonicalJson(context))
    || canonicalJson(ByteRef.parse(approval.decision)) !== canonicalJson(route.exposure.decision))
    throw new Error('Context approval does not cover this exact payload/exposure decision')
  ByteRef.parse(approval.before_read)
  const expected = contextEntries(context), supplied = new Map(approval.entries.map(entry => [entry.pointer, entry]))
  if (supplied.size !== approval.entries.length || supplied.size !== expected.length) throw new Error('Context classification is incomplete or ambiguous')
  for (const entry of expected) {
    const actual = supplied.get(entry.pointer)
    if (!actual || actual.sha256 !== entry.sha256 || actual.size_bytes !== entry.size_bytes
      || !route.exposure.allowed_classes.includes(actual.content_class)) throw new Error('Uncovered context refuses model delivery')
  }
  if (route.role !== 'planning') {
    if (!approval.author_session_id || !approval.reviewer_session_id || approval.author_session_id === approval.reviewer_session_id)
      throw new Error('Distinct qualified author/reviewer Sessions are required')
    const expectedSession = route.role === 'author' ? approval.author_session_id : approval.reviewer_session_id
    if (sessionId !== expectedSession) throw new Error('Model request belongs to another research role/Session')
  }
}

export function frozenJson<T>(value: T): T {
  const copy = JSON.parse(canonicalJson(value)) as T
  const freeze = (item: unknown) => { if (item && typeof item === 'object') { Object.values(item).forEach(freeze); Object.freeze(item) } }
  freeze(copy)
  return copy
}
