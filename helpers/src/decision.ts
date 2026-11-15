import { z } from 'zod'
import { Binding, Bounds, ByteRef, Id } from './records.js'

/** A non-executing subject, reviewed before a production loop completes or asks for steering. */
export const DecisionSubjectSchema = z.strictObject({
  schema_version: z.literal(1), kind: z.literal('research_decision'), subject_id: Id,
  subject_kind: z.enum(['goal_completion', 'scientific_exhaustion']),
  binding: Binding, author_session_id: Id, goal_id: Id, goal_revision: Id,
  checkpoint: ByteRef, scope: ByteRef, rationale: Id, evidence: z.array(ByteRef).min(1),
  alternatives: z.array(ByteRef), rebrainstorm: ByteRef.nullable(),
  domain_assessment: ByteRef, bounds: Bounds,
  human_question: Id.nullable(),
}).superRefine((value, ctx) => {
  if (value.subject_kind === 'scientific_exhaustion'
    && (value.alternatives.length === 0 || value.rebrainstorm === null || value.human_question === null))
    ctx.addIssue({ code: 'custom', message: 'Scientific exhaustion needs tested alternatives, orthogonal rebrainstorm and reviewed steering question' })
  if (value.subject_kind === 'goal_completion' && value.human_question !== null)
    ctx.addIssue({ code: 'custom', message: 'Goal completion has no required human steering' })
})
export type DecisionSubject = z.infer<typeof DecisionSubjectSchema>
