# dsh-research milestone implementation tracker

Created: 2026-11-05 15:55:26 -0800. Updated: 2026-11-12 00:31:07 -0800. Revision: r23. Status: helpers and scoped recovery implemented; Accorde GPU intake prepared; GPU target qualification and live adoption held.

Parent: [review and index](../261105-1555-review-1201-1230-and-milestones.md). Source architecture: [local 1230 English](../261103-1230-plan-dsh-research-plugin-rebuild.md) / [Chinese](../261103-1230-plan-dsh-research-plugin-rebuild-zh.md), refined by the latest contracts below.

## Tracking scope

This is the canonical M1–M6 implementation status and next-work record under .plan/tracker/. README.md provides stable package usage, architecture and ownership guidance with a single link here. Milestone plans define intended work and acceptance gates; receipts in .plan/review/ retain exact observations. Keep current implementation state and next actions in this tracker.

## Canonical contract status

[Research-loop contract 2.3.3](../../docs/contracts.md) is specified. L0–L8, the category-scoped property IDs and F1–F3 now provide an audit baseline for T1–T4, with confirmation-off public encodings and scoped native fixture observations now implemented. M2 now demonstrates guarded native admission/job fixtures; independent conformance review, broader source/profile integration and live qualifications remain pending. Associate future receipts with exact contract/profile hashes and assurance; preserve the canonical property set and M1–M6 scope. [Document validation](../review/261111-2112-N11-N12-validation.json) is separate from runtime evidence.

## Current document alignment

Basis: [M0/1616](../261105-1616-m0-architecture-workflows-and-idempotency.md), [sharing/1621](../261105-1621-plan-lark-research-review-and-sharing.md), [state/autonomy/1705](../261105-1705-contract-project-state-autonomy-and-feedback.md) and [layout/1452](../261109-1452-brainstorm-repo-clutter-and-team-artifacts.md). The requested 1704 is absent; use 1705. [Architecture revision/migration](../261111-1604-architecture-meta-loop-and-migration.md) is a proposal, not implementation completion.

All eight 1555 documents were audited/updated in this documentation task. [Validation detail](../review/261111-1604-document-validation.json) is versioned compact package-development evidence; raw supporting data stays local. Deliberate package engineering plans/compact qualification receipts are versioned; project explorative plans/trackers use ignored P/local_artifacts/autoresearch/dsh/<goal>/paths/<path-id>/planning/. Deliberate project plans and useful goal/milestone records stay versioned and preserve frozen plan/source hashes, backup/export and intended team access.

Accorde has a corrected project-owned GPU integration charter/tracker and non-executing GPU source/legacy-metadata intake. The previous CPU replay preparation is superseded. Accepted GPU workload/device/environment/resource/profile/budget bindings remain required before live freeze. No package copy substitutes for project authority.

## Package versus project tracking

This tracker owns reusable-package implementation/qualification only. The [Accorde tracker](../../../accorde/.plan/tracker/261112-0004-dsh-research-adoption.md) owns project preparation, pilot/feedback receipts and scientific decision history; accepted live inputs remain pending.

Current [persistent-state and autonomy contract](../261105-1705-contract-project-state-autonomy-and-feedback.md): all per-project state and resolved provider paths stay in the hosted project. Its research loop has no routine human approval/input dependency; human scientific direction is raised only after challenged exhaustion. M3 must prove autonomous feedback capture/disposition/effect/response and avoid the prototype's default person-stage handoff for ordinary negative/procedural results. M4 tests roots, feedback edit/replay, no comments/publication failure, recovery and exhaustion classification.

M1/M2 fixture execution stays in synthetic package-owned state; no hosted-project migration, cloud action or research experiment was performed. Prior M0 validation is historical; new validation covers the revised diagrams and project links.

## Milestone status

