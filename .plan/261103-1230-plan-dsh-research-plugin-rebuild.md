# Plan: minimal dsh-research over dsh-superagent

Created: 2026-11-03 12:30 -0800. Updated: 2026-11-05 16:26:56 -0800. Revision: r8. Status: planning only; implementation and cutover not executed.

This revision **supersedes the r1–r6 full-stack rebuild scope**. Historical revision entries remain provenance, not current requirements. See the [exhaustive dist-exec drop matrix](261103-1637-dist-exec-drop-matrix.md) and [earlier comparison](261103-1201-brainstorm-autoresearch-versus-dsh-superagent.md).

## 1. Decision: reuse the runtime; keep only the research gist

Build a small **sibling skill/policy/helper plugin**, proposed repository `/home/cliu/wk/dsh-research`. It depends on **configured dsh-superagent and its DSH services** for execution and teamwork. Standalone parity is no longer a goal.

**Yes: drop dist-exec as an implementation/parity target.** All **65 changed paths** (60 added, 5 modified) have a disposition in the matrix. Dropping means *do not port that implementation*, not delete the fork, lose historical evidence, reset charges/exposure, or change an active campaign's runtime.

Reuse superagent's watchdog, worker/Ticket routing, communication, concurrency, recovery, review and persistence. The plugin contributes only:

1. A compact research manifest: original prompt, goal, candidate/evaluator/data identity, method, limits and acceptance policy.
2. A small result/evidence checker that reads ordinary job outputs and the **existing domain verifier**.
3. Goal/checkpoint/re-steering policy: continue, diagnose/pivot, defer or stop, with evidence and explicit scope.
4. Narrow admission conditions: scoped review, bounded authorized work and irreversible confirmation-exposure rules.

These are a few helpers/procedures, **not four services**. Team discussion, worker launch, recovery and storage do not move into a new research control plane.

**Review-board revamp is omitted.** No new dashboard, React page, fleet UI, review API or review-database migration is part of M1–M6. Existing review conversations plus ordinary evidence packets are enough for this plan. This does not remove the automatic independent-review step.

### Explicitly removed from the previous plan

- Native coordinator/globalStore, research SQL engine/outbox, grants, enrollment, claim/start and heartbeat protocols.
- Another scheduler, worker manager, workspace pool, resource-lease layer, supervisor or Session engine.
- Another communications bus, source connector, HTTP/TLS/auth service, artifact CAS or generic reviewer manager.
- Mandatory RoundPlan/UnitSpec DAG, two-host fleet, top-k/diversity search, statistical DSL, controls/ablation engine, plan-delta patch framework and auto-commit machinery.
- Separate Research UI, fleet/review-board parity, standalone-without-superagent mode and C01–C28 full-stack conformance as a release gate.

Optional future capabilities require a separate justified need, not inherited dist-exec parity.

## 2. Baselines, containment and authority

| Repository | Audited revision | Current role |
|---|---|---|
| `~/wk/autoresearch` | `ead1ae507934a6da5e914a2559d6fcac99c505c4`, clean `dist-exec`, runtime 0.6.0 | Behavior/evidence reference; keep active legacy campaigns pinned |
| dist-exec base | `33ef750face59b42f9663c8e355a77600d1765e7` | Two-commit delta: 65 changed paths; [inventory](../../accorde/local_artifacts/autoresearch/dist-exec-drop-audit/20261103-1637/branch-inventory.json) |
| `~/wk/dsh-superagent-prototype` | `8c32a9dc5d72c033816c6a8110b37f40cf94fba4`, clean | Required orchestration/team runtime to configure and reuse |
| `~/wk/accorde` | `7c85e7541a3d8dfbb25fec46d96ff644c1ae72b5` | Existing scientific tools/verifiers and released-input pilot |
| `~/wk/dsh-research` | Not created | Proposed contained skills, policy and thin helpers |

**Default superagent source-change budget: zero.** Prefer its existing worker tools, team prompt configuration and documented routes. Do not import private Store/Effects/Engine/Session classes.

The source integration context already provides `atomic`, scoped KV, ticket/thread references, intake and notifications ([SourceContext](../../dsh-superagent-prototype/src/sources/host.ts), lines 23–67). It is an **existing implementation seam**, not a verified published SDK. If programmatic access is essential, propose only a versioned export/facade over those existing operations, separately approved. Do not respond to a missing export by rebuilding a coordinator or store. Configuration-only skills can establish the pilot route first.

