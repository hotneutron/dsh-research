# Architecture revision meta loop and migration procedure

Created: 2026-11-11 16:04 -0800. Updated: 2026-11-11 21:13:38 -0800. Status: proposed procedure; documentation alignment only. No runtime implementation, hosted-project migration, scientific execution or cloud publication is performed by this task.

## User Prompt, Verbatim

~~~text
validate/update all the *-1555-* according to the latest docs like 1616, 1621, 1704, and 1452. 
also propose a meta loop to revise/refactor the whole research architecture all over when needed (answer when/how/what/etc), and how to migrate.
~~~

## Placement and review status

This file is the self-contained shared architecture proposal for team review. Its governing triggers, roles, bounds, migration invariants and rollback requirements are versioned together in .plan/. Deliberate migration charters, accepted rollout plans and compact qualification receipts are versioned development records. Only explorative alternatives, per-attempt planning and large/raw logs use ignored project-owned artifacts. This purpose-based distinction refines 1452; it is not a blanket rule for all branches or all dsh-research files. The earlier local draft is an immutable supporting snapshot, not a second maintained authority.

The procedure is proposed, not deployed. Existing state/autonomy policy and frozen campaign contracts remain authoritative until a qualified, authorized adoption. A clean-sheet proposal cannot waive those invariants merely by changing architecture version.

## Placement Request, Verbatim

~~~text
justify the 1604 doc being in the local_artifacts/
~~~

## Branching Clarification, Verbatim

~~~text
my earlier request was referring to the <project>'s research branches, not dsh-research itself. 
the key difference here is not about branching, it's about purposeful/delibrate branching and explorative branching.
~~~

## README Request, Verbatim

~~~text
write a README.md according to the plans, then emphasize the "delibrate branching vs explorative branching" in the README.md
~~~

## Trigger Review Request, Verbatim

~~~text
justify "When to enter the meta loop" in the 1604 doc, add to the "justificaiton" column.
also add "evidence" column to indicate what needs to be tracked for the trigger to be pulled.
Some trigger are too minor to be in the meta loop, some are too vague.
~~~

## Deliberate versus explorative work

Deliberate branching is a scoped programme with a defined question/change, method, acceptance conditions, limits, owner and deliverable. Its accepted plans/contracts and useful evidence are versioned in the relevant project or package. Explorative branching investigates uncertain alternatives; retain its detailed/per-attempt planning in ignored project artifacts and commit useful findings. Neither physical branch count nor a positive metric determines the category.

Explorative work becomes deliberate when its purpose, scope/method, bounds, acceptance and intended output/integration are defined and reviewed within standing authority. Version the accepted plan and preserve earlier exploratory snapshots. A valid negative result can complete a deliberate experiment. Large/raw outputs stay in artifacts in both categories. dsh-research's own milestone and architecture development is deliberate and remains versioned.

## Current basis and scope

The checked-out state/autonomy contract is [1705](261105-1705-contract-project-state-autonomy-and-feedback.md); no 1704 document was found. Use it with [M0/1616](261105-1616-m0-architecture-workflows-and-idempotency.md), [sharing/1621](261105-1621-plan-lark-research-review-and-sharing.md), and [clutter/1452](261109-1452-brainstorm-repo-clutter-and-team-artifacts.md). Older 1230/1555 drafts are refined by these contracts. M1–M6 implementation remains pending.

The meta loop revisits dsh-research's own architecture: its reusable research contracts, responsibility boundaries, helper interfaces, DSH/provider composition, review/admission policy, evidence and feedback integration, and project-ownership guarantees. Hosted-project failures are input evidence; revising their hypotheses, evaluators or scientific objectives remains project research. A qualified structural problem can justify a clean-sheet package design; a local defect does not. Project migration below describes adoption consequences of a revised dsh-research design.

Keep the current reuse-first thin package as the default comparison. A new coordinator, scheduler, artifact service or UI requires evidence of a concrete unsatisfied need, a separately assessed implementation/operating cost and authorization for that expansion. It is not inherited parity work. This procedure uses existing workers, agent review, jobs, storage and source follow-ups; it adds no running service.

