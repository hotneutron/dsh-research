import { hostname } from 'node:os'
import { readFile } from 'node:fs/promises'
import { canonicalJson, ByteRef, sha256 } from 'dsh-research'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { shellLiteral } from 'dsh-research/native'

// Registered fixture procedure; it delegates observations to the existing shell provider.
// The pinned producer uses the existing autoresearch lease namespace before CUDA calls.
export function createGpuGuard({ ctx, artifacts, identity, resource, namespace }) {
  const write = (uri, value) => artifacts.write(uri, Buffer.from(canonicalJson(value)))
  async function observe(signal) {
    const command = ['nvidia-smi', '--query-compute-apps=gpu_uuid,pid', '--format=csv,noheader,nounits'].map(shellLiteral).join(' ')
    const spec = ctx.shell.resolve({ command, workdir: artifacts.root, timeoutMs: 2000, onExpiry: 'kill', stdoutMaxBytes: 8192, signal })
    const facts = await (await ctx.shell.execute(spec)).result()
    if (facts.exitCode !== 0 || facts.timedOut || facts.aborted || facts.stdout.truncated) throw new Error('GPU process observation unavailable')
    const deviceCommand = ['nvidia-smi', '--id=' + resource.device_uuid, '--query-gpu=uuid,name,driver_version', '--format=csv,noheader,nounits'].map(shellLiteral).join(' ')
    const deviceSpec = ctx.shell.resolve({ command: deviceCommand, workdir: artifacts.root, timeoutMs: 2000, onExpiry: 'kill', stdoutMaxBytes: 8192, signal })
    const device = await (await ctx.shell.execute(deviceSpec)).result()
    if (device.exitCode !== 0 || device.timedOut || device.aborted || device.stdout.truncated || !device.stdout.text.startsWith(resource.device_uuid + ',')) throw new Error('Exact GPU device observation unavailable')
    const pids = facts.stdout.text.trim().split('\n').filter(Boolean).map(line => line.split(',').map(value => value.trim()))
    return { host: hostname(), device_uuid: resource.device_uuid, device: device.stdout.text.trim(), processes: pids.filter(row => row[0] === resource.device_uuid), native: facts, native_device: device }
  }
  return {
    identity,
    async preflight({ manifest, manifestRef }, signal) {
      const input = JSON.parse(Buffer.from(await artifacts.read(manifest.inputs[0].artifact)).toString())
      const registered = JSON.parse(Buffer.from(await artifacts.read(namespace)).toString())
      if (input.host !== resource.host || input.device_uuid !== resource.device_uuid || input.project_root !== artifacts.root
        || input.lease_root !== registered.root) throw new Error('GPU input or registered lease namespace differs')
      const observation = await observe(signal)
      const version = randomUUID()
      const ref = await write(`local_artifacts/autoresearch/dsh/${manifest.goal.id}/gpu-preflight-${manifest.action_id}-${version}.json`, observation)
      return write(`local_artifacts/autoresearch/dsh/${manifest.goal.id}/gpu-ready-${manifest.action_id}-${version}.json`, {
        schema_version: 1, kind: 'gpu_preflight', manifest: manifestRef, guard: identity, resource,
        ready: observation.host === resource.host && observation.processes.length === 0, observation: ref,
      })
    },
    async settle(context, signal) {
      signal.throwIfAborted()
      const result = JSON.parse(Buffer.from(await artifacts.read(context.capture)).toString())
      const rawRef = ByteRef.parse({ uri: result.gpu_receipt_uri, sha256: result.gpu_receipt_sha256, size_bytes: result.gpu_receipt_size })
      const raw = JSON.parse(Buffer.from(await artifacts.read(rawRef)).toString())
      const spec = JSON.parse(Buffer.from(await artifacts.read(context.manifest.inputs[0].artifact)).toString())
      const registered = JSON.parse(Buffer.from(await artifacts.read(namespace)).toString())
      if (raw.kind !== 'gpu_producer_terminal' || raw.host !== resource.host || raw.device_uuid !== resource.device_uuid
        || raw.spec_sha256 !== context.manifest.inputs[0].artifact.sha256 || raw.ptx_sha256 !== spec.ptx_sha256
        || raw.lease_path !== join(registered.root, sha256(Buffer.from('gpu:' + resource.device_uuid)))
        || !Number.isSafeInteger(raw.pid) || raw.pid <= 0) throw new Error('GPU producer identity/input/code mismatch')
      const boot = (await readFile('/proc/sys/kernel/random/boot_id', 'utf8')).trim()
      if (boot !== raw.boot_id) throw new Error('GPU producer belongs to another boot')
      const observation = await observe(signal)
      const version = randomUUID()
      const ownProcess = observation.processes.some(row => Number(row[1]) === raw.pid)
      let processAlive = false
      try {
        const stat = await readFile(`/proc/${raw.pid}/stat`, 'utf8')
        const fields = stat.slice(stat.lastIndexOf(')') + 2).split(/\s+/)
        processAlive = fields[19] === raw.start_ticks && fields[0] !== 'Z'
      } catch (error) { if (error.code !== 'ENOENT') throw error }
      const ref = await write(`local_artifacts/autoresearch/dsh/${context.manifest.goal.id}/gpu-terminal-observation-${context.action_id}-${version}.json`, observation)
      return write(`local_artifacts/autoresearch/dsh/${context.manifest.goal.id}/gpu-settlement-${context.action_id}-${version}.json`, {
        schema_version: 1, kind: 'gpu_settlement', manifest: context.manifestRef, guard: identity, resource,
        action_id: context.action_id, attempt_id: context.attempt_id, dispatch_token: context.dispatch_token,
        admitted_revision: context.admitted_revision, native_terminal: context.native_terminal, capture: context.capture,
        lease: rawRef, observation: ref, complete_unit: raw.complete_unit === true,
        process_tree_quiescent: !processAlive && !ownProcess && raw.context_destroyed === true,
        device_context_quiescent: raw.device_synchronized === true && raw.context_destroyed === true,
        lease_released: raw.lease_was_owned === true && raw.lease_released === true,
      })
    },
  }
}
