# M2 — Package the research skill and thin helpers

Created: 2026-11-05 15:55:26 -0800. Updated: 2026-11-11 18:12 -0800. Revision: r9. Status: planned; implementation not started.

Dependency: M1 contract, runtime pairing and public admission operations accepted. Pure helper work may be developed earlier against the draft schema; integrated completion still depends on M1.

Outcome: one small package runs a synthetic bounded ordinary-worker example and produces trustworthy evidence without a dist-exec controller.

Parent: [source review and milestone index](261105-1555-review-1201-1230-and-milestones.md). Tracking: [execution tracker](tracker/261105-1555-milestone-execution.md). The parent review owns source baselines and the reduced scope; this document defines the work and acceptance gate for its milestone.

## Project ownership and autonomous execution

The [state/autonomy contract](261105-1705-contract-project-state-autonomy-and-feedback.md), [M0/1616](261105-1616-m0-architecture-workflows-and-idempotency.md), [sharing/1621](261105-1621-plan-lark-research-review-and-sharing.md), [layout/1452](261109-1452-brainstorm-repo-clutter-and-team-artifacts.md) and [architecture meta loop](261111-1604-architecture-meta-loop-and-migration.md) define the current basis. P is the canonical hosted project across worktrees; its scientific state, resolved profiles, evidence, feedback and decisions stay there.

Classify by purpose: deliberate project branches have defined scope/deliverables and versioned plans, contracts and useful milestone evidence in P/.plan/. Explorative alternatives/per-attempt plans stay ignored under P/local_artifacts/autoresearch/dsh/<goal>/paths/<path-id>/planning/, with frozen snapshots/hashes, backups and team access. Large/raw outputs stay in project artifacts in either case. dsh-research owns its deliberate engineering plans and compact qualification receipts in .plan/review/; raw fixture logs/supporting alternatives may remain local. Purpose and acceptance, not the mere existence of a Git branch, determine the planning treatment.

Normal execution, diagnosis, separate agent review, alternatives and covered recovery are autonomous. Optional feedback or failed publication never blocks admissible work. Human scientific steering follows reviewed scoped exhaustion; operational holds preserve their unmet condition. Current M1–M6 implementation remains pending.

The package adapter resolves project state from the explicit project manifest/config and invokes existing providers. It owns no per-project DB or durable cache. The host project's record contains feedback cursor/queue/dispositions and Lark publication mappings; the shared consumer is a thin existing-CLI/source procedure, not another feedback store.

At safe boundaries, the author assesses captured feedback and supplies a structured adopted/rejected/deferred/stale disposition with rationale and successor/effect references to the pure reducers. Collection, adoption and executed effect are distinct. A duplicate version is a no-op; a new edited body is assessed as a new version. Synthetic package tests use disposable roots and cannot touch real project charges/openings.

## Implementation order and owned files

| Order | Proposed files in dsh-research | Required behavior |
|---|---|---|
| 1 | package.json, lockfile, tsconfig, README.md, skills/research/SKILL.md, skills/research/references/ | ESM helper/skill package; tested DSH versions; valid skill frontmatter; minimal dependencies; attribution for actual copied material |
| 2 | src/manifest.ts | Validate external manifest JSON and freeze candidate/evaluator/input/command, detailed-plan snapshot and architecture/profile identity |
| 3 | src/evaluate.ts | Read captured bytes once, hash and parse those bytes, validate finite typed output, bind domain verdict and actual terminal facts |
| 4 | src/loop.ts | Pure checkpoint decision using project evidence/feedback: continue, diagnose/pivot, operational hold, goal complete or scientific exhaustion; rejected path requires changed evidence/context |
| 5 | src/admission.ts | Pure scope/review/limits checks; consume one exact action with monotonic attempts; no initial-authorization bypass |
| 6 | src/index.ts and one small adapter module if required by M1 | Register the guarded model tool; call existing storage/shell/jobs; persist associations and delegate lifecycle |
| 7 | examples/synthetic-cpu/, tests/ | Synthetic example, meaningful behavior tests and built-package consumer smoke |

