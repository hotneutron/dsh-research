# M4 — Qualify the categorized research-loop properties on reused boundaries

Created: 2026-11-05 15:55:26 -0800. Updated: 2026-11-12 00:31:07 -0800. Revision: r16. Implementation status and next work: [canonical M1–M6 tracker](tracker/261105-1555-milestone-execution.md).

Dependency: M2/M3 integrated route; test-case design may begin with M1. This is bounded offline protocol qualification, not a hardware/model study.

Outcome: witnessed conformance evidence for the canonical property set on the selected composition, including truthful restart limits and explicit confirmation scope.

Parent: [source review and milestone index](261105-1555-review-1201-1230-and-milestones.md). Tracking: [execution tracker](tracker/261105-1555-milestone-execution.md). The parent review owns source baselines and the reduced scope; this document defines the work and acceptance gate for its milestone.

## Project ownership and autonomous execution

The [state/autonomy contract](261105-1705-contract-project-state-autonomy-and-feedback.md), [M0/1616](261105-1616-m0-architecture-workflows-and-idempotency.md), [sharing/1621](261105-1621-plan-lark-research-review-and-sharing.md), [layout/1452](261109-1452-brainstorm-repo-clutter-and-team-artifacts.md) and [architecture meta loop](261111-1604-architecture-meta-loop-and-migration.md) define the current basis. P is the canonical hosted project across worktrees; its scientific state, resolved profiles, evidence, feedback and decisions stay there.

Classify by purpose: deliberate project branches have defined scope/deliverables and versioned plans, contracts and useful milestone evidence in P/.plan/. Explorative alternatives/per-attempt plans stay ignored under P/local_artifacts/autoresearch/dsh/<goal>/paths/<path-id>/planning/, with frozen snapshots/hashes, backups and team access. Large/raw outputs stay in project artifacts in either case. dsh-research owns its deliberate engineering plans and compact qualification receipts in .plan/review/; raw fixture logs/supporting alternatives may remain local. Purpose and acceptance, not the mere existence of a Git branch, determine the planning treatment.

Normal execution, diagnosis, separate agent review, alternatives and covered recovery are autonomous. Optional feedback or failed publication never blocks admissible work. Human scientific steering follows reviewed scoped exhaustion; operational holds preserve their unmet condition. The canonical tracker records implementation/qualification progress.



## Additional integration cases required by current policy

- A hosted-project root/worktree change cannot put scientific state or Doc mappings in the shared package; all coupled state/provider roots stay anchored to P.
- Normal result, valid negative, agent reviewer request_changes and correctable procedural failure lead to autonomous continuation/diagnosis/recovery without human_action or a person-stage dependency.
- A terminal bounded campaign triggers outer-loop assessment; it does not imply scientific exhaustion or reset aggregate charges.
- New/edited/duplicate comments survive capture/wakeup/restart and get project-local dispositions. An adopted suggestion must appear in a changed frozen successor and an actual executed/failed/pending effect receipt.
- No comments and a Docs publication outage do not block an admissible iteration. Cursor progress, collection, adoption and publication are separate.
- Exhaustion must survive independent review after orthogonal alternatives/rebrainstorm. Unresolved process/permission/hard-limit holds remain operational, never mislabeled scientific exhaustion.
- Existing standing procedural-recovery tests preserve the failed checkpoint/costs and permit only the declared fresh replacement/shortfall; no human confirmation is added.

## Layout, sharing and architecture-transition cases

- Explorative path plans/trackers are ignored and restored from retained snapshots; deliberate branch plans remain versioned; lost/corrupt plan bytes cannot be replaced by a summary or trigger a duplicate action. Classifying an exploratory path as deliberate requires defined scope/deliverables and applicable review while preserving its prior snapshots.
- Edited plan/architecture/profile identities invalidate dependent review; unchanged historical snapshot bytes remain unchanged.
- Curated integration excludes raw outputs/explorative plans while retaining accepted deliberate plans and binds both evaluated source and final tree; applicable verification covers the final behavior.
- A portable permitted export resolves on a recipient without the original worker path, package-owned state or live Doc; test underlying asset access and restricted-content omission.
- A read-only architecture shadow emits no launch/reservation/review/exposure writes. Repeated migration/canary requests retain the same known action or hold uncertainty.
- Disposable handoff/rollback preserves charges/reservations, action/review consumption, feedback/cursors/effects/publication IDs and exposure history; stale backup rollback cannot reset them. Unsupported mappings keep handoff disabled.

## 1604 adoption: qualification cases

