import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { mountAgentLoopTestDependencies, mountAgentLoopTestHarness } from '@deepseek-ai/dsh-agent-loop-testkit'
import { createUserMessage, LlmAdapter, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import LocalSpillStore from '@deepseek-ai/dsh-spill-local'
import * as SpillPolicy from '@deepseek-ai/dsh-spill-policy'
import TokenMeter from '@deepseek-ai/dsh-token-meter'
import ToolResultPruner from '@deepseek-ai/dsh-compaction-tool-result-pruner'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolDefinition, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { NativeProductionResearch } from '../src/production.js'
import { ScientificHandoff } from '../src/steering.js'
import { ProjectArtifacts } from '../src/manifest.js'
import { canonicalJson } from '../src/bindings.js'
import { NativeRequiredContext } from '../src/delivery.js'
import type { ArtifactReference } from '../src/records.js'

// dsh-base 0.2.1-alpha.2's deployed default; no model provider or GPU is used.
const maxInlineTokens = 12500
const textOf = (content: readonly ContentBlock[]) => content.flatMap(block => block.type === 'text' ? [block.text] : []).join('')

class StatusAdapter extends LlmAdapter {
  requests: GenerateOptions[] = []
  pending: { name: string; arguments: unknown }[] = [{ name: 'research_status', arguments: {} }]
  override async resolveModel(provider: string, model: string) { return { provider, id: model, name: model } }
  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    const call = this.pending.shift()
    if (call) {
      const block = { type: 'tool-call' as const, id: ToolCallId(this.requests.length === 1 ? 'status-rendering' : `context-${this.requests.length}`),
        name: call.name, arguments: JSON.stringify(call.arguments) }
      yield { type: 'block-start', index: 0, blockType: 'tool-call' }
      yield { type: 'tool-call-delta', index: 0, id: block.id, name: block.name, argumentsDelta: block.arguments }
      yield { type: 'block-end', index: 0, block }
      yield { type: 'finish', reason: { kind: 'tool-calls' } }
    } else {
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: 'Status received.' }
      yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Status received.' } }
      yield { type: 'finish', reason: { kind: 'stop' } }
    }
  }
}