| Milestone | Status | Dependency / next concrete work | Completion evidence |
|---|---|---|---|
| [M1](../261105-1555-m1-minimal-contract-and-reuse.md) | in progress; encoding/native fixture observations | Qualify independent profile/compatibility and superagent Ticket/source handoff; preserve authority/recovery gates | [M1 scope](../review/261111-2124-m1-scope.json) and [capabilities](../review/261111-2124-m1-runtime-capabilities.json); integrated S1–S8 not complete |
| [M2](../261105-1555-m2-skill-and-thin-helpers.md) | in progress; native/packed synthetic mechanics | M1 acceptance; full scope/profile qualification and M3 handoff | [M2 package receipt](../review/261111-2142-m2-package-receipt.json) + actual ordinary-worker/packed-example fixtures |
| [M3](../261105-1555-m3-automatic-planning-and-review.md) | implemented; scoped fixture observations, acceptance pending | Independent target-profile/Ticket/semantic qualification | [M3/M4 receipt](../review/261111-2244-m3-m4-package-receipt.json): automatic native proposal/review/feedback/effect loop |
| [M4](../261105-1555-m4-scientific-property-qualification.md) | audit code and scoped native drills passed; full route matrix incomplete | Close accepted target-profile property/semantic/single-writer/operating-scope cells under reviewed budget | [M3/M4 receipt](../review/261111-2244-m3-m4-package-receipt.json); unobserved cells remain unresolved |
| [M5](../261105-1555-m5-bounded-accorde-gpu-pilot.md) | GPU source/intake prepared; execution qualification pending | Bind GPU workload/device/environment, complete unit and budget; qualify resource ownership, terminal/device quiescence and independent domain review | [GPU correction](../review/261112-0025-gpu-scope-correction.json); CPU bridge/verifier withdrawn; zero GPU qualification cells/launches |
| [M6](../261105-1555-m6-new-work-cutover-and-continuity.md) | inventory/audit/recovery preparation implemented; live held | M5 acceptance; reconcile actual legacy writers/charges/exposure and qualify compatibility/fencing | [Layout/adoption receipt](../review/261112-0004-layout-and-adoption-receipt.json); nine legacy locks inventoried; disposable native backup/restore and rollback refusal; no authority handoff |

Plans written does not mean milestones executed. Record dates, actual commands, receipt links, limits and failures when work occurs; update this artifact's timestamped Revision History on every amendment.

## Current implementation and remaining gates

Package 0.1.3 groups configuration/source/tests/scripts/examples under helpers/, retains exact generated docs/skill/lock bytes for tarballs, and tightens read-only continuity checks. Package 0.1.2 introduced the native automatic proposal/reviewer tools, same-record review/feedback/publication associations, effect checkpoint versions, persisted reviewer prefix verification, and read-only coverage/continuity/budget audits. The final 36 behavior tests and relocated M1/M2/M4/M6 native checks pass; M6 includes the M3 automatic workflow and extracted-package recovery. Exact new sources/package/evidence are in the [layout/adoption receipt](../review/261112-0004-layout-and-adoption-receipt.json). The [0.1.2 receipt](../review/261111-2244-m3-m4-package-receipt.json) retains the earlier 21-test checkpoint.

M3 uses an actual separate native subagent and retained Session evidence; request_changes leads to a fresh changed proposal, a valid negative leads to an independently reviewed feedback-driven successor, and no additional human reply is required. Replayed review/feedback/publication causes no new scientific launch. M4's scoped drills cover reviewer timeout, lost dispatch association, delayed durable acknowledgement, same-attempt replay and stale snapshot rollback refusal. The finite coverage auditor never promotes missing, conflicting or weaker-assurance observations to a pass.

Accorde is a GPU performance-modeling project. The prior CPU replay intake/bridge/verifier and four-attempt/240-second packet are withdrawn as M5 scope; their archived bytes and [original receipt](../review/261112-0004-layout-and-adoption-receipt.json) remain historical software-preparation evidence. The corrected GPU intake snapshots existing campaign, hardware-unit, CUDA fixture/verifier and current scientific scope sources. Actual workload/host/device, source/codegen/environment, complete GPU-unit budget, project-domain capture/verifier mapping and independent semantic/native qualification remain unresolved. The native adapter remains synthetic-only and cannot execute this GPU pilot. Draft GPU cells are placeholders; zero live coverage/launches are claimed.

