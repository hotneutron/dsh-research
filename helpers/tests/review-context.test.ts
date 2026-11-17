import assert from 'node:assert/strict'
import test from 'node:test'
import { selectReviewContext } from '../examples/traex-tools/review-context.mjs'

const packet = (id: string) => ({ role: 'user', id, content: [{ type: 'text', text:
  'Reviewer instructions\nREVIEW_PACKET_JSON\n' + JSON.stringify({ review_id: id, action_id: 'action-' + id,
    request_sha256: 'a'.repeat(64), manifest_sha256: 'b'.repeat(64), permitted_context: ['中文🙂'] }) }] })

test('context selection preserves the whole current frozen packet, system and current suffix without mutating native history', () => {
  const system = { role: 'system', content: [{ type: 'text', text: 'Exact reviewer persona' }] }
  const old = packet('old'), current = packet('current')
  const suffix = { role: 'user', content: [{ type: 'text', text: 'Current runtime fact' }] }
  const options = { system: 'base', messages: [system, old, { role: 'assistant', content: [] }, current, suffix], max_tokens: null }
  const saved = structuredClone(options)
  const result = selectReviewContext(options, { reviewerContextMode: 'latest_frozen_packet' })
  assert.deepEqual(result.options.messages, [system, current, suffix])
  assert.equal(result.options.messages[1], current)
  assert.equal(result.options.system, options.system)
  assert.ok(result.selection)
  assert.equal(result.selection.preserved_message_id, 'current')
  assert.equal(result.selection.model_token_limit, null)
  assert.deepEqual(options, saved)
})
test('historical default and non-packet review contexts remain complete', () => {
  const options = { messages: [packet('old'), packet('current')] }
  assert.equal(selectReviewContext(options, {}).options, options)
  const profile = { messages: [{ role: 'user', content: [{ type: 'text', text: 'Non-executing profile review' }] }] }
  assert.equal(selectReviewContext(profile, { reviewerContextMode: 'latest_frozen_packet' }).options, profile)
})
test('malformed or unbound packet selection fails closed', () => {
  for (const text of ['REVIEW_PACKET_JSON\nnot-json', 'REVIEW_PACKET_JSON\n{}'])
    assert.throws(() => selectReviewContext({ messages: [{ role: 'user', content: [{ type: 'text', text }] }] },
      { reviewerContextMode: 'latest_frozen_packet' }))
})
