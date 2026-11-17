import { readFile } from 'node:fs/promises'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'
import { sha256 } from 'dsh-research'

/** DSH-facing client. Backend/model identity comes from the accepted role binding, never a global literal. */
export class RemoteModelAdapter extends LlmAdapter {
  receipts = []
  constructor(kind, binding, allowedTools) {
    super()
    if (!['text', 'tools'].includes(kind) || !binding?.model || !binding?.provider) throw new Error('Explicit DSH role/model binding required')
    this.kind = kind; this.binding = Object.freeze({ ...binding }); this.allowedTools = allowedTools
  }
  async resolveModel(provider, model) {
    if (provider !== this.binding.provider || model !== this.binding.model) throw new Error('Cannot substitute accepted remote model binding')
    return { provider, id: model, name: model }
  }
  async *stream(options) {
    await this.resolveModel(options.provider, options.model)
    if (this.allowedTools) options = { ...options, tools: (options.tools ?? []).filter(tool => this.allowedTools.includes(tool.name)) }
    const url = new URL(process.env.DSH_RESEARCH_MODEL_TRANSPORT_URL)
    if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:' || url.pathname !== '/') throw new Error('Explicit loopback model transport required')
    const token = (await readFile(process.env.DSH_RESEARCH_MODEL_TRANSPORT_TOKEN_FILE, 'utf8')).trim()
    const timeout = Number(process.env.DSH_RESEARCH_MODEL_TRANSPORT_TIMEOUT_MS)
    if (!Number.isSafeInteger(timeout) || timeout <= 0) throw new Error('Explicit positive model response deadline required')
    const { signal, ...request } = options, body = JSON.stringify(request)
    const bounded = AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(timeout)])
    const response = await fetch(new URL(this.kind, url), { method: 'POST', headers: { 'content-type': 'application/json', 'x-relay-token': token }, body, signal: bounded })
    if (!response.ok || !response.body) throw new Error('Remote model preflight/response is unresolved')
    const chunks = []; let buffer = '', count = 0, usage = null
    const decoder = new TextDecoder('utf-8', { fatal: true })
    for await (const value of response.body) {
      count += value.length; if (count > 1024 * 1024) throw new Error('Remote response capture bound exceeded')
      buffer += decoder.decode(value, { stream: true })
      let cut
      while ((cut = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, cut); buffer = buffer.slice(cut + 1); if (!line) continue
        const chunk = JSON.parse(line); if (chunk.relay_error) throw new Error(chunk.relay_error)
        if (chunk.type === 'usage') usage = chunk.usage
        chunks.push(chunk)
      }
    }
    buffer += decoder.decode()
    const finish = chunks.at(-1)
    if (buffer.trim() || !usage || finish?.type !== 'finish' || chunks.filter(chunk => chunk.type === 'finish').length !== 1
      || !['stop', 'tool-calls'].includes(finish.reason?.kind))
      throw new Error('Remote model lacks a complete usage/finish boundary')
    this.receipts.push({ dsh_session_id: options.sessionId ?? null, provider: options.provider, model: options.model,
      request_sha256: sha256(body), usage, completed: true, kind: this.kind })
    for (const chunk of chunks) yield chunk
  }
}
