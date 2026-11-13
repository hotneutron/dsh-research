import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { TraexTextAdapter, mapTraexUsage } from '../src/traex.js'

test('TraeX aggregate input is mapped to disjoint native cache counters without double charging', () => {
  assert.deepEqual(mapTraexUsage({ input_tokens: 100, output_tokens: 20, cached_input_tokens: 30, cache_creation_input_tokens: 10, reasoning_output_tokens: 5 }),
    { inputTokens: 60, outputTokens: 20, cacheReadTokens: 30, cacheWriteTokens: 10, reasoningTokens: 5, totalTokens: 120 })
  assert.throws(() => mapTraexUsage({ input_tokens: 10, output_tokens: 1, cached_input_tokens: 20, cache_creation_input_tokens: 0, reasoning_output_tokens: 0 }), /overlap/)
  assert.throws(() => mapTraexUsage(null), /authoritative/)
})

test('legacy output hints do not cap or block completion; actual usage and remaining request allowance are retained', async () => {
  const root = await mkdtemp(join(tmpdir(), 'traex-no-token-cap-'))
  try {
    const executable = join(root, 'fixture-cli')
    await writeFile(executable, `#!${process.execPath}
import { writeFileSync } from 'node:fs';
for await (const _ of process.stdin) {}
if (process.argv.some(a => a.includes('max_tokens') || a.includes('maxTokens'))) process.exit(2);
writeFileSync(process.argv[process.argv.indexOf('--output-last-message') + 1], 'Completed review');
for (const e of [{ type: 'thread.started', thread_id: 'uncapped-fixture' },
 { type: 'turn.completed', usage: { input_tokens: 100, output_tokens: 600, cached_input_tokens: 0,
 cache_creation_input_tokens: 0, reasoning_output_tokens: 100 } }]) process.stdout.write(JSON.stringify(e) + '\\n');
`)
    await chmod(executable, 0o700)
    const adapter = new TraexTextAdapter({ executable, projectRoot: root, artifactsRoot: join(root, 'private-requests'),
      model: 'DeepSeek-V4.1-Flash', timeoutMs: 10000, maxRequests: 1 })
    const run = async () => {
      const chunks = []
      for await (const chunk of adapter.stream({ provider: 'fixture', model: 'DeepSeek-V4.1-Flash', messages: [], maxTokens: 512 })) chunks.push(chunk)
      return chunks
    }
    const chunks = await run()
    assert.equal(chunks.at(-1)?.type, 'finish')
    assert.deepEqual(chunks.find(c => c.type === 'usage')?.usage, { inputTokens: 100, outputTokens: 600,
      cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 100, totalTokens: 700 })
    assert.equal(adapter.receipts.length, 1)
    const receipt = adapter.receipts[0] as { output_token_cap: null; legacy_max_tokens_ignored: number }
    assert.equal(receipt.output_token_cap, null)
    assert.equal(receipt.legacy_max_tokens_ignored, 512)
    await assert.rejects(run(), /request limit/)
    assert.equal(adapter.receipts.length, 1)
  } finally { await rm(root, { recursive: true, force: true }) }
})
