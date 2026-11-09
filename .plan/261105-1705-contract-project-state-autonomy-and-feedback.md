# Contract — Project-owned persistent state, autonomy and feedback

Created: 2026-11-05 17:05:50 -0800. Updated: 2026-11-05 17:18:37 -0800. Revision: r3. Status: design/implementation plan; no runtime or cloud action executed.

The hosted project owns its research record and persistent state. For Accorde, that workspace is /home/cliu/wk/accorde. dsh-research supplies reusable schemas, procedures and thin adapters; it owns no per-project runtime database, feedback queue, budget, candidate inventory or decision history. Its own package-development plans/test receipts can stay here.

This contract supersedes earlier package-root research paths and routine human launch/review gates in the M0–M6 drafts. It governs new integration design; active legacy scientific authority is not moved or reset by this document.

## Responsibility / owner / persistent location

P means the explicitly configured canonical project_root, not the current worker directory or a fresh worktree. The locations below are target paths for a qualified new route; existing active campaign paths stay authoritative until reconciled.

| Responsibility / persistent content | Logical owner / writer | Location for Accorde | Authority / reuse |
|---|---|---|---|
| Reusable skills, schemas, reducers and adapters | dsh-research maintainers | dsh-research/src, skills, tests, reusable config examples | Code and its own engineering history only |
| Goal, original prompts, scope, standing authority and acceptance criteria | Accorde research agent under project policy | accorde/.autoresearch/project.json and program.md; project .plan/ documents | Existing project policy; executable contracts are frozen locally |
| Research plans, trackers and scientific decisions | Accorde research agent; humans may steer | accorde/.plan/YYMMDD-HHMM-*.md and .plan/trackers/ | Project-owned durable rationale; links to immutable checkpoints |
| Aggregate charges, attempts, action/review consumption, feedback queue/cursors/dispositions and publication associations | Single Accorde research writer using existing DSH storage | accorde/.autoresearch/dsh/state.sqlite3 | Existing storage-sqlite provider, one coupled project record; no package DB |
| Frozen manifests, outputs, verifier/review receipts and checkpoint/decision snapshots | Accorde author/reviewer through existing execution/artifact tools | accorde/local_artifacts/autoresearch/dsh/<goal>/ | Hash-bound immutable artifacts; compact release reports may use accorde/reports/ |
| Original comment/reply bodies and their assessed versions | Accorde feedback consumer / author | Same project artifact root, feedback/<source-key>/<body-hash>.json | Capture before assessment; disposition/effect association in project record |
| Lark Doc IDs, block IDs, last published checkpoint, operation key and delivery state | Accorde publisher | Project config plus coupled project state record | Existing CLI operations; no global Doc mapping in dsh-research |
| Tickets, source cursors, runtime effects/outbox, worker-directory ownership | Existing superagent runtime for Accorde | accorde/.autoresearch/dsh/superagent/orchestrator.sqlite and its stateDir | Native runtime persistence/lock; no scientific authority duplicated here |
| Author/reviewer Session logs, continuations and optional Agent Team tasks | Existing DSH Session provider for Accorde | accorde/.autoresearch/dsh/sessions/ | Configure session-persistence-jsonl root inside P |
| Resolved profile/prompt/provider/package pins and restart recipes | Accorde deployment owner / agent | accorde/.autoresearch/dsh/profile/ and project runtime lock | Reusable templates may come from dsh-research; resolved choices stay in P |
| Live Doc presentation, native comments and discussion | Team on Lark/Feishu | Lark/Wiki/Drive and existing chat threads | External collaboration source; captured feedback, decisions and published snapshots are retained in P |
| Confirmation exposure | Existing project-wide exposure authority | Legacy: ~/.local/state/autoresearch/confirmation/accorde-ppp.sqlite3; target after handoff: accorde/.autoresearch/confirmation/accorde-ppp.sqlite3 | Preserve every opening and one writer; no empty replacement |
| Credentials, app secrets and host installation/cache | Operator / native provider | Existing protected credential/profile facilities | External references only in P; secrets are not copied into research artifacts |
| Synthetic package test state | Test harness | Disposable temporary fixture root | Not a live project authority; removable after tests |