| Authority | Owner |
|---|---|
| Tickets, worker Sessions, jobs, notifications, concurrency, recovery, generic review and persistence | Existing superagent/DSH facilities |
| Scientific manifest, interpretation and checkpoint/next-decision rules | Minimal dsh-research policy/helpers, executed by existing workers |
| Correctness, measurement, statistical qualification and final acceptance | Existing Accorde/domain verifier bound to actual evidence |
| Existing spent budget and confirmation-opening history | Existing authoritative records until a reconciled handoff; never an empty replacement |

### Proposed minimal layout

Names are illustrative, not public API claims:

```text
dsh-research/
  package.json                     # small package/CLI/skill bundle; no runtime fork
  skills/research/                  # procedure plus bounded author/reviewer instructions
  config/                          # superagent prompt/policy/execution recipes
  src/manifest.ts                  # identity, goal, declared limits/result shape
  src/evaluate.ts                  # job-output/domain-verifier checks, not an executor
  src/loop.ts                      # pure checkpoint/re-steering decisions, not a scheduler
  src/admission.ts                 # small review/budget/exposure checks
  src/index.ts                     # optional public plugin adapter; only if needed
  tests/                           # eight scientific properties over reused boundaries
  docs/                            # integration, operator, pilot and continuity notes
```

Use existing Accorde tools rather than rebuilding the benchmark in TypeScript. Avoid a second Accorde-side orchestration package: add only a thin result-format adapter if the existing verifier cannot emit the required evidence. No runtime dependencies on Karpathy's Torch trainer/data preparation.

## 3. Verified reuse routes and remaining configuration work

| ID | Need | Existing route to reuse | Small research addition / verification needed |
|---|---|---|---|
| S1 | Claim/start, workers, team intake | [orchestrator_route](../../dsh-superagent-prototype/src/app/tools/main.ts), 88–150; [Tickets](../../dsh-superagent-prototype/src/core/tickets.ts), 37–55; [executor](../../dsh-superagent-prototype/src/executor/dsh.ts), 263–284, 424–510 | Carry manifest/evidence references with the bounded assignment. No research claim/start API. Verify actual benchmark start via the job, not assignment acceptance. |
| S2 | Communication, thread context, delivery | [SourceContext](../../dsh-superagent-prototype/src/sources/host.ts), 31–65; [delivery](../../dsh-superagent-prototype/src/app/delivery.ts), 40–84; existing GitHub/Feishu channels | Put scientific subject/reply/action references in ordinary messages. Configure existing source allowlists; no duplicate chat/auth service. |
| S3 | Watchdog, liveness, recovery | [service script](../../dsh-superagent-prototype/scripts/dsh-superagent); [external hourly check](../../dsh-superagent-prototype/docs/006-deployment.md), 133–141; [effects](../../dsh-superagent-prototype/src/app/effects.ts), 130–159 | Configure the watchdog in a separate operator profile. Existing job/worker status supplies execution evidence. No research heartbeat daemon. Installation was not verified. |
| S4 | Job supervision, output, stop and completion wakeups | [background jobs/subagents](../../dsh-superagent-prototype/src/executor/background.ts), 9–20, 61–119; [worker procedure](../../dsh-superagent-prototype/prompts/work.md), 39–49 | Existing workers use ordinary job tools and completion events. A small checker maps actual terminal status and immutable output. Verify jobs/subagents services are enabled; a profile may lack either. |
| S5 | Concurrency, checkout/workspace ownership | [WorkerSlots](../../dsh-superagent-prototype/src/executor/dsh.ts), 165–198, 227–235; [execution settings](../../dsh-superagent-prototype/docs/006-deployment.md), 149–156, 200–205 | Configure `executor.maxWorkers` and bounded worker procedure. It is a worker limit, **not** a hard bound on all background jobs, GPU resources or remote hosts. Pilot runs benchmark jobs serially without fan-out. |
| S6 | Persistence, transactional state and retries | [Store](../../dsh-superagent-prototype/src/app/store.ts), 58–87, 140–161; [SourceContext.atomic/state](../../dsh-superagent-prototype/src/sources/host.ts), 43–45; existing effects/delivery | Store only compact research associations/checkpoint/admission state through the reused boundary. Keep immutable scientific files; [latest assignment report](../../dsh-superagent-prototype/src/core/assignments.ts), 122, is replaceable. No new SQL store/CAS/outbox. |
| S7 | Review, author/reviewer coordination | [worker review ownership](../../dsh-superagent-prototype/prompts/work.md), 21–49; existing team review prompts and subagents | Configure a separate reviewer agent using existing launch/communication, exact subject packet and admission checks. No reviewer service or board. Generic review is not an automatic scientific certificate. |
| S8 | Operator configuration/health | [documented management API](../../dsh-superagent-prototype/docs/006-deployment.md), 159–205 | Reuse documented settings/prompts/pause/stop routes. They do not provide a new scientific job-submission SDK or global remote-execution guarantee. |

