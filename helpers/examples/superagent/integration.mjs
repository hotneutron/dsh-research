import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { Context } from '@deepseek-ai/cordis'
import { Engine, MemoryRepositories, Config, waitsForPerson } from 'dsh-superagent'
import { createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import SessionQuery from '@deepseek-ai/dsh-session-query'
import JsonlPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import Subagents, { NO_START_CAPABILITIES } from '@deepseek-ai/dsh-subagent'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { SqliteStorageBackend } from '@deepseek-ai/dsh-storage-sqlite'
import { canonicalJson, sha256 } from 'dsh-research'
import { researchDomain, AUTHOR_INSTRUCTIONS } from 'dsh-research/native'
import { createCpuFixture, text, tool } from '../synthetic-cpu/fixture.mjs'
import { setImmediate } from 'node:timers/promises'
import { randomUUID } from 'node:crypto'

const output = process.argv[2]
if (!output) throw new Error('Fresh qualification output required')
const cases = [], domainEvents = [], launches = [], deliveries = [], stops = [], messages = new Map()
const f = await createCpuFixture(join(output, 'project'))
let closed = false
const repos = new MemoryRepositories()
let retainedState = null
let version = 'integration-r1', paused = false
const policy = { get version() { return version }, get paused() { return paused }, evalTimeoutMs: 2000,
  gate: trigger => trigger.actor.id === 'fixture-owner' && trigger.human
    ? { admissible: true, strength: 'explicit', basis: { via: 'listed', sender: 'fixture-owner', source: 'fixture', scope: { project_root: f.root } } }
    : { admissible: false, reason: 'sender_not_allowed' }, revalidate: mandate => mandate.actor.id === 'fixture-owner', admitsInferred: () => false }
const candidates = []
const engine = new Engine({ repo: repos, policy: () => policy,
  scope: { scope: input => input.source === 'fixture' && input.meta.project_root === f.root ? { listened: true, observed: false } : { listened: false, reason: 'source_outside_profile' } },
  assessor: { request: candidate => candidates.push(candidate), release() {} },
  executor: { start: (ticket, assignment) => launches.push({ ticket, assignment }), deliver: (ticket, assignment) => deliveries.push({ ticket, assignment }),
    stop: (ticket, assignment, reason) => stops.push({ ticket: ticket.id, assignment: assignment.id, reason }) },
  outbox: { send: message => { if (!messages.has(message.id)) messages.set(message.id, message) }, status: id => messages.has(id) ? 'pending' : undefined,
    withdraw: id => messages.delete(id) }, emit: event => domainEvents.push(event) })
const trigger = (id, textValue, extra = {}) => ({ id, source: 'fixture', threads: [{ source: 'fixture', id: 'request-thread' }],
  actor: { source: 'fixture', id: 'fixture-owner' }, human: true, addressed: 'direct', at: new Date().toISOString(), text: textValue,
  channel: { source: 'fixture', thread: 'request-thread', address: { request_id: id } }, meta: { project_root: f.root }, ...extra })
try {
  const subject = await f.prepare('negative')
  const source = trigger('source-request', subject.manifest.original_prompt, { meta: { project_root: f.root, manifest: subject.manifestRef } })
  assert.equal(engine.receive(source), 'stored')
  assert.equal(engine.receive(source), 'duplicate')
  assert.equal(engine.receive(trigger('filtered', 'Outside profile', { source: 'unconfigured' })), 'filtered')
  engine.evaluateDue()
  const candidate = candidates.at(-1)
  engine.candidateDelivered(candidate.evalId)
  const decision = engine.decide(source.id, { kind: 'accept', evalId: candidate.evalId, title: 'Bounded research qualification',
    scope: canonicalJson({ manifest: subject.manifestRef, project_root: f.root }), reason: 'Standing fixture authority; original request and frozen manifest' })
  assert.ok(decision.ticketId)
  const queued = launches.shift()
  assert.equal(queued.ticket.id, decision.ticketId)
  assert.deepEqual(JSON.parse(queued.ticket.mandate.scope).manifest, subject.manifestRef)
  engine.assignmentStarted(queued.ticket.id, queued.assignment.id)
  for (const inputId of repos.tickets.get(queued.ticket.id).undelivered) engine.inputsDelivered(queued.ticket.id, queued.assignment.id, [inputId])
  f.authorLLM.script.push(tool('ticket-research-run', subject.request))
  f.authorLLM.script.push(text('Valid negative evidence captured; continuing within standing policy.'))
  const packet = { ticket_id: queued.ticket.id, assignment_id: queued.assignment.id, source_id: source.id,
    original_request: source.text, manifest: JSON.parse(queued.ticket.mandate.scope).manifest }
  f.author.followup(createUserMessage({ content: [{ type: 'text', text: canonicalJson(packet) }], source: { kind: 'user' } }))
  await f.author.whenIdle()
  const association = f.table.get(f.config.projectKey).actions[subject.manifest.action_id]
  assert.equal(association.phase, 'settled')
  const events = f.author.session.snapshotEvents()
  assert.ok(events.some(e => e.type === 'user/message' && canonicalJson(e).includes(subject.manifestRef.sha256) && canonicalJson(e).includes(source.text)))
  const ticket = repos.tickets.get(queued.ticket.id)
  engine.inputsRead(ticket.id, ticket.inputs.filter(i => i.kind === 'trigger').map(i => i.id))
  engine.report(ticket.id, { state: 'progress', summary: 'Valid negative evidence; prepare diagnosis/continuation', question: null })
  engine.turnEnded(ticket.id, queued.assignment.id)
  assert.equal(waitsForPerson(repos.tickets.get(ticket.id)), false)
  cases.push({ route: 'S1', id: 'source-ticket-manifest-native-worker', status: 'passed', ticket_id: ticket.id, session_id: f.author.id,
    source_ref: await f.json('snapshots/original-source.json', source), manifest: subject.manifestRef })

  const ack = { purpose: 'acknowledgement', ticketId: ticket.id, triggerId: source.id, text: 'Bounded request received' }
  engine.reply(ack); engine.reply(ack)
  assert.equal(messages.size, 1)
  assert.equal([...messages.values()][0].channel.source, 'fixture')
  const before = candidates.length
  engine.receive(trigger('guest', 'Unauthorized', { actor: { source: 'fixture', id: 'guest' }, threads: [{ source: 'fixture', id: 'guest-thread' }] }))
  engine.evaluateDue(); assert.equal(candidates.length, before)
  cases.push({ route: 'S2', id: 'allowlisted-source-duplicate-idempotent-outbox', status: 'passed', external_delivery: 'disabled', messages_queued: messages.size })

  const schema = Config({ stateDir: join(f.root, '.autoresearch/dsh/superagent') })
  assert.equal(schema.stateDir, join(f.root, '.autoresearch/dsh/superagent'))
  if (!f.ctx.get('systemPrompt')) await f.ctx.plugin(SystemPrompt)
  const base = f.ctx.systemPrompt.section({ name: 'qualification-host-base', order: -1000, text: 'HOST BASE AND ORIGINAL SOURCE RULES' })
  const added = f.ctx.systemPrompt.section({ name: 'qualification-research-delta', order: 1000, text: AUTHOR_INSTRUCTIONS })
  const assembled = await f.ctx.systemPrompt.assemble()
  assert.ok(assembled.sections.some(s => s.name === 'qualification-host-base'))
  assert.ok(assembled.sections.some(s => s.name === 'qualification-research-delta'))
  const promptRef = await f.json('snapshots/effective-prompt.json', { sections: assembled.sections.map(section => ({ name: section.name, text: section.text, interpolate: section.interpolate ?? true })), scope: 'public resolved prompt section DTO; optional undefined assembly fields are not serialized' })
  added(); base()

  paused = true; engine.policyChanged(version, version)
  engine.receive(trigger('paused', 'Wait within paused policy', { threads: [{ source: 'fixture', id: 'paused-thread' }] }))
  const count = candidates.length; engine.evaluateDue(); assert.equal(candidates.length, count)
  paused = false; engine.evaluateDue(); const stale = candidates.at(-1)
  const old = version; version = 'integration-r2'; engine.policyChanged(old, version)
  assert.throws(() => engine.decide('paused', { kind: 'accept', evalId: stale.evalId, title: 'Stale acceptance', scope: 'old', reason: 'must refuse' }), /has finished|Policy/)
  engine.stopTicket(ticket.id, 'Explicit fixture stop')
  assert.equal(repos.tickets.get(ticket.id).ended.by, 'human')
  assert.ok(stops.length > 0)
  cases.push({ route: 'S8', id: 'public-config-prompt-delta-pause-policy-revision-stop', status: 'passed', prompt: promptRef, state_dir: schema.stateDir })

  const raceA = await f.prepare('positive'), raceB = await f.prepare('positive')
  const used = f.table.get(f.config.projectKey).consumed_attempts
  const race = await Promise.allSettled([f.adapter.run(raceA.request, f.author, new AbortController().signal), f.adapter.run(raceB.request, f.author, new AbortController().signal)])
  assert.equal(race.filter(r => r.status === 'fulfilled').length, 1)
  assert.equal(f.table.get(f.config.projectKey).consumed_attempts, used + 1)
  cases.push({ route: 'S5', id: 'serialized-one-author-overlap-refusal-canonical-cwd', status: 'passed', outcomes: race.map(r => r.status), cwd: f.root })
  const timeout = await f.prepare('timeout-zero')
  const timed = await f.adapter.run(timeout.request, f.author, new AbortController().signal)
  const evidence = (await f.collected(timed)).evidence
  assert.equal(evidence.terminal.timeout, true); assert.equal(evidence.scientific_status, 'ineligible')
  cases.push({ route: 'S4', id: 'actual-native-job-evidence-completion-expiry-invalidity', status: 'passed', evidence: timed.evidence })
  const attemptCount = f.table.get(f.config.projectKey).consumed_attempts
  const denied = await f.ctx.tools.execute({ name: 'research_run', arguments: subject.request, agent: f.reviewer,
    callId: ToolCallId('reviewer-launch-refusal'), signal: new AbortController().signal })
  assert.ok(denied.error)
  assert.equal(f.table.get(f.config.projectKey).consumed_attempts, attemptCount)
  let entered, releaseChild
  const enteredPromise = new Promise(resolve => { entered = resolve })
  f.reviewerLLM.script.push(async options => {
    entered()
    await new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('Observed native review cancellation')), { once: true }))
  })
  f.reviewer.followup(createUserMessage({ content: [{ type: 'text', text: 'Bounded cancellation drill; no review approval' }], source: { kind: 'user' } }))
  await enteredPromise
  f.reviewer.cancel({ kind: 'user' }, { keepInbox: false })
  await f.reviewer.whenIdle()
  assert.notEqual(f.reviewer.session.snapshotEvents().findLast(e => e.type === 'turn/end').data.reason.kind, 'completed')
  class ReadOnlyQuery extends SessionQuery {
    async searchSessions() { throw new Error('Full-text query is outside this qualification scope') }
    async searchEvents() { throw new Error('Full-text query is outside this qualification scope') }
  }
  await f.ctx.plugin(ReadOnlyQuery)
  await f.ctx.plugin(Subagents, { maxDepth: 1, maxActiveSubagents: 1 })
  f.ctx.subagents.registerProvider({ name: 'm1-public-child', capabilities: { ...NO_START_CAPABILITIES, depthLimit: true, toolFilter: true },
    inheritsParentContext: false, prepareContinuable: async () => ({}) })
  const gate = new Promise(resolve => { releaseChild = resolve })
  f.authorLLM.script.push(async () => { await gate; return text('Bounded child completed') })
  const start = () => f.ctx.subagents.startActivation({ provider: 'm1-public-child', label: 'Pinned alpha child API', delivery: 'caller', signal: AbortSignal.timeout(2000),
    request: { parent: f.author, prompt: [{ type: 'text', text: 'No tools; child lifecycle qualification only' }], maxDepth: 1, toolFilter: { allow: [] } } })
  const first = await start()
  let joined = false
  const waiting = f.ctx.subagents.waitForChildren(f.author).then(value => { joined = true; return value })
  await setImmediate(); assert.equal(joined, false)
  releaseChild(); assert.equal(await waiting, true)
  assert.equal((await first.result).stopReason, 'completed')
  assert.ok((await f.ctx.subagents.listChildren(f.author.id)).some(child => child.id === first.childId))
  await f.ctx.subagents.drainChildren(f.author, [first.childId])
  f.authorLLM.script.push(text('Second child proves parent admission remains open'))
  const second = await start(); assert.equal((await second.result).stopReason, 'completed')
  await f.ctx.subagents.drainChildren(f.author, [second.childId])
  cases.push({ route: 'S7', id: 'native-review-cancel-launch-refusal-child-wait-list-selected-drain', status: 'passed',
    reviewer_session: f.reviewer.id, child_ids: [first.childId, second.childId], scientific_review: 'not qualified by scripted answers' })
  const unknown = await f.prepare('unknown-launch')
  const held = await f.adapter.run(unknown.request, f.author, new AbortController().signal)
  assert.equal(held.status, 'unknown')
  assert.equal((await f.adapter.run(unknown.request, f.author, new AbortController().signal)).replay, true)
  const state = structuredClone(f.table.get(f.config.projectKey)), retainedEvents = f.author.session.snapshotEvents()
  retainedState = state
  await f.json('snapshots/ticket-domain-records.json', { ticket: repos.tickets.get(ticket.id), events: domainEvents, source })
  await f.close(); closed = true
  const ctx = new Context(); await ctx.plugin(Storage); await ctx.plugin(JsonlPersistence, { root: join(f.root, '.autoresearch/dsh/sessions'), compression: 'none' })
  const backend = new SqliteStorageBackend({ path: join(f.root, '.autoresearch/dsh/state.sqlite3'), journalMode: 'wal' }); ctx.storage.backend.register('sqlite', backend)
  let domain
  try {
    domain = await new DomainFacility(ctx, { backend: 'sqlite' }).open(researchDomain)
    assert.deepEqual(domain.table('projects').get(f.config.projectKey), state)
    const handle = await ctx.sessionPersistence.open(SessionId(f.author.id), 'read')
    try { const loaded = await handle.read(); assert.equal(canonicalJson(loaded.events.slice(0, retainedEvents.length)), canonicalJson(retainedEvents)) }
    finally { await handle.close() }
    cases.push({ route: 'S6', id: 'native-record-session-reopen-preserves-unknown-charge', status: 'passed', consumed_attempts: state.consumed_attempts,
      reserved_timeout_ms: state.reserved_timeout_ms, ticket_repository: 'Public ephemeral core fixture; production prototype store remains a separate deployment gate' })
  } finally { await domain?.close(); await backend.close(); await ctx.fiber.dispose() }
  const review = JSON.parse(Buffer.from(await f.artifacts.read(subject.request.review)).toString())
  assert.notEqual(review.reviewer.session_id, f.author.id)
  cases.push({ route: 'S7', id: 'separate-native-reviewer-exact-subject', status: 'passed', reviewer_session: review.reviewer.session_id, assurance: 'scripted fixture' })

  const service = join(output, 'service-check/scripts/dsh-superagent'), profile = 'm1-qualification-' + randomUUID()
  execFileSync('python3', [service, 'stop', '--profile', profile, '--url', 'http://127.0.0.1:0', '--stop-timeout', '0.1'], { encoding: 'utf8' })
  const result = execFileSync('python3', [service, 'restart', '--profile', profile, '--respect-stop', '--url', 'http://127.0.0.1:0'], { encoding: 'utf8' })
  assert.match(result, /automatic recovery skipped/)
  cases.push({ route: 'S3', id: 'unchanged-service-script-intentional-stop-respected', status: 'passed', profile, production_service: 'not installed', external_schedule: 'disabled' })

  await writeFile(join(output, 'receipt.json'), JSON.stringify({ schema_version: 1, timestamp: new Date().toISOString(), scope: 'S1-S8 public superagent Engine ports plus native DSH integration',
    cases, state, domain_events: domainEvents, source_trigger: source, original_request: source.text, binding: f.binding,
    external_messages: 0, external_model_calls: 0, actual_evaluator_dispatches: 3, uncertain_dispatch_reservations: 1,
    limits: { max_dispatches: 24, per_dispatch_timeout_ms: 2000 },
    limitations: ['MemoryRepositories is an explicit public ephemeral core fixture; persistent default prototype Ticket store/DshExecutor not qualified by it',
      'Cloud source accounts and real outbound delivery remain disabled', 'Respect-stop script is verified on a disposable profile; production service/watchdog installation remains before M5',
      'Scientific/structural independent review and full M4/M5 acceptance remain separate; scripted outputs do not certify them'] }, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ receipt: join(output, 'receipt.json'), routes: cases.map(c => c.route).sort(), status: 'passed', scope: 'public core ports/native fixture' }))
} catch (error) {
  await writeFile(join(output, 'failure.json'), JSON.stringify({ error: String(error), state: closed ? retainedState : f.table.get(f.config.projectKey), cases, domainEvents }, null, 2) + '\n', { flag: 'wx' })
  throw error
} finally { if (!closed) await f.close() }
