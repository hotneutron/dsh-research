// Controlled faults on the unchanged default native services and one persistent disposable record.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { NativeCoordinationTools, NativeReviewDriver } from 'dsh-research/native'
import { auditContinuity, canonicalJson, ResearchStateSchema } from 'dsh-research'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { text } from '../synthetic-cpu/fixture.mjs'

export function faultTable(table, kind, control, reopened) {
  let injected = reopened
  return new Proxy(table, { get(target, key) {
    if (key === 'update') return async (projectKey, transform) => {
      const previous = target.get(projectKey)
      const wrapped = current => {
        const next = transform(current)
        if (!injected && kind === 'review-association' && Object.values(next.review_requests).some(r => r.phase === 'observed')) {
          injected = true; throw new Error('Controlled loss before native review association commit')
        }
        return next
      }
      const committed = await target.update(projectKey, wrapped)
      if (!injected && kind === 'review-ack-lost' && committed.consumed_review_requests > previous.consumed_review_requests) {
        injected = true; throw new Error('Controlled durable review commit with lost acknowledgement')
      }
      if (!injected && ['admission-ack-lost', 'admission-ack-delayed'].includes(kind) && committed.consumed_attempts > previous.consumed_attempts) {
        injected = true
        if (kind === 'admission-ack-lost') throw new Error('Controlled durable admission commit with lost acknowledgement')
        control.entered = true
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Controlled admission acknowledgement was not released within its bound')), 5000)
          control.release = () => { clearTimeout(timer); resolve() }
        })
      }
      return committed
    }
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value
  } })
}
export function instrumentProtectedReads(artifacts, reads) {
  return new Proxy(artifacts, { get(target, key) {
    if (key === 'withReadPrefixes') return prefixes => instrumentProtectedReads(target.withReadPrefixes(prefixes), reads)
    if (key === 'read') return ref => { if (ref.uri === 'snapshots/sealed-canary.json') reads.push(ref.uri); return target.read(ref) }
    const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value
  } })
}
export async function installFault(f, ctx, author, kind, control, observe, coverage, reopened = false) {
  const coordination = new NativeCoordinationTools(ctx, { artifacts: f.artifacts, table: f.table, projectKey: 'synthetic-m2', authorSessionId: author.id,
    propose: args => { if (!f.makeSubject) throw new Error('Reopen cannot mint a new fault action'); return f.makeSubject(args.operation, args) } })
  const driver = await NativeReviewDriver.open(ctx, { artifacts: f.artifacts, table: f.config.table, projectKey: 'synthetic-m2',
    policy: f.config.policy, authorSessionId: author.id, deniedTools: ['skill'], assertActiveAuthority: f.config.assertActiveAuthority, observe })
  const disposers = [...coordination.tools(), driver.tool()].map(d => author.ctx.tools.register(d))
  if (!reopened) f.reviewerLLM.script.push(kind === 'review-timeout' ? 'hang' : options => {
    const block = options.messages.flatMap(m => m.content ?? []).findLast(b => b.type === 'text' && b.text.includes('REVIEW_PACKET_JSON\n'))
    const p = JSON.parse(block.text.split('REVIEW_PACKET_JSON\n').at(-1))
    return text(JSON.stringify({ decision: 'approve', reason: 'Exact disposable fault packet', review_id: p.review_id, action_id: p.action_id,
      manifest_sha256: kind === 'stale-review' ? '0'.repeat(64) : p.manifest_sha256, request_sha256: p.request_sha256 }))
  })
  let phase = 0, proposal, packet, result, report, before, recovery = null
  const saved = join(f.root, 'snapshots/fault-final-packet.json')
  if (reopened) packet = JSON.parse(await readFile(saved, 'utf8'))
  const last = messages => {
    const m = messages.filter(m => m.role === 'tool').at(-1)
    const body = m?.content.filter(b => b.type === 'text').map(b => b.text).join('') ?? ''
    try { return JSON.parse(body) } catch { return { error: body } }
  }
  const call = (name, args) => ({ name, args })
  const savePacket = async value => { packet = value; await f.artifacts.writeOnce('snapshots/fault-final-packet.json', Buffer.from(canonicalJson(value))) }
  const holding = ['review-timeout', 'review-unavailable', 'stale-review', 'review-ack-lost', 'admission-ack-lost', 'running-loss'].includes(kind)
  const primaryProperty = kind.startsWith('review-') || kind === 'stale-review' ? 'AUTH-1'
    : kind.startsWith('admission-') ? 'AUTH-2' : kind === 'source-drift' ? 'PROV-1'
      : ['protected-off', 'confirmation-off'].includes(kind) ? 'DATA-1' : kind === 'tree-deadline' ? 'EXEC-1'
        : kind === 'competing-runtime' ? 'STATE-1' : kind === 'backup-restore' ? 'STATE-2' : 'EXEC-3'
  const record = async (property, stage, predicate, facts) => {
    assert.equal(predicate, true, `${kind}:${stage}`)
    if ((await coverage.audit()).covered.includes(`${property}:${kind}:${stage}`)) return
    await coverage.record(`${property}:${kind}:${stage}`, { predicate }, facts)
  }
  const finish = async () => {
    report = { state: holding ? 'waiting' : 'progress', human_action: null, summary: `Bounded native fault ${kind}; evidence retained; no scientific steering question` }
    return call('orchestrator_report', report)
  }
  return {
    close() { disposers.reverse().forEach(d => d()) },
    packet() { return packet ?? { request: { mode: 'fault', case: kind } } },
    async step(messages) {
      if (reopened || report) return null
      if (phase++ === 0) return call('research_propose', { operation: 'positive', plan_revision: `fault-${kind}`, checkpoint: null, feedback_item_id: null })
      if (phase === 2) {
        proposal = last(messages); assert.ok(proposal.manifest)
        before = structuredClone(f.table.get('synthetic-m2'))
        if (['protected-off', 'confirmation-off'].includes(kind)) {
          const original = JSON.parse(Buffer.from(await f.artifacts.read(proposal.manifest)).toString())
          const canary = await f.artifacts.writeOnce('snapshots/sealed-canary.json', Buffer.from('{"sealed":true}'))
          const changed = structuredClone(original)
          changed.inputs[0].artifact = canary
          if (kind === 'protected-off') changed.inputs[0].access = 'sealed'
          else changed.binding.profile.confirmation = 'enabled'
          const manifest = await f.json('snapshots/fault-refused-manifest.json', changed)
          await savePacket({ manifestRef: manifest, request: { manifest, review: proposal.manifest, expected_revision: before.revision } })
          return call('research_run', packet.request)
        }
        return call('research_review', { manifest: proposal.manifest })
      }
      if (phase === 3) {
        result = last(messages)
        if (['protected-off', 'confirmation-off'].includes(kind)) { assert.equal(f.table.get('synthetic-m2').consumed_attempts, 0); return finish() }
        if (kind === 'review-association') {
          assert.equal(result.status, 'unknown')
          await ctx.subagents.waitForChildren(author)
          return call('research_review', { manifest: proposal.manifest })
        }
        if (['review-timeout', 'review-unavailable', 'stale-review', 'review-ack-lost'].includes(kind)) {
          assert.ok(['unavailable', 'unknown'].includes(result.status), canonicalJson(result))
          await savePacket({ manifestRef: proposal.manifest, review_result: result, request: null })
          return finish()
        }
      }
      const readyToRun = phase === 3 || (phase === 4 && kind === 'review-association')
      if (readyToRun) {
        result = last(messages); assert.equal(result.decision, 'approve', canonicalJson(result))
        await savePacket({ manifestRef: proposal.manifest, review_result: result,
          request: { manifest: proposal.manifest, review: result.review, expected_revision: result.state_revision } })
        if (kind === 'source-drift') {
          const m = JSON.parse(Buffer.from(await f.artifacts.read(proposal.manifest)).toString())
          const bytes = await f.artifacts.read(m.inputs[0].artifact)
          await f.artifacts.writeOnce('snapshots/fault-original-input.json', bytes)
          await writeFile(join(f.root, m.inputs[0].artifact.uri), '{"values":[99]}')
        }
        return call('research_run', packet.request)
      }
      if (phase === 4 || (phase === 5 && kind === 'review-association')) { result = last(messages); return finish() }
      return null
    },
    async inspect() {
      const state = f.table.get('synthetic-m2')
      return { case: kind, entered: control.entered === true, release_pending: typeof control.release === 'function',
        state, result: result ?? null, report: report ?? null, native_jobs: ctx.jobs.list(author.id),
        protected_reads: control.protectedReads.length, recovery }
    },
    async drill(operation) {
      if (operation === 'release') {
        assert.equal(control.entered, true); assert.equal(ctx.jobs.list(author.id).length, 0)
        await f.artifacts.writeOnce('snapshots/fault-before-ack-release.json', Buffer.from(canonicalJson({ state: f.table.get('synthetic-m2'), native_jobs: ctx.jobs.list(author.id) })))
        control.release(); control.release = null
      } else if (operation === 'replay') {
        const old = structuredClone(f.table.get('synthetic-m2'))
        if (packet.request) {
          try { result = await f.adapter.run(packet.request, author, AbortSignal.timeout(10000)) }
          catch (error) { result = { refused: true, reason: String(error) } }
        } else result = await driver.review(packet.manifestRef, author, AbortSignal.timeout(5000))
        assert.equal(f.table.get('synthetic-m2').consumed_attempts, old.consumed_attempts)
        assert.equal(f.table.get('synthetic-m2').consumed_review_requests, old.consumed_review_requests)
        assert.equal(f.table.get('synthetic-m2').reserved_timeout_ms, old.reserved_timeout_ms)
        await record('AUTH-4', 'replay', true, { before: old, after: f.table.get('synthetic-m2'), result, native_jobs: ctx.jobs.list(author.id) })
      } else if (operation === 'expired-hold') {
        assert.ok(f.table.get('synthetic-m2').hold)
        await f.table.update('synthetic-m2', current => ResearchStateSchema.parse({ ...current, revision: current.revision + 1,
          hold: { ...current.hold, reassess_at: '2000-01-01T00:00:00Z' } }))
        const fresh = await coordination.propose({ operation: 'positive', plan_revision: 'expired-hold-successor', checkpoint: null, feedback_item_id: null }, author)
        await assert.rejects(driver.review(fresh.manifest, author, AbortSignal.timeout(5000)), /hold/)
        await record('LOOP-3', 'expired-hold', true, { state: f.table.get('synthetic-m2'), refused_successor: fresh })
      } else if (operation === 'running-recovery') {
        const state = f.table.get('synthetic-m2'), action = state.actions[packet.request ? JSON.parse(Buffer.from(await f.artifacts.read(packet.manifestRef)).toString()).action_id : '']
        assert.ok(action && action.reservation_active)
        assert.equal(ctx.jobs.list(author.id).some(j => j.id === action.job_id), false)
        recovery = { original_phase: action.phase, original_job_id: action.job_id, native_handle_available: false,
          process_quiescence_proven: false, disposition: 'unresolved; original reservation retained; no redispatch' }
        await f.table.update('synthetic-m2', current => ResearchStateSchema.parse({ ...current, revision: current.revision + 1,
          actions: { ...current.actions, [action.action_id]: { ...current.actions[action.action_id], phase: 'unknown' } },
          hold: { kind: 'unknown_execution', owner: author.id, reason: 'Runtime restarted without the original native job/terminal; process settlement remains unresolved',
            evidence: [packet.manifestRef], affected: [action.action_id], exit_condition: 'Reconcile the original producer/job/process facts without launching a replacement',
            next_check: 'Read retained process identities and operator cleanup evidence', reassess_at: new Date(Date.now() + 60_000).toISOString() } }))
        report = { state: 'waiting', human_action: null, summary: recovery.disposition }
        const delivered = await ctx.tools.execute({ name: 'orchestrator_report', arguments: report, agent: author,
          callId: ToolCallId('fault-recovery-report'), signal: AbortSignal.timeout(5000) })
        recovery.report_presentation = { status: delivered.error ? 'pending_native_binding' : 'delivered',
          native_result: delivered, human_action_requested: false }
      } else if (operation === 'primary-record') {
        const state = f.table.get('synthetic-m2'), actions = Object.values(state.actions)
        const facts = { state, result: result ?? null, trace: f.config.observe ? 'native trace retained in main receipt' : null,
          protected_reads: control.protectedReads, native_jobs: ctx.jobs.list(author.id), recovery }
        let predicate
        if (['review-timeout', 'review-unavailable', 'stale-review', 'review-ack-lost'].includes(kind))
          predicate = state.consumed_attempts === 0 && state.consumed_review_requests === 1 && state.hold?.kind === 'review_unavailable'
        else if (['protected-off', 'confirmation-off', 'source-drift'].includes(kind)) predicate = state.consumed_attempts === 0 && control.protectedReads.length === 0
        else if (kind === 'admission-ack-lost') predicate = state.consumed_attempts === 1 && actions[0].phase === 'unknown' && actions[0].job_id === null && state.reserved_timeout_ms === 2000
        else if (kind === 'running-loss') predicate = state.consumed_attempts === 1 && actions[0].phase === 'unknown' && state.reserved_timeout_ms === 8000 && recovery?.native_handle_available === false
        else {
          assert.equal(actions.length, 1)
          facts.evidence = JSON.parse(Buffer.from(await f.artifacts.read(actions[0].evidence)).toString())
          predicate = actions[0].phase === 'settled' && state.consumed_attempts === 1 && state.consumed_review_requests === 1
          if (kind === 'tree-deadline') predicate &&= facts.evidence.terminal.timeout && facts.evidence.scientific_status === 'ineligible'
          if (kind === 'tree-deadline') {
            facts.process_tree = JSON.parse(await readFile(join(f.root, 'snapshots/fault-process-observation.json'), 'utf8'))
            predicate &&= facts.process_tree.all_stopped === true
          }
          if (kind === 'competing-runtime') {
            facts.writer_fence = JSON.parse(await readFile(join(f.root, 'snapshots/fault-competing-writer.json'), 'utf8'))
            predicate &&= facts.writer_fence.native_lock_refused === true
          }
          if (kind === 'backup-restore') {
            facts.recovery_set = JSON.parse(await readFile(join(f.root, 'snapshots/fault-recovery-proof.json'), 'utf8'))
            predicate &&= facts.recovery_set.source_writer_closed === true && facts.recovery_set.source_store_scientific_state_sessions_and_artifacts === true
          }
          if (kind === 'admission-ack-delayed') {
            facts.before_ack = JSON.parse(await readFile(join(f.root, 'snapshots/fault-before-ack-release.json'), 'utf8'))
            predicate &&= facts.before_ack.state.consumed_attempts === 1 && facts.before_ack.native_jobs.length === 0
          }
        }
        await record(primaryProperty, 'primary', predicate, facts)
      } else if (operation === 'before-restart') {
        await f.artifacts.writeOnce('snapshots/fault-before-restart.json', Buffer.from(canonicalJson(f.table.get('synthetic-m2'))))
      } else if (operation === 'reopen-record') {
        const old = JSON.parse(await readFile(join(f.root, 'snapshots/fault-before-restart.json'), 'utf8'))
        const current = f.table.get('synthetic-m2'), continuity = auditContinuity(old, current)
        await record('STATE-2', 'reopen', continuity.preserved, { before: old, after: current, continuity })
      } else if (operation === 'stop-record') {
        const args = packet.request ?? { manifest: packet.manifestRef }
        const denied = await ctx.tools.execute({ name: packet.request ? 'research_run' : 'research_review', arguments: args, agent: author,
          callId: ToolCallId('fault-after-native-stop'), signal: AbortSignal.timeout(5000) })
        await record('AUTH-3', 'stop', Boolean(denied.error), { refusal: denied, state: f.table.get('synthetic-m2') })
      } else throw new Error('Unknown qualification-only fault operation')
      return { ...await this.inspect(), coverage: await coverage.audit() }
    },
  }
}
