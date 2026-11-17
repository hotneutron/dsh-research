// Bounded disposable model relay. Authentication stays in the local TraeX CLI.
import { createServer } from 'node:http'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { TraexTextAdapter } from 'dsh-research/traex'
import { TraexToolAdapter } from 'dsh-research/traex-tools'
import { readModelRequest, modelRequestByteLimit } from './relay-codec.mjs'
import { resolveRelayLimits } from './relay-limits.mjs'
import { atomicPrivateJson, residentPredecessor, frozenSnapshot } from './relay-state.mjs'
import { selectReviewContext } from './review-context.mjs'
import { selectAuthorContext } from './author-context.mjs'
import { beginModelResponse } from './relay-response.mjs'
import { selectReviewEncoding } from './review-literal.mjs'
import { loadReviewedDeadlineRenewal } from './relay-renewal.mjs'

const root = resolve(process.argv[2] ?? '')
const executable = process.argv[3]
if (!process.argv[2] || !executable) throw new Error('Usage: relay.mjs <fresh-local-artifact-root> <authenticated-traecli> [forward-controls.json]')
const controls = process.argv[4] ? JSON.parse(await readFile(process.argv[4], 'utf8')) : {}
const maxRequestBytes = modelRequestByteLimit(controls)
const port = controls.listenPort ?? 0
if (!Number.isSafeInteger(port) || (port !== 0 && (port < 1024 || port > 65535))) throw new Error('Relay listener requires a declared loopback port')
if (controls.resident === true && port === 0) throw new Error('Resident relay requires an explicitly fixed loopback listener')
let handler = (_req, res) => { res.writeHead(503); res.end() }
const handlers = new Set()
const server = createServer((req, res) => {
  const work = Promise.resolve(handler(req, res)); handlers.add(work)
  void work.finally(() => handlers.delete(work)).catch(error => { console.error(String(error)); res.destroy() })
})
// Fence the writer before reading its mutable predecessor, including an overlapping stop/start.
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve) })
let predecessor = null
let residentSnapshot = null, residentBytes = null
const receiptsPath = join(root, 'private-receipts.json')
if (controls.resident === true) {
  try {
    residentBytes = await readFile(receiptsPath)
    residentSnapshot = JSON.parse(residentBytes.toString('utf8'))
    const renewal = residentSnapshot.perRequestMs !== controls.perRequestMs
      ? await loadReviewedDeadlineRenewal(controls, residentBytes) : null
    predecessor = residentPredecessor(residentSnapshot, controls, renewal)
  } catch (error) { if (error.code !== 'ENOENT') throw error }
}
if (!predecessor && controls.predecessor) {
  const bytes = await readFile(controls.predecessor.path)
  if (bytes.length !== controls.predecessor.size_bytes || createHash('sha256').update(bytes).digest('hex') !== controls.predecessor.sha256)
    throw new Error('Predecessor relay snapshot no longer matches its frozen reference')
  predecessor = JSON.parse(bytes.toString('utf8'))
}
const limits = resolveRelayLimits(controls, predecessor)
await mkdir(root, { recursive: controls.resident === true, mode: 0o700 })
let token
try { token = controls.resident === true ? (await readFile(join(root, 'private-relay-token'), 'utf8')).trim() : undefined }
catch (error) { if (error.code !== 'ENOENT') throw error }
if (token !== undefined && !/^[0-9a-f]{64}$/.test(token)) throw new Error('Invalid protected resident relay credential file')
token ??= randomBytes(32).toString('hex')
const common = { executable, projectRoot: root, artifactsRoot: join(root, 'private-model-requests'),
  model: 'DeepSeek-V4.1-Flash', timeoutMs: limits.perRequestMs, maxRequests: limits.maxRequests - limits.requests }
const adapters = { text: new TraexTextAdapter({ ...common,
  ...(controls.reviewerEnvelopeMode === 'complete_context_literals_v1' ? { contextEncoding: 'literal_v1' } : {}),
  ...(controls.reviewerContextDelivery === 'project_doc' ? { contextDelivery: 'project_doc' } : {}) }),
  tools: new TraexToolAdapter({ ...common, maxToolCallsPerTurn: 1 }) }
