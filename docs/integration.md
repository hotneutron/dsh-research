# Research integration with DSH and superagent

Build the helper package using the [README](../README.md#development-checks), then install its exact [package and peer versions](../helpers/package.json) in the project runtime. Runtime APIs are exported from `dsh-research/native`; records, bindings and audits from `dsh-research`.

## Autonomous production research

Superagent owns intake, Tickets and worker lifecycle. DSH runs the author, separate reviewer, jobs and persistence. dsh-research attaches the research protocol to the DSH author Session created by superagent.

After the host supplies the project bindings:

```js
import { NativeProductionResearch } from 'dsh-research/native'

const loop = await NativeProductionResearch.open(ctx, {
  artifacts, table, projectKey, policy, authorSessionId,
  artifactPrefix: 'local_artifacts/autoresearch/dsh/my-goal',
  executionShell, executionSandbox, assertActiveAuthority,
  verifier, hooks, reviewContextMaxBytes: 1048576,
})
```

The project supplies:

- **Authority and execution:** the registered writer, open Ticket/mandate, current pause check, scoped shell and accepted sandbox resolver.
- **Frozen policy:** contract/profile references, input and cost purposes, invocation template, resource limits and reviewer route.
- **Domain hooks:** proposal construction, permitted reviewer context, verifier and completion/exhaustion premises. A feedback reader also needs a changed-action validator.

The [Source recipe](../helpers/examples/production/source.mjs) loads a pinned project module from `DSH_PRODUCTION_RESEARCH_CONFIG`. It requires the native `sessions` service for durable outcome delivery, preserves the registered writer Session when DSH recreates its Agent, and disposes the previous installation before reinstalling. Optional `metadata_prefix` versions installation artifacts without changing scientific state. New registration requires an authentic user mandate and `authority_registration=explicit_new_project`.

See the [engineering project](../helpers/examples/production/engineering-project.mjs) for complete bindings and hooks. Each scientific project needs its own accepted domain/profile qualification.

## Project state and resources

Resolve all state, Sessions and artifacts under one canonical project root P. Production `science.sqlite3` must be inside superagent's configured `machine.stateDir` and existing writer lock; worktrees and clones share the same authority and consumed history.

Production uses `productionResearchDomain` and `Version4ResearchStateSchema`. Historical `researchDomain` remains version three. Migration requires a reviewed retention mapping, supported backup/restore and writer fencing; preserve charges, reservations, reviews, feedback and exposure history. Compatible rollback retains the current record.

GPU actions need a qualified host resource/termination guard; scientific runs also need the original scientific authority. The optional ordered `resource.device_uuids` set and `CUDA_VISIBLE_DEVICES` must match, with the primary device first. Acquisition, ownership and quiescence/release must cover every participant; omitted lists retain historical single-device behavior. Confirmation remains off until separately qualified.

## Author and reviewer tools

| Tool | Purpose |
|---|---|
| `research_propose` | Freeze a project-supplied manifest. |
| `research_review` | Obtain separate review for its exact subject and hashes. |
| `research_run` | Admit and execute the approved action at the observed state revision. |
| `research_status` | Read actual evidence, checkpoints, costs, bounds and captured feedback. |
| `research_feedback` | Capture source versions, record dispositions and link settled effects. |
| `research_conclude` | Separately review goal completion or scoped scientific exhaustion. |

Keep the host's `assertActiveAuthority` on both execution and review. The reviewer receives permitted frozen context and no execution tools; a separate Session alone does not establish filesystem secrecy. Register local research tools on the author context; inherited-tool filters apply only to inherited capabilities.

Valid negatives lead to justified successors under standing authority. Ordinary reports use `human_action=null`; terminal reports require the reviewed conclusion. Unknown execution, missing review or exhausted budget are operational holds, not scientific exhaustion.

## Feedback, sharing and recovery

Capture complete source scans before advancing cursors; preserve edited versions. Adoption links a materially changed unadmitted manifest, fresh review and actual settled effect before the response. Optional source/publication failures do not block otherwise admissible research.

Publish permitted checkpoint and reproduction bytes through an existing project transport. Verify recipient access to both the brief and its underlying assets. Keep raw Sessions, credentials, private state and restricted inputs out of team releases; a local path or archive alone is not shared access.

Replay resolves the original action/review association. Unknown launches retain charges and reservations until qualified reconciliation; restart never authorizes another execution. Use the [reconciliation](../helpers/src/reconciliation.ts), [recovery](../helpers/src/recovery.ts) and [scientific-authority](../helpers/src/science.ts) APIs for exact host proofs and original approval gates. A new profile or positive remaining budget cannot reset authority.

## Pluggable model transport

`ModelTextAdapter` (`dsh-research/model-transport`) implements DSH's `LlmAdapter` with an injected driver, trusted project governance and shared `ModelRequestBudget`. `ModelToolAdapter` (`dsh-research/model-tools`) validates the full response and persists native call IDs before emitting tool blocks. `TraexDriver` (`dsh-research/model-drivers/traex`) and `CodexDriver` (`dsh-research/model-drivers/codex`) supply CLI mechanics. The relay selects each route's driver while sharing one model budget.

The accepted route binds executable/runtime/version pins, requested versus provider-reported model assurance, authentication principal/use basis, off-mode content exposure, reviewer separation and exact byte/deadline limits. Host `verifyRoute` and `approveContext` hooks verify actual authority and classify every payload entry; missing or uncovered evidence refuses before model debit. Output remains uncapped, and missing required usage makes a charged response ineligible.

Codex uses `driver.id=codex-app-server-v1`, complete `stdin` delivery and `driver.codex={home, model_catalog}`. `home` references protected file-backed API authentication (`authentication.class=codex_file`); refreshable account/keyring authentication is unqualified. A temporary auth-only home isolates user configuration, MCP servers, skills and history, and is removed after owned process teardown. Credential bytes never enter receipts. The classified catalog pin must appear in `auto_context` and contain the exact requested model once.

The driver removes CLI tools and metadata-selected delegation, verifies effective thread controls, consumes correlated raw response/usage events and refuses missing counters, extra responses, compaction, hooks or changed context. Unknown ownership holds the model scope and preserves its temporary auth-home reference for host reconciliation. Served-model verification remains unavailable: use `requested_only` assurance. Qualify the exact host, account use, exposure and reviewer policy before live adoption.

The shared budget counts admitted DSH transport requests. CLI-internal attempts are outside that count; failed/multiple responses retain raw completion and known usage evidence and remain charged. Request limits therefore do not claim provider-wide call or spend enforcement.

The [generic relay](../helpers/examples/model-transport/relay.mjs) requires a pinned project governance module, text/tools route bindings, wire limit and scoped request/concurrency budget. Its native file lock spans the canonical budget for the process lifetime; unknown process ownership holds the scope until an exact host restart proof. The [fixture governance module](../helpers/examples/model-transport/governance-fixture.mjs) accepts only scripted fixture authority and cannot authorize a real account.

The [remote client](../helpers/examples/model-transport/remote-model.mjs) preserves complete context and uses explicit role provider/model bindings. Configure `models.transport=model-relay`, `author_model`/`reviewer_model`, and `DSH_RESEARCH_MODEL_TRANSPORT_URL`, `DSH_RESEARCH_MODEL_TRANSPORT_TOKEN_FILE` and `DSH_RESEARCH_MODEL_TRANSPORT_TIMEOUT_MS`. A native DSH provider can remain outside this CLI bridge. Old prototype exports/configuration are replaced, not compatibility aliases.

## Linux deployment

Prepare project-owned profiles with [default-profile.py](../helpers/scripts/default-profile.py). After profile qualification and prior-writer fencing, generate native/model services and the scheduled Source wake:

```sh
python3 helpers/dist/production-systemd.py \
  --project /absolute/P --runtime /absolute/P/pinned-runtime \
  --home /absolute/P/native-home --helper /absolute/P/pinned-helper \
  --config /absolute/P/research-config.json \
  --relay-root /absolute/P/private-model-relay \
  --relay-controls /absolute/P/model-controls.json \
  --profile project-research --model-timeout-ms 330000 \
  --port 3094 --output /absolute/P/fresh-service-config
```

Relay configuration requires fixed `listenPort`, positive `maxRequestBytes`, `budget.scope_id`/`max_requests`/`max_in_flight`, a pinned `governance_module`, and `routes.text`/`routes.tools`. Route limits include `max_encoded_input_bytes`, model/preflight deadlines and capture sizes. Imported model history needs an independently fenced exact-byte mapping and retained identity index; no fresh allowance is created. Request accounting is durable before model contact; receive failures remain separate.

Register the generated units with the systemd user manager and verify `Linger=yes` for unattended operation. The 60-second timer wakes only retained authority; a completed goal stays stopped. Control the native unit with [default-service.py](../helpers/scripts/default-service.py) using `start|stop|restart|status`, `--unit`, `--home` and `--profile`. `restart --respect-stop` preserves intentional stop. Failed shutdown retains the stop marker; verify empty cgroups before resetting unit failures or restarting.

## Automatic planning on the default worker

From a built checkout with the pinned Linux consumer, run the default Source/Store/worker qualification in a fresh output directory:

```sh
python3 helpers/examples/superagent/default-runtime.py \
  --runtime /absolute/pinned-runtime --output /absolute/fresh-project --automatic
```

Other focused recipes:

| Recipe | Scope |
|---|---|
| [Production protocol](../helpers/examples/production/qualification.mjs) | Proposal, review, feedback, execution and conclusion. |
| [Source lifecycle](../helpers/examples/production/source-qualification.py) | Session recovery, pause/Ticket/late-tool and clone refusal. |
| [Shared relay tests](../helpers/tests/model-relay.test.ts) | Cross-port writer fencing, bounded wire input and retained restart accounting. |
| [GPU producer](../helpers/examples/gpu/run.mjs) | Device ownership, native terminal and quiescence. |
| [Continuity](../helpers/examples/synthetic-cpu/continuity.mjs) | Supported backup/export and retained-state reopen. |

Fixtures establish only their declared scope. The [research-loop contract](contracts.md) defines obligations; the [tracker](../.plan/tracker/261105-1555-milestone-execution.md) and [receipts](../.plan/review/) hold implementation status and qualification history.

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-11 23:30:50 -0800 | Documented exact native facilities, automatic review/feedback, versioned state and audit boundaries with reproducible package examples. |
| r2 | 2026-11-12 00:07:50 -0800 | Updated helpers paths and documented conservative continuity, compatibility and supported disposable backup/restore checks. |
| r3 | 2026-11-12 00:30:09 -0800 | Corrected the Accorde integration target to GPU and recorded pending project-specific device/resource/terminal/verifier qualification. |
| r4 | 2026-11-12 11:04:59 -0800 | Documented GPU qualification-only policy/guard, version-three retained native facts and historical readers, bounded inspection and recipient-unverified reproduction bundles. |
| r5 | 2026-11-12 14:02:31 -0800 | Added reproducible public-export S1–S8 consumer qualification and precise default-deployment/scientific acceptance exclusions. |
| r6 | 2026-11-12 15:00 -0800 | Added actual default Source/Store/DshExecutor qualification, project-owned Linux service controls and recovery/stop checks, explicit consumer pins and paused scientific/adoption boundaries. |
| r7 | 2026-11-12 16:20 -0800 | Documented author-local guarded registration, scoped native execution and fresh host-authority checks, and the packed default-worker research qualification mode with retained uncertainty and context ownership. |
| r8 | 2026-11-12 18:03:35 -0800 | Documented default native automatic planning/review/feedback, fresh review authority checks, retained child evidence and finite qualification scope. |
| r9 | 2026-11-12T20:15:20.440063-08:00 | Added bounded default failure/cold restore, exact per-call sandbox ownership, cleanup-before-receipt and text-only authenticated TraeX planning semantics; scientific/tool/token-bounded gates remain. |
| r10 | 2026-11-12T21:17:00-08:00 | Added structured-text native tool projection, per-call validation/bounds and reproducible engineering recipe; preserved unsupported token-control and scientific/default-worker gates. |
| r11 | 2026-11-12T22:16:54.920421-08:00 | Removed mandatory reviewer output-token caps and TraeX cap refusals; documented legacy metadata, retained request/deadline/capture/usage controls and historical witness preservation. |

| r12 | 2026-11-13T20:59:55.944311-08:00 | Documented host-qualified no-dispatch/review settlement and original-authority replacement guard with record/domain3 retention; scoped2.3.4 adoption required. |

- 2026-11-14T08:05:28.702163+00:00: Documented authenticated scientific preflight approval context and the required original inbox gate before reservation; retained record/domain3 and contract2.3.4.

- 2026-11-14T09:09:09.852867-08:00: Documented contract2.3.5 explicit settled-scientific-parent host recovery class, exact native/original fact qualification, retained default behavior and cumulative allowance.

- 2026-11-14T18:43:46.995064-08:00: Documented retained-owner M6 code/profile qualification, exact native Source/Ticket/replay and unconditional cleanup checks, original feedback-version export/retrospective scope and explicit benefit evidence.

- 2026-11-14T21:59:03.959632-08:00: Added project-owned autonomous production hooks, explicit V3/V4 adoption, reviewed conclusion/prospective feedback and resident native/model/scheduled service lifecycle.

- 2026-11-15T08:09:01.233577+00:00: Documented helper0.3.1 optional ordered GPU device-set/mask/receipt binding, retained historical single-device bytes, and required exact adopter guard/source qualification under unchanged contract2.4.0.

- 2026-11-15T10:07:09.214443+00:00: Ported the mem-subsys Source recipe fixes for same-Session Agent recreation, per-instance installation caching and versioned metadata. These local recipe changes require their exact deployment qualification; the project-owned native Source receipts are scoped evidence.

- 2026-11-15T10:19:02.542940+00:00: Added the Source SessionStore dependency discovered by real post-failure outcome delivery; retained scientific settlement and pending notice identity remain unchanged.

- 2026-11-15T11:00:38.925129+00:00: Documented configurable model-request capture bytes and retained pre-dispatch receive failures, qualified with four focused parser tests and an actual authenticated 2 MiB transport control; model token limits remain unset.

- 2026-11-15T11:11:59.456531+00:00: Added explicit `reviewerContextMode=latest_frozen_packet` for text review transport. It preserves system/current-turn context and the complete latest frozen packet while retaining native history and all old usage. Seven parser/selection tests passed; the actual 1,639,279-character refused request becomes 354,319 characters with identical current packet identity and no token limit. Non-packet review and historical default behavior are unchanged.

- 2026-11-16T16:11:22.361850-08:00: Condensed the guide around DSH/superagent integration, project bindings and operational rules; replaced repeated qualification/debug narratives with existing recipe, contract and receipt links; preserved current device-set, Session-recreation and model-capture guidance.

- 2026-11-17T03:08:26.060475-08:00: Adopted the 0.4 transport extraction: governed generic text/tool adapters, scoped model ledger, TraeX driver, explicit role bindings and native file/process fencing. Old prototype exports are replaced; live auth/exposure/served identity remains separately qualified.

- 2026-11-17T11:48:03.884746-08:00: Added governed Codex route bindings, per-route relay driver selection, pinned native protocol scope and explicit served-model/live-adoption limits.

- 2026-11-17T11:59:30.441993-08:00: Replaced provisional Codex exec parsing with private app-server raw-response audit, isolated non-refreshing file auth, exact event/control/usage checks and explicit logical-request/host gates.
