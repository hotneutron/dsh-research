# Dist-exec drop matrix: can I drop this?

Created: 2026-11-03 16:49 -0800. Updated: 2026-11-05 16:26:56 -0800. Revision: r2. Status: exhaustive source-level disposition, not code deletion or implementation.

Canonical scope: [minimal dsh-research plan, r7](261103-1230-plan-dsh-research-plugin-rebuild.md). This matrix replaces dist-exec/full-stack parity with **reuse of dsh-superagent plus small research policy/evidence guards**. Review-board revamp is omitted from current planning.

## 1. Answer and audit boundary

**Yes: drop every full-file port obligation in the dist-exec delta.** Not every scientific property is disposable. The distinction is:

- **YES** — omit duplicate implementation or archive-only material; configure/reuse the existing runtime instead.
- **YES/BUT** — omit the full implementation, retain the small scientific property named in the row. This does not mean port the file under a new language/name.
- **DEFER** — omit from the initial core; consider only after a separately justified need.

“Drop” does **not** mean delete historical artifacts, erase spent cost/exposure, abandon active runtime locks or retire an unreconciled campaign. All paths below resolve under `/home/cliu/wk/autoresearch`; source links point to that checkout and quoted ranges refer to the audited HEAD.

| Audit field | Value |
|---|---|
| Branch | `dist-exec` |
| Base | `33ef750face59b42f9663c8e355a77600d1765e7` |
| Head | `ead1ae507934a6da5e914a2559d6fcac99c505c4` |
| Delta | 2 commits; **65 paths = 60 added + 5 modified** |
| Coverage | **65/65 changed paths**, plus five requested unchanged legacy modules and two supporting unchanged review helpers |
| Inventory | [branch-inventory.json](../../accorde/local_artifacts/autoresearch/dist-exec-drop-audit/20261103-1637/branch-inventory.json) |
| Audit method | Every added implementation module read; disposition is not inferred only from filenames. Reusable superagent routes audited separately in the linked plan. |
| Verification limit | Source/design audit. No new framework deployment, remote execution, service installation or dsh-research implementation certified. |

S1–S8 and P01–P08 refer to the **reuse-route table** and **eight scientific properties** in the canonical plan. M1–M6 are its reduced milestones. Infrastructure responsibilities below are reused where configured, not claims that worker slots equal global job/resource limits or that every remote target is already supported.

## 2. Exhaustive changed-path disposition

### Planning, documentation, deployment and packaging — 19 paths

