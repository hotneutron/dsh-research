# M3 — Configure automatic planning and independent review

Created: 2026-11-05 15:55:26 -0800. Updated: 2026-11-05 17:15:48 -0800. Revision: r4. Status: planned; implementation not started.

Dependency: M2 integrated synthetic worker example. Use M1-pinned runtime operations; resolve prototype/harness compatibility before relying on subagent completion.

Outcome: an existing worker automatically proposes, obtains a separate review, validates exact scope and admits one next action or explicitly defers.

Parent: [source review and milestone index](261105-1555-review-1201-1230-and-milestones.md). Tracking: [execution tracker](tracker/261105-1555-milestone-execution.md). The parent review owns source baselines and the reduced scope; this document defines the work and acceptance gate for its milestone.

## Project ownership and autonomous execution

The [project-state/autonomy/feedback contract](261105-1705-contract-project-state-autonomy-and-feedback.md) owns current semantics. P is the explicitly configured canonical hosted-project root. Actual manifests, budgets/action consumption, reviewer/feedback records, resolved configuration, evidence and scientific decisions live in P; package .plan/review receipts are only reusable-code qualification, never project campaign authority.

Normal research execution, diagnosis, alternatives, recovery and separate agent review continue under standing project policy without a human approval or feedback wait. A campaign limit/failure is a checkpoint. Required human scientific steering follows a reviewed exhaustion assessment; hard guard/external holds stay operational and automatically resume when their conditions permit.

## Required automatic feedback loop and host reporting

Use the existing Feishu intake plus DSH scheduled/source follow-ups to invoke a bounded Doc/comment reader when configured. Capture original source/actor/ID/version/hash in the project, queue durably before advancing the source cursor, and wake the existing author. At unit/checkpoint boundaries the author drains pending feedback, records disposition/reason, freezes a changed successor if adopted, obtains separate agent review, executes when admissible and publishes the actual effect link. A lost wakeup/restart reloads pending project feedback.

Do not require the commenter to repeat advisory feedback in chat. Do not wait for new comments. Missing Docs/delivery records a stale/pending presentation state and retries transport; allowed research continues using local records.

The coding prototype maps ready/blocked/failed/human_action to human-facing stages. Override the research procedure so a routine checkpoint, valid negative result or correctable invalid attempt is a progress/continuation event, not a person-stage handoff. Automatically handle reviewer request_changes. For an external hold use waiting without a question plus an existing scheduled/source wakeup; do not invent a human approval to resume. Complete goals may report ready normally. Set human_action only for a challenged scientific exhaustion/unblock question (or an explicit person request being answered).

Demonstrate a comment causing a project decision and actual next-action effect, and a rejection/defer with rationale. Verify zero required human replies across normal execution, agent review, procedural recovery, publication failure and absent comments.

For ordinary progress when no scientific steering question remains, explicitly clear obsolete attention with human_action=null; omitting the field retains a previous question in the prototype. Preserve an unresolved scientific-exhaustion question until its condition is actually resolved, and always respect explicit user stop. Test automatic context-change reassessment and clearing resolved attention without creating or concealing a human gate.

## Owned configuration and procedure

Write reusable config examples and docs/integration.md in dsh-research. The hosted project writes its resolved profile/prompts/pins under P/.autoresearch/dsh/profile/ and stores all research/review/feedback state under P. They are configuration recipes until installed into a reviewed target profile. The profile must contain the existing job registry/controller, shell provider, skill loader, subagent service/provider, Session persistence and M1's public state facility. Record resolved plugin IDs and package versions, not illustrative names passed off as working configuration.

1. Configure one benchmark author worker and a distinct reviewer Session/preset. Worker-slot and per-owner job limits are separate settings; set benchmark serialization through the M2 admission record. Disable ordinary bash background launch and timeout promotion for this pilot. The guarded tool delegates with a hard existing deadline. The reviewer has no benchmark/admission/exposure-write route.
2. Override runtime/work and relevant worker/handoff text to deliver research artifacts and checkpoints. Override team delivery requirements to prohibit Co-Authored-By trailers, feedback-driven history rewriting and implicit PR/merge completion. Apply explicit project rules to the main Session too: it does not read repository AGENTS.md automatically. Preserve original prompts and timestamped artifact revision histories.
3. Preserve runtime-owned source context, policy, stop semantics and original-trigger bookkeeping when overriding work text. Replacing the entire work prompt with only a research paragraph could drop host responsibilities.
4. Install the research skill using the existing team/filesystem mechanism and verify the author/reviewer can load its current bytes. Record the effective prompt config revision, override bases, schema versions and saved preset identity. Do not assume a source-file edit updates a running worker's preset or tool permissions.
5. Configure the existing external watchdog under an operator profile outside the service profile. Respect intentional stop; health reflects service status, not scientific progress. Missing source/provider configuration is surfaced through existing management routes.

