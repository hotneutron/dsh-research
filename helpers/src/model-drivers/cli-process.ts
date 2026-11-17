import { spawn } from 'node:child_process'
import { readFile, writeFile, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { setTimeout as wait } from 'node:timers/promises'
import type { ExecutablePin } from '../model-policy.js'
import { sha256, canonicalJson } from '../bindings.js'
import type { ModelRoute } from '../model-policy.js'
import type { DriverObservation } from '../model-transport.js'
import { ModelOwnershipError } from '../model-transport.js'

export async function pinnedBytes(pin: ExecutablePin) {
  const bytes = await readFile(pin.path)
  if (bytes.length !== pin.size_bytes || sha256(bytes) !== pin.sha256) throw new Error('CLI executable/runtime pin differs')
  return bytes
}
export interface CliExchange {
  begin(send: (value: unknown) => void): void
  line(line: string, send: (value: unknown) => void, end: () => void): void
}
export async function runProcess(executable: string, argv: string[], cwd: string, stdin: string, signal: AbortSignal, maxBytes: number, env?: NodeJS.ProcessEnv, exchange?: CliExchange) {
  signal.throwIfAborted()
  const start = performance.now()
  const child = spawn(executable, argv, { cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32', env })
  let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), overflow = false
  let killTimer: ReturnType<typeof setTimeout> | undefined
  const kill = (name: NodeJS.Signals) => {
    try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, name); else child.kill(name) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error }
  }
  const stop = () => { kill('SIGTERM'); killTimer ??= setTimeout(() => kill('SIGKILL'), 2000) }
  signal.addEventListener('abort', stop, { once: true })
  child.stdin.on('error', () => {})
  let protocolError: unknown = null, pendingLine = Buffer.alloc(0)
  const send = (value: unknown) => child.stdin.write(canonicalJson(value) + '\n')
  const collect = (prior: Buffer, chunk: Buffer) => {
    const next = Buffer.concat([prior, chunk])
    if (next.length > maxBytes) { overflow = true; stop(); return next.subarray(0, maxBytes) }
    return next
  }
  child.stdout.on('data', chunk => {
    stdout = collect(stdout, Buffer.from(chunk))
    if (!exchange || overflow || protocolError) return
    pendingLine = Buffer.concat([pendingLine, Buffer.from(chunk)])
    try {
      let newline: number
      while ((newline = pendingLine.indexOf(10)) !== -1) {
        const line = new TextDecoder('utf-8', { fatal: true }).decode(pendingLine.subarray(0, newline))
        pendingLine = pendingLine.subarray(newline + 1)
        if (line) exchange.line(line, send, () => child.stdin.end())
      }
    } catch (error) { protocolError = error; stop() }
  })
  child.stderr.on('data', chunk => { stderr = collect(stderr, Buffer.from(chunk)) })
  if (exchange) { try { exchange.begin(send) } catch (error) { protocolError = error; stop() } }
  else child.stdin.end(stdin)
  let result: { code: number | null; signal: NodeJS.Signals | null }
  try { result = await new Promise((yes, no) => { child.once('error', no); child.once('close', (code, endedSignal) => yes({ code, signal: endedSignal })) }) }
  finally { signal.removeEventListener('abort', stop) }
  const groupAlive = () => {
    if (process.platform === 'win32' || !child.pid) return false
    try { process.kill(-child.pid, 0); return true } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false; return true }
  }
  // A leader close does not prove that descendants ended. Retain escalation until the owned group converges.
  if (signal.aborted || overflow || protocolError) {
    const until = performance.now() + 3000
    while (groupAlive() && performance.now() < until) await wait(50)
  }
  const ownershipResolved = !groupAlive()
  clearTimeout(killTimer)
  if (!ownershipResolved) throw new ModelOwnershipError('CLI process group remains unresolved after leader exit', { pid: child.pid, group_id: child.pid,
    code: result.code, signal: result.signal, aborted: signal.aborted, elapsed_ms: performance.now() - start, scope: 'owned POSIX process group; no escaped-descendant claim' })
  return { ...result, stdout, stderr, overflow, protocolError: protocolError === null ? null : String(protocolError),
    unfinishedLine: pendingLine.length > 0, elapsed_ms: performance.now() - start, aborted: signal.aborted }
}


export async function observeFrozenCli(route: Readonly<ModelRoute>, requestRoot: string, signal: AbortSignal): Promise<DriverObservation> {
    const bytes = await pinnedBytes(route.driver.executable)
    for (const pin of route.driver.runtime) await pinnedBytes(pin)
    const firstLine = bytes.subarray(0, Math.min(bytes.length, 1024)).toString().split('\n')[0] ?? ''
    if (firstLine.startsWith('#!')) {
      const interpreter = firstLine.slice(2).trim()
      if (!interpreter.startsWith('/') || interpreter.includes(' ') || !route.driver.runtime.some(pin => pin.path === interpreter))
        throw new Error('Script interpreter is not in the pinned runtime distribution')
    }
    const frozenExecutable = join(requestRoot, 'pinned-executable.mjs')
    await writeFile(frozenExecutable, bytes, { mode: 0o500, flag: 'wx' }); await chmod(frozenExecutable, 0o500)
    let interpreter: ExecutablePin | null = null
    if (firstLine.startsWith('#!')) {
      const pin = route.driver.runtime.find(value => value.path === firstLine.slice(2).trim())!
      const runtimeBytes = await pinnedBytes(pin), path = join(requestRoot, 'pinned-interpreter')
      await writeFile(path, runtimeBytes, { flag: 'wx', mode: 0o500 })
      interpreter = { path, sha256: pin.sha256, size_bytes: pin.size_bytes }
    }
    const launch = { executable: { path: frozenExecutable, sha256: sha256(bytes), size_bytes: bytes.length }, interpreter }
    await writeFile(join(requestRoot, 'frozen-launch.json'), canonicalJson(launch), { mode: 0o600 })
    const probe = await runProcess(interpreter?.path ?? frozenExecutable, interpreter ? [frozenExecutable, '--version'] : ['--version'], requestRoot, '', signal, Math.min(route.limits.max_capture_bytes, 65536))
    await writeFile(join(requestRoot, 'version-observation.json'), canonicalJson({ stdout: probe.stdout.toString(), stderr: probe.stderr.toString(),
      code: probe.code, signal: probe.signal, executable_sha256: sha256(bytes) }), { mode: 0o600 })
    if (probe.code !== 0 || probe.signal || probe.overflow || probe.aborted) throw new Error('CLI version observation is unresolved')
    return { executable: { ...route.driver.executable }, runtime: structuredClone(route.driver.runtime), version: probe.stdout.toString().trim(), launch }
}
