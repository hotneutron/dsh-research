# Native research integration

Use the exact package and peer versions pinned in helpers/package.json and the generated qualification lock. The native API is exported from `dsh-research/native`; records, binding checks and read-only audits are exported from `dsh-research`.

## Project configuration

Configure one canonical hosted-project root P and one authorized host writer. Native Session paths, coupled state, scientific artifacts and feedback all belong to P. Resolve existing authority before opening the adapter; `NativeResearchAdapter.open` refuses a missing project record.

| Native facility | Public provider used by the example | Project configuration |
|---|---|---|
| Workers | @deepseek-ai/dsh-agent-loop | Author Session and separate reviewer model route |
| Review lifecycle | @deepseek-ai/dsh-subagent | Configured local provider, one active reviewer child, caller delivery and native catalog/query |
| Execution | @deepseek-ai/dsh-bash-local over @deepseek-ai/dsh-subprocess-local | Explicit cwd, capped deadline and kill-on-expiry |
| Job ownership | @deepseek-ai/dsh-jobs-local | One active job per owner and an attached controller |
| Coupled record | @deepseek-ai/dsh-storage-domain over @deepseek-ai/dsh-storage-sqlite | P/.autoresearch/dsh/state.sqlite3 and registered project key |
| Native history | @deepseek-ai/dsh-session-persistence-jsonl | P/.autoresearch/dsh/sessions |
| Skill loading | @deepseek-ai/dsh-skill-filesystem | Explicit package skills directory; verify discovered bytes |

The development policies accept `synthetic_released_cpu` and `project_gpu_development`. The GPU variant currently supports `C_qual` only: caller-set assurance cannot enable scientific GPU adoption. It binds the exact device UUID/environment, existing lease namespace, producer, qualification and budget snapshots, and a host-registered `NativeGpuGuard`. The manifest must include the exact qualification as a reviewed prerequisite. Arbitrary shell argv, a replacement guard or a changed environment are refused.

`NativeGpuGuard.preflight` provides exact subject/device observations before admission. The pinned producer acquires the existing resource lease before any scientific GPU dispatch and retains it through process/device teardown. `settle` binds its lease/quiescence proof to the admitted action, dispatch token, native terminal and exact capture. Missing ownership, release or quiescence retains the original charge/reservation. An incomplete unit remains ineligible even after exit zero. Guard methods have finite deadlines; native termination alone does not certify GPU settlement.

Accorde's scientific GPU campaign still requires its project-selected question, complete environment/source/codegen/input closure, accepted resource/model/coordination bounds, domain verifier and independent scientific/profile qualification. The CUDA-driver fixture qualifies bounded producer/guard mechanics, not predictor science.

## Coupled record versions

Record version 3 retains exact admission, identity, terminal and capture refs before fallible GPU settlement. Version 2 introduced review/feedback/publication associations. The native domain descriptor is now version 3 and rejects implicit older-store adoption. `LegacyResearchStateSchema` (v1), `Version2ResearchStateSchema` and `HistoricalResearchStateSchema` preserve historical reading; they do not initialize or migrate authority. A 2-to-3 handoff needs an explicit reviewed compatibility/retention mapping and supported provider transfer.

Use `auditContinuity` to check retained consumption and immutable associations before a prospective handoff. A compatible code change cannot refund actions/reviews or release an unresolved reservation. A production handoff needs existing writer fencing, supported backup/restore and an independently reviewed mapping.

## Author and reviewer tools

Register the coordination and review tools before installing the adapter's author mask. The example's author can invoke:

- `research_propose`: use a project-supplied factory to freeze a new manifest; the package verifies binding and source identities.
- `research_review`: persist the exact bounded request before invoking the existing subagent route, then retain actual native completion and subject hashes.
- `research_run`: consume one exact approved action through the coupled record, await/verify its acknowledgement, and delegate to the existing shell/job service.
- `research_feedback`: capture complete source scans, disposition exact source versions and associate actual settled effects.

The reviewer receives no execution tools. Add policy sections or a reviewer persona through the existing prompt API; retain runtime-owned context and original-source/stop behavior. Do not replace the complete work prompt with a research paragraph.

Completed reviewer proof may be checked against a live or persisted native Session cut. The retained prefix, provider, request/action hashes and normal completion must match. An interrupted or unknown request remains an owned hold, consumes its review allowance, and is reconciled before another dispatch. A new plan or transport name cannot revive an unchanged rejected subject.

## Feedback and publication

Source scans retain exact captured page and content bytes. Page cursor continuity and a final page with no next cursor are required before the queue/watermark update. Preserve edited versions separately; source text is advisory evidence rather than execution authority.

