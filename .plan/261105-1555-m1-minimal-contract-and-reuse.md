# M1 — Freeze the minimal contract and verify reuse

Created: 2026-11-05 15:55:26 -0800. Updated: 2026-11-11 23:30:50 -0800. Revision: r16. Implementation status and next work: [canonical M1–M6 tracker](tracker/261105-1555-milestone-execution.md).

Dependency: reviewed milestone breakdown. This milestone is in progress. The pinned-alpha public consumer checks are recorded below; the source audit alone is not runtime qualification.

Outcome: one reviewable contract and one exact, demonstrably compatible ordinary-worker route.

Parent: [source review and milestone index](261105-1555-review-1201-1230-and-milestones.md). Tracking: [execution tracker](tracker/261105-1555-milestone-execution.md). The parent review owns source baselines and the reduced scope; this document defines the work and acceptance gate for its milestone.

## Project ownership and autonomous execution

The [state/autonomy contract](261105-1705-contract-project-state-autonomy-and-feedback.md), [M0/1616](261105-1616-m0-architecture-workflows-and-idempotency.md), [sharing/1621](261105-1621-plan-lark-research-review-and-sharing.md), [layout/1452](261109-1452-brainstorm-repo-clutter-and-team-artifacts.md) and [architecture meta loop](261111-1604-architecture-meta-loop-and-migration.md) define the current basis. P is the canonical hosted project across worktrees; its scientific state, resolved profiles, evidence, feedback and decisions stay there.

Classify by purpose: deliberate project branches have defined scope/deliverables and versioned plans, contracts and useful milestone evidence in P/.plan/. Explorative alternatives/per-attempt plans stay ignored under P/local_artifacts/autoresearch/dsh/<goal>/paths/<path-id>/planning/, with frozen snapshots/hashes, backups and team access. Large/raw outputs stay in project artifacts in either case. dsh-research owns its deliberate engineering plans and compact qualification receipts in .plan/review/; raw fixture logs/supporting alternatives may remain local. Purpose and acceptance, not the mere existence of a Git branch, determine the planning treatment.

Normal execution, diagnosis, separate agent review, alternatives and covered recovery are autonomous. Optional feedback or failed publication never blocks admissible work. Human scientific steering follows reviewed scoped exhaustion; operational holds preserve their unmet condition. The canonical tracker records implementation/qualification progress.

M1 must qualify explicit storage-sqlite Config.path, session-persistence-jsonl Config.root and superagent Config.stateDir under P. Test that a worktree/profile/clone cannot silently create a second project budget or exposure authority. No project record or Doc mapping is stored under dsh-research or a package-global default.

The reviewer/capability checklist also checks a complete feedback scan, durable project capture, queued item recovery and no human_action during a normal author/reviewer cycle.

## Implementation checkpoint

The TypeScript package now exports the four confirmation-off record schemas and exact-byte/logical-action/compatibility/envelope binding checks. Contract 2.3.3 incorporates N13–N15: retrospective register labels, compatibility_row_ref and binding from the accepted envelope declaration. [Fixture scope](review/261111-2124-m1-scope.json) and [capability receipt](review/261111-2124-m1-runtime-capabilities.json) retain bounds, commands, hashes and limitations.

Unchanged superagent with its 0.2.1-alpha.2 DSH dependencies passed typecheck, 1,197 tests and build. A public-name consumer exercised native SQLite serialized reservation/replay/reopen and the actual AgentLoop/SubagentRuntime with separate scripted author/reviewer Sessions and gated wait/list/selected-drain operations. Encoding fixtures refuse declared controlled violations. Raw traces and synthetic state stay in ignored package-development artifacts.

M1 remains incomplete: independent contract/profile qualification review, Ticket-to-guarded-job integration, launcher order proof, uncertain-launch/restart reconciliation, resolved persistence/profile authority and the complete required capability coverage need evidence. No production route, live model review, hosted-project state migration, protected input or M5 pilot is enabled. M2’s [guarded native fixture](review/261111-2142-m2-package-receipt.json) now binds these public boundaries and demonstrates actual shell/jobs and project-root Session persistence. Independent M1 qualification and Ticket/source integration remain gates.

