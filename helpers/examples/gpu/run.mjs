import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createGpuFixture } from './fixture.mjs'

const output = process.argv[2]
const operation = process.argv[3] ?? 'positive'
if (!['positive', 'incomplete'].includes(operation)) throw new Error('Only the two frozen qualification cases are enabled')
if (!output) throw new Error('Usage: run.mjs <fresh engineering output>; requires a reviewed bounded H100 qualification scope')
const f = await createGpuFixture(output, { timeoutMs: 30000, python: process.env.DSH_GPU_PYTHON ?? '/usr/bin/python3',
  deviceUuid: process.env.DSH_GPU_DEVICE ?? 'GPU-b356e84d-b220-a33c-dd68-3ea01ec109ea',
  leaseRoot: process.env.DSH_GPU_LEASE_ROOT ?? join(homedir(), '.local/state/autoresearch/leases') })
try {
  const subject = await f.prepare(operation)
  const result = await f.adapter.run(subject.request, f.author, new AbortController().signal)
  assert.equal(result.status, 'settled')
  const collected = await f.collected(result)
  assert.equal(collected.evidence.scientific_status, operation === 'incomplete' ? 'ineligible' : 'eligible')
  assert.equal(collected.evidence.verifier.verdict, operation === 'incomplete' ? 'unavailable' : 'positive')
  assert.equal(f.table.get(f.config.projectKey).consumed_attempts, 1)
  assert.equal(f.table.get(f.config.projectKey).reserved_timeout_ms, 0)
  const replay = await f.adapter.run(subject.request, f.author, new AbortController().signal)
  assert.equal(replay.replay, true)
  const raw = collected.evidence.result
  const producer = JSON.parse(Buffer.from(await f.artifacts.read({ uri: raw.gpu_receipt_uri, sha256: raw.gpu_receipt_sha256, size_bytes: raw.gpu_receipt_size })).toString())
  await writeFile(join(f.root, 'receipt.json'), JSON.stringify({ schema_version: 1, timestamp: new Date().toISOString(),
    scope: 'H100 disposable producer/lease/native GPU guard qualification; scripted review only', operation, binding: f.binding,
    association: result, evidence: collected.evidence, producer, state: f.table.get(f.config.projectKey),
    native_trace: f.trace, GPU_units: 1, external_model_calls: 0, scientific_dataset_reads: 0, confirmation: 'off',
    limitations: ['This CUDA-driver vector-add unit does not qualify Accorde predictor science or its full GPU campaign/profile',
      'The author/reviewer fixture is scripted; independent scientific review remains required',
      'Accorde existing goal/exposure authority is not initialized, migrated or resumed'] }, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ receipt: join(f.root, 'receipt.json'), device_uuid: f.policy.gpu.resource.device_uuid, GPU_units: 1, kernel_elements: producer.elements, status: 'passed' }))
} catch (error) {
  await writeFile(join(f.root, 'failure.json'), JSON.stringify({ error: String(error), state: f.table.get(f.config.projectKey), trace: f.trace }, null, 2) + '\n', { flag: 'wx' })
  throw error
} finally { await f.close() }
