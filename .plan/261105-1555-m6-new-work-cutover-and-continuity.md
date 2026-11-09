# M6 — Adopt new work and preserve authority through cutover

Created: 2026-11-05 15:55:26 -0800. Updated: 2026-11-05 17:07:31 -0800. Revision: r3. Status: planned; implementation not started.

Dependency: accepted M5 workflow evidence. New-work adoption, enabled confirmation and legacy retirement are separate gates; a pilot pass cannot satisfy all three.

Outcome: a project-owner decision with per-campaign authority, preserved budget/exposure and a reversible operational rollback.

Parent: [source review and milestone index](261105-1555-review-1201-1230-and-milestones.md). Tracking: [execution tracker](tracker/261105-1555-milestone-execution.md). The parent review owns source baselines and the reduced scope; this document defines the work and acceptance gate for its milestone.

## Project ownership and autonomous execution

The [project-state/autonomy/feedback contract](261105-1705-contract-project-state-autonomy-and-feedback.md) owns current semantics. P is the explicitly configured canonical hosted-project root. Actual manifests, budgets/action consumption, reviewer/feedback records, resolved configuration, evidence and scientific decisions live in P; package .plan/review receipts are only reusable-code qualification, never project campaign authority.

Normal research execution, diagnosis, alternatives, recovery and separate agent review continue under standing project policy without a human approval or feedback wait. A campaign limit/failure is a checkpoint. Required human scientific steering follows a reviewed exhaustion assessment; hard guard/external holds stay operational and automatically resume when their conditions permit.

The target confirmation authority is project-local (for Accorde: .autoresearch/confirmation/accorde-ppp.sqlite3), but the existing global-path ledger is a transition exception. Do not move/create it during this documentation task. A supported idle backup, full history/charge/opening reconciliation and one-writer handoff must preserve the same authority before relocating it; active pins and irreversible history stay intact.

Resolved native stateDir, Session root, storage path and profile recipes belong to the hosted project. Rollback may change transport/code pins but cannot restore an old zero budget, consumed review or exposure state. Adoption and ordinary new-work continuation within standing policy are agent decisions; they do not require a fresh human approval. Scientific exhaustion is the required direction-escalation boundary.

## Inventory before changing authority

Create the concrete inventory/continuity/cutover records in each hosted project under its .plan/ and .autoresearch/ configuration; the package keeps only the reusable procedure and synthetic qualification receipts. Begin read-only. Inventory each relevant legacy/new campaign's ID, purpose, goal, runtime/package/profile pin, controller/writer, active job status, source/evidence locations, spent costs, unresolved reservations, review/checkpoint identities and exposure authority reference.

Inspect only metadata and existing released receipts; do not open private label bytes. Accorde's base lock is not every campaign lock, its review runtime is not its execution runtime, and donor HEAD is not installed state. An unreconciled controller/job remains active or unknown. Existing untracked evidence stays at its recorded location.

For the existing project ledger at ~/.local/state/autoresearch/confirmation/accorde-ppp.sqlite3, record canonical path, backup/ownership status and necessary opening metadata under the project's rules. Do not initialize it if absent, copy it to an empty per-profile substitute, or enumerate private labels. Missing ledger/history blocks confirmation/retirement rather than being treated as no exposure.

## Three independent decisions

| Decision | Required evidence | Permitted outcome |
|---|---|---|
| New development/released-input work | Accepted M4/M5 route, operational value, exact runtime/profile lock, one admission owner, confirmed tool/source scope | Adopt for explicitly authorized new campaigns; confirmation remains off |
| Fresh confirmation | Full P06 ordering/linkage/aggregate semantics passed against existing authority, stable namespace/history, frozen subject and single-writer handoff | Enable only after exact qualified procedure/standing scope and independent agent review; otherwise remain disabled |
| Retire legacy dependency | No active/unknown campaign needs old runtime, complete budget/exposure/evidence continuity, verified backup and rollback | Archive reference/code conservatively; otherwise retain existing authority |