Use bounded synthetic or captured engineering fixtures and the existing separate-review route. Reject entry based solely on an isolated failure, routine API rename, new project hardware/input, inaccessible Doc, directory size, milestone or recurrence count. A positive fixture must bind a T1–T4 core requirement, architectural cause, repair evidence and independent structural conclusion; missing/stale evidence remains diagnosis. T4 additionally binds prospectively accepted units/limit/window/cohort and attribution to required package steps.

Verify project signals cannot become package-qualified entries by caller flags, reset project bounds or open confirmation. Deliberate package review/entry records stay in dsh-research; scientific evidence/authority stays in P. These are documented qualification requirements over existing procedures, not a new trigger engine or automatic architectural rewrite.

## Test ownership and evidence

Add focused tests in dsh-research/tests and a property receipt at .plan/review/m4-properties.json. Use disposable state, synthetic data, scripted providers and short process deadlines. Use existing public shell/job/storage/subagent operations for integration cases. Adopt the donor's useful failure scenarios without porting its classes, APIs or test count.

Each receipt row records property, positive/negative case, source/profile/package hashes, exact command, result/receipt hashes, assurance scope and pass/fail/defer. A skipped prerequisite is pending, not passing. A green unit suite over mocks is not an integration guarantee.

## Qualification priority and review cost

Prioritize implementation by risk; do not reduce accepted obligations or count unobservable cases as passes.

| Tier | Properties | Required treatment |
|---|---|---|
| Core mechanics before enabling the research profile | PROV-1–3, AUTH-1–4, EXEC-1–4, STATE-1–3, DATA-1 and structural LOOP-1 dependencies | Automate bounded positive/negative conformance and run checks at their L-stage boundaries; unavailable required evidence holds that route |
| Feature mechanics before enabling the feature | DATA-2, FB-1/FB-3/FB-4 | Qualified schema/release/capture/retry/access checks; off-mode not_applicable requires retained precondition/scope proof. M5's required feedback feature cannot be silently excluded |
| Semantic decisions at every applicable transition | LOOP-2/LOOP-3/FB-2 | Automate identity/link/completeness checks and retain separate agent/domain review of substantive rationale/effect. Additional human audit sampling supplements these checks; it never waives mandatory review |

Produce compact exception-oriented receipts rather than hand-checking all properties on every message. Before adopting a revised profile, regress every applicable property and the frozen original failure/cohort/envelope witness; no occurrence in the demonstrated scope is evidence, not universal proof. Requirement supersession follows its separate reviewed contract lane and cannot be called repair of an unchanged witness.

Add cases for delayed/unknown commit acknowledgement with no execute, forged/timestamp-only ordering proof, reviewer unavailable/fallback/unknown dispatch, missing/widened release schema, unsupported/self-asserted applicability, post-hoc T4 definitions, stale structural reviews, T2/T3 misclassification and expired holds without auto-enable. All remain prospective until implemented and recorded.

## Decidable declared-scope coverage

Use the frozen [contract coverage plan](../docs/contracts.md) from M1. Qualification requires all required cell IDs to have matching eligible native observations and passing expected assertions, valid not_applicable proof where the premise is absent, and no unresolved/failed required cells. Report required/covered/failed/unresolved/not-applicable IDs and their assurance instead of a global tick count.

At minimum, every applicable property per claimed stratum has a satisfying case and controlled rejecting witness; every listed fault shape is covered; every claimed L/F boundary has success and relevant reject/defer/replay branches; supported feature modes have their guard cases; lifecycle and risk-interaction cases are included. One test may cover several cells only with explicit per-cell assertions and evidence. A negative test passes when the violation is refused/held correctly, not when the violation is accepted.

DATA-1 remains applicable under confirmation-off. DATA-2 alone can use that off-mode premise as not_applicable, with frozen profile/scope and rule/review proof. Do not claim enabled qualification from off tests. Current M5 feedback requirements stay in scope.

These counts are minimum completeness rules, not universal or statistical coverage proof. Freeze/review input/profile equivalence classes and any additional domain sampling criteria before measurement. New witnesses reopen/extend the matrix; removing failed cells or narrowing scope needs new prospective review and never erases prior results. Runtime execution remains pending.

## Required behavior matrix

Add bounded checks for missing current-version compatibility rows, qualification-budget failure versus budget-sufficient qualification-only envelope failure, and unjustified T4 entry from an expensive matrix/short window. Retain original C_run+C_qual failure while classifying it. Only evidenced avoidable architectural steps with the full entry gate qualify T4; science timeout, qualification budget and coordination envelope are distinct references.


Add bounded cases rejecting a prospectively long horizon that dilutes qualification cost outside the accepted window/denominator, an extended-horizon pass replacing original-envelope failure, and qualification holds lacking owner/exit/revisit/deadline. T4 evidence retains C_run and C_qual for the original envelope; expiry cannot grant budget or qualification. These tests remain planned.


