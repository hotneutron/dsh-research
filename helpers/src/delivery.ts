import type { Context } from '@deepseek-ai/cordis'
import type { ContentBlock, GenerateOptions } from '@deepseek-ai/dsh-llm'
import { estimateContent } from '@deepseek-ai/dsh-token-meter/estimate'
import { canonicalJson } from './bindings.js'

export interface InlineDeliveryLimits { maxBytes: number; maxTokens: number }
export const SCIENTIFIC_INLINE_LIMITS: Readonly<InlineDeliveryLimits> = Object.freeze({ maxBytes: 6000, maxTokens: 2000 })

/** Use the SDK's own text estimator; required content has no optional truncated tail. */
export function boundedJsonContent(value: unknown, limits: InlineDeliveryLimits = SCIENTIFIC_INLINE_LIMITS): ContentBlock[] {
  if (!Number.isSafeInteger(limits.maxBytes) || limits.maxBytes <= 0 || !Number.isSafeInteger(limits.maxTokens) || limits.maxTokens <= 0)
    throw new Error('Scientific delivery requires positive byte and token bounds')
  const content: ContentBlock[] = [{ type: 'text', text: canonicalJson(value) }]
  if (Buffer.byteLength((content[0] as { text: string }).text) > limits.maxBytes || estimateContent(content) > limits.maxTokens)
    throw new Error('Scientific discovery delivery overflow; use the exact catalog/page route or increase the declared bound')
  return content
}

/** Observe the immutable final native request, refusing provider dispatch if required bytes were lost. */
export class NativeRequiredContext {
  private readonly required = new Map<string, readonly string[]>()
  private readonly dispose: () => void
  constructor(ctx: Context) {
    const thisGuard = this
    this.dispose = ctx.on('llm/stream', async function* (options, next) {
      thisGuard.assertRequest(options)
      yield* next()
    })
  }
  require(sessionId: string, content: readonly ContentBlock[]) {
    const texts = content.filter((block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text').map(block => block.text)
    if (!texts.length || texts.some(text => !text.length)) throw new Error('Required scientific context cannot be empty')
    this.required.set(sessionId, [...texts])
  }
  assertRequest(options: GenerateOptions) {
    if (options.purpose !== undefined || options.sessionId === undefined) return
    const required = this.required.get(options.sessionId)
    if (!required) return
    const texts = options.messages.flatMap(message => message.content ?? []).filter(block => block.type === 'text').map(block => block.text)
    if (required.some(text => !texts.some(block => block.includes(text))))
      throw new Error('Required scientific context missing from final native model request; provider dispatch refused')
  }
  clear(sessionId: string) { this.required.delete(sessionId) }
  close() { this.required.clear(); this.dispose() }
}
