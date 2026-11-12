import assert from 'node:assert/strict'
import test from 'node:test'
import { captureFeedback, disposeFeedback, recordFeedbackEffect, progressReport, scientificSubject } from '../src/collaboration.js'
import { packets } from './fixtures/packets.js'

test('partial scans cannot advance a cursor; complete capture and duplicate/edit versions preserve bytes', () => {
  const p = packets()
  const first = p.ref('source/comment-v1', 'original')
  const edited = p.ref('source/comment-v2', 'edited')
  const empty = { cursors: {}, items: {} }
  const scan = { source_id: 'fixture', start_cursor: '0', end_cursor: '1', pages: [{ cursor: '0', next_cursor: 'more', capture: p.ref('source/page', 'page'), items: [{ message_id: 'c', source_version: 'v1', content: first }] }] }
  assert.throws(() => captureFeedback(empty, scan, p.ref('source/partial', scan)), /Partial feedback scan/)
  const complete = { ...scan, pages: [{ ...scan.pages[0]!, next_cursor: null }] }
  const scanRef = p.ref('source/complete', complete)
  const captured = captureFeedback(empty, complete, scanRef)
  assert.equal(captured.cursors.fixture?.cursor, '1')
  assert.deepEqual(captureFeedback(captured, complete, scanRef), captured)
  const next = { source_id: 'fixture', start_cursor: '1', end_cursor: '2', pages: [{ cursor: '1', next_cursor: null, capture: p.ref('source/page-2', 'page2'), items: [{ message_id: 'c', source_version: 'v2', content: edited }] }] }
  const both = captureFeedback(captured, next, p.ref('source/next', next))
  assert.equal(Object.keys(both.items).length, 2)
  const conflict = { ...next, pages: [{ ...next.pages[0]!, items: [{ message_id: 'c', source_version: 'v1', content: edited }] }] }
  assert.throws(() => captureFeedback(captured, conflict, p.ref('source/conflict', conflict)), /original bytes/)
})

test('adoption and executed effects need changed action and actual matching receipt identities', () => {
  const p = packets()
  const source = p.ref('source/comment', 'change')
  const scan = { source_id: 'fixture', start_cursor: '0', end_cursor: '1', pages: [{ cursor: '0', next_cursor: null, capture: source, items: [{ message_id: 'c', source_version: 'v1', content: source }] }] }
  const captured = captureFeedback({ cursors: {}, items: {} }, scan, p.ref('source/scan', scan))
  const id = Object.keys(captured.items)[0]!
  assert.throws(() => disposeFeedback(captured, id, 'adopted', 'change', null), /changed frozen action/)
  const action = p.ref('action/new', p.manifest)
  const adopted = disposeFeedback(captured, id, 'adopted', 'change', action)
  assert.equal(adopted.items[id]?.effect_status, 'pending')
  const receipt = p.ref('action/effect', p.evidence)
  const executed = recordFeedbackEffect(adopted, id, action, receipt, 'executed')
  assert.deepEqual(recordFeedbackEffect(executed, id, action, receipt, 'executed'), executed)
  assert.throws(() => recordFeedbackEffect(adopted, id, p.ref('wrong-action', 'wrong'), receipt, 'executed'), /adopted action/)
  assert.throws(() => recordFeedbackEffect(executed, id, action, p.ref('rewritten-receipt', 'new'), 'executed'), /original association/)
})

test('routine outcomes have no human gate and do not erase an existing exhaustion question', () => {
  for (const outcome of ['continue', 'diagnose', 'operational_hold', 'goal_complete'] as const) assert.equal(progressReport(outcome, 'observed').human_action, null)
  assert.equal(progressReport('operational_hold', 'waiting for a native query', 'existing scoped question').human_action, 'existing scoped question')
})

test('changing only plan/transport names cannot revive the same rejected subject', () => {
  const p = packets()
  assert.equal(scientificSubject(p.manifest), scientificSubject({ ...p.manifest, author_session_id: 'other', plan: { ...p.manifest.plan, revision: 'renamed' } }))
  assert.notEqual(scientificSubject(p.manifest), scientificSubject({ ...p.manifest, proposal: { ...p.manifest.proposal, operation: 'different' } }))
})
