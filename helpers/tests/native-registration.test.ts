import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { NativeResearchAdapter } from 'dsh-research/native'
import { createCpuFixture } from '../examples/synthetic-cpu/fixture.mjs'
import { assertDefaultTicketAuthority } from '../examples/superagent/research-worker.mjs'

test('author-local research survives inherited masks while late local bypass and reviewer calls remain denied', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'dsh-local-registration-'))
  const f = await createCpuFixture(join(parent, 'project'))
  const extra: Array<() => void> = []
  try {
    f.unregister?.()
    extra.push(f.author.ctx.tools.restrict({ allow: [] }))
    assert.equal(f.ctx.tools.get('research_run', f.author), undefined)
    extra.push(f.adapter.register({ toolScope: 'author' }))
    assert.ok(f.ctx.tools.get('research_run', f.author))
    const packet = await f.prepare('negative')
    let bypasses = 0
    extra.push(f.author.ctx.tools.register(defineTool({ name: 'late_bypass', description: 'Must never execute', parameters: {},
      output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
      execute: async () => { bypasses++; return 'violation' } })))
    const call = (name: string, arguments_: unknown, agent = f.author) => f.ctx.tools.execute({ name, arguments: arguments_, agent,
      callId: ToolCallId(name), signal: AbortSignal.timeout(10000) })
    assert.ok((await call('late_bypass', {})).error)
    assert.ok((await call('research_run', packet.request, f.reviewer)).error)
    assert.equal(bypasses, 0)
    const result = await call('research_run', packet.request)
    assert.equal(result.isError, false)
    const state = f.table.get('synthetic-m2')
    assert.ok(state)
    assert.equal(state.consumed_attempts, 1)
    assert.equal(state.actions[packet.manifest.action_id]?.phase, 'settled')
  } finally { extra.reverse().forEach(dispose => dispose()); await f.close() }
})

test('authority revoked during the asynchronous pre-dispatch check cannot use an earlier live-state snapshot', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'dsh-authority-recheck-'))
  const f = await createCpuFixture(join(parent, 'project'))
  let entered!: () => void, release!: () => void
  const atDispatch = new Promise<void>(resolve => { entered = resolve })
  const gate = new Promise<void>(resolve => { release = resolve })
  try {
    const packet = await f.prepare('negative')
    const adapter = await NativeResearchAdapter.open(f.ctx, { ...f.config, assertActiveAuthority: async () => {
      if (f.table.get('synthetic-m2')?.consumed_attempts) { entered(); await gate }
    } })
    const running = adapter.run(packet.request, f.author, AbortSignal.timeout(10000))
    await atDispatch
    await f.table.update('synthetic-m2', current => ({ ...current, revision: current.revision + 1, stopped: true }))
    release()
    const result = await running
    assert.equal(result.status, 'unknown')
    const state = f.table.get('synthetic-m2')
    assert.ok(state)
    assert.equal(state.consumed_attempts, 1)
    assert.equal(state.reserved_timeout_ms, packet.manifest.bounds.timeout_ms)
    assert.equal(state.actions[packet.manifest.action_id]?.job_id, null)
  } finally { release(); await f.close() }
})

test('Ticket stopped while the management pause read is pending cannot pass the default-worker authority check', async () => {
  const author = {}, mandate = '{}'
  let ticket: { mandate: object; ended?: object } = { mandate: {} }
  let release!: (paused: boolean) => void
  const pause = new Promise<boolean>(resolve => { release = resolve })
  const checking = assertDefaultTicketAuthority(author, author, () => ticket, mandate, () => pause)
  ticket = { ...ticket, ended: { by: 'human' } }
  release(false)
  await assert.rejects(checking, /Ticket must remain open/)
})
