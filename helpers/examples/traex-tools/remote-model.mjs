import { readFile } from 'node:fs/promises'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'
import { sha256 } from 'dsh-research'
import { selectReviewContext } from './review-context.mjs'

export class RemoteTraexAdapter extends LlmAdapter {
  receipts = []
  constructor(kind, allowedTools) { super(); this.kind = kind; this.allowedTools = allowedTools }
  async resolveModel(provider, model) {
    if (model !== 'DeepSeek-V4.1-Flash') throw new Error('Approved model required')
    return { provider, id: model, name: model }
  }
  async *stream(options) {
    if (this.allowedTools && options.sessionId?.startsWith('worker-'))
      options = { ...options, tools: (options.tools ?? []).filter(tool => this.allowedTools.includes(tool.name)) }
    const url = new URL(process.env.DSH_RESEARCH_REAL_MODELS_URL)
    if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:' || url.pathname !== '/') throw new Error('Explicit loopback model relay required')
    const token = (await readFile(process.env.DSH_RESEARCH_REAL_MODELS_TOKEN_FILE, 'utf8')).trim()
    const mode = process.env.DSH_RESEARCH_REVIEW_CONTEXT_MODE
    if (this.kind === 'text' && mode !== undefined && mode !== 'latest_frozen_packet')
      throw new Error('Unsupported native review context projection')
    const projected = this.kind === 'text' ? selectReviewContext(options, { reviewerContextMode: mode }) : { options, selection: null }
    const { signal, ...request } = projected.options
    const body = JSON.stringify(request)
    const deadlineMs = Number(process.env.DSH_RESEARCH_REAL_MODELS_TIMEOUT_MS ?? 130000)
    if (!Number.isSafeInteger(deadlineMs) || deadlineMs <= 0) throw new Error('Finite positive remote model deadline required')
    const bounded = AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(deadlineMs)])
    const response = await fetch(new URL(this.kind, url), { method: 'POST', headers: { 'content-type': 'application/json', 'x-relay-token': token }, body, signal: bounded })
    if (!response.ok || !response.body) throw new Error('Native model relay request unresolved')
    const record = { session_id: options.sessionId ?? null, kind: this.kind, request_sha256: sha256(body),
      context_selection: projected.selection, complete_current_packet_preserved: projected.selection !== null,
      durable_native_history_mutated: false, completed: false }
    let buffer = '', bytes = 0
    const chunks = []
    const decoder = new TextDecoder()
    for await (const value of response.body) {
      bytes += value.byteLength
      if (bytes > 1024 * 1024) throw new Error('Remote model response exceeds capture bound')
      buffer += decoder.decode(value, { stream: true })
      let cut
      while ((cut = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, cut); buffer = buffer.slice(cut + 1)
        if (!line) continue
        const chunk = JSON.parse(line)
        if (chunk.relay_error) throw new Error(chunk.relay_error)
        if (chunk.type === 'usage') record.usage = chunk.usage
        if (chunk.type === 'finish') record.completed = true
        chunks.push(chunk)
      }
    }
    if (buffer.trim() || !record.completed || !record.usage) throw new Error('Remote model has no complete usage/finish boundary')
    if (chunks.at(-1)?.type !== 'finish' || chunks.filter(c => c.type === 'finish').length !== 1) throw new Error('Invalid remote finish boundary')
    this.receipts.push(record)
    for (const chunk of chunks) yield chunk
  }
}

// ## Revision History
// 2026-11-16: Optional qualified current-packet projection before HTTP serialization prevents historical reviewer messages from exhausting the wire reader; native history, full packet, system, suffix, tools and deadlines remain preserved.
