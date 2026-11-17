# dsh-research audition on the mem-subsys contention study

Created: 2026-11-14T23:39:20-0800. Status: USER_CONTINUATION_AUTHORIZED; ALL_DIRECTIONS_RESEARCH_ACTIVE; BROADER_ADOPTION_PENDING.
Package baseline: `1d84b0fb86b3c1d317b4ebc8ff1a8b33c32a8375`, helper 0.3.0, research-loop contract 2.4.0. Hosted project P: `/Users/bytedance/wk/bytesim.orig`, branch `mem-subsys`, inspected HEAD `e19ffa53fbcf6e56a3642d99bbcc612598665962`.

[Scientific plan summary](../../bytesim.orig/.trae/documents/memory_subsystem/plans/261114-2326-plan-dsh-memory-model-research.md) · [Detailed scientific plan](../../bytesim.orig/local_artifacts/autoresearch/dsh/memory-system-20261114/research-plan.md) · [Prepared H100 workload](../../bytesim.orig/local_artifacts/autoresearch/dsh/memory-system-20261114/megamoe_h100_contention.py) · [Verbatim conversation prompts](../../bytesim.orig/local_artifacts/autoresearch/dsh/memory-system-20261114/prompt.md) · [Normative loop contract](../docs/contracts.md) · [Native integration](../docs/integration.md) · [Architecture triage](261111-1604-architecture-meta-loop-and-migration.md)

## Audition question

Determine whether dsh-research can support this real project research loop with trustworthy evidence, useful separate review, bounded scientific execution and continuity, while making workflow effort and limitations visible. Evaluate the package and its adopted provider/profile, separately from whether the memory hypothesis succeeds.

The scientific study concerns compute/communication contention in an H100 MoE-style workload. Existing Accorde `megamoe_fp8` has no communication, and native DeepSeek MegaMoE requires unavailable SM100 hardware. The prepared adaptation uses actual FP8 expert GEMMs and NCCL dispatch/combine under a new identity. This is a demanding package audition because it needs multi-rank ownership, changing hypotheses, source/profile review, numerical/network correctness and a currently deferred qualification lane.

A scientifically valid negative or non-identifiable result can demonstrate a useful research loop. A plausible model or nice report cannot establish package success if review, authority, ownership, evidence or continuity failed. No scalar overall score will average away a critical invariant.

## Separate ownership and verdicts

ByteSim owns scientific implementation, accepted scope, raw observations, verifier, authority, native state, costs, checkpoints and user review. dsh-research owns this deliberate package-development audition plan, scoped qualification procedures, defects and concise development receipts. Raw package audit copies belong under ignored `local_artifacts/dsh-research/audition/memory-subsys-20261114/`; project scientific evidence stays under P and is referenced by exact identity.

Produce separate conclusions: scientific outcome; package/provider/profile invariant conformance; autonomy/review usefulness; measured cost; and development recommendations. Report tested, failed, unresolved, disabled and not-applicable scope explicitly. Current planning/source preparation is outside an installed native production loop and cannot count as a live dsh-research pass.

## Pre-dispatch readiness

Freeze both user-reviewed plans, original prompts, source and dirty/untracked inventory, exact contract/register row and package/provider/model versions. Pin the prototype's new workload identity so existing Accorde calibration cannot be silently reused. Record that G8, U4, X4 and G9 remain deferred; approval of a FIT_ONLY pilot is not resumption of those gates.

Resolve the original project writer, consumed actions/reviews, pending reservations and exposed inputs before installation. Do not create a replacement empty ledger to avoid adoption requirements. Bind an existing native author/Ticket and supported project policy; any required V3-to-V4 handoff has a separately reviewed retention mapping, backup/restore and writer fence. Capture original authenticated user authority through the supported Source/API, not a manufactured model/user signature.

The package's `GpuResourceSchema` presently identifies one host/device UUID. The proposed workload uses two devices. Before scientific launch, prove a supported exact profile/envelope and guard mapping that names, acquires, observes and settles both participants atomically, including NCCL descendants. A primary UUID or a `ready=true` flag alone is insufficient. If the public boundary cannot support this, hold dispatch, create a bounded reproducer and review a narrow guard/schema/profile correction. Do not conceal the second device or automatically enter architecture redesign.

Likewise qualify the actual two-rank producer, NCCL stream/work completion, numerical and routing verifier, terminal cleanup and cumulative cost mapping. Existing vector-add or event-trace engineering qualifications are capability evidence for their own scopes, not approval of this scientific profile.

## Audition phases

