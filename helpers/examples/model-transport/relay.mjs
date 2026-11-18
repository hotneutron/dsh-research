// Host-owned CLI bootstrap over the shared DSH model transport. No scientific state is initialized.
import { createServer } from 'node:http'
import { withFileLock } from '@deepseek-ai/dsh-atomic-write'
import { hostname } from 'node:os'
import { readlink } from 'node:fs/promises'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { ModelTextAdapter, ModelRequestBudget, ModelRouteSchema, contextEntries } from 'dsh-research/model-transport'
import { ModelToolAdapter } from 'dsh-research/model-tools'
import { TraexDriver } from 'dsh-research/model-drivers/traex'
import { CodexDriver } from 'dsh-research/model-drivers/codex'
import { ClaudeDriver } from 'dsh-research/model-drivers/claude'
import { OpenCodeDriver } from 'dsh-research/model-drivers/opencode'
import { canonicalJson, sha256, verifyBytes } from 'dsh-research'
import { atomicPrivateJson } from './storage.mjs'
import { readModelRequest } from './http-input.mjs'
import { beginModelResponse } from './http-response.mjs'

const [projectArgument, artifactArgument, configArgument] = process.argv.slice(2)
if (!projectArgument || !artifactArgument || !configArgument) throw new Error('Usage: relay.mjs <canonical-project> <private-relay-root> <pinned-config.json>')
const projectRoot = await realpath(projectArgument), root = resolve(artifactArgument)
if (!root.startsWith(projectRoot + '/')) throw new Error('Relay artifacts must belong to the canonical project')
const configBytes = await readFile(configArgument), config = JSON.parse(configBytes)
const positive = value => Number.isSafeInteger(value) && value > 0
if (!positive(config.maxRequestBytes) || !positive(config.budget?.max_requests) || !positive(config.budget?.max_in_flight)
  || typeof config.budget.scope_id !== 'string' || !config.budget.scope_id || !Number.isSafeInteger(config.listenPort)
  || config.listenPort < 1024 || config.listenPort > 65535) throw new Error('Explicit wire, budget, scope, concurrency and fixed loopback listener required')
const routes = { text: ModelRouteSchema.parse(config.routes?.text), tools: ModelRouteSchema.parse(config.routes?.tools) }
if (routes.tools.role === 'reviewer' || routes.text.authentication.principal !== routes.tools.authentication.principal)
  throw new Error('Shared relay requires its declared principal and correct role bindings')
const driverFor = id => {
  if (id === 'traex-exec-v1') return new TraexDriver()
  if (id === 'codex-app-server-v1') return new CodexDriver()
  if (id === 'claude-print-v1') return new ClaudeDriver()
  if (id === 'opencode-run-v1') return new OpenCodeDriver()
  throw new Error('Unsupported model driver: ' + id)
}
const drivers = { text: driverFor(routes.text.driver.id), tools: driverFor(routes.tools.driver.id) }

let handle = (_req, res) => { res.writeHead(503); res.end() }
const pending = new Set()
const server = createServer((req, res) => {
  const work = Promise.resolve(handle(req, res)); pending.add(work)
  void work.finally(() => pending.delete(work)).catch(() => res.destroy())
})
// Acquire the existing fixed-listener fence before reading any mutable model history.
await new Promise((yes, no) => { server.once('error', no); server.listen(config.listenPort, '127.0.0.1', yes) })
await mkdir(root, { recursive: true, mode: 0o700 })
const canonicalRoot = await realpath(root)
if (!canonicalRoot.startsWith(projectRoot + '/')) throw new Error('Relay artifact symlink escaped the project')
const namespaceId = process.platform === 'linux' ? await readlink('/proc/self/ns/pid') : process.platform + ':host'
const writerScope = { host: hostname(), pid_namespace: namespaceId }
const scopePath = join(canonicalRoot, 'writer-scope.json')
try { await writeFile(scopePath, canonicalJson(writerScope), { flag: 'wx', mode: 0o600 }) }
catch (error) { if (error.code !== 'EEXIST') throw error }
if (canonicalJson(JSON.parse(await readFile(scopePath, 'utf8'))) !== canonicalJson(writerScope))
  throw new Error('Model writer host/PID namespace requires explicit handoff')