| Git | Path / source lines | Can I drop this? | Current purpose | What remains / replacement | Route / property |
|---|---|---|---|---|---|
| A | [`.plan/261028-1147-todo-with-priority.md`](../../autoresearch/.plan/261028-1147-todo-with-priority.md), 13–38, 59–73 | **YES** | Safety roadmap | Archive; retain normal-completion validity, not the execution-stack roadmap. | P02 |
| A | [`.plan/261028-1205-host-review-dashboard-over-https-zh.md`](../../autoresearch/.plan/261028-1205-host-review-dashboard-over-https-zh.md), 69–95, 97–202 | **YES** | Chinese distributed/HTTPS architecture | Historical prompts/history only; no architecture parity obligation. | Archive |
| A | [`.plan/261028-1205-host-review-dashboard-over-https.md`](../../autoresearch/.plan/261028-1205-host-review-dashboard-over-https.md), 52–76, 78–178 | **YES** | Coordinator, fleet and anonymous API plan | Archive; candidate/evidence/review identity survives in small packets. | P01/P04 |
| A | [`.plan/261028-1503-fork-feature-adoption-priorities.md`](../../autoresearch/.plan/261028-1503-fork-feature-adoption-priorities.md), 14–30, 76–95 | **YES** | Donor-feature assessment | Reference only, not a feature-completion checklist. | Archive |
| A | [`.plan/261028-1937-p0-p2-implementation-plan.md`](../../autoresearch/.plan/261028-1937-p0-p2-implementation-plan.md), 15–40, 42–69, 163–184 | **YES** | Full distributed implementation plan | Supersede executable scope; no two-host/full-stack gate. | M1–M6 |
| A | [`.plan/trackers/README.md`](../../autoresearch/.plan/trackers/README.md), 16–30 | **YES** | Historical milestone index | Archive evidence; not new-plugin milestones. | Archive |
| A | [`.plan/trackers/m0-contracts-and-correctness.md`](../../autoresearch/.plan/trackers/m0-contracts-and-correctness.md), 17–18, 33–35 | **YES** | Contract/timeout progress | Retain validity property; archive tracker. | P02 |
| A | [`.plan/trackers/m1-qualified-local-execution.md`](../../autoresearch/.plan/trackers/m1-qualified-local-execution.md), 17–19, 34–36 | **YES** | Supervisor/container/resource progress | Existing execution owns operation; no copied supervisor. | S3/S4/S5 |
| A | [`.plan/trackers/m2-global-and-scientific-contracts.md`](../../autoresearch/.plan/trackers/m2-global-and-scientific-contracts.md), 17–23, 38–40 | **YES** | Coordinator/qualification/review/exposure progress | Extract small scientific guards, archive stack milestones. | P01–P06 |
| A | [`.plan/trackers/m3-distributed-reviewed-loop.md`](../../autoresearch/.plan/trackers/m3-distributed-reviewed-loop.md), 17–19, 34–36 | **YES** | Simulated fleet/HTTP/dashboard progress | No fleet or review-board parity. | S1/S2/S7 |
| A | [`.plan/trackers/m4-learning-and-release.md`](../../autoresearch/.plan/trackers/m4-learning-and-release.md), 17–20, 35–37 | **YES** | Learning/delta/migration progress | Optional mechanisms are not core prerequisites. | P07/P08 |
| A | [`.plan/trackers/portable-verification.json`](../../autoresearch/.plan/trackers/portable-verification.json), 1–25, 39–48 | **YES** | Historical portable-test receipt | Archive unchanged; not proof of real deployment or new plugin. | Archive |
| M | [`runtime/README.md`](../../autoresearch/runtime/README.md), 24–38 | **YES** | Distributed CLI documentation | Use standard worker/job/operator route; no unique scientific code. | S1/S4/S8 |
| A | [`runtime/deploy/coordinator.service`](../../autoresearch/runtime/deploy/coordinator.service), 5–12 | **YES** | Custom coordinator service | Reuse superagent deployment; no research daemon. | S3/S8 |
| A | [`runtime/deploy/host-agent.service`](../../autoresearch/runtime/deploy/host-agent.service), 5–10 | **YES** | Custom host daemon | Reuse existing workers/execution route. | S1/S4 |
| A | [`runtime/deploy/nginx-poc.conf`](../../autoresearch/runtime/deploy/nginx-poc.conf), 1–15 | **YES** | Anonymous HTTPS proxy, strips authorization | Do not copy; use configured existing security/source routes. | S2/S8 |
| A | [`runtime/docs/distributed-poc.md`](../../autoresearch/runtime/docs/distributed-poc.md), 35–60, 62–82 | **YES** | POC operations and qualification boundary | Archive provenance/limitations, not this deployment flow. | Archive |
| M | [`runtime/pyproject.toml`](../../autoresearch/runtime/pyproject.toml), 12, 17–31 | **YES** | Version/CLI/fleet packaging | New skill/helper packaging independent of Python runtime. | M2 |
| M | [`runtime/src/autoresearch_runtime/__init__.py`](../../autoresearch/runtime/src/autoresearch_runtime/__init__.py), 4–8 | **YES** | Runtime version bump | No copied compatibility-version obligation. | M2 |

### Implementation and UI — 34 paths

