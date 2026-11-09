# Justifications for AGENTS.md rules

One entry per rule in `AGENTS.md`, with the date it was introduced and why.
This file also serves as the revision history for `AGENTS.md`.

## Rule: Any amendment to an existing artifact must add/update timestamped `## Revision History`.

- Added: 2026-07-29
- Why: Artifacts (design docs, plans, reports) evolve across many agent runs;
  a timestamped revision history makes changes auditable and lets a later reader
  reconstruct what changed and when without diffing git.
- Historical source note: the copied rationale recorded a 2026-08-01 agent-facing
  exemption. The current AGENTS.md does not include it; amendments here also record
  a timestamped Revision History. This note preserves the copied history without
  applying that obsolete exemption.

## Rule: No `Co-Authored-By` trailer in commits.

- Added: 2026-07-29
- Why: Commit authorship should reflect the human author only; automated
  co-author trailers add noise and misattribute ownership in this repo's history.

## Rule: Every rule here must have a justification entry in `.agent/rules-rationale.md` (which doubles as this file's revision history).

- Added: 2026-08-01
- Why: Rules without recorded rationale become cargo-culted or silently dropped.
  Requiring a justification keeps `AGENTS.md` terse (rules only) while preserving
  the reasoning, and gives `AGENTS.md` an audit trail without violating its own
  revision-history rule.

## Rule: Persist user prompts verbatim in artifacts.

- Added: 2026-08-03
- Why: Verbatim prompts make artifact intent and provenance auditable, easier to
  understand, and easier to debug. They also encourage concrete, thoughtful
  prompting and support sharing the user's thought process.

## User Prompt, Verbatim

~~~text
~/wk/dsh-superagent-prototype and ~/wk/deepseek-harness are checked out.
~/wk/accorde and ~/wk/autoresearch are also checked out.
reivew the 1201 brainstorms and 1230 plans and write actionable plans for each milestone.
~~~

## Rule: Use `{YYMMDD}-{HHMM}-*` for plan and tracker filenames.

- Added: 2026-11-05 16:26:56 -0800
- Why: A consistent compact date/time prefix makes plans and trackers easier to
  sort and locate. Existing explicit time prefixes are retained; files without a
  time prefix use their recorded creation or snapshot time. The user explicitly
  requested this format for the current workspace.

## Filename Convention Request, Verbatim

~~~text
please use {YYMMDD}-{HHMM}-* as the format of the plan/tracker file name.
~~~


## Rule: Keep hosted-project research artifacts and persistent scientific state in that project workspace; dsh-research owns reusable code and its own development artifacts.

- Added: 2026-11-05 17:11:14 -0800
- Why: The hosted project must retain its own research decisions, evidence,
  accounting and feedback history without depending on a shared-tool checkout.
  This confines the reusable package to implementation and its own engineering
  artifacts. Existing legacy authorities are preserved until a verified handoff.

## Rule: Within standing project authority, research flows continue autonomously; request human scientific steering only after reviewed scientific exhaustion.

- Added: 2026-11-05 17:11:14 -0800
- Why: Routine iterations and technical review must not create human approval
  bottlenecks. The author diagnoses, recovers and evaluates alternatives under
  the project policy. Scientific direction is requested after reviewed scoped
  exhaustion; hard guards and operational holds still apply and are not mislabeled
  as exhaustion.

## Current User Prompt, Verbatim

~~~text
I think the project related artifacts and decision should stay in the project workspace (i.e. accorde/), so it's self-contained, try to minimize the states stored in the dsh-research. Please confirm that, and be explicit about Responsibility/Owner/Location of Persistent State.
"organized live Lark Docs" is not convincing. I don't see the feedback loop.
Also please confirm that for most execution and iterations, human intervention is not required, nor blocking. Human input is required only when the direction is "scientifically exhausted".
~~~


## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-05 15:56:32 -0800 | Aligned the copied revision-history rationale with the current AGENTS.md rule, which has no agent-facing exemption. Preserved inherited rule dates/reasons and the obsolete exemption as historical context; all four current rules retain justification entries. AGENTS.md unchanged. |
| r2 | 2026-11-05 16:26:56 -0800 | Justified the new plan/tracker filename rule and preserved its exact user request; existing rule rationale and history retained. |
| r3 | 2026-11-05 17:11:14 -0800 | Justified the project-owned state and autonomous scientific-steering rules; preserved standing-authority limits, legacy continuity and the exact user instruction. |