Public source supports placement: storage-sqlite Config.path, session-persistence-jsonl Config.root, and superagent Config.stateDir. Their actual consumer/version compatibility is still an M1 qualification task. The coupled scientific record and native operational store serve distinct responsibilities; the latter never refunds budget or grants scientific acceptance.

For an active legacy H3 loop, the existing program refers to local_artifacts/autoresearch/h3-autonomous-loop-v1/state.json and linked campaign stores. Keep that authority/pins until a verified handoff. Creating the target SQLite path is not an import and must not initialize a fresh budget against existing work.

## Scope and zero package-owned research state

Every operation resolves project_id, canonical project_root, goal/revision and the existing authority before reading or mutating research state. Worktree changes and Session restarts keep that root. A cloned checkout cannot reset charges, consumed actions or confirmation history.

All per-project output paths must be under P, except explicitly recorded legacy/external authorities during transition. Refuse implicit cwd/DSH_HOME/package-root defaults for scientific state. The shared package holds only code and disposable process-local data; source/transport handles are recreated from project config. Restoring Accorde's research history never requires a dsh-research-owned SQLite file.

Self-contained means the project has the goal, exact methods, decisions, consumed costs/exposures and evidence required to inspect/reconstruct its research record. External collaboration services and tooling dependencies remain available by pinned references; their content is not the sole surviving decision/evidence copy.

## Autonomous continuation and human steering

The research agent executes, checks evidence, obtains separate agent technical review, diagnoses failures, changes hypotheses, chooses alternatives and freezes successors automatically inside the standing project scope/resource policy. Human comments and review attendance are optional and nonblocking. No routine iteration, campaign transition, technical reviewer result or publication step waits for a human approval.

A campaign ending, a negative result or one rejected direction is a checkpoint. First try an evidence-backed orthogonal alternative. If none is currently viable, perform a materially different rebrainstorm using actual evidence/context changes; do not repeat an unchanged slate. Ask for human scientific steering only when the scientific direction/authorized objective is exhausted after that assessment.

Scientific exhaustion records the tested/rejected paths, why remaining alternatives cannot answer the objective, what context/label source/method/objective would unblock it, and the precise scientific choice needed. A separately launched reviewer challenges the exhaustion claim before the agent raises one existing human_action.

A fulfilled goal terminates normally without asking for a new direction. Human stop is always respected. A real hard limit, unresolved process, unavailable permission or unsafe state may hold its dependent action; it is an operational/external wait, not evidence of scientific exhaustion and not a routine human approval gate. Automatically repair/reconcile/retry when a qualified route or already granted recovery policy permits it; continue unrelated admissible work.

Accorde's current program records a standing procedural-recovery policy: bind the invalid checkpoint, deterministic fix, unchanged scope, complete fresh recovery cost, exact permitted budget shortfall and at most one replacement. Preserve that policy rather than adding a human confirmation. This does not grant arbitrary budget/scope expansion. A limit without standing coverage cannot be overrun; record the unmet condition and resume automatically when it changes.

## Closed feedback loop

~~~mermaid
flowchart LR
  C["Project checkpoint and result"] --> V["Published Doc or brief"]
  V -. optional team feedback .-> F["Existing CLI/source reader"]
  F --> Q["Project-local captured feedback queue"]
  Q --> A["Author assesses at safe checkpoint"]
  A --> D["Project disposition and next-action link"]
  D --> R["Separate agent review and admission"]
  R --> N["Next execution or autonomous pivot"]
  N --> C
  D --> U["Reply with reason and effect status"]
  U --> V
~~~

The value is comment-to-effect traceability. Collection alone is not adoption, and an adopted suggestion is not yet an executed change. Each feedback item has source/actor, document/comment/reply IDs, captured version/body hash, referenced goal/checkpoint, disposition, reason and successor/effect references.

