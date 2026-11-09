# Brainstorm: should Accorde switch from our autoresearch fork to DSH superagent?

Created: 2026-11-03 12:01 -0800. Original source assessment: 2026-11-03 17:03 -0800, r5. Local update: 2026-11-05 16:26:56 -0800. Revision: r7. Status: current source review and milestone breakdown linked; implementation and deployment pending.

Local review note: dsh-research was created on 2026-11-05 and currently contains policy/planning files. Original baselines and test counts below describe the November 3 assessment. See the [1201/1230 source review and execution index](261105-1555-review-1201-1230-and-milestones.md) and [execution tracker](tracker/261105-1555-milestone-execution.md) for current integration findings and six detailed milestone plans. The 1230 originals and audit evidence remain in Accorde; their copied links are corrected here. The new breakdown preserves the minimal reuse-first scope and keeps fresh confirmation disabled.

This revision **supersedes the earlier host-only/permanent-Python-substrate and full native control-plane/UI proposals**. Historical revision entries and test evidence remain provenance, not current implementation requirements. The actionable authority is the [minimal dsh-research plan, r7](../../accorde/.plan/20261103-1230-plan-dsh-research-plugin-rebuild.md); the [dist-exec drop matrix](../../accorde/.plan/20261103-1637-dist-exec-drop-matrix.md) supplies exhaustive dispositions. [Chinese companion](261103-1201-brainstorm-autoresearch-versus-dsh-superagent-zh.md).

## 1. Answer: adopt superagent's machinery, not a carbon copy of dist-exec

**Use dsh-superagent as the target operational/team runtime, with a small sibling dsh-research skill/policy/helper package. Do not switch active campaigns wholesale, and do not rebuild dist-exec inside a new plugin.** Qualify the bounded integration first; stock superagent by itself is not scientific qualification.

The earlier comparison correctly identified scientific properties worth preserving, but drew too large an implementation boundary around them. Those properties do **not** require another coordinator, store, scheduler, worker protocol, supervisor, reviewer manager or dashboard. Superagent already has the operational route; configure it and add only the missing research gist.

| Responsibility | Destination |
|---|---|
| Watchdog/operational heartbeats, Tickets/workers, communication, concurrency, recovery, review and persistence | Existing configured superagent/DSH facilities |
| Prompt/goal and candidate/evaluator/data identity; actual evidence validity; bounded next decision and scoped admission | Minimal dsh-research policy/helpers, executed by existing workers |
| Correctness, measurement, statistics and scientific acceptance | Existing Accorde/domain tools and verifiers |
| Active legacy campaigns, immutable evidence, spent charges and confirmation-opening history | Preserve their existing runtime/authority until a reconciled handoff |

**Review-board revamp is omitted from current planning.** No new Research page, fleet UI, review server, review database or inbox migration. Existing review conversations and ordinary evidence packets suffice; automatic independent review still belongs in the configured workflow.

This is a revised recommendation and documentation update, not permission to install DSH, change runtime locks, deploy services, commit code or launch experiments.

## 2. Baselines: current branch versus historical evidence

| Repository / evidence | Revision | Interpretation |
|---|---|---|
| Current `~/wk/autoresearch` | `ead1ae507934a6da5e914a2559d6fcac99c505c4`, clean `dist-exec`, runtime 0.6.0 | Current donor implementation; do not assume HEAD is deployed by every campaign |
| dist-exec base | `33ef750face59b42f9663c8e355a77600d1765e7` | Two-commit delta: 65 changed paths, 60 added and 5 modified |
| `~/wk/dsh-superagent-prototype` | `8c32a9dc5d72c033816c6a8110b37f40cf94fba4`, clean | Operational/team runtime to reuse; actual profile capabilities still need verification |
| `~/wk/accorde` | `7c85e7541a3d8dfbb25fec46d96ff644c1ae72b5`, `cross-isa` | Domain tools and preexisting scientific artifacts; no scientific state changed here |
| Original 12:01 fork comparison | `d47eabdb1aeb433492563a5abcfbeaae43c75209`, `feature/workflow-review-overview` | Historical 0.5.8 assessment, not the current dist-exec baseline |
| `~/wk/dsh-research` | Created 2026-11-05; package not implemented | Separate sibling planning directory; zero default superagent source changes |

This update uses the completed source audits and current plan/matrix. It does not rerun the earlier runtime suites, infer installed services from source, or treat historical machine prerequisites as a fresh environment inspection.

## 3. What superagent already covers—and what remains small

