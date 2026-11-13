import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'
import type { StreamChunk, TokenUsage } from '@deepseek-ai/dsh-llm'
import { canonicalJson, sha256 } from './bindings.js'

export interface TraexTextConfig {
  executable: string
  projectRoot: string
  artifactsRoot: string
  model: 'DeepSeek-V4.1-Flash'
  timeoutMs: number
  maxRequests: number
  outputSchema?: unknown
}
export function mapTraexUsage(value: unknown): TokenUsage {
  if (typeof value !== 'object' || value === null) throw new Error('TraeX completion has no authoritative token usage')
  const raw = value as Record<string, unknown>
  const count = (key: string) => {
    const n = raw[key]
    if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) throw new Error(`TraeX token counter ${key} is unresolved`)
    return n
  }
  const totalInput = count('input_tokens'), output = count('output_tokens')
  const cacheRead = count('cached_input_tokens'), cacheWrite = count('cache_creation_input_tokens')
  const reasoning = count('reasoning_output_tokens')
  if (cacheRead + cacheWrite > totalInput || reasoning > output) throw new Error('TraeX token counters overlap inconsistently')
  return { inputTokens: totalInput - cacheRead - cacheWrite, outputTokens: output,
    cacheReadTokens: cacheRead, cacheWriteTokens: cacheWrite, reasoningTokens: reasoning, totalTokens: totalInput + output }
}
/** Native DSH text-only planning transport over the user's existing TraeX authentication. */
export class TraexTextAdapter extends LlmAdapter {
  readonly receipts: unknown[] = []
  private requests = 0
  constructor(private readonly config: TraexTextConfig) {
    super()
    if (!Number.isSafeInteger(config.timeoutMs) || config.timeoutMs <= 0 || !Number.isSafeInteger(config.maxRequests) || config.maxRequests <= 0)
      throw new Error('Explicit bounded TraeX request count and deadline required')
    const root = resolve(config.projectRoot), artifacts = resolve(config.artifactsRoot)
    if (!artifacts.startsWith(root + '/')) throw new Error('Model artifacts must belong to the configured project')
  }
  override async resolveModel(provider: string, model: string) {
    if (model !== this.config.model) throw new Error('TraeX transport cannot silently substitute the approved model')
    return { provider, id: model, name: model }
  }
  override async *stream(options: Parameters<LlmAdapter['stream']>[0]): AsyncGenerator<StreamChunk> {
    if (options.tools?.length) throw new Error('TraeX text planning transport has no qualified native tool-call route')
    if (++this.requests > this.config.maxRequests) throw new Error('Prospective TraeX planning request limit reached')
    const signal = options.signal ?? new AbortController().signal
    signal.throwIfAborted()
    const root = join(this.config.artifactsRoot, randomUUID())
    await mkdir(root, { recursive: true, mode: 0o700 })
    const answer = join(root, 'answer.txt')
    const prompt = 'You are a text-only model for a native DSH planning/review Session. Tools are disabled. ' +
      'Use only the provided context; do not read/write files, run commands, create agents, or contact others. ' +
      'Return the requested concise public rationale/output. Never turn planning or missing evidence into execution authority.\n' +
      canonicalJson({ system: options.system ?? null, messages: options.messages })
    await writeFile(join(root, 'request.txt'), prompt, { mode: 0o600 })
    const argv = ['--ask-for-approval', 'never', 'exec', '--model', this.config.model, '--sandbox', 'read-only',
      '--disallowed-tool', '*', '--ephemeral', '--json', '--output-last-message', answer]
    if (this.config.outputSchema) {
      const path = join(root, 'output-schema.json')
      await writeFile(path, JSON.stringify(this.config.outputSchema), { mode: 0o600 })
      argv.push('--output-schema', path)
    }
    argv.push('-')
    const start = performance.now()
    signal.throwIfAborted()
    const child = spawn(this.config.executable, argv, { cwd: this.config.projectRoot, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = '', stderr = '', timedOut = false, overflow = false
    let killTimer: ReturnType<typeof setTimeout> | undefined
    const stop = () => { child.kill('SIGTERM'); killTimer ??= setTimeout(() => child.kill('SIGKILL'), 2000) }
    const timer = setTimeout(() => { timedOut = true; stop() }, this.config.timeoutMs)
    signal.addEventListener('abort', stop, { once: true })
    child.stdin.on('error', () => {})
    child.stdin.end(prompt)
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8')
    child.stdout.on('data', chunk => { stdout += chunk; if (stdout.length > 1024 * 1024) { stdout = stdout.slice(0, 1024 * 1024); overflow = true; stop() } })
    child.stderr.on('data', chunk => { stderr += chunk; if (stderr.length > 128 * 1024) { stderr = stderr.slice(0, 128 * 1024); overflow = true; stop() } })
    let code: number | null
    try {
      code = await new Promise<number | null>((yes, no) => { child.once('error', no); child.once('close', yes) })
    } finally { clearTimeout(timer); clearTimeout(killTimer); signal.removeEventListener('abort', stop) }
    await writeFile(join(root, 'private-cli-events.jsonl'), stdout, { mode: 0o600 })
    await writeFile(join(root, 'private-cli-stderr.log'), stderr, { mode: 0o600 })
    signal.throwIfAborted()
    if (timedOut || overflow || code !== 0) throw new Error(`TraeX planning completion unresolved (exit=${code}, timeout=${timedOut}, overflow=${overflow}); no receipt may authorize execution`)
    const events = stdout.split('\n').filter(Boolean).map(line => JSON.parse(line) as Record<string, any>)
    if (events.some(e => e.item && !['agent_message', 'reasoning'].includes(e.item.type))) throw new Error('TraeX planning attempted an unqualified tool or external operation')
    const terminal = events.findLast(e => e.type === 'turn.completed')
    if (!terminal) throw new Error('TraeX has no completed native turn')
    const usage = mapTraexUsage(terminal.usage)
    const result = await readFile(answer, 'utf8')
    if (result.length > 128 * 1024) throw new Error('TraeX answer exceeds the declared planning capture limit')
    this.receipts.push({ model: this.config.model, transport: 'traecli exec', thread_id: events.find(e => e.type === 'thread.started')?.thread_id ?? null,
      prompt_sha256: sha256(prompt), answer_sha256: sha256(result), usage: terminal.usage ?? null,
      wall_ms: performance.now() - start, artifacts: root, tool_calls: 0, scientific_execution_authorized: false,
      model_spending_limit: 'unbounded by explicit user authorization; finite request/deadline limits still apply',
      output_token_cap: null, legacy_max_tokens_ignored: options.maxTokens ?? null })
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text: result }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: result } }
    yield { type: 'usage', usage }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}
