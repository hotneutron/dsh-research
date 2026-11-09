# M0 — Project-owned architecture, autonomous workflows and feedback

Created: 2026-11-05 16:16:16 -0800. Updated: 2026-11-05 17:09:58 -0800. Revision: r6. Status: revised design; implementation and project authority migration pending.

The hosted project owns its science and persistent state. dsh-research supplies reusable skills, schemas and thin adapters with no per-project runtime database. For Accorde, canonical project_root is /home/cliu/wk/accorde even when a worker uses another worktree.

Most execution, technical review, diagnosis, alternative selection and iteration are autonomous inside standing project scope/resource policy. Human feedback is optional and nonblocking. Required human scientific steering follows a challenged scientific-exhaustion assessment; ordinary trial/campaign failure does not trigger it.

The [state/autonomy/feedback contract](261105-1705-contract-project-state-autonomy-and-feedback.md) is the exact responsibility/location authority. [Accorde's integration plan](../../accorde/.plan/261105-1705-plan-dsh-research-project-integration.md) owns its concrete project adoption and evidence. This is a design, not a claim that the new runtime is deployed.

## Architecture: reusable code, project-owned research

~~~mermaid
flowchart TB
  C["dsh-research: reusable code and procedures"] --> A["Research author in hosted project"]
  subgraph P["Accorde workspace: canonical project root"]
    G["Goal, policy and frozen plans"] --> A
    A --> S["Project scientific state and decisions"]
    A --> E["Frozen project evidence and feedback snapshots"]
    A --> R["Separate agent reviewer"]
    R --> S
    A --> H["Existing DSH and superagent, configured under project"]
    H --> J["Existing evaluator and bounded jobs"]
    J --> E
    E --> A
  end
  A --> D["Optional Lark Doc projection and replies"]
  D -. optional comments .-> F["Existing source or scheduled reader"]
  F --> E
~~~

Figure: package code supplies behavior; project configuration and records supply authority. There is no scientific DB or goal registry inside the package checkout.

## Responsibility / owner / location of persistent state

P is the canonical hosted project, not cwd. These are target paths for the qualified route; the existing legacy authority remains until reconciled.

| Responsibility / state | Owner | Persistent location |
|---|---|---|
| Reusable helper/skill implementation and its own code-qualification receipts | dsh-research maintainers | dsh-research/src, skills, tests, its package-development .plan/ |
| Goal, original request, standing scope/recovery policy and scientific plans | Hosted project research agent | P/.autoresearch/project.json, program.md, P/.plan/ and trackers |
| Coupled aggregate charges, actions/reviews consumed, feedback queue/dispositions/cursors and publication mappings | One hosted-project writer via existing DSH storage | P/.autoresearch/dsh/state.sqlite3, or active legacy authority until handoff |
| Frozen action/result/reviewer/decision/checkpoint/comment snapshots | Project author/reviewer/feedback consumer | P/local_artifacts/autoresearch/dsh/<goal>/ |
| Tickets, source cursors, effects/outbox and runtime ownership | Existing superagent | P/.autoresearch/dsh/superagent/orchestrator.sqlite with native stateDir lock |
| Author/reviewer Session logs and optional Agent Team tasks | Existing DSH persistence | P/.autoresearch/dsh/sessions/ |
| Effective profile/prompts/provider/package pins | Project deployment owner/agent | P/.autoresearch/dsh/profile/ and project runtime locks |
| Live Doc/comment/thread source | Team on Lark/Feishu | External collaboration service; project captures preserve research decisions and effect history |
| Confirmation openings | Existing project-wide exposure authority | Legacy external path retained; target P/.autoresearch/confirmation/ after verified handoff |
| Credentials and installation/cache | Operator/native facilities | Existing protected external configuration; project stores references, not secrets |

Accorde's legacy ledger is ~/.local/state/autoresearch/confirmation/accorde-ppp.sqlite3. Its continuity is a declared migration exception, not permission to initialize a blank local ledger. Active campaign pins/charges/openings are not changed here.

~~~mermaid
flowchart LR
  P["Explicit canonical project_root"] --> A["Project plans and policy"]
  P --> S["Existing storage-sqlite Config.path"]
  P --> L["Existing Session persistence Config.root"]
  P --> O["Existing superagent Config.stateDir"]
  S --> B["Coupled project scientific record"]
  L --> T["Session and agent-review history"]
  O --> R["Tickets, outbox and operational ownership"]
  P --> E["Frozen project artifacts"]
~~~

Figure: the native providers already expose placement controls. M1 must qualify actual version compatibility and one-writer operation; a root change cannot reset scientific history.

## Autonomous outer loop

~~~mermaid
flowchart LR
  G["Goal and standing authority"] --> P["Evidence-backed hypothesis and bounded plan"]
  P --> R["Automatic separate agent technical review"]
  R --> A["Project admission and reservation"]
  A --> X["Existing bounded execution"]
  X --> E["Validate actual terminal evidence"]
  E --> C["Project checkpoint and interpretation"]
  C --> N{"Admissible next scientific step?"}
  N -- Yes --> P
  N -- Goal fulfilled --> D["Complete without a direction question"]
  N -- Current path exhausted --> B["Autonomous orthogonal rebrainstorm"]
  B -- Viable route found --> P
  B -- No viable scientific route remains --> H["Reviewed scoped exhaustion, ask human steering"]
~~~

Figure: people do not sit in the normal iteration path. Rejected technical review is addressed by the author; it is not a request for human approval.

A valid negative result is useful evidence for another hypothesis. Invalid output triggers diagnosis/recovery while preserving invalidity/cost. A failed campaign ends one frozen design, not the authorized research run. Missing feedback or a stale Doc does not block the next admissible action.

## Closed feedback loop: comment to measured effect

~~~mermaid
sequenceDiagram
  participant T as Optional teammate
  participant D as Doc or existing source
  participant F as Existing scheduled/source reader
  participant P as Project snapshots and state
  participant A as Research author
  participant R as Agent reviewer
  T->>D: Comment on checkpoint or evidence
  F->>D: Read new or edited comments
  F->>P: Capture exact source version and queue
  F-->>A: Existing completion/input wakeup
  A->>P: Assess at safe boundary, record disposition
  A->>R: Exact revised successor if adopted
  R-->>A: Agent review result
  A->>P: Admit and execute through existing job route
  A->>P: Record actual effect and next checkpoint
  A->>D: Reply with decision, effect and evidence links
  Note over A,R: No comment or human reply is required to continue
~~~

Figure: delivery, assessment, adoption and executed effect remain separate. A Doc is a source/view of this loop, not its authority.

Illustrative feedback: “The pooled metric hides shape-family failures.” The consumer captures source ID/version/hash in the project. The author adopts, rejects or defers with a reason. If adopted, the changed report/evaluator appears in a new frozen action; the actual receipt/plot proves executed/failed/pending effect. The reply links both decision and result. Marking the comment read/resolved does not establish adoption.

~~~mermaid
flowchart LR
  N["Captured version"] --> Q["Queued in project"]
  Q --> A["Assessed at checkpoint"]
  A --> D["Adopted with successor"]
  A --> R["Rejected with evidence"]
  A --> W["Deferred with revisit condition"]
  A --> S["Stale or superseded"]
  D --> E["Executed, failed or pending effect receipt"]
  E --> P["Published response"]
  R --> P
  W --> P
  S --> P
~~~

Figure: disposition-to-effect traceability. Repeated/edited feedback is deduplicated or assessed as a new version. A missed wakeup loads pending project records after restart.

## Idempotency and interrupted execution

The same action cannot consume another slot or reuse a review/opening. All identity, charge and consumption state stays under the canonical project root across worktrees/restarts. Process publication and durable state are not one transaction; an uncertain launch is held for reconciliation.

~~~mermaid
sequenceDiagram
  participant A as Author or resumed worker
  participant S as Project-owned existing storage
  participant J as Existing execution
  A->>S: Commit exact action and charged reservation
  S-->>A: Durable
  A->>J: Publish bounded execution
  Note over A,J: Crash can lose the job association
  A->>S: Repeated request for the same action
  S-->>A: Already consumed, association unresolved
  A->>J: Reconcile actual status without a second launch
  Note over S: Charges and invalid or unknown evidence remain preserved
~~~

Figure: at-most-once known admission with fail-closed uncertainty; no promise of exactly-once process execution.

A duplicate completion keeps the same project attempt/evidence association. A stale review does not cover changed candidate/evidence/action. A Doc publication retry changes no scientific charge. Cloning/renaming a project cannot establish a new empty authority.

## Scientific exhaustion is distinct from operational holds

~~~mermaid
flowchart TD
  C["Checkpoint"] --> V{"Evidence and execution resolved?"}
  V -- No --> O["Autonomous diagnosis or operational hold"]
  V -- Yes --> N{"Scientific alternatives remain?"}
  N -- Yes --> A["Choose and review next action"]
  N -- No known viable path --> B["Orthogonal, evidence-backed rebrainstorm"]
  B --> R{"Viable scientific route found?"}
  R -- Yes --> A
  R -- No --> E["Record scoped exhaustion and unblock conditions"]
  E --> T["Separate agent challenges exhaustion"]
  T --> H["One human scientific steering question"]
  O -. condition repaired within standing policy .-> A
~~~

Figure: a missing permission, unknown job or uncovered hard cap is not a scientific conclusion. It may hold that action until repaired/changed; no routine approval gate is created.

Before escalating, retain tested alternatives, why remaining axes cannot answer the objective with current evidence, and what different label source/method/context/objective would help. Exhaustion is scoped to the authorized scientific question; it does not claim to rule out every future idea. Human stop is respected. A fulfilled goal completes normally.

## Campaign limits do not reset the goal

~~~mermaid
flowchart LR
  U["Four-attempt bounded pilot"] --> C["Campaign terminal checkpoint"]
  C --> G["Assess full goal and aggregate cost"]
  G --> N{"Next step covered by standing policy?"}
  N -- Yes --> P["New frozen campaign, preserved charges"]
  N -- Covered procedural recovery --> R["One exact fresh replacement or shortfall rule"]
  N -- Uncovered resource condition --> W["Operational wait, no cap overrun"]
  N -- Scoped scientific exhaustion --> H["Human direction after agent review"]
~~~

Figure: Accorde's current program already grants bounded procedural recovery. Preserve it rather than asking for routine confirmations or reopening invalid stores.

## Persistent feedback and publication

~~~mermaid
flowchart LR
  D["Lark comment ID and body version"] --> F["Immutable project feedback snapshot"]
  F --> S["Project queue and disposition record"]
  S --> A["Frozen successor action"]
  A --> E["Actual project effect receipt"]
  E --> C["Project checkpoint and brief"]
  C --> L["Lark view and reply"]
  L -. retry or duplicate response .-> S
~~~

Figure: the scientific record remains readable/reconstructable from the project if the shared package's checkout or the Doc view is absent. Publication state is association data in the project record.

The [Accorde sample brief](../../accorde/.plan/examples/261105-1616-research-brief-example.md) and project integration tracker show the intended record. Source-backed provider routes and the full owner/location matrix are in the contract. Current implementation, bot access and active-authority migration remain pending.

## M0 acceptance

M0 explains who owns every persistent item, how an optional comment produces a project decision and effect, why no human waits in routine execution, and when scoped scientific exhaustion raises a question. M1–M6 must implement/test these meanings using existing runtime seams, without a package DB or parallel control plane.

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
| r1 | 2026-11-05 16:16:16 -0800 | Created M0 with eight Mermaid figures, architecture and object maps, four workflow/failure examples, idempotency and uncertainty semantics, milestone relationships and documentation review gate. |
| r2 | 2026-11-05 16:21:35 -0800 | Integrated the user Lark direction with a ninth Mermaid figure and linked the source-checked organized Docs proposal; preserved scientific authority and existing runtime scope. |
| r3 | 2026-11-05 16:26:56 -0800 | Renamed 20261105-m0-architecture-workflows-and-idempotency.md to 261105-1616-m0-architecture-workflows-and-idempotency.md using YYMMDD-HHMM; updated 9 local links. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
| r4 | 2026-11-05 16:28:21 -0800 | Corrected 7 Mermaid message/label semicolons to commas after parser validation; workflow meaning and verbatim user prompts retained. Diagram syntax verification rerun. |
| r5 | 2026-11-05 17:05:50 -0800 | Updated live references after moving the project-specific brief into Accorde; original quoted requests/history retained. |
| r6 | 2026-11-05 17:09:58 -0800 | Reworked the architecture around explicit project-owned persistent locations, zero package research state, closed feedback effects and autonomous review/iteration; retained nine explanatory Mermaid figures and prior prompts/history. |