**Watchdog is the operational heartbeat route.** A healthy service is not proof the benchmark progressed, stopped or produced valid science. Likewise `assignmentStarted` means assignment/message acceptance, and `inputsRead` means Session-history delivery. Preserve these distinctions with a tiny result mapping, not another protocol.

Existing retry/background limits include constants rather than fully configurable knobs ([executor](../../dsh-superagent-prototype/src/executor/dsh.ts), 27–36, 247–258, 629–655). Use bounded worker tasks; do not assume prompt configuration can turn every runtime limit into a hard research budget. Remote machines are optional: use an already configured execution route only after verifying its actual capabilities. No new HostAgent, fleet daemon or compulsory two-host pilot.

Repository policy still applies: preserve original prompts and timestamped revision history; disable the default [co-author/history-rewrite instructions](../../dsh-superagent-prototype/prompts/team/delivery.md), 17–25, for Accorde; no commit/push/PR/merge unless authorized for the current task. Configure the research worker's artifact deliverable instead of inheriting coding-ticket PR completion criteria verbatim.

## 4. The scientific core: eight properties, not a distributed platform

### P01 — Bound identity

Bind project/stage, original prompt and goal/context revision; candidate commit/tree/config; evaluator/verifier/version; inputs/split/purpose; environment relevant to comparison; limits and acceptance policy. Exact invocation and output schema are declared. Changed identity invalidates dependent result acceptance and reviews. Iterative development cannot silently open final confirmation data.

### P02 — Truthful, sticky execution validity

Read the **actual ordinary job** terminal status. Timeout, cancellation, crash, unresolved ownership or failed identity/provenance checks cannot become valid because stdout says pass or a SIGTERM handler exits zero. An interrupted job's passing-looking result stays invalid. Preserve original output bytes; quarantine contradictory references rather than rewriting evidence. Normal execution and scientific improvement remain separate: a valid negative result is useful research evidence.

### P03 — Immutable, typed evidence plus existing domain verification

Archive an immutable result snapshot through existing workspace/artifact facilities. Hash and parse the same captured bytes; verify requested and retrieved identities. Reject missing/wrong-typed fields, bool-as-number, NaN and Infinity. Invoke/read the existing domain verifier bound to those inputs; do not trust caller-provided `guards_passed` or rebuild bootstrap, Bonferroni, effect-size or control methodology as a universal research engine.

### P04 — Scoped review on the existing route

A review packet binds project, stage, candidate, evidence, goal/plan revision and the **exact action** proposed. Advice, historical/live commentary and stale approval do not authorize work. Approval cannot waive identity, validity, budget or confirmation rules. An approval authorizes its declared transition, not indefinite future checkpoints. Reuse existing review workers/channels and persistence.

### P05 — Bounded admission using authoritative limits

Before launch, check the declared command, authorized purpose, launch count and remaining budget. Reuse available accounting and job controls; retain already-spent charges. No parallel financial/resource ledger. If authoritative experiment accounting is absent, the pilot uses one serialized admitted sequence with a persistent attempt count at the reused state boundary; any atomic missing operation must be narrowly justified. Do not claim hard provider-token/GPU caps from `maxWorkers`. Unresolved executions keep their reservation until reconciled; retries do not restore budget.

### P06 — Irreversible confirmation exposure

Use **one project-wide opening authority**, not one ledger per checkout/profile. For Accorde preserve `~/.local/state/autoresearch/confirmation/accorde-ppp.sqlite3` and its existing history. Consume an opening **before access**; failed/interrupted openings remain consumed; rename, retry, new profile or candidate cannot reopen overlapping subjects. Bind confirmation to frozen candidate/verifier/data and required review/qualification, release only declared finite aggregates. Disable generic retry for the opening operation.

Reuse the existing authority via a narrow adapter or expose an atomic operation from existing persistence; do not copy the Python confirmation runner/ledger or create a new store. **Keep fresh confirmation disabled until atomicity, continuity and single-writer coordination are demonstrated.** Procedural separation is accepted for now; another checkout is not claimed to provide access-control isolation.

