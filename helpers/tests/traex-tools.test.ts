import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseTraexToolSelection, TraexToolAdapter } from '../src/traex-tools.js'

const tools = [{ name: 'research_run', description: 'Native guarded research tool', parameters: { type: 'object' } }]
test('structured choices reject undeclared tools, malformed arguments and over-bound responses before publication', () => {
  const encode = (calls: unknown[]) => JSON.stringify({ text: '', tool_calls: calls })
  const call = { name: 'research_run', arguments: '{"expected_revision":3}' }
  assert.deepEqual(parseTraexToolSelection(encode([call]), tools, 1).tool_calls, [call])
  assert.throws(() => parseTraexToolSelection(encode([call, { name: 'shell', arguments: '{}' }]), tools, 2), /absent/)
  assert.throws(() => parseTraexToolSelection(encode([{ ...call, arguments: '[]' }]), tools, 1), /JSON object/)
  assert.throws(() => parseTraexToolSelection(encode([call, call]), tools, 1), /bound/)
  assert.throws(() => parseTraexToolSelection(encode([call]), [tools[0]!, tools[0]!], 1), /Ambiguous/)
})
test('model substitution fails before an executable can be invoked', async () => {
  const adapter = new TraexToolAdapter({ executable: '/nonexistent/traecli', projectRoot: '/tmp', artifactsRoot: '/tmp/no-traex-tool-call',
    model: 'DeepSeek-V4.1-Flash', timeoutMs: 100, maxRequests: 1, maxToolCallsPerTurn: 1 })
  const run = async (extra: Record<string, unknown>) => { for await (const _ of adapter.stream({ provider: 'traex', model: 'DeepSeek-V4.1-Flash', messages: [], tools, ...extra })) {} }
  await assert.rejects(run({ model: 'another-model' }), /substitute/)
  assert.equal(adapter.receipts.length, 0)
})

test('concurrent native Sessions retain their own CLI receipts and share one prospective request allowance', async () => {
  const root = await mkdtemp(join(tmpdir(), 'traex-tools-concurrent-'))
  try {
    const executable = join(root, 'fixture-cli')
    await writeFile(executable, `#!${process.execPath}
import { writeFileSync } from 'node:fs';
let prompt = ''; for await (const data of process.stdin) prompt += data;
const marker = prompt.includes('marker-A') ? 'marker-A' : 'marker-B';
const answer = JSON.stringify({ text: marker, tool_calls: [] });
writeFileSync(process.argv[process.argv.indexOf('--output-last-message') + 1], answer);
for (const e of [{ type: 'thread.started', thread_id: marker },
  { type: 'item.completed', item: { type: 'agent_message', text: answer } },
  { type: 'turn.completed', usage: { input_tokens: marker === 'marker-A' ? 101 : 202,
    output_tokens: 20, cached_input_tokens: 0, cache_creation_input_tokens: 0, reasoning_output_tokens: 0 } }])
  process.stdout.write(JSON.stringify(e) + '\\n');
`)
    await chmod(executable, 0o700)
    const adapter = new TraexToolAdapter({ executable, projectRoot: root, artifactsRoot: join(root, 'private-requests'),
      model: 'DeepSeek-V4.1-Flash', timeoutMs: 10000, maxRequests: 2, maxToolCallsPerTurn: 1 })
    const request = async (marker: string) => {
      const chunks = []
      for await (const chunk of adapter.stream({ provider: 'fixture', model: 'DeepSeek-V4.1-Flash', maxTokens: 16384,
        messages: [{ role: 'user', content: [{ type: 'text', text: marker }] }] })) chunks.push(chunk)
      return chunks.find(c => c.type === 'text-delta')
    }
    const results = await Promise.all([request('marker-A'), request('marker-B')])
    assert.deepEqual(results.map(c => c?.type === 'text-delta' ? c.text : null), ['marker-A', 'marker-B'])
    const receipts = adapter.receipts as { output_token_cap: null; legacy_max_tokens_ignored: number; cli: { thread_id: string; usage: { input_tokens: number } } }[]
    assert.deepEqual(receipts.map(r => [r.cli.thread_id, r.cli.usage.input_tokens]).sort(), [['marker-A', 101], ['marker-B', 202]])
    assert.ok(receipts.every(r => r.output_token_cap === null && r.legacy_max_tokens_ignored === 16384))
    await assert.rejects(request('marker-C'), /request limit/)
    assert.equal(adapter.receipts.length, 2)
  } finally { await rm(root, { recursive: true, force: true }) }
})
