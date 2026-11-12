# M5 — Qualify a project-owned autonomous pilot

Created: 2026-11-05 15:55:26 -0800. Updated: 2026-11-11 21:39:00 -0800. Revision: r15. Status: design revised; implementation and live state migration not executed.

Qualify one project-owned autonomous pilot through the reusable package. The concrete `Accorde pilot plan` (project-owned input pending) and `integration plan` (project-owned input pending) are authoritative for that project. This file is the package milestone definition, not a second Accorde campaign/decision store.

## Current design basis

The [state/autonomy contract](261105-1705-contract-project-state-autonomy-and-feedback.md), [M0/1616](261105-1616-m0-architecture-workflows-and-idempotency.md), [sharing/1621](261105-1621-plan-lark-research-review-and-sharing.md), [layout/1452](261109-1452-brainstorm-repo-clutter-and-team-artifacts.md) and [architecture meta loop](261111-1604-architecture-meta-loop-and-migration.md) define the current basis. P is the canonical hosted project across worktrees; its scientific state, resolved profiles, evidence, feedback and decisions stay there.

Classify by purpose: deliberate project branches have defined scope/deliverables and versioned plans, contracts and useful milestone evidence in P/.plan/. Explorative alternatives/per-attempt plans stay ignored under P/local_artifacts/autoresearch/dsh/<goal>/paths/<path-id>/planning/, with frozen snapshots/hashes, backups and team access. Large/raw outputs stay in project artifacts in either case. dsh-research owns its deliberate engineering plans and compact qualification receipts in .plan/review/; raw fixture logs/supporting alternatives may remain local. Purpose and acceptance, not the mere existence of a Git branch, determine the planning treatment.

Normal execution, diagnosis, separate agent review, alternatives and covered recovery are autonomous. Optional feedback or failed publication never blocks admissible work. Human scientific steering follows reviewed scoped exhaustion; operational holds preserve their unmet condition. M1 encoding/provider checks have started; M2–M6 implementation remains pending.

## Responsibility and deliverables

The package owns generic code qualification and disposable fixtures. The hosted project owns resolved manifests, methods, verifier adapters, budgets, action/review/feedback consumption, actual outputs and scientific decisions. Use the [persistent-state/autonomy contract](261105-1705-contract-project-state-autonomy-and-feedback.md); never write these into the package checkout.

M1–M4 technical prerequisites and the standing project mandate allow the author to freeze, independently review and execute the pilot automatically. Human feedback is optional/nonblocking; no normal transition requires human confirmation. Operational guards and finite bounds remain enforced.

## 1604 adoption: pilot scope

A pilot failure first receives local diagnosis/recovery within its existing charged bounds. Send permitted integration evidence to package triage only if it concerns a reusable contract. T1–T4 qualification belongs to the dsh-research design author and separate reviewer; the project worker cannot expand this pilot into package redesign. Any later revised-package canary needs its exact qualified release/contract and covered scope, with the same project authority and unchanged consumption history.

## Acceptance

The pilot must demonstrate admission order proof, exact review availability/hold handling and retained applicability evidence for excluded premises. Initial confirmation remains off; the pilot does not qualify enabled DATA-2 by omission. New schema/ordering/hold requirements do not enlarge the existing benchmark or model budgets.


Adopt an exact qualified [contract/profile reference](../docs/contracts.md) in the project pilot packet; version 2.3.3 is specified here but live mappings remain pending. Retain L0–L8/F1–F3 native trace associations, actual terminal evidence and the category-scoped property IDs outcomes within P. A successful document check is not pilot qualification.


Demonstrate real project-local result/evidence continuity, automatic reviewer involvement, correct charged attempts, no bypass/duplicate launch, comment capture-to-disposition-to-actual-effect proof, and continuation without waiting for human feedback. Valid-negative and procedural outcomes trigger autonomous diagnosis/recovery/pivot; scientific exhaustion requires a reviewed reasoned assessment before human steering.

The bounded pilot is deliberate work: version its accepted project plan/contracts and useful milestone summary in P/.plan/. Keep explorative alternatives/per-attempt planning and large/raw outputs in the ignored project artifact root, preserving exact prompts and snapshots. The frozen pilot packet binds plan snapshot/hash, source/evaluator/input and architecture/profile pins, remaining bounds and exact agent review. Include required permitted plan/evidence bytes in a recipient-accessible export and demonstrate the feedback disposition-to-effect loop. Missing project plan/evaluator references keep live qualification pending.