### P07 — Evidence-backed outer-loop/re-steering

The **policy belongs in dsh-research; activation belongs to existing superagent workers/jobs**. Keep a short checkpoint gist: question/hypothesis, attempted alternative, valid/invalid outcome, rationale, uncertainty, evidence references, remaining bounds and next decision. A completed job triggers the existing worker's next turn; the helper determines continue, diagnose/pivot, defer or stop. A rejected path needs changed assumptions/evidence/context before revisiting. Human stop and exhausted bounds terminate automation. No GoalLedger clone, candidate-inventory engine or scientific watchdog is required.

### P08 — Continuity and no duplicate scientific authority

Repeated completion/review delivery is harmless at the reused persistent boundary: the same scientific action cannot spend or open twice. Recovery resumes the same attempt rather than silently making a new experiment. Old evidence remains immutable; changed subject creates a new revision and invalidates dependent approvals. Preserve original prompts/history and existing charges/exposure across handoff. Do not run both old and new admission loops for one campaign.

## 5. Actionable sequence: six reduced milestones

The order survives; **deliverables and release gates are reduced**. A future implementation tracker should record M1–M6, P01–P08, reused-route checks, actual usage and deviations; the old C01–C28/fleet list is not the implementation backlog. No implementation tracker is claimed to exist yet.

### M1 — Lock the minimal contract and reuse checklist

- Pin the above baselines and use the 65-path matrix as the no-port list.
- Specify one small manifest/result/checkpoint/review packet and P01–P08; use existing benchmark/verifier outputs wherever possible.
- Verify S1–S8 in the target profile: worker job tools, subagents/reviewer launch, completion delivery, prompt overrides, state access, source permissions and watchdog configuration.
- Resolve published interface availability. First try the configuration/skill route; document any *single narrow missing export/atomic operation*, rather than introducing services.

**Done:** reviewed minimal contract, exact ordinary-worker invocation path and capability checklist; unknown capabilities explicitly disabled. No native coordinator/store/UI design.

### M2 — Package the skill and thin scientific helpers

- Create the sibling repository/package with research skill, config recipes and the four illustrative helpers; keep superagent source unchanged by default.
- Implement manifest/evidence checking and pure checkpoint/admission decisions. Existing workers run Accorde's evaluator/verifier as ordinary bounded jobs.
- Bind ordinary immutable artifacts plus minimal IDs/state through reused facilities; no separate research database, executor or outbox.
- Include a tiny released-input CPU example. Log original prompt and a timestamped revision history for each revised artifact.

**Done:** one ordinary superagent worker runs a bounded example and produces manifest, actual job receipt, verifier result and compact checkpoint without any dist-exec runtime dependency.

### M3 — Configure automatic planning and independent review

- Add a research-specific worker procedure rather than new planner/reviewer lifecycle machinery.
- At a declared checkpoint, existing completion delivery wakes the worker; it validates P01–P03, computes a bounded next action and writes an immutable packet.
- **Automatically launch a separate reviewer agent through the existing configured subagent/review route** when policy requires it. The reviewer gets the exact manifest, output/verifier evidence and proposed action; it does not author that candidate or control budget/exposure. Use read-only/procedurally separated access supported by the target profile; do not invent sandbox guarantees.
- The existing worker receives the review, checks P04–P06/P08, then submits the next ordinary job or stops. Missing reviewer capability/subject mismatch means defer, not self-approval.
- Use an action identity derived from subject/checkpoint/action in reused state so replay does not relaunch or reuse approval. Configuration is tested, not merely described as automatic.
- Human follow-ups stay in existing channels. No human board redesign, reviewer service or webhook bus.

**Done:** completion → bounded proposal → independent reviewer → accepted transition or explicit defer is demonstrated once through the existing infrastructure; stale/replayed review cannot authorize a different action.

### M4 — Test only the scientific properties at reused boundaries

- Add focused positive/negative tests for **P01–P08**; retain properties from fork regressions, not Python classes/test count.
- Cover changed identity, SIGTERM-zero/timeout invalidity, corrupted and non-finite output, valid negative outcomes, stale/action-mismatched review, exhausted/replayed admission, changed-context revisit and stop.
- Use disposable state for confirmation tests: consume-before-access, failure still consumed, rename/profile overlap rejection and continuity. Production confirmation remains disabled until the real authority is reconciled.
- Check ordinary completion/review replay/restart via supported superagent facilities. Do not re-test or rebuild generic claim/grant/HTTP/TLS/fleet machinery as plugin features.
- Validate actual settings and distinguish worker limits from job/resource limits. Record any missing reusable operation and keep affected capability disabled.