M6 read-only metadata preparation inventories nine legacy base/campaign/review locks separately; referenced installations, global exposure ledger and confirmation workspaces are unavailable here. Active consumers, aggregate charges/reservations and exposure remain unresolved. Local preparation creates no scientific registration. The conservative continuity audit now preserves full action/review identities and dispatch phases, rejection history, finalized feedback/effects/cursors and publication audience/access proofs. Writer, profile/policy or scan-cursor changes require external reconciliation. Version 1 snapshots remain readable; native version 2 still rejects implicit legacy adoption. Disposable idle SQLite backup, exact linked artifact/Session export and native restore pass without reseeding; stale rollback is refused. This does not qualify live writer fencing, relocation or confirmation handoff.

Next work: bind the project-selected GPU question and complete scheduling unit, existing aggregate authority, device/environment and GPU/model/coordination budgets; qualify the GPU native/resource/reviewer/domain route before pilot admission. Actual runtime/operator evidence must reconcile legacy consumers/history and supported recovery/fencing before any M6 cutover. Team recipient access remains unverified; local release proof cannot close that cell. These operational/qualification holds are not scientific exhaustion.

## 1604 entry accounting

Track package signals separately from qualified T1–T4 entries: accepted requirement, versions, expected/observed facts, attempted/ruled-out repair, affected shared boundary, structural reviewer conclusion and bounded assessment cost. Package design authors own deliberate engineering entry decisions; hosted-project records retain scientific evidence/authority. The gate requires material core blockage, architectural cause and insufficient local repair. Routine failure or scientific exhaustion does not substitute for that evidence.

No architecture trigger has been empirically qualified by these documentation updates. M3/M4 development and M5/M6 preparation have scoped evidence; live M5/M6 remain held on the named prerequisites; entry/triage coverage is prospective M1–M4 governance over existing tools, not a new runtime milestone. [Document check](../review/261111-1633-meta-loop-adoption-validation.json) is separate from deployment, trigger qualification and pilot evidence.

## Human-review corrections

[Resolution](../review/261111-1808-contracts-human-review-resolution-zh.md) records all F-1–F-8/S1–S8 outcomes against the reviewed hash. M1 freezes proof/schema/applicability mappings; M2/M3 preserve order and reviewer holds; M4 uses prioritized mechanics plus required semantic review and original-witness regression; M6 revalidates contract/profile review bindings. These are planned qualification changes, not new executed milestones.

## Coverage qualification status

The contract requires a frozen declared-scope coverage matrix. M1 must bind its cells/strata/assertions before evaluation; M4 closes all required cells with actual evidence, and M6 applies the same criterion during adoption. DATA-1 off-mode checks remain required; DATA-2 not_applicable needs retained proof. The M1 fixture subset has observations; full matrix qualification remains pending; [review-r5 closure](../review/261111-1859-contracts-review-r5-resolution-zh.md) records document effects only.

## Qualification cost accounting

The required coverage matrix needs its frozen qualification budget before execution: cell/execution estimates, cost units/rates, reserve, window and owner. Record C_qual as package coordination alongside C_run and separately from C_science through existing accounting. Costs are charged once; unmet coverage budget does not authorize more spend or imply T4/scientific exhaustion. Added-obligation compatibility remains an adopter/M6 task.

## Qualification hold and envelope tracking

Retain the accepted envelope_ref/window/denominator and C_run/C_qual costs; separately reviewed extended horizons cannot overwrite original pass/fail. Every unqualified budget/coverage shortfall links the owned hold with owner, affected cells, budget/evidence, exit/revisit condition and deadline. Expiry is reassessment only.

## Version and cost classification

Every prospective contract version requires a cumulative changed-obligation/compatibility row and adopter evidence. Track qualification-budget holds separately from original-envelope failures; C_qual-only failure starts with plan/baseline triage. No expensive matrix or benchmark-window assumption grants T4 or scientific-exhaustion status. Qualification and migration remain pending.

## Human review design scope

