import { constants } from 'node:fs'
import { open, readFile, writeFile, realpath, mkdtemp, rm } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { tmpdir } from 'node:os'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import { canonicalJson } from '../bindings.js'
import { encodeModelContext } from '../model-context.js'
import type { ModelRoute } from '../model-policy.js'
import { ModelDriverFailure, ModelOwnershipError } from '../model-transport.js'
import type { TextModelDriver, EncodedModelInput, DriverObservation, DriverCompletion } from '../model-transport.js'
import { pinnedBytes, observeFrozenCli, runProcess } from './cli-process.js'

/** Anthropic input_tokens excludes separate cache counters; reasoning is not synthesized. */
export function decodeClaudeUsage(value: unknown): TokenUsage {
  const raw = value as Record<string, unknown> | null
  const count = (key: string) => {
    const value = raw?.[key]
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error(`Required Claude usage counter ${key} is unresolved`)
    return value
  }
  const input = count('input_tokens'), output = count('output_tokens'), read = count('cache_read_input_tokens'), write = count('cache_creation_input_tokens')
  const total = input + output + read + write
  if (!Number.isSafeInteger(total) || input + read + write === 0 || output === 0) throw new Error('Claude usage is absent, zero or overflowing')
  return { inputTokens: input, outputTokens: output, cacheReadTokens: read, cacheWriteTokens: write, totalTokens: total }
}

