import { cp, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

const [outputArg, prototypeArg] = process.argv.slice(2)
if (!outputArg || !prototypeArg) throw new Error('Usage: m1-integrated.mjs <fresh-output> <qualified-prototype-checkout>')
const output = resolve(outputArg), prototype = resolve(prototypeArg)
const packageRoot = fileURLToPath(new URL('../', import.meta.url))
const metadata = JSON.parse(await readFile(join(prototype, 'package.json'), 'utf8'))
if (metadata.name !== 'dsh-superagent' || metadata.version !== '0.1.0' || metadata.packageManager !== 'pnpm@11.7.0') throw new Error('Prototype identity/pairing needs explicit reassessment')
await mkdir(output, { recursive: false })
const consumer = join(output, 'consumer')
await mkdir(consumer)
for (const name of ['package.json', 'dist', 'examples']) await cp(join(packageRoot, name), join(consumer, name), { recursive: true })
await mkdir(join(consumer, 'node_modules'))
const roots = [join(prototype, 'node_modules'), join(packageRoot, 'node_modules')]
const linked = new Set()
for (const source of roots) for (const entry of await readdir(source, { withFileTypes: true })) {
  if (entry.name.startsWith('.') || entry.name === 'dsh-superagent') continue
  if (entry.name.startsWith('@')) {
    await mkdir(join(consumer, 'node_modules', entry.name), { recursive: true })
    for (const name of await readdir(join(source, entry.name))) {
      const key = `${entry.name}/${name}`
      if (linked.has(key)) continue
      await symlink(join(source, key), join(consumer, 'node_modules', key)); linked.add(key)
    }
  } else if (!linked.has(entry.name)) {
    await symlink(join(source, entry.name), join(consumer, 'node_modules', entry.name)); linked.add(entry.name)
  }
}
const installed = join(consumer, 'node_modules/dsh-superagent')
await mkdir(installed)
for (const name of ['package.json', 'lib', 'prompts', 'locale', 'skills']) await cp(join(prototype, name), join(installed, name), { recursive: true })
const service = join(output, 'service-check/scripts')
await mkdir(service, { recursive: true })
const scriptBytes = await readFile(join(prototype, 'scripts/dsh-superagent'))
await writeFile(join(service, 'dsh-superagent'), scriptBytes, { flag: 'wx' })
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
await writeFile(join(output, 'consumer-pins.json'), JSON.stringify({ prototype_head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: prototype, encoding: 'utf8' }).trim(),
  prototype_package_sha256: hash(await readFile(join(prototype, 'package.json'))), prototype_entry_sha256: hash(await readFile(join(prototype, 'lib/index.js'))),
  service_script_sha256: hash(scriptBytes), prototype_lock_sha256: hash(await readFile(join(prototype, 'pnpm-lock.yaml'))),
  helper_lock_sha256: hash(await readFile(join(packageRoot, 'pnpm-lock.yaml'))), dependency_roots: roots,
  scope: 'Public package exports and native integration; copied artifact source and exact pinned installed dependencies', external_messages: 0 }, null, 2) + '\n', { flag: 'wx' })
execFileSync(process.execPath, [join(consumer, 'examples/superagent/integration.mjs'), output], { cwd: consumer, stdio: 'inherit' })