| Git | Path / source lines | Can I drop this? | Current purpose | What remains / replacement | Route / property |
|---|---|---|---|---|---|
| A | [`runtime/src/autoresearch_runtime/artifacts.py`](../../autoresearch/runtime/src/autoresearch_runtime/artifacts.py), 13–79 | **YES/BUT** | Local CAS, index, export/restore | Keep immutable references and verified bytes through existing artifacts; no CAS/SQLite engine. | S6/P03 |
| A | [`runtime/src/autoresearch_runtime/audit.py`](../../autoresearch/runtime/src/autoresearch_runtime/audit.py), 7–53 | **YES** | Messages/replies/events/hash-chain export | Scientific causal references in existing communications/persistence; no message service. | S2/S6 |
| A | [`runtime/src/autoresearch_runtime/capabilities.py`](../../autoresearch/runtime/src/autoresearch_runtime/capabilities.py), 9–19 | **YES** | OS/executable/CPU probes and profile match | Reuse worker configuration/admission; scientific environment identity in manifest. | S1/P01 |
| A | [`runtime/src/autoresearch_runtime/context.py`](../../autoresearch/runtime/src/autoresearch_runtime/context.py), 7–23 | **YES** | Snapshot/event context reconstruction | Existing context delivery plus short scientific gist. | S2/P07 |
| A | [`runtime/src/autoresearch_runtime/contracts.py`](../../autoresearch/runtime/src/autoresearch_runtime/contracts.py), 10–84 | **YES** | Protocol/hash/path/cost helpers | Use standard helpers and tiny scientific schema, not distributed protocol versions. | P01/P03 |
| A | [`runtime/src/autoresearch_runtime/control_plane.py`](../../autoresearch/runtime/src/autoresearch_runtime/control_plane.py), 15–73 | **YES/BUT** | HTTP operation dispatcher | Keep local evidence/review/exposure checks; omit enrollment/claim/start/heartbeat/receipt API. | S1/P03/P04/P06 |
| M | [`runtime/src/autoresearch_runtime/controller.py`](../../autoresearch/runtime/src/autoresearch_runtime/controller.py), 271–277 | **YES/BUT** | Contradictory terminal receipt rejection | Keep fail-closed validity and immutable bytes; no legacy Controller import. | P02/P03 |
| A | [`runtime/src/autoresearch_runtime/costs.py`](../../autoresearch/runtime/src/autoresearch_runtime/costs.py), 6–16 | **YES/BUT** | Complete-route reservation/limit comparison | Keep pre-admission bounds/cost units using authoritative accounting; no second ledger. | S6/P05 |
| A | [`runtime/src/autoresearch_runtime/dist_cli.py`](../../autoresearch/runtime/src/autoresearch_runtime/dist_cli.py), 16–55 | **YES** | Coordinator/agent/status/preflight/backup commands | Standard superagent administration and ordinary job route. | S1/S4/S8 |
| A | [`runtime/src/autoresearch_runtime/executors/__init__.py`](../../autoresearch/runtime/src/autoresearch_runtime/executors/__init__.py), 1–3 | **YES** | Backend export scaffolding | Remove with copied executor layer. | S4 |
| A | [`runtime/src/autoresearch_runtime/executors/container.py`](../../autoresearch/runtime/src/autoresearch_runtime/executors/container.py), 9–45 | **DEFER** | Digest-pinned Docker mounts/limits/GPU selection | Optional existing-executor configuration; qualify real containment only if enabled. | S4/S5 |
| A | [`runtime/src/autoresearch_runtime/executors/direct.py`](../../autoresearch/runtime/src/autoresearch_runtime/executors/direct.py), 5–12 | **YES** | Binding-to-local-command translation | Ordinary job; truthful procedural/non-isolated assurance. | S4 |
| A | [`runtime/src/autoresearch_runtime/experiment_spec.py`](../../autoresearch/runtime/src/autoresearch_runtime/experiment_spec.py), 9–47 | **YES/BUT** | Frozen experiment compiler | Tiny candidate/evaluator/data/purpose manifest, invocation and limits; no phase/DAG framework. | P01/P05 |
| A | [`runtime/src/autoresearch_runtime/failure_index.py`](../../autoresearch/runtime/src/autoresearch_runtime/failure_index.py), 5–12 | **YES/BUT** | Rejected-path revisit policy | Changed assumptions, evidence and scope before scientific revisit; not infrastructure retry. | P07 |
| A | [`runtime/src/autoresearch_runtime/fleet.html`](../../autoresearch/runtime/src/autoresearch_runtime/fleet.html), 6–23 | **YES** | Separate bilingual fleet/review dashboard | Use existing review packets; review-board revamp omitted. | S7/Deferred UI |
| A | [`runtime/src/autoresearch_runtime/global_store.py`](../../autoresearch/runtime/src/autoresearch_runtime/global_store.py), 23–103, 105–199, 201–476 | **YES/BUT** | SQL authority/ownership/budget/review/exposure/import | Narrow scientific admission/exposure records in reused persistence; no leader/grants/scheduler/outbox. | S6/P04/P05/P06/P08 |
| A | [`runtime/src/autoresearch_runtime/hooks.py`](../../autoresearch/runtime/src/autoresearch_runtime/hooks.py), 12–51 | **YES** | Bounded subprocess hooks/cleanup | Existing worker/job supervision; optional outputs advisory, never approval. | S3/S4 |
| A | [`runtime/src/autoresearch_runtime/host_agent.py`](../../autoresearch/runtime/src/autoresearch_runtime/host_agent.py), 15–160 | **YES/BUT** | Enrollment/claim/start/reconcile/result parsing | Only small post-job scientific result adapter; no polling daemon or worker protocol. | S1/S4/P02/P03 |
| A | [`runtime/src/autoresearch_runtime/hosting.py`](../../autoresearch/runtime/src/autoresearch_runtime/hosting.py), 18–144 | **YES** | Anonymous HTTP/CORS/TLS/review/evidence service | Existing channels/review/artifact interfaces; no new mutating web service. | S2/S6/S7/S8 |
| A | [`runtime/src/autoresearch_runtime/metrics.py`](../../autoresearch/runtime/src/autoresearch_runtime/metrics.py), 10–34 | **YES/BUT** | Metric declarations/threshold evaluator | Finite typed fields and meaning/units; existing domain verifier owns comparisons, no DSL. | P03 |
| A | [`runtime/src/autoresearch_runtime/migration.py`](../../autoresearch/runtime/src/autoresearch_runtime/migration.py), 12–56 | **DEFER** | Legacy export/import/recovery catalog | Only justified one-off offline handoff; never forget historical charges/openings. | P08/M6 |
| A | [`runtime/src/autoresearch_runtime/plan_delta.py`](../../autoresearch/runtime/src/autoresearch_runtime/plan_delta.py), 8–69 | **DEFER** | JSON-pointer patch/conditions/Markdown/auto-commit | Core needs new revision, evidence/rationale and invalidated approval, not patch framework. | P04/P07 |
| A | [`runtime/src/autoresearch_runtime/portable_contract.py`](../../autoresearch/runtime/src/autoresearch_runtime/portable_contract.py), 9–59 | **YES/BUT** | Repository refs/peer roots/execution closure | Actual candidate/evaluator/input identity using existing checkout/job route; no host-path protocol. | S4/S5/P01 |
| A | [`runtime/src/autoresearch_runtime/promotion.py`](../../autoresearch/runtime/src/autoresearch_runtime/promotion.py), 9–24 | **YES** | Locked Git frontier/ref writer | Existing workspace/write serialization; integration/publication is not scientific acceptance. | S5/P03 |
| A | [`runtime/src/autoresearch_runtime/qualification.py`](../../autoresearch/runtime/src/autoresearch_runtime/qualification.py), 9–81 | **YES/BUT** | Replicate/bootstrap/control/final-gate methods | Bind existing domain-verifier evidence; statistical methodology remains domain-specific/optional. | P01/P03 |
| A | [`runtime/src/autoresearch_runtime/resources.py`](../../autoresearch/runtime/src/autoresearch_runtime/resources.py), 10–35 | **YES** | Sorted filesystem flock leases | Reuse existing concurrency/resource route; verify actual limits instead of adding leases. | S5 |
| A | [`runtime/src/autoresearch_runtime/review_policy.py`](../../autoresearch/runtime/src/autoresearch_runtime/review_policy.py), 11–43 | **YES/BUT** | SQL review/successor application | Exact scoped approval metadata on existing review; no review database or board. | S7/P04 |
| A | [`runtime/src/autoresearch_runtime/search.py`](../../autoresearch/runtime/src/autoresearch_runtime/search.py), 11–88 | **DEFER** | Qualification/dependency/top-k/diversity search | Optional strategy over ordinary results; no beam/frontier/fleet obligation. | P07 |
| A | [`runtime/src/autoresearch_runtime/snapshots.py`](../../autoresearch/runtime/src/autoresearch_runtime/snapshots.py), 9–49 | **YES/BUT** | Git bundle capture/archive/restore | Bound candidate and verified restoration using existing workspaces/artifacts; no bundle subsystem. | S5/S6/P01/P03 |
| A | [`runtime/src/autoresearch_runtime/stall.py`](../../autoresearch/runtime/src/autoresearch_runtime/stall.py), 5–17 | **DEFER** | Comparable-round scientific stagnation reducer | Optional research diagnostic; NOT a replacement liveness watchdog. | S3/P07 |
| A | [`runtime/src/autoresearch_runtime/supervised_job.py`](../../autoresearch/runtime/src/autoresearch_runtime/supervised_job.py), 15–67 | **YES/BUT** | Runner/leases/receipt/cleanup command | Sticky provenance validity and process/science distinction; drop signal/execution machinery. | S4/P02 |
| A | [`runtime/src/autoresearch_runtime/supervisor.py`](../../autoresearch/runtime/src/autoresearch_runtime/supervisor.py), 22–120 | **YES** | Systemd supervision/intents/query/cancel | Reuse existing watchdog/job recovery. Uncertain ownership is not termination proof. | S3/S4 |
| M | [`runtime/src/autoresearch_runtime/worker.py`](../../autoresearch/runtime/src/autoresearch_runtime/worker.py), 50–66 | **YES/BUT** | Fixed graceful-timeout acceptance | Interrupted work invalid even if handler exits zero and writes pass; no copied worker. | S4/P02 |
| A | [`runtime/src/autoresearch_runtime/workspace_pool.py`](../../autoresearch/runtime/src/autoresearch_runtime/workspace_pool.py), 8–20 | **YES** | Lease-backed workspace slots | Existing workspace/concurrency management. | S5 |