let requests = limits.requests
const ledger = limits.ledger, active = new Set()
const receivingFailures = residentSnapshot?.receiving_failures ?? []
let persist = Promise.resolve()
let ready = false, predecessorRef = controls.predecessor ?? null
const retained = { text: residentSnapshot?.text ?? [], tools: residentSnapshot?.tools ?? [] }
const save = () => {
  const snapshot = structuredClone({ requests, maxRequests: limits.maxRequests, perRequestMs: limits.perRequestMs,
    active: active.size, predecessor: predecessorRef, ledger, receiving_failures: receivingFailures,
    text: [...retained.text, ...adapters.text.receipts], tools: [...retained.tools, ...adapters.tools.receipts] })
  persist = persist.then(() => atomicPrivateJson(receiptsPath, snapshot))
  return persist
}
handler = async (req, res) => {
  if (!ready) { res.writeHead(503); res.end(); return }
  const provided = Buffer.from(req.headers['x-relay-token'] ?? '')
  const expected = Buffer.from(token)
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) { res.writeHead(403); res.end(); return }
  if (req.method === 'GET' && req.url === '/status') {
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ requests, maxRequests: limits.maxRequests, perRequestMs: limits.perRequestMs, active: active.size, ledger })); return
  }
  const kind = req.url === '/text' ? 'text' : req.url === '/tools' ? 'tools' : null
  if (req.method !== 'POST' || !kind) { res.writeHead(405); res.end(); return }
  const abort = new AbortController(); active.add(abort)
  res.on('close', () => { if (!res.writableEnded) abort.abort(new Error('Remote native request disconnected')) })
  const record = { ordinal: null, kind, status: 'receiving', started: new Date().toISOString() }
  let stopHeartbeat = () => {}
  try {
    const received = await readModelRequest(req, maxRequestBytes)
    const context = kind === 'text' ? selectReviewContext(received, controls) : selectAuthorContext(received,controls)
    const { options, selection: encoding } = kind === 'text' ? selectReviewEncoding(context.options,controls) : {options:context.options,selection:null}
    const selection=context.selection
    if (selection) record.context_selection = selection
    if (encoding) record.context_encoding = encoding
    if (options.model !== common.model) throw new Error('Approved model mismatch')
    if (requests >= limits.maxRequests) throw new Error('Global relay request allowance exhausted')
    requests++
    record.ordinal = requests; record.session_id = options.sessionId ?? null; record.status = 'started'; ledger.push(record)
    // Commit consumed request accounting before contacting the protected model route.
    await save()
    stopHeartbeat = beginModelResponse(res)
    for await (const chunk of adapters[kind].stream({ ...options, signal: abort.signal })) {
      if (chunk.type === 'usage') record.usage = chunk.usage
      if (chunk.type === 'finish') record.finish = chunk.reason
      res.write(JSON.stringify(chunk) + '\n')
    }
    record.status = 'completed'; res.end()
  } catch (error) {
    record.status = 'unresolved'; record.error = String(error)
    if (record.ordinal === null) receivingFailures.push({ ...record, max_request_bytes: maxRequestBytes,
      ended: new Date().toISOString(), model_dispatch: false, model_request_debit: 0 })
    if (!res.headersSent) res.writeHead(503, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ relay_error: String(error) }) + '\n')
  } finally {
    stopHeartbeat()
    active.delete(abort)
    record.ended = new Date().toISOString()
    try { await save() } catch (error) { console.error('Durable model accounting failed:', String(error)); void stop() }
  }
}
server.requestTimeout = limits.perRequestMs + 30000
if (residentBytes) {
  const history = join(root, 'history'); await mkdir(history, { recursive: true, mode: 0o700 })
  const path = join(history, 'predecessor-' + createHash('sha256').update(residentBytes).digest('hex') + '.json')
  try { await writeFile(path, residentBytes, { mode: 0o600, flag: 'wx' }) } catch (error) { if (error.code !== 'EEXIST') throw error }
  predecessorRef = frozenSnapshot(path, residentBytes)
}
try { await writeFile(join(root, 'private-relay-token'), token, { mode: 0o600, flag: 'wx' }) }
catch (error) { if (controls.resident !== true || error.code !== 'EEXIST') throw error }
await save()
await writeFile(join(root, 'binding.json'), JSON.stringify({ host: '127.0.0.1', port: server.address().port,
  model: common.model, maxRequests: limits.maxRequests, retainedRequests: limits.requests, perRequestMs: limits.perRequestMs, predecessor: controls.predecessor ?? null }) + '\n', { mode: 0o600 })
console.log(JSON.stringify({ binding: join(root, 'binding.json') }))
ready = true
let stopping
const stop = () => stopping ??= (async () => {
  ready = false
  for (const abort of active) abort.abort(new Error('Model relay stopping'))
  server.closeAllConnections()
  // Keep the fixed listener fenced until every old handler and its final write is drained.
  await Promise.allSettled([...handlers])
  try { await persist } finally { server.close(); server.closeAllConnections() }
})()
process.once('SIGINT', stop); process.once('SIGTERM', stop)

// ## Revision History
// 2026-11-16T08:30:00Z: Flush response headers and send empty NDJSON keepalives while model completion is pending; preserve real usage/finish and configured deadlines.
// 2026-11-16: Optional reversible complete-review literal representation avoids redundant JSON escaping; preserves every field/string and original request history, with no token spending cap.
// 2026-11-16: Qualified optional complete reviewer-context framing avoids the outer JSON escape expansion; native history and real accounting remain unchanged.

// ## Revision History
// 2026-11-16T19:37:56.752974+00:00: Qualify complete document delivery and independently authenticated idle deadline renewal; preserve all prior records and defaults.