## Work packages

1. **Record and select the runtime pair.** Use the specified [research-loop contract 2.3.3](../docs/contracts.md) and retain [the timestamped capability receipt](review/261111-2124-m1-runtime-capabilities.json). The normative document exists; M1 still must qualify its public provider mappings and actual runtime pair. Record checkout commits, package/export versions, effective profile and lock hashes, Node and per-repo pnpm versions. Prepare a supported Node >=24.9 environment when implementation is authorized; respect each repository's package-manager pin. First qualify unchanged superagent against a compatible pinned DSH release. Test the actual subagent wait/list/drain behavior rather than trusting a cast or a successful standalone typecheck. If only current harness source is acceptable, document an isolated prototype compatibility diff and its affected consumers for review before applying it. Keep framework source changes out of the core package.

2. **Freeze the public encoding of four semantic records.** Implement/profile-qualify the manifest, evidence receipt, review packet and checkpoint already specified in docs/contracts.md. Bind contract ID/version/content hash and supported assurance level along with the existing action identities. Use one schema/version and existing domain output wherever possible; require canonical project_root/authority identity independent of worker cwd or worktree. Manifest fields: project/stage; full original prompt; goal/context/plan revision and immutable plan snapshot/hash; architecture/profile revision; candidate commit/tree/config hashes; evaluator/verifier and interpreter identity; input hash/split/purpose; environment relevant to reproducibility; exact command/argv/cwd/env; timeout and attempt limits; declared result fields and acceptance policy. A dirty checkout needs an explicit content digest including relevant untracked files, or a frozen separate worktree. HEAD alone is insufficient.

3. **Define the evidence and decision vocabulary.** Separate execution status, evidence validity and domain verdict. Record owner Session, job/tool-call identity, admission/action ID, actual terminal classification, exit/signal/timeout/abort facts, immutable result-byte hash and verifier identity. Missing settlement, overflow/truncation, drift and contradictory identity defer acceptance. A valid negative domain result can lead to diagnose/pivot/stop. Review binds the whole subject plus exact next action; checkpoint records question, alternative, outcome, rationale, uncertainty, evidence, remaining bounds and continue/diagnose/pivot/defer/stop.

4. **Choose one existing state boundary.** Prefer the selected harness's publicly exported storage-domain facility. Store one compact project-owned coupled record containing project/goal revision, aggregate charges, consumed attempts/reserved timeout, active action, review/feedback consumption and checkpoint/publication associations. Configure the existing storage-sqlite path as P/.autoresearch/dsh/state.sqlite3; active legacy authority stays in place until reconciled. Use its serialized record update, await durability before launch, and one configured host writer. Counters and action deduplication must change in the same record update. Keep completed artifacts in P/local_artifacts/autoresearch/dsh/<goal>/ and configure native Session persistence root=P/.autoresearch/dsh/sessions/. Set superagent stateDir=P/.autoresearch/dsh/superagent/; these existing providers own their physical formats. This is the initial pilot's admission state, not a new project financial ledger or exposure store. If the selected DSH version lacks the necessary public operations, document exactly one missing export/atomic operation; dependent launch stays disabled. Do not import private prototype Store/SourceContext or write its SQLite database directly.

5. **Select the guarded invocation path.** Specify a small package tool/adapter that accepts only a frozen manifest/action reference, checks authorization/review, reserves before execution, and delegates to the existing shell/job services with a kill deadline. The model cannot substitute argv, reset counters or mark itself qualified. The selected profile must prevent alternate benchmark launch paths; procedural same-account limits are explicitly stated. Tool availability alone does not prove this.