Names describe responsibilities, not four services. Keep filesystem/JSON operations ordinary and small. No custom database schema engine, process supervisor, polling loop, job registry, exposure ledger or generic migration framework. If an adapter expands beyond validation/reservation/delegation/result mapping, review the scope before continuing.

## Guarded run and evidence path

Bind the [canonical loop contract](../docs/contracts.md) in every manifest/profile. Map these implementation steps to L0–L6, existing native records and the category-scoped property IDs; capture expected/observed stage references without introducing an event bus or new database. Record actual pre-dispatch author/reviewer bounds separately from scientific-attempt admission.


1. Resolve only the frozen manifest/action reference. Verify current source/input/interpreter/environment identity and declared purpose before spending an attempt.
2. Atomically update the one project-owned persistent record at P/.autoresearch/dsh/state.sqlite3 or its reconciled existing authority: reject stopped campaigns, exhausted bounds, outstanding attempts, consumed action/review or stale revision; reserve the full declared timeout and increment attempts. Await durable acknowledgement before shell publication.
3. Delegate to the version-pinned existing shell/job service. On the currently inspected shell API, resolve the request then execute the resolved spec with onExpiry: kill; do not pass an arbitrary request directly to execute. Adapt to M1's selected version without importing private implementation. Register ownership and completion through existing jobs/tools facilities rather than creating another process abstraction.
4. Preserve the launch intent through failure. Once the attempt is committed, failed spawn and unresolved publication count within the bound; a duplicate delivery returns the same known status or defers. It cannot issue another execute call for that attempt.
5. Capture the result into P/local_artifacts/autoresearch/dsh/<goal>/ as an ordinary immutable per-attempt artifact. Hash and parse the same captured byte buffer. Never treat the latest replaceable assignment report, stdout summary or bounded output ring as the immutable scientific result. Reject truncated capture; use the declared output file for larger results.
6. Verify identity again after completion and read the bound domain verifier output. Timeout, abort, signal termination, missing/contradictory receipt and drift dominate passing-looking output. Preserve invalid evidence with a reason; do not rewrite it into valid form.
7. Commit the terminal association and compact checkpoint via the same existing state boundary. Successor action still needs M3 review/admission. Unknown durable outcomes quarantine further admission until reopen/reconciliation.

The adapter's cap applies at the declared research launch entrypoint. Test and document tool restrictions preventing a pilot worker/reviewer from bypassing it. This is procedural authorization on a trusted account, not a claim of hardware resource isolation against arbitrary external processes.

## 1604 adoption: diagnostic boundary

Keep the project checkpoint reducer focused on project science. An integration diagnostic may link frozen evidence for package-maintainer triage, but cannot self-declare architecture review qualified or rewrite the shared package. Preserve accepted requirement/version, expected/observed facts and local-fix reasoning; the separate package review applies T1–T4. Project scientific state/evidence remains in P; deliberate package entry decisions and compact engineering receipts belong to dsh-research. Existing tools/procedures suffice; add no trigger database, polling loop or architecture controller.

## Planning, integration and sharing behavior

Use ordinary files/existing artifact facilities to snapshot explorative plans and exact prompts, and bind deliberate versioned plans to their reviewed revisions. Verify plan/evidence hashes before review and bind changed architecture/profile to a new applicable packet; do not mutate active snapshots. Keep compact package qualification receipts versioned; raw fixture logs may use ignored local artifacts. Teach source-family organization, focused reusable integration and preservation of both evaluated and integrated trees; explorative per-attempt planning and raw outputs do not enter main; accepted deliberate plans can.

Build permitted checkpoint exports with actual required plan/evidence bytes and references, intended audience, size/hash and stable transport identity. Keep canonical project bytes; restricted inputs and secrets are excluded. No new CAS, publication service or project database is introduced.

## Human-review guard refinements

L3 must return verified proof of its committed authority/action/attempt/manifest tuple. The existing launcher awaits that acknowledgement and links the exact admission parent before execution. Unknown durability/order evidence holds launch. Preserve applicability proof in property results; release uses the project-authored schema ref and qualified boundary, not a caller whitelist.

