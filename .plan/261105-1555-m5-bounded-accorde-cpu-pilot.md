# M5 — Qualify a project-owned autonomous pilot

Created: 2026-11-05 15:55:26 -0800. Updated: 2026-11-05 17:05:50 -0800. Revision: r3. Status: design revised; implementation and live state migration not executed.

Qualify one project-owned autonomous pilot through the reusable package. The concrete [Accorde pilot plan](../../accorde/.plan/261105-1555-plan-dsh-research-cpu-pilot.md) and [integration plan](../../accorde/.plan/261105-1705-plan-dsh-research-project-integration.md) are authoritative for that project. This file is the package milestone definition, not a second Accorde campaign/decision store.

## Responsibility and deliverables

The package owns generic code qualification and disposable fixtures. The hosted project owns resolved manifests, methods, verifier adapters, budgets, action/review/feedback consumption, actual outputs and scientific decisions. Use the [persistent-state/autonomy contract](261105-1705-contract-project-state-autonomy-and-feedback.md); never write these into the package checkout.

M1–M4 technical prerequisites and the standing project mandate allow the author to freeze, independently review and execute the pilot automatically. Human feedback is optional/nonblocking; no normal transition requires human confirmation. Operational guards and finite bounds remain enforced.

## Acceptance

Demonstrate real project-local result/evidence continuity, automatic reviewer involvement, correct charged attempts, no bypass/duplicate launch, comment capture-to-disposition-to-actual-effect proof, and continuation without waiting for human feedback. Valid-negative and procedural outcomes trigger autonomous diagnosis/recovery/pivot; scientific exhaustion requires a reviewed reasoned assessment before human steering.

The Accorde example remains capped at four attempts times 60 seconds and concurrency one. That campaign cap is not the project's outer-loop termination rule. Implementation reports/decisions and specific evaluator adapters are filed in Accorde. Only reusable-package qualification receipts belong here.

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