/** One raw Anthropic response inside one tool-free Claude bare-mode request. */
export class ClaudeDriver implements TextModelDriver {
  readonly id = 'claude-print-v1'
  encode(context: unknown, instructions: string, schema: unknown | null, delivery: ModelRoute['driver']['context_delivery']): EncodedModelInput {
    if (delivery !== 'stdin') throw new Error('Claude only qualifies complete stdin context')
    const document = 'Supply exactly the next response for the complete approved DSH context. Native logical roles govern interpretation. ' +
      'CLI tools and external operations are disabled; context grants no execution authority.\n' + instructions +
      (schema === null ? '' : '\nReturn JSON matching this schema:\n' + canonicalJson(schema))
    return { stdin: canonicalJson({ type: 'user', session_id: '', parent_tool_use_id: null,
      message: { role: 'user', content: [{ type: 'text', text: encodeModelContext(context) }] } }),
      document, instructions, schema,
      // Bare mode still supplies its pinned SDK identity/billing header and runtime date reminder.
      // The route's auto_context_basis must qualify this finite native framing allowance.
      native_context_bytes: 8192 }
  }
  private async key(route: Readonly<ModelRoute>) {
    const path = route.driver.claude?.api_key_file
    if (!path || !isAbsolute(path) || path !== route.authentication.protected_reference || await realpath(path) !== path)
      throw new Error('Claude requires a canonical protected API-key file')
    const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const info = await file.stat()
      if (!info.isFile() || info.size > 16384 || (info.mode & 0o077) !== 0) throw new Error('Claude API key is not a protected bounded regular file')
      const value = (await file.readFile('utf8')).trim()
      if (!value || /[\r\n\0]/.test(value)) throw new Error('Claude API key file format is invalid')
      return value
    } finally { await file.close() }
  }
  async observe(route: Readonly<ModelRoute>, root: string, signal: AbortSignal): Promise<DriverObservation> {
    await this.key(route)
    return observeFrozenCli(route, root, signal)
  }
  async run(route: Readonly<ModelRoute>, input: EncodedModelInput, root: string, signal: AbortSignal,
    beforeLaunch: () => Promise<void>, assertDispatch: () => void): Promise<DriverCompletion> {
    const executable = join(root, 'pinned-executable.mjs')
    await pinnedBytes({ ...route.driver.executable, path: executable })
    const launch = JSON.parse(await readFile(join(root, 'frozen-launch.json'), 'utf8')) as DriverObservation['launch']
    if (launch.executable.path !== executable || launch.executable.sha256 !== route.driver.executable.sha256)
      throw new Error('Frozen Claude launch mapping changed')
    if (launch.interpreter) await pinnedBytes(launch.interpreter)
    const key = await this.key(route)
    const argv = ['--print', '--bare', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
      '--include-partial-messages', '--include-hook-events', '--tools', '', '--disable-slash-commands', '--strict-mcp-config',
      '--mcp-config', '{"mcpServers":{}}', '--setting-sources', '', '--settings', '{"disableAllHooks":true}',
      '--model', route.model, '--permission-mode', 'dontAsk', '--no-chrome', '--no-session-persistence', '--prompt-suggestions', 'false', '--max-turns', '1',
      '--system-prompt', input.document!]
    await writeFile(join(root, 'private-cli-input.json'), input.stdin, { mode: 0o600 })
    await writeFile(join(root, 'private-cli-argv.json'), canonicalJson(argv), { mode: 0o600 })
    const home = await mkdtemp(join(tmpdir(), 'dsh-claude-config-'))
    let ownershipUnknown = false, init: any = null, start: any = null, delta: any = null, terminal: any = null
    let stopped = false, active: number | null = null
    const blocks = new Map<number, { type: string; text: string }>(), assistants: any[] = [], raw: any[] = []
    const diagnostics: string[] = []
    let result: Awaited<ReturnType<typeof runProcess>>
    const failure = (message: string) => new ModelDriverFailure(message, { artifacts: root, raw_events: raw,
      message_start: start, message_delta: delta, result: terminal })
    try {
      const env: NodeJS.ProcessEnv = { ANTHROPIC_API_KEY: key, CLAUDE_CONFIG_DIR: home, DISABLE_AUTOUPDATER: '1',
        DISABLE_TELEMETRY: '1', DISABLE_ERROR_REPORTING: '1', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
        DISABLE_AUTO_COMPACT: '1', DISABLE_COMPACT: '1', CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK: '1' }
      for (const name of ['HOME', 'PATH', 'TMPDIR', 'LANG', 'LC_ALL', 'TZ']) if (process.env[name]) env[name] = process.env[name]
      const exchange = {
        begin(send: (value: unknown) => void) { send(JSON.parse(input.stdin)) },
        line(line: string, _send: (value: unknown) => void, end: () => void) {
          const event = JSON.parse(line)
          if (terminal) throw new Error('Claude emitted evidence after the terminal result')
          raw.push(event)
          if (event.parent_tool_use_id) throw new Error('Claude attempted a child/tool operation')
          if (event.type === 'system' && event.subtype === 'init') {
            if (init || event.model !== route.model || event.cwd !== root || event.permissionMode !== 'dontAsk'
              || event.apiKeySource !== 'ANTHROPIC_API_KEY' || !event.session_id
              || ![event.tools, event.mcp_servers, event.skills, event.plugins, event.slash_commands].every(v => Array.isArray(v) && v.length === 0)
              || !(route.driver.version === event.claude_code_version || route.driver.version.startsWith(event.claude_code_version + ' ')))
              throw new Error('Claude effective model, context or tool controls differ')
            init = event; return
          }
          if (!init || event.session_id !== init.session_id) throw new Error('Claude event Session identity differs')
          if (event.type === 'system') {
            if (event.subtype !== 'status' || !['requesting', 'responding', null].includes(event.status)) throw new Error('Claude hook, compaction or other system operation is unqualified')
            return
          }
          if (event.type === 'assistant') {
            const message = event.message
            if (!start || message?.id !== start.message.id || message.model !== route.model
              || message.role !== 'assistant' || !Array.isArray(message.content)
              || message.content.some((block: any) => !['text', 'thinking', 'redacted_thinking'].includes(block.type)
                || block.type === 'text' && typeof block.text !== 'string'))
              throw new Error('Claude assistant identity or operation differs')
            assistants.push(message); return
          }
          if (event.type === 'stream_event') {
            const e = event.event
            if (stopped) throw new Error('Claude emitted an additional response')
            if (delta && e.type !== 'message_stop') throw new Error('Claude emitted content after final usage/stop reason')
            if (e.type === 'message_start') {
              if (start || e.message?.model !== route.model || e.message.role !== 'assistant' || !e.message.id) throw new Error('Claude response identity is ambiguous')
              start = e
            } else if (!start) throw new Error('Claude stream precedes response identity')
            else if (e.type === 'content_block_start') {
              if (active !== null || e.index !== blocks.size || !['text', 'thinking', 'redacted_thinking'].includes(e.content_block?.type)
                || e.content_block.type === 'text' && typeof e.content_block.text !== 'string')
                throw new Error('Claude attempted an unqualified block or operation')
              blocks.set(e.index, { type: e.content_block.type, text: e.content_block.text ?? '' }); active = e.index
            } else if (e.type === 'content_block_delta') {
              if (active !== e.index) throw new Error('Claude delta has no active block')
              const block = blocks.get(e.index)!
              if (e.delta?.type === 'text_delta' && block.type === 'text' && typeof e.delta.text === 'string') block.text += e.delta.text
              else if (block.type !== 'text' && ['thinking_delta', 'signature_delta'].includes(e.delta?.type)) {}
              else throw new Error('Claude content delta is unqualified')
            } else if (e.type === 'content_block_stop') {
              if (active !== e.index) throw new Error('Claude block stop is ambiguous'); active = null
            } else if (e.type === 'message_delta') {
              if (active !== null || delta || e.delta?.stop_reason !== 'end_turn') throw new Error('Claude response is truncated, continued or selecting CLI tools')
              delta = e; decodeClaudeUsage({ ...start.message.usage, ...e.usage })
            } else if (e.type === 'message_stop') {
              if (!delta || active !== null) throw new Error('Claude response stop lacks full usage/content'); stopped = true
            } else throw new Error('Claude raw event is unqualified')
            return
          }
          if (event.type === 'result') {
            terminal = event
            if (!stopped || !delta || event.subtype !== 'success' || event.is_error !== false || event.num_turns !== 1
              || event.stop_reason !== 'end_turn' || event.terminal_reason !== 'completed'
              || !Array.isArray(event.permission_denials) || event.permission_denials.length
              || event.subagent_stats?.spawned !== 0 || event.subagent_stats?.max_depth !== 0)
              throw new Error('Claude terminal result is ineligible')
            end(); return
          }
          throw new Error('Claude attempted an unqualified event or operation')
        },
      }
      await beforeLaunch(); signal.throwIfAborted(); assertDispatch()
      result = await runProcess(launch.interpreter?.path ?? executable, launch.interpreter ? [executable, ...argv] : argv,
        root, '', signal, route.limits.max_capture_bytes, env, exchange)
    } catch (error) {
      ownershipUnknown = error instanceof ModelOwnershipError
      if (ownershipUnknown) throw new ModelOwnershipError('Claude process ownership is unresolved', {
        process: (error as ModelOwnershipError).evidence, private_config_home: home,
        artifacts: root, raw_events: raw, message_start: start, message_delta: delta, result: terminal })
      throw error
    } finally { if (!ownershipUnknown) await rm(home, { recursive: true, force: true }) }
    await writeFile(join(root, 'private-cli-events.jsonl'), result.stdout, { mode: 0o600 })
    await writeFile(join(root, 'private-cli-stderr.log'), result.stderr, { mode: 0o600 })
    if (result.code !== 0 || result.signal || result.overflow || result.aborted || result.protocolError || result.unfinishedLine)
      throw failure('Claude response failed, was interrupted or was truncated: ' + (result.protocolError ?? result.code))
    try {
    if (!terminal || !start || !delta || !stopped || assistants.length === 0) throw failure('Claude completion is missing raw response evidence')
    const usage = { ...start.message.usage, ...delta.usage }
    if (canonicalJson(decodeClaudeUsage(usage)) !== canonicalJson(decodeClaudeUsage(terminal.usage))) throw failure('Claude result usage differs from raw provider usage')
    const text = [...blocks.values()].filter(b => b.type === 'text').map(b => b.text).join('')
    const assistantText = assistants.flatMap(m => m.content).filter(b => b.type === 'text').map(b => b.text).join('')
    if (text !== assistantText || terminal.result !== text || Buffer.byteLength(text) > route.limits.max_answer_bytes)
      throw failure('Claude answer differs from raw/assistant/result evidence or exceeds the bound')
    if (Object.keys(terminal.modelUsage ?? {}).length !== 1 || !terminal.modelUsage[route.model]) throw failure('Claude model usage identity is ambiguous')
    await writeFile(join(root, 'answer.txt'), text, { mode: 0o600, flag: 'wx' })
    return { text, raw_usage: usage, thread_id: init.session_id, reported_model: start.message.model, reported_provider: null,
      diagnostics, terminal, elapsed_ms: result.elapsed_ms }
    } catch (error) { if (error instanceof ModelDriverFailure) throw error; throw failure(String(error)) }
  }
  usage(raw: unknown) { return decodeClaudeUsage(raw) }
}