| Phase | Action | Required evidence |
|---|---|---|
| Baseline | Snapshot user steering, scientific/package plans, active project state and exact source/profile | Immutable refs, existing-state/ownership audit, explicit unstarted/held scopes |
| Safe qualification | Exercise the exact new mapping and failure handling in disposable released CPU fixtures and non-executing shadow interpretation | Applicable-cell matrix frozen beforehand, no real GPU launch or authority mutation by shadow |
| Installation | Install project hooks, actual separate reviewer and guarded native execution on the admitted author | Supported registration, writer/profile qualification, actual source/Ticket/author IDs |
| Live scientific unit | Observe propose → separate review → admission → real terminal capture → domain verdict → checkpoint | Native Session/tool/job and ledger evidence for each stage, exact manifest/action association |
| Continuation | Interpret negative/request_changes/unknown outcomes and prepare the justified next action | Changed immutable subject, fresh review when required, preserved reservations/cost/history, ordinary human_action=null |
| Recovery/reproduction | Reopen or restore at a supported boundary and replay retained associations | Current-state retention and no duplicate dispatch/charges; raw evidence verification; unknowns retained |
| Close and review | Review the scientific conclusion and package audition independently | Separate outcome receipts, scoped development issues, measured effort/limitations and user-facing review bundle |

The user requested review before a pilot. Both plans remain drafts until that review; this document launches no qualification fixture, model reviewer, GPU job or live service. Covered routine continuation may become autonomous within the later accepted scope. A material scope increase or deferred-gate resumption remains a separate decision.

## Frozen acceptance matrix

Before installation bind every row to the exact contract property/profile, method, expected observation and artifact. Use complete native provenance, not filenames or retrospective assertions.

| Area | Audition acceptance | Contract/evidence |
|---|---|---|
| Request fidelity | Kernel/hardware/scope corrections are captured and applied; superseded plans cannot dispatch | PROV-1; original prompts, plan revisions, manifest/source/config identity |
| Review/admission | Every admitted scientific action has completed separate review of its exact subject, before reservation; author cannot self-approve or bypass via another tool | AUTH-1 and applicable AUTH rows; reviewer request, native Session cut, review, admission order proof |
| Multi-rank ownership | Every participating device/process/context is in the accepted resource envelope and terminal proof | AUTH-3, EXEC-1/EXEC-3; guard/profile refs, lease namespace, both UUIDs, process trees and teardown |
| Evidence | Hash/parse the same complete bytes; typed finite output; actual terminal/capture/code/input association | PROV-2/PROV-3, EXEC-1/EXEC-2; native terminal, raw bytes, parser/verifier refs |
| Scientific interpretation | Distinguish source preparation, numerical correctness, actual overlap, traffic repeatability and model accuracy; negative/invalid/unresolved remain distinct | Domain verdict/checkpoint and native status; no sampled fixture or stdout pass promoted to qualification |
| Authority/continuity | Reopen/replay retains consumed attempts/reviews, exposure, reservations, feedback and stop state; no duplicated launch | STATE-1/STATE-2/STATE-3, AUTH-4, DATA-1, EXEC-3; pre/post state and native association audit |
| Human boundary/autonomy | Respect review-before-pilot and deferred gates; continue covered negative/repair work without unnecessary repeated permission; missing prerequisites are owned holds | LOOP-1/LOOP-2/LOOP-3; original authority, holds, next actions and human_action records |
| Feedback effects | User/reviewer suggestions retain source versions, disposition, changed action and actual effect; superseded version remains recoverable | FB-1/FB-2/FB-3; feedback refs, manifest change, fresh review and settled effect |
| Reproduction | A permitted source/config/input/evidence bundle restores and verifies independently; private native state remains protected | Project export/read verification, exact released bytes and declared access scope |
| Cost visibility | Every attempt, review, model request and unresolved cost is accounted for without duplicate overlapping wall-time sums | Native usage/terminal/action IDs, C_run/C_qual and unresolved rows |

All critical applicable provenance, authority, ownership and retention checks must pass for adoption. Missing native evidence is unresolved or disabled; it is not not-applicable. Not-applicable requires a frozen false precondition and qualified applicability proof. Confirmation remains off for this initial profile; off mode still requires preservation of input exposure and no protected-byte reads.

Scientific pilot completion does not automatically complete the audition. Untested recovery/failure cells remain unqualified, and broader adoption stays conditional on the advertised profile's applicable matrix.

## Failure and recovery qualification

Use disposable CPU fixtures under separate C_qual accounting for deliberate failures. Never kill a scientific multi-GPU run merely to fill an audition cell or mutate its live authority to manufacture a witness. Plan one bounded stratum per case with the real new source mapping where applicable.

Required cases: missing/stale/request_changes review; source/config drift after review; invalid numeric/truncated capture; timeout followed by exit-zero stdout; partial second-device acquisition/cleanup; lost acknowledgement with actual no-dispatch proof; dispatched unknown process ownership; replay after reopen; and compatible rollback retaining current consumption. Qualify native process/guard mechanisms separately from scripted semantic answers. Cases requiring unavailable real provider behavior remain unresolved rather than simulated as live passes.

A retry retains original charges and has new admissible content/recovery provenance; it cannot reuse an already consumed review. Unknown launch or NCCL descendant ownership retains reservation until the qualified original guard settles it. Cleanup success does not invent a missing native terminal. Reopening the same author is preferred to restarting a Source with a fresh budget.

## Review usefulness and human burden

Retain the original manifest, reviewer critique, author disposition, changed subject and observed consequence. Count useful review as an independently substantiated defect/ambiguity or improved scientific decision; do not count repeated warnings, schema paraphrases or agreement as defect discovery. Separate reviewer availability/protocol correctness from technical usefulness.

