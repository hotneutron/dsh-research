import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { codexModelCatalog, decodeCodexUsage, decodeCodexRawUsage } from '../src/model-drivers/codex.js'
import { ModelRouteSchema } from '../src/model-policy.js'
import { modelFixture } from './model-fixture.js'

test('Codex removes catalog instruction and tool sources without selecting another model', () => {
  const original = { models: [{ slug: 'selected', model_messages: { instructions_template: 'unapproved' },
    shell_type: 'unified_exec', apply_patch_tool_type: 'freeform', experimental_supported_tools: ['clock'], context_window: 256000 }] }
  const model = codexModelCatalog(original, 'selected', 'approved instructions').models[0]!
  assert.equal(model.slug, 'selected'); assert.equal((model as any).context_window, 256000)
  assert.equal(model.base_instructions, 'approved instructions'); assert.equal(model.model_messages, null)
  assert.equal(model.apply_patch_tool_type, null); assert.equal(model.shell_type, 'disabled'); assert.deepEqual(model.experimental_supported_tools, [])
  assert.equal(model.multi_agent_version, 'disabled')
  assert.equal(original.models[0]!.apply_patch_tool_type, 'freeform')
  assert.throws(() => codexModelCatalog(original, 'missing', ''), /exact model/)
  assert.throws(() => codexModelCatalog({ models: [...original.models, ...original.models] }, 'selected', ''), /exact model/)
})

test('Codex maps authoritative distinct usage without creating missing counters', () => {
  const usage = { input_tokens: 100, cached_input_tokens: 30, cache_write_input_tokens: 20, output_tokens: 40, reasoning_output_tokens: 10 }
  assert.deepEqual(decodeCodexUsage(usage), { inputTokens: 50, cacheReadTokens: 30, cacheWriteTokens: 20, outputTokens: 40, reasoningTokens: 10, totalTokens: 140 })
  for (const name of Object.keys(usage)) { const bad: any = { ...usage }; delete bad[name]; assert.throws(() => decodeCodexUsage(bad), /unresolved/) }
  for (const bad of [{ ...usage, cached_input_tokens: 90 }, { ...usage, reasoning_output_tokens: 41 },
    { ...usage, input_tokens: Number.MAX_SAFE_INTEGER, output_tokens: 1 }, { ...usage, output_tokens: -1 },
    { input_tokens: 0, cached_input_tokens: 0, cache_write_input_tokens: 0, output_tokens: 0, reasoning_output_tokens: 0 }]) assert.throws(() => decodeCodexUsage(bad))
})

test('Codex refuses unclassified catalog, non-stdin delivery and mixed driver configuration', async () => {
  const f = await modelFixture({ driver: 'codex' })
  try {
    assert.throws(() => ModelRouteSchema.parse({ ...f.route, driver: { ...f.route.driver, auto_context: [] } }), /classified/)
    assert.throws(() => ModelRouteSchema.parse({ ...f.route, driver: { ...f.route.driver, context_delivery: 'project_document' } }), /stdin/)
    assert.throws(() => ModelRouteSchema.parse({ ...f.route, driver: { ...f.route.driver, id: 'traex-exec-v1' } }), /another driver/)
    assert.equal(await f.modelCalls(), 0)
  } finally { await f.close() }
})

test('Codex complete context, isolated argv and unobserved served identity are retained', async () => {
  const f = await modelFixture({ driver: 'codex' })
  try {
    const options = { ...f.options('Codex 中文🙂'), system: 'native system', maxTokens: 512 }
    const chunks = await f.run(options), receipt = f.text.receipts[0] as any
    assert.equal(chunks.at(-1).type, 'finish'); assert.equal(receipt.served_identity, 'unobserved')
    assert.equal(receipt.reported_model, null); assert.equal(receipt.output_token_cap, null)
    assert.deepEqual(JSON.parse(await readFile(join(receipt.artifacts, 'private-approved-context.json'), 'utf8')), options)
    const argv = JSON.parse(await readFile(join(receipt.artifacts, 'private-cli-argv.json'), 'utf8'))
    for (const flag of ['app-server', '--stdio', '--no-daemon', '--strict-config']) assert.ok(argv.includes(flag))
    assert.ok(argv.includes('skills.include_instructions=false')); assert.ok(argv.includes('features.hooks=false'))
    assert.ok(!argv.some((arg: string) => /max_output_tokens|max_tokens|model_max_output_tokens/.test(arg)))
    assert.equal(receipt.usage.outputTokens, 600); assert.equal(f.budget.snapshot().consumed_requests, 1)
  } finally { await f.close() }
})

