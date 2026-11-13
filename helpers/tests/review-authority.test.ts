import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NativeCoordinationTools, NativeReviewDriver } from 'dsh-research/native'
import { ManifestSchema } from 'dsh-research'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { createCpuFixture } from '../examples/synthetic-cpu/fixture.mjs'

for (const boundary of ['authority-read', 'durable-ack', 'catalog-read'] as const) {
  test(`review stop during ${boundary} retains intent without dispatching a reviewer`, { timeout: 10000 }, async () => {
    const parent = await mkdtemp(join(tmpdir(), 'dsh-review-stop-'))
    const f = await createCpuFixture(join(parent, 'project'), { automaticReview: true })
    const gate = Promise.withResolvers<void>(), entered = Promise.withResolvers<void>()
    const originalList = f.ctx.subagents.listChildren.bind(f.ctx.subagents)
    if (boundary === 'catalog-read') f.ctx.subagents.listChildren = async (parent: SessionId) => { entered.resolve(); await gate.promise; return originalList(parent) }
    let checks = 0
    try {
      const coordination = new NativeCoordinationTools(f.ctx, { artifacts: f.artifacts, table: f.table, projectKey: 'synthetic-m2',
        authorSessionId: f.author.id, propose: async args => ManifestSchema.omit({ action_id: true }).parse(await f.makeSubject(args.operation, args)) })
      const table = boundary === 'durable-ack' ? new Proxy(f.table, { get(target, key) {
        if (key === 'update') return async (key: string, transform: Parameters<typeof f.table.update>[1]) => {
          const committed = await f.table.update(key, transform)
          if (Object.values(committed.review_requests).some(r => r.phase === 'dispatching')) { entered.resolve(); await gate.promise }
          return committed
        }
        const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value
      } }) : f.table
      const driver = await NativeReviewDriver.open(f.ctx, { artifacts: f.artifacts, table, projectKey: 'synthetic-m2', policy: f.policyRef,
        authorSessionId: f.author.id, deniedTools: [], assertActiveAuthority: async () => {
          if (boundary === 'authority-read' && ++checks === 2) { entered.resolve(); await gate.promise }
        } })
      const proposal = await coordination.propose({ operation: 'negative', plan_revision: 'stop-race', checkpoint: null, feedback_item_id: null }, f.author)
      const pending = driver.review(proposal.manifest, f.author, AbortSignal.timeout(5000))
      await entered.promise
      await f.table.update('synthetic-m2', current => ({ ...current, stopped: true, revision: current.revision + 1 }))
      gate.resolve()
      const result = await pending
      assert.equal(result.status, 'unknown')
      assert.equal(f.reviewerLLM.requests.length, 0)
      assert.equal(f.table.get('synthetic-m2')?.consumed_review_requests, 1)
      assert.equal(f.table.get('synthetic-m2')?.consumed_attempts, 0)
      const replay = await driver.review(proposal.manifest, f.author, AbortSignal.timeout(5000))
      assert.equal(replay.replay, true)
      assert.equal(f.reviewerLLM.requests.length, 0)
    } finally { gate.resolve(); f.ctx.subagents.listChildren = originalList; await f.close(); await rm(parent, { recursive: true, force: true }) }
  })
}