async function renderStatus(large: boolean, policyBody = false, longLesson = false) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-status-rendering-'))
  const ctx = new Context()
  try {
    await mountAgentLoopTestDependencies(ctx, { workingDirectory: true, tools: { mode: 'native' } })
    await mkdir(join(root, 'spill'), { mode: 0o700 })
    await ctx.plugin(LocalSpillStore, { root: join(root, 'spill'), cleanupPeriodDays: 0 })
    await ctx.plugin(SpillPolicy, { maxInlineTokens })
    await ctx.plugin(TokenMeter)
    await ctx.plugin(ToolResultPruner)
    if (policyBody) {
      ctx.on('tools/post-execute', async (exec, result, next) => {
        const decision = await next()
        return exec.name === 'research_status' && !result.isError
          ? { kind: 'accept', content: [{ type: 'text', text: canonicalJson(result.value) }] } : decision
      })
      ctx.on('tools/post-execute', async (_exec, result, next) => {
        const decision = await next()
        if (decision.kind !== 'accept' || Object.hasOwn(decision, 'value')) return decision
        const content = ctx.toolResultPruner.pruneContent(decision.content ?? result.content)
        return content ? { kind: 'accept', content,
          ...(decision.additionalContexts ? { additionalContexts: decision.additionalContexts } : {}) } : decision
      }, { prepend: true })
    }
    const harness = await mountAgentLoopTestHarness(ctx)
    const adapter = new StatusAdapter()
    ctx.llm.registerAdapter(['status-fixture'], adapter)
    const author = await harness.create(SessionId('status-author'), { provider: 'status-fixture', model: 'scripted' }, { cwd: root })
    const methodology = 'Frozen methodology: inspect existing evidence.'
    const evidenceText = 'Partial observation 中文🙂; uncertainty remains.\n'.repeat(large ? 4096 : 1)
    const artifacts = await ProjectArtifacts.open(root)
    const prefix = 'local_artifacts/autoresearch/dsh/rendering'
    const write = (name: string, value: unknown) => artifacts.writeOnce(`${prefix}/${name}`,
      Buffer.from(typeof value === 'string' ? value : canonicalJson(value)))
    const methodRef = await write('methodology.md', methodology), originalRequest = await write('request.md', 'Inspect the released evidence.')
    const evidenceRef = await write('partial.txt', evidenceText), lessons = []
    for (const status of ['negative', 'unresolved']) lessons.push(await write(`${status}.json`, { kind: 'scientific_lesson.v1', id: `${status}-lesson`,
      status, classification: 'observation', finding: `${status} observation 中文🙂`.repeat(longLesson ? 128 : 1), tested_scope: 'Partial native fixture', uncertainty: 'Partial evidence only',
      support: [evidenceRef], invalidation_conditions: ['New evidence'], supersedes: [], applicable_decisions: ['Next diagnostic'] }))
    const index = await write('index-r1.json', { kind: 'scientific_evidence_index.v1', revision: 'r1', previous_index: null,
      original_request: originalRequest, methodology: methodRef, lessons,
      evidence: [{ reference: evidenceRef, purpose: 'Partial observation', access: 'released', delivery: 'model_readable' }] })
    const capabilities = await write('capabilities.json', { kind: 'scientific_capability_envelope.v1', methodology: methodRef,
      capabilities: [{ id: 'inspect', operation: 'inspect', question: 'What does partial evidence support?', observable: 'Coverage', prerequisites: [] }] })
    const handoff = new ScientificHandoff({ artifacts, artifactPrefix: prefix, evidenceIndex: index, capabilityEnvelope: capabilities,
      maxContextBytes: 1048576, maxIndexHistory: 16, assertActiveAuthority: async () => {} })
    const context = await handoff.context()
    const policyRef = await write('policy.json', { synthetic: true })
    // Only persistence, feedback capture and handoff loading are fixture seams.
    // The production status builder and research_status tool/renderer run unchanged.
    const state = { revision: 1, binding: {}, policy: policyRef, stopped: false, hold: null, actions: {}, loop: null,
      consumed_attempts: 1, consumed_timeout_ms: 10, reserved_timeout_ms: 0, consumed_review_requests: 1,
      feedback: { items: { historical: { reason: 'Historical reviewer feedback; preserve the aggregate record.\n'.repeat(large ? 4096 : 1) } } },
      publications: {} }
    const requiredContext = new NativeRequiredContext(ctx)
    const loop: NativeProductionResearch = Object.assign(Object.create(NativeProductionResearch.prototype), {
      ctx, author, config: { statusMaxActions: 16, artifacts, artifactPrefix: prefix, policy: policyRef, assertActiveAuthority: async () => {} }, handoff, requiredContext,
      policy: { binding: state.binding, goal_id: 'status-fixture', goal_revision: 'r1', allowed_operations: ['inspect'],
        max_attempts: 2, max_total_timeout_ms: 1000, review_limits: { max_requests: 2 }, allowed_read_prefixes: [prefix + '/'] },
      state: () => state, syncFeedback: async () => {},
    })
    const tool = (Reflect.get(loop, 'tools').call(loop) as ToolDefinition[]).find(row => row.name === 'research_status')!
    author.ctx.tools.register(tool)
    for (const tool of Reflect.get(loop, 'scientificTools').call(loop) as ToolDefinition[]) author.ctx.tools.register(tool)
    const original = await loop.status() as Awaited<ReturnType<NativeProductionResearch['status']>> & {
      scientific_delivery: { full_status: ArtifactReference } }
    assert.ok(original.scientific_delivery)
    let result: ToolExecutionResult | undefined
    ctx.on('tools/result', (_exec, value) => { result = value })
    author.followup(createUserMessage({ content: [{ type: 'text', text: 'Read research_status once, then stop.' }], source: { kind: 'user' } }))
    await author.whenIdle()
    assert.equal(adapter.requests.length, 2, 'A tool result must reach the actual next native model request')
    assert.ok(result && !result.isError, 'Native research_status execution must succeed')
    const message = adapter.requests[1]!.messages.find(row => row.role === 'tool' && row.toolCallId === ToolCallId('status-rendering'))
    assert.ok(message, 'Next model request must contain the matching tool-result message')
    const preview = textOf(result.content), modelText = textOf(message.content)
    const spills = await readdir(join(root, 'spill'), { recursive: true })
    const paths = spills.filter(path => path.endsWith('.txt')).map(path => join(root, 'spill', path))
    const retained = await Promise.all(paths.map(path => readFile(path, 'utf8')))
    return { original, canonical: result.value, rendered: textOf(tool.output.render({}, result.value)), preview, modelText, context, artifacts, ctx, author,
      async fetch(name: string, arguments_: unknown) {
        adapter.pending.push({ name, arguments: arguments_ })
        author.followup(createUserMessage({ content: [{ type: 'text', text: 'Retrieve the exact context page.' }], source: { kind: 'user' } }))
        await author.whenIdle()
        assert.ok(result && !result.isError)
        const message = adapter.requests.at(-1)!.messages.findLast(row => row.role === 'tool')!
        return { value: result.value, modelText: textOf(message.content) }
      },
      spillPaths: paths, retained, close: async () => { requiredContext.close(); await ctx.fiber.dispose(); await rm(root, { recursive: true, force: true }) } }
  } catch (error) {
    await ctx.fiber.dispose()
    await rm(root, { recursive: true, force: true })
    throw error
  }
}

