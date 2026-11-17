import assert from 'node:assert/strict'
import { createServer, get } from 'node:http'
import type { RequestListener } from 'node:http'
import test, { type TestContext } from 'node:test'
import { beginModelResponse } from '../examples/traex-tools/relay-response.mjs'

async function serverFor(t: TestContext, handler: RequestListener) {
  const server = createServer(handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  return 'http://127.0.0.1:'+address.port
}

test('headers and empty frames keep a delayed real completion alive without adding model chunks', async t => {
  const url = await serverFor(t, (_request, response) => {
    const stop = beginModelResponse(response, 10)
    const timer = setTimeout(() => {
      stop()
      response.end(JSON.stringify({type:'usage',usage:{inputTokens:3,outputTokens:2}})+'\n'+JSON.stringify({type:'finish',reason:'completed'})+'\n')
    }, 220)
    response.once('close', () => clearTimeout(timer))
  })
  let headers = false
  const body = await new Promise<string>((resolve, reject) => {
    const request = get(url, response => {
      headers = true; let body = ''
      response.setEncoding('utf8'); response.on('data', value => body += value)
      response.on('end', () => resolve(body)); response.on('error', reject)
    })
    request.setTimeout(80, () => request.destroy(new Error('idle deadline')))
    request.on('error', reject)
  })
  assert.equal(headers, true)
  assert.ok(body.startsWith('\n'))
  assert.deepEqual(body.split('\n').filter(Boolean).map(line => JSON.parse(line).type), ['usage','finish'])
})

test('the previous buffered-header response fails the same idle deadline', async t => {
  const url = await serverFor(t, (_request, response) => {
    response.writeHead(200)
    const timer = setTimeout(() => response.end('{}\n'), 220)
    response.once('close', () => clearTimeout(timer))
  })
  await assert.rejects(new Promise((resolve, reject) => {
    const request = get(url, response => {response.resume();response.once('end',resolve)})
    request.setTimeout(80, () => request.destroy(new Error('idle deadline')))
    request.on('error', reject)
  }), /idle deadline/)
})

test('keepalives cannot extend the declared overall abort deadline', async t => {
  const url = await serverFor(t, (_request, response) => {
    beginModelResponse(response, 10)
    const timer = setTimeout(() => response.end('{"type":"finish"}\n'), 220)
    response.once('close', () => clearTimeout(timer))
  })
  await assert.rejects(async () => {
    const response = await fetch(url, {signal:AbortSignal.timeout(80)})
    await response.text()
  }, error => error instanceof Error && /abort|timeout/i.test(error.name+' '+error.message))
})

test('invalid keepalive intervals fail before writing response headers', () => {
  for (const value of [0,-1,1.5,NaN,Infinity])
    assert.throws(() => beginModelResponse(null,value), /Positive finite/)
})

// ## Revision History
// 2026-11-16: Added strict Node callback types after runtime transport tests passed.
