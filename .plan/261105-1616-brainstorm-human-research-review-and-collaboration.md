# Brainstorm — Effective feedback and autonomous project research

Created: 2026-11-05 16:16:16 -0800. Updated: 2026-11-11 17:07 -0800. Revision: r7. Status: revised design; implementation and project authority migration pending.

A human review surface is useful when feedback changes the next project action and the team can see the resulting evidence. “Organized live Docs” describes presentation; the essential design is a project-owned closed feedback loop with autonomous research.

The [contract](261105-1705-contract-project-state-autonomy-and-feedback.md) makes state ownership explicit. The [Lark feedback proposal](261105-1621-plan-lark-research-review-and-sharing.md) defines collection, assessment, decisions/effects and response. `Accorde's plan` (project-owned input pending) owns the concrete project implementation. dsh-research keeps reusable logic and its own engineering records only.

## What a person reads first

A short brief says what was learned, what evidence/counterevidence supports it, why the agent chose its next step, who/what is working, and how optional feedback was handled. The normal brief says no human input is required. It links project-owned decisions and effect receipts; further paths/transcripts are folded below.

| Reader | Useful question | Evidence link |
|---|---|---|
| Owner | Is the objective fulfilled or scientifically exhausted? | Project checkpoint, alternatives and exact steering question if needed |
| Domain reviewer | Does the claim and next action follow from valid evidence? | Frozen result/verifier, support/counterexample and agent review |
| Teammate | What happened to my suggestion? | Captured version, disposition, successor and actual effect |
| Operator | Is execution resolved and bounded? | Project/native job, charges and hold/recovery status |
| Newcomer | What are we trying and why this direction? | Goal, brief branch history and next autonomous action |

## Core feedback cycle

Use the [canonical loop contract](../docs/contracts.md) to distinguish L-stage scientific transitions from F1–F3 feedback/publication facts. Link each claimed disposition/effect to an observed receipt on its pinned contract/profile; a requested action, read receipt or Doc update alone is not execution. These observations also supply permitted evidence to the separate 1604 package gate.


~~~mermaid
flowchart LR
  G["Project research and result"] --> B["Current brief"]
  B -. optional input .-> C["Source comment capture"]
  C --> A["Agent assessment at checkpoint"]
  A --> D["Project disposition and action"]
  D --> X["Agent review, execution and observed effect"]
  X --> G
  D --> R["Visible reason and effect link"]
  R --> B
~~~

The writer must show received, assessed, adopted/rejected/deferred/stale, executed/failed/pending effect and responded separately. Delivery is not adoption. Silence is not approval and does not pause execution. A publication outage leaves the local decision intact.

## Reuse choices

| Need | Existing route | Small project/package addition |
|---|---|---|
| Capture optional team input | Feishu source and lark-cli comment reads via existing scheduled workers | Versioned project snapshots/cursor and pending feedback |
| Assess relevance and change the plan | Existing author plus separate agent reviewer | Structured disposition/reason and exact next-action/effect references |
| Preserve research authority | Existing DSH storage, Session and superagent providers | Project-local path config, one writer and no package DB |
| Explain current work | Project Markdown/brief plus existing DSH file preview/operational panel | Short semantic summary; native file changes are not scientific conclusions |
| Share/annotate | Existing Lark Docs/Wiki and Feishu threads | Derived project view; no independent review server |
| Contact a person when scientifically exhausted | Existing human_action/attention route | Reviewed scoped exhaustion and a concrete requested scientific context |

Native message feedback is log-only and not model-visible by itself; an explicit consumer must capture/adapt it before an author can assess it. Agent Teams is optional agent coordination, not a human decision store. LiveShare remains optional for a curated review Session; its view mode is interactive and needs qualified restrictions. The first design needs neither an Agent Team board nor LiveShare.

## Package architecture signals and team feedback

The [1604 meta loop](261111-1604-architecture-meta-loop-and-migration.md) concerns dsh-research's reusable architecture. Keep ordinary project science, optional comments and local fixes on their existing feedback route. A captured comment or repeated complaint is a signal, not qualified architecture entry.

A package-relevant signal links its accepted core requirement, pinned versions, expected/observed facts, local-fix evidence and affected contract/consumers. The package design author plus separate reviewer applies T1–T4 and the material-blockage/architectural-cause/insufficient-repair gate. Keep project scientific evidence in P and package design/entry decisions in dsh-research. Reply with triaged/local-repair/qualified-assessment status and actual effect; do not confuse a package design review with project scientific exhaustion or require a human reply to continue.

## Autonomous steering first

