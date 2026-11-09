# M1 — Freeze the minimal contract and verify reuse

Created: 2026-11-05 15:55:26 -0800. Updated: 2026-11-05 17:07:31 -0800. Revision: r3. Status: planned; implementation not started.

Dependency: reviewed milestone breakdown. This milestone is pending; the source audit is preparation, not its runtime qualification.

Outcome: one reviewable contract and one exact, demonstrably compatible ordinary-worker route.

Parent: [source review and milestone index](261105-1555-review-1201-1230-and-milestones.md). Tracking: [execution tracker](tracker/261105-1555-milestone-execution.md). The parent review owns source baselines and the reduced scope; this document defines the work and acceptance gate for its milestone.

## Project ownership and autonomous execution

The [project-state/autonomy/feedback contract](261105-1705-contract-project-state-autonomy-and-feedback.md) owns current semantics. P is the explicitly configured canonical hosted-project root. Actual manifests, budgets/action consumption, reviewer/feedback records, resolved configuration, evidence and scientific decisions live in P; package .plan/review receipts are only reusable-code qualification, never project campaign authority.

Normal research execution, diagnosis, alternatives, recovery and separate agent review continue under standing project policy without a human approval or feedback wait. A campaign limit/failure is a checkpoint. Required human scientific steering follows a reviewed exhaustion assessment; hard guard/external holds stay operational and automatically resume when their conditions permit.

M1 must qualify explicit storage-sqlite Config.path, session-persistence-jsonl Config.root and superagent Config.stateDir under P. Test that a worktree/profile/clone cannot silently create a second project budget or exposure authority. No project record or Doc mapping is stored under dsh-research or a package-global default.

The reviewer/capability checklist also checks a complete feedback scan, durable project capture, queued item recovery and no human_action during a normal author/reviewer cycle.

## Work packages

1. **Record and select the runtime pair.** Write docs/contracts.md and .plan/review/m1-runtime-capabilities.json. Record checkout commits, package/export versions, effective profile and lock hashes, Node and per-repo pnpm versions. Prepare a supported Node >=24.9 environment when implementation is authorized; respect each repository's package-manager pin. First qualify unchanged superagent against a compatible pinned DSH release. Test the actual subagent wait/list/drain behavior rather than trusting a cast or a successful standalone typecheck. If only current harness source is acceptable, document an isolated prototype compatibility diff and its affected consumers for review before applying it. Keep framework source changes out of the core package.

2. **Freeze four small data definitions.** Define manifest, evidence receipt, review packet and checkpoint. Use one schema/version and existing domain output wherever possible; require canonical project_root/authority identity independent of worker cwd or worktree. Manifest fields: project/stage; full original prompt; goal/context/plan revision; candidate commit/tree/config hashes; evaluator/verifier and interpreter identity; input hash/split/purpose; environment relevant to reproducibility; exact command/argv/cwd/env; timeout and attempt limits; declared result fields and acceptance policy. A dirty checkout needs an explicit content digest including relevant untracked files, or a frozen separate worktree. HEAD alone is insufficient.

3. **Define the evidence and decision vocabulary.** Separate execution status, evidence validity and domain verdict. Record owner Session, job/tool-call identity, admission/action ID, actual terminal classification, exit/signal/timeout/abort facts, immutable result-byte hash and verifier identity. Missing settlement, overflow/truncation, drift and contradictory identity defer acceptance. A valid negative domain result can lead to diagnose/pivot/stop. Review binds the whole subject plus exact next action; checkpoint records question, alternative, outcome, rationale, uncertainty, evidence, remaining bounds and continue/diagnose/pivot/defer/stop.

4. **Choose one existing state boundary.** Prefer the selected harness's publicly exported storage-domain facility. Store one compact project-owned coupled record containing project/goal revision, aggregate charges, consumed attempts/reserved timeout, active action, review/feedback consumption and checkpoint/publication associations. Configure the existing storage-sqlite path as P/.autoresearch/dsh/state.sqlite3; active legacy authority stays in place until reconciled. Use its serialized record update, await durability before launch, and one configured host writer. Counters and action deduplication must change in the same record update. Keep completed artifacts in P/local_artifacts/autoresearch/dsh/<goal>/ and configure native Session persistence root=P/.autoresearch/dsh/sessions/. Set superagent stateDir=P/.autoresearch/dsh/superagent/; these existing providers own their physical formats. This is the initial pilot's admission state, not a new project financial ledger or exposure store. If the selected DSH version lacks the necessary public operations, document exactly one missing export/atomic operation; dependent launch stays disabled. Do not import private prototype Store/SourceContext or write its SQLite database directly.

5. **Select the guarded invocation path.** Specify a small package tool/adapter that accepts only a frozen manifest/action reference, checks authorization/review, reserves before execution, and delegates to the existing shell/job services with a kill deadline. The model cannot substitute argv, reset counters or mark itself qualified. The selected profile must prevent alternate benchmark launch paths; procedural same-account limits are explicitly stated. Tool availability alone does not prove this.

6. **Freeze the review/confirmation policy.** The standing goal mandate covers admissible normal successors; each technical review/action remains exactly scoped and consumed once. A parentless initial flag cannot waive identity, validity, bounds or exposure. Automatically obtain separate agent review at design freeze and result-to-successor transitions; no human reply is required for routine actions. Human stop and exhausted bounds win. Fresh confirmation is off by default, including when Accorde's legacy project.json says enabled. The existing project-wide ledger remains the sole exposure authority; M1 does not open it or infer its contents.

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
