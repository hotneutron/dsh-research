import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { decodeOpenCodeUsage, OpenCodeModelSpecSchema } from '../src/model-drivers/opencode.js'
import { ModelRouteSchema } from '../src/model-policy.js'
import { modelFixture } from './model-fixture.js'

test('OpenCode reports consistent aggregates without claiming normalized cache/reasoning subcounts', () => {
  const raw = { total: 140, input: 80, output: 30, reasoning: 10, cache: { read: 20, write: 0 } }
  assert.deepEqual(decodeOpenCodeUsage(raw), { inputTokens: 100, outputTokens: 40, totalTokens: 140 })
  for (const bad of [{ ...raw, total: undefined }, { ...raw, total: 141 }, { ...raw, input: -1 },
    { ...raw, cache: {} }, { ...raw, output: 0, reasoning: 0 }, { ...raw, total: Number.MAX_SAFE_INTEGER, input: Number.MAX_SAFE_INTEGER }])
    assert.throws(() => decodeOpenCodeUsage(bad))
  assert.throws(() => OpenCodeModelSpecSchema.parse({ model_id: 'm', context_tokens: 1, output_tokens: 1, npm: 'arbitrary-package' }))
})

test('OpenCode binds one bundled SDK, classified metadata, runtime framing and protected API auth', async () => {
  const f = await modelFixture({ driver: 'opencode' })
  try {
    for (const bad of [
      { ...f.route, driver: { ...f.route.driver, opencode: { ...f.route.driver.opencode, sdk: 'arbitrary' } } },
      { ...f.route, driver: { ...f.route.driver, auto_context: [] } },
      { ...f.route, driver: { ...f.route.driver, context_delivery: 'project_document' } },
      { ...f.route, authentication: { ...f.route.authentication, class: 'oauth' } },
      { ...f.route, driver: { ...f.route.driver, opencode: { ...f.route.driver.opencode, base_url: 'https://secret:password@example.com/v1' } } },
      { ...f.route, driver: { ...f.route.driver, opencode: { ...f.route.driver.opencode, base_url: 'http://external.example/v1' } } },
      { ...f.route, driver: { ...f.route.driver, id: 'traex-exec-v1' } },
    ]) assert.throws(() => ModelRouteSchema.parse(bad))
    assert.equal(await f.modelCalls(), 0)
  } finally { await f.close() }
})

test('OpenCode probes exact controls, completes one text step and retains full native context', async () => {
  const f = await modelFixture({ driver: 'opencode' })
  try {
    const options = { ...f.options('中文🙂 full native context'), system: 'DSH role authority', maxTokens: 512 }
    const chunks = await f.run(options), receipt = f.text.receipts[0] as any
    assert.equal(chunks.at(-1).type, 'finish'); assert.equal(receipt.usage.outputTokens, 600)
    assert.equal(receipt.usage.inputTokens, 202); assert.equal(receipt.native_context_bytes_bound, 16384)
    assert.equal(receipt.reported_model, 'fixture-model'); assert.equal(receipt.output_token_cap, null)
    const cfg = JSON.parse(await readFile(join(receipt.artifacts, 'private-resolved-config.json'), 'utf8'))
    assert.equal(cfg.permission['*'], 'deny'); assert.deepEqual(cfg.enabled_providers, ['dsh-model-provider'])
    assert.deepEqual(cfg.plugin, []); assert.equal(cfg.agent['dsh-model'].steps, undefined)
    const agent = JSON.parse(await readFile(join(receipt.artifacts, 'private-resolved-agent.json'), 'utf8'))
    assert.ok(Object.values(agent.tools).every(value => value === false))
    assert.deepEqual(JSON.parse(await readFile(join(receipt.artifacts, 'private-approved-context.json'), 'utf8')), options)
    const runtime = JSON.parse(await readFile(join(receipt.artifacts, 'private-opencode-runtime.json'), 'utf8')).runtime
    await assert.rejects(stat(runtime), { code: 'ENOENT' })
    assert.equal(f.budget.snapshot().consumed_requests, 1)
  } finally { await f.close() }
})

test('OpenCode selects DSH tools through complete JSON text rather than native tool execution', async () => {
  const f = await modelFixture({ driver: 'opencode' })
  try {
    const chunks = await f.run({ ...f.options('select-native-tool'), tools: [{ name: 'research_run', description: 'guarded', parameters: { type: 'object' } }] }, f.tools)
    const call = chunks.find(c => c.type === 'tool-call-delta'), receipt = f.text.receipts[0] as any
    assert.equal(call.name, 'research_run'); assert.equal(call.id, receipt.selection.tool_calls[0].id)
    assert.equal((f.budget.snapshot().records[0]?.receipt as any).selection.tool_calls[0].id, call.id)
  } finally { await f.close() }
})

