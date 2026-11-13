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
        authorTools: ['research_run', 'orchestrator_report', 'skill'], registration: { toolScope: 'author', inheritedTools: ['skill'] },
        executionShell: shell, assertActiveAuthority: authority, originalPrompt: source().triggers.get(ticket.origin.triggerId).text })
      const original = source().triggers.get(ticket.origin.triggerId)
      const originalRef = await fixture.json('snapshots/original-source.json', original)
      packet = await fixture.prepare('negative')
      const context = await fixture.json('snapshots/default-ticket-binding.json', { ticket_id: ticketId, mandate: ticket.mandate, original_source: originalRef, manifest: packet.manifestRef })
      await writeFile(registration, JSON.stringify({ author: author.id, ticket_id: ticketId, mandate, policy: fixture.policyRef,
        verifier: fixture.policy.verifier, binding: fixture.binding, packet, context }, null, 2) + '\n', { flag: 'wx' })
      fixture.config.observe = observe
      // Reopen the adapter with diagnostics bound before any actual research call.
      fixture.unregister()
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
        authorTools: ['research_run', 'orchestrator_report', 'skill'], executionShell: shell, assertActiveAuthority: authority,
        verifier: { identity: retained.verifier, verify }, observe }
      const adapter = await NativeResearchAdapter.open(ctx, config)
      unregister = adapter.register({ toolScope: 'author', inheritedTools: ['skill'] })
      fixture = { root, artifacts, table, adapter, config, binding: retained.binding, json: (uri, value) => artifacts.write(uri, Buffer.from(canonicalJson(value))) }
      packet = retained.packet
      await ctx.plugin(FilesystemSkills, { includeDefaultRoots: false,
        customSkillDirs: [fileURLToPath(new URL('../../dist/skills', import.meta.url))], watch: false })
      // The reviewer can remain unloaded: the adapter verifies retained native Session bytes through the public query.
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
      if (phase++ === 0) return { name: 'research_run', args: packet.request }
      const action = fixture.table.get('synthetic-m2').actions[packet.manifest.action_id]
      if (!action || action.phase !== 'settled') throw new Error('A native research report requires the actual settled action')
      audit.reported = true
      if (phase === 2) return { name: 'orchestrator_report', args: { state: 'progress', human_action: null,
        summary: `Settled guarded research action ${action.action_id}; evidence ${canonicalJson(action.evidence)}` } }
      return null
    },
    async packet() { await pending; return packet },
    async snapshot() {
      if (!author) {
        const ticket = source().tickets.open()[0]
        if (ticket) await ctx.sessionController.resolveAgent(SessionId(`worker-${ticket.id}`))
      }
      await pending
      return { ready: Boolean(packet), author: author?.id, packet, state: fixture?.table.get('synthetic-m2'), checks, trace,
        reviewer_events: fixture?.reviewer?.session.snapshotEvents() ?? null }
    },
    async drill(kind) {
      await pending
      const count = fixture.table.get('synthetic-m2').consumed_attempts
      if (kind === 'refusals') {
        let bypass = 0
        const remove = author.ctx.tools.register(defineTool({ name: 'bash', description: 'Must be refused even as a local tool', parameters: {},
          output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] }, execute: async () => { bypass++; return 'violation' } }))
        try { assert.ok((await execute('bash', {})).error); assert.equal(bypass, 0) } finally { remove() }
        const reviewer = ctx.agents.get(SessionId('m2-reviewer'))
        assert.ok(reviewer); assert.ok((await execute('research_run', packet.request, reviewer)).error)
        assert.ok((await execute('research_run', { ...packet.request, argv: ['substitute'] })).error)
        assert.equal(fixture.table.get('synthetic-m2').consumed_attempts, count)
        checks.push({ id: 'default-author-bypass-reviewer-and-argv-refusal', count })
      } else if (kind === 'replay') {
        const result = await execute('research_run', packet.request)
        assert.ok(!result.error, canonicalJson(result)); assert.equal(result.value.replay, true)
        assert.equal(fixture.table.get('synthetic-m2').consumed_attempts, count)
        checks.push({ id: 'same-action-replay-no-charge', count })
      } else if (kind === 'unknown') {
        const uncertain = await fixture.prepare('unknown-launch')
        const result = await execute('research_run', uncertain.request)
        assert.ok(!result.error, canonicalJson(result)); assert.equal(result.value.status, 'unknown')
        const state = fixture.table.get('synthetic-m2')
        assert.equal(state.consumed_attempts, count + 1)
        assert.equal(state.reserved_timeout_ms, uncertain.manifest.bounds.timeout_ms)
        const repeated = await execute('research_run', uncertain.request)
        assert.ok(!repeated.error); assert.equal(repeated.value.replay, true)
        assert.equal(fixture.table.get('synthetic-m2').consumed_attempts, count + 1)
        checks.push({ id: 'default-worker-unknown-launch-retains-reservation', action: uncertain.manifest.action_id })
      } else if (kind === 'stop') {
        assert.ok((await execute('research_run', packet.request)).error)
        assert.equal(fixture.table.get('synthetic-m2').consumed_attempts, count)
        checks.push({ id: 'native-Ticket-stop-retains-research-guard', count })
      } else throw new Error('Unknown bounded drill')
      return { checks, state: fixture.table.get('synthetic-m2') }
    },
  }
}
