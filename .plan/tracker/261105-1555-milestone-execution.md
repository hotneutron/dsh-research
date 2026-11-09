# dsh-research milestone execution tracker

Created: 2026-11-05 15:55:26 -0800. Updated: 2026-11-05 17:11:14 -0800. Revision: r7. Status: M0 documentation ready for review; M1–M6 execution not started.

Parent: [review and index](../261105-1555-review-1201-1230-and-milestones.md). Source architecture: [1230 English r7](../../../accorde/.plan/20261103-1230-plan-dsh-research-plugin-rebuild.md) / [Chinese r6](../../../accorde/.plan/20261103-1230-plan-dsh-research-plugin-rebuild-zh.md).

## Package versus project tracking

This tracker owns reusable-package implementation/qualification only. The [Accorde tracker](../../../accorde/.plan/trackers/261105-1705-tracker-dsh-research-project-integration.md) owns the actual project integration/pilot/feedback receipts and scientific decision history.

Current [persistent-state and autonomy contract](../261105-1705-contract-project-state-autonomy-and-feedback.md): all per-project state and resolved provider paths stay in the hosted project. Its research loop has no routine human approval/input dependency; human scientific direction is raised only after challenged exhaustion. M3 must prove autonomous feedback capture/disposition/effect/response and avoid the prototype's default person-stage handoff for ordinary negative/procedural results. M4 tests roots, feedback edit/replay, no comments/publication failure, recovery and exhaustion classification.

No runtime state migration, cloud action or research experiment was performed in this documentation revision. Prior M0 validation is historical; new validation covers the revised diagrams and project links.

## Milestone status

| Milestone | Status | Dependency / next concrete work | Completion evidence |
|---|---|---|---|
| [M0](../261105-1616-m0-architecture-workflows-and-idempotency.md) | documentation ready for review | Team walkthrough of architecture, examples and idempotency; review the brief/collaboration proposal | Guide, nine Mermaid figures, [brainstorm](../261105-1616-brainstorm-human-research-review-and-collaboration.md) and [sample brief](../../../accorde/.plan/examples/261105-1616-research-brief-example.md) |
| [M1](../261105-1555-m1-minimal-contract-and-reuse.md) | planned | Select compatible runtime pair; draft schemas and public state/invocation path | Runtime compatibility + reviewed contracts + S1–S8 receipt |
| [M2](../261105-1555-m2-skill-and-thin-helpers.md) | planned | M1; package pure helpers and guarded delegation | Built package + actual synthetic ordinary-worker receipt |
| [M3](../261105-1555-m3-automatic-planning-and-review.md) | planned | M2; configure effective research prompts/presets | Scripted automatic separate-review transition and stale-action refusal |
| [M4](../261105-1555-m4-scientific-property-qualification.md) | planned | M2/M3; qualify real reused boundaries | P01–P08 scoped matrix + deadline/restart receipts |
| [M5](../261105-1555-m5-bounded-accorde-cpu-pilot.md) | planned | M1–M4 and reviewed frozen live launch packet | Actual <=4×60s/240s serial benchmark workflow + reviewer + stop |
| [M6](../261105-1555-m6-new-work-cutover-and-continuity.md) | planned | M5; inventory authority/history before new-work adoption | Independent adoption / confirmation / retirement decisions |

Plans written does not mean milestones executed. Record dates, actual commands, receipt links, limits and failures when work occurs; update this artifact's timestamped Revision History on every amendment.

## Human review design scope

Current scope requires project-owned persistence, automatic comment-to-effect feedback and nonblocking human input. Qualify the closed feedback loop using project-owned records and an optional [Lark goal Doc](../261105-1621-plan-lark-research-review-and-sharing.md) with existing Feishu conversation/attention routes once target/bot access is reviewed. Derived visual snapshots and a dedicated shared review Session are optional proposals; no board/server/database or new M1–M6 release requirement has been introduced. M0 is drafted for review, not marked as a deployed capability.

## Property and route accounting

| Requirement | Owner | Present state |
|---|---|---|
| P01 identity | M1 schema; M2 checker; M4 drift cases | planned |
| P02 truthful validity | M2 terminal mapping; M4 timeout/crash cases | planned |
| P03 immutable typed domain evidence | M2 capture/verifier; M4 corruption/negative cases | planned |
| P04 scoped independent review | M3 workflow; M4 subject/replay cases | planned |
| P05 bounded durable admission | M1 state choice; M2 adapter; M4/M5 cap cases | planned |
| P06 irreversible exposure | M4 disabled-route and disposable existing-authority tests; M6 enablement | production disabled; full donor byte-read ordering gap recorded |
| P07 evidence-backed re-steering | M2 reducer; M3 activation; M4 changed-context/stop cases | planned |
| P08 continuity/deduplication | M2 record update; M4 recovery; M6 writer handoff | planned |
| S1 workers / S2 communication / S3 watchdog / S4 jobs / S5 concurrency / S6 persistence / S7 reviewer / S8 management | M1 capability receipt; M3 effective profile verification | source routes reviewed; runtime qualification pending |

