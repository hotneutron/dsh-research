import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile, writeFile, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { decodeClaudeUsage } from '../src/model-drivers/claude.js'
import { ModelRouteSchema } from '../src/model-policy.js'
import { modelFixture } from './model-fixture.js'

test('Anthropic uncached input and separate cache counters yield a full-call total', () => {
  const raw = { input_tokens: 100, output_tokens: 40, cache_creation_input_tokens: 20, cache_read_input_tokens: 30 }
  assert.deepEqual(decodeClaudeUsage(raw), { inputTokens: 100, outputTokens: 40, cacheReadTokens: 30, cacheWriteTokens: 20, totalTokens: 190 })
  assert.ok(!('reasoningTokens' in decodeClaudeUsage(raw)))
  for (const key of Object.keys(raw)) { const bad: any = { ...raw }; delete bad[key]; assert.throws(() => decodeClaudeUsage(bad), /unresolved/) }
  assert.throws(() => decodeClaudeUsage({ ...raw, input_tokens: Number.MAX_SAFE_INTEGER }), /overflow/)
  assert.throws(() => decodeClaudeUsage({ ...raw, output_tokens: 0 }), /zero/)
  assert.equal(decodeClaudeUsage({ ...raw, input_tokens: 0 }).totalTokens, 90)
})

test('Claude binds protected API auth, explicit model, runtime framing and stdin delivery', async () => {
  const f = await modelFixture({ driver: 'claude' })
  try {
    for (const bad of [
      { ...f.route, model: 'sonnet' },
      { ...f.route, authentication: { ...f.route.authentication, class: 'oauth' } },
      { ...f.route, driver: { ...f.route.driver, context_delivery: 'project_document' } },
      { ...f.route, exposure: { ...f.route.exposure, allowed_classes: ['released'] } },
      { ...f.route, driver: { ...f.route.driver, id: 'traex-exec-v1' } },
    ]) assert.throws(() => ModelRouteSchema.parse(bad))
    assert.equal(await f.modelCalls(), 0)
  } finally { await f.close() }
})

test('Claude raw output, authoritative usage and empty CLI tools complete one DSH request', async () => {
  const f = await modelFixture({ driver: 'claude' })
  try {
    const options = { ...f.options('Claude 中文🙂'), system: 'native role instructions', maxTokens: 512 }
    const chunks = await f.run(options), receipt = f.text.receipts[0] as any
    assert.equal(chunks.at(-1).type, 'finish'); assert.equal(receipt.usage.outputTokens, 600)
    assert.equal(receipt.reported_model, 'claude-fixture-model'); assert.equal(receipt.reported_provider, null)
    assert.equal(receipt.output_token_cap, null); assert.equal(receipt.native_context_bytes_bound, 8192)
    assert.deepEqual(JSON.parse(await readFile(join(receipt.artifacts, 'private-approved-context.json'), 'utf8')), options)
    const argv = JSON.parse(await readFile(join(receipt.artifacts, 'private-cli-argv.json'), 'utf8'))
    assert.equal(argv[argv.indexOf('--tools') + 1], '')
    assert.ok(argv.includes('--bare')); assert.ok(argv.includes('--disable-slash-commands')); assert.ok(argv.includes('--strict-mcp-config'))
    assert.ok(!argv.some((v: string) => /max.tokens|fallback-model|json-schema/.test(v)))
    assert.equal(f.budget.snapshot().consumed_requests, 1); assert.equal(f.budget.snapshot().active, 0)
  } finally { await f.close() }
})

test('Claude schema instructions project native DSH calls only after full raw completion', async () => {
  const f = await modelFixture({ driver: 'claude' })
  try {
    const chunks = await f.run({ ...f.options('select-native-tool'), tools: [{ name: 'research_run', description: 'guarded', parameters: { type: 'object' } }] }, f.tools)
    const call = chunks.find(c => c.type === 'tool-call-delta'), receipt = f.text.receipts[0] as any
    assert.equal(call.name, 'research_run'); assert.equal(call.id, receipt.selection.tool_calls[0].id)
    assert.equal((f.budget.snapshot().records[0]?.receipt as any).selection.tool_calls[0].id, call.id)
  } finally { await f.close() }
})

test('native Claude framing allowance participates in refusal before any model debit', async () => {
  const f = await modelFixture({ driver: 'claude' })
  try {
    const adapter = f.adapter({ limits: { ...f.route.limits, max_encoded_input_bytes: 4096 } })
    await assert.rejects(f.run(f.options('x'), adapter), /byte bound/)
    assert.equal(await f.modelCalls(), 0); assert.equal(f.budget.snapshot().consumed_requests, 0)
  } finally { await f.close() }
})

test('missing or linked credential file refuses Claude before debit', async () => {
  const f = await modelFixture({ driver: 'claude' })
  try {
    const link = join(f.root, 'linked-key'); await symlink(f.route.driver.claude!.api_key_file, link)
    const adapter = f.adapter({ driver: { ...f.route.driver, claude: { api_key_file: link } }, authentication: { ...f.route.authentication, protected_reference: link } })
    await assert.rejects(f.run(f.options(), adapter), /canonical/)
    await writeFile(f.route.driver.claude!.api_key_file, 'invalid\nsecond-line')
    await assert.rejects(f.run(), /format/)
    assert.equal(await f.modelCalls(), 0); assert.equal(f.budget.snapshot().consumed_requests, 0)
  } finally { await f.close() }
})

for (const message of ['missing-usage', 'zero-usage', 'wrong-model', 'cli-operation', 'hook-event', 'truncated', 'incomplete-cli', 'fatal-cli', 'duplicate-terminal', 'answer-drift', 'invalid-terminal-counters'])
  test(`Claude ${message} remains charged without emitting executable blocks`, async () => {
    const f = await modelFixture({ driver: 'claude' })
    try {
      await assert.rejects(f.run(f.options(message)))
      assert.equal(f.text.receipts.length, 0); assert.equal(f.budget.snapshot().consumed_requests, 1)
      assert.equal(f.budget.snapshot().records[0]?.phase, 'unresolved')
      if (['answer-drift','invalid-terminal-counters'].includes(message)) assert.equal((f.budget.snapshot().records[0]?.receipt as any).message_delta.usage.output_tokens, 600)
    } finally { await f.close() }
  })

test('Claude observed model alone cannot satisfy a required served-provider claim', async () => {
  const f = await modelFixture({ driver: 'claude' })
  try {
    await assert.rejects(f.run(f.options(), f.adapter({ identity: { ...f.route.identity, assurance: 'provider_reported' } })), /identity is unobserved/)
    assert.equal(f.budget.snapshot().consumed_requests, 1)
  } finally { await f.close() }
})
