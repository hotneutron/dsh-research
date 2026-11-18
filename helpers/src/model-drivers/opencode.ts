import { constants } from 'node:fs'
import { open, readFile, writeFile, realpath, mkdtemp, mkdir, rm, stat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { tmpdir, userInfo } from 'node:os'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import { canonicalJson, sha256 } from '../bindings.js'
import { encodeModelContext } from '../model-context.js'
import type { ModelRoute, ExecutablePin } from '../model-policy.js'
import { ModelDriverFailure, ModelOwnershipError } from '../model-transport.js'
import type { DriverCompletion, DriverObservation, EncodedModelInput, TextModelDriver } from '../model-transport.js'
import { pinnedBytes, observeFrozenCli, runProcess } from './cli-process.js'
import { openCodeProxy, decodeChatUsage } from './opencode-proxy.js'
export { decodeChatUsage } from './opencode-proxy.js'

const providerID = 'dsh-model-provider', agentID = 'dsh-model'
const count = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
export const OpenCodeModelSpecSchema = z.strictObject({ model_id: z.string().regex(/^[a-zA-Z0-9_.:/-]{1,128}$/),
  context_tokens: count, output_tokens: count })

/** OpenCode subtracts cache and reasoning components. Report aggregates; subcounts are not independently observed. */
export function decodeOpenCodeUsage(value: unknown): TokenUsage {
  const raw = value as any
  const counter = (v: unknown) => {
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw new Error('Required OpenCode token counter is unresolved')
    return v
  }
  const input = counter(raw?.input) + counter(raw?.cache?.read) + counter(raw?.cache?.write)
  const output = counter(raw?.output) + counter(raw?.reasoning), total = counter(raw?.total)
  if (!Number.isSafeInteger(input + output) || input === 0 || output === 0 || total !== input + output)
    throw new Error('OpenCode aggregate usage is absent, inconsistent or overflowing')
  return { inputTokens: input, outputTokens: output, totalTokens: total }
}

/** One bundled OpenAI-compatible chat SDK; no arbitrary provider packages or native research tools. */
export class OpenCodeDriver implements TextModelDriver {
  readonly id = 'opencode-run-v1'
  private readonly observations = new Map<string, { runtime: string; config: ExecutablePin }>()
  async disposeObservation(root: string, ownershipUnknown: boolean) {
    const owned = this.observations.get(root)
    this.observations.delete(root)
    if (owned && !ownershipUnknown) await rm(owned.runtime, { recursive: true, force: true })
  }
  encode(context: unknown, instructions: string, schema: unknown | null, delivery: ModelRoute['driver']['context_delivery']): EncodedModelInput {
    if (delivery !== 'stdin') throw new Error('OpenCode only qualifies complete stdin context')
    return { stdin: encodeModelContext(context), instructions, schema,
      document: 'Supply exactly the next response for the approved DSH context. Native logical roles govern interpretation. ' +
        'Native directory hints describe an isolated model runtime; DSH context owns project paths and authority. ' +
        'CLI tools and external operations are disabled.\n' + instructions +
        (schema === null ? '' : '\nReturn JSON matching this schema:\n' + canonicalJson(schema)), native_context_bytes: 16384 }
  }
  private async key(route: Readonly<ModelRoute>) {
    const path = route.driver.opencode?.api_key_file
    if (!path || !isAbsolute(path) || path !== route.authentication.protected_reference || await realpath(path) !== path)
      throw new Error('OpenCode requires a canonical protected API-key file')
    const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const info = await file.stat()
      if (!info.isFile() || info.size > 16384 || (info.mode & 0o077) !== 0) throw new Error('OpenCode API key is not a protected bounded regular file')
      const key = new TextDecoder('utf-8', { fatal: true }).decode(await file.readFile()).trim()
      if (!key || /[\r\n\0]/.test(key)) throw new Error('OpenCode API-key file format is invalid')
      return key
    } finally { await file.close() }
  }
  private async specification(route: Readonly<ModelRoute>) {
    const spec = OpenCodeModelSpecSchema.parse(JSON.parse((await pinnedBytes(route.driver.opencode!.model_catalog)).toString('utf8')))
    if (spec.model_id !== route.model) throw new Error('OpenCode model specification differs from the route')
    return spec
  }
  private async unmanagedHost() {
    const paths = process.platform === 'darwin' ? [
      '/Library/Application Support/opencode/opencode.json', '/Library/Application Support/opencode/opencode.jsonc',
      `/Library/Managed Preferences/${userInfo().username}/ai.opencode.managed.plist`, '/Library/Managed Preferences/ai.opencode.managed.plist',
    ] : process.platform === 'linux' ? ['/etc/opencode/opencode.json', '/etc/opencode/opencode.jsonc'] : []
    if (!['darwin', 'linux'].includes(process.platform)) throw new Error('OpenCode host platform is unqualified')
    for (const path of paths) {
      try { await stat(path); throw new Error('OpenCode managed host requires separate configuration qualification') }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    }
  }
  private environment(root: string, config: unknown, key: string): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { OPENCODE_TEST_HOME: join(root, 'home'), OPENCODE_CONFIG_DIR: join(root, 'config'),
      OPENCODE_CONFIG_CONTENT: canonicalJson(config), OPENCODE_MODELS_PATH: join(root, 'models.json'), DSH_MODEL_API_KEY: key,
      OPENCODE_SERVER_PASSWORD: randomBytes(32).toString('hex'), OPENCODE_SERVER_USERNAME: 'dsh-model',
      OPENCODE_PURE: 'true', OPENCODE_DISABLE_DEFAULT_PLUGINS: 'true', OPENCODE_DISABLE_PROJECT_CONFIG: 'true',
      OPENCODE_DISABLE_CLAUDE_CODE: 'true', OPENCODE_DISABLE_EXTERNAL_SKILLS: 'true', OPENCODE_DISABLE_MODELS_FETCH: 'true',
      OPENCODE_DISABLE_AUTOCOMPACT: 'true', OPENCODE_DISABLE_PRUNE: 'true', OPENCODE_DISABLE_AUTOUPDATE: 'true',
      OPENCODE_DISABLE_SHARE: 'true', OPENCODE_DISABLE_LSP_DOWNLOAD: 'true', OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER: 'true' }
    for (const name of ['HOME', 'PATH', 'TMPDIR', 'LANG', 'LC_ALL', 'TZ']) if (process.env[name]) env[name] = process.env[name]
    for (const name of ['XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_STATE_HOME', 'XDG_CACHE_HOME']) env[name] = join(root, name.toLowerCase())
    return env
  }
  private config(route: Readonly<ModelRoute>, input: Readonly<EncodedModelInput>, spec: z.infer<typeof OpenCodeModelSpecSchema>) {
    return { model: `${providerID}/${route.model}`, small_model: `${providerID}/${route.model}`, default_agent: agentID,
      enabled_providers: [providerID], share: 'disabled', autoupdate: false, snapshot: false, plugin: [], mcp: {}, instructions: [],
      permission: { '*': 'deny' }, compaction: { auto: false, prune: false }, experimental: { continue_loop_on_deny: false },
      agent: { [agentID]: { mode: 'primary', prompt: input.document, permission: { '*': 'deny' } },
        ...Object.fromEntries(['build', 'plan', 'general', 'explore', 'title', 'summary', 'compaction'].map(name => [name, { disable: true }])) },
      provider: { [providerID]: { name: 'Scoped DSH OpenAI-compatible route', npm: '@ai-sdk/openai-compatible',
        options: { baseURL: route.driver.opencode!.base_url, apiKey: '{env:DSH_MODEL_API_KEY}', includeUsage: true },
        models: { [route.model]: { id: route.model, name: route.model, tool_call: false,
          limit: { context: spec.context_tokens, output: spec.output_tokens } } } } } }
  }
  async observe(route: Readonly<ModelRoute>, root: string, signal: AbortSignal, input?: Readonly<EncodedModelInput>): Promise<DriverObservation> {
    if (!input?.document) throw new Error('OpenCode needs the exact frozen model framing before observation')
    await this.unmanagedHost(); await this.key(route)
    const spec = await this.specification(route), runtime = await realpath(await mkdtemp(join(tmpdir(), 'dsh-opencode-runtime-')))
    if (Buffer.byteLength(runtime) > 256) { await rm(runtime, { recursive: true, force: true }); throw new Error('OpenCode runtime path exceeds qualified framing bound') }
    let ownershipUnknown = false, completed = false
    try {
      await mkdir(join(runtime, 'home')); await mkdir(join(runtime, 'config'))
      await writeFile(join(runtime, 'models.json'), '{}', { mode: 0o600 })
      const config = this.config(route, input, spec), env = this.environment(runtime, config, 'dsh-preflight-no-auth')
      const observation = await observeFrozenCli(route, root, signal, env)
      const probe = async (args: string[], name: string) => {
        const launch = observation.launch
        const result = await runProcess(launch.interpreter?.path ?? launch.executable.path,
          launch.interpreter ? [launch.executable.path, ...args] : args, runtime, '', signal, Math.min(route.limits.max_capture_bytes, 262144), env)
        await writeFile(join(root, name + '.json'), result.stdout, { mode: 0o600 })
        if (result.code !== 0 || result.signal || result.overflow || result.aborted) throw new Error('OpenCode control observation failed')
        return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(result.stdout))
      }
      const effective = await probe(['debug', 'config', '--pure'], 'private-resolved-config')
      const agent = await probe(['debug', 'agent', agentID, '--pure'], 'private-resolved-agent')
      if (effective.model !== config.model || effective.default_agent !== agentID || effective.share !== 'disabled'
        || effective.permission?.['*'] !== 'deny' || effective.compaction?.auto !== false || effective.compaction?.prune !== false
        || effective.autoupdate !== false || effective.snapshot !== false || effective.plugin?.length
        || Object.keys(effective.mcp ?? {}).length || effective.instructions?.length
        || canonicalJson(effective.enabled_providers) !== canonicalJson([providerID])
        || Object.keys(effective.provider ?? {}).length !== 1 || effective.provider[providerID]?.npm !== '@ai-sdk/openai-compatible'
        || agent.name !== agentID || agent.mode !== 'primary' || agent.prompt !== input.document || agent.steps !== undefined
        || !agent.tools || Object.keys(agent.tools).length === 0 || Object.values(agent.tools).some(value => value !== false))
        throw new Error('OpenCode effective controls differ from the accepted transport')
      const bytes = Buffer.from(canonicalJson(config)), path = join(root, 'private-opencode-config.json')
      await writeFile(path, bytes, { mode: 0o600, flag: 'wx' })
      const owned = { runtime, config: { path, sha256: sha256(bytes), size_bytes: bytes.length } }
      await writeFile(join(root, 'private-opencode-runtime.json'), canonicalJson(owned), { mode: 0o600 })
      this.observations.set(root, owned)
      completed = true; return observation
    } catch (error) {
      ownershipUnknown = error instanceof ModelOwnershipError
      if (ownershipUnknown) throw new ModelOwnershipError('OpenCode observation ownership is unresolved', { process: (error as ModelOwnershipError).evidence, private_runtime: runtime })
      throw error
    } finally { if (!completed && !ownershipUnknown) await rm(runtime, { recursive: true, force: true }) }
  }
  async run(route: Readonly<ModelRoute>, input: EncodedModelInput, root: string, signal: AbortSignal,
    beforeLaunch: () => Promise<void>, assertDispatch: () => void): Promise<DriverCompletion> {
    const owned = this.observations.get(root)
    if (!owned) throw new Error('OpenCode request has no owned observation')
    const runtime = owned.runtime
    let ownershipUnknown = false, terminal: any = null, session: string | null = null, message: string | null = null
    const events: any[] = [], text: string[] = [], seen = new Set<string>()
    let proxy: Awaited<ReturnType<typeof openCodeProxy>> | null = null
    const failure = (reason: string) => new ModelDriverFailure(reason, { artifacts: root, native_events: events,
      native_tokens: terminal?.part?.tokens ?? null, upstream: proxy?.evidence() ?? null })
    let result: Awaited<ReturnType<typeof runProcess>>
    let credential: string | null = null
    let protectedOutput = false
    const sanitized = (value: any): any => {
      if (typeof value === 'string') {
        for (const secret of [credential, proxy?.token]) if (secret && value.includes(secret)) {
          protectedOutput = true; value = value.split(secret).join('[REDACTED_CREDENTIAL]')
        }
        return value
      }
      if (Array.isArray(value)) return value.map(sanitized)
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [sanitized(key), sanitized(item)]))
      return value
    }
    try {
      const stored = JSON.parse(await readFile(join(root, 'private-opencode-runtime.json'), 'utf8'))
      if (canonicalJson(stored) !== canonicalJson(owned) || await realpath(runtime) !== runtime)
        throw new Error('OpenCode runtime mapping differs from its owned observation')
      const key = await this.key(route), config = JSON.parse((await pinnedBytes(stored.config)).toString('utf8'))
      credential = key
      if (canonicalJson(config) !== canonicalJson(this.config(route, input, await this.specification(route)))) throw new Error('OpenCode frozen configuration changed')
      const executable = join(root, 'pinned-executable.mjs'); await pinnedBytes({ ...route.driver.executable, path: executable })
      const launch = JSON.parse(await readFile(join(root, 'frozen-launch.json'), 'utf8')) as DriverObservation['launch']
      if (launch.executable.path !== executable || launch.executable.sha256 !== route.driver.executable.sha256) throw new Error('OpenCode frozen launch mapping changed')
      if (launch.interpreter) await pinnedBytes(launch.interpreter)
      const argv = ['run', '--pure', '--model', `${providerID}/${route.model}`, '--agent', agentID, '--title', 'DSH model request', '--format', 'json']
      await writeFile(join(root, 'private-cli-input.txt'), input.stdin, { mode: 0o600 }); await writeFile(join(root, 'private-cli-argv.json'), canonicalJson(argv), { mode: 0o600 })
      proxy = await openCodeProxy({route,input,runtime,artifacts:root,credential:key,signal,beforeLaunch,assertDispatch})
      const runConfig=structuredClone(config); runConfig.provider[providerID].options.baseURL=proxy.baseURL
      const exchange = { initialInput: input.stdin, begin() {}, line(line: string) {
        const event = JSON.parse(line); events.push(event)
        if (terminal || !['step_start', 'text', 'reasoning', 'step_finish'].includes(event.type)) throw new Error('OpenCode continued, failed or attempted a native operation')
        const part = event.part
        if (!event.sessionID || part?.sessionID !== event.sessionID || !part.messageID || !part.id || seen.has(part.id)) throw new Error('OpenCode part identity is ambiguous')
        seen.add(part.id)
        if (event.type === 'step_start') {
          if (session || part.type !== 'step-start') throw new Error('OpenCode emitted an additional model step')
          session = event.sessionID; message = part.messageID; return
        }
        if (session !== event.sessionID || message !== part.messageID) throw new Error('OpenCode Session/message identity differs')
        if (event.type === 'text' || event.type === 'reasoning') {
          if (part.type !== event.type || typeof part.text !== 'string' || !Number.isFinite(part.time?.end)) throw new Error('OpenCode text is incomplete')
          if (event.type === 'text') text.push(part.text)
        } else {
          terminal = event
          if (part.type !== 'step-finish' || part.reason !== 'stop') throw new Error('OpenCode response is truncated or unqualified')
          decodeOpenCodeUsage(part.tokens)
        }
      } }
      await beforeLaunch(); signal.throwIfAborted(); assertDispatch()
      result = await runProcess(launch.interpreter?.path ?? executable, launch.interpreter ? [executable, ...argv] : argv,
        runtime, '', signal, route.limits.max_capture_bytes, this.environment(runtime, runConfig, proxy.token), exchange)
      const redact = (bytes: Buffer) => Buffer.from(sanitized(bytes.toString('utf8')))
      if ([key, proxy.token].some(secret => text.join('').includes(secret))) {
        protectedOutput = true
        for(const event of events) if(event.type==='text') event.part.text='[REDACTED_CREDENTIAL]'
      }
      events.splice(0, events.length, ...sanitized(events)); terminal = sanitized(terminal)
      const stderr = result.stderr.toString('utf8').split('\n').map(line => {
        try { return canonicalJson(sanitized(JSON.parse(line))) } catch { return sanitized(line) }
      }).join('\n')
      const directSecret = [key,proxy.token].some(secret=>result.stdout.includes(Buffer.from(secret))||result.stderr.includes(Buffer.from(secret)))
      await writeFile(join(root, 'private-cli-events.jsonl'), protectedOutput || directSecret ? events.map(event => canonicalJson(event)).join('\n') + '\n' : result.stdout, { mode: 0o600 })
      await writeFile(join(root, 'private-cli-stderr.log'), directSecret || protectedOutput ? stderr : redact(result.stderr), { mode: 0o600 })
      await writeFile(join(root, 'capture-identity.json'), canonicalJson({ stdout_sha256: sha256(result.stdout), stderr_sha256: sha256(result.stderr),
        stdout_bytes: result.stdout.length, stderr_bytes: result.stderr.length, redacted: protectedOutput || directSecret }), { mode: 0o600 })
      if (protectedOutput || directSecret) throw failure('OpenCode returned protected authentication material')
    } catch (error) {
      try { await proxy?.close() } catch { /* Evidence remains available even when its filesystem write fails. */ }
      events.splice(0, events.length, ...sanitized(events)); terminal = sanitized(terminal)
      ownershipUnknown = error instanceof ModelOwnershipError
      if (ownershipUnknown) throw new ModelOwnershipError('OpenCode process ownership is unresolved', { process: (error as ModelOwnershipError).evidence,
        private_runtime: runtime, artifacts: root, native_events: events, native_tokens: terminal?.part?.tokens ?? null, upstream:proxy?.evidence()??null })
      if (error instanceof ModelDriverFailure) throw error
      throw failure(String(error))
    } finally {
      try { await proxy?.close() } catch (error) { if(!ownershipUnknown) throw failure(String(error)) }
      try { await this.disposeObservation(root, ownershipUnknown) } catch (error) { throw failure(String(error)) }
    }
    if (result.code !== 0 || result.signal || result.overflow || result.aborted || result.protocolError || result.unfinishedLine || !terminal || text.length === 0)
      throw failure('OpenCode response is interrupted, failed or incomplete: ' + (proxy?.evidence().error ?? result.protocolError ?? result.code))
    try {
    const answer = text.join('')
    if ([credential,proxy?.token].some(secret=>secret&&answer.includes(secret))) throw failure('OpenCode final text contains protected authentication material')
    const upstream=proxy?.evidence().complete
    if(!upstream) throw failure('OpenCode has no audited upstream completion')
    const nativeUsage=decodeOpenCodeUsage(terminal.part.tokens), rawUsage=decodeChatUsage(upstream.raw_usage)
    if(nativeUsage.inputTokens!==rawUsage.inputTokens+(rawUsage.cacheReadTokens??0)||nativeUsage.outputTokens!==rawUsage.outputTokens||nativeUsage.totalTokens!==rawUsage.totalTokens) throw failure('OpenCode native aggregates differ from upstream usage')
    if (Buffer.byteLength(answer) > route.limits.max_answer_bytes) throw failure('OpenCode answer exceeds the route bound')
    await writeFile(join(root, 'answer.txt'), answer, { mode: 0o600, flag: 'wx' })
    return { text: answer, raw_usage: {upstream,native:terminal.part.tokens}, thread_id: session, reported_provider: null, reported_model: upstream.model,
      diagnostics: ['Raw upstream usage and model are audited; served-provider identity remains unobserved'],
      terminal, elapsed_ms: result.elapsed_ms }
    }catch(error){if(error instanceof ModelDriverFailure)throw error;throw failure(String(error))}
  }
  usage(raw: unknown) { return decodeChatUsage((raw as any)?.upstream?.raw_usage) }
}
