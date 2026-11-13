import { randomUUID } from 'node:crypto'
import { LlmAdapter, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { StreamChunk, ToolSchema, TokenUsage } from '@deepseek-ai/dsh-llm'
import { z } from 'zod'
import { canonicalJson, sha256 } from './bindings.js'
import { TraexTextAdapter } from './traex.js'
import type { TraexTextConfig } from './traex.js'

export interface TraexToolConfig extends Omit<TraexTextConfig, 'outputSchema'> {
  /** Maximum model-selected calls in one completed response; native authority remains separate. */
  maxToolCallsPerTurn: number
}

const selectionSchema = z.object({ text: z.string(), tool_calls: z.array(z.object({
  name: z.string().min(1), arguments: z.string(),
}).strict()) }).strict()

export function parseTraexToolSelection(answer: string, tools: readonly ToolSchema[], maxCalls: number) {
  if (!Number.isSafeInteger(maxCalls) || maxCalls < 1 || maxCalls > 4) throw new Error('Bounded tool selection requires 1–4 calls per turn')
  const selection = selectionSchema.parse(JSON.parse(answer))
  const names = new Set(tools.map(t => t.name))
  if (names.size !== tools.length) throw new Error('Ambiguous native tool declarations')
  if (selection.tool_calls.length > maxCalls) throw new Error('TraeX response exceeds the frozen tool-call bound')
  for (const call of selection.tool_calls) {
    if (!names.has(call.name)) throw new Error('TraeX selected a tool absent from the current native request')
    const args: unknown = JSON.parse(call.arguments)
    if (typeof args !== 'object' || args === null || Array.isArray(args)) throw new Error('Native tool arguments require a JSON object')
  }
  return selection
}

/** Structured text projection into DSH tool blocks. The CLI never executes tools. */
export class TraexToolAdapter extends LlmAdapter {
  private readonly config: Readonly<TraexToolConfig>
  private readonly textConfig: TraexTextConfig
  private requests = 0
  readonly receipts: unknown[] = []
  constructor(config: TraexToolConfig) {
    super()
    if (!Number.isSafeInteger(config.maxToolCallsPerTurn) || config.maxToolCallsPerTurn < 1 || config.maxToolCallsPerTurn > 4)
      throw new Error('Explicit tool-call bound of 1–4 required')
    this.config = Object.freeze({ ...config })
    this.textConfig = { ...config, outputSchema: {
      type: 'object', additionalProperties: false,
      properties: { text: { type: 'string' }, tool_calls: { type: 'array', maxItems: config.maxToolCallsPerTurn,
        items: { type: 'object', additionalProperties: false,
          properties: { name: { type: 'string' }, arguments: { type: 'string' } }, required: ['name', 'arguments'] } } },
      required: ['text', 'tool_calls'],
    } }
    // Validate project roots and finite limits before this adapter is registered.
    new TraexTextAdapter(this.textConfig)
  }
  override async resolveModel(provider: string, model: string) {
    if (model !== this.config.model) throw new Error('Cannot substitute the approved TraeX model')
    return { provider, id: model, name: model }
  }
  override async *stream(options: Parameters<LlmAdapter['stream']>[0]): AsyncGenerator<StreamChunk> {
    if (options.model !== this.config.model) throw new Error('Cannot substitute the approved TraeX model')
    if (options.temperature !== undefined || options.stop?.length || options.reasoningEffort !== undefined)
      throw new Error('TraeX structured route has no qualified mapping for requested sampling controls')
    const tools = structuredClone(options.tools ?? [])
    if (new Set(tools.map(t => t.name)).size !== tools.length) throw new Error('Ambiguous native tool declarations')
    const request = canonicalJson({ system: options.system ?? null, messages: options.messages, tools })
    if (++this.requests > this.config.maxRequests) throw new Error('Prospective TraeX tool request limit reached')
    // One private transport per request prevents concurrent Sessions from borrowing
    // another completion's CLI receipt. The instance-wide allowance stays charged.
    const text = new TraexTextAdapter({ ...this.textConfig, maxRequests: 1 })
    let answer = '', usage: TokenUsage | undefined, completed = false
    for await (const chunk of text.stream({ provider: options.provider, model: options.model, ...(options.signal ? { signal: options.signal } : {}),
      messages: [{ role: 'user', content: [{ type: 'text', text:
        'Represent exactly one next response for the supplied DSH conversation. Return JSON with text and tool_calls. ' +
        'A tool call is a requested native DSH operation, never a CLI operation or execution authority. ' +
        'Choose only currently declared tools, with arguments encoded as a JSON object string matching their schema. ' +
        'Use an empty tool_calls array when done. Do not fabricate results for calls; the next native request will contain actual tool results. ' +
        'Preserve all supplied native role, review, stop and research bounds.\n' + request }] }] })) {
      if (chunk.type === 'text-delta') answer += chunk.text
      if (chunk.type === 'usage') usage = chunk.usage
      if (chunk.type === 'finish') completed = chunk.reason.kind === 'stop'
    }
    options.signal?.throwIfAborted()
    if (!completed || !usage) throw new Error('Unresolved structured TraeX response cannot publish native calls')
    // Validate every selected call before exposing any block to the native loop.
    const selected = parseTraexToolSelection(answer, tools, this.config.maxToolCallsPerTurn)
    const calls = selected.tool_calls.map(call => ({ ...call, id: ToolCallId(randomUUID()) }))
    this.receipts.push({ transport: 'TraeX structured text projected to DSH blocks',
      request_sha256: sha256(request), selection_sha256: sha256(answer), native_session_id: options.sessionId ?? null,
      calls, call_id_origin: 'adapter-issued correlation IDs', cli: text.receipts.at(-1),
      native_argument_validation: 'existing DSH tools service', execution_authority: 'existing native/project guards only',
      output_token_cap: null, legacy_max_tokens_ignored: options.maxTokens ?? null })
    let index = 0
    if (selected.text) {
      yield { type: 'block-start', index, blockType: 'text' }
      yield { type: 'text-delta', index, text: selected.text }
      yield { type: 'block-end', index, block: { type: 'text', text: selected.text } }
      index++
    }
    for (const call of calls) {
      yield { type: 'block-start', index, blockType: 'tool-call' }
      yield { type: 'tool-call-delta', index, id: call.id, name: call.name, argumentsDelta: call.arguments }
      yield { type: 'block-end', index, block: { type: 'tool-call', ...call } }
      index++
    }
    yield { type: 'usage', usage }
    yield { type: 'finish', reason: { kind: calls.length ? 'tool-calls' : 'stop' } }
  }
}