### Added tests and fixture — 12 paths

| Git | Path / source lines | Can I drop this? | Current purpose | What remains / replacement | Route / property |
|---|---|---|---|---|---|
| A | [`runtime/tests/distributed_fixture.py`](../../autoresearch/runtime/tests/distributed_fixture.py), 20–43 | **YES/BUT** | Bounded distributed fixture | Keep tiny CPU manifest/result example, not distributed contracts. | M2/M5 |
| A | [`runtime/tests/test_artifacts.py`](../../autoresearch/runtime/tests/test_artifacts.py), 9–23 | **YES/BUT** | Artifact identity/corruption/recovery | Test immutable bytes and corruption rejection at reused artifact boundary. | P03 |
| A | [`runtime/tests/test_backend_contracts.py`](../../autoresearch/runtime/tests/test_backend_contracts.py), 22–72 | **YES** | Backend/mount/cleanup/recovery tests | Generic tests belong to reused infrastructure; legacy migration optional. | S2/S4/S5 |
| A | [`runtime/tests/test_contracts.py`](../../autoresearch/runtime/tests/test_contracts.py), 15–45 | **YES/BUT** | Identity/data roles/budget/output tests | Changed identity, final-data exclusion, bounds and missing/bool/NaN/Infinity rejection. | P01/P03/P05 |
| A | [`runtime/tests/test_fleet_ui.js`](../../autoresearch/runtime/tests/test_fleet_ui.js), 8–22 | **YES** | Dashboard rendering/localization | No initial UI/board parity. | Deferred UI |
| A | [`runtime/tests/test_global_store.py`](../../autoresearch/runtime/tests/test_global_store.py), 31–103 | **YES/BUT** | Charges/claim/receipt/validity tests | Retain charge continuity and terminal/scientific distinction; no SQL/racing-claim/nonce suite. | P02/P05/P08 |
| A | [`runtime/tests/test_hosting.py`](../../autoresearch/runtime/tests/test_hosting.py), 19–60 | **YES** | HTTP/CORS/anonymous integration fixture | Useful bounded job/result example becomes ordinary DSH job; no HTTP parity. | S4/M5 |
| A | [`runtime/tests/test_learning.py`](../../autoresearch/runtime/tests/test_learning.py), 17–47 | **YES/BUT** | Learning/hooks/plan/stall tests | Changed assumptions/evidence, stale-condition invalidation, old plan and prompt/history preserved. | P04/P07/P08 |
| A | [`runtime/tests/test_qualification.py`](../../autoresearch/runtime/tests/test_qualification.py), 17–41 | **YES/BUT** | Qualification and confirmation tests | Complete finite bound evidence and exact confirmation linkage; statistics stay in verifier tests. | P01/P03/P06 |
| A | [`runtime/tests/test_search.py`](../../autoresearch/runtime/tests/test_search.py), 15–104 | **YES/BUT** | Fleet selection/successor/exposure tests | Exact successor approval and no rename-based confirmation reuse; top-k/capacity machinery omitted. | P04/P06 |
| A | [`runtime/tests/test_snapshots.py`](../../autoresearch/runtime/tests/test_snapshots.py), 13–28 | **YES/BUT** | Restoration/lease/promotion tests | Restored candidate equals bound identity; changed integration requires applicable verification. | P01/P03 |
| A | [`runtime/tests/test_worker.py`](../../autoresearch/runtime/tests/test_worker.py), 14–65 | **YES/BUT** | Timeout/contradictory receipt regressions | Cooperative timeout stays invalid; quarantine contradiction without rewriting bytes. | P02/P03 |

