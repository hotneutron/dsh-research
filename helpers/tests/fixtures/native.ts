import assert from 'node:assert/strict'
import { mkdir, realpath } from 'node:fs/promises'
import { setImmediate } from 'node:timers/promises'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { mountAgentLoopTestDependencies, mountAgentLoopTestHarness } from '@deepseek-ai/dsh-agent-loop-testkit'
import { createUserMessage, LlmAdapter } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import SessionQuery from '@deepseek-ai/dsh-session-query'
import Subagents, { NO_START_CAPABILITIES } from '@deepseek-ai/dsh-subagent'
import Storage from '@deepseek-ai/dsh-storage'
import { defineDomain, domainTable, DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { SqliteStorageBackend } from '@deepseek-ai/dsh-storage-sqlite'
import { z } from 'zod'
import { Count } from '../../src/records.js'

const stateSchema = z.strictObject({
  authority_id: z.literal('synthetic-authority'), writer_id: z.literal('fixture-writer'),
  revision: Count, consumed_attempts: Count, reserved_timeout_ms: Count,
  actions: z.array(z.strictObject({ action_id: z.string(), attempt_id: z.string(), manifest_sha256: z.string(), review_id: z.string() })),
  consumed_reviews: z.array(z.string()),
})
type State = z.infer<typeof stateSchema>
const spec = defineDomain({ name: 'dsh_research_fixture', version: 1, tables: { authority: domainTable<string, State>(stateSchema) } })

// Catalog observation uses the public read implementation. Full-text search is outside this fixture.
class ReadOnlyFixtureQuery extends SessionQuery {
  override async searchSessions(): Promise<never> { throw new Error('Full-text search is not qualified by the M1 fixture') }
  override async searchEvents(): Promise<never> { throw new Error('Full-text search is not qualified by the M1 fixture') }
}

/** Native public storage consumer; no evaluator or production launcher is called. */
export async function storageFixture(root: string, manifestSha256: string) {
  const database = join(root, '.autoresearch/dsh/state.sqlite3')
  const trace: object[] = []
  async function open() {
    const ctx = new Context()
    await ctx.plugin(Storage)
    const backend = new SqliteStorageBackend({ path: database, journalMode: 'wal' })
    ctx.storage.backend.register('sqlite', backend)
    const facility = new DomainFacility(ctx, { backend: 'sqlite' })
    const domain = await facility.open(spec)
    ctx.on('domain/changed', change => { trace.push({ event: 'durable-change', change }) })
    return { table: domain.table('authority'), close: async () => { await domain.close(); await backend.close(); await ctx.fiber.dispose() } }
  }
  let store = await open()
  try {
    assert.equal(store.table.get('registered-project'), undefined)
    // Only this synthetic registration initializes state; adopters must resolve existing authority.
    await store.table.put('registered-project', { authority_id: 'synthetic-authority', writer_id: 'fixture-writer', revision: 0, consumed_attempts: 0, reserved_timeout_ms: 0, actions: [], consumed_reviews: [] })
    const reserve = (id: string) => store.table.update('registered-project', current => {
      if (current.actions.some(a => a.action_id === id)) return current
      if (current.consumed_attempts >= 2 || current.reserved_timeout_ms + 1000 > 2000) throw new Error('attempt or reservation limit')
      return {
        ...current, revision: current.revision + 1, consumed_attempts: current.consumed_attempts + 1,
        reserved_timeout_ms: current.reserved_timeout_ms + 1000,
        actions: [...current.actions, { action_id: id, attempt_id: `attempt-${id}`, manifest_sha256: manifestSha256, review_id: `review-${id}` }],
        consumed_reviews: [...current.consumed_reviews, `review-${id}`],
      }
    })
    const results = await Promise.allSettled([reserve('a'), reserve('a'), reserve('b'), reserve('c')])
    assert.deepEqual(results.map(r => r.status), ['fulfilled', 'fulfilled', 'fulfilled', 'rejected'])
    const committed = store.table.get('registered-project')!
    assert.equal(committed.consumed_attempts, 2)
    assert.equal(committed.reserved_timeout_ms, 2000)
    assert.deepEqual(committed.consumed_reviews, ['review-a', 'review-b'])
    trace.push({ event: 'acknowledgement-awaited', committed })
    await store.close()
    store = await open()
    const reopened = store.table.get('registered-project')!
    assert.deepEqual(reopened, committed)
    // This observes the durable tuple after reopen, but deliberately performs no dispatch.
    trace.push({ event: 'reopen-resolves-committed-tuple', committed: reopened, dispatched: false })
    return { database, committed, trace, cases: ['reservation-replay', 'serialized-bounds', 'reopen'], launch_qualified: false }
  } finally { await store.close() }
}

class ScriptedAdapter extends LlmAdapter {
  requests: GenerateOptions[] = []
  constructor(private readonly answers: string[], private readonly gates: Readonly<Record<string, Promise<void>>> = {}) { super() }
  override async resolveModel(provider: string, model: string) { return { provider, id: model, name: model } }
  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    const text = this.answers.shift()
    if (text === undefined) throw new Error('Script exhausted; external provider calls are forbidden')
    if (this.gates[text]) await this.gates[text]
    options.signal?.throwIfAborted()
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

/** Real AgentLoop/SubagentRuntime; generated answers are scripted CPU fixtures. */
export async function workerFixture(root: string, exactSubject: string) {
  await mkdir(root, { recursive: true })
  root = await realpath(root)
  const ctx = new Context()
  const childGate = Promise.withResolvers<void>()
  try {
    await mountAgentLoopTestDependencies(ctx, { workingDirectory: true })
    await ctx.plugin(ReadOnlyFixtureQuery, {})
    await ctx.plugin(Subagents, { maxDepth: 1, maxActiveSubagents: 1 })
    const harness = await mountAgentLoopTestHarness(ctx)
    const authorAdapter = new ScriptedAdapter(['author-read-exact-subject', 'child-one', 'child-two'], { 'child-one': childGate.promise })
    const reviewerAdapter = new ScriptedAdapter([JSON.stringify({ decision: 'approve', subject_sha256: exactSubject })])
    ctx.llm.registerAdapter(['fixture-author'], authorAdapter)
    ctx.llm.registerAdapter(['fixture-reviewer'], reviewerAdapter)
    const author = await harness.create(SessionId('m1-author'), { provider: 'fixture-author', model: 'scripted' }, { cwd: root })
    const reviewer = await harness.create(SessionId('m1-reviewer'), { provider: 'fixture-reviewer', model: 'scripted' }, { cwd: root })
    author.followup(createUserMessage({ content: [{ type: 'text', text: `synthetic M1 fixture; subject ${exactSubject}` }], source: { kind: 'user' } }))
    await author.whenIdle()
    reviewer.followup(createUserMessage({ content: [{ type: 'text', text: `review exact subject ${exactSubject}; no launch tools` }], source: { kind: 'user' } }))
    await reviewer.whenIdle()
    assert.notEqual(author.id, reviewer.id)
    assert.equal(authorAdapter.requests.length, 1)
    assert.equal(reviewerAdapter.requests.length, 1)
    const reviewMessage = reviewer.session.snapshotEvents().find(event => event.type === 'assistant/message')
    assert.ok(reviewMessage && reviewMessage.type === 'assistant/message')
    const reviewText = reviewMessage.data.message.content.filter(block => block.type === 'text').map(block => block.text).join('')
    assert.deepEqual(JSON.parse(reviewText), { decision: 'approve', subject_sha256: exactSubject })
    assert.equal(reviewer.session.snapshotEvents().filter(event => event.type === 'tool/call').length, 0)
    ctx.subagents.registerProvider({ name: 'fixture-local', capabilities: { ...NO_START_CAPABILITIES, depthLimit: true }, inheritsParentContext: false, prepareContinuable: async () => ({}) })
    const start = () => ctx.subagents.startActivation({
      provider: 'fixture-local', label: 'M1 child lifecycle', delivery: 'caller', signal: AbortSignal.timeout(5000),
      request: { parent: author, prompt: [{ type: 'text', text: 'child lifecycle fixture' }], maxDepth: 1 },
    })
    const first = await start()
    let settled = false
    const waiting = ctx.subagents.waitForChildren(author).then(value => { settled = true; return value })
    await setImmediate()
    assert.equal(settled, false, 'Wait must remain pending while the child stream is gated')
    childGate.resolve()
    const joined = await waiting
    assert.equal(joined, true)
    assert.equal((await first.result).stopReason, 'completed')
    const children = await ctx.subagents.listChildren(author.id)
    assert.ok(children.some(child => child.id === first.childId))
    await ctx.subagents.drainChildren(author, [first.childId])
    const second = await start() // Selected-child drain must leave this parent's admission open.
    assert.equal((await second.result).stopReason, 'completed')
    await ctx.subagents.drainChildren(author, [second.childId])
    return {
      author_session: author.id, reviewer_session: reviewer.id, reviewer_provider: 'fixture-reviewer',
      author_requests: authorAdapter.requests.length, reviewer_requests: reviewerAdapter.requests.length,
      external_provider_calls: 0, joined, catalog_child_ids: children.map(child => child.id),
      first_child: first.childId, second_child: second.childId,
      author_events: author.session.snapshotEvents(), reviewer_events: reviewer.session.snapshotEvents(),
      cases: ['separate-scripted-review', 'wait-for-child', 'list-direct-children', 'selected-drain-parent-remains-open'],
    }
  } finally { childGate.resolve(); await ctx.fiber.dispose() }
}
