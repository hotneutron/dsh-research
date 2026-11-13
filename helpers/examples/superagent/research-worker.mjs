// Disposable default-worker qualification; no scientific project authority is initialized here.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import * as FilesystemSkills from '@deepseek-ai/dsh-skill-filesystem'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { SqliteStorageBackend } from '@deepseek-ai/dsh-storage-sqlite'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { canonicalJson, ProjectArtifacts } from 'dsh-research'
import { NativeResearchAdapter, researchDomain } from 'dsh-research/native'
import { createCpuFixture, ScriptedAdapter } from '../synthetic-cpu/fixture.mjs'
import { installAutomatic } from './automatic-worker.mjs'
import { defaultCoverage } from './default-coverage.mjs'
import { faultTable, installFault, instrumentProtectedReads } from './fault-worker.mjs'

export async function assertDefaultTicketAuthority(owner, author, readTicket, expectedMandate, readPause) {
  assert.equal(owner, author)
  const paused = await readPause()
  // Read the native Ticket after the last asynchronous operation; a stopped Ticket cannot use an earlier snapshot.
  const ticket = readTicket()
  assert.ok(ticket && !ticket.ended, 'Current Ticket must remain open')
  assert.equal(canonicalJson(ticket.mandate), expectedMandate, 'Current Ticket mandate must match the bound authority')
  assert.equal(paused, false, 'Operator pause prevents new research admission/dispatch')
}

