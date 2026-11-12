import { canonicalJson, sha256 } from './bindings.js'
import { ResearchStateSchema } from './admission.js'
import type { ResearchState } from './admission.js'
import type { ArtifactReference } from './records.js'
import { ProjectArtifacts } from './manifest.js'
import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import { Count, Id } from './records.js'

/** Existing project transport owns permissions and physical publication; no service is created here. */
export interface PublicationTransport {
  put(operationId: string, bytes: Uint8Array): Promise<void>
  fetch(operationId: string, audience: string): Promise<{ bytes: Uint8Array; access: boolean; source: unknown } | null>
}

export async function publishCheckpoint(input: { artifacts: ProjectArtifacts; table: KvTable<string, ResearchState>; projectKey: string;
  checkpoint: ArtifactReference; release: ArtifactReference; audience: string; maxAttempts: number; transport: PublicationTransport }) {
  const { artifacts, table, projectKey, checkpoint, release, audience, transport } = input
  Count.positive().parse(input.maxAttempts); Id.parse(audience)
  await artifacts.read(checkpoint)
  const bytes = await artifacts.read(release)
  const operationId = `publication-${sha256(canonicalJson([checkpoint.sha256, release.sha256, audience]))}`
  let publication = table.get(projectKey)!.publications[operationId]
  if (publication?.status === 'verified') return publication
  const verify = async () => {
    const fetched = await transport.fetch(operationId, audience)
    if (fetched === null) return null
    if (!fetched.access || sha256(fetched.bytes) !== release.sha256) throw new Error('Fetched release or audience access does not match')
    const fetchedRef = await artifacts.write(`snapshots/publication/${operationId}-fetched-${sha256(fetched.bytes)}.bin`, fetched.bytes).catch(async error => {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      const ref = { uri: `snapshots/publication/${operationId}-fetched-${sha256(fetched.bytes)}.bin`, sha256: sha256(fetched.bytes), size_bytes: fetched.bytes.byteLength }
      await artifacts.read(ref); return ref
    })
    const proofBytes = Buffer.from(canonicalJson({ fetched: fetchedRef, audience, access: true, source: fetched.source }))
    return artifacts.writeOnce(`snapshots/publication/${operationId}-proof-${sha256(proofBytes)}.json`, proofBytes)
  }
  try {
    if (!publication) {
      await table.update(projectKey, current => ResearchStateSchema.parse({ ...current, revision: current.revision + 1,
        publications: { ...current.publications, [operationId]: { operation_id: operationId, checkpoint, release, audience, status: 'pending', attempts: 0, verification: null } } }))
      publication = table.get(projectKey)!.publications[operationId]!
    }
    let proof = await verify() // Reconcile an uncertain response before retrying transport.
    if (proof === null) {
      if (publication.attempts >= input.maxAttempts) throw new Error('Publication retry budget exhausted')
      await table.update(projectKey, current => ResearchStateSchema.parse({ ...current, revision: current.revision + 1,
        publications: { ...current.publications, [operationId]: { ...current.publications[operationId]!, attempts: current.publications[operationId]!.attempts + 1, status: 'unknown' } } }))
      await transport.put(operationId, bytes)
      proof = await verify()
      if (!proof) throw new Error('Publication not available after transport acknowledgement')
    }
    await table.update(projectKey, current => ResearchStateSchema.parse({ ...current, revision: current.revision + 1,
      publications: { ...current.publications, [operationId]: { ...current.publications[operationId]!, status: 'verified', verification: proof } } }))
  } catch {
    // Keep only the publication unresolved. Scientific authority/counters are untouched.
  }
  return table.get(projectKey)!.publications[operationId]!
}