- adopted: a project decision creates a changed plan/action; technical review and bounded admission happen automatically; the subsequent receipt establishes executed/failed/pending effect.
- rejected: preserve the evidence-backed reason, scope issue or conflicting prerequisite.
- deferred: name the condition/checkpoint that will trigger reassessment; evaluate it automatically when context changes.
- stale/superseded: preserve the old version and assess the current/relevant subject; never transfer stale approval.

Use existing Feishu intake, DSH scheduled follow-ups/jobs and lark-cli Docs/comment reads. On a linked chat event or configured scheduled read, capture new/edited comments, queue them durably and wake the existing author. At unit/checkpoint boundaries the author drains the queue, records dispositions, updates the project plan and publishes a response/effect link. Routine execution never waits for a comment to arrive.

For a small Doc set, complete paginated scans or a verified incremental query are sufficient. Advance the capture cursor only after a complete scan and durable queue commit. A duplicate key/version is a no-op; an edited body is a new assessed version. Scientific action identity derives from the project/checkpoint/frozen method/evidence, not a new comment, Ticket or Doc ID; repeated advice cannot mint another unchanged experiment. A lost wakeup is recovered by loading pending project feedback. Publication failure leaves the local decision intact and retries only publication.

Advisory Doc comments influence autonomous scientific judgment; they do not waive validity/budget/exposure checks. Authenticated goal changes/stop use the existing authorized source route. Do not require a teammate to retype ordinary comments in chat merely for them to be assessed.

## Required proof

Qualification must demonstrate: a received suggestion changes or is rejected by a project decision; an adopted change appears in the next frozen action and actual result; its outcome returns to the human surface; duplicate/edit/restart cases are handled; no human response blocks the normal cycle; operational failure does not become false scientific exhaustion.

Test cross-project roots/worktrees, preservation of aggregate costs, clone/rename resistance, unavailable Docs with continued autonomous work, and reconstruction using only the hosted project record. Lark organization is optional presentation; this feedback proof is the essential capability.

The [Accorde integration plan](../../accorde/.plan/261105-1705-plan-dsh-research-project-integration.md) and its project-local pilot own the concrete project implementation/evidence. Package milestones reference this contract and own only reusable code qualification.

## Retention and final document checks

Track plans, pins, resolved non-secret configuration and compact released reports according to project policy. Keep runtime databases, Session logs, raw/sensitive snapshots and large evidence ignored inside the project workspace and use supported backup/export procedures. Project-local placement does not require committing raw state or cloning credentials.

The [project-local validation receipt](../../accorde/.plan/receipts/261105-1718-project-state-feedback-document-validation.json) records document ownership/links/prompt/history checks. [Mermaid grammar validation](../../accorde/.plan/receipts/261105-1714-project-state-feedback-mermaid-validation.json) passed for the revised figures. Runtime/provider/feedback-effect qualification remains pending; no active state, ledger, source code or cloud data was changed.

## User Prompt, Verbatim

~~~text
I think the project related artifacts and decision should stay in the project workspace (i.e. accorde/), so it's self-contained, try to minimize the states stored in the dsh-research. Please confirm that, and be explicit about Responsibility/Owner/Location of Persistent State.
"organized live Lark Docs" is not convincing. I don't see the feedback loop.
Also please confirm that for most execution and iterations, human intervention is not required, nor blocking. Human input is required only when the direction is "scientifically exhausted".
~~~

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-05 17:05:50 -0800 | Recorded explicit logical owners/locations, zero package-owned research state, autonomous iteration/scientific exhaustion policy and the comment-to-decision-to-effect feedback contract. |
| r2 | 2026-11-05 17:15:48 -0800 | Bound scientific action identity independently of transport/comment IDs so repeated feedback cannot mint another unchanged experiment; retained project ownership and original prompt. |
| r3 | 2026-11-05 17:18:37 -0800 | Recorded project-local retention and document/diagram validation; all runtime/feedback-effect implementation and authority migration remain pending. |
