import { randomUUID } from 'node:crypto'
import { LlmAdapter, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { StreamChunk, ToolSchema } from '@deepseek-ai/dsh-llm'
import { z } from 'zod'
import type { ModelOptions } from './model-transport.js'
import { ModelTextAdapter } from './model-transport.js'

const schema = z.strictObject({ text: z.string(), tool_calls: z.array(z.strictObject({ name: z.string().min(1), arguments: z.string() })) })
export function parseModelToolSelection(answer: string, tools: readonly ToolSchema[], maxCalls: number) {
  if (!Number.isSafeInteger(maxCalls) || maxCalls < 1 || maxCalls > 4) throw new Error('Explicit native call bound of 1–4 required')
  const fenced = answer.trim().match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/)
  const selection = schema.parse(JSON.parse(fenced ? fenced[1]! : answer))
  const names = new Set(tools.map(tool => tool.name))
  if (names.size !== tools.length) throw new Error('Ambiguous native tool declarations')
  if (selection.tool_calls.length > maxCalls) throw new Error('Response exceeds the native call bound')
  for (const call of selection.tool_calls) {
    if (!names.has(call.name)) throw new Error('Selected tool is absent from the current native request')
    const args: unknown = JSON.parse(call.arguments)
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Native tool arguments must be a JSON object')
  }
  return selection
}
/** Generic native tool projection; it delegates to an injected text transport and has no second budget. */
export class ModelToolAdapter extends LlmAdapter {
  readonly receipts: unknown[] = []
  constructor(readonly text: ModelTextAdapter, readonly maxCalls: number) {
    super()
    if (!Number.isSafeInteger(maxCalls) || maxCalls < 1 || maxCalls > 4) throw new Error('Explicit native call bound of 1–4 required')
    if (text.route.role === 'reviewer') throw new Error('Reviewer transport cannot expose native tool selection')
  }
  override resolveModel(provider: string, model: string) { return this.text.resolveModel(provider, model) }
  override async *stream(options: ModelOptions): AsyncGenerator<StreamChunk> {
    const tools = structuredClone(options.tools ?? [])
    const outputSchema = { type: 'object', additionalProperties: false,
      properties: { text: { type: 'string' }, tool_calls: { type: 'array', maxItems: this.maxCalls,
        items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, arguments: { type: 'string' } }, required: ['name', 'arguments'] } } },
      required: ['text', 'tool_calls'] }
    const result = await this.text.complete(options, { schema: outputSchema,
      instructions: `Return JSON containing text and tool_calls for exactly the next DSH response. Request at most ${this.maxCalls} currently declared native tool call(s), with arguments encoded as a JSON object string. Wait for dependent tool results in the next request; do not invent results. An empty tool_calls array means no next operation. CLI tools remain disabled; native role, review, stop and resource rules remain binding.`,
      validate: answer => {
        const selected = parseModelToolSelection(answer, tools, this.maxCalls)
        return { ...selected, tool_calls: selected.tool_calls.map(call => ({ ...call, id: ToolCallId(randomUUID()) })) }
      } })
    options.signal?.throwIfAborted()
    const calls = result.value.tool_calls
    this.receipts.push({ request: result.receipt, calls, execution_authority: 'existing DSH/project guards' })
    let index = 0
    if (result.value.text) {
      yield { type: 'block-start', index, blockType: 'text' }
      yield { type: 'text-delta', index, text: result.value.text }
      yield { type: 'block-end', index, block: { type: 'text', text: result.value.text } }; index++
    }
    for (const call of calls) {
      yield { type: 'block-start', index, blockType: 'tool-call' }
      yield { type: 'tool-call-delta', index, id: call.id, name: call.name, argumentsDelta: call.arguments }
      yield { type: 'block-end', index, block: { type: 'tool-call', ...call } }; index++
    }
    yield { type: 'usage', usage: result.usage }
    yield { type: 'finish', reason: { kind: calls.length ? 'tool-calls' : 'stop' } }
  }
}
