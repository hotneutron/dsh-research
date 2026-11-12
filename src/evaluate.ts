import { EvidenceSchema } from './records.js'
import type { Evidence, Manifest } from './records.js'
import { sha256 } from './bindings.js'

export interface CheckedCapture {
  result: Record<string, number | string | boolean>
  valid: boolean
  reason: string | null
  sha256: string
  size_bytes: number
}

/** Hash and parse one supplied captured buffer; no second filesystem read. */
export function checkCapture(bytes: Uint8Array, manifest: Manifest, complete: boolean): CheckedCapture {
  const base = { sha256: sha256(bytes), size_bytes: bytes.byteLength }
  if (!complete) return { ...base, result: {}, valid: false, reason: 'incomplete_capture' }
  try {
    const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'))
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Expected an output object')
    const result: Record<string, number | string | boolean> = {}
    const fields = manifest.output.required_fields
    for (const [key, type] of Object.entries(fields)) {
      const entry = (value as Record<string, unknown>)[key]
      if (type === 'finite_number' ? typeof entry !== 'number' || !Number.isFinite(entry) : typeof entry !== type) throw new Error(`Invalid declared field: ${key}`)
      Object.defineProperty(result, key, { value: entry, enumerable: true })
    }
    if (Object.keys(value).some(key => !Object.hasOwn(fields, key))) throw new Error('Undeclared output field')
    return { ...base, result, valid: true, reason: null }
  } catch (error) { return { ...base, result: {}, valid: false, reason: error instanceof Error ? error.message : 'invalid_output' } }
}

export function validateEvidence(evidence: unknown, manifest: Manifest): Evidence {
  const parsed = EvidenceSchema.parse(evidence)
  if (parsed.action_id !== manifest.action_id || parsed.verifier.identity.sha256 !== manifest.evaluator.verifier.sha256) throw new Error('Evidence/verifier does not match its frozen manifest')
  return parsed
}