## Canonical baseline for architecture audit

The [research-loop contract](../docs/contracts.md) is the normative expected-behavior baseline. Every T1–T4 packet must pin contract ID/version/content hash, affected stage/invariant, accepted project policy requirement and package/provider/profile assurance. Compare actual native traces against that frozen baseline; current docs/contracts.md is specified, not an implemented/live guarantee.

T1 names the category-scoped property IDs and the violating L/F transition; T2 identifies required stage/provider semantics; T3 compares conflicting supported workflow obligations/traces; T4 attributes required coordination/review/persistence cost by stage within accepted units/window/cohort. A defect or incomplete provider mapping first receives local triage. Structural impossibility still requires the full separate review gate below. [Contract/reference checks](review/261111-2112-N11-N12-validation.json) qualify documents only.

## Two levels of iteration

The scientific loop changes a hypothesis, candidate or method inside a qualified architecture. The architecture meta loop changes the shared dsh-research contracts and composition governing representation, checking, review, admission and integration; project-specific changes use the scientific loop or ordinary integration work. A valid negative result is normally scientific-loop evidence; an unknown job is execution reconciliation; neither automatically warrants a platform rewrite.

A project diagnostic qualifies as architectural evidence only if it demonstrates a limitation of dsh-research's accepted reusable contract, rather than a domain method or dataset. Reassess scientific-method limitations in the project first. A package refactor cannot change acceptance thresholds, turn invalid rows into valid evidence or make exposed data fresh. A genuinely changed scientific objective uses the project's authorized goal-change route.

## Triage, requirement revision and owned holds

