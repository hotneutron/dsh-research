// Disposable default-runtime qualification only. Never install in a research profile.
import { LlmAdapter, ToolCallId } from '@deepseek-ai/dsh-llm'
import { commentTrigger, githubKind } from 'dsh-superagent/github-watch'

export const name = 'dsh-research-default-qualification'
export const inject = ['llm', 'webServer', 'agents', 'agentLoop', 'storage', 'tools', 'jobs', 'skills', 'sessionController']
const text = value => [{ type: 'block-start', index: 0, blockType: 'text' },
  { type: 'text-delta', index: 0, text: value }, { type: 'block-end', index: 0, block: { type: 'text', text: value } },
  { type: 'finish', reason: { kind: 'stop' } }]
const tool = (ordinal, name, args) => [{ type: 'block-start', index: 0, blockType: 'tool-call' },
  { type: 'tool-call-delta', index: 0, id: ToolCallId(`default-${ordinal}`), name, argumentsDelta: JSON.stringify(args) },
  { type: 'block-end', index: 0, block: { type: 'tool-call', id: ToolCallId(`default-${ordinal}`), name, arguments: JSON.stringify(args) } },
  { type: 'finish', reason: { kind: 'tool-calls' } }]

export async function apply(ctx) {
  if (!process.env.DSH_RESEARCH_DISPOSABLE_QUALIFICATION) throw new Error('Disposable qualification opt-in required')
  if (ctx.webServer.host !== '127.0.0.1') throw new Error('Qualification requires loopback')
  const audit = { requests: [], results: [], original: null, routed: false, reported: false }
  const researchMode = process.env.DSH_RESEARCH_GUARDED_QUALIFICATION === '1'
  let research
  class Scripted extends LlmAdapter {
    async resolveModel(provider, model) {
      if (provider !== 'default-qualification' || !['router', 'worker'].includes(model)) throw new Error('Unsupported fixture model')
      return { provider, id: model, name: model }
    }
    async *stream(options) {
      if (audit.requests.length >= 24) throw new Error('Default qualification model-call ceiling reached')
      const serialized = JSON.stringify(options.messages)
      audit.requests.push({ model: options.model, messages: options.messages, system: options.system })
      let chunks = text('Disposable engineering qualification; no scientific claim.')
      if (options.model === 'router' && audit.original && !audit.routed && serialized.includes(audit.original.id)) {
        audit.routed = true
        chunks = tool(audit.requests.length, 'orchestrator_route', { decisions: [{ kind: 'accept', trigger_id: audit.original.id,
          title: 'Default runtime bounded qualification', worktree_name: 'default-qualification',
          acknowledgement: 'Validate the default runtime in this disposable checkout.' }] })
      } else if (options.model === 'worker' && researchMode) {
        const next = await research?.step(options.messages)
        if (next) chunks = tool(audit.requests.length, next.name, next.args)
      } else if (options.model === 'worker' && !audit.reported) {
        audit.reported = true
        chunks = tool(audit.requests.length, 'orchestrator_report', { state: 'progress',
          summary: 'Original frozen request retained; default worker and durable report exercised.', human_action: null })
      }
      for (const chunk of chunks) yield chunk
    }
  }
  ctx.effect(() => ctx.llm.registerAdapter(['default-qualification'], new Scripted()))
  // Keep the adapter alive while Runtime restarts; bind SourceHost only within its injected child scope.
  ctx.inject(['orchestrator'], async child => {
  if (researchMode) research = await (await import(new URL('../examples/superagent/research-worker.mjs', import.meta.resolve('dsh-research')))).install(child, audit)
  child.effect(() => ctx.webServer.register({ kind: 'prefix', path: '/default-qualification', handler: async (req, res) => {
    const json = (status, value) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(value)) }
    if (req.headers.host !== `127.0.0.1:${ctx.webServer.port}` || req.headers['x-orchestrator-request'] !== '1'
      || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`)) return json(403, { error: 'Same-origin required' })
    try {
      const host = child.orchestrator
      if (!host) return json(503, { error: 'Runtime unavailable' })
      const source = host.context(githubKind)
      await source.ready
      if (researchMode && req.method === 'POST' && req.url === '/default-qualification/research/start') {
        const packet = await research.packet()
        const input = commentTrigger({ id: 900010, body: `@fixture-agent EXACT_RESEARCH_PACKET ${JSON.stringify(packet.request)}`,
          user: { login: 'fixture-owner', type: 'User' }, created_at: '2026-11-12T00:00:02Z' },
          { number: 1, isPr: false }, 'conversation', 'fixture-agent')
        return json(200, { result: await source.receive(input), packet: packet.request })
      }
      if (researchMode && req.method === 'POST' && req.url.startsWith('/default-qualification/research/')) {
        return json(200, await research.drill(req.url.split('/').at(-1)))
      }
      if (req.method === 'POST' && req.url === '/default-qualification/filtered') {
        const input = commentTrigger({ id: 900009, body: '@fixture-agent Disabled Source must filter this input',
          user: { login: 'fixture-owner', type: 'User' }, created_at: '2026-11-12T00:00:00Z' },
          { number: 9, isPr: false }, 'conversation', 'fixture-agent')
        return json(200, { result: await source.receive(input) })
      }
      if (req.method === 'POST' && req.url === '/default-qualification/inject') {
        const input = commentTrigger({ id: 900001, body: researchMode ? '@fixture-agent Run the bounded synthetic negative research case' : '@fixture-agent Validate the frozen default runtime request; manifest=sha256:fixture-identity',
          user: { login: 'fixture-owner', type: 'User' }, created_at: '2026-11-12T00:00:00Z',
          html_url: 'https://github.com/fixture/default-runtime/issues/1#issuecomment-900001' }, { number: 1, isPr: false }, 'conversation', 'fixture-agent')
        audit.original = input
        audit.results.push({ id: 'original', result: await source.receive(input) })
        audit.results.push({ id: 'duplicate', result: await source.receive(input) })
        const own = commentTrigger({ id: 900002, body: '@fixture-agent Automated same-account traffic', user: { login: 'fixture-agent', type: 'User' },
          created_at: '2026-11-12T00:00:01Z' }, { number: 2, isPr: false }, 'conversation', 'fixture-agent')
        audit.results.push({ id: 'same-account', human: own.human, result: await source.receive(own) })
        return json(200, { results: audit.results, original: input })
      }
      if (req.method !== 'GET') return json(405, { error: 'Unsupported request' })
      const tickets = source.tickets.open()
      const events = {}
      for (const ticket of tickets) {
        const agent = ctx.agents.get(`worker-${ticket.id}`)
        if (agent) events[ticket.id] = agent.session.snapshotEvents()
      }
      return json(200, { ...audit, tickets, events, stored_original: audit.original && source.triggers.get(audit.original.id),
        ...(researchMode ? { research: await research.snapshot() } : {}) })
    } catch (error) { return json(500, { error: String(error) }) }
  } }))
  })
}