export async function install(ctx, audit) {
  const root = process.env.DSH_RESEARCH_DISPOSABLE_QUALIFICATION
  const registration = join(root, 'research-worker.json')
  const automaticMode = process.env.DSH_RESEARCH_AUTOMATIC_QUALIFICATION === '1'
  const faultKind = process.env.DSH_RESEARCH_FAULT_QUALIFICATION || null
  const faultControl = { entered: false, release: null, protectedReads: [] }
  let fault
  const authorTools = ['research_run', 'orchestrator_report', 'skill', ...(automaticMode ? ['research_propose', 'research_review', 'research_feedback'] : [])]
  let automatic
  let coverage
  let fixture, pending, packet, author, ticketId, mandate, phase = 0, backend, domain, removeBackend, unregister
  const checks = [], trace = []
  const observe = (event, detail) => trace.push({ event, detail })
  const source = () => ctx.orchestrator.context({ kind: 'github', health: ['github'] })
  const authority = async owner => {
    await assertDefaultTicketAuthority(owner, author, () => source().tickets.get(ticketId), mandate, async () => {
      const response = await fetch(`http://127.0.0.1:${ctx.webServer.port}/orchestrator/api/state`, { headers: { 'x-orchestrator-request': '1' }, signal: AbortSignal.timeout(2000) })
      assert.ok(response.ok)
      return (await response.json()).paused
    })
  }
  const installFor = async agent => {
    if (!agent.id.startsWith('worker-')) return
    if (author && author !== agent) throw new Error('This frozen qualification has one benchmark author')
    author = agent; ticketId = agent.id.slice('worker-'.length)
    const ticket = source().tickets.get(ticketId)
    if (!ticket) throw new Error('Registered default worker requires its native Ticket')
    mandate = canonicalJson(ticket.mandate)
    let scopedShell, scopedSkills
    const capabilities = author.ctx.inject(['shell', 'skills'], scope => { scopedShell = scope.shell; scopedSkills = scope.skills })
    await capabilities
    let retained
    try { retained = JSON.parse(await readFile(registration, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
    const shell = new Proxy(scopedShell, { get(target, key) {
      if (key === 'execute') return spec => {
        if (spec.command.includes("'unknown-launch'")) throw new Error('Controlled native publication uncertainty; no terminal acknowledgement')
        return target.execute(spec)
      }
      const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value
    } })
    if (!retained) {
      fixture = await createCpuFixture(root, { context: ctx, author, authorLLM: new ScriptedAdapter(),
        authorTools, registration: { toolScope: 'author', inheritedTools: ['skill'] },
        ...(automaticMode ? { automaticReview: true, nativeReview: { provider: 'spawn' }, deadlineMs: 1000, maxAttempts: 5, maxReviews: 6, maxTotalTimeoutMs: 10000 } : {}),
        ...(faultKind ? { maxAttempts: 1, maxReviews: 2, maxTotalTimeoutMs: 16000,
          executionSandbox: { mode: ['tree-deadline', 'running-loss'].includes(faultKind) ? 'workspace-write' : 'read-only',
            workspaceRoot: ticket.execution.directory, sessionId: author.id },
          executionSandboxResolver: () => ctx.sandboxPolicy.resolve({ session: author.session, mode: ['tree-deadline', 'running-loss'].includes(faultKind) ? 'workspace-write' : 'read-only' }),
          actionTimeoutMs: faultKind === 'running-loss' ? 8000 : faultKind === 'tree-deadline' ? 1500 : 2000,
          reviewTimeout: faultKind === 'review-timeout' ? 250 : 2000,
          ...(faultKind === 'review-unavailable' ? { reviewProvider: 'unavailable-qualified-route' } : {}),
          evaluatorPath: fileURLToPath(new URL('./fault-evaluate.mjs', import.meta.url)), allowedOperations: ['positive'],
          inputMetadata: { qualification_case: faultKind, project_root: root, process_marker: join(ticket.execution.directory, 'fault-process.json') } } : {}),
        executionShell: shell, assertActiveAuthority: authority, originalPrompt: source().triggers.get(ticket.origin.triggerId).text })
      const original = source().triggers.get(ticket.origin.triggerId)
      const originalRef = await fixture.json('snapshots/original-source.json', original)
      packet = automaticMode ? { request: { mode: 'automatic' } } : await fixture.prepare('negative')
      const context = await fixture.json('snapshots/default-ticket-binding.json', { ticket_id: ticketId, mandate: ticket.mandate, original_source: originalRef, manifest: packet.manifestRef ?? null })
      await writeFile(registration, JSON.stringify({ author: author.id, ticket_id: ticketId, mandate, policy: fixture.policyRef,
        verifier: fixture.policy.verifier, binding: fixture.binding, packet, context,
        ...(faultKind ? { process_marker: join(ticket.execution.directory, 'fault-process.json') } : {}) }, null, 2) + '\n', { flag: 'wx' })
      fixture.config.observe = observe
      if (faultKind) {
        fixture.config.table = faultTable(fixture.table, faultKind, faultControl, false)
        fixture.config.artifacts = instrumentProtectedReads(fixture.artifacts, faultControl.protectedReads)
      }
      // Reopen the adapter with diagnostics bound before any actual research call.
      fixture.unregister?.()
      fixture.adapter = await NativeResearchAdapter.open(ctx, fixture.config)
      fixture.unregister = fixture.adapter.register({ toolScope: 'author', inheritedTools: ['skill'] })
    } else {
      assert.equal(retained.author, author.id); assert.equal(retained.ticket_id, ticketId); assert.equal(retained.mandate, mandate)
      const artifacts = await ProjectArtifacts.open(root)
      backend = new SqliteStorageBackend({ path: join(root, '.autoresearch/dsh/state.sqlite3'), journalMode: 'wal' })
      removeBackend = ctx.storage.backend.register('sqlite', backend)
      domain = await new DomainFacility(ctx, { backend: 'sqlite' }).open(researchDomain)
      const table = domain.table('projects'), stored = table.get('synthetic-m2')
      assert.ok(stored, 'Retained registration cannot recreate a missing authority')
      const verify = (await import(pathToFileURL(join(root, retained.verifier.uri)).href)).verify
      const config = { artifacts, table, projectKey: 'synthetic-m2', policy: retained.policy, authorSessionId: author.id,
        authorTools, executionShell: shell, assertActiveAuthority: authority,
        verifier: { identity: retained.verifier, verify }, observe }
      if (faultKind) {
        config.table = faultTable(table, faultKind, faultControl, true)
        config.artifacts = instrumentProtectedReads(artifacts, faultControl.protectedReads)
        config.executionSandbox = { profile: retained.binding.profile.effective, resolve: () => ctx.sandboxPolicy.resolve({ session: author.session, mode: ['tree-deadline', 'running-loss'].includes(faultKind) ? 'workspace-write' : 'read-only' }) }
      }
      const adapter = await NativeResearchAdapter.open(ctx, config)
      unregister = adapter.register({ toolScope: 'author', inheritedTools: ['skill'] })
      fixture = { root, artifacts, table, adapter, config, binding: retained.binding, json: (uri, value) => artifacts.write(uri, Buffer.from(canonicalJson(value))) }
      packet = retained.packet
      await ctx.plugin(FilesystemSkills, { includeDefaultRoots: false,
        customSkillDirs: [fileURLToPath(new URL('../../dist/skills', import.meta.url))], watch: false })
      // The reviewer can remain unloaded: the adapter verifies retained native Session bytes through the public query.
    }
    if (automaticMode) {
      coverage = await defaultCoverage(fixture)
      if (faultKind) fault = await installFault(fixture, ctx, author, faultKind, faultControl, observe, coverage, Boolean(retained))
      else automatic = await installAutomatic(fixture, ctx, author, observe, Boolean(retained))
    }
    const skill = await scopedSkills.get('research', { cwd: root })
    assert.ok(skill?.content.includes('research_run'))
    author.ctx.systemPrompt.section({ name: 'default-guarded-research', order: 10000, interpolate: false,
      text: `Frozen research skill ${skill.path}\n${skill.content}\nExact request ${canonicalJson(packet.request)}` })
    checks.push({ id: 'default-worker-local-tool-and-skill', author: author.id, skill: skill.path,
      research_visible: Boolean(ctx.tools.get('research_run', author)), bash_visible: Boolean(ctx.tools.get('bash', author)) })
    assert.ok(ctx.tools.get('research_run', author)); assert.equal(ctx.tools.get('bash', author), undefined)
  }
  ctx.on('agent/created', ({ agent }) => {
    if (!agent.id.startsWith('worker-')) return
    pending = installFor(agent); return pending
  })
  ctx.effect(() => async () => {
    await pending?.catch(() => {})
    if (author) { author.cancel({ kind: 'user' }, { keepInbox: true }); await author.whenIdle() }
    fixture?.unregister?.(); unregister?.()
    automatic?.close()
    fault?.close()
    await (fixture?.domain ?? domain)?.close()
    await (fixture?.backend ?? backend)?.close()
    fixture?.removeBackend?.(); removeBackend?.()
  })
  const execute = (name, args, agent = author) => ctx.tools.execute({ name, arguments: args, agent,
    callId: ToolCallId(`qualification-${checks.length}-${phase}`), signal: AbortSignal.timeout(10000) })
  return {
    async step(messages) {
      await pending
      if (!packet || !JSON.stringify(messages).includes('EXACT_RESEARCH_PACKET')) return null
      if (fault) {
        const next = await fault.step(messages)
        packet = fault.packet()
        if (next?.name === 'orchestrator_report') audit.reported = true
        return next
      }
      if (automaticMode) {
        const next = await automatic.step(messages)
        packet = automatic.packet()
        if (next?.name === 'orchestrator_report') audit.reported = true
        return next
      }
      if (phase++ === 0) return { name: 'research_run', args: packet.request }
      const action = fixture.table.get('synthetic-m2').actions[packet.manifest.action_id]
      if (!action || action.phase !== 'settled') throw new Error('A native research report requires the actual settled action')
      audit.reported = true
      if (phase === 2) return { name: 'orchestrator_report', args: { state: 'progress', human_action: null,
        summary: `Settled guarded research action ${action.action_id}; evidence ${canonicalJson(action.evidence)}` } }
      return null
    },
    async packet() { await pending; return fault?.packet() ?? automatic?.packet() ?? packet },
    async snapshot() {
      if (!author) {
        const ticket = source().tickets.open()[0]
        if (ticket) await ctx.sessionController.resolveAgent(SessionId(`worker-${ticket.id}`))
      }
      await pending
      packet = fault?.packet() ?? automatic?.packet() ?? packet
      const liveReviewer = ctx.agents.get(SessionId('m2-reviewer'))
      let reviewerEvents = liveReviewer?.session.snapshotEvents() ?? null
      if (!reviewerEvents && automaticMode && Object.values(fixture?.table.get('synthetic-m2')?.review_requests ?? {}).some(r => r.completion || r.native_message_id)) {
        const cut = await ctx.sessionQuery.observeSession(SessionId('m2-reviewer'), { projectionMode: 'none' })
        try { reviewerEvents = cut.events } finally { cut[Symbol.dispose]() }
      }
      return { ready: Boolean(packet), author: author?.id, packet, state: fixture?.table.get('synthetic-m2'), checks, trace,
        reviewer_events: reviewerEvents,
        fault: fault ? await fault.inspect() : null,
        native_review_provider: automaticMode ? { name: 'spawn', capabilities: ctx.subagents.getProvider('spawn')?.capabilities } : null }
    },
    async fault(operation) { await pending; assert.ok(fault); return fault.drill(operation) },
    async drill(kind) {
      await pending
      const count = fixture.table.get('synthetic-m2').consumed_attempts
      packet = automatic?.packet() ?? packet
      if (kind === 'automatic') {
        assert.ok(automaticMode)
        const facts = await automatic.drill()
        checks.push({ id: 'default-automatic-planning-review-feedback-publication', ...facts })
        const state = fixture.table.get('synthetic-m2')
        const reviewerEvents = facts.reviewer_events
        assert.ok(reviewerEvents.length && !reviewerEvents.some(e => e.type === 'tool/call'))
        const bindings = {
          'AUTH-1:native-separate-review': { distinct_reviewer: author.id !== 'm2-reviewer', completed_exact_reviews: Object.values(state.review_requests).every(r => r.completion && r.receipt && r.native_message_id), reviewer_has_no_tools: true },
          'LOOP-1:native-changed-successor': { request_changes_then_new_subject: true, negative_then_reviewed_successor: true, human_action_null: facts.human_action_null },
          'FB-1:native-edit-capture': { two_source_versions: Object.keys(state.feedback.items).length === 2, durable_cursor_and_dispositions: state.feedback.cursors['fixture-comments'].cursor === 'done' },
          'FB-2:native-actual-effect': { changed_frozen_action: true, settled_evidence_link: true },
          'FB-3:publication-retry': { outage_no_research_hold: state.hold === null, same_scientific_charge: state.consumed_attempts === 2 },
        }
        for (const [id, assertions] of Object.entries(bindings)) await coverage.record(id, assertions, { ...facts, state })
      } else if (kind === 'validity') {
        assert.ok(automaticMode)
        for (const mode of ['timeout-zero', 'invalid-output']) {
          const p = await automatic.prepare(mode)
          const result = await execute('research_run', p.request)
          assert.ok(!result.error, canonicalJson(result)); assert.equal(result.value.status, 'settled')
          const evidence = JSON.parse(Buffer.from(await fixture.artifacts.read(result.value.evidence)).toString())
          assert.equal(evidence.evidence_status, 'invalid'); assert.equal(evidence.scientific_status, 'ineligible')
          if (mode === 'timeout-zero') { assert.equal(evidence.terminal.timeout, true); assert.ok(evidence.terminal.exit_code === 0 || evidence.terminal.signal !== null) }
          assert.equal(ctx.jobs.list(author.id).filter(job => job.status === 'running').length, 0)
          checks.push({ id: `default-native-${mode}-ineligible`, evidence: result.value.evidence, terminal: evidence.terminal })
          await coverage.record(mode === 'timeout-zero' ? 'EXEC-1:native-deadline' : 'PROV-3:native-malformed-output',
            mode === 'timeout-zero' ? { terminal_timeout: evidence.terminal.timeout, terminal_stopped: evidence.terminal.exit_code === 0 || evidence.terminal.signal !== null, ineligible: true, no_running_job: true }
              : { bool_score_refused: true, ineligible: true }, { result: result.value, evidence })
        }
      } else if (kind === 'refusals') {
        let bypass = 0
        const remove = author.ctx.tools.register(defineTool({ name: 'bash', description: 'Must be refused even as a local tool', parameters: {},
          output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] }, execute: async () => { bypass++; return 'violation' } }))
        try { assert.ok((await execute('bash', {})).error); assert.equal(bypass, 0) } finally { remove() }
        const reviewer = ctx.agents.get(SessionId('m2-reviewer')) ?? await ctx.sessionController.resolveAgent(SessionId('m2-reviewer'))
        assert.ok(reviewer); assert.ok((await execute('research_run', packet.request, reviewer)).error)
        assert.ok((await execute('research_run', { ...packet.request, argv: ['substitute'] })).error)
        assert.equal(fixture.table.get('synthetic-m2').consumed_attempts, count)
        checks.push({ id: 'default-author-bypass-reviewer-and-argv-refusal', count })
      } else if (kind === 'replay') {
        const result = await execute('research_run', packet.request)
        assert.ok(!result.error, canonicalJson(result)); assert.equal(result.value.replay, true)
        assert.equal(fixture.table.get('synthetic-m2').consumed_attempts, count)
        checks.push({ id: 'same-action-replay-no-charge', count })
        if (coverage) {
          const exists = await coverage.audit()
          if (!exists.covered.includes('AUTH-4:native-replay')) await coverage.record('AUTH-4:native-replay', { same_action_no_new_charge: true }, { result: result.value, count })
        }
      } else if (kind === 'unknown') {
        const uncertain = await (automaticMode ? automatic.prepare('unknown-launch') : fixture.prepare('unknown-launch'))
        const result = await execute('research_run', uncertain.request)
        assert.ok(!result.error, canonicalJson(result)); assert.equal(result.value.status, 'unknown')
        const state = fixture.table.get('synthetic-m2')
        assert.equal(state.consumed_attempts, count + 1)
        assert.equal(state.reserved_timeout_ms, uncertain.manifest.bounds.timeout_ms)
        const repeated = await execute('research_run', uncertain.request)
        assert.ok(!repeated.error); assert.equal(repeated.value.replay, true)
        assert.equal(fixture.table.get('synthetic-m2').consumed_attempts, count + 1)
        checks.push({ id: 'default-worker-unknown-launch-retains-reservation', action: uncertain.manifest.action_id })
        if (coverage) await coverage.record('EXEC-3:native-unknown', { hold_preserves_reservation: true, replay_no_new_charge: true }, { state, result: result.value, repeated: repeated.value })
      } else if (kind === 'stop') {
        assert.ok((await execute('research_run', packet.request)).error)
        assert.equal(fixture.table.get('synthetic-m2').consumed_attempts, count)
        checks.push({ id: 'native-Ticket-stop-retains-research-guard', count })
        if (coverage) await coverage.record('AUTH-3:native-stop', { ended_ticket_refuses_tool: true }, { ticket: source().tickets.get(ticketId), count })
      } else if (kind === 'continuity') {
        assert.ok(coverage)
        const before = JSON.parse(await readFile(join(root, 'snapshots/default-continuity.json'), 'utf8'))
        const after = fixture.table.get('synthetic-m2')
        assert.equal(canonicalJson(before), canonicalJson(after))
        await coverage.record('STATE-2:native-reopen', { identical_state: true, retained_feedback_reviews_publications: true }, { before, after })
      } else if (kind === 'continuity-snapshot') {
        assert.ok(coverage)
        await fixture.json('snapshots/default-continuity.json', fixture.table.get('synthetic-m2'))
      } else throw new Error('Unknown bounded drill')
      return { checks, state: fixture.table.get('synthetic-m2'), ...(coverage ? { coverage: await coverage.audit() } : {}) }
    },
  }
}