6. **Freeze the review/confirmation policy.** The standing goal mandate covers admissible normal successors; each technical review/action remains exactly scoped and consumed once. A parentless initial flag cannot waive identity, validity, bounds or exposure. Automatically obtain separate agent review at design freeze and result-to-successor transitions; no human reply is required for routine actions. Human stop and exhausted bounds win. Fresh confirmation is off by default, including when Accorde's legacy project.json says enabled. The existing project-wide ledger remains the sole exposure authority; M1 does not open it or infer its contents.

## 1604 adoption: contract and capability diagnosis

Record package/provider/profile pins, the accepted core requirement, expected/observed behavior and attempted/rule-out local fixes in compact engineering receipts. Routine API/configuration mismatches remain M1 compatibility work. Only a dsh-research design author plus separate reviewer can qualify T1–T4 after the three-part 1604 gate: material core blockage, architectural cause and insufficient narrower repair. Missing public operations do not automatically authorize substitute infrastructure or a new meta-loop service.

## Human-review integration prerequisites

Qualify native committed revision/sequence or opaque receipt semantics plus the launcher acknowledgement-before-dispatch chain; timestamps and caller tokens alone do not pass AUTH-2. Freeze a public admission-proof mapping before enabling the route. Require retained not_applicable evidence tied to pre-evaluation scope/profile; DATA-1 still applies in off mode.

Identify the project/domain release-schema author, reviewed scope and profile/evaluator hash binding before any enabled opening. Record reviewer-unavailable hold/recovery within existing budgets; no self/human-signoff downgrade. Structural reviews use completed separate scoped review receipts and finite repair-matrix evidence. These are M1 qualification prerequisites, not implemented API claims.

## Frozen qualification scope and coverage plan

Freeze the contract's required coverage matrix before evaluation: scope strata, applicable properties, L/F transitions, feature modes, lifecycle/fault/interaction classes, fixture/input/profile hashes, assurance target and expected assertions. Give every required cell an ID and a reviewed rationale for any equivalence or exclusion. One small successful fixture cannot stand for a larger provider/profile claim.

Require per-applicable-property satisfying plus controlled rejecting-witness cases, every declared failure shape, success and reject/defer/replay boundary cases, and each supported feature mode. Initial off-only confirmation retains DATA-1 refusal-before-read coverage; only DATA-2's enabled-release premise may be evidenced not_applicable. Narrowed scope requires prospective new review and preserves prior failures. Public encoding/runtime conformance remains pending.

## Qualification budget and compatibility

The M1 frozen coverage plan must include qualification_budget_ref: owner/authority, cell counts and distinct executions, setup/reviewer/capture/storage work, supported units/rates/estimated cost, retry/failure reserve, total ceilings and execution window. Reuse can cover multiple cells only with compatible assertions/assurance, not by deleting the denominator. Check available scope/bounds before execution; incomplete required coverage remains unqualified when budget is insufficient.

Classify contract conformance as C_qual in package coordination, separate from scientific validation C_science. Freeze T4's horizon/allocation and report C_run plus C_qual without duplicate physical charges or hiding fixtures as scientific workload. Version 2.2.0 added mandatory coverage obligations; 2.3.0 adds budget/accounting obligations. This documents-only task migrates no implementation/profile; external adopter impact needs M6 inventory, compatibility and new applicable review.

## Planning and sharing contract checks

Before freezing a new contract/profile, require its version in the cumulative compatibility register with changed obligations, affected consumers and explicit encoding/qualification/adoption assessment. A missing row or unknown external effect cannot default to compatible. Keep qualification_budget_ref and accepted envelope_ref separate; a 240-second benchmark reservation is neither by default. Qualification-only envelope failure first uses owned plan/baseline triage; T4 needs evidenced avoidable architectural cost and insufficient optimization.


Bind qualification/T4 accounting to the accepted envelope_ref: original window W, denominator D, units/rates, ceiling and allocation. Default H equals W; any longer horizon/larger denominator needs separate review and cannot override the original-window cost/pass-fail. Qualification shortfalls use the owned hold record with affected cells, budget/consumption, owner, exit/revisit conditions and reassessment deadline.