The minimal package need not ship a new confirmation implementation. If that authority still belongs to the old runtime, keep its narrow dependency until an actual reconciled handoff. Do not retire it solely to declare the new package standalone.

## Cutover work sequence

1. **Assess benefit and scope.** Use M5 event evidence for reduced human continuation work, actual automatic review, unknown outcomes and maintenance surface. Write the adoption decision in the hosted project workspace and bind it to that project policy/authority. If benefit is not established, retain the qualified pilot and defer adoption with a concrete reason.
2. **Pin the new route for new work.** Record package/profile/prompt/preset/evaluator locks and scope. Assign one admission writer for each new campaign. Keep active legacy H3 campaigns and their runtime pins until terminal or explicitly reconciled. Different campaigns may keep different runtimes; they must not share competing admission loops or a split exposure authority.
3. **Establish a single-writer transfer if needed.** Use existing supported pause/stop tools, wait for known jobs/reviews to settle or reconcile them, take an idle supported backup including WAL-safe handling, verify identity/history, then enable the receiving authority. An unresolved attempt remains charged. Do not simply copy a live SQLite main file or restore a stale ledger on rollback.
4. **Prefer reference-preserving continuity.** Keep historical immutable artifacts at their existing paths with hashes. Record legacy spent cost as preserved history, not zeroed new credit. If a one-off offline export/import is actually necessary, define its exact source/destination/version/count/hash checks as a separate small task. Reject duplicate IDs, unknown openings and changed history; no general migration service.
5. **Dry-run operational rollback on disposable state.** Revert execution/profile pins through the existing runtime, preserving current action consumption, costs and exposure. Confirm rollback cannot relaunch a settled/unresolved attempt, reuse a review or reopen data. Use an old compatible runtime only when it can retain the current authority records; otherwise leave execution stopped for reconciliation.
6. **Archive only eligible parts.** Make an archive manifest of donor code/plans/trackers/evidence references and retained dependencies. Archive means preserve recoverable references/history; it does not require deleting the checkout or archiving external tasks. Mark ineligible active/authority components retained, with a reason.

## Files and responsibilities

The project owner accepts new-work scope and any confirmation/retirement decision. The operator owns pause, supported backups, writer fencing and deployment pins. The implementer writes the compact project inventory, scientific decision, continuity and operator notes in the hosted project. dsh-research owns only reusable implementation/documentation and disposable tests.

Only a justified domain-result/legacy-authority adapter belongs in Accorde/autoresearch. Proposed runtime/source changes require their own scoped review and checks. Preserve verbatim prompts and timestamped revision histories for amended artifacts. Git commits/pushes and external publication follow explicit task authorization; this milestone plan is not itself deployment authorization.

## Validation and completion

Cross-check campaign inventory against runtime locks, existing controller/job metadata, evidence hashes and prior charges/openings. Verify one writer, no unknown executions and no lost/rewritten evidence for each transferred campaign. Test backup/restore and rollback on disposable state; never use real confirmation access as a continuity test.

M6 may complete new-work adoption while enabled confirmation or legacy retirement remain deferred. The decision must name which gates passed, which components remain pinned and why. Full retirement is complete only when every historical authority/history/dependency row is reconciled and no active workflow needs it. Deleting the donor or claiming whole-platform cutover to close a tracker is not completion.

Publish one final record linking accepted M1–M5 evidence, adoption scope, unresolved limitations, backup/rollback instructions and archive references. Preserve the original scientific endpoint and data-exposure limitations; switching the agent host creates no new scientific evidence.

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
| r1 | 2026-11-05 15:55:26 -0800 | Defined separate new-work, confirmation and retirement decisions with read-only inventory, single-writer continuity and rollback preserving consumed history. |
| r2 | 2026-11-05 16:26:56 -0800 | Renamed 20261105-m6-new-work-cutover-and-continuity.md to 261105-1555-m6-new-work-cutover-and-continuity.md using YYMMDD-HHMM; updated 2 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
| r3 | 2026-11-05 17:07:31 -0800 | Moved concrete inventories/cutover decisions and native persistence into host projects; documented safe project-local confirmation handoff and autonomous new-work continuation. |
