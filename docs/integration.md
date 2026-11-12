# Native research integration

Use the exact package and peer versions pinned in package.json and the generated qualification lock. The native API is exported from `dsh-research/native`; records, binding checks and read-only audits are exported from `dsh-research`.

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

The shipped development policy accepts `synthetic_released_cpu`. Its evaluator entrypoint and declared input/mode template are pinned. Extending to a scientific project requires its own reviewed policy, input/evaluator mapping and qualification; a caller cannot promote the development scope.

## Coupled record versions

Record version 2 adds durable review requests, rejected-subject references, feedback versions/dispositions/effects and publication associations. The native domain descriptor is version 2 and rejects a version 1 store. `LegacyResearchStateSchema` and `HistoricalResearchStateSchema` read old snapshots for audit. They do not write, initialize missing history or perform a migration.

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

The [shared fixture](../examples/synthetic-cpu/fixture.mjs) supplies disposable synthetic authority and a deterministic project verifier. [Automatic execution](../examples/synthetic-cpu/automatic.mjs) exercises proposal, separate native review, a valid negative, edited feedback and an actual successor effect. [Fault drills](../examples/synthetic-cpu/faults.mjs) cover reviewer interruption, uncertain association, delayed acknowledgement and replay.

`auditCoverage` checks closure only for its exact frozen matrix, scope and assurance. Missing or conflicting assertions remain unresolved/failed; fixture observations cannot satisfy live cells. Observation provenance and semantic/domain review remain separate qualification obligations. The fault matrix is a finite union of relevant cells, not an automatic cross product of every property and fault.

Implementation status and blockers are maintained in the [M1–M6 tracker](../.plan/tracker/261105-1555-milestone-execution.md).

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-11 23:30:50 -0800 | Documented exact native facilities, automatic review/feedback, versioned state and audit boundaries with reproducible package examples. |
