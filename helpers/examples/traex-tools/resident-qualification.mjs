// Disposable native transport lifecycle qualification; no external model request.
import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { spawn } from 'node:child_process'
import { mkdir, writeFile, readFile, chmod, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(process.argv[2] ?? '')
if (!process.argv[2]) throw new Error('Fresh disposable output required')
await mkdir(root, { recursive: false, mode: 0o700 })
const checks = [], owned = new Set()
const check = id => checks.push({ id, status: 'passed' })
const free = createServer()
await new Promise(yes => free.listen(0, '127.0.0.1', yes))
const port = free.address().port
await new Promise(yes => free.close(yes))
const controls = join(root, 'controls.json'), relay = join(root, 'relay'), executable = join(root, 'fixture-cli.mjs')
await writeFile(controls, JSON.stringify({ resident: true, maxRequests: 6, perRequestMs: 60000, listenPort: port }))
await writeFile(executable, `#!${process.execPath}
import { writeFileSync } from 'node:fs';
let prompt = ''; for await (const chunk of process.stdin) prompt += chunk;
if (prompt.includes('wait-for-drain')) { process.once('SIGTERM',()=>setTimeout(()=>process.exit(0),500)); await new Promise(resolve=>setTimeout(resolve,60000)); }
if (prompt.includes('wait-for-crash')) await new Promise(resolve => setTimeout(resolve, 60000));
writeFileSync(process.argv[process.argv.indexOf('--output-last-message')+1], 'Resident fixture response');
for (const event of [{type:'item.completed',item:{type:'error',message:'Retained diagnostic'}}, {type:'turn.completed',usage:{input_tokens:10,output_tokens:5,cached_input_tokens:0,cache_creation_input_tokens:0,reasoning_output_tokens:0}}]) process.stdout.write(JSON.stringify(event)+'\\n');
`)
await chmod(executable, 0o700)
const start = () => {
  const child = spawn(process.execPath, [fileURLToPath(new URL('./relay.mjs', import.meta.url)), relay, executable, controls],
    { detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  const run = { child, stdout: '', stderr: '', done: null }
  child.stdout.on('data', value => { run.stdout += value }); child.stderr.on('data', value => { run.stderr += value })
  run.done = new Promise((yes, no) => { child.once('error', no); child.once('close', (code, signal) => { owned.delete(run); yes({ code, signal }) }) })
  owned.add(run); return run
}
const until = async predicate => {
  const end = Date.now()+10000
  while (Date.now() < end) { try { if (await predicate()) return } catch (error) { if (!['ENOENT','ECONNREFUSED'].includes(error.code) && !(error instanceof TypeError)) throw error } await delay(25) }
  throw new Error('Bounded resident qualification observation expired')
}
const state = async () => JSON.parse(await readFile(join(relay, 'private-receipts.json'), 'utf8'))
const headers = async () => ({ 'x-relay-token': (await readFile(join(relay, 'private-relay-token'), 'utf8')).trim(), 'content-type': 'application/json' })
const request = async marker => {
  const response = await fetch(`http://127.0.0.1:${port}/text`, { method: 'POST', headers: await headers(),
    body: JSON.stringify({ provider: 'fixture', model: 'DeepSeek-V4.1-Flash', messages: [{ role: 'user', content: [{ type: 'text', text: marker }] }] }),
    signal: AbortSignal.timeout(10000) })
  const body = await response.text(); assert.ok(body.includes('"type":"finish"')); return body
}
const ready = async run => until(async () => {
  assert.equal(run.child.exitCode, null, run.stderr)
  const response = await fetch(`http://127.0.0.1:${port}/status`, { headers: await headers(), signal: AbortSignal.timeout(1000) })
  return response.ok
})
try {
  const first = start(); await ready(first); await request('successful-first')
  await until(async () => (await state()).ledger[0]?.status === 'completed')
  assert.equal((await state()).requests, 1)
  assert.deepEqual((await state()).text[0].diagnostics, ['Retained diagnostic'])
  check('durable-request-before-model-and-retained-diagnostic-usage')
  const before = await readFile(join(relay,'private-receipts.json'))
  const competing = start(); const exit = await competing.done
  assert.equal(exit.code, 1); assert.match(competing.stderr, /EADDRINUSE/)
  assert.deepEqual(await readFile(join(relay,'private-receipts.json')), before)
  check('competing-resident-listener-refused-before-snapshot-write')
  const pending = request('wait-for-crash').catch(error => ({ unresolved: String(error) }))
  await until(async () => (await state()).ledger[1]?.status === 'started')
  const interruptedBytes = await readFile(join(relay,'private-receipts.json'))
  assert.equal(JSON.parse(interruptedBytes).requests, 2)
  process.kill(-first.child.pid, 'SIGKILL'); await first.done; await pending
  assert.deepEqual(await readFile(join(relay,'private-receipts.json')), interruptedBytes)
  check('actual-process-group-crash-preserves-precontact-consumption')
  const resumed = start(); await ready(resumed)
  const reopened = await state()
  assert.equal(reopened.requests, 2); assert.equal(reopened.ledger[1].status, 'unresolved'); assert.equal(reopened.active, 0)
  assert.deepEqual(reopened.ledger[0], JSON.parse(before).ledger[0])
  assert.deepEqual(reopened.text[0], JSON.parse(before).text[0])
  const history = join(relay,'history','predecessor-'+createHash('sha256').update(interruptedBytes).digest('hex')+'.json')
  assert.deepEqual(await readFile(history), interruptedBytes)
  check('restart-preserves-history-and-does-not-refund-interrupted-request')
  await request('successful-third'); await until(async () => (await state()).ledger[2]?.status === 'completed')
  assert.equal((await state()).requests, 3); assert.equal((await state()).text.length, 2)
  const draining = request('wait-for-drain').catch(error=>({unresolved:String(error)}))
  await until(async () => (await state()).ledger[3]?.status === 'started')
  // Let the fixture install its delayed child termination handler after durable reservation.
  await delay(100)
  process.kill(resumed.child.pid, 'SIGTERM')
  const overlapping = start(); const overlapExit = await overlapping.done
  assert.equal(overlapExit.code, 1); assert.match(overlapping.stderr,/EADDRINUSE/)
  assert.equal((await resumed.done).code, 0); await draining
  assert.equal((await state()).requests,4); assert.equal((await state()).ledger[3].status,'unresolved')
  const finalRun = start(); await ready(finalRun)
  assert.equal((await state()).requests,4)
  await request('successful-fifth'); await until(async () => (await state()).ledger[4]?.status==='completed')
  process.kill(finalRun.child.pid,'SIGTERM'); assert.equal((await finalRun.done).code,0)
  check('active-graceful-stop-fences-overlapping-start-through-final-write')
  assert.equal((await state()).active, 0)
  check('graceful-stop-retains-successful-forward-request-and-usage')
  const final = await state()
  await writeFile(join(root,'receipt.json'),JSON.stringify({ kind:'resident_transport_lifecycle_qualification',at:new Date().toISOString(),checks,
    requests:final.requests,retained_unknown_usage_requests:2,external_model_calls:0,scientific_admissions:0,
    scope:'Disposable native process group and fixed listener; actual user service qualified separately',history_files:await readdir(join(relay,'history'))},null,2)+'\n',{flag:'wx'})
  console.log(JSON.stringify({passed:checks.length,receipt:join(root,'receipt.json')}))
} catch(error) {
  await writeFile(join(root,'failure.json'),JSON.stringify({checks,error:String(error),stack:error.stack},null,2)+'\n',{flag:'wx'}); throw error
} finally { for(const run of owned) { try{process.kill(-run.child.pid,'SIGKILL')}catch{} await run.done } }
