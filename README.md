# dsh-research

dsh-research is a planned research skill, policy and thin-helper package over existing DSH and dsh-superagent facilities. It helps a hosted project connect a scientific question to bounded execution, trustworthy evidence, separate agent review and a justified next action.

The hosted project owns its scientific code, plans, decisions, evidence and persistent state. dsh-research owns reusable implementation and its own engineering records. Existing DSH facilities provide workers, jobs, communication, recovery and persistence; the package does not rebuild those services.

**Current status:** this repository contains plans and qualification/documentation receipts. M1–M6 implementation and live integration remain pending. There is no implemented package-install or research-run command to document yet.

## Deliberate branching vs explorative branching

- **Deliberate:** work with a defined scope and deliverable. Version its accepted plans, contracts and useful compact evidence.
- **Explorative:** work investigating uncertain alternatives. Retain detailed planning in project artifacts outside Git and summarize useful findings.

Exploration becomes deliberate when its purpose, bounds and intended outcome are defined and reviewed. Large/raw outputs stay in artifacts for either category. See the [planning guidance](.plan/261109-1452-brainstorm-repo-clutter-and-team-artifacts.md) for the full criteria.

## What the package contributes

The [minimal rebuild plan](.plan/261103-1230-plan-dsh-research-plugin-rebuild.md) defines four small responsibilities:

- A manifest binding the original request, goal, candidate, evaluator, inputs, method, bounds and acceptance policy.
- Evidence checking against actual job terminal facts and the existing domain verifier.
- Checkpoint interpretation and evidence-backed continuation, diagnosis, pivot, hold or completion.
- Scoped review/admission checks over existing authoritative limits and confirmation history.

These are procedures and thin helpers, not four new services. Domain tools decide scientific adequacy. The current scope omits another coordinator, scheduler, workspace pool, artifact CAS, exposure ledger, reviewer manager and research dashboard.

## Architecture: reusable code, project-owned research

```mermaid
flowchart TB
  C["dsh-research: reusable code and procedures"] --> A["Research author in hosted project"]
  subgraph P["Accorde workspace: canonical project root"]
    G["Goal, policy and frozen plans"] --> A
    A --> S["Project scientific state and decisions"]
    A --> E["Frozen project evidence and feedback snapshots"]
    A --> R["Separate agent reviewer"]
    R --> S
    A --> H["Existing DSH and superagent, configured under project"]
    H --> J["Existing evaluator and bounded jobs"]
    J --> E
    E --> A
  end
  A --> D["Optional Lark Doc projection and replies"]
  D -. optional comments .-> F["Existing source or scheduled reader"]
  F --> E
```

Accorde illustrates a hosted project. Package code supplies behavior; project configuration and records supply research authority. See the [M0 architecture plan](.plan/261105-1616-m0-architecture-workflows-and-idempotency.md).

## Project ownership and persistence

P is the explicitly configured canonical hosted-project root, independent of worker cwd, worktree or Session restart. The following are target paths for a qualified new route; active legacy locations remain authoritative until a verified handoff.

```text
P/
  src/ and tools/                     # shared scientific implementation and verifiers
  .plan/                              # deliberate plans/contracts and useful summaries
  .autoresearch/dsh/
    state.sqlite3                     # coupled project record via existing storage provider
    superagent/                       # native orchestration state
    sessions/                         # native Session persistence
    profile/                          # resolved package/provider/prompt pins
  local_artifacts/autoresearch/dsh/
    <goal>/paths/<path-id>/planning/   # ignored explorative plans and trackers
    <goal>/<campaign>/<attempt>/      # immutable execution/evidence records
    <goal>/feedback/                   # captured comment/reply versions
    <goal>/published/<checkpoint>/    # released bytes and publication associations
```

dsh-research keeps its own deliberate plans and compact qualification receipts in Git. Raw fixture logs and supporting experimental drafts can use ignored local development artifacts. Hosted-project scientific records never become package-global state.

