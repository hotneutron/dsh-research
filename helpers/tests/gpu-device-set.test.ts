import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GpuResourceSchema, gpuDeviceMask, checkGpuPreflight, checkGpuSettlement } from '../src/gpu.js'
import { DevelopmentPolicySchema } from '../src/admission.js'
import { createGpuFixture } from '../examples/gpu/fixture.mjs'

const first = 'GPU-c80fe196-e3ba-82ff-7233-d9804f701864'
const second = 'GPU-4aae1f51-fb63-a02f-2980-271fde921f2e'

test('historical single GPU resource round trips without adding fields', () => {
  const old = { host: 'h100sjc0', device_uuid: first }
  assert.deepEqual(GpuResourceSchema.parse(old), old)
  assert.equal(gpuDeviceMask(old), first)
})

test('device ordinal order is explicit and primary/duplicates cannot be hidden', () => {
  assert.equal(gpuDeviceMask({ host: 'h100sjc0', device_uuid: first, device_uuids: [first, second] }), first + ',' + second)
  assert.equal(GpuResourceSchema.safeParse({ host: 'h100sjc0', device_uuid: first, device_uuids: [second, first] }).success, false)
  assert.equal(GpuResourceSchema.safeParse({ host: 'h100sjc0', device_uuid: first, device_uuids: [first, first] }).success, false)
})

test('pair policy refuses partial/reordered masks and primary-only guard evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-device-set-'))
  const f = await createGpuFixture(join(root, 'project'), { stub: true })
  try {
    const resource = { ...f.policy.gpu.resource, device_uuid: first, device_uuids: [first, second] }
    const policy = { ...f.policy, gpu: { ...f.policy.gpu, resource,
      environment: { ...f.policy.gpu.environment, CUDA_VISIBLE_DEVICES: first + ',' + second } } }
    assert.equal(DevelopmentPolicySchema.safeParse(policy).success, true)
    for (const mask of [first, second + ',' + first, first + ',' + second + ',' + first]) {
      assert.equal(DevelopmentPolicySchema.safeParse({ ...policy, gpu: { ...policy.gpu,
        environment: { ...policy.gpu.environment, CUDA_VISIBLE_DEVICES: mask } } }).success, false)
    }
    const p = await f.prepare()
    const ref = await f.gpu.preflight({ manifest: p.manifest, manifestRef: p.manifestRef }, new AbortController().signal)
    const observed = JSON.parse(Buffer.from(await f.artifacts.read(ref)).toString())
    const bound = DevelopmentPolicySchema.parse(policy)
    assert.throws(() => checkGpuPreflight(observed, bound.gpu!, p.manifestRef), /resource mismatch/)
  } finally { await f.close(); await rm(root, { recursive: true, force: true }) }
})
