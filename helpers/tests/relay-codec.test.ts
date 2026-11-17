import assert from 'node:assert/strict'
import test from 'node:test'
import { Readable } from 'node:stream'
import { readModelRequest, modelRequestByteLimit } from '../examples/traex-tools/relay-codec.mjs'

test('model relay preserves Chinese and emoji split at every UTF-8 byte boundary', async () => {
  const message = { system: '中文研究', messages: [{ text: '汉字与🙂' }] }
  const data = Buffer.from(JSON.stringify(message))
  const pieces = [...data].map(value => Buffer.from([value]))
  assert.deepEqual(await readModelRequest(Readable.from(pieces), data.length), message)
})
test('malformed UTF-8 and exceeded byte bounds fail before model request parsing', async () => {
  await assert.rejects(readModelRequest(Readable.from([Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x7d])])), /encoded data/)
  await assert.rejects(readModelRequest(Readable.from([Buffer.from('{}')]), 1), /capture bound/)
})
test('explicit transport capacity preserves a large native review without changing the historical default', async () => {
  const request = { sessionId: 'retained-reviewer', model: 'DeepSeek-V4.1-Flash',
    messages: [{ text: 'x'.repeat(2 * 1024 * 1024) + '中文🙂' }] }
  const data = Buffer.from(JSON.stringify(request))
  assert.equal(modelRequestByteLimit({}), 1024 * 1024)
  await assert.rejects(readModelRequest(Readable.from([data])), /capture bound/)
  const limit = modelRequestByteLimit({ maxRequestBytes: 16 * 1024 * 1024 })
  assert.deepEqual(await readModelRequest(Readable.from([data.subarray(0, 1024 * 1024), data.subarray(1024 * 1024)]), limit), request)
})
test('invalid configured byte limits and an oversized request still fail before dispatch', async () => {
  for (const maxRequestBytes of [0, -1, NaN, Infinity, 1.5])
    assert.throws(() => modelRequestByteLimit({ maxRequestBytes }), /Positive finite/)
  const limit = modelRequestByteLimit({ maxRequestBytes: 16 })
  await assert.rejects(readModelRequest(Readable.from([Buffer.from('{"value":"' + 'x'.repeat(20) + '"}')]), limit), /capture bound/)
})
