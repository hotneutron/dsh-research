import assert from 'node:assert/strict'
import test from 'node:test'
import { Readable } from 'node:stream'
import { readModelRequest } from '../examples/traex-tools/relay-codec.mjs'

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