Current scope requires project-owned persistence, automatic comment-to-effect feedback and nonblocking human input. Qualify the closed feedback loop using project-owned records and an optional [Lark goal Doc](../261105-1621-plan-lark-research-review-and-sharing.md) with existing Feishu conversation/attention routes once target/bot access is reviewed. Derived visual snapshots and a dedicated shared review Session are optional proposals; no board/server/database or new M1–M6 release requirement has been introduced. M0 is drafted for review, not marked as a deployed capability.

## Property and route accounting

The canonical contract uses category-specific predicates rather than legacy numeric aliases. Record property ID, contract/profile hash, expected predicate, observed trace/witness and scoped qualification result.

| Requirement | Owner | Present state |
|---|---|---|
| PROV-1–3: provenance | M1 bindings; M2 capture; M4 drift/type cases | planned |
| AUTH-1–4: review/admission | M2 guard; M3 review; M4 replay/bounds | planned |
| EXEC-1–4: execution/uncertainty | M2 terminal mapping; M4 timeout/unknown/negative cases | planned |
| STATE-1–3: continuity | M1 authority; M4 recovery; M6 handoff | planned |
| DATA-1–2: protected data | M4 off-mode/disposable cases; M6 enabled-route gate | production confirmation disabled; enabled qualification pending |
| LOOP-1–3: continuation | M2 decisions; M3 activation; M4 revisit/exhaustion cases | planned |
| FB-1–4: collaboration | M3 capture/effect/publication; M4 replay/access cases | planned |
| S1–S8: native routes | M1 capability receipt; M3 effective profile | source routes reviewed; M1 public subset observed; integrated qualification pending |

## Recorded Nov 5 dependencies; refresh capability evidence in M1

- Prototype/current-harness subagent methods differ; exact pairing must be qualified.
- The Nov 5 source audit recorded Node 18 and no pnpm; the checked-out harness needs Node >=24.9.
- Public storage-domain is a candidate for one-record admission, not a verified installed operation on the selected pairing.
- Existing bash defaults can promote timeouts; existing local jobs are not restart-durable.
- Fresh confirmation stays off; legacy ledger history and donor byte-read ordering require separate qualification.
- Active legacy runtime/store/writer inventory has not been collected. The source review did not change campaign authority.
- Model/source configuration and M5 live spending remain unexecuted.

Scientific benchmark attempts: 0. External model-provider calls: 0. GPU collections: 0. Confirmation openings: 0. The documentation baseline was committed locally and M1 package/dependency/fixture implementation performed. Scientific migration, production profile installation and push remain unexecuted. The repository was initialized/published earlier; those actions are not runtime qualification.

## M1 execution checkpoint

See [capability evidence](../review/261111-2124-m1-runtime-capabilities.json). Unchanged prototype checks passed on the alpha pairing; the core package encodes four records and N13–N15 bindings. Native SQLite and real AgentLoop/SubagentRuntime fixtures use synthetic project authority and scripted answers. Retain the initial unsupported-depth refusal, subsequent successful checks and original costs. Independent scope/profile review and production launch remain held; fixture results do not qualify all 23 properties or the M5 pilot.

## M2 execution checkpoint

The [M2 receipt](../review/261111-2142-m2-package-receipt.json) records package 0.1.1, exact native tool/role restrictions and model-driven CPU execution, coupled admission/settlement, same-byte capture/verifier/checkpoint, unavailable-review hold and unknown-launch/reopen behavior, skill loading and an outside-tree tarball consumer. Scripted approval qualifies development plumbing only. No hosted project, protected input, funded model, production service or migration is activated. Native jobs are process-local and uncertain attempts remain held. Full M1/M2 acceptance remains dependent on independent review and scope/profile/Ticket qualification.

## Recording format for execution

