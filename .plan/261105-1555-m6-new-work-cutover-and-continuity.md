# M6 — Adopt new work and preserve authority through cutover

Created: 2026-11-05 15:55:26 -0800. Updated: 2026-11-11 23:30:50 -0800. Revision: r14. Implementation status and next work: [canonical M1–M6 tracker](tracker/261105-1555-milestone-execution.md).

Dependency: accepted M5 workflow evidence. New-work adoption, enabled confirmation and legacy retirement are separate gates; a pilot pass cannot satisfy all three.

Outcome: a project-owner decision with per-campaign authority, preserved budget/exposure and a reversible operational rollback.

Parent: [source review and milestone index](261105-1555-review-1201-1230-and-milestones.md). Tracking: [execution tracker](tracker/261105-1555-milestone-execution.md). The parent review owns source baselines and the reduced scope; this document defines the work and acceptance gate for its milestone.

## Project ownership and autonomous execution

The [state/autonomy contract](261105-1705-contract-project-state-autonomy-and-feedback.md), [M0/1616](261105-1616-m0-architecture-workflows-and-idempotency.md), [sharing/1621](261105-1621-plan-lark-research-review-and-sharing.md), [layout/1452](261109-1452-brainstorm-repo-clutter-and-team-artifacts.md) and [architecture meta loop](261111-1604-architecture-meta-loop-and-migration.md) define the current basis. P is the canonical hosted project across worktrees; its scientific state, resolved profiles, evidence, feedback and decisions stay there.

Classify by purpose: deliberate project branches have defined scope/deliverables and versioned plans, contracts and useful milestone evidence in P/.plan/. Explorative alternatives/per-attempt plans stay ignored under P/local_artifacts/autoresearch/dsh/<goal>/paths/<path-id>/planning/, with frozen snapshots/hashes, backups and team access. Large/raw outputs stay in project artifacts in either case. dsh-research owns its deliberate engineering plans and compact qualification receipts in .plan/review/; raw fixture logs/supporting alternatives may remain local. Purpose and acceptance, not the mere existence of a Git branch, determine the planning treatment.

Normal execution, diagnosis, separate agent review, alternatives and covered recovery are autonomous. Optional feedback or failed publication never blocks admissible work. Human scientific steering follows reviewed scoped exhaustion; operational holds preserve their unmet condition. The canonical tracker records implementation/qualification progress.

The target confirmation authority is project-local (for Accorde: .autoresearch/confirmation/accorde-ppp.sqlite3), but the existing global-path ledger is a transition exception. Do not move/create it during this documentation task. A supported idle backup, full history/charge/opening reconciliation and one-writer handoff must preserve the same authority before relocating it; active pins and irreversible history stay intact.

Resolved native stateDir, Session root, storage path and profile recipes belong to the hosted project. Rollback may change transport/code pins but cannot restore an old zero budget, consumed review or exposure state. Adoption and ordinary new-work continuation within standing policy are agent decisions; they do not require a fresh human approval. Scientific exhaustion is the required direction-escalation boundary.

## Inventory before changing authority

Include old/new [contract_ref](../docs/contracts.md), profile assurances, stage/native-record mappings and compatibility in the inventory. Keep active actions on their original contract snapshot. Rebind only new qualified actions after supported handoff; preserve historical trace meaning and monotonic consumption.


Version each deliberate migration charter, accepted plan and compact continuity/adoption receipt in the hosted project; keep explorative migration alternatives and raw inventories/logs in its ignored artifact root, with .autoresearch/ resolved configuration; the package keeps only the reusable procedure and synthetic qualification receipts. Begin read-only. Inventory each relevant legacy/new campaign's ID, purpose, goal, runtime/package/profile pin, controller/writer, active job status, source/evidence locations, spent costs, unresolved reservations, review/checkpoint identities and exposure authority reference.

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

## Architecture migration and plan/source cleanup

Apply the [1604 migration procedure](261111-1604-architecture-meta-loop-and-migration.md) to adoption consequences of a reviewed dsh-research architecture revision. Before package redesign, the dsh-research design author and separate reviewer must qualify T1–T4 using the material-core-blockage, architectural-cause and insufficient-local-repair gate. Routine project refactors, profile changes and migrations can use normal M6 continuity work without opening that meta loop. A qualified entry alone does not authorize deployment; the changed route, cost and affected project adoption must be qualified and within standing authority. Inventory exact contracts/writers and linked ignored plans, source/evidence, feedback/publication and consumption. Rehearse non-executing shadow and disposable supported export/restore; keep active runs pinned, use one charged released-input canary, and fence the old writer at a supported safe boundary.