The author executes/reviews/diagnoses/revises/tries orthogonal alternatives without human confirmation inside standing policy. A negative or procedural result is a checkpoint. If no viable path is known, rebrainstorm using different reliable label sources/methods/context within the scientific goal. Ask for human direction only after the reviewed scoped exhaustion record establishes why no admissible scientific path remains.

~~~mermaid
flowchart TD
  C["Result or feedback checkpoint"] --> V{"Viable next scientific action?"}
  V -- Yes --> A["Autonomous proposal and agent review"]
  V -- Unknown after failure --> D["Autonomous diagnosis or alternative"]
  D --> V
  V -- No known route --> B["Orthogonal evidence-backed rebrainstorm"]
  B -- Route found --> A
  B -- Scoped scientific exhaustion --> H["One human scientific steering request"]
  O["Operational or resource hold"] -. repaired or standing recovery .-> A
~~~

A hard uncovered cap, unknown execution or missing permission may hold a dependent action until changed; it is not an exhaustion claim or a routine approval checkpoint. Accorde's standing bounded procedural-recovery rule should be preserved. A fulfilled goal ends normally. Explicit human stop is respected.

## Visualize evidence and feedback effects

Use a short tested/rejected/invalid/untested branch map, a checkpoint timeline with changed hypothesis, and scientific plots with support/uncertainty and comparable splits/methods. Show negative and invalid outcomes separately. Feedback visualization adds a direct thread: suggestion → decision → changed action → observed result.

~~~mermaid
flowchart LR
  F["Suggestion: expose family failures"] --> D["Adopted with project rationale"]
  D --> A["Frozen family-breakdown report action"]
  A --> E["Actual receipt and supported plot"]
  E --> R["Response links decision and result"]
~~~

Illustration only; no such comment/action was executed by this planning task. Existing file diffs, session exports and Doc history are navigation aids; frozen project snapshots preserve evidence and consumption.

## First useful test

A successful trial must show an optional suggestion arriving, being assessed, affecting or being rejected by the next plan, and returning a reason/result link. Repeat with edits/duplicates/restart, no input and unavailable Docs. The next admissible iteration must continue in every non-exhausted normal case without waiting for a person.

Then ask an owner/reviewer/newcomer to find the claim, evidence, suggestion disposition, next action and exhaustion/hold distinction. Record navigation effort and misunderstandings before adding richer UI. A pretty Doc or completed upload alone does not establish useful review.

The concrete `Accorde brief` (project-owned input pending) and project tracker hold the example state. Package plans contain the reusable workflow and qualification rules, with no per-project progress or scientific decision database.

## Earlier User Prompts and Quoted Examples, Verbatim

Retained as history; current project ownership/autonomy semantics above take precedence.

~~~text
if dsh-superagent already integrated lark/feishu, live (organized) lark docs might be a good candidate for sharing/reviewing
~~~

~~~text
create m0 to give a overview of the architecture, workflows with examples, idempotency considerations, with enough mermaid figures to help me understand, 
Let's also brainstorm a more human effective and human labor efficient way to review the progress of the research, and current artifacts, and how to visualize, and how to share/collab with team members, try to reuse dsh/superagent as much as possible.
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
| r1 | 2026-11-05 16:16:16 -0800 | Recorded source-backed review and collaboration alternatives, recommended a checkpoint brief with existing conversations/attention, proposed optional derived visualization and dedicated review Session trials, and preserved runtime/publication limits. |
| r2 | 2026-11-05 16:21:35 -0800 | Revised the recommended shared surface to organized live Lark goal Docs plus existing Feishu decisions; linked the detailed Docs qualification and publication-idempotency proposal without adding a board/runtime. |
| r3 | 2026-11-05 16:26:56 -0800 | Renamed 20261105-brainstorm-human-research-review-and-collaboration.md to 261105-1616-brainstorm-human-research-review-and-collaboration.md using YYMMDD-HHMM; updated 3 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
| r4 | 2026-11-05 17:05:50 -0800 | Updated live references after moving the project-specific brief into Accorde; original quoted requests/history retained. |
| r5 | 2026-11-05 17:09:58 -0800 | Focused review design on comment-to-effect closure, autonomous continuation and scientific exhaustion; made hosted projects own all research decisions/state and kept optional views subordinate. |
| r6 | 2026-11-11 16:36 -0800 | Adopted 1604's package-architecture scope, T1–T4 evidence gate and maintainer/reviewer ownership; kept routine project triage, scientific autonomy and deployment qualification separate. |
| r7 | 2026-11-11 17:07 -0800 | Linked canonical research-loop contract 1.0.0, pinned stage/invariant/trace semantics and retained prospective runtime qualification and project authority. |