An adopted disposition links a changed frozen manifest. An executed effect must resolve to the corresponding settled action/evidence. Effect checkpoints append new identities and preserve the original checkpoint rather than relabeling its pending effect.

`publishCheckpoint` calls a supplied existing project transport. It checks fetched release bytes and audience access, reconciles uncertain publication before retrying and changes only publication associations. Its transport must supply trustworthy access facts; a fixture access response does not qualify real team permissions. Publish only permitted project-authored release bytes. Raw Sessions, restricted inputs and secrets require their own authorized surfaces.

Normal `progressReport` outcomes include `human_action=null`. Supply an existing unresolved question when mapping host attention, and preserve it until its reviewed resolution. Operational holds do not create scientific-exhaustion questions.

## Reproducible examples and audits

The [shared fixture](../helpers/examples/synthetic-cpu/fixture.mjs) supplies disposable synthetic authority and a deterministic project verifier. [Automatic execution](../helpers/examples/synthetic-cpu/automatic.mjs) exercises proposal, separate native review, a valid negative, edited feedback and an actual successor effect. [Fault drills](../helpers/examples/synthetic-cpu/faults.mjs) cover reviewer interruption, uncertain association, delayed acknowledgement and replay.

`auditCoverage` checks closure only for its exact frozen matrix, scope and assurance. Missing or conflicting assertions remain unresolved/failed; fixture observations cannot satisfy live cells. Observation provenance and semantic/domain review remain separate qualification obligations. The fault matrix is a finite union of relevant cells, not an automatic cross product of every property and fault.

`auditContinuity` checks full immutable action/review identities, dispatch phases, charged history, rejected subjects, finalized feedback/effects and publication audience/access proofs. A changed writer returns `writer_changed_requires_handoff`; any changed feedback cursor returns `feedback_cursor_requires_reconciliation`. Profile/policy changes also require explicit compatibility review. These results require external supported fencing or exact scan-chain evidence, which two snapshots cannot supply. Version-three native facts are also immutable and cannot be erased by a downgrade. `inspectGpuSettlement` can derive a later bounded quiescence proof from retained native facts without admission, relaunch or state reservation release. Even a clean snapshot audit does not approve deployment or certify legacy exposure history.

The [continuity rehearsal](../helpers/examples/synthetic-cpu/continuity.mjs) closes the disposable source writer, uses Node's supported SQLite backup API, exports exact linked artifact and native Session files, and opens the restored database through the native domain without reseeding. It preserves the original canonical root; actual relocation, running jobs and live authority handoff require their own qualification.

The [GPU qualification example](../helpers/examples/gpu/run.mjs) uses the unchanged public native shell/jobs/storage services, scripted review and an H100 CUDA-driver vector-add producer. It has positive and incomplete-unit cases, no scientific dataset reads and no paid model calls. Its fixture authority is separate from Accorde's scientific goal/exposure records.

The generated `dist/reproduction-bundle.py` builds a bounded source/config/evidence archive from an explicit byte-pinned project declaration, rejects private/state/Session/log paths, and verifies restored members. Packaging does not certify permission or recipient access; the existing publication transport must establish those facts separately.

Implementation status and blockers are maintained in the [M1–M6 tracker](../.plan/tracker/261105-1555-milestone-execution.md).

## Public superagent integration qualification

From the source checkout, build the helper package and use the qualified unchanged prototype checkout with its pinned dependencies:

```sh
npx --yes pnpm@11.7.0 --dir helpers m1:integrated /absolute/fresh-output /absolute/dsh-superagent-prototype
```

The command creates a disposable consumer and resolves `dsh-superagent` and the DSH facilities through public package exports. Its source request/Ticket Mandate forwards the manifest to a native author Session; it checks source filtering/duplicate outbox, job/expiry/cwd/concurrency, exact native state and Session reopen, reviewer cancellation/launch denial and direct-child wait/list/drain, public Config/prompt/policy controls, and the unchanged service script's intentional-stop behavior.

The public core uses `MemoryRepositories` only as an explicit ephemeral qualification fixture. The scientific state and native Sessions are persisted through their existing providers. It does not qualify the prototype's default deployed Store/DshExecutor, actual cloud Source accounts/outbound access, or a production service/watchdog installation. Scientific/profile acceptance remains separately reviewed.

## Default Source, Store and worker deployment

Use a separate consumer with the unchanged `dsh-superagent` public plugin and the native default web bundle to qualify the actual persistent Store and DshExecutor:

```sh
python3 helpers/examples/superagent/default-runtime.py \
  --runtime /absolute/project-owned/pinned-runtime \
  --output /absolute/fresh-qualification-project
```