## 3. Unchanged legacy features: no hidden port obligation

These paths have **no base→HEAD change** and are separate from the 65-path count. They were included because the earlier plan imported their functionality. The first five are the requested core runtime modules; the last two are supporting board helpers.

| Path / source lines | Can I drop this? | Small property / reuse route | Property |
|---|---|---|---|
| [`runtime/src/autoresearch_runtime/goals.py`](../../autoresearch/runtime/src/autoresearch_runtime/goals.py), 192–254, 389–542, 544–698, 700–760 | **YES/BUT** | Goal/allowed scope, original prompt, bounded proposal, evidence-backed checkpoint and reorientation; stop/changed-context handling. Keep a short goal/checkpoint reducer, not GoalLedger/SQLite/candidate-inventory protocol. | P01/P05/P07 |
| [`runtime/src/autoresearch_runtime/confirmation.py`](../../autoresearch/runtime/src/autoresearch_runtime/confirmation.py), 20–54, 82–115, 118–158 | **YES/BUT** | Frozen candidate/verifier/data; consume before access; overlap forbidden; failed openings consumed; finite aggregate release. Reuse one project-wide exposure authority, not a new per-profile ledger or copied runner. | P06/P08 |
| [`runtime/src/autoresearch_runtime/review.py`](../../autoresearch/runtime/src/autoresearch_runtime/review.py), 64–109, 238–350, 374–394, 453–613 | **YES/BUT** | Immutable exact review subject/evidence/action; stale feedback ineffective; advice not authority; prerequisites cannot be waived. Drop Inbox/SQL/dispatcher/server/UI; reuse existing review/communications. | S2/S7/P04 |
| [`runtime/src/autoresearch_runtime/workflow.py`](../../autoresearch/runtime/src/autoresearch_runtime/workflow.py), 16–34, 43–107, 110–147 | **YES/BUT** | Question, attempted alternative, outcome, rationale, uncertainty, evidence and next checkpoint. Overview does not authorize work. Drop overview/glossary schema and Inbox adapter; board richness deferred. | P07 |
| [`runtime/src/autoresearch_runtime/protocol.py`](../../autoresearch/runtime/src/autoresearch_runtime/protocol.py), 44–83 | **YES/BUT** | Fixed verifier fails closed; typed output and candidate/evaluator/data/environment identity. One immutable result snapshot through existing jobs/artifacts, not copied persistence/closure/review helpers. | P01/P02/P03 |
| [`runtime/src/autoresearch_runtime/review_history.py`](../../autoresearch/runtime/src/autoresearch_runtime/review_history.py), 14–70 (especially 45–52) | **DEFER** | Historical board UX omitted; preserve immutable old history with no inherited execution authority. | P04/P08/Deferred UI |
| [`runtime/src/autoresearch_runtime/live_review.py`](../../autoresearch/runtime/src/autoresearch_runtime/live_review.py), 24–58, 77–81 (especially 38–45) | **DEFER** | Live board omitted; observation is not evidence or approval; retain truthful unavailable/error state if later enabled. | P04/Deferred UI |

