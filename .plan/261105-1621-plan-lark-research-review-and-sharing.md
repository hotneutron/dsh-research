# Proposal — Project-owned feedback loop with Lark review views

Created: 2026-11-05 16:21:35 -0800. Updated: 2026-11-11 17:44 -0800. Revision: r6. Status: revised design; implementation and project authority migration pending.

Lark Docs is an optional feedback source and human-readable projection of project-owned research. Its organization alone provides little value; acceptance requires a complete comment-to-decision-to-action-to-effect-to-response loop.

The [project-state/autonomy/feedback contract](261105-1705-contract-project-state-autonomy-and-feedback.md) owns persistence and escalation policy. The `Accorde integration plan` (project-owned input pending; source reference `../../accorde/.plan/261105-1705-plan-dsh-research-project-integration.md`) owns the concrete project implementation/evidence. dsh-research supplies reusable procedures, not Doc mappings, goal decisions or feedback storage.

## Responsibility / owner / persistent location

| Item | Owner | Location |
|---|---|---|
| Reusable reader/renderer/procedure | Shared package maintainers | dsh-research code/skills and disposable tests |
| Goal Doc token, block/revision IDs, capture cursor and publication operation key | Hosted-project publisher/consumer | Project config and P/.autoresearch/dsh/state.sqlite3 or reconciled existing authority |
| Original comment/reply body, actor/ID and version/hash | Project feedback consumer | P/local_artifacts/autoresearch/dsh/<goal>/feedback/ |
| Assessed disposition, rationale and successor/effect association | Project author under standing policy | Coupled project record and immutable project decision/checkpoint snapshots |
| Frozen method/result/agent-review evidence | Project author/reviewer | Project artifact root and .plan/ decision reports |
| Live Doc presentation/native collaboration | Team on Lark | External view/source; all material decisions and captured feedback/effects retained locally |

P is the canonical project root. Worktree/cwd/profile changes cannot create a second feedback queue, budget or opening authority. The same existing storage root/persistence decisions apply across all project campaigns.

## Exact feedback loop

The [research-loop contract](../docs/contracts.md) specifies F1 capture, F2 assessment/action/effect and F3 publication/reply, alongside the category-scoped property IDs and L0–L8. Capture the contract/profile binding and actual source/queue/publication associations in project records. Partial scans, lost wakeups and publication retries must remain truthful trace facts, not synthesized progress. Native integration qualification remains pending.


~~~mermaid
flowchart LR
  E["Project result and checkpoint"] --> D["Publish brief and evidence links"]
  D -. optional new or edited comment .-> I["Existing CLI/source/scheduled read"]
  I --> C["Capture version and queue in project"]
  C --> A["Author assesses at safe boundary"]
  A --> P["Record adopted, rejected, deferred or stale"]
  P --> R["Agent review of adopted successor"]
  R --> X["Bounded next action and actual receipt"]
  X --> E
  P --> S["Response with reason and effect status"]
  X --> S
  S --> D
~~~

The reader runs on an explicit linked source event or an existing DSH scheduled follow-up. It retrieves configured Doc/comment sources through the current bot CLI, completes pagination/incremental validation, stores original versioned bytes and queues feedback before advancing the cursor. Its normal completion/input wakes the existing worker; after restart pending project feedback is loaded again.

The author consumes material feedback at complete-unit/idle/checkpoint boundaries, preserving a currently frozen unit's integrity. It assesses relevance and evidence, chooses a disposition, records a concise reason and updates the next plan. Separate agent review and admission happen automatically. No commenter needs to repeat ordinary feedback in chat; no human response is awaited.

## What proves the loop worked

Illustrative suggestion: “Show the family failure breakdown before selecting a model.”

| Stage | Required project record |
|---|---|
| Received | Doc/comment/reply IDs, actor, captured version/body hash, target checkpoint |
| Assessed | Relevance/evidence check; adopted/rejected/deferred/stale with rationale |
| Adopted | New project decision and exact changed frozen action/report/evaluator |
| Reviewed | Separate agent review bound to that subject/action |
| Effect | Actual execution/report receipt, or explicit failed/pending status |
| Responded | Doc/reply links the decision, effect and evidence; local publication status retained |

A read receipt or resolved comment is not adoption. “Adopted” does not imply the change ran. The response must distinguish decision, implementation and observed outcome. A rejected/deferred suggestion also gets a reason and a reassessment condition rather than disappearing.

## Autonomy and human input

Most execution/iterations, technical review, diagnosis, recovery, plan revision and alternative selection are autonomous within project standing scope/resource policy. Feedback is optional and nonblocking; the normal loop continues while no comment exists, while a comment remains temporarily unavailable, or while publishing a response fails.

Authentic stop/new-goal input uses the existing authorized source path. Advisory comments do not grant private data access, budget expansion or validity overrides. Required human scientific steering occurs after reviewed scoped scientific exhaustion and a materially different rebrainstorm fails to find an admissible route. A fulfilled objective ends normally.

Hard guard/resource/permission/unknown-process conditions can mechanically hold their dependent action. The agent automatically repairs/reconciles or uses already granted bounded recovery when possible; an uncovered cap is not overrun and is not called scientific exhaustion. The project holds the remaining condition and resumes on an external-state change.

The prototype maps blocked/failed/ready questions to human stages. The research procedure must report ordinary checkpoints and correctable failure as progress/continuation, or external waiting with an existing wakeup and no question. It must not convert a negative metric, missing Doc response or agent reviewer request_changes into a person-stage approval gate.