No new reviewer manager, planner server, watcher daemon, channel connector or board is needed.

## Automatic transition sequence

| Step | Worker action / persisted association | Fail-closed outcome |
|---|---|---|
| 1. Design freeze | Write immutable manifest and first-action proposal; bind original human scope | Missing scope or changed identity → defer |
| 2. Review dispatch | Start a separate reviewer via configured existing subagent route; bind review_request ID to exact packet/action | No provider or uncertain dispatch → pending/defer; no self-review |
| 3. Review collection | Receive existing completion result; validate terminal outcome, reviewer identity and complete subject hashes | Interrupted or stale review → cannot authorize |
| 4. Admission | M2 checks approved exact action, validity, remaining bounds and stop state; durable single-record consumption before execute | Concurrent/replayed action → same status or refusal |
| 5. Result checkpoint | Actual tool/job completion returns to existing author; validate P01–P03 and emit bounded next proposal | Invalid/unresolved result → preserve evidence and defer/diagnose |
| 6. Successor review | Automatically dispatch the independent reviewer again for that new checkpoint/action; use a new scoped packet | Prior approval cannot authorize the successor |
| 7. Continue or end | Existing worker submits only the admitted next ordinary job, or records pivot/defer/stop | Human stop and exhausted bounds terminate admission |

The re-steering policy remains in dsh-research; activation and communications remain in superagent/DSH. Use existing notifications and parent/caller delivery semantics. Do not poll or sleep the main/router Session; configured feedback reads use existing scheduled workers/jobs. Do not turn the outer loop into a service.

Record subject-derived action/review_request identities through M1's state operation. A crash after review dispatch intent but before child association is unresolved: inspect the existing subagent/session catalog before retrying. If dispatch cannot be reconciled, defer instead of producing duplicate reviewers or inventing authorization. Duplicate completed review delivery is harmless and does not consume another attempt.

## Reviewer packet and authority

The packet includes project/stage, original prompt/goal revision, candidate/verifier/input identities, immutable evidence hashes, checkpoint/plan revision, exact next command/purpose/timeout and remaining attempt budget. Attach useful public rationale and uncertainty; the reviewer evaluates stated evidence, not private reasoning.

The reviewer result includes its own Session/provider reference, request/subject/action hashes, decision and concise evidence-backed reason. Advisory discussion in a source thread is not the scoped result. An agent approve result cannot waive source drift, invalid evidence, uncovered hard limits, human stop or confirmation-off policy. Already granted project recovery rules remain applicable. Technical review and human authorization remain distinct; no new human decision is needed for each attempt already covered by an exact approved M5 packet.

## Demonstration and checks

First use the selected runtime's scripted provider to demonstrate completion → next proposal → independent reviewer → admission or defer without model spending. Include a valid approval and an action-mismatched/stale approval; verify only the matching transition reaches the shell service.

Test saved prompt overrides and reloaded preset/tool restrictions. Record actual author/reviewer Session IDs, completion event references, invocation count and terminal receipt in .plan/review/m3-workflow-receipt.json. Inspect the assembled model-facing instructions to confirm research delivery, no trailers, no implicit merge, budget/stop and original-source rules survived.

One live author/reviewer receipt is required in M5; a scripted M3 demonstration is labeled as such. Any earlier live demo requires its own authorized bounded packet. No model, GitHub or Feishu messages are sent merely to verify these plans.

## Completion

M3 is complete when the configured existing route automatically launches the separate reviewer and accepts only the exact valid transition; stale/replayed output defers and recovery cannot duplicate scientific action. Configuration text and a promise of automatic review are insufficient. Hand effective profile/prompt/preset hashes and replay fixtures to M4.

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
| r1 | 2026-11-05 15:55:26 -0800 | Defined effective profile/prompt ownership, the automatic exact-subject author/reviewer transition and replay/dispatch uncertainty checks. |
| r2 | 2026-11-05 16:26:56 -0800 | Renamed 20261105-m3-automatic-planning-and-review.md to 261105-1555-m3-automatic-planning-and-review.md using YYMMDD-HHMM; updated 2 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
| r3 | 2026-11-05 17:07:31 -0800 | Added the automatic project-local comment-to-disposition-to-execution feedback loop; specified native reporting that avoids routine person stages and human approval waits. |
| r4 | 2026-11-05 17:15:48 -0800 | Specified explicit clearing of obsolete attention, preservation of unresolved exhaustion/user stop, and automatic context-change reassessment using native reporting semantics. |