**Continuity condition:** existing charge and confirmation-opening records remain authoritative until a deliberately reconciled handoff. Dropping their implementation does not authorize an empty ledger. Fresh confirmation remains disabled until an atomic opening authority and single-writer continuity are demonstrated on the reused route.

## 4. Feature-level answer: reuse versus research essence

| Feature | Can I drop the dist-exec implementation? | What to do instead |
|---|---|---|
| Heartbeats/watchdog | **Yes** | Configure existing external superagent watchdog plus ordinary worker/job status; no research heartbeat protocol. Service liveness is not scientific completion. |
| Distributed claim/start, enrollment, grants, fencing | **Yes** | Route bounded work through existing Tickets/workers/jobs; retain manifest/action identity, not the distributed coordinator protocol. |
| Communication, acknowledgements, context | **Yes** | Existing sources, thread delivery and notifications with compact scientific references. |
| Concurrency, resources, workspace pooling | **Yes** | Existing worker/workspace/job facilities and bounded procedure; verify actual hard limits. No parallel scheduler/leases. |
| Recovery, retries, receipt replay, process cleanup | **Yes** | Existing effects, Session/job persistence and supervisor/watchdog; keep sticky validity and scientific action deduplication only. |
| Review machinery and reviewer lifecycle | **Yes** | Configure existing worker/subagent/review route; retain exact subject/action scope and automatic independent-review procedure. |
| Review board / fleet UI | **Yes, omit now** | No board revamp, UI parity, new HTTP server or dedicated review database in this plan. |
| Persistence, globalStore, outbox, CAS | **Yes** | Existing transactional/scoped-state/artifact boundary. Only small scientific associations and monotonic admission/opening records, not another storage engine. |
| Benchmark execution and metrics engine | **Yes, as a copied runtime** | Ordinary bounded job plus existing domain verifier; keep truthful terminal status, typed immutable evidence and identity binding. |
| ExperimentSpec / DAG / round compiler | **Yes** | Compact manifest/invocation/result contract. No obligatory distributed DAG or complete-round inventory. |
| Qualification/control/bootstrap/statistical DSL | **Yes** | Existing domain-verifier methods decide science; no generic plugin statistics engine. |
| Budgets | **Yes, as an accounting engine** | Small admission guard over authoritative bounds; preserve old charges. Worker concurrency alone is not a budget. |
| Confirmation/exposure | **Yes, as a copied runner/ledger; no, not the rule** | Single project-wide irreversible consume-before-access authority, no reset/rename/retry reuse; keep disabled if unavailable. |
| Goal outer loop / re-steering | **Yes, as GoalLedger/scheduler; no, not the policy** | Compact evidence-backed decision helper/skill in dsh-research; existing worker completion/communication activates it. |
| Failure/stall learning | **Yes** | Keep changed-assumption/evidence requirement in checkpoint policy; advanced stagnation/search optional, not another watchdog. |
| PlanDelta patching, top-k/diversity search, automatic Git promotion | **Yes, defer sophistication** | Ordinary revised plan/candidate with rationale and invalidated stale reviews; existing workspace ownership. |
| Containers, remote fleet, migration tooling | **Yes, omit initially** | Use an already configured qualified executor if needed; one-off offline handoff only when justified. |
| Legacy test suites | **Yes, not their properties** | Focused P01–P08 checks at reused boundaries; no Python API, test-count or 24-candidate simulation parity. |

