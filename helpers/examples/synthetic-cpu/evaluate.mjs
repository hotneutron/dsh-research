import { readFileSync, writeFileSync } from 'node:fs'

const [inputPath, mode = 'negative'] = process.argv.slice(2)
const input = JSON.parse(readFileSync(inputPath, 'utf8'))
if (!Array.isArray(input.values) || input.values.some(value => typeof value !== 'number' || !Number.isFinite(value))) throw new Error('Expected released finite synthetic data')
if (mode === 'timeout-zero') {
  process.on('SIGTERM', () => { console.log(JSON.stringify({ score: 1 })); process.exit(0) })
  setInterval(() => {}, 1000)
} else if (mode === 'invalid-output') {
  console.log(JSON.stringify({ score: true }))
} else if (mode === 'drift') {
  writeFileSync(inputPath, JSON.stringify({ values: [99] }))
  console.log(JSON.stringify({ score: 1 }))
} else {
  console.log(JSON.stringify({ score: mode === 'positive' ? 1 : -1 }))
}