For each milestone update, record outcome (passed/failed/deferred/partial), frozen source/profile identity, actual command receipt, expected versus observed behavior, spent/reserved limits, unresolved ownership and next authorized action. Compact package qualification receipts belong in .plan/review/; raw fixture logs may be local. Deliberate scientific plans/compact evidence stay versioned in P and explorative detail/large outputs use ignored P artifacts; this tracker records curated milestone status and immutable references. Include plan/architecture identity, permitted export/access status, integration verification and applicable migration continuity. Keep a duplicate/replayed action tied to its original attempt. Preserve failure evidence and remaining capability limits.

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

## README and implementation tracking request, verbatim

~~~text
given that local_artifacts is git ignored, it's not appropirate to refer those in the README.md
also remove the status of plans and next work from README.md to its own tracker.
use .plan/tracker/ for M1-M6 impl status tracking.
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
| r8 | 2026-11-11 16:04 -0800 | Aligned with 1616/1621/1705/1452: ignored detailed planning and receipts, frozen identity, accessible team exports, focused integration and bounded architecture revision/migration; preserved prompts/history and pending runtime gates. |
| r9 | 2026-11-11 16:14 -0800 | Distinguished deliberate scoped/versioned plans from explorative retained detail; restored package-owned compact qualification receipts and purposeful project migration/pilot plans without changing scientific authority or execution status. |
| r10 | 2026-11-11 16:36 -0800 | Adopted 1604's package-architecture scope, T1–T4 evidence gate and maintainer/reviewer ownership; kept routine project triage, scientific autonomy and deployment qualification separate. |
| r11 | 2026-11-11 17:07 -0800 | Linked canonical research-loop contract 1.0.0, pinned stage/invariant/trace semantics and retained prospective runtime qualification and project authority. |
| r12 | 2026-11-11 17:44 -0800 | Adopted contract 2.0.0 category-scoped predicates/counterexamples in current conformance and audit references; preserved historical source numbering and evidence without canonical aliases. |
| r13 | 2026-11-11 18:12 -0800 | Adopted human-review contract 2.1.0 clarifications in current references/qualification plans; retained pending runtime guarantees and historical bindings. |
| r14 | 2026-11-11 19:01:22 -0800 | Adopted contract 2.2.0 applicability/coverage clarification and review-r5 residual closure; retained prospective provider qualification and historical evidence. |
| r15 | 2026-11-11 20:22:19 -0800 | Adopted 2.3.0 obligation/compatibility and qualification-budget/T4 accounting references without executing runtime changes. |
| r16 | 2026-11-11 20:31:48 -0800 | Adopted 2.3.1 accepted-envelope amortization, owned qualification holds and explicit T4 C_run/C_qual evidence without runtime activation. |
| r17 | 2026-11-11 21:13:38 -0800 | Adopted cumulative 2.3.2 compatibility assessment and explicit qualification-budget/envelope arbitration without runtime execution. |
| r18 | 2026-11-11 21:39:00 -0800  | Recorded local documentation commit, M1 encoding/N13–N15 bindings and bounded public-runtime observations; kept independent review, integrated admission and all M2–M6/live gates pending. |
| r19 | 2026-11-11 22:08:03 -0800 | Recorded M2 guarded native and packed consumer development evidence, skill/hold behavior and exact package pins; kept independent M1/M2 acceptance and M3–M6 pending. |
| r20 | 2026-11-11 22:39:31 -0800 | Made .plan/tracker/ canonical for M1–M6 implementation status and next work, removed the stale README duplicate, retained qualification evidence/gates and recorded the user request verbatim; implementation outcomes unchanged. |
| r21 | 2026-11-11 23:30:50 -0800 | Recorded automatic M3 native workflow and scoped M4 audit/drill evidence; made concrete M5/M6 project prerequisites explicit, preserved all qualification gaps and delegated plan status to this tracker. |
| r22 | 2026-11-12 00:12:40 -0800 | Relocated helper package to helpers; recorded 0.1.3 continuity checks/native recovery, concrete project-owned M5/M6 preparation and remaining qualified-route/budget/authority/access gates. |
| r23 | 2026-11-12 00:31:07 -0800 | Corrected Accorde M5 to GPU, withdrew CPU-only project code/budget/status claims, and retained helper/storage observations and GPU/legacy adoption gates. |