## 5. Smallest destination and execution route

Four illustrative helpers are sufficient: **manifest**, **evaluate**, **loop**, **admission**. The last combines scoped review, bounded admission and exposure guards. Functions may be implemented as smaller skills/configuration if that suffices. They are not new services and do not own the generic runtime.

```text
compact scientific manifest + bounded request
  → existing superagent Ticket / worker and ordinary DSH job
  → existing communication / watchdog / concurrency / recovery / persistence
  → truthful job status + immutable output reference
  → small result checks + EXISTING DOMAIN VERIFIER
  → existing scoped independent review when policy requires it
  → evidence-backed checkpoint and bounded re-steering
  → next ordinary job, defer or stop
```

Not: coordinator → enroll → claim/start grant → heartbeat/outbox → custom supervisor → receipt replay → new SQL review application → fleet UI.

A Ticket becoming ready or a job completing is **not** scientific qualification. A valid negative result is nevertheless useful evidence. A genuinely missing atomic scientific guard justifies only that narrow operation/export over reused persistence, not another distributed runtime. SourceContext exists but is not a verified published SDK; do not use private imports.

## 6. Old defects/limitations not to carry across

These are source-audit findings, not a request to repair the fork:

- **Graceful-timeout invalidation is fixed** at HEAD: `worker.py:65`, `test_worker.py:40–65`. Retain this regression; do not describe it as still unfixed.
- **Sticky integrity gap:** post-run binding failure can leave `execution_status=completed` in `supervised_job.py:35,43,47–49`, then `host_agent.py:128–133` can accept passing metrics. In the small checker invalidity must dominate later parsing.
- **Parent-review bypass:** `global_store.py:182–190` allows parentless `initial_authorization=True` beyond the actual initial round. Approval/lineage identity must not be waived by caller flags.
- **Weak confirmation publication:** `global_store.py:344–365` does not establish full approved qualification/selection linkage; duplicate reservation can report reserved after consumption. Preserve monotonic authoritative opening state.
- **Reusable old permits:** `review.py:337–394` can reuse an approved action at new checkpoints. Exact scope is not a budget or exposure permission.
- **Metric-method gaps:** `metrics.py:23,27–34` declares but does not apply minimum effect and ignores direction in evaluation. Delegate comparison to the existing verifier, not this helper.
- **Evidence gaps:** `artifacts.py:59–65` lacks requested-hash/returned-manifest comparison; `protocol.py:49–53` hashes/parses separate reads. Capture once and verify exact bytes.
- **Availability/fixture limits:** `supervisor.py:36,61–62` and synchronous fixture `test_hosting.py:19–26` are not lifecycle/scientific qualification proof. The anonymous hosting/TLS POC is not authenticated team authorization.