Keep reviewer-unavailability and owned-hold logic in existing procedures/records; no new database or reviewer service. Qualified fallback/retry must stay inside current review budgets and exact profile bindings.

## Skill procedure

Teach the author to inspect the original request, write a bounded manifest, run the existing evaluator/verifier, collect actual terminal evidence and explain the next decision. The skill must forbid label/confirmation access in development, stale approval reuse, retry refunds, speculative success and inherited never-stop behavior.

Teach the reviewer to inspect only the exact packet and return scoped approve/request_changes/defer with evidence references. A separate Session plus a prompt does not establish read-only access; use supported permissions and declare their limit. The actual reviewer activation belongs in M3.

Load the skill through the selected runtime's existing filesystem/team-skill mechanism. Current filesystem skills require name and description frontmatter and a scanned top-level skill directory; placing a nested file without configuring its root is insufficient.

## Synthetic example and validation

Use tiny synthetic/released CPU data with a deterministic evaluator and domain checker. It demonstrates finite output, a valid negative result and a compact checkpoint. Label it protocol/integration evidence; do not import the donor's full adapter.py, which constructs Controller and reads raw historical inputs.

Run focused tests for identity mutation, wrong types/non-finite values, timeout-zero invalidity and action/reservation deduplication. The runtime integration uses a scripted model/provider where available, with very short fixture deadlines and disposable state. Synthetic test executions have their own recorded test limits; they do not spend M5's campaign or access Accorde labels.

Expose package scripts for test, typecheck, build and a built-consumer smoke. After the latest build, import the actual packed output and skill resources outside the source tree. If framework source is changed in a separately accepted patch, run that repository's required focused checks and final build checks under its own AGENTS.md.

## Completion and handoff

M2 is complete when one ordinary worker on M1's pairing runs the synthetic example through the guarded existing route and produces manifest, reservation, actual execution receipt, captured evidence/domain verdict and checkpoint. Record package/export/profile hashes and actual test commands in .plan/review/m2-package-receipt.json.

Zero default superagent source changes and zero full dist-exec runtime dependencies remain acceptance conditions. Unit tests of pure functions alone do not complete M2. Hand the built package, skill loading receipt and effective guarded tool route to M3.

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
| r1 | 2026-11-05 15:55:26 -0800 | Defined minimal package ownership, guarded delegation over existing facilities, immutable evidence handling and the synthetic ordinary-worker acceptance gate. |
| r2 | 2026-11-05 16:26:56 -0800 | Renamed 20261105-m2-skill-and-thin-helpers.md to 261105-1555-m2-skill-and-thin-helpers.md using YYMMDD-HHMM; updated 2 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
| r3 | 2026-11-05 17:15:48 -0800 | Separated reusable code/test state from project-owned scientific records; specified project-local evidence/state and the structured feedback disposition/effect path. |
| r4 | 2026-11-11 16:04 -0800 | Aligned with 1616/1621/1705/1452: ignored detailed planning and receipts, frozen identity, accessible team exports, focused integration and bounded architecture revision/migration; preserved prompts/history and pending runtime gates. |
| r5 | 2026-11-11 16:14 -0800 | Distinguished deliberate scoped/versioned plans from explorative retained detail; restored package-owned compact qualification receipts and purposeful project migration/pilot plans without changing scientific authority or execution status. |
| r6 | 2026-11-11 16:36 -0800 | Adopted 1604's package-architecture scope, T1–T4 evidence gate and maintainer/reviewer ownership; kept routine project triage, scientific autonomy and deployment qualification separate. |
| r7 | 2026-11-11 17:07 -0800 | Linked canonical research-loop contract 1.0.0, pinned stage/invariant/trace semantics and retained prospective runtime qualification and project authority. |
| r8 | 2026-11-11 17:44 -0800 | Adopted contract 2.0.0 category-scoped predicates/counterexamples in current conformance and audit references; preserved historical source numbering and evidence without canonical aliases. |
| r9 | 2026-11-11 18:12 -0800 | Adopted human-review contract 2.1.0 clarifications in current references/qualification plans; retained pending runtime guarantees and historical bindings. |