test('Codex native selections retain stable native IDs and never expose CLI tools', async () => {
  const f = await modelFixture({ driver: 'codex' })
  try {
    const options = { ...f.options('select-native-tool'), tools: [{ name: 'research_run', description: 'guarded', parameters: { type: 'object' } }] }
    const chunks = await f.run(options, f.tools), receipt = f.text.receipts[0] as any
    const call = chunks.find(c => c.type === 'tool-call-delta')
    assert.equal(call.name, 'research_run'); assert.equal(call.id, receipt.selection.tool_calls[0].id)
    assert.equal(call.id, (f.budget.snapshot().records[0]?.receipt as any).selection.tool_calls[0].id)
    assert.equal(await f.modelCalls(), 1)
  } finally { await f.close() }
})

test('Codex unavailable catalog model refuses before debit or model launch', async () => {
  const f = await modelFixture({ driver: 'codex' })
  try {
    await assert.rejects(f.run({ ...f.options(), model: 'missing' }, f.adapter({ model: 'missing' })), /exact model/)
    assert.equal(f.budget.snapshot().consumed_requests, 0); assert.equal(await f.modelCalls(), 0)
  } finally { await f.close() }
})

test('Codex catalog byte tamper refuses before debit', async () => {
  const f = await modelFixture({ driver: 'codex' })
  try {
    await writeFile(f.route.driver.codex!.model_catalog.path, '{"models":[]}')
    await assert.rejects(f.run(), /identity changed|pin differs/)
    assert.equal(f.budget.snapshot().consumed_requests, 0); assert.equal(await f.modelCalls(), 0)
  } finally { await f.close() }
})

for (const message of ['cli-operation', 'missing-usage', 'zero-usage', 'incomplete-cli', 'fatal-cli', 'answer-drift', 'model-rerouted', 'duplicate-terminal', 'post-terminal', 'continuation'])
  test(`Codex ${message} stays charged and emits no response or native call`, async () => {
    const f = await modelFixture({ driver: 'codex' })
    try {
      await assert.rejects(f.run(f.options(message)))
      assert.equal(f.text.receipts.length, 0); assert.equal(f.budget.snapshot().consumed_requests, 1)
      assert.equal(f.budget.snapshot().records[0]?.phase, 'unresolved'); assert.equal(await f.modelCalls(), 1)
      if (['answer-drift', 'duplicate-terminal', 'continuation'].includes(message)) {
        const evidence=f.budget.snapshot().records[0]?.receipt as any
        assert.ok(evidence.raw_completions.length >= 1); assert.equal(evidence.validated_completions[0].usage.outputTokens,600)
      }
    } finally { await f.close() }
  })

test('Codex cannot claim provider-reported identity from the configured model', async () => {
  const f = await modelFixture({ driver: 'codex' })
  try {
    await assert.rejects(f.run(f.options(), f.adapter({ identity: { ...f.route.identity, assurance: 'provider_reported' } })), /identity is unobserved/)
    assert.equal(f.budget.snapshot().consumed_requests, 1)
  } finally { await f.close() }
})

test('Codex launch revocation keeps its admitted charge and sends no model bytes', async () => {
  const f = await modelFixture({ driver: 'codex' })
  try {
    f.setPersist(async snapshot => { if (snapshot.consumed_requests === 1) f.revoke() })
    await assert.rejects(f.run(), /revoked/)
    assert.equal(await f.modelCalls(), 0); assert.equal(f.budget.snapshot().consumed_requests, 1)
  } finally { await f.close() }
})


test('Codex raw usage requires original provider fields and exact native breakdown', () => {
 const raw={usage:{inputTokens:100,outputTokens:40,totalTokens:140,cachedInputTokens:10,cacheWriteInputTokens:0,reasoningOutputTokens:20},usageMetadata:{metadata:{input_tokens:100,output_tokens:40,total_tokens:140,input_tokens_details:{cached_tokens:10},output_tokens_details:{reasoning_tokens:20}}}}
 assert.equal(decodeCodexRawUsage(raw).totalTokens,140)
 assert.throws(()=>decodeCodexRawUsage({...raw,usage:null}),/provider-present/)
 assert.throws(()=>decodeCodexRawUsage({...raw,usageMetadata:null}),/provider-present/)
 assert.throws(()=>decodeCodexRawUsage({...raw,usage:{...raw.usage,outputTokens:41}}),/differs/)
 assert.throws(()=>decodeCodexRawUsage({...raw,usageMetadata:{metadata:{...raw.usageMetadata.metadata,input_tokens_details:{}}}}),/unresolved/)
})