Worktrees and project clones cannot create fresh budgets, action consumption or confirmation history. Use existing provider paths and one coupled scientific writer; do not directly rewrite native databases or initialize empty substitutes. A Git clone alone does not include ignored scientific evidence and live state: full project recovery needs supported backups/exports and their linked artifact versions.

See the [state/autonomy contract](.plan/261105-1705-contract-project-state-autonomy-and-feedback.md) for the owner/location matrix and legacy continuity requirements.

## Execution, review and autonomy

The [research-loop contract 2.3.2](docs/contracts.md) specifies the stages, invariants and trace records for this route. Actions pin its version/hash and qualified provider profile; admission requires verifiable commit/order proof and missing independent review holds the dependent action; the current contract is specified, with implementation and live conformance still pending.


The intended route is:

```text
goal and standing authority
  -> frozen bounded plan and manifest
  -> separate agent technical review and admission
  -> existing DSH worker/job and domain evaluator
  -> actual terminal evidence and immutable result
  -> project checkpoint and next justified action
```

Timeout, cancellation, crash, unknown execution and identity drift remain invalid or unresolved even when stdout says pass. A valid negative result remains useful evidence. Review binds the exact candidate, evidence, plan and action; changed identity requires applicable new review. Retries retain charges, and uncertain attempts keep their reservations until reconciled.

Normal execution, technical review, diagnosis, covered recovery and alternative selection continue autonomously within standing scope and resource policy. Optional comments or publication failures do not block admissible research. Human scientific steering follows independently challenged scoped exhaustion after orthogonal alternatives and a materially different rebrainstorm. Hard limits, missing permission and unresolved processes remain operational holds; explicit human stop is respected.

Fresh/sealed confirmation remains disabled in the current M1–M5 route until its separate ordering, history and single-writer gates pass. Renaming a branch, profile or campaign cannot make exposed data fresh.

## Keeping source and plans manageable

Parameter trials share an implementation and retain distinct configurations. Implementation changes use source revisions. Group method-specific code by family and extract shared helpers when their assumptions and consumers justify it.

For existing main code, distinguish supported capabilities, compatible duplication, active methods, historical one-offs, generated material and frozen dependencies. Preserve/restore coherent historical source and exploratory plan families before removing eligible files from the default tree. Keep useful negative findings discoverable.

For integration, preserve the original evaluated snapshot and prepare a focused change containing reusable code, appropriate checks/docs, accepted deliberate plans and useful findings. Explorative per-attempt planning and raw outputs stay in retained artifacts. Record and verify the resulting integration tree; squashing does not reduce the merged file set or establish scientific validity.

The [1452 clutter guidance](.plan/261109-1452-brainstorm-repo-clutter-and-team-artifacts.md) is a curated record with a referenced supporting draft. It now distinguishes deliberate work from explorative detail. Ignore rules do not untrack existing files, and ignored research artifacts still require retention and sharing.

## Team sharing and feedback

Use existing Lark/Feishu surfaces at three levels: a short brief for catching up, permitted evidence for assessing a claim, and a source/config/input bundle for reproduction. Verify access to underlying figures, source and data as well as the Doc. Local Session paths are not shared artifacts.

Keep exact released bytes, content hashes, stable cloud identities and publication status in the hosted project. Use native permissions for different audiences; raw Session logs, secrets, private labels and restricted verifier output do not enter ordinary releases. Lark is a view and feedback source, not the only surviving scientific record.

The feedback loop must close:

```text
captured comment version
  -> project disposition and reason
  -> changed frozen action if adopted
  -> agent review and actual executed/failed/pending effect
  -> response with decision and evidence links
```

Preserve human comment-bearing regions during narrow revision-aware updates. Reconcile uncertain publication before retrying. A publication retry cannot launch another experiment or reset budget. The [sharing plan](.plan/261105-1621-plan-lark-research-review-and-sharing.md) defines the intended capture, assessment, effect and response checks; live access and feedback qualification remain pending.

## Architecture revision and migration