The Accorde example remains capped at four attempts times 60 seconds (240 seconds of benchmark timeout reservation) and concurrency one. Retries count within the four attempts; there is no fan-out, GPU collection or sealed/fresh confirmation. Declare paid author/reviewer/model and runtime-overhead bounds separately; the benchmark reservation does not cover them. That campaign cap is not the project's outer-loop termination rule. Implementation reports/decisions and specific evaluator adapters are filed in Accorde. Only reusable-package qualification receipts belong here.

## Earlier User Prompts and Quoted Examples, Verbatim

These are retained history; the current contract below supersedes older placement and human-gate choices.

~~~text
<python> <accorde>/tools/autoresearch_ppp/replay.py --data <frozen-released-selection> --out <new-attempt-output> --candidate <one-frozen-candidate>
~~~

~~~text
~/wk/dsh-superagent-prototype and ~/wk/deepseek-harness are checked out.
~/wk/accorde and ~/wk/autoresearch are also checked out.
reivew the 1201 brainstorms and 1230 plans and write actionable plans for each milestone.
~~~

~~~text
please use {YYMMDD}-{HHMM}-* as the format of the plan/tracker file name.
~~~

## Current User Prompt, Verbatim

~~~text
I think the project related artifacts and decision should stay in the project workspace (i.e. accorde/), so it's self-contained, try to minimize the states stored in the dsh-research. Please confirm that, and be explicit about Responsibility/Owner/Location of Persistent State.
"organized live Lark Docs" is not convincing. I don't see the feedback loop.
Also please confirm that for most execution and iterations, human intervention is not required, nor blocking. Human input is required only when the direction is "scientifically exhausted".
~~~

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-05 15:55:26 -0800 | Defined the exact existing released replay, frozen four-attempt serial slate, one launch gate, separate model accounting and measurable pilot stop evidence. |
| r2 | 2026-11-05 16:26:56 -0800 | Renamed 20261105-m5-bounded-accorde-cpu-pilot.md to 261105-1555-m5-bounded-accorde-cpu-pilot.md using YYMMDD-HHMM; updated 2 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
| r3 | 2026-11-05 17:05:50 -0800 | Converted the package M5 document into a generic milestone/reference; the authoritative Accorde pilot and all project state/decisions now live in Accorde. |
| r4 | 2026-11-11 16:04 -0800 | Aligned with 1616/1621/1705/1452: ignored detailed planning and receipts, frozen identity, accessible team exports, focused integration and bounded architecture revision/migration; preserved prompts/history and pending runtime gates. |
| r5 | 2026-11-11 16:10 -0800 | Made the retained 240-second serial benchmark scope, charged retries, confirmation-off/GPU-off boundary and separate model/overhead limits explicit. |
| r6 | 2026-11-11 16:14 -0800 | Distinguished deliberate scoped/versioned plans from explorative retained detail; restored package-owned compact qualification receipts and purposeful project migration/pilot plans without changing scientific authority or execution status. |
| r7 | 2026-11-11 16:36 -0800 | Adopted 1604's package-architecture scope, T1–T4 evidence gate and maintainer/reviewer ownership; kept routine project triage, scientific autonomy and deployment qualification separate. |
| r8 | 2026-11-11 17:07 -0800 | Linked canonical research-loop contract 1.0.0, pinned stage/invariant/trace semantics and retained prospective runtime qualification and project authority. |
| r9 | 2026-11-11 17:44 -0800 | Adopted contract 2.0.0 category-scoped predicates/counterexamples in current conformance and audit references; preserved historical source numbering and evidence without canonical aliases. |
| r10 | 2026-11-11 18:12 -0800 | Adopted human-review contract 2.1.0 clarifications in current references/qualification plans; retained pending runtime guarantees and historical bindings. |
| r11 | 2026-11-11 19:01:22 -0800 | Adopted contract 2.2.0 applicability/coverage clarification and review-r5 residual closure; retained prospective provider qualification and historical evidence. |
| r12 | 2026-11-11 20:22:19 -0800 | Adopted 2.3.0 obligation/compatibility and qualification-budget/T4 accounting references without executing runtime changes. |
| r13 | 2026-11-11 20:31:48 -0800 | Adopted 2.3.1 accepted-envelope amortization, owned qualification holds and explicit T4 C_run/C_qual evidence without runtime activation. |
| r14 | 2026-11-11 21:13:38 -0800 | Adopted cumulative 2.3.2 compatibility assessment and explicit qualification-budget/envelope arbitration without runtime execution. |
| r15 | 2026-11-11 21:39:00 -0800  | Recorded M1 encoding/public-provider development and contract 2.3.3 bindings; kept independent conformance, integrated launch, M2–M6 and migration gates pending. |