Execute only inside the frozen qualification budget/window with actual native/model/reviewer costs. Record C_qual separately from C_science and charge each physical execution once; replay analysis has its own cost. Required-cell closure never overrides bounds. Budget failure leaves coverage incomplete; replan/review prospectively without dropping witnesses. M4 implements evidence, not a new financial ledger.


Use the category-scoped predicates, explicit violation witnesses and observation points in [docs/contracts.md](../docs/contracts.md). L0–L8 and F1–F3 retain their stage meanings. For each property/profile, record pass, witnessed fail, unresolved or genuinely not_applicable; unsupported required observation is not a pass. Current runtime qualification remains pending.

| Category / properties | Positive case | Counterexample/failure case | Required observable result |
|---|---|---|---|
| Provenance: PROV-1–3 | Frozen identity, same captured hash/parse bytes and complete finite schema | Drift, hash/parse race, truncation, bool-as-number, NaN or Infinity | Exact matching accepted evidence or refusal with preserved witness |
| Review/admission: AUTH-1–4 | Separate exact review and durable bounded admission before one execution | Stale/self-review, early launch, fifth attempt, duplicate intent | Only current authorized action proceeds; no duplicate consumption/launch |
| Execution/uncertainty: EXEC-1–4 | Known successful completion; valid negative retains its verdict | Timeout-zero laundering, late parser override, unknown job or verdict substitution | Invalidity stays sticky, unknown dependencies stay held, domain verdict stays truthful |
| Continuity: STATE-1–3 | One registered authority, monotonic consumption and immutable history | Clone/reset, competing writer, stale rollback or overwritten payload | Same authority and preserved consumption/bytes across recovery |
| Protected data: DATA-1–2 | Initial profile refuses protected access; enabled tests use disposable qualified authority only | Protected hash/read before opening, overlap/rename, raw-label release | Off-mode refusal before byte access; enabled aggregation/history obligations separately qualified |
| Continuation: LOOP-1–3 | Admissible successor has no human dependency; changed-context revisit; reviewed exhaustion | Wait solely for comment, unchanged rejected rerun, operational hold called exhaustion | Correct continuation/hold/exhaustion state with bound evidence |
| Collaboration: FB-1–4 | Complete durable capture, substantiated effects and verified audience access | Partial-scan watermark, invented execution, publication-triggered relaunch, inaccessible asset | Truthful source/effect/publication state with no scientific replay |

## Restart and deadline drills

Run three distinct drills with very short fixtures:

1. **Restart after durable settlement.** Reload existing records/session evidence; return the same checkpoint, consumed action and charged attempt without another benchmark execution.
2. **Loss while running or between publication and durable association.** Confirm local jobs cannot be assumed to survive. Observe actual producer cleanup/process state if available. Missing settlement becomes unresolved; retain reservation and require reconciliation before any successor. Do not claim automatic mid-job continuation.
3. **Hard deadline and stop.** Invoke the existing execution route with kill-on-expiry, including the graceful-zero fixture and any child process it spawns. Verify actual termination/terminal classification and no promotion or surviving benchmark process. Use existing process/sandbox diagnostics; a cleanup failure remains unresolved.

Per-owner concurrency is supporting evidence; the persistent campaign record owns benchmark serialization. Repeat duplicate delivery against that same record, not a newly initialized campaign.

## Confirmation qualification is split deliberately

The supported M1–M5 package has fresh confirmation disabled. DATA-1's off-mode acceptance for that scope is fail-closed refusal before any sealed/fresh input access. Do not lower the confirmation invariant or describe a disabled feature as enabled qualification.

Use the existing donor confirmation authority only on disposable synthetic checkout/data/ledger. Instrument the earliest protected dataset byte read. The Nov 5 donor audit recorded validate hashing the dataset before begin commits an opening; refresh that observation on the selected version: this demonstrates consume-before-evaluator-launch, not literal consume-before-any-byte-read. Record that result rather than writing a replacement ledger or changing the definition silently.

Enabled DATA-1/DATA-2 semantics require the existing authority's opening to become durable before protected data read, failures to stay consumed, overlap to remain prohibited, finite declared aggregate-only release and complete approved candidate/verifier/data linkage. If a narrow authority correction is needed, stage it as a separate task, preserve all old records and retest that existing implementation. No real confirmation is opened as a test. Production continuity/single-writer checks belong in M6.

Thus M4 can qualify the released-input/confirmation-off route for M5 while full enabled confirmation remains pending with an explicit failed ordering case. The receipt must show both scopes; it must not collapse them into unqualified green checkmarks.

## Checks and gate