| dist-exec concern | Reuse instead | Research-specific residue |
|---|---|---|
| Heartbeats, process liveness and service recovery | Existing [service script](../../dsh-superagent-prototype/scripts/dsh-superagent) and [external hourly watchdog](../../dsh-superagent-prototype/docs/006-deployment.md), 133–141 | Configure the check outside the service profile. Healthy service is not benchmark progress/completion; read ordinary job status. No research heartbeat daemon. |
| Distributed claim/start and worker communication | Existing [orchestrator routing](../../dsh-superagent-prototype/src/app/tools/main.ts), 88–150, Tickets, workers and sources | Attach manifest/action/evidence references to bounded work. Assignment acceptance is not benchmark start. No enrollment/grant/claim API. |
| Concurrency and workspaces | Existing [WorkerSlots/executor](../../dsh-superagent-prototype/src/executor/dsh.ts), 165–198, 227–235, and configured checkout/job facilities | Verify actual bounds. `maxWorkers` limits workers, not every background job, GPU resource or remote machine. No parallel scheduler or resource-lease engine. |
| Recovery, cancellation and completion wakeups | Existing [jobs/subagents](../../dsh-superagent-prototype/src/executor/background.ts), 9–20, 61–119; persisted effects and delivery | Small truthful status/evidence mapping and scientific action deduplication. Timeout/cancel/provenance failure stays invalid despite passing-looking output. |
| Review and reviewer involvement | Existing [worker-owned review](../../dsh-superagent-prototype/prompts/work.md), 21–49, team prompts and configured subagent/review launch | Automatically launch a separate reviewer at declared boundaries; bind exact subject/evidence/action, reject stale review. No reviewer service or board. |
| Persistence and communication history | Existing [Store](../../dsh-superagent-prototype/src/app/store.ts), 58–87, 140–161; [SourceContext](../../dsh-superagent-prototype/src/sources/host.ts), 31–65, scoped KV/atomic operations and channels | Compact scientific associations and immutable ordinary artifacts, not a new research SQL engine, outbox, messaging bus or CAS. |

The existing SourceContext seam is **not a verified published SDK**. Prefer configuration/worker tools/documented routes; if essential programmatic access is missing, separately propose a narrow versioned export/facade over existing operations. Do not use private imports or build a replacement engine because an export is absent.

Watchdog installation, jobs/subagents availability, source credentials and remote-execution targets were not demonstrated by this documentation update. Enable only the routes actually verified in the target profile. The first pilot need not use two hosts; do not invent a remote fleet to satisfy the donor's architecture.

## 4. The gist to retain—not the module structure

A few helpers plus research instructions are enough. The four illustrative modules in the plan are **manifest**, **evaluate**, **loop** and **admission**; they are not four new services.

| Small contract | What must remain |
|---|---|
| Identity and evidence | Original prompt/goal revision; candidate, evaluator/verifier, input/split/purpose and relevant environment identity; exact invocation; immutable typed finite output, hash and parse the same captured bytes |
| Execution versus science | Actual terminal status; interrupted/cancelled/crashed or provenance-invalid work cannot become valid from exit zero or stdout. A valid negative result remains useful evidence. Existing domain verifiers decide qualification, not caller flags or a new statistical DSL. |
| Scoped review and bounded admission | Exact project/stage/candidate/evidence/plan/action; advice/stale feedback is not authorization. Review cannot waive validity, budget or exposure. Check authoritative limits before launch; retries do not restore spent budget. |
| Goal outer loop / re-steering | Evidence-backed hypothesis → result → checkpoint → continue/diagnose/pivot/defer/stop. Changed assumptions/evidence/context are required before revisiting a rejected path. **Policy in dsh-research; activation in existing superagent workers/jobs.** |
| Confirmation and continuity | One project-wide consume-before-access authority; failed/interrupted openings stay consumed; no rename/profile/retry reuse; preserve existing records and single-writer handoff |

For Accorde retain `~/.local/state/autoresearch/confirmation/accorde-ppp.sqlite3` and its history. Reuse the authority via a thin adapter or narrowly expose an existing atomic persistence operation; do not copy the runner/ledger or initialize an empty replacement. **Fresh confirmation remains disabled until atomicity, continuity and writer coordination are demonstrated.** Procedural separation is accepted; a new checkout is not claimed to be access-control isolation.

No GoalLedger clone, universal qualification engine, finite RoundPlan/DAG compiler, top-k/frontier system, plan-patch framework or generic migration subsystem is a minimum-core obligation. Keep Karpathy's experiment-loop method and appropriate attribution, not its GPT trainer, root Torch dependencies or unbounded “never stop” implementation.

## 5. Can I drop the dist-exec additions?

**Yes: every full-file port obligation can be dropped.** The [exhaustive matrix](../../accorde/.plan/20261103-1637-dist-exec-drop-matrix.md) accounts for **65/65 changed paths**:

| Disposition | Count | Meaning |
|---|---|---|
| YES | 36 | Drop duplicate implementation/archive-only material; reuse existing facilities |
| YES/BUT | 24 | Drop the implementation, retain the small scientific property named in the row |
| DEFER | 5 | Omit optional sophistication from the initial core |

