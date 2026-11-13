// Exact declared-scope coverage for the disposable default-worker route.
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { auditCoverage, canonicalJson, sha256 } from 'dsh-research'

export async function defaultCoverage(f) {
  const bytes = await readFile(join(f.root, 'qualification-plan.json'))
  const plan = JSON.parse(bytes.toString())
  const scope = await f.artifacts.writeOnce('snapshots/default-coverage/scope.json', bytes)
  const budget = await f.artifacts.writeOnce('snapshots/default-coverage/budget.json', Buffer.from(canonicalJson(plan.budget)))
  const binding = f.table.get('synthetic-m2').binding
  const matrix = { id: 'default-worker-released-scripted', binding, scope, qualification_budget_ref: budget,
    cells: plan.required_cells.map(c => ({ id: c.id, property: c.id.split(':')[0], kind: 'boundary', assurance: 'fixture_verified',
      assertions: Object.fromEntries(c.assertions.map(a => [a, true])), applicability_rule: null })) }
  const matrixRef = await f.artifacts.writeOnce('snapshots/default-coverage/matrix.json', Buffer.from(canonicalJson(matrix)))
  const observationUri = id => `snapshots/default-coverage/observation-${sha256(id)}.json`
  return {
    async record(cellId, assertions, facts) {
      const evidence = await f.artifacts.writeOnce(`snapshots/default-coverage/evidence-${sha256(cellId)}.json`, Buffer.from(canonicalJson(facts)))
      const observation = { cell_id: cellId, binding, scope, assurance: 'fixture_verified', evidence, assertions, applicability_rule: null }
      await f.artifacts.writeOnce(observationUri(cellId), Buffer.from(canonicalJson(observation)))
    },
    async audit() {
      const observations = []
      for (const cell of matrix.cells) {
        try { observations.push(JSON.parse((await readFile(join(f.root, observationUri(cell.id)))).toString())) }
        catch (error) { if (error.code !== 'ENOENT') throw error }
      }
      // Validate every retained evidence hash before allowing an observation to close a cell.
      for (const observation of observations) await f.artifacts.read(observation.evidence)
      return { matrix: matrixRef, ...auditCoverage(matrix, observations), limitation: 'Only this frozen scripted released-input stratum; all other properties and semantic/live strata remain unqualified' }
    },
  }
}