Run package-focused behavior tests, keyless recorded/scripted Session output checks for new model-visible fields, public built-consumer smoke and type/build checks. Do not rerun the entire 124-test donor suite or generic fleet/TLS/UI suites just to match historical counts. If modifying a framework, apply that checkout's own required snapshot/SDK/build checks to the actual surface.

M4 is complete for the M5 scope when P01–P05/P07–P08 pass through the integrated route, confirmation-off refusal passes before access, the full-confirmation gap is recorded, restart/timeout drills have receipts and no remaining gap can violate pilot bounds or acceptance. Any unresolved launch/accounting/validity gap blocks M5. Freeze the package/profile versions and hand the property receipt to the pilot reviewer.

## User Prompt, Verbatim

~~~text
~/wk/dsh-superagent-prototype and ~/wk/deepseek-harness are checked out.
~/wk/accorde and ~/wk/autoresearch are also checked out.
reivew the 1201 brainstorms and 1230 plans and write actionable plans for each milestone.
~~~


## Filename Convention Request, Verbatim

~~~text
please use {YYMMDD}-{HHMM}-* as the format of the plan/tracker file name.
~~~


## Current Project Ownership / Autonomy Request, Verbatim

~~~text
I think the project related artifacts and decision should stay in the project workspace (i.e. accorde/), so it's self-contained, try to minimize the states stored in the dsh-research. Please confirm that, and be explicit about Responsibility/Owner/Location of Persistent State.
"organized live Lark Docs" is not convincing. I don't see the feedback loop.
Also please confirm that for most execution and iterations, human intervention is not required, nor blocking. Human input is required only when the direction is "scientifically exhausted".
~~~

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-05 15:55:26 -0800 | Defined behavior-based P01-P08 cases, live-boundary restart/timeout drills and separate confirmation-off versus enabled-confirmation qualification. |
| r2 | 2026-11-05 16:26:56 -0800 | Renamed 20261105-m4-scientific-property-qualification.md to 261105-1555-m4-scientific-property-qualification.md using YYMMDD-HHMM; updated 2 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
| r3 | 2026-11-05 17:07:31 -0800 | Extended boundary tests for project ownership, nonblocking human feedback, adopted-effect traceability, autonomous review/recovery and precise scientific exhaustion classification. |
| r4 | 2026-11-11 16:04 -0800 | Aligned with 1616/1621/1705/1452: ignored detailed planning and receipts, frozen identity, accessible team exports, focused integration and bounded architecture revision/migration; preserved prompts/history and pending runtime gates. |
| r5 | 2026-11-11 16:14 -0800 | Distinguished deliberate scoped/versioned plans from explorative retained detail; restored package-owned compact qualification receipts and purposeful project migration/pilot plans without changing scientific authority or execution status. |
| r6 | 2026-11-11 16:36 -0800 | Adopted 1604's package-architecture scope, T1–T4 evidence gate and maintainer/reviewer ownership; kept routine project triage, scientific autonomy and deployment qualification separate. |
| r7 | 2026-11-11 17:07 -0800 | Linked canonical research-loop contract 1.0.0, pinned stage/invariant/trace semantics and retained prospective runtime qualification and project authority. |
| r8 | 2026-11-11 17:44 -0800 | Adopted contract 2.0.0 category-scoped predicates/counterexamples in current conformance and audit references; preserved historical source numbering and evidence without canonical aliases. |
| r9 | 2026-11-11 18:12 -0800 | Adopted human-review contract 2.1.0 clarifications in current references/qualification plans; retained pending runtime guarantees and historical bindings. |
| r10 | 2026-11-11 19:01:22 -0800 | Adopted contract 2.2.0 applicability/coverage clarification and review-r5 residual closure; retained prospective provider qualification and historical evidence. |
| r11 | 2026-11-11 20:22:19 -0800 | Adopted 2.3.0 obligation/compatibility and qualification-budget/T4 accounting references without executing runtime changes. |
| r12 | 2026-11-11 20:31:48 -0800 | Adopted 2.3.1 accepted-envelope amortization, owned qualification holds and explicit T4 C_run/C_qual evidence without runtime activation. |
| r13 | 2026-11-11 21:13:38 -0800 | Adopted cumulative 2.3.2 compatibility assessment and explicit qualification-budget/envelope arbitration without runtime execution. |
| r14 | 2026-11-11 21:39:00 -0800  | Recorded M1 encoding/public-provider development and contract 2.3.3 bindings; kept independent conformance, integrated launch, M2–M6 and migration gates pending. |
| r15 | 2026-11-11 23:30:50 -0800 | Delegated current implementation status and next work to .plan/tracker/; retained milestone scope, gates and historical evidence. |
| r16 | 2026-11-12 00:31:07 -0800 | Made bounded-campaign assessment independent of the superseded Accorde CPU four-attempt example; declared project GPU bounds remain required. |