The matrix separately covers five unchanged scientific-core modules and two unchanged review helpers, so their presence in the old plan does not become a hidden port obligation. “Drop” means omit from the new implementation—not delete evidence, erase charges/openings, or retire an active runtime pin.

This changes the earlier migration/rebuild alternatives:

| Earlier option | Updated disposition |
|---|---|
| Keep autoresearch as the permanent scientific substrate under DSH | Not the required destination. Retain legacy runtime/authority for active campaigns and continuity, not duplicate orchestration for all new work. |
| Co-package the entire Python runtime indefinitely | Not required. Reuse existing domain evaluators and only justified legacy adapters/authority, not the whole controller/store/worker stack. |
| Rebuild native scientific services and UI inside superagent | Superseded. Use the contained minimal sibling package; default superagent source changes zero. Board/UI work omitted. |
| Stock superagent alone | Not a scientific certificate. Add the small manifest/evidence/review/budget/exposure/re-steering rules; verify the integrated workflow. |

## 6. Recommended route and adoption gate

```text
bounded scientific request + compact manifest
  → existing superagent Ticket / worker / ordinary DSH job
  → existing watchdog / communication / concurrency / recovery / persistence
  → actual terminal status + immutable output + existing domain verifier
  → automatically launched independent reviewer when policy requires it
  → scoped admission + evidence-backed goal checkpoint
  → next ordinary job, defer or stop
```

Use the actionable plan's six reduced milestones: **M1** contract/reuse checklist; **M2** skill and thin helpers; **M3** configured automatic planning/review; **M4** eight scientific properties at reused boundaries; **M5** one bounded released-input CPU pilot; **M6** new-work cutover and conservative archival after continuity. Do not restore the old C01–C28/fleet/full-stack list as a release gate.

The pilot admits at most **4 benchmark launch attempts × 60 seconds = 240 seconds** of timeout budget, benchmark concurrency **1**, no fan-out, GPU collection or sealed/fresh confirmation. Retries count within the four. Model spend and runtime overhead are separate; worker slots are not a hard experimental resource budget. Demonstrate the independent reviewer, exact evidence/action binding, rejection of stale/invalid output, replay/restart continuity and stop at the bound.

Before an Accorde pilot, override [co-author/history-rewrite defaults](../../dsh-superagent-prototype/prompts/team/delivery.md), 17–25, to respect [AGENTS.md](../AGENTS.md); configure experiment-artifact delivery rather than inherited PR-as-ready criteria. Verify actual DSH/provider/source setup; the old Node/pnpm finding is historical, not a newly checked blocker.

**Cut over new work only after the integrated route preserves the small guards and shows operational benefit.** Keep existing frozen campaigns on their recorded runtime until terminal/reconciled. No two simultaneous admission authorities; preserve old evidence bytes, charges and exposure on archival/rollback. Less manual continuation, automatic reviewer involvement and reduced duplicate maintenance are hypotheses to test, not measured gains.

## 7. H3 context and evidence limits

The original read-only comparison observed **193 retained campaign entries**, execution pin 0.5.4/presentation 0.5.8, and a goal ledger with **385 closed admissions and 35 goal records**. These are historical workflow counts, not current inventory, independent scientific successes or proof of reliability.

The inspected `context-availability-exhaustion-rebrainstorm-r1` required serving-visible independently varying numeric/value/access context, a qualified complete unprofiled label/context bridge, or an independently authorized hardware/compiler target. Changing the host supplies none of these. The retained unseen-whole-kernel endpoint (MdAPE <=5%, support/coverage, no target calibration) does not change. Invalid corpora/exposed confirmation cannot become fresh evidence by migration.

| Evidence period | Recorded result | Current interpretation |
|---|---|---|
| Original 12:01 audit at `d47eabdb…` | 66 focused fork tests/15.964 s; three actual-template UI checks; 2 Accorde compatibility tests/0.015 s | Historical bounded validation; no DSH test suite/deployment executed |
| Original synthetic timeout reproduction | Interrupted job with graceful-zero exit was marked valid | [Historical reproduction](../../accorde/local_artifacts/autoresearch/switch-audit/20261103-1201/graceful-timeout-reproduction.json); **fixed at current dist-exec HEAD**, not an outstanding bug there |
| Later dist-exec audit at `ead1ae5…` | 26 focused distributed tests, 2 ephemeral loopback tests/fleet UI; 124 Python tests/23.192 s | [Focused receipt](../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/tests.json), [full regression](../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/full-python-regression.json); historical results, not new-plugin qualification |
| Minimal plan/matrix audit | 65-path coverage, bilingual alignment and independent semantic review passed | [Documentation receipt](../../accorde/local_artifacts/autoresearch/dist-exec-drop-audit/20261103-1637/validation.json); no installed runtime, reviewer or remote-service guarantee |