test('native research_status rendering', { timeout: 15000 }, async t => {
  await t.test('small status delivers exact context and partial lessons inline', async () => {
    const f = await renderStatus(false)
    try {
      assert.deepEqual(f.canonical, f.original)
      assert.equal(f.rendered, canonicalJson(f.original.scientific_delivery))
      assert.equal(f.modelText, f.preview)
      assert.deepEqual(JSON.parse(f.modelText), f.original.scientific_delivery)
      assert.deepEqual(JSON.parse(f.modelText).scientific.lesson_catalog.entries.map((row: { status: string }) => row.status), ['negative', 'unresolved'])
      const lesson = await f.fetch('research_context', { reference: f.context.lessons[0]!.reference })
      const page = JSON.parse(lesson.modelText)
      assert.equal(page.complete, true)
      assert.equal(JSON.parse(page.text).uncertainty, 'Partial evidence only')
      assert.ok(page.text.includes('中文🙂'))
      assert.deepEqual(f.retained, [])
    } finally { await f.close() }
  })
  await t.test('oversized status preserves complete artifacts and bounded model-visible discovery', async t => {
    const f = await renderStatus(true)
    try {
      assert.deepEqual(f.canonical, f.original)
      assert.equal(f.rendered, canonicalJson(f.original.scientific_delivery))
      assert.equal(f.modelText, f.preview)
      assert.deepEqual(f.retained, [], 'Complete status is explicitly retained, so discovery needs no native spill')
      const retained = JSON.parse(Buffer.from(await f.artifacts.read(f.original.scientific_delivery!.full_status)).toString())
      const { scientific_delivery: _delivery, ...full } = f.original
      assert.deepEqual(retained.status, full)
      assert.ok(retained.status.scientific_context.evidence[0].text.includes('中文🙂'))
      assert.ok(Buffer.byteLength(f.preview) <= 6000)
      assert.equal(f.ctx.toolResultPruner.pruneContent([{ type: 'text', text: f.preview }]), null)
      f.ctx.toolResultPruner.pruneSession(f.author.session)
      const fetched = await f.fetch('research_status_read', { reference: f.original.scientific_delivery!.full_status })
      assert.equal(JSON.parse(fetched.modelText).complete, false)
      assert.ok(JSON.parse(fetched.modelText).next_offset_bytes > 0)
      assert.ok(!f.preview.includes('\uFFFD'), 'Native preview must not corrupt UTF-8/surrogate boundaries')
      t.diagnostic(`${Buffer.byteLength(canonicalJson(full))} original bytes; ${Buffer.byteLength(f.preview)} discovery bytes; ${maxInlineTokens} native token budget`)
    } finally { await f.close() }
  })
  await t.test('oversized status keeps exact scientific discovery references visible to the model', async () => {
    const f = await renderStatus(true)
    try {
      // G3 acceptance assertion: preserve the correct expectation until delivery is fixed.
      const references = [f.context.evidence_index, f.context.capability_envelope, f.context.index.methodology,
        ...f.context.lessons.map(row => row.reference)]
      const missing = references.filter(reference => !f.modelText.includes(canonicalJson(reference))).map(reference => reference.uri)
      assert.deepEqual(missing, [], 'Exact scientific discovery and partial-lesson references must reach the next model request')
    } finally { await f.close() }
  })
  await t.test('real native spilling remains active for a bulk tool while status discovery stays small', async () => {
    const f = await renderStatus(true)
    try {
      const bulk = 'Actual native spill control 中文🙂\n'.repeat(8192)
      f.author.ctx.tools.register(defineTool({ name: 'fixture_bulk', description: 'Synthetic spill wiring control', parameters: {},
        output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] }, execute: async () => bulk }))
      const value = await f.fetch('fixture_bulk', {})
      assert.equal(value.value, bulk)
      assert.match(value.modelText, /Full formatted result stored at:/)
      assert.match(value.modelText, /Omitted \d+ bytes/)
      const match = value.modelText.match(/Full formatted result stored at: (.+?)\. Use read/)
      assert.ok(match)
      assert.equal(await readFile(match[1]!, 'utf8'), bulk)
      assert.ok(f.ctx.toolResultPruner.pruneContent([{ type: 'text', text: value.modelText }]))
      const pruned = f.ctx.toolResultPruner.pruneSession(f.author.session)
      assert.ok(pruned.charsRemoved > 0)
      const page = await f.fetch('research_context', { reference: f.context.lessons[0]!.reference })
      assert.equal(JSON.parse(page.modelText).complete, true)
    } finally { await f.close() }
  })
  await t.test('post-spill finalization restores discovery after real spill and pruning policies', async () => {
    const f = await renderStatus(true, true)
    try {
      assert.equal(f.retained.length, 1)
      assert.deepEqual(JSON.parse(f.retained[0]!), f.original)
      assert.equal(f.modelText, canonicalJson(f.original.scientific_delivery))
      assert.ok(f.modelText.includes(canonicalJson(f.context.evidence_index)))
      assert.ok(Buffer.byteLength(f.modelText) <= 6000)
    } finally { await f.close() }
  })
  await t.test('long partial lessons are recovered exactly through declared default pages', async () => {
    const f = await renderStatus(false, false, true)
    try {
      const reference = f.context.lessons[0]!.reference
      let offset = 0, complete = false, joined = ''
      while (!complete) {
        const fetched = await f.fetch('research_context', { reference, offset_bytes: offset })
        const page = JSON.parse(fetched.modelText)
        assert.equal(page.page.offset_bytes, offset)
        assert.equal(page.reference.sha256, reference.sha256)
        joined += page.text; complete = page.next_offset_bytes === null
        if (!complete) { assert.equal(page.complete, false); assert.ok(page.next_offset_bytes > offset); offset = page.next_offset_bytes }
      }
      assert.equal(joined, Buffer.from(await f.artifacts.read(reference)).toString('utf8'))
      assert.equal(JSON.parse(joined).uncertainty, 'Partial evidence only')
    } finally { await f.close() }
  })
})
