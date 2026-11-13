// Disposable process-tree witness; never installed as a scientific producer.
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
const [inputPath] = process.argv.slice(2)
const input = JSON.parse(readFileSync(inputPath, 'utf8'))
if (input.qualification_case === 'tree-deadline' || input.qualification_case === 'running-loss') {
  const identity = pid => {
    const line = readFileSync(`/proc/${pid}/stat`, 'utf8')
    return { namespace_pid: pid, start_ticks: line.slice(line.lastIndexOf(')') + 2).split(/\s+/)[19] }
  }
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })
  const path = input.process_marker
  mkdirSync(dirname(path), { recursive: true })
  child.once('spawn', () => writeFileSync(path, JSON.stringify({ case: input.qualification_case,
    boot_id: readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(), pid_namespace: readlinkSync('/proc/self/ns/pid'),
    processes: [identity(process.pid), identity(child.pid)] }), { flag: 'wx' }))
  process.on('SIGTERM', () => { console.log(JSON.stringify({ score: 1 })); process.exit(0) })
  setInterval(() => {}, 1000)
} else console.log(JSON.stringify({ score: 1 }))
