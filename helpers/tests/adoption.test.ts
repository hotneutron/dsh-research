import assert from 'node:assert/strict'
import test from 'node:test'
import { auditContinuity } from '../src/qualification.js'
import { ResearchStateSchema } from '../src/admission.js'
import { packets } from './fixtures/packets.js'

function history() {
  const p = packets()
  const ref = (name: string) => p.ref(`snapshots/${name}`, name)
  return ResearchStateSchema.parse({ schema_version: 3, authority: p.binding.authority, binding: p.binding,
    policy: ref('policy'), revision: 10, stopped: true, consumed_attempts: 0, consumed_timeout_ms: 0,
    reserved_timeout_ms: 0, consumed_reviews: [], active_action_id: null, actions: {}, hold: null,
    consumed_review_requests: 1, review_requests: { request: { request_id: 'request', review_id: 'review', request: ref('request'),
      manifest: ref('manifest'), action_id: 'action', subject_sha256: 'subject', dispatch_token: 'dispatch',
      reviewer_session_id: 'reviewer', parent_session_id: 'author', phase: 'request_changes', native_message_id: 'native-message',
      completion: ref('completion'), receipt: ref('receipt') } }, rejected_subjects: { subject: ref('rejection') },
    feedback: { cursors: { team: { cursor: 'end', scan: ref('scan') } }, items: { reply: {
      item_id: 'reply', source_id: 'team', message_id: 'message', source_version: 'v1', content: ref('comment'),
      disposition: 'adopted', reason: 'reviewed', changed_action: ref('next-action'), effect: ref('effect'),
      effect_status: 'executed', effect_checkpoint: ref('effect-checkpoint') } } },
    publications: { publication: { operation_id: 'publication', checkpoint: ref('checkpoint'), release: ref('release'),
      audience: 'team', status: 'verified', attempts: 2, verification: ref('access-proof') } } })
}

test('idle current-version history can survive a byte-preserving restore', () => {
  const before = history()
  assert.equal(auditContinuity(before, structuredClone(before)).preserved, true)
})

const mutations: Array<[string, (state: ReturnType<typeof history>) => void, string]> = [
  ['rejection removal', state => { state.rejected_subjects = {} }, 'rejected_subject_lost:subject'],
  ['feedback effect removal', state => { state.feedback.items.reply!.effect = null }, 'feedback_effect_changed:reply'],
  ['effect checkpoint removal', state => { delete state.feedback.items.reply!.effect_checkpoint }, 'feedback_effect_changed:reply'],
  ['adoption reversal', state => { state.feedback.items.reply!.disposition = 'rejected' }, 'feedback_effect_changed:reply'],
  ['review producer changed', state => { state.review_requests.request!.reviewer_session_id = 'replacement' }, 'review_request_lost:request'],
  ['completed review reopened', state => { state.review_requests.request!.phase = 'dispatching' }, 'review_request_lost:request'],
  ['publication attempts refunded', state => { state.publications.publication!.attempts = 0 }, 'publication_history_lost:publication'],
  ['verified release reopened', state => { state.publications.publication!.status = 'pending' }, 'publication_history_lost:publication'],
  ['recipient audience changed', state => { state.publications.publication!.audience = 'public' }, 'publication_history_lost:publication'],
  ['feedback cursor removed', state => { state.feedback.cursors = {} }, 'feedback_cursor_requires_reconciliation:team'],
  ['feedback cursor advanced without chain proof', state => { state.feedback.cursors.team!.cursor = 'later' }, 'feedback_cursor_requires_reconciliation:team'],
  ['revision rollback', state => { state.revision = 9 }, 'revision_rolled_back'],
  ['profile replaced without compatibility proof', state => { state.binding.profile.revision = 'replacement' }, 'binding_changed_requires_compatibility'],
  ['writer replaced without fence proof', state => { state.authority.writer_id = 'replacement'; state.binding.authority.writer_id = 'replacement' }, 'writer_changed_requires_handoff'],
]
for (const [name, mutate, violation] of mutations) test(`continuity refuses ${name}`, () => {
  const before = history(), after = structuredClone(before)
  mutate(after)
  assert.ok(auditContinuity(before, after).violations.includes(violation))
})
