// Fixed released engineering trace; measures actual key-comparison work, not GPU/model accuracy.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const [corpusPath, designPath, operation] = process.argv.slice(2)
if (operation !== 'evaluate') throw new Error('Only the frozen evaluation operation is permitted')
const bytes = await readFile(corpusPath), corpus = JSON.parse(bytes), design = JSON.parse(await readFile(designPath, 'utf8'))
if (!['history-list', 'binary-index', 'message-only'].includes(design.strategy)) throw new Error('Undeclared strategy')
const hash = value => createHash('sha256').update(value).digest('hex')
const key = event => JSON.stringify([event.message_id, event.version, event.body])
const compare = (left, right) => left === right ? 0 : left < right ? -1 : 1
const expected = [...new Set(corpus.events.map(key))].sort()
let work = 0, retained = []
if (design.strategy === 'history-list') {
  for (const event of corpus.events) {
    const current = key(event); let found = false
    for (const item of retained) { work++; if (compare(item, current) === 0) { found = true; break } }
    if (!found) retained.push(current)
  }
} else if (design.strategy === 'binary-index') {
  for (const event of corpus.events) {
    const current = key(event); let low = 0, high = retained.length, found = false
    while (low < high) {
      const middle = Math.floor((low+high)/2); work++; const order = compare(retained[middle], current)
      if (order === 0) { found = true; break }
      if (order < 0) low = middle+1; else high = middle
    }
    if (!found) retained.splice(low, 0, current)
  }
} else {
  const keys = []
  for (const event of corpus.events) {
    let found = false
    for (const current of keys) { work++; if (compare(current, event.message_id) === 0) { found = true; break } }
    if (!found) { keys.push(event.message_id); retained.push(key(event)) }
  }
}
let baselineWork = 0, baseline = []
for (const event of corpus.events) {
  const current = key(event); let found = false
  for (const item of baseline) { baselineWork++; if (compare(item, current) === 0) { found = true; break } }
  if (!found) baseline.push(current)
}
const digest = hash(JSON.stringify(retained.sort())), expectedDigest = hash(JSON.stringify(expected))
console.log(JSON.stringify({ strategy: design.strategy, corpus_sha256: hash(bytes), retained_digest: digest,
  comparison_unit: 'source_compare_function_invocations',
  retained_count: retained.length, input_count: corpus.events.length, comparisons: work, baseline_comparisons: baselineWork,
  preserves_versions: digest === expectedDigest, score: digest === expectedDigest ? 1-work/baselineWork : -1 }))