## Source reuse and current limits

Existing source already provides a bot-only CLI wrapper and docs/wiki/drive discovery. Inspected lark-cli 1.0.93 offers fetch/update with block scope and revision ID, history, comments/replies, media, Wiki hierarchy and Mermaid whiteboard updates. Native provider path controls can keep all integration state in the hosted project.

These are source/command capabilities. Bot access to selected Docs and end-to-end scheduled feedback delivery have not been demonstrated. The current Feishu source receives chat messages; it is not an automatically qualified Doc-comment source. Add a thin existing-scheduler/worker procedure, not a new daemon, database or communications bus.

Use complete paginated scans for a small bounded Doc set or a verified incremental query. Mark unavailable/incomplete scans honestly and advance no watermark. Identical source ID/version/body hash is a no-op; an edited body is captured as a new version. Preserve older decisions and re-evaluate applicable context, never silently reuse a stale authorization.

~~~mermaid
sequenceDiagram
  participant R as Existing reader
  participant D as Doc comments
  participant P as Project persistent record
  participant A as Existing author
  R->>D: Read complete bounded scan
  D-->>R: Comment versions and pagination result
  R->>P: Capture and queue before cursor advance
  P-->>R: Durable
  R-->>A: Existing scheduled/source completion
  Note over R,A: If wakeup is lost, pending queue is loaded on resume
  A->>P: Record exact disposition and successor reference
  A->>P: Record actual effect independently of publication
~~~

## Publication and collaboration

Keep a short goal brief with evidence/counterevidence, next automatic action, remaining limits and latest checkpoint. A small research home/index and goal pages help navigation; add more pages/figures only when needed. State “no human input required” in the normal brief, and show the concrete exhaustion/unblock question only when raised.

Human-owned notes/comments and agent-owned summary regions must be distinguished. Use observed revision/block IDs, narrow patch, refetch and check warnings/partial_success. Preserve old comment-bearing blocks when retention cannot be verified. Source body changes are captured locally before scientific assessment. Native Doc history aids collaboration; frozen project evidence/action identity remains authoritative.

~~~mermaid
flowchart TD
  P["Publish project checkpoint K"] --> A{"Known Doc and operation association?"}
  A -- Yes --> V["Read and verify same published K"]
  A -- No or unknown --> R["Fetch target revision and K marker"]
  R --> W["Narrow patch or reconcile existing publication"]
  W --> F{"Refetch complete expected content?"}
  F -- Yes --> S["Store actual Doc revision/status in project"]
  F -- No --> H["Keep publication partial/pending"]
  H --> R
~~~

A Doc update/create and local association are not one transaction. Reconcile uncertain response by reading the known target/parent and stable checkpoint marker before another append/create. A publication failure retries publication only and never resets a scientific action or budget.

All chart/evidence links must be remotely accessible to the intended audience, and their actual released bytes remain under P. Session exports contain presented path declarations, so a portable project release includes the necessary artifact bytes. Cloud permissions and credentials stay in their native protected facilities; project config stores references.

## Required qualification before recommending the surface

Use a real or scripted comment on released/disposable review content. Demonstrate complete capture, local assessment, changed frozen successor if adopted, automatic agent review, actual effect, and a response linking that result. Include rejection/defer, duplicate/edit/restart, unavailable Docs, partial publication and zero comments; normal admissible research must continue with no required human answer.

The first implementation goal is feedback closure and project ownership. Attractive page organization or successful publication alone does not pass. Live cloud writes remain outside this documentation task.

## Earlier User Prompts and Quoted Examples, Verbatim

Retained as history; current project ownership/autonomy semantics above take precedence.

~~~text
create m0 to give a overview of the architecture, workflows with examples, idempotency considerations, with enough mermaid figures to help me understand, 
Let's also brainstorm a more human effective and human labor efficient way to review the progress of the research, and current artifacts, and how to visualize, and how to share/collab with team members, try to reuse dsh/superagent as much as possible.
~~~

~~~text
if dsh-superagent already integrated lark/feishu, live (organized) lark docs might be a good candidate for sharing/reviewing
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
| r1 | 2026-11-05 16:21:35 -0800 | Proposed organized live Lark Docs as the team-facing review surface over existing bot CLI, Feishu routing and frozen evidence; specified hierarchy, comments/decisions, revision-aware updates, publication deduplication, native figures and a bounded qualification trial. CLI/skill inspection only; no cloud write. |
| r2 | 2026-11-05 16:26:56 -0800 | Renamed 20261105-plan-lark-research-review-and-sharing.md to 261105-1621-plan-lark-research-review-and-sharing.md using YYMMDD-HHMM; updated 2 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
| r3 | 2026-11-05 16:28:21 -0800 | Corrected 3 Mermaid message/label semicolons to commas after parser validation; workflow meaning and verbatim user prompts retained. Diagram syntax verification rerun. |
| r4 | 2026-11-05 17:09:58 -0800 | Replaced presentation-first review with automatic project capture, assessment, disposition, successor/effect proof and response; removed routine human gates and package-owned Doc/feedback state. |
| r5 | 2026-11-11 17:10 -0800 | Linked canonical research-loop contract 1.0.0, pinned stage/invariant/trace semantics and retained prospective runtime qualification and project authority; marked unavailable external project references honestly. |
| r6 | 2026-11-11 17:44 -0800 | Adopted contract 2.0.0 category-scoped predicates/counterexamples in current conformance and audit references; preserved historical source numbering and evidence without canonical aliases. |