## Current dependencies and limits

- Prototype/current-harness subagent methods differ; exact pairing must be qualified.
- This shell has Node 18 and no pnpm; the checked-out harness needs Node >=24.9.
- Public storage-domain is a candidate for one-record admission, not a verified installed operation on the selected pairing.
- Existing bash defaults can promote timeouts; existing local jobs are not restart-durable.
- Fresh confirmation stays off; legacy ledger history and donor byte-read ordering require separate qualification.
- Active legacy runtime/store/writer inventory has not been collected. The source review did not change campaign authority.
- Model/source configuration and M5 live spending remain unexecuted.

Benchmark attempts consumed by this planning task: 0. Model-provider experiment calls: 0. GPU collections: 0. Confirmation openings: 0. No service/profile installation, package implementation, Git initialization, commit or push occurred.

## Recording format for execution

For each milestone update, record outcome (passed/failed/deferred/partial), frozen source/profile identity, actual command receipt, expected versus observed behavior, spent/reserved limits, unresolved ownership and next authorized action. Keep a duplicate/replayed action tied to its original attempt. Preserve failure evidence and remaining capability limits.

## Current M0 Request, Verbatim

~~~text
create m0 to give a overview of the architecture, workflows with examples, idempotency considerations, with enough mermaid figures to help me understand, 
Let's also brainstorm a more human effective and human labor efficient way to review the progress of the research, and current artifacts, and how to visualize, and how to share/collab with team members, try to reuse dsh/superagent as much as possible.
~~~

## Lark Steering, Verbatim

~~~text
if dsh-superagent already integrated lark/feishu, live (organized) lark docs might be a good candidate for sharing/reviewing
~~~

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


## M0 validation receipt

Documentation is ready for team review: nine M0 diagrams and sixteen total diagrams passed [Mermaid grammar parsing](../review/261105-1629-m0-mermaid-validation-final.json). [Document validation](../review/261105-1630-m0-documents-validation.json) covers the renamed files and links. This validates documentation syntax and coverage; target runtime pairing, bot Docs access, cloud publication and native diagram rendering remain pending.


## Current Project Ownership / Autonomy Request, Verbatim

~~~text
I think the project related artifacts and decision should stay in the project workspace (i.e. accorde/), so it's self-contained, try to minimize the states stored in the dsh-research. Please confirm that, and be explicit about Responsibility/Owner/Location of Persistent State.
"organized live Lark Docs" is not convincing. I don't see the feedback loop.
Also please confirm that for most execution and iterations, human intervention is not required, nor blocking. Human input is required only when the direction is "scientifically exhausted".
~~~

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-05 15:55:26 -0800 | Created the execution tracker with all milestones pending and separate property, reuse-route, launch and confirmation accounting. |
| r2 | 2026-11-05 16:16:16 -0800 | Added M0 as documentation drafted for review, linked the human review/collaboration brainstorm and sample brief, and distinguished optional design trials from unchanged M1-M6 execution gates. Preserved original requests/status accounting and the new prompt verbatim. |
| r3 | 2026-11-05 16:21:35 -0800 | Updated the preferred human review trial to organized live Lark Docs, preserving frozen evidence, exact Feishu decisions and unexecuted runtime/publication gates. |
| r4 | 2026-11-05 16:26:56 -0800 | Renamed 20261105-milestone-execution.md to 261105-1555-milestone-execution.md using YYMMDD-HHMM; updated 11 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
| r5 | 2026-11-05 16:30:05 -0800 | Closed M0 documentation drafting with final diagram/link/coverage receipts and YYMMDD-HHMM filenames; kept all implementation, scientific and Lark deployment gates unexecuted. |
| r6 | 2026-11-05 17:05:50 -0800 | Updated live references after moving the project-specific brief into Accorde; original quoted requests/history retained. |
| r7 | 2026-11-05 17:11:14 -0800 | Separated package tracking from project-owned integration/scientific records; made closed feedback and autonomous continuation qualification explicit. |