Earlier test success and the [disposable invalid-publication reproduction](../../accorde/local_artifacts/autoresearch/dist-exec-audit/20261103-1448/reserved-state-publication-reproduction.json) remain historical evidence. No new dsh-research/runtime behavior is claimed qualified by this matrix.

## User Prompt, Verbatim

```text
superagent has the watchdog, which acts for heartbeats. 
superagent alos has the worker agent, and communicaton, so the "distributed claim/start" can use that route, not re-invent. 
So are the "Concurrency/Recovery/Review/Persistence", as those can be set up to run on superagent. 
Let's revise the plan to reuse superagent as much as possible. don't have to re-impl what autoresearch dist-exec's carbon copy. The key here is minimal/core dsh-research, only the gist. Answer this question, "can I drop this" for every autoresearch's dist-exec branch?
Also the review board needs revamp, omit that in the current planning.
```


## Filename Convention Request, Verbatim

~~~text
please use {YYMMDD}-{HHMM}-* as the format of the plan/tracker file name.
~~~

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-03 16:49 -0800 | Created exhaustive dispositions for all 65 dist-exec changed paths, five unchanged scientific-core modules and two unchanged review helpers. Distinguished drop-implementation from retain-property/defer; mapped reuse routes and removed review-board/fleet/full-stack parity. Preserved the exact user instruction and historical evidence/charge/exposure continuity. No implementation, deletion or deployment performed. |
| r2 | 2026-11-05 16:26:56 -0800 | Renamed 20261103-1637-dist-exec-drop-matrix.md to 261103-1637-dist-exec-drop-matrix.md using YYMMDD-HHMM; updated 1 local links and repaired 2 copied Accorde audit references. Preserved original prompt/code blocks and scientific content; recorded the filename request verbatim. |
