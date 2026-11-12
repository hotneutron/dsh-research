import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { sha256, verifyManifest, EvidenceSchema, ReviewSchema, CheckpointSchema } from 'dsh-research'
import { packets } from '../tests/fixtures/packets.js'
import { storageFixture, workerFixture } from '../tests/fixtures/native.js'

const output = process.argv[2]
if (!output) throw new Error('Usage: pnpm m1:smoke <fresh-output-directory>')
const directory = resolve(output)
await mkdir(directory, { recursive: false }) // Never overwrite an earlier receipt or synthetic authority.
const started = new Date().toISOString()
const start = performance.now()
const p = packets(join(directory, 'synthetic-project'))
verifyManifest(p.manifest, p.contractBytes, p.registerBytes)
EvidenceSchema.parse(p.evidence)
ReviewSchema.parse(p.review)
CheckpointSchema.parse(p.checkpoint)
const storage = await storageFixture(p.binding.authority.project_root, p.ref('fixture/manifest.json', p.manifest).sha256)
const workers = await workerFixture(p.binding.authority.project_root, p.ref('fixture/manifest.json', p.manifest).sha256)
const records = { manifest: p.manifest, evidence: p.evidence, review: p.review, checkpoint: p.checkpoint }
const recordBytes = JSON.stringify(records, null, 2) + '\n'
await writeFile(join(directory, 'encoding-examples.json'), recordBytes, { flag: 'wx' })
await writeFile(join(directory, 'retained-fixture-bytes.json'), JSON.stringify(Object.fromEntries([...p.artifacts].map(([uri, bytes]) => [uri, Buffer.from(bytes).toString('base64')])), null, 2) + '\n', { flag: 'wx' })
const receipt = {
  schema_version: 1, started, ended: new Date().toISOString(), process_wall_seconds: (performance.now() - start) / 1000,
  contract: p.binding.contract_ref, compatibility_row_ref: p.binding.compatibility_row_ref,
  scope: 'M1 native public consumer smoke and synthetic record encoding; independent qualification review pending',
  records: { path: 'encoding-examples.json', sha256: sha256(recordBytes) }, storage, workers,
  limitations: ['Encoding examples use synthetic authority/review/verifier bytes', 'Scripted model output is not scientific review qualification', 'Storage reopen does not qualify restart-durable job dispatch', 'No production launcher, protected data or live pilot'],
}
await writeFile(join(directory, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ receipt: join(directory, 'receipt.json'), process_wall_seconds: receipt.process_wall_seconds, external_provider_calls: 0, status: 'passed' }))