**Done:** eight scientific properties pass with recorded evidence; capability/assurance limits are truthful. No compulsory two-host deployment, UI suite or legacy test-count parity.

### M5 — Run one bounded released-input Accorde pilot

- Use existing **released/synthetic CPU inputs** and current domain verifier; no GPU, new scientific claim or sealed/fresh confirmation.
- One author worker plus the automatically launched reviewer demonstrates team collaboration. If available, one second human submits a follow-up over an existing source/channel; absent credentials are reported, not replaced with a new connector.
- Maximum **4 benchmark launch attempts**, each **60 seconds**, total admitted benchmark timeout budget **240 seconds**, benchmark concurrency **1**, no benchmark fan-out. Retries/failed launches count within the four. Configure worker slots separately; `maxWorkers=2` is not a global benchmark/subagent limit.
- Enforce attempt count and serialize via reused ownership/state; if those caps cannot be enforced at the selected boundary, stop rather than run an uncapped pilot. Model spending and runtime overhead are reported separately, not falsely included in 240 seconds.
- Record candidate, actual job status, verifier evidence, exact review and a continue/pivot/stop checkpoint. Stop at the bound; no inherited “never stop.”

**Done:** end-to-end evidence packet and automatic-review receipt, actual usage, demonstrated stop, and a reuse-gap list. The pilot need not run on two machines and proves no model improvement or production distributed guarantee.

### M6 — Cut over new work conservatively; archive only after continuity

- Move **new campaigns only** to the qualified route. Keep active legacy H3 campaigns/runtime locks unchanged until their work terminates or is explicitly reconciled.
- Inventory runtime pins, active jobs/controllers, evidence, spent costs and opened confirmation subjects. Preserve the existing project-wide opening authority; disable conflicting legacy/new writers.
- Retire fork dependency only when no active workflow needs it and budget/exposure continuity is proven. Optional one-off offline export/import is a separate justified task, not a general migration subsystem.
- Archive the fork and its planning/trackers/evidence without deleting useful history. Roll back transport/execution by pin, never by erasing charges or exposure.

**Done:** documented new-campaign cutover and conservative archival/rollback gates satisfied. If continuity is unresolved, keep the legacy authority and do not declare retirement complete.

## 6. What survives from autoresearch, and what does not

Karpathy's baseline → propose → run → evaluate → keep/discard/iterate method and human-editable instructions remain an inspiration. The original GPT trainer, five-minute `val_bpb` example, root Torch/data/cache dependencies, `results.tsv` machinery and unbounded “never stop” Git loop are **not required implementation dependencies**. Preserve attribution/license provenance for any actually copied material.

From the fork, keep only the properties behind goals, actual result validity, scoped review and no confirmation reuse. The [matrix](261103-1637-dist-exec-drop-matrix.md) separately covers five unchanged core legacy modules and two unchanged review helpers so their old presence does not become a hidden port obligation.

Advanced search/frontier ranking, universal statistical methods, containers/remote fleets, auto-plan patches, automatic Git promotion and live/historical board UX are optional future proposals. **None is a prerequisite for this minimal core.**

## 7. Evidence boundary and validation status

This revision is a **source/documentation audit**, not a successful dsh-research deployment. Framework working trees remained clean; no code, dependencies, services, models, GPUs, staging, commits or pushes were changed for this revision.

Earlier dist-exec audit evidence remains historical: [26 focused distributed tests, 2 ephemeral loopback tests and fleet UI check](../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/tests.json), [124-test Python regression](../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/full-python-regression.json) and [source manifest](../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/source-manifest.json). These do not certify the new plugin, real remote deployment, service installation or fresh confirmation.

The graceful-timeout flaw is fixed at this dist-exec HEAD; retain its invalid-on-interruption property. Other recorded integrity/review/publication gaps are **not** declared fixed. Dropping the duplicate runtime avoids copying their implementation; P01–P08 must still be tested on the reused route. See the [prior disposable publication reproduction](../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/reserved-state-publication-reproduction.json) and matrix for precise boundaries.

## User Prompts, Verbatim

```text
write an separate actionable plan for the 6 items in "I would proceed in this order"
```

