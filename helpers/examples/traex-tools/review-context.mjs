import { createHash } from 'node:crypto'

// Select the complete current frozen review, never a summary of its contents.
// Durable native Session history and model request accounting stay untouched.
export function selectReviewContext(options, controls) {
  if (controls.reviewerContextMode !== 'latest_frozen_packet') return { options, selection: null }
  const messages = options.messages ?? []
  let index = -1, text
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role !== 'user') continue
    for (const block of messages[i].content ?? []) {
      if (block.type === 'text' && block.text.includes('REVIEW_PACKET_JSON\n')) { index = i; text = block.text }
    }
  }
  if (index < 0) return { options, selection: null }
  const packet = JSON.parse(text.split('REVIEW_PACKET_JSON\n').at(-1))
  if (typeof packet.review_id !== 'string' || typeof packet.action_id !== 'string'
    || !/^[0-9a-f]{64}$/.test(packet.request_sha256) || !/^[0-9a-f]{64}$/.test(packet.manifest_sha256))
    throw new Error('Exact frozen review packet identity required for context selection')
  const current = [...messages.slice(0, index).filter(message => message.role === 'system'), ...messages.slice(index)]
  return { options: { ...options, messages: current }, selection: {
    mode: 'latest_frozen_packet', original_messages: messages.length, selected_messages: current.length,
    original_message_index: index, preserved_message_id: messages[index].id ?? null,
    exact_packet_text_sha256: createHash('sha256').update(text).digest('hex'),
    review_id: packet.review_id, action_id: packet.action_id,
    request_sha256: packet.request_sha256, manifest_sha256: packet.manifest_sha256,
    durable_history_mutated: false, model_token_limit: null } }
}