test('OpenCode metadata tamper and oversized framing refuse before model debit', async () => {
  const f = await modelFixture({ driver: 'opencode' })
  try {
    await assert.rejects(f.run(f.options(), f.adapter({ limits: { ...f.route.limits, max_encoded_input_bytes: 8192 } })), /byte bound/)
    await writeFile(f.route.driver.opencode!.model_catalog.path, '{}')
    await assert.rejects(f.run(), /identity changed/)
    assert.equal(await f.modelCalls(), 0); assert.equal(f.budget.snapshot().consumed_requests, 0)
  } finally { await f.close() }
})

test('tampered runtime mapping cannot delete the project and cleans only its owned observation', async () => {
  const f = await modelFixture({ driver: 'opencode' })
  let runtime: string | null = null
  try {
    f.setPersist(async state => {
      if (state.consumed_requests !== 1 || state.records[0]?.phase !== 'admitted') return
      const path = join(f.root, 'requests', state.records[0]!.id, 'private-opencode-runtime.json')
      const value = JSON.parse(await readFile(path, 'utf8')); runtime = value.runtime
      await writeFile(path, JSON.stringify({ ...value, runtime: f.root }))
    })
    await assert.rejects(f.run(), /owned observation/)
    assert.ok(await stat(join(f.root, 'fixture-marker.json')))
    assert.ok(runtime); await assert.rejects(stat(runtime), { code: 'ENOENT' })
    assert.equal(await f.modelCalls(), 0); assert.equal(f.budget.snapshot().consumed_requests, 1)
  } finally { await f.close() }
})

test('late preflight revocation disposes OpenCode runtime without a model admission', async () => {
  const f = await modelFixture({ driver: 'opencode' })
  const original = f.governance.verifyRoute; let calls = 0
  try {
    f.governance.verifyRoute = async (...args) => { if (++calls === 2) f.revoke(); return original(...args) }
    await assert.rejects(f.run(), /revoked/)
    const id = f.budget.snapshot().records[0]!.id
    const runtime = JSON.parse(await readFile(join(f.root, 'requests', id, 'private-opencode-runtime.json'), 'utf8')).runtime
    await assert.rejects(stat(runtime), { code: 'ENOENT' })
    assert.equal(f.budget.snapshot().consumed_requests, 0); assert.equal(await f.modelCalls(), 0)
  } finally { await f.close() }
})

for (const message of ['missing-usage', 'zero-usage', 'inconsistent-usage', 'cli-operation', 'truncated', 'incomplete-cli', 'fatal-cli', 'duplicate-terminal'])
  test(`OpenCode ${message} remains charged and emits no response`, async () => {
    const f = await modelFixture({ driver: 'opencode' })
    try {
      await assert.rejects(f.run(f.options(message)))
      assert.equal(f.text.receipts.length, 0); assert.equal(f.budget.snapshot().consumed_requests, 1)
      assert.equal(f.budget.snapshot().records[0]?.phase, 'unresolved')
    } finally { await f.close() }
  })


test('JSON-escaped API credential echo is refused and absent from persisted evidence', async () => {
 const f=await modelFixture({driver:'opencode'})
 try {
  await assert.rejects(f.run(f.options('encoded-credential-echo')), /protected credential/)
  const record=f.budget.snapshot().records[0] as any,key=await readFile(f.route.driver.opencode!.api_key_file,'utf8')
  assert.ok(!JSON.stringify(record).includes(key))
  assert.ok(!JSON.stringify(record.receipt.upstream).includes(key));assert.ok(record.receipt.upstream.error.includes('protected credential'))
 }finally{await f.close()}
})


test('split upstream credential fragments are refused before forwarding or persistence', async()=>{
 const f=await modelFixture({driver:'opencode'})
 try{
  await assert.rejects(f.run(f.options('split-credential-echo')), /protected credential/)
  const record=f.budget.snapshot().records[0] as any
  assert.equal(record.receipt.upstream.complete,null)
  await assert.rejects(stat(join(record.receipt.artifacts,'private-upstream-response.jsonl')),{code:'ENOENT'})
  assert.equal(await f.modelCalls(),1)
 }finally{await f.close()}
})


test('cancellation retains usage frames received before HTTP body EOF', async()=>{
 const f=await modelFixture({driver:'opencode'}),controller=new AbortController()
 try{
  const work=f.run({...f.options('usage-then-hang'),signal:controller.signal});const observed=work.catch(e=>e)
  const end=Date.now()+15000
  while(await f.modelCalls()===0&&Date.now()<end)await new Promise(yes=>setTimeout(yes,20))
  await new Promise(yes=>setTimeout(yes,250));controller.abort(new Error('qualification cancellation'))
  assert.ok(await observed instanceof Error)
  const record=f.budget.snapshot().records[0] as any
  assert.equal(record.receipt.upstream.observed.reported_usage[0].completion_tokens,600)
  assert.equal(record.phase,'unresolved');assert.equal(f.budget.snapshot().consumed_requests,1)
 }finally{await f.close()}
})