Qualify deliberate/explorative plan classification and ignored exploratory-detail placement, immutable snapshot binding, restore/export references and intended-audience access to required plans/assets. A summary, local path or Session declaration alone is insufficient. Treat absent project integration/pilot artifacts as pending inputs before live freeze. Record current runtime/API observations in the package qualification receipt; historical Nov 5 source receipts are not fresh installed qualification.

## Reuse capability receipt

| Route | Check on the selected profile | Required evidence |
|---|---|---|
| S1 workers/Tickets | Original request reaches an author worker; manifest travels with it | Ticket/Session and original-source references |
| S2 communication | Existing source allowlist and delivery route; no duplicate direct reply | Effective policy and source status; credential absence explicit |
| S3 watchdog | Existing service script plus schedule outside service profile; respect-stop | Configuration/health receipt; setup not installed is a pending check |
| S4 jobs/output/stop | Actual job ownership, bounded execution, terminal receipt and completion wakeup | Keyless scripted integration before live model use |
| S5 concurrency/workspace | One benchmark author, one active benchmark, separate reviewer; correct cwd | Effective job/worker settings and rejection of overlap |
| S6 persistence | Durable serialized record update, unknown-state handling and reopen | Exported API smoke; no private imports |
| S7 reviewer | Separate provider/Session, result delivery, cancellation and no launch authority | Provider/preset receipt and role restrictions |
| S8 management | Documented settings/prompts/pause/stop routes with revision checks | Read-only configuration receipt; exact override bases |

Record each cell as source_available, runtime_verified, disabled or pending with supporting artifacts. Credentials and model access are checked without printing their values. A missing S1/S4/S6/S7 route blocks M2's integrated demo; missing optional second-human/remote routes stay disabled. Production service/watchdog setup is verified before M5, not claimed from source.

## Files and ownership

The integration implementer owns docs/contracts.md, config recipe drafts and .plan/review/m1-runtime-capabilities.json in dsh-research. The operator owns environment/provider/source setup. Any justified prototype compatibility change has its own scope and policy. Reusable code qualification stays here. Each hosted project owns its resolved deployment/state choices and qualification receipts; Accorde integration has its own project-local plan.

## Validation and completion

Compare provider operation traces with the contract's L0–L8 and F1–F3 obligations and the category-scoped property IDs. Separate specified, implemented, fixture_verified, live_verified and disabled assurance. A documented contract alone does not complete M1 or establish a live guarantee.


Use a small keyless compatibility consumer and the selected runtime's existing scripted-provider fixtures to exercise the operations the prototype actually calls. Import public package names as a consumer, not workspace private paths. Validate packet examples against the frozen schemas and demonstrate a durable one-record reservation/reopen with no evaluator launch.

M1 is complete only when the contract and chosen public operations are reviewed, the exact worker/reviewer runtime pair is qualified, required capabilities have evidence, and each disabled capability has a reason. Installing Node/pnpm or writing a checklist alone is not completion. Publish the receipt and pin it for M2. An unresolved runtime/state dependency remains pending, without designing substitute infrastructure.

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
| r1 | 2026-11-05 15:55:26 -0800 | Defined the contract, compatibility-first reuse checklist, single-record admission boundary, ownership and measurable M1 gate. |
| r2 | 2026-11-05 16:26:56 -0800 | Renamed 20261105-m1-minimal-contract-and-reuse.md to 261105-1555-m1-minimal-contract-and-reuse.md using YYMMDD-HHMM; updated 2 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
| r3 | 2026-11-05 17:07:31 -0800 | Made project_root/provider paths and single project authority explicit; replaced routine human gates with standing scope plus automatic agent review and added feedback/autonomy qualification. |
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
| r15 | 2026-11-11 22:08:03 -0800 | Linked M2 guarded native job and Session-persistence observations; kept independent M1 qualification, Ticket/source and broader authority/recovery checks pending. |
| r16 | 2026-11-11 23:30:50 -0800 | Delegated current implementation status and next work to .plan/tracker/; retained milestone scope, gates and historical evidence. |
