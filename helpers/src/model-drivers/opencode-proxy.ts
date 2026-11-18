import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import { canonicalJson, sha256 } from '../bindings.js'
import type { ModelRoute } from '../model-policy.js'
import type { EncodedModelInput } from '../model-transport.js'

export function decodeChatUsage(value: unknown): TokenUsage {
  const raw = value as any
  const count = (v: unknown) => { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw new Error('Raw chat usage counter is unresolved'); return v }
  const input = count(raw?.prompt_tokens), output = count(raw?.completion_tokens), total = count(raw?.total_tokens)
  if (!Number.isSafeInteger(input + output) || input === 0 || output === 0 || total !== input + output) throw new Error('Raw chat usage is absent or inconsistent')
  const cached = raw.prompt_tokens_details?.cached_tokens, reasoning = raw.completion_tokens_details?.reasoning_tokens
  if (cached !== undefined && count(cached) > input || reasoning !== undefined && count(reasoning) > output) throw new Error('Raw chat detail counters overlap')
  return { inputTokens: input - (cached ?? 0), outputTokens: output, totalTokens: total,
    ...(cached === undefined ? {} : { cacheReadTokens: cached }), ...(reasoning === undefined ? {} : { reasoningTokens: reasoning }) }
}

/** Private one-call boundary. No proxy token or upstream API credential enters model context or retained records. */
export async function openCodeProxy(config: { route: Readonly<ModelRoute>; input: EncodedModelInput; runtime: string; artifacts: string;
  credential: string; signal: AbortSignal; beforeLaunch(): Promise<void>; assertDispatch(): void }) {
  const token = randomBytes(32).toString('hex'), pending = new Set<Promise<void>>(), lifetime = new AbortController()
  const signal = AbortSignal.any([config.signal, lifetime.signal])
  let attempts = 0, started = false, complete: any = null, observed: any = null, error: string | null = null
  const safe = (text: string) => text.split(config.credential).join('[REDACTED_API_KEY]').split(token).join('[REDACTED_PROXY_TOKEN]')
  const safeJson = (value: any): any => typeof value === 'string' ? safe(value) : Array.isArray(value) ? value.map(safeJson)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [safe(key), safeJson(item)])) : value
  const hasSecret = (value: any): boolean => typeof value === 'string' ? value.includes(config.credential) || value.includes(token)
    : Array.isArray(value) ? value.some(hasSecret) : value && typeof value === 'object' ? Object.entries(value).some(([key, item]) => hasSecret(key) || hasSecret(item)) : false
  const server = createServer((req, res) => {
    const work = (async () => {
      try {
        const expected = Buffer.from('Bearer ' + token), actual = Buffer.from(req.headers.authorization ?? '')
        if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) { res.writeHead(403); res.end(); return }
        if (req.method !== 'POST' || req.url !== '/v1/chat/completions' || attempts++) throw new Error('OpenCode proxy admits one chat attempt only')
        let bytes = Buffer.alloc(0)
        for await (const chunk of req) {
          bytes = Buffer.concat([bytes, Buffer.from(chunk)])
          if (bytes.length > config.route.limits.max_encoded_input_bytes) throw new Error('Actual native API input exceeds its bound')
          signal.throwIfAborted()
        }
        const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
        if (body.model !== config.route.model || body.stream !== true
          || body.tools !== undefined && (!Array.isArray(body.tools) || body.tools.length)
          || body.functions !== undefined && (!Array.isArray(body.functions) || body.functions.length)
          || !Array.isArray(body.messages) || body.messages.length !== 2 || body.messages[0]?.role !== 'system'
          || body.messages[1]?.role !== 'user' || body.messages[1]?.content !== config.input.stdin)
          throw new Error('Native request changed model, approved context or tool exposure')
        const system = body.messages[0].content
        const prefix = config.input.document + '\nYou are powered by the model named ' + config.route.model +
          '. The exact model ID is dsh-model-provider/' + config.route.model + '\nHere is some useful information about the environment you are running in:\n<env>\n  Working directory: ' + config.runtime + '\n  Workspace root folder: /\n  Is directory a git repo: no\n  Platform: ' + process.platform + "\n  Today's date: "
        if (typeof system !== 'string' || !system.startsWith(prefix) || !/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}\n<\/env>$/.test(system.slice(prefix.length)))
          throw new Error('Native system framing has an unqualified source or shape')
        if (Buffer.byteLength(system.slice(config.input.document!.length)) > (config.input.native_context_bytes ?? 0)) throw new Error('Native framing exceeds its qualification bound')
        await config.beforeLaunch(); signal.throwIfAborted(); config.assertDispatch()
        if (started) throw new Error('Upstream chat dispatch already admitted')
        started = true
        const target = config.route.driver.opencode!.base_url.replace(/\/$/, '') + '/chat/completions'
        await writeFile(join(config.artifacts, 'private-upstream-request.json'), canonicalJson(body), { mode: 0o600 })
        const upstream = await fetch(target, { method: 'POST', redirect: 'error', signal,
          headers: { authorization: 'Bearer ' + config.credential, 'content-type': 'application/json' }, body: JSON.stringify(body) })
        if (!upstream.ok || !upstream.headers.get('content-type')?.includes('text/event-stream') || !upstream.body) throw new Error('Upstream chat response is failed or unqualified')
        const reader = upstream.body.getReader(); let output = Buffer.alloc(0), pendingFrame = ''
        const decoder = new TextDecoder('utf-8', { fatal: true }), captured: any[] = []
        try {
          while (true) {
            const part = await reader.read(); if (part.done) break
            output = Buffer.concat([output, Buffer.from(part.value)])
            if (output.length > config.route.limits.max_capture_bytes) throw new Error('Upstream response exceeds capture bound')
            pendingFrame = (pendingFrame + decoder.decode(part.value, { stream: true })).replaceAll('\r\n', '\n')
            let boundary: number
            while ((boundary = pendingFrame.indexOf('\n\n')) !== -1) {
              const block = pendingFrame.slice(0, boundary); pendingFrame = pendingFrame.slice(boundary + 2)
              const data = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
              if (data && data !== '[DONE]') {
                try { captured.push(JSON.parse(data)) } catch { /* Full validation below refuses malformed complete frames. */ }
              }
              observed = { response_ids: safeJson([...new Set(captured.map(chunk => chunk.id))]),
                reported_usage: safeJson(captured.filter(chunk => chunk.usage != null).map(chunk => chunk.usage)),
                stream_sha256: sha256(output), stream_bytes: output.length, complete_frames: captured.length,
                done_received: data === '[DONE]' || observed?.done_received === true }
            }
          }
        } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
        const payload = new TextDecoder('utf-8', { fatal: true }).decode(output)
        const data = payload.replaceAll('\r\n', '\n').split('\n\n').filter(Boolean).map(block => block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')).filter(Boolean)
        if (data.at(-1) !== '[DONE]' || data.slice(0, -1).includes('[DONE]')) throw new Error('Raw upstream stream has no unique final completion')
        const chunks = data.slice(0, -1).map(line => JSON.parse(line))
        const usages = chunks.filter(chunk => chunk.usage != null), ids = new Set(chunks.map(chunk => chunk.id))
        const finishes = chunks.flatMap(chunk => chunk.choices ?? []).filter(choice => choice.finish_reason != null)
        observed = { response_ids: safeJson([...ids]), reported_usage: safeJson(usages.map(chunk => chunk.usage)), stream_sha256: sha256(output), stream_bytes: output.length }
        if (ids.size !== 1 || !chunks[0]?.id || chunks.some(chunk => chunk.model !== config.route.model || chunk.error
          || (chunk.choices ?? []).some((choice: any) => choice.index !== 0 || choice.delta?.tool_calls || choice.delta?.function_call))
          || finishes.length !== 1 || finishes[0].finish_reason !== 'stop' || usages.length !== 1)
          throw new Error('Raw upstream identity, operation, finish or usage is unqualified')
        let finished = false, usageSeen = false
        for (const chunk of chunks) {
          if (!Array.isArray(chunk.choices)) throw new Error('Raw upstream choices are malformed')
          for (const choice of chunk.choices) {
            const delta = choice.delta ?? {}
            if (usageSeen || finished && Object.keys(delta).length || choice.delta && typeof choice.delta !== 'object')
              throw new Error('Raw upstream emitted content after finish/usage')
            if (choice.finish_reason != null) { if (finished) throw new Error('Duplicate raw finish'); finished = true }
          }
          if (chunk.usage != null) { if (!finished || usageSeen) throw new Error('Raw usage precedes finish or repeats'); usageSeen = true }
        }
        const rawUsage = usages[0].usage, usage = decodeChatUsage(rawUsage)
        const deltas = chunks.flatMap(chunk => chunk.choices ?? []).map(choice => choice.delta ?? {})
        const outputText = deltas.map(delta => delta.content ?? '').join('')
        const reasoningText = deltas.map(delta => delta.reasoning_content ?? delta.reasoning ?? '').join('')
        if (hasSecret(chunks) || hasSecret(outputText) || hasSecret(reasoningText)) throw new Error('Upstream returned protected credential material')
        complete = { raw_usage: rawUsage, usage, model: config.route.model, response_id: chunks[0].id,
          stream_sha256: sha256(output), stream_bytes: output.length }
        await writeFile(join(config.artifacts, 'private-upstream-response.jsonl'), safe(payload), { mode: 0o600 })
        await writeFile(join(config.artifacts, 'upstream-completion.json'), canonicalJson(complete), { mode: 0o600 })
        res.writeHead(200, { 'content-type': 'text/event-stream' }); res.end(output)
      } catch (failure) {
        error = safe(String(failure))
        if (!res.headersSent) res.writeHead(400, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: { type: 'invalid_request_error', code: 'dsh_transport_refusal', message: error } }))
      }
    })()
    pending.add(work); void work.finally(() => pending.delete(work)).catch(() => res.destroy())
  })
  await new Promise<void>((yes, no) => { server.once('error', no); server.listen(0, '127.0.0.1', yes) })
  const port = (server.address() as AddressInfo).port
  let closing: Promise<void> | null = null
  return { token, baseURL: `http://127.0.0.1:${port}/v1`, evidence: () => ({ attempts, upstream_started: started, complete, observed, error }),
    close() { return closing ??= (async () => {
      lifetime.abort(new Error('OpenCode proxy stopping'))
      server.closeAllConnections()
      await new Promise<void>(yes => server.close(() => yes()))
      await Promise.allSettled([...pending])
      await writeFile(join(config.artifacts, 'upstream-proxy.json'), canonicalJson({ attempts, upstream_started: started, complete, observed, error }), { mode: 0o600 })
    })() } }
}