Rollback must preserve post-cutover charges, reservations, consumed actions/reviews, exposure and feedback versions. Switch compatible code/profile rather than overwrite current authority with a stale backup; incompatible records require a hold or reviewed forward repair. Retirement requires no active/frozen/unknown dependency. Archive/restore exact historical source and detailed plan families, update summaries/references, then remove only eligible duplicates. Git ignore does not untrack files; focused integration must validate the resulting tree.

Retain required plan/evidence bytes in project backups and permitted team exports, with actual audience access and remote-retention status. Never retire the sole local copy on an unverified upload or a Doc link.

## Files and responsibilities

The project research author assesses adoption within standing authority with separate agent technical review; any uncovered goal/scope/permission condition uses the existing authorized route. No routine human scientific approval is added. The operator owns pause, supported backups, writer fencing and deployment pins. The implementer writes the compact project inventory, scientific decision, continuity and operator notes in the hosted project. dsh-research owns only reusable implementation/documentation and disposable tests.

Only a justified domain-result/legacy-authority adapter belongs in Accorde/autoresearch. Proposed runtime/source changes require their own scoped review and checks. Preserve verbatim prompts and timestamped revision histories for amended artifacts. Git commits/pushes and external publication follow explicit task authorization; this milestone plan is not itself deployment authorization.

## Validation and completion

Require the exact incoming version in the cumulative compatibility register and the adopter-specific assessment of each changed obligation before rollout. Documentation-only zero migration is not universal compatibility. Qualification-only envelope failures keep their owned triage/adoption holds and original costs; they do not authorize architectural migration by themselves.


Adoption cost comparisons retain original accepted W/D and C_run+C_qual, even when a separately reviewed longer-horizon analysis is offered. Qualification-budget/coverage holds carry the existing ownership/exit/reassessment fields and cannot expire into qualified execution.


Assess added 2.2.0 coverage and 2.3.0 qualification-budget obligations explicitly for each adopter before qualified rollout. The current document edit has zero executed runtime/state migration here; that does not establish zero external compatibility impact. Preserve old version-bound receipts and include qualification/requalification in adoption cost/horizon without duplicate charges.


Before adopting a revised profile, require the exact frozen coverage matrix to close at the claimed fixture/live assurance, including all boundary/mode/lifecycle/interaction cells and applicability proofs. Original-witness regression alone or one positive example does not cover the declared scope. Keep failed/unresolved cells and require new review for scope narrowing.


Any revised contract/profile adoption requires every applicable property plus original-witness regression; retain proof for not_applicable results. Structural entry must be rechecked against current applied bindings, and stale reviews cannot transfer. Resolve historical traces by exact contract/version/hash/property ID; optional query concordance is separate from semantic migration. Deadline-expired holds stay held until actual exit conditions pass.


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
| r4 | 2026-11-11 16:04 -0800 | Aligned with 1616/1621/1705/1452: ignored detailed planning and receipts, frozen identity, accessible team exports, focused integration and bounded architecture revision/migration; preserved prompts/history and pending runtime gates. |
| r5 | 2026-11-11 16:14 -0800 | Distinguished deliberate scoped/versioned plans from explorative retained detail; restored package-owned compact qualification receipts and purposeful project migration/pilot plans without changing scientific authority or execution status. |
| r6 | 2026-11-11 16:38 -0800 | Adopted 1604's package-architecture scope, T1–T4 evidence gate and maintainer/reviewer ownership; kept routine project triage, scientific autonomy and deployment qualification separate. |
| r7 | 2026-11-11 17:07 -0800 | Linked canonical research-loop contract 1.0.0, pinned stage/invariant/trace semantics and retained prospective runtime qualification and project authority. |
| r8 | 2026-11-11 18:12 -0800 | Adopted human-review contract 2.1.0 clarifications in current references/qualification plans; retained pending runtime guarantees and historical bindings. |
| r9 | 2026-11-11 19:01:22 -0800 | Adopted contract 2.2.0 applicability/coverage clarification and review-r5 residual closure; retained prospective provider qualification and historical evidence. |
| r10 | 2026-11-11 20:22:19 -0800 | Adopted 2.3.0 obligation/compatibility and qualification-budget/T4 accounting references without executing runtime changes. |
| r11 | 2026-11-11 20:31:48 -0800 | Adopted 2.3.1 accepted-envelope amortization, owned qualification holds and explicit T4 C_run/C_qual evidence without runtime activation. |
| r12 | 2026-11-11 21:13:38 -0800 | Adopted cumulative 2.3.2 compatibility assessment and explicit qualification-budget/envelope arbitration without runtime execution. |
| r13 | 2026-11-11 21:39:00 -0800  | Recorded M1 encoding/public-provider development and contract 2.3.3 bindings; kept independent conformance, integrated launch, M2–M6 and migration gates pending. |
| r14 | 2026-11-11 23:30:50 -0800 | Delegated current implementation status and next work to .plan/tracker/; retained milestone scope, gates and historical evidence. |
