# M4 — Qualify the eight scientific properties on reused boundaries

Created: 2026-11-05 15:55:26 -0800. Updated: 2026-11-05 17:07:31 -0800. Revision: r3. Status: planned; implementation not started.

Dependency: M2/M3 integrated route; test-case design may begin with M1. This is bounded offline protocol qualification, not a hardware/model study.

Outcome: behavior evidence for P01–P08 on the selected composition, including truthful restart limits and explicit confirmation scope.

Parent: [source review and milestone index](261105-1555-review-1201-1230-and-milestones.md). Tracking: [execution tracker](tracker/261105-1555-milestone-execution.md). The parent review owns source baselines and the reduced scope; this document defines the work and acceptance gate for its milestone.

## Project ownership and autonomous execution

The [project-state/autonomy/feedback contract](261105-1705-contract-project-state-autonomy-and-feedback.md) owns current semantics. P is the explicitly configured canonical hosted-project root. Actual manifests, budgets/action consumption, reviewer/feedback records, resolved configuration, evidence and scientific decisions live in P; package .plan/review receipts are only reusable-code qualification, never project campaign authority.

Normal research execution, diagnosis, alternatives, recovery and separate agent review continue under standing project policy without a human approval or feedback wait. A campaign limit/failure is a checkpoint. Required human scientific steering follows a reviewed exhaustion assessment; hard guard/external holds stay operational and automatically resume when their conditions permit.

## Additional integration cases required by current policy

- A hosted-project root/worktree change cannot put scientific state or Doc mappings in the shared package; all coupled state/provider roots stay anchored to P.
- Normal result, valid negative, agent reviewer request_changes and correctable procedural failure lead to autonomous continuation/diagnosis/recovery without human_action or a person-stage dependency.
- A terminal four-attempt campaign triggers outer-loop assessment; it does not imply scientific exhaustion or reset aggregate charges.
- New/edited/duplicate comments survive capture/wakeup/restart and get project-local dispositions. An adopted suggestion must appear in a changed frozen successor and an actual executed/failed/pending effect receipt.
- No comments and a Docs publication outage do not block an admissible iteration. Cursor progress, collection, adoption and publication are separate.
- Exhaustion must survive independent review after orthogonal alternatives/rebrainstorm. Unresolved process/permission/hard-limit holds remain operational, never mislabeled scientific exhaustion.
- Existing standing procedural-recovery tests preserve the failed checkpoint/costs and permit only the declared fresh replacement/shortfall; no human confirmation is added.

## Test ownership and evidence

Add focused tests in dsh-research/tests and a property receipt at .plan/review/m4-properties.json. Use disposable state, synthetic data, scripted providers and short process deadlines. Use existing public shell/job/storage/subagent operations for integration cases. Adopt the donor's useful failure scenarios without porting its classes, APIs or test count.

Each receipt row records property, positive/negative case, source/profile/package hashes, exact command, result/receipt hashes, assurance scope and pass/fail/defer. A skipped prerequisite is pending, not passing. A green unit suite over mocks is not an integration guarantee.

## Required behavior matrix

| Property | Positive case | Negative / failure injection | Required observable result |
|---|---|---|---|
| P01 bound identity | Frozen candidate/evaluator/data/environment/command validates | Change relevant untracked source, input split/hash, interpreter or plan after review | No acceptance/launch; dependent review invalidated |
| P02 sticky execution validity | Normal process plus consistent terminal receipt qualifies for checking | Graceful SIGTERM handler writes passing JSON and exits zero after timeout; cancel/crash; post-run source drift | Evidence remains invalid even with exit zero; no successor from invalid result |
| P03 immutable typed evidence | Parse/hash the same captured bytes and bind an existing domain verdict | Wrong retrieved hash, corrupt/missing/truncated result, missing field, bool-as-number, NaN/Infinity, unrelated verifier | Refusal with preserved bytes/reason. A valid negative verdict stays valid negative, not invalid |
| P04 exact scoped review | Separate reviewer approves one exact subject/action | Advice, wrong action/candidate/evidence/plan, self-approval, parentless initial flag reused, replay at successor checkpoint | Only exact unconsumed review can admit; no waiver of other checks |
| P05 bounded admission | Durable reservation before one launch, one active attempt | Fifth attempt, overlapping requests, duplicate action, failed spawn, restart after intent, request with substituted command | At most one publication for an attempt; failures stay charged; timeout reservations never reset |
| P06 confirmation exposure | Fresh-confirmation-disabled mode refuses before label access; disposable existing authority records monotonic openings under its stated scope | Rename/profile/candidate overlap, failed/interrupted evaluator, repeated reservation, missing history; instrument data-read order | Fresh path stays disabled; no production authority/data touched; donor guarantee limits recorded honestly |
| P07 re-steering | Valid evidence supports continue or changed-context diagnose/pivot | Repeat rejected path without changed evidence; invalid result called improvement; human stop or no remaining budget | Explicit defer/stop with rationale and evidence; no unbounded unchanged loop |
| P08 continuity / deduplication | Completed attempt/review replay and restart return same associations | Crash around intent/publication/settlement/review consumption; late duplicate notice; unknown durable update | No double spend/open/launch; unresolved attempt keeps reservation and blocks successor |

## Restart and deadline drills

Run three distinct drills with very short fixtures:

1. **Restart after durable settlement.** Reload existing records/session evidence; return the same checkpoint, consumed action and charged attempt without another benchmark execution.
2. **Loss while running or between publication and durable association.** Confirm local jobs cannot be assumed to survive. Observe actual producer cleanup/process state if available. Missing settlement becomes unresolved; retain reservation and require reconciliation before any successor. Do not claim automatic mid-job continuation.
3. **Hard deadline and stop.** Invoke the existing execution route with kill-on-expiry, including the graceful-zero fixture and any child process it spawns. Verify actual termination/terminal classification and no promotion or surviving benchmark process. Use existing process/sandbox diagnostics; a cleanup failure remains unresolved.

Per-owner concurrency is supporting evidence; the persistent campaign record owns benchmark serialization. Repeat duplicate delivery against that same record, not a newly initialized campaign.

## Confirmation qualification is split deliberately

The supported M1–M5 package has fresh confirmation disabled. P06's production acceptance for that scope is fail-closed refusal before any sealed/fresh input access. Do not lower the confirmation invariant or describe a disabled feature as enabled qualification.

Use the existing donor confirmation authority only on disposable synthetic checkout/data/ledger. Instrument the earliest protected dataset byte read. Current validate hashes the dataset before begin commits an opening: this demonstrates consume-before-evaluator-launch, not literal consume-before-any-byte-read. Record that result rather than writing a replacement ledger or changing the definition silently.

Full P06 exposure semantics require the existing authority's opening to become durable before protected data read, failures to stay consumed, overlap to remain prohibited, finite declared aggregate-only release and complete approved candidate/verifier/data linkage. If a narrow authority correction is needed, stage it as a separate task, preserve all old records and retest that existing implementation. No real confirmation is opened as a test. Production continuity/single-writer checks belong in M6.

Thus M4 can qualify the released-input/confirmation-off route for M5 while full enabled confirmation remains pending with an explicit failed ordering case. The receipt must show both scopes; it must not collapse them into eight unqualified green checkmarks.

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