The [1604 architecture meta loop](.plan/261111-1604-architecture-meta-loop-and-migration.md) governs revisions of dsh-research's own architecture. Enter after separate agent review establishes a materially blocked accepted core requirement, an architectural cause, and a narrower supported repair that has failed or been concretely ruled out. The trigger table specifies justification and required evidence against a pinned [loop contract](docs/contracts.md) and observed native traces. Routine bugs and project changes remain triage signals. A justified requirement revision is a parallel reviewed path; structural entry binds current evidence, and adoption must regress applicable properties and the original witness.

Compare the current architecture, a narrow repair and an end-to-end alternative. Freeze revised contracts, expected benefit, complete cost and migration/rollback after separate agent review. Qualify through disposable fixtures and non-executing shadow interpretation; shadow must not launch work or mutate authority.

Keep active runs pinned until terminal/reconciled. Rehearse supported backup/restore, use a charged released-input canary, and fence the old writer at a supported safe boundary. Preserve charges, reservations, consumed actions/reviews, feedback and publication associations, and exposure history. Rollback changes compatible code/profile; it cannot overwrite post-cutover consumption with a stale backup. Retirement follows dependency and restoration checks.

## Plans and next work

The [milestone index](.plan/261105-1555-review-1201-1230-and-milestones.md) and [tracker](.plan/tracker/261105-1555-milestone-execution.md) separate documented design from executed qualification:

| Milestone | Intended deliverable | Current state |
|---|---|---|
| M0 | Architecture, ownership, autonomy and feedback design | Documented |
| M1 | Minimal contracts and a qualified runtime/provider pairing | Planned |
| M2 | Skill/thin helpers and a synthetic guarded worker route | Planned |
| M3 | Automatic planning, separate review and feedback integration | Planned |
| M4 | Scientific-property and continuity qualification | Planned |
| M5 | Project-owned bounded released-input pilot | Planned |
| M6 | New-work adoption, migration and conditional retirement | Planned |

The current contract includes mandatory coverage and qualification-budget obligations; implementation and adopter compatibility remain pending. Qualification costs belong to package coordination, with their own frozen bounds and no duplicate science charge.

The next implementation step is M1: refresh capability observations, qualify the chosen public provider operations and keep unsupported routes disabled. Missing hosted-project pilot/evaluator inputs must be resolved in that project; package documentation does not substitute for them.

Repository policy is in [AGENTS.md](AGENTS.md). No implementation, live pilot, state migration or cloud publication is implied by these plans.

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-11 16:14 -0800 | Added a plan-grounded README emphasizing deliberate versus explorative branching, package/project ownership, autonomy, evidence/sharing, architecture revision, migration and pending implementation status. |
| r2 | 2026-11-11 16:29 -0800 | Aligned the architecture entry summary with 1604's package-specific, evidence-qualified structural gate; routine signals no longer imply redesign. |
| r3 | 2026-11-11 16:34 -0800 | Shortened the branching overview to definitions and storage guidance; linked the detailed planning criteria. |
| r4 | 2026-11-11 16:45 -0800 | Added the reusable-code/project-owned-research Mermaid figure from M0 with a short explanatory caption. |
| r5 | 2026-11-11 17:07 -0800 | Linked canonical research-loop contract 1.0.0, pinned stage/invariant/trace semantics and retained prospective runtime qualification and project authority. |
| r6 | 2026-11-11 18:12 -0800 | Adopted human-review contract 2.1.0 clarifications in current references/qualification plans; retained pending runtime guarantees and historical bindings. |
| r7 | 2026-11-11 20:22:19 -0800 | Aligned README with current contract 2.3.0 and retained 2.1.0 r6 as historical. |
| r8 | 2026-11-11 20:31:48 -0800 | Adopted 2.3.1 accepted-envelope amortization, owned qualification holds and explicit T4 C_run/C_qual evidence without runtime activation. |
| r9 | 2026-11-11 21:13:38 -0800 | Adopted cumulative 2.3.2 compatibility assessment and explicit qualification-budget/envelope arbitration without runtime execution. |
