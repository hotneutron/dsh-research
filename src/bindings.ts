import { createHash } from 'node:crypto'
import { z } from 'zod'
import { Amount, Binding, ByteRef, Count, Id, ManifestSchema, Sha256 } from './records.js'
import type { ArtifactReference, BoundIdentity, Manifest } from './records.js'

export const sha256 = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex')

/** Stable JSON only for derived identities; artifact hashes always use exact retained bytes. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${Array.from(value, canonicalJson).join(',')}]`
  if (typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype)
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`
  throw new Error('Identity input must be finite JSON with no undefined values')
}

export function verifyBytes(ref: ArtifactReference, bytes: Uint8Array): void {
  ByteRef.parse(ref)
  if (bytes.byteLength !== ref.size_bytes || sha256(bytes) !== ref.sha256) throw new Error(`Artifact identity mismatch: ${ref.uri}`)
}

export function deriveActionId(manifest: Omit<Manifest, 'action_id'>): string {
  const { author_session_id: _transport, ...subject } = manifest
  return `action-${sha256(canonicalJson(subject))}`
}

/** Validate exact content and logical subject together; native admission/review remains a separate gate. */
export function verifyManifest(input: unknown, contractBytes: Uint8Array, registerBytes: Uint8Array): Manifest {
  const manifest = ManifestSchema.parse(input)
  const { action_id, ...subject } = manifest
  if (action_id !== deriveActionId(subject)) throw new Error('Logical action identity differs from the frozen subject')
  verifyCompatibility(manifest.binding, contractBytes, registerBytes)
  return manifest
}

export const CompatibilityRow = z.strictObject({
  row_id: Id, contract_version: Id, changed_obligations: Id, assessment: Id, consumers_and_gate: Id,
  assessment_mode: z.enum(['retrospective', 'contemporaneous']), recorded_at: z.iso.datetime({ offset: true }),
})
export const CompatibilityRegister = z.strictObject({
  schema_version: z.literal(1), established_in: z.literal('2.3.2'), table_sha256: Sha256,
  rows: z.array(CompatibilityRow).min(1),
}).superRefine((v, ctx) => {
  if (new Set(v.rows.map(r => r.contract_version)).size !== v.rows.length || new Set(v.rows.map(r => r.row_id)).size !== v.rows.length)
    ctx.addIssue({ code: 'custom', message: 'Compatibility versions and row IDs must be unique' })
})

export function compatibilityTable(contractBytes: Uint8Array): string {
  const text = Buffer.from(contractBytes).toString('utf8')
  const table = text.match(/\| Contract version \| Added\/changed obligations \| Compatibility assessment \| Affected consumers\/adoption gate \|\n(?:\|[^\n]+\|\n)+/)?.[0]
  if (!table) throw new Error('Contract compatibility table missing')
  return table
}

/** Refuse absent/drifted rows. This checks bindings, not whether an adopter is semantically compatible. */
export function verifyCompatibility(binding: BoundIdentity, contractBytes: Uint8Array, registerBytes: Uint8Array): void {
  Binding.parse(binding)
  verifyBytes(binding.contract_ref.artifact, contractBytes)
  verifyBytes(binding.compatibility_row_ref.register, registerBytes)
  const version = Buffer.from(contractBytes).toString('utf8').match(/^Contract version: `([^`]+)`\./m)?.[1]
  const id = Buffer.from(contractBytes).toString('utf8').match(/^Contract ID: `([^`]+)`\./m)?.[1]
  const ref = binding.compatibility_row_ref
  if (id !== binding.contract_ref.id) throw new Error('Contract ID binding mismatch')
  if (version !== binding.contract_ref.version || ref.contract_version !== version) throw new Error('Contract version binding mismatch')
  const register = CompatibilityRegister.parse(JSON.parse(Buffer.from(registerBytes).toString('utf8')))
  const table = compatibilityTable(contractBytes)
  if (sha256(table) !== register.table_sha256 || register.table_sha256 !== ref.table_sha256) throw new Error('Compatibility table hash mismatch')
  const row = register.rows.find(r => r.contract_version === version && r.row_id === ref.row_id)
  if (!row) throw new Error('Current compatibility row missing')
  if (sha256(canonicalJson(row)) !== ref.row_sha256) throw new Error('Compatibility row hash mismatch')
  if (register.rows.length !== table.trimEnd().split('\n').length - 2) throw new Error('Cumulative compatibility register is incomplete')
  for (const r of register.rows) {
    const line = `| ${r.contract_version} | ${r.changed_obligations} | ${r.assessment} | ${r.consumers_and_gate} |`
    if (!table.split('\n').includes(line)) throw new Error(`Register row differs from contract: ${r.row_id}`)
  }
}

export const EnvelopeDeclaration = z.strictObject({
  id: Id, version: Id, accepted_policy: ByteRef, owner: Id, binding: z.boolean(),
  window: z.strictObject({ start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }) }),
  denominator: Count.positive(), unit: Id, ceiling: Amount, allocation_rule: ByteRef,
}).superRefine((v, ctx) => {
  if (Date.parse(v.window.start) >= Date.parse(v.window.end)) ctx.addIssue({ code: 'custom', message: 'Envelope window must be ordered' })
})

/** Binding comes from the exact accepted declaration, with no caller override. */
export function readEnvelope(ref: ArtifactReference, bytes: Uint8Array): z.infer<typeof EnvelopeDeclaration> {
  verifyBytes(ref, bytes)
  return EnvelopeDeclaration.parse(JSON.parse(Buffer.from(bytes).toString('utf8')))
}
