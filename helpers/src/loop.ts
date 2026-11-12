import { CheckpointSchema } from './records.js'
import type { Checkpoint, Evidence, Manifest, ArtifactReference } from './records.js'
import type { ResearchState } from './admission.js'

/** Interpret trustworthy domain facts; proposing a successor is still a separate reviewed action. */
export function checkpointFor(manifest: Manifest, evidence: Evidence, evidenceRef: ArtifactReference, state: ResearchState, reviewRef: ArtifactReference,
  hold: Checkpoint['hold'] = null): Checkpoint {
  const unresolved = evidence.scientific_status === 'unresolved'
  const negative = evidence.verifier.verdict === 'negative'
  return CheckpointSchema.parse({
    schema_version: 1, kind: 'checkpoint', binding: manifest.binding, checkpoint_id: `checkpoint-${manifest.action_id}`, goal_id: manifest.goal.id,
    question: manifest.original_prompt, hypothesis: 'Evaluate the frozen project claim using its domain verifier', alternative: manifest.proposal.operation,
    evidence_status: evidence.evidence_status, scientific_outcome: evidence.scientific_status === 'eligible' ? evidence.verifier.verdict : 'unavailable',
    rationale: unresolved ? 'Execution or settlement needs trustworthy reconciliation' : evidence.scientific_status !== 'eligible' ? 'Mechanically invalid evidence supports diagnosis only'
      : negative ? 'The domain result is valid and negative; prepare a bounded diagnostic or alternative' : 'The domain verdict is retained; prepare the next exact scoped review',
    uncertainty: ['This checkpoint does not itself authorize a new execution'], evidence: [evidenceRef], reviews: [reviewRef],
    balance: { consumed_attempts: state.consumed_attempts, reserved_timeout_ms: state.reserved_timeout_ms, costs: evidence.costs }, stopped: state.stopped,
    decision: state.stopped ? 'stop' : 'defer', next_action: null, hold,
    feedback: Object.values(state.feedback.items).filter(item => item.disposition !== 'pending').map(item => ({ source: item.content,
      disposition: item.reason ?? item.disposition, effect: item.effect, status: item.effect_status })), exhaustion: null,
  })
}