Classify user interactions: initial mandate, planned review, scientific steering, missing environment/capability, avoidable repeated permission, and operational intervention. This conversation's branch-specific and compute/communication corrections belong in the record. Do not retrospectively claim they were produced by the native loop. Preserve questions and answers as observed, including the discovery that Blackwell is unavailable and Accorde's current sample lacks communication.

Measure counts from source/native events. Human active time requires actual human timing evidence; it remains unavailable otherwise. No fabricated time savings from message counts. An initial user review and genuine missing-host clarification are not the same as routine hand-holding after authority is established.

## Cost and benefit accounting

No author/reviewer token budget or output-token cap is imposed. Record authoritative input/output/cache/reasoning usage and failed/unresolved transport usage, with request/model/Session IDs. A retry or incomplete receipt is not free. Operational request/process deadlines and scientifically accepted compute limits remain separate.

Report scientific controller/job wall time, GPU reservation/lease intervals, review/model wall and usage, source/fixture qualification cost C_qual, recurring coordination C_run, monitoring/tool overhead, restart/idle gaps, and whole lifecycle wall separately. Overlapping rank/child intervals do not add to elapsed wall. Map the native C_science supervisory unit to its existing controller receipt once; duplicate snapshots do not duplicate charges. Preserve accepted historical costs/results and collect only missing fields.

Freeze any benefit comparison cohort/horizon/denominator before its outcomes. Use the same workload, accepted evaluator and comparable environment. This first audition may establish reliable cost measurement without a valid manual baseline. In that case report benefit/payback as unproven. Do not rerun accepted hardware records solely to manufacture a baseline or omit mandatory one-time qualification from a steady-state figure.

There is no claimed performance or effort threshold at this planning stage. Any adoption envelope must be prospectively reviewed; high token usage alone does not violate the user's uncapped-token instruction.

## Package development and escalation

Create a concise issue record with expected/actual behavior, exact contract/profile/source, minimal reproducer, affected scope, raw refs, severity and a narrow repair/qualification plan. Classify domain-model failure, project-hook error, provider defect, package defect, missing capability and operational hold separately. The single-UUID/two-device mapping is an audition readiness question, not an already proven architecture failure.

First try supported configuration, guard/adapter mapping or a bounded compatible repair. Enter T1–T4 architecture review only under the existing 1604 procedure: independently established accepted core requirement, current witness, architectural cause and failed/ruled-out narrower supported repair. Scientific counter variability, expensive mandatory qualification or missing hardware alone do not trigger redesign. Changes to package contracts/profile/record semantics require their own compatibility, regression and continuity receipts.

Do not expand into a scheduler, fleet service or dashboard to improve an audition metric. Scientific pilots stay pinned through terminal/reconciliation; package updates and adoption do not rewrite past source or consumption.

## Deliverables and final disposition

Produce an exact-byte baseline/coverage manifest, per-cell native evidence index, cost and intervention ledger, scoped package/provider conformance receipt, review-usefulness assessment, restored-bundle verification, and ranked development issues. Keep scientific conclusions in ByteSim and link them from a concise dsh-research receipt with permitted refs.

Possible dispositions are scoped adoption justified; narrow repair and re-audition required; or operational hold/unresolved coverage. Scientific success/negative/non-identifiable remains its own field. State what was actually run versus prepared, scripted, modeled, observed live or not run. Current disposition is planning only, with multi-device scientific-profile qualification and user review still pending.

## User prompt, verbatim

```text
since this run will also be reviewed for developing dsh-research, write a separate plan on dsh-research audition.
```

The complete preceding scientific scope, token instruction, review-before-pilot instruction and H100/Accorde steering are retained verbatim in the linked project prompt artifact.

## Revision History

| Timestamp | Change |
|---|---|
| 2026-11-14T23:39:20-0800 | Created a separate package audition plan covering exact scope/admission, multi-device readiness, native evidence, failure/recovery, autonomy, review usefulness, costs, reproduction and bounded development triage; no live audition or pilot launched. |

- 2026-11-15T11:52:26.836867+00:00: Recorded approved execution and valid native H100 canary. The actual kernel audit finds no GEMM/NCCL overlap; scientific pilot is pending quota and a revised contention protocol. Separate result: `local_artifacts/dsh-research/audition/memory-subsys-20261114/audition-result.md`.

- 2026-11-15T15:42:36.007322+00:00: Six-attempt run ended invalid at the first1,024-token numerical gate before timing. Original six charges/authority retained, reports independently reviewed,150-file evidence restoration verified. Detailed result/recommendations stay in ignored project-owned audition artifacts; native goal/full memory model remain uncompleted.

- 2026-11-15T19:32:56.988624+00:00: Owner directed continuation of all research until scientific exhaustion. Original six actions/5400000 ms retained; renewable reviewed stage allocations and exhaustive direction/evidence registry prepared in ByteSim. The earlier bounded outcome remains historical; no budget boundary is a scientific exhaustion verdict.
