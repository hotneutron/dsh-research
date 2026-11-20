import assert from 'node:assert/strict'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import { createUserMessage, LlmAdapter } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import { boundedJsonContent, NativeRequiredContext } from '../src/delivery.js'

test('scientific inline content obeys both SDK token and byte budgets', () => {
  const original = { finding: 'Partial 中文🙂', complete: false, reference: { uri: 'exact.json', sha256: 'a'.repeat(64), size_bytes: 1 } }
  const saved = structuredClone(original)
  assert.ok(boundedJsonContent(original).length)
  assert.deepEqual(original, saved)
  assert.throws(() => boundedJsonContent(original, { maxBytes: 1, maxTokens: 2000 }), /delivery overflow/)
  assert.throws(() => boundedJsonContent(original, { maxBytes: 6000, maxTokens: 1 }), /delivery overflow/)
  assert.throws(() => boundedJsonContent(original, { maxBytes: 0, maxTokens: 2000 }), /positive byte and token bounds/)
})

test('required discovery is checked without mutating final requests or crossing session boundaries', async () => {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  const guard = new NativeRequiredContext(ctx)
  try {
    const required = [{ type: 'text' as const, text: '{"pinned_scientific_context":"exact-bytes"}' }]
    guard.require('author', required); guard.require('reviewer', required)
    const request: GenerateOptions = { provider: 'fixture', model: 'scripted', sessionId: SessionId('author'),
      messages: [createUserMessage({ content: required, source: { kind: 'user' } })] }
    const saved = structuredClone(request)
    Object.freeze(request.messages); Object.freeze(request)
    guard.assertRequest(request)
    assert.deepEqual(request, saved)
    assert.throws(() => guard.assertRequest({ ...request, messages: [] }), /missing from final native model request/)
    assert.throws(() => guard.assertRequest({ ...request, sessionId: SessionId('reviewer'), messages: [] }), /provider dispatch refused/)
    guard.assertRequest({ ...request, sessionId: SessionId('unrelated'), messages: [] })
    guard.assertRequest({ ...request, purpose: 'compaction', messages: [] })
    guard.assertRequest({ ...request, purpose: 'session-title', messages: [] })
    guard.clear('author')
    guard.assertRequest({ ...request, messages: [] })
  } finally { guard.close(); await ctx.fiber.dispose() }
})

test('missing discovery refuses streaming before any provider invocation', async () => {
  const ctx = new Context()
  await mountAgentLoopTestDependencies(ctx)
  let calls = 0
  class Adapter extends LlmAdapter {
    override async resolveModel(provider: string, model: string) { return { provider, id: model, name: model } }
    override async *stream(): AsyncIterable<StreamChunk> { calls++; yield { type: 'finish', reason: { kind: 'stop' } } }
  }
  ctx.llm.registerAdapter(['guard-fixture'], new Adapter())
  const guard = new NativeRequiredContext(ctx)
  try {
    guard.require('author', [{ type: 'text', text: 'Exact scientific discovery' }])
    await assert.rejects(async () => {
      for await (const _chunk of ctx.llm.stream({ provider: 'guard-fixture', model: 'scripted', sessionId: SessionId('author'), messages: [] })) {}
    }, /provider dispatch refused/)
    assert.equal(calls, 0)
  } finally { guard.close(); await ctx.fiber.dispose() }
})