```text
please keep the changes contained (plugin or separate repo), so that minimal changes to dsh-superagent.
```

Preceding rebuild decision question:

```text
or rebuild the autoresearch added features into dsh-superagent?
```

Original-autoresearch follow-up:

```text
if we go with the dsh-research plugin plan, what's part of original/karpathy autoresearch still left?
```

Outer-loop ownership follow-up:

```text
Should the outer loop (resteering)  introduced in my fork be ported to dsh-superagent or dsh-research?
```

Teamwork refresh request:

```text
yes. dsh-research needs to support team collab. actually I just pulled and switched my autoresearch fork's dist-exec branch, which is made specifically for teamwork. Check the planning doc and impl, refresh the dsh-research plugin plan if needed.
```

Reuse requirement:

```text
if some features are already covered by dsh-superagent, don't reinvent the wheel.
```

Latest minimal-core/reuse instruction:

```text
superagent has the watchdog, which acts for heartbeats. 
superagent alos has the worker agent, and communicaton, so the "distributed claim/start" can use that route, not re-invent. 
So are the "Concurrency/Recovery/Review/Persistence", as those can be set up to run on superagent. 
Let's revise the plan to reuse superagent as much as possible. don't have to re-impl what autoresearch dist-exec's carbon copy. The key here is minimal/core dsh-research, only the gist. Answer this question, "can I drop this" for every autoresearch's dist-exec branch?
Also the review board needs revamp, omit that in the current planning.
```


## Filename Convention Request, Verbatim

~~~text
please use {YYMMDD}-{HHMM}-* as the format of the plan/tracker file name.
~~~

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-03 12:30 -0800 | Created the separate six-milestone actionable rebuild plan with contained sibling-plugin ownership, zero default superagent changes, explicit contracts/services, automatic planner/reviewer activation, failure conformance, bounded Accorde pilot, new-campaign cutover and archival/rollback gates. Preserved the plan and containment instructions verbatim; implementation not started. |
| r2 | 2026-11-03 12:37 -0800 | Refined the plan against public DSH usage sites: standalone sidebar page, fresh Session/model/tool/process adapters, optional unpublished source-SDK bridge, reviewer role restrictions, single confirmation-ledger writer and enforceable pilot caps without invented provider-budget guarantees. |
| r3 | 2026-11-03 14:27 -0800 | Clarified original Karpathy lineage: the experiment-loop method survives, while the GPT example, five-minute/bpb contract and root dependencies are not required. Distinguished the transitional added Python runtime from original trainer code and preserved the user's question verbatim. |
| r4 | 2026-11-03 14:32 -0800 | Explicitly assigned outer-loop/re-steering state, scientific transition rules and successor admission to the contained research plugin; distinguished DSH Session/job transport and optional superagent routing. Preserved the ownership question verbatim. |
| r5 | 2026-11-03 14:58 -0800 | Refreshed against clean dist-exec ead1ae5/runtime0.6.0 planning and implementation. Made team collaboration and distributed evaluation explicit, added reuse-first ownership, native grant/round/qualification/publication/access contracts, C16–C28, multiperson/two-host pilot and distributed retirement. Recorded 26+2 offline tests/fleet UI, the fixed timeout regression and disposable publication-state corruption reproduction; retained anonymous versus authenticated/physical qualification distinctions and zero default superagent changes. Preserved both new user instructions. |
| r6 | 2026-11-03 15:09 -0800 | Added 124-test full local Python regression and audited source-manifest references. Kept uncovered POC gaps and real team/backend qualification explicitly pending; no implementation or deployed state changed. |

| r7 | 2026-11-03 16:49 -0800 | Superseded the full-stack/standalone/fleet rebuild with a superagent-dependent skill/policy/helper core. Reused watchdog, worker routing, communication, concurrency, recovery, review and persistence; replaced C01–C28 parity with P01–P08 scientific properties; removed review-board/UI work and mandatory two-host pilot. Linked an exhaustive 65-path dist-exec disposition plus unchanged legacy-core coverage; preserved prompts/history, continuity and zero default superagent source changes. No implementation or deployed state changed. |
| r8 | 2026-11-05 16:26:56 -0800 | Renamed 20261103-1230-plan-dsh-research-plugin-rebuild.md to 261103-1230-plan-dsh-research-plugin-rebuild.md using YYMMDD-HHMM; updated 3 local links and repaired 5 copied Accorde audit references. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