Other source-audited integrity/review/publication gaps remain recorded in the matrix; they are not declared fixed. Avoid copying their implementations, and test the retained properties on the reused route.

This update changed only planning documents. No model-provider calls, runtime test reruns, live DSH deployment, GPU collection, data migration or scientific experiment was performed. The recommendation is **yes to the minimal superagent-dependent route; no to a wholesale active-campaign switch or a second scientific platform**.

## User Prompts, Verbatim

```text
brainstorm my autoresearch fork and the ~/wk/dsh
```

```text
brainstorm my autoresearch fork and the ~/wk/dsh-superagent-prototype, answer one question: should I switch to dsh-superagent?
```

Migration follow-ups:

```text
how about migrate the changes to autoresearch to dsh-superagent?
```

```text
how about migrate the autoresearch changes to dsh-superagent?
```

```text
or rebuild the autoresearch added features into dsh-superagent?
```

Scope-setting instruction for the current recommendation:

```text
superagent has the watchdog, which acts for heartbeats. 
superagent alos has the worker agent, and communicaton, so the "distributed claim/start" can use that route, not re-invent. 
So are the "Concurrency/Recovery/Review/Persistence", as those can be set up to run on superagent. 
Let's revise the plan to reuse superagent as much as possible. don't have to re-impl what autoresearch dist-exec's carbon copy. The key here is minimal/core dsh-research, only the gist. Answer this question, "can I drop this" for every autoresearch's dist-exec branch?
Also the review board needs revamp, omit that in the current planning.
```

Current synchronization request:

```text
update 1201 docs as well
```


Current review requests, verbatim:

~~~text
~/wk/dsh-superagent-prototype and ~/wk/deepseek-harness are checked out.
~/wk/accorde and ~/wk/autoresearch are also checked out.
reivew the 1201 plan and write actionable plans for each milestone.
~~~

~~~text
~/wk/dsh-superagent-prototype and ~/wk/deepseek-harness are checked out.
~/wk/accorde and ~/wk/autoresearch are also checked out.
reivew the 1201 brainstorms and 1230 plans and write actionable plans for each milestone.
~~~


## Filename Convention Request, Verbatim

~~~text
please use {YYMMDD}-{HHMM}-* as the format of the plan/tracker file name.
~~~

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-03 12:01 -0800 | Recorded the exact decision question, source baselines/policies and read-only Accorde ledger context before the independent source audits. Preserved both user prompts verbatim; recommendation and validation pending. |
| r2 | 2026-11-03 12:09 -0800 | Completed both source audits and targeted validation; recommended retaining the scientific substrate and testing DSH only as a host-layer complement. Distinguished agent hosting from science/review gates, recorded a reproduced timeout bug and DSH policy/environment costs, and defined decision-changing evidence without authorizing migration. |
| r3 | 2026-11-03 12:23 -0800 | Assessed migration of the fork's scientific capabilities into a DSH research extension: reuse the Python core first, add durable agent/reviewer activation, preserve distinct admission and lifecycle semantics, and cut over only after parity/benefit qualification. Recorded the proposed inbox-ownership change and both follow-up prompts verbatim. |
| r4 | 2026-11-03 12:24 -0800 | Assessed native rebuilding as the preferred long-term architecture if DSH is chosen: reuse its host infrastructure, rebuild explicit research services and UI, retain legacy executors temporarily, preserve old record identities and cut over only after conformance plus benefit. Preserved the rebuild question; no implementation authorized. |

| r5 | 2026-11-03 17:03 -0800 | Synchronized the comparison with minimal dsh-research plan r7 and the exhaustive dist-exec drop matrix. Replaced permanent-Python/full native control-plane/UI recommendations with reuse of superagent watchdog, worker routing, communication, concurrency, recovery, review and persistence plus small scientific helpers. Updated current versus historical branch evidence, marked the graceful-timeout defect fixed at current HEAD, omitted review-board work, and preserved historical prompts/history, charges/exposure and conservative cutover. Documentation only; no implementation authorized or executed. |
| r6 | 2026-11-05 15:56:32 -0800 | Linked the current 1201/1230 source review and six detailed milestone plans, updated the created-directory status, and repaired copied references to Accorde plans/audit evidence. Preserved original prompt blocks and history; recorded both review requests verbatim. Planning only; no implementation, deployment or experiments. |
| r7 | 2026-11-05 16:26:56 -0800 | Renamed 20261103-1201-brainstorm-autoresearch-versus-dsh-superagent.md to 261103-1201-brainstorm-autoresearch-versus-dsh-superagent.md using YYMMDD-HHMM; updated 3 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
