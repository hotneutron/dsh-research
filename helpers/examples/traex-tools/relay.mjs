// Bounded disposable model relay. Authentication stays in the local TraeX CLI.
import { createServer } from 'node:http'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { TraexTextAdapter } from 'dsh-research/traex'
import { TraexToolAdapter } from 'dsh-research/traex-tools'
import { readModelRequest } from './relay-codec.mjs'

const root = resolve(process.argv[2] ?? '')
const executable = process.argv[3]
if (!process.argv[2] || !executable) throw new Error('Usage: relay.mjs <fresh-local-artifact-root> <authenticated-traecli>')
await mkdir(root, { recursive: false, mode: 0o700 })
const token = randomBytes(32).toString('hex')
await writeFile(join(root, 'private-relay-token'), token, { mode: 0o600, flag: 'wx' })
const common = { executable, projectRoot: root, artifactsRoot: join(root, 'private-model-requests'),
  model: 'DeepSeek-V4.1-Flash', timeoutMs: 120000, maxRequests: 32 }
const adapters = { text: new TraexTextAdapter(common), tools: new TraexToolAdapter({ ...common, maxToolCallsPerTurn: 1 }) }
let requests = 0
const ledger = [], active = new Set()
let persist = Promise.resolve()
const server = createServer(async (req, res) => {
  const provided = Buffer.from(req.headers['x-relay-token'] ?? '')
  const expected = Buffer.from(token)
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) { res.writeHead(403); res.end(); return }
  if (req.method === 'GET' && req.url === '/status') {
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ requests, maxRequests: 32, active: active.size, ledger })); return
  }
  const kind = req.url === '/text' ? 'text' : req.url === '/tools' ? 'tools' : null
  if (req.method !== 'POST' || !kind) { res.writeHead(405); res.end(); return }
  const abort = new AbortController(); active.add(abort)
  res.on('close', () => { if (!res.writableEnded) abort.abort(new Error('Remote native request disconnected')) })
  const record = { ordinal: null, kind, status: 'receiving', started: new Date().toISOString() }
  try {
    const options = await readModelRequest(req)
    if (options.model !== common.model) throw new Error('Approved model mismatch')
    if (++requests > 32) throw new Error('Global relay request allowance exhausted')
    record.ordinal = requests; record.session_id = options.sessionId ?? null; record.status = 'started'; ledger.push(record)
    res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' })
    for await (const chunk of adapters[kind].stream({ ...options, signal: abort.signal })) {
      if (chunk.type === 'usage') record.usage = chunk.usage
      if (chunk.type === 'finish') record.finish = chunk.reason
      res.write(JSON.stringify(chunk) + '\n')
    }
    record.status = 'completed'; res.end()
  } catch (error) {
    record.status = 'unresolved'; record.error = String(error)
    if (!res.headersSent) res.writeHead(503, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ relay_error: String(error) }) + '\n')
  } finally {
    active.delete(abort)
    record.ended = new Date().toISOString()
    persist = persist.then(() => writeFile(join(root, 'private-receipts.json'), JSON.stringify({ ledger,
      text: adapters.text.receipts, tools: adapters.tools.receipts }, null, 2) + '\n', { mode: 0o600 }))
    await persist
  }
})
server.requestTimeout = 150000
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
await writeFile(join(root, 'binding.json'), JSON.stringify({ host: '127.0.0.1', port: server.address().port,
  model: common.model, maxRequests: 32, perRequestMs: 120000 }) + '\n', { mode: 0o600 })
console.log(JSON.stringify({ binding: join(root, 'binding.json') }))
const stop = () => { for (const abort of active) abort.abort(new Error('Model relay stopping')); server.close(); server.closeAllConnections() }
process.once('SIGINT', stop); process.once('SIGTERM', stop)
