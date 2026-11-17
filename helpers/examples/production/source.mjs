// Reusable native Source/ordinary-worker installer. Project hooks own scientific meaning.
import assert from 'node:assert/strict'
import { readFile, realpath, mkdir } from 'node:fs/promises'
import { resolve, join, relative, dirname, basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { hostname } from 'node:os'
import { z } from 'zod'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { SqliteStorageBackend } from '@deepseek-ai/dsh-storage-sqlite'
import { NativeProductionResearch, productionResearchDomain } from 'dsh-research/native'
import { ProjectArtifacts, Version4ResearchStateSchema, canonicalJson, sha256 } from 'dsh-research'

export const name = 'dsh-production-research-source'
export const inject = ['sessions', 'llm', 'webServer', 'agents', 'agentLoop', 'storage', 'tools', 'jobs', 'sessionQuery', 'subagents', 'sandboxPolicy', 'sessionController']
const kind = { kind: 'project-research', title: { en: 'Project research', zh: '项目研究' },
  description: { en: 'Bounded research under project authority', zh: '项目权限范围内的有界研究' }, schema: z.strictObject({}), fields: [], health: [],
  scope: () => ({ listened: true, observed: true }),
  policy: { schema: z.object({ allowed: z.array(z.object({ id: z.string(), name: z.string().optional() })).default([]), bots: z.array(z.object({ id: z.string(), name: z.string().optional() })).default([]) }),
    fields: [], explicit: { en: 'Project authority event', zh: '项目权限事件' } } }

export async function apply(ctx) {
  const path = process.env.DSH_PRODUCTION_RESEARCH_CONFIG
  if (!path) throw new Error('Explicit project-owned production configuration required')
  const bytes = await readFile(path), config = JSON.parse(bytes), root = await realpath(config.project_root)
  assert.equal(process.cwd(), root); assert.equal(hostname(), config.host)
  assert.equal(ctx.webServer.host, '127.0.0.1')
  assert.match(config.project_key, /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/)
  const artifacts = await ProjectArtifacts.open(root)
  await artifacts.read(config.project_module)
  const module = await import(pathToFileURL(resolve(root, config.project_module.uri)).href)
  if (typeof module.open !== 'function') throw new Error('Pinned project module must export open()')
  let statePath = resolve(root, config.state_path)
  const rel = relative(root, statePath)
  assert.ok(rel && !rel.startsWith('..') && !rel.startsWith('/'))
  await mkdir(dirname(statePath), { recursive: true })
  statePath = join(await realpath(dirname(statePath)), basename(statePath))
  assert.ok(!(relative(root, dirname(statePath)).startsWith('..')))
  try { statePath = await realpath(statePath); assert.ok(!relative(root, statePath).startsWith('..')) }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  if (config.models?.transport === 'traex-relay') {
    const { RemoteTraexAdapter } = await import(new URL('../examples/traex-tools/remote-model.mjs', import.meta.resolve('dsh-research')))
    ctx.llm.registerAdapter([config.models.author_provider], new RemoteTraexAdapter('tools',
      ['research_propose', 'research_review', 'research_feedback', 'research_run', 'research_status', 'research_conclude', 'orchestrator_report']))
    ctx.llm.registerAdapter([config.models.reviewer_provider], new RemoteTraexAdapter('text'))
  }
  ctx.inject(['orchestrator'], async child => {
    const lockedStateDir = await realpath(config.native_state_dir)
    const actualStateDir = await realpath(child.orchestrator.machine.stateDir)
    assert.equal(actualStateDir, lockedStateDir, 'Scientific writer must use the configured canonical native runtime lock')
    assert.ok(relative(lockedStateDir, statePath) && !relative(lockedStateDir, statePath).startsWith('..'), 'Science state must stay under the existing locked native state directory')
    const assertLock = () => { child.orchestrator.lifetime.throwIfAborted() }
    assertLock()
    child.effect(() => child.orchestrator.sources.register(kind))
    const source = child.orchestrator.context(kind); await source.ready
    const backend = new SqliteStorageBackend({ path: statePath, journalMode: 'wal' })
    const remove = child.storage.backend.register('production-'+config.project_key, backend)
    const domain = await new DomainFacility(child, { backend: 'production-'+config.project_key }).open(productionResearchDomain)
    const table = domain.table('projects')
    let author, loop, registration, removeGoalPrompt
    const installs = new Map()
    const currentTicket = owner => {
      assert.equal(owner, author); assert.equal(child.agents.get(owner.id), owner)
      const ticket = source.tickets.get(owner.id.slice('worker-'.length))
      assert.ok(ticket && !ticket.ended, 'Original native project Ticket must stay open')
      assert.equal(canonicalJson(ticket.mandate), registration.mandate, 'Original native mandate must match')
    }
    const authority = async owner => {
      assertLock()
      const response = await fetch(`http://127.0.0.1:${ctx.webServer.port}/orchestrator/api/state`, {
        headers: { 'x-orchestrator-request': '1' }, signal: AbortSignal.timeout(3000) })
      assert.ok(response.ok); assert.equal((await response.json()).paused, false, 'Operator pause prevents research work')
      currentTicket(owner)
      await artifacts.read(config.project_module)
      assertLock()
      currentTicket(owner)
    }
    const install = async agent => {
      if (!agent.id.startsWith('worker-')) return
      const ticket = source.tickets.get(agent.id.slice('worker-'.length))
      if (!ticket || ticket.mandate.actor.source !== kind.kind) return
      agent = child.agents.get(agent.id) ?? agent
      if (author && author.id !== agent.id) throw new Error('One registered production research author per project')
      if (author && author !== agent) { removeGoalPrompt?.(); loop?.close(); loop = undefined }
      const current = table.get(config.project_key)
      if (current && current.authority.writer_id !== agent.id) throw new Error('Existing admission owner requires supported handoff; no new authority')
      author = agent
      let shell
      await agent.ctx.inject(['shell'], scope => { shell = scope.shell })
      const sandbox = child.sandboxPolicy.resolve({ session: agent.session, mode: config.approved_execution_sandbox_mode ?? 'workspace-write' })
      const project = await module.open({ ctx: child, author: agent, root, artifacts, table, config, current,
        executionShell: shell, executionSandbox: sandbox, source_ticket: ticket })
      assertLock()
      if (!current) {
        assert.equal(config.authority_registration, 'explicit_new_project', 'Missing current state cannot initialize authority implicitly')
        const record = Version4ResearchStateSchema.parse(project.initialState)
        assert.equal(record.authority.project_root, root); assert.equal(record.authority.writer_id, agent.id)
        assert.equal(record.consumed_attempts, 0); assert.equal(record.consumed_timeout_ms, 0)
        assert.equal(Object.keys(record.actions).length, 0); assert.equal(record.consumed_review_requests, 0)
        assert.equal(record.loop.decision, null)
        assert.ok(!table.get(config.project_key)); await table.put(config.project_key, record)
      }
      registration = project.registration
      assert.equal(registration.mandate, canonicalJson(ticket.mandate))
      if (table.get(config.project_key).stopped) return
      loop = await NativeProductionResearch.open(child, { ...project.research,
        artifactPrefix: config.metadata_prefix ?? project.research.artifactPrefix,
        artifacts, table, projectKey: config.project_key, authorSessionId: agent.id,
        executionShell: shell, assertActiveAuthority: authority })
      try { removeGoalPrompt = agent.ctx.systemPrompt.section({ name: 'project-research-goal', order: 10003, interpolate: false, text: project.instructions }) }
      catch (error) { loop.close(); loop = undefined; throw error }
    }
    const installOnce = agent => {
      agent = child.agents.get(agent.id) ?? agent
      if (!installs.has(agent)) installs.set(agent, install(agent).catch(error => { installs.delete(agent); throw error }))
      return installs.get(agent)
    }
    child.on('agent/created', ({ agent }) => installOnce(agent))
    const recover = async () => {
      if (loop) return
      const state = table.get(config.project_key)
      if (!state || state.stopped) return
      const resolved = await child.sessionController.resolveAgent(state.authority.writer_id)
      if ('error' in resolved) throw resolved.error
      await installOnce(resolved.agent)
      assert.ok(loop, 'Retained author cannot be resumed without its qualified project loop')
    }
    child.effect(() => ctx.webServer.register({ kind: 'prefix', path: '/project-research', handler: async (req, res) => {
      const json = (status, value) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(value)) }
      if (req.headers.host !== `127.0.0.1:${ctx.webServer.port}` || req.headers['x-orchestrator-request'] !== '1'
        || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) return json(403, { error: 'Same-origin project management request required' })
      try {
        if (req.method === 'GET') return json(200, { ready: Boolean(loop), state: table.get(config.project_key) ?? null,
          registration, open_tickets: source.tickets.open(), config_sha256: sha256(bytes) })
        if (req.method === 'POST' && req.url === '/project-research/start') {
          if (table.get(config.project_key)) { await recover(); return json(200, { retained: true, state: table.get(config.project_key) }) }
          if (!config.initial_user_request) throw new Error('Initial native mandate requires an authenticated original user request; agent-generated events stay non-human')
          const original = JSON.parse(Buffer.from(await artifacts.read(config.initial_user_request)).toString())
          assert.equal(original.kind, 'native_cli_user_request')
          assert.equal(original.original_prompt, config.prompt_verbatim)
          assert.equal(original.native_events.length, 1)
          const event = original.native_events[0], item = event.item
          assert.equal(item.role, 'user'); assert.equal(item.type, 'message')
          const prompt = item.content.filter(block => block.type === 'input_text' || block.type === 'text').map(block => block.text).join('')
          assert.equal(prompt, config.prompt_verbatim)
          assert.ok(event.user_source_metadata.some(source => source.item?.id === item.id && source.item?.type === 'UserMessage'
            && source.item?.source_content_kinds?.includes('user.text')))
          const trigger = { id: `native-cli-user:${original.thread_id}:${item.id}`, source: kind.kind, threads: [{ source: kind.kind, id: config.project_key }],
            actor: { source: kind.kind, id: config.initial_user_actor_id }, human: true, addressed: 'direct', at: event.timestamp,
            text: prompt, meta: { project_root: root, config_sha256: sha256(bytes), original_user_request: config.initial_user_request,
              project_module: config.project_module, implementation_context: config.goal_text, implementation_context_actor: config.actor_id } }
          return json(200, { result: await source.receive(trigger), trigger_id: trigger.id, human: true, provenance: config.initial_user_request })
        }
        if (req.method === 'POST' && req.url === '/project-research/wake') {
          await recover(); return json(200, loop ? await loop.wake('Existing project research Source wakeup; retain original scope and history') : { status: 'held', state: table.get(config.project_key) })
        }
        return json(405, { error: 'Unsupported project operation' })
      } catch (error) { return json(409, { error: String(error) }) }
    } }))
    child.effect(() => async () => {
      await Promise.allSettled([...installs.values()])
      if (author) { author.cancel({ kind: 'user' }, { keepInbox: true }); await author.whenIdle() }
      removeGoalPrompt?.(); loop?.close(); await domain.close(); await backend.close(); remove()
    })
  })
}