Use the [contract's review paths](../docs/contracts.md) to choose local repair, a justified requirement/applicability revision, or T1–T4 architecture assessment. Challenge over-constraint prospectively through an exact contract-delta review and compatibility/qualification; preserve inherited non-waivable project/user validity, privacy/exposure, bounds and stop policy. Revision cannot erase old failures/consumption or classify already viewed protected data as fresh. A contract revision is not architectural entry.

Contain dangerous/unresolved routes before assessment. Each required disabled/held route keeps owner, reason/property/evidence, affected scope, exit conditions, next event/check and reassessment deadline. Review overdue/continued disablement through existing bounded wakeups; time expiry does not enable work, prove T1 or complete qualification. Permanent unsupported scope needs an explicit prospective decision rather than an invisible temporary workaround.

Freeze the supported repair matrix (configuration, adapter, public facade/equivalent route, compatible version, authority-preserving correction), per-class outcomes/rule-out/applicability evidence and review. Relevant unresolved candidates keep entry unqualified; cost/permission unavailability is an operational hold. T1 combines bounded empirical/capability evidence with a structural barrier in adopted scope, not an unbounded claim that every future repair is impossible.

Entry/contract-revision reviews use the contract's exact review-receipt shape with distinct subject kind, actual separate reviewer completion, packet/evidence/repair-matrix/contract/profile hashes, scope/cost and decision. Changes to those applied bindings or superseding evidence make entry stale and require reassessment; old decisions and active frozen runs remain immutable. T2 requires an individually missing capability; T3 requires individually satisfied obligations and a jointly failing same-profile witness with cross-breaking repairs. Keep one episode and primary classification for related symptoms.

## Qualification costs in the T4 envelope

The [contract budget rule](../docs/contracts.md) requires qualification/requalification C_qual in package coordination, separate from science C_science. Freeze cell/execution estimates and the accepted envelope_ref/window/denominator, units/rates and budget owner before evaluating coverage. Default H = W and accepted D; a separately reviewed longer horizon never replaces original-window cost/pass-fail. Report recurring C_run and C_qual separately and together for the accepted horizon; steady-state reporting cannot hide one-off qualification costs. Link reused physical executions and allocate once under a predeclared rule. Budget/coverage shortfall uses the owned hold record (owner, affected cells/scope, evidence/budget, exit/revisit/deadline); expiry alone cannot enable qualification. Budget overrun first triggers bounded replanning/hold; T4 still needs material architectural cause and insufficient narrower optimization.

## Cost-failure classification before T4

Apply the [contract arbitration](../docs/contracts.md): qualification-budget failure is owned plan/operational hold; budget-sufficient C_qual-only envelope failure still starts with plan/baseline/requirement review. It remains a recorded original-window failure and can hold adoption. Only a demonstrated avoidable architectural step in C_run or C_qual, with material impact and insufficient narrower optimization, is a T4 candidate. Expensive mandatory coverage or short W is not entry. The science pilot's timeout reservation is not automatically the coordination envelope.

## When to enter the meta loop

Entry concerns dsh-research's shared architecture. A signal first receives ordinary defect/configuration/integration triage. Contain a dangerous or unresolved action immediately; architectural review is a separate decision and must not delay containment.

Enter only when a separate agent technical reviewer verifies all three conditions: (1) a still-valid, applicable accepted core requirement or operating envelope is materially blocked, (2) the cause is a responsibility boundary, reusable contract, authority model or runtime composition, and (3) the frozen supported repair matrix and structural evidence show narrower repair is insufficient. A local patch touching multiple files is not by itself an architectural change. Missing evidence leaves the signal in diagnosis or local repair, without opening a redesign episode.

| Trigger: entry condition | Justification | Evidence | First response | Review scope |
|---|---|---|---|---|
| T1 — The adopted architecture cannot enforce a non-waivable identity, validity, accounting or exposure invariant within its supported scope, after local repair is ruled out | A demonstrated enforcement barrier within the adopted composition invalidates its guarantee; changing ownership or contract semantics may be necessary. A single implementation bug does not establish that impossibility | Pin contract_ref and name the category-scoped property IDs, affected L/F stage and accepted guarantee/assurance; pin package/DSH/provider versions and effective profile; retain expected versus observed operation/authority trace and minimal reproducer; retain the finite repair matrix and structural/capability barrier (trial failures alone are insufficient); identify the boundary that must change and the reviewer's structural finding | Hold only the affected route; preserve evidence and reconcile execution. Repair locally if possible; invoke the meta loop only after the structural finding | Responsibility/authority boundary, public contract and trusted execution/state composition |
| T2 — An accepted supported-runtime or core integration requirement cannot be met by the adopted composition without changing shared contracts or responsibilities | Losing a required lifecycle, persistence or review semantic can invalidate the chosen composition. A renamed API, optional provider or speculative feature normally needs compatibility work instead | Pin contract_ref, required L/F semantics, accepted requirement and profile compatibility matrix; pin old/new semantics and versions; demonstrate the individually missing required capability with a bounded consumer/fixture; compare available configuration, adapter/facade and compatible-version routes; show why each fails the requirement and identify affected shared contracts/consumers | Keep active pins and disable the unsupported prospective route. Qualify ordinary compatibility options before redesign | Supported runtime/provider composition and reusable interfaces; any added service requires its own justified scope/cost |
| T3 — Shared architectural coupling produces a reproducible conflict between supported workflows that cannot be removed within existing contract boundaries | Opposing ownership or state/identity assumptions can make every local fix break another supported guarantee. Duplicate files, repeated tickets or code size alone do not demonstrate that conflict | Pin the shared contract_ref and conflicting invariant/stage obligations, then identify consumers; retain dependency/ownership maps plus positive isolated witnesses and a joint failure under the same bound profile/configuration space; show which attempted local repair fixes one guarantee but breaks another and why configuration cannot separate them; retain the proposed boundary change and independent review | Reproduce and isolate the shared conflict; continue unaffected workflows. Use ordinary consolidation if no contract conflict exists | Contract separation, ownership and helper boundaries; no automatic whole-package rewrite |
| T4 — Required dsh-research coordination/review/persistence overhead prevents supported work from fitting an accepted operating envelope, and local optimization cannot resolve it | An architecture that defeats its accepted cost/capacity objective may need a different workflow or composition. A slow trial, aesthetic clutter or an unspecified desire for less overhead is insufficient | Pin contract_ref and record required avoidable-architecture attribution after budget/envelope arbitration, plus stage-attributed package overhead, limit/units/rates/window, cohort/denominator and statistic frozen before measurement with order evidence; retain accepted W/D costs with explicit C_run/C_qual and the contract qualification-cost rule; extended analyses keep separate review and original-envelope pass/fail; separate scientific workload cost and overlapping wall intervals; retain baseline/observed cost or capacity, variance or conservative bounds, attribution to required package steps, local-optimization results, and a reviewer-checked estimate of redesign/canary/qualification cost versus recoverable benefit, with C_run/C_qual and accepted horizon/allocation | Attribute and measure the overhead first; optimize locally. Enter only if the residual violation and structural cause satisfy the gate | Required workflow/coordination steps and composition; preserve scientific review and consumption invariants |

A conclusive structural counterexample can qualify without waiting for recurrence. Recurrence strengthens diagnosis but is neither necessary nor sufficient; the former two-family/three-checkpoint counts are removed. Threshold, units/rates, cohort/denominator, statistic and observation window must be frozen before the relevant T4 measurements; do not select them after seeing a convenient result. No implementation or measured trigger is claimed by this planning document.

The following are signals or ordinary work, not independent entry triggers: an isolated job failure or bug; a routine provider/API/configuration update; a negative scientific result or new project hardware/input; a missing permission or inaccessible Doc asset; source/plan cleanup without a shared-contract conflict; and a milestone/goal checkpoint. A checkpoint is an opportunity to inspect evidence and can conclude no architectural action is needed. Escalate a signal only if it satisfies a table row and the full entry gate.

Track one compact package-development trigger record: trigger ID/category and status (signal, local repair or architecture review qualified), accepted requirement, package/provider/profile pins, bounded reproducer or comparable cohort, expected/observed facts with source hashes, local repair attempted/ruled-out reasoning, architectural boundary and affected consumers, proposed success measure, reviewer completion/role and exact receipt/packet hash, applicability proof, entry-validity/reassessment conditions and review-cost limit. Keep the qualified entry decision with the deliberate architecture plan; raw engineering traces may stay local. Project-owned scientific evidence remains in P and is referenced through permitted frozen artifacts, without copying its authority into the package.

Use existing completion/scheduled/worker routes to inspect these records at safe boundaries; add no watcher or new trigger database. Entry authorizes only a bounded architecture assessment within standing scope. Redesign, deployment and migration still require their exact reviewed contracts and applicable authority.

## What the review must reconsider

Inventory the full route, even when only one boundary changes:

- The shared goal/method/evidence contract and its accepted guarantees; project claims and scientific assumptions are impact context, not objectives this loop may silently change.
- Hypothesis/candidate/method representation, allowed source changes, inputs/splits, evaluator and environment pins.
- Actual job lifecycle, deadlines, ownership, retries, unknown executions and complete charged/reserved costs.
- Separate agent review, exact action consumption, stop/hold policy and autonomous continuation.
- Canonical project_root, native storage/Session paths, writer topology and irreversible exposure authority.
- Branch-plan/source organization, reusable interfaces, dependency surface, source archive and final integration identity.
- Team audience, accessible artifact bytes, optional Doc view, captured feedback, dispositions and measured effects.
- Backup/restore, schema/profile compatibility, migration adapters and retirement obligations.

Keep a before/after responsibility map for each changed component. State what will remain pinned, what will be replaced, who writes it, its persistent location, supported API/version, compatibility window and evidence needed to enable it. Code compatibility and scientific comparability are separate questions.

## Who acts and where records live

| Role | Responsibility | Persistence |
|---|---|---|
| dsh-research design author/maintainer | Triage and qualify package-architecture triggers, freeze the baseline, compare alternatives and own the deliberate revision plan | Versioned package plan/entry decision and compact engineering receipts; local raw supporting traces |
| Separate agent reviewer | Challenge structural entry evidence, diagnosis, alternatives, invariants, expected benefit and migration safety | Compact package review/decision record; referenced scientific evidence remains in P |
| Package implementer | Implement and qualify the reviewed reusable design when authorized | Package code, versioned compact qualification receipts and local raw fixture logs |
| Hosted-project integration owner | Supply permitted boundary evidence and assess/adopt a revised package while preserving scientific authority | Project-owned evidence and deliberate adoption/migration plan in P |
| Project operator or existing deployment route | Supported backups, writer fencing, profile/package changes and handoff | Project resolved configuration and migration receipt |
| Domain verifier owner | Assess changed measurements/representation and required revalidation | Project evaluator/evidence records |
| Team member | Optional input and artifact-access assessment | Native collaboration source plus captured project version |

Within standing authority, assessment and technical review are autonomous. Request human scientific steering only after challenged scoped scientific exhaustion and a materially different rebrainstorm has no admissible route. A missing permission, uncovered cost, incompatible API or unresolved writer is an operational hold; it is not that scientific conclusion. This proposal does not authorize deployment or an expanded budget.

## How one bounded revision episode proceeds

1. After the entry gate passes, the dsh-research design author freezes a package trigger packet: accepted requirement, structural diagnosis, repair evidence, package/provider pins, affected contracts/consumers and permitted project evidence references. Give it a stable episode ID independent of Ticket, Session or Doc IDs.
2. Freeze an as-is architecture map and baseline. Include known/unknown jobs and dependencies, current contract versions and measurements. Reuse released/captured evidence; do not open private labels just to inventory it.
3. Compare keep-as-is, a narrow repair/refactor and an end-to-end alternative. For each, explain causal mechanism, expected effect, implementation/ongoing cost, disruption, qualification and migration. For a deep review, genuinely reassess boundaries rather than rename old modules.
4. The separate agent reviewer challenges whether the problem is architectural, whether the alternatives preserve the canonical property set and whether cheaper reuse suffices. Missing evidence returns request_changes or an operational hold. The author revises within the declared design budget; no human approval is added to ordinary technical review.
5. Freeze a target architecture revision, exact changed contracts, compatibility requirements, acceptance evidence, migration/rollback and total revision/canary bounds. Review identity binds this packet and evidence. An illustrative architecture_ref can be carried in the existing manifest/profile pins; it is not a new authority database.
6. Qualify with disposable fixtures and read-only shadow interpretation of already captured evidence. Shadow consumers may not reserve, launch, consume reviews/openings, write authoritative state or inspect private inputs. Differences are diagnoses, not retroactive edits to old receipts.
7. Prepare focused reusable-code integration and a project-specific adoption record. Preserve original evaluated source and final integration tree; changed behavior gets applicable revalidation. Version accepted deliberate architecture plans and compact qualification/adoption receipts; keep explorative alternatives/per-attempt planning and raw logs in ignored artifacts.
8. Execute the qualified migration/canary only when its scope, cost, tool permissions and review are covered by standing authority. Otherwise retain the proposal and unmet condition while unrelated admissible work continues.
9. Compare measured benefit with the baseline, record adopted/rejected/deferred plus why, update references and publish the actual effect through existing team surfaces. Retire old components only after dependency/continuity verification.

Each episode declares design/review/implementation/canary limits and stop conditions. A proposed default is at most two substantive redesign revisions before reassessment; there is no automatic scope or budget extension. Avoid an unchanged architecture debate loop. If no qualified technical replacement exists, preserve current pins or the affected hold. That is architectural/operational exhaustion, not automatically scientific exhaustion. Reopen only on material new evidence, requirements or authority.

## Migration procedure

### Inventory and compatibility

Classify consequences of the reviewed package revision as code-only refactor, profile/provider change, project-state/schema transition, source/plan relocation, shared evidence/review contract change or sharing-surface change. These can require different evidence. A code-only change with compatible existing state need not move a database. Changed shared contracts can require project-owned evaluator/input/source revalidation; project scientific-method changes remain separate work.

Create a project-owned migration manifest listing old/new architecture/profile/package/schema versions, canonical P, exact source/evidence/plan refs, current writers, active/unknown jobs, expected state transitions, prerequisites, backups, cutover window and rollback conditions. The deliberate migration charter, accepted rollout plan and compact continuity/adoption receipt are versioned under the project .plan/. Explorative migration alternatives, per-attempt checklists and raw inventories/logs use P/local_artifacts/autoresearch/dsh/<goal>/paths/<path-id>/planning/ or a goal-level ignored artifact directory.

The manifest accounts for aggregate charges, reserved/unresolved attempts, consumed actions/reviews, feedback body versions/cursors/dispositions, successor/effect links, publication IDs and pending operations, native Tickets/Session/job associations and confirmation-opening history. Keep the same scientific project/population identity; renaming the tool or campaign cannot reset any consumption.

### Rehearsal and canary

Use supported provider exports/backups and synthetic state for restoration rehearsal. Preserve original bytes/hashes/IDs; new wrapper metadata or schema translations have their own version and mapping. Require complete counts/identity mapping, monotonic consumption, referential integrity and declared handling of records that cannot be represented. Unknown/unmapped authoritative state blocks handoff rather than being dropped.

Use one released-input canary with declared budget and the same canonical project authority. Keep confirmation off in the current M1–M5 route. Do not duplicate a real scientific execution under old and new writers for a comparison; shadow replay is non-executing, while any fresh benchmark is a separately admitted charged action. Verify stop/deadline/restart, invalid and negative outputs, reviewer scope, feedback replay and release access.

Active campaigns remain on their old frozen code/profile until terminal or explicitly reconciled. Installation of a new package does not update a running preset, provider root or execution contract. Recheck actual assembled prompts/tool restrictions and recorded pins.

### Single-writer cutover

At a supported safe boundary, hold new admissions for the affected authority, drain/query/cancel existing work as declared and settle or retain unknown reservations. Use a supported idle or online backup including the native database's required WAL handling; never copy only a live main SQLite file. Export linked artifact versions and pending feedback/publication associations as a consistent recovery set.

Fence the old writer through existing supported ownership/stop operations. Verify the expected old binding and receiving version, then switch resolved project configuration through the qualified native mechanism. Do not invent private SQL writes or an unsupported atomic migration API; a missing operation is a narrow prerequisite and keeps handoff disabled. At most one writer may mutate each coupled scientific authority. Read-only views may coexist.

Preserve global exposure authority until its own ordering/history/single-writer gate is satisfied. If a legacy runtime is still required for that authority, retain that narrow dependency. A successful released-input adoption does not enable fresh confirmation or authorize legacy retirement.

### Verify and rollback

Check exact record and artifact identities, current cost/consumption high-water marks, reservations, pending feedback/effects/publication, references and provider paths after cutover. Rebuild the team brief from project records and verify the intended audience can open the required permitted assets. A Doc or Git clone alone is not a full project recovery set.

Rollback means switching code/profile to a version compatible with current authoritative records. First stop the receiving writer and reconcile its actions and pending effects. Preserve all newly incurred charges, consumed actions/reviews, exposure and feedback versions. Do not restore a stale database snapshot over post-cutover consumption. If compatibility is unavailable, leave the dependent execution held for reconciliation or a reviewed forward repair; do not fabricate old-state compatibility.

After the declared observation window, verify no active/frozen/unknown consumer needs old code, plans, runtimes or source paths. Archive source/prerequisite objects and ignored detailed plans, validate restore, repair summary/manifests and remove only eligible duplicates through a scoped authorized cleanup. Historical evidence remains attributable to its original method/architecture; inherited claims are requalified where assumptions changed.

## Acceptance and stopping

Applicable-property regression must close the [frozen declared-scope coverage matrix](../docs/contracts.md): positive/rejecting witnesses, known fault shapes, claimed L/F transitions, supported modes and lifecycle/interactions, with exact native evidence and assurance. A small chosen subset cannot certify a broader claim; scope narrowing requires new prospective review and preserves old failures.


Before enabling a revision, regress every applicable canonical property with retained applicability proof, rerun its frozen original failure/envelope witness and demonstrate that it no longer reproduces in the tested scope, then verify preservation of the canonical property set, single project ownership, unchanged historical bytes/IDs, monotonic cost/exposure/action consumption, no shadow launch, no duplicate migration/canary, no implicit human gate, ignored-plan restoration, focused integration and remotely accessible permitted release bytes. Distinguish unit/scripted fixtures from live provider qualification.

After adoption, require original-witness non-reproduction and applicable property regression as well as a measured effect tied to the original trigger: improved reliability/compatibility, reduced continuation or maintenance work, successful claim-testing capability, or usable team access. A requirement supersession follows the parallel reviewed contract lane and preserves the original failure; it is not proof that an unchanged witness disappeared. A module rewrite, published Doc or green mocked test count alone is not benefit. Failed benefit or qualification returns to retained baseline/compatible rollback/explicit hold; a fulfilled scientific goal ends normally.

## Supporting qualification records

[Earlier document validation receipt](review/261111-1604-document-validation.json) records the preceding 1555/README alignment and its as-of input hashes; it does not certify this later trigger-table revision. This compact package qualification record is versioned; raw supporting baselines/logs are local. It is not scientific state or runtime qualification. The [initial detailed draft](../local_artifacts/dsh-research/architecture-revision/261111-1604-architecture-meta-loop-and-migration.md) is a retained local snapshot; no team export has been performed in this task.

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-11 16:04 -0800 | Proposed bounded end-to-end architecture review, continuity-preserving migration/rollback and linked ignored detail; aligned all 1555 milestone documents without executing runtime milestones. |
| r2 | 2026-11-11 16:09 -0800 | Made the shared architecture proposal self-contained in .plan/ for versioned team review; retained local artifacts for supporting drafts, detailed rollout plans and raw validation. |
| r3 | 2026-11-11 16:14 -0800 | Applied the purpose-based hosted-project branching distinction, preserved deliberate package/migration plans and compact receipts, and recorded the README request. |
| r4 | 2026-11-11 16:29 -0800 | Restricted entry to evidenced dsh-research structural problems, added Justification/Evidence columns and a conjunctive review gate, removed minor/vague automatic triggers and arbitrary recurrence counts, and clarified package versus project responsibilities. |
| r5 | 2026-11-11 17:07 -0800 | Linked canonical research-loop contract 1.0.0, pinned stage/invariant/trace semantics and retained prospective runtime qualification and project authority. |
| r6 | 2026-11-11 17:46 -0800 | Adopted contract 2.0.0 category-scoped predicates/counterexamples in current conformance and audit references; preserved historical source numbering and evidence without canonical aliases. |
| r7 | 2026-11-11 18:08 -0800 | Applied human-review safeguards for requirement triage, finite repair evidence, exact/stale structural review, pre-measurement T4 definitions, T2/T3 separation, witness regression and owned disablement. |
| r8 | 2026-11-11 19:01:22 -0800 | Adopted contract 2.2.0 applicability/coverage clarification and review-r5 residual closure; retained prospective provider qualification and historical evidence. |
| r9 | 2026-11-11 20:22:19 -0800 | Adopted 2.3.0 obligation/compatibility and qualification-budget/T4 accounting references without executing runtime changes. |
| r10 | 2026-11-11 20:31:48 -0800 | Adopted 2.3.1 accepted-envelope amortization, owned qualification holds and explicit T4 C_run/C_qual evidence without runtime activation. |
| r11 | 2026-11-11 21:13:38 -0800 | Adopted cumulative 2.3.2 compatibility assessment and explicit qualification-budget/envelope arbitration without runtime execution. |