await withFileLock(join(canonicalRoot, 'private-model-budget.json'), async () => {
const closed = new Promise(resolve => server.once('close', resolve))
const moduleRef = config.governance_module
if (!moduleRef || moduleRef.uri.startsWith('/') || moduleRef.uri.split(/[\\/]/).includes('..')) throw new Error('A pinned project governance module is required')
const modulePath = await realpath(join(projectRoot, moduleRef.uri))
if (!modulePath.startsWith(projectRoot + '/')) throw new Error('Governance module escaped the project')
const moduleBytes = await readFile(modulePath); verifyBytes(moduleRef, moduleBytes)
// Execute exactly the verified module bytes; modules use node imports or injected host helpers.
const namespace = await import('data:text/javascript;base64,' + moduleBytes.toString('base64'))
if (typeof namespace.createGovernance !== 'function') throw new Error('Governance module must export createGovernance')
const governance = await namespace.createGovernance({ projectRoot, routes, config, helpers: { canonicalJson, sha256, contextEntries } })
if (!governance?.verifyRoute || !governance?.approveContext) throw new Error('Existing project authority and classification hooks required')

const statePath = join(root, 'private-model-budget.json')
let previous = null
try {
  const previousBytes = await readFile(statePath)
  previous = JSON.parse(previousBytes.toString('utf8'))
  const history = join(root, 'history'); await mkdir(history, { recursive: true, mode: 0o700 })
  const path = join(history, sha256(previousBytes) + '.json')
  try { await writeFile(path, previousBytes, { flag: 'wx', mode: 0o600 }) } catch (error) { if (error.code !== 'EEXIST') throw error }
  if (previous.active !== 0 || previous.hold !== null || previous.records.some(record => ['preflight', 'admitted'].includes(record.phase))) {
    if (typeof governance.verifyRestart !== 'function') throw new Error('Original model ownership requires host reconciliation before restart')
    const proof = await governance.verifyRestart(previous, sha256(previousBytes))
    if (proof?.snapshot_sha256 !== sha256(previousBytes) || proof?.scope_id !== previous.scope_id || proof?.quiescent !== true)
      throw new Error('Restart proof does not fence the original model scope')
    const proofPath = await realpath(join(projectRoot, proof.evidence.uri))
    if (!proofPath.startsWith(projectRoot + '/')) throw new Error('Restart proof escaped project')
    verifyBytes(proof.evidence, await readFile(proofPath))
    previous = structuredClone(previous)
    for (const record of previous.records) {
      if (!['preflight', 'admitted'].includes(record.phase)) continue
      record.phase = record.ordinal === null ? 'refused' : 'unresolved'
      record.error = 'Fenced interrupted model request; response/usage remain unresolved'
      record.ended_at = new Date().toISOString(); record.receipt = { restart_proof: proof.evidence }
    }
    previous.active = 0
    previous.hold = null
  }
} catch (error) { if (error.code !== 'ENOENT') throw error }
const budget = new ModelRequestBudget(config.budget.scope_id, config.budget.max_requests, config.budget.max_in_flight,
  snapshot => atomicPrivateJson(statePath, snapshot), previous ?? undefined)
const text = new ModelTextAdapter({ projectRoot, artifactsRoot: join(root, 'private-requests'), route: routes.text, driver: drivers.text, governance, budget })
const tools = new ModelToolAdapter(new ModelTextAdapter({ projectRoot, artifactsRoot: join(root, 'private-requests'), route: routes.tools, driver: drivers.tools, governance, budget }), 1)
let token
try { token = (await readFile(join(root, 'private-relay-token'), 'utf8')).trim() } catch (error) { if (error.code !== 'ENOENT') throw error }
if (token !== undefined && !/^[0-9a-f]{64}$/.test(token)) throw new Error('Invalid relay credential file')
if (token === undefined) { token = randomBytes(32).toString('hex'); await writeFile(join(root, 'private-relay-token'), token, { flag: 'wx', mode: 0o600 }) }
await atomicPrivateJson(statePath, budget.snapshot())
const active = new Set(), receivingFailures = []
let ready = true
handle = async (req, res) => {
  const supplied = Buffer.from(req.headers['x-relay-token'] ?? ''), expected = Buffer.from(token)
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { res.writeHead(403); res.end(); return }
  if (req.method === 'GET' && req.url === '/status') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ready, budget: budget.snapshot() })); return }
  if (!ready) { res.writeHead(503); res.end(); return }
  const kind = req.url === '/text' ? 'text' : req.url === '/tools' ? 'tools' : null
  if (!kind || req.method !== 'POST') { res.writeHead(405); res.end(); return }
  const abort = new AbortController(); active.add(abort)
  res.on('close', () => { if (!res.writableEnded) abort.abort(new Error('DSH model request disconnected')) })
  let heartbeat = () => {}, received = false
  try {
    const options = await readModelRequest(req, config.maxRequestBytes); received = true
    heartbeat = beginModelResponse(res)
    for await (const chunk of (kind === 'text' ? text : tools).stream({ ...options, signal: abort.signal })) res.write(JSON.stringify(chunk) + '\n')
    res.end()
  } catch (error) {
    if (!received) {
      receivingFailures.push({ at: new Date().toISOString(), error: String(error), model_debit: 0 })
      await atomicPrivateJson(join(root, 'private-receiving-failures.json'), receivingFailures)
    }
    if (!res.headersSent) res.writeHead(503, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ relay_error: String(error) }) + '\n')
  } finally { heartbeat(); active.delete(abort) }
}
await writeFile(join(root, 'binding.json'), canonicalJson({ host: '127.0.0.1', port: config.listenPort, config_sha256: sha256(configBytes),
  routes: { text: routes.text.id, tools: routes.tools.id }, drivers: { text: drivers.text.id, tools: drivers.tools.id }, scope_id: budget.scopeId }), { mode: 0o600 })
console.log(JSON.stringify({ binding: join(root, 'binding.json') }))
let stopping
const stop = () => stopping ??= (async () => {
  ready = false; for (const abort of active) abort.abort(new Error('Model transport stopping'))
  server.closeAllConnections(); await Promise.allSettled([...pending]); await budget.flush()
  server.close(); server.closeAllConnections()
})()
process.once('SIGINT', stop); process.once('SIGTERM', stop)
await closed
}, { waitMs: 250 })