The runtime directory contains Node `node-v24.9.0-linux-x64/bin/node`, the installed `@deepseek-ai/dsh` 0.2.1-alpha.2 family, Cordis 4.0.5-alpha.1 and the unchanged prototype artifact. Install the prototype's peer packages explicitly at their pinned versions and retain the consumer's exact npm lock; npm's alpha peer resolution must not silently substitute newer APIs. The helper package's pnpm lock governs helper development, while the deployed consumer's npm lock governs its installed bundle.

This command uses real default providers, a native fixture GitHub CLI and bounded scripted native models. It checks the installed Source's normalization, disabled-source filtering, duplicate intake and same-account non-human classification; actual Ticket/worker Session delivery and reports; durable Store reopen; revision conflicts and explicit stop. It retains the exact fixture source files, profile, normalized restored Source record and Session events. The fixture CLI never contacts GitHub. Its provider requires an explicit disposable-qualification environment flag and must remain outside a hosted project's research profile.

`dist/default-profile.py` prepares a new project-owned profile without starting it. It refuses an existing profile and binds default JSONL Sessions, workspace storage, query path and prototype `stateDir` under the named project. Preparing this orchestration Store does not initialize a scientific budget, exposure ledger or research writer. Keep current scientific authorities authoritative through separately qualified adoption.

For Linux deployment, `dist/default-systemd.py` generates a project-owned user unit and `dist/default-service.py` controls its registered unit. Use the wrapper for intentional stop, start and `restart --respect-stop`. Stop succeeds only after checking the systemd result and remaining cgroup processes; unresolved timeout or residual children block a new start. The unit uses SIGINT, `SendSIGKILL=no`, accepted native exit statuses, and a recovery delay longer than the prototype's 30-second writer-lock stale period. A persistent intentional-stop marker also gates user-manager startup. On H100 Linux, Node 24 uses process name `MainThread`; the unchanged prototype service script's process-name filter misses it, so that script is retained for reference and is not the deployed controller.

An initial hosted-project deployment stays paused with Eval off, no admitted senders/rules, unavailable model routes, and a refusing prepare command. `dist/github-read-only.py` supports real authenticated, repository-scoped GET reads while refusing writes. It constrains that transport; a worker running as the same OS user is not isolated by it. Source identity, allowed human intake, independent scientific/domain review, aggregate model/GPU authority and research-tool adoption must be qualified before scientific activation. A successful infrastructure drill does not lift those holds.

Keep Store backups and native Sessions private in the hosted project. Share only an explicitly permitted source/config/evidence bundle through the existing team transport, with verified recipient access. A receipt hash or SSH-local path alone does not grant access to teammates.

## Guarded research inside the default worker

The default worker can register its research entrypoint locally through `adapter.register({ toolScope: 'author', inheritedTools: ['skill'] })`. DSH's inherited-tool restrictions intersect, while agent-local tools remain visible. The adapter still installs its monotonic author/reviewer guard, and the prototype's Ticket-ended guard remains active. Configure `authorTools` explicitly to retain the guarded entrypoint, skill loading and required native report tools; raw shell and other inherited capabilities stay masked.

The host supplies the worker's existing scoped `executionShell`, obtained through supported service injection, and `assertActiveAuthority`, which verifies the current native Ticket/mandate and operator pause. The adapter awaits that assertion before admission and again before reading the fresh committed tuple for dispatch. Callers must read native Ticket state after their last asynchronous authority lookup. Unknown or revoked authority cannot launch from an earlier snapshot; an already consumed uncertain attempt keeps its charge/reservation.

The packed default consumer adds this qualification mode:

```sh
python3 helpers/examples/superagent/default-runtime.py \
  --runtime /absolute/isolated-pinned-consumer \
  --output /absolute/fresh-qualification-project --research
```

Its isolated consumer includes the packed helper plus the pinned native storage-sqlite and AgentLoop test-support packages. The existing default AgentLoop, Source, Store, DshExecutor, worker preset and scoped shell run the integration; the fixture does not mount a replacement AgentLoop. The native worker loads the research skill, receives exact manifest/review references through a Source input, invokes `research_run`, captures a valid synthetic negative and reports the actual evidence/checkpoint. Separate native reviewer completion, bypass/reviewer/argv refusal, replay, uncertain publication, retained reservations, process reopen and native Ticket stop are checked with bounded scripted models.

An existing-context synthetic fixture requires the explicit disposable marker and refuses to overwrite an existing scientific record. Reopen uses the retained registration and the same project row. Error cleanup removes the fixture's registration and does not dispose the caller's context. This qualifies the synthetic ordinary-worker protocol; Accorde's live scientific workload, aggregate authorities and domain/profile qualification remain separate adoption work.

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
