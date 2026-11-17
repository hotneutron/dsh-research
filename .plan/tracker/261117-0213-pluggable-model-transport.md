# Pluggable model transport implementation

Created: 2026-11-17T02:13:36.898930-08:00. Scope: **TraeX, Codex and Claude prototype transports**.
Plan: [reviewed plan](../261116-1708-plan-pluggable-model-transport.md). Baseline: `de8ed8bb5fab6d346639c4d1e27ad37fa2bed8cc`, helper0.3.2 / contract2.4.0.

## Status

| Work | Status | Evidence / next action |
|---|---|---|
| Baseline and scope | Complete | Original main-checkout review encoders preserved; isolated worktree and dependencies; baseline/source/test mapping retained. |
| Shared contract and TraeX extraction | Implemented | ModelTextAdapter + ModelToolAdapter, TraexDriver, route/host-governance contract, frozen executable/interpreter, final input bound and one shared model ledger. |
| Native consumers and qualification | Scoped qualification passed | 243 regressions (concurrency4) and 15 native-loop checks; exact author/reviewer/run/replay, cross-port native lock, process hold/cancel and old-to-new model history mapping; two grouped source reviews and cross-check repairs verified; zero open confirmed P0–P2 findings. |
| Live route / cutover | Gated | Requires exact host/binary/model identity, non-refreshing API auth/use/exposure/separation evidence and qualification budget. Mac mandatory system hook and refreshable ChatGPT/keyring auth remain unqualified. No active project state is reset or mutated. |
| Codex driver | Mechanism qualification passed | Private app-server raw protocol, bounded full-context stdin, isolated API file auth, exact raw usage/controls, compaction/hook/multiple-response refusal and mixed relay; 265 full regressions, focused retention and grouped/cross reviews. Native0.166 local HTTP observations retained; live route remains gated. |
| Claude driver | Mechanism qualification passed | Bare/API-file driver, strict raw response/usage and empty CLI tools, DSH JSON selection, shared relay; 285 regressions + 18 focused checks and five actual native-driver/local-API cases. Live grants remain gated. |
| Other drivers | Deferred | OpenCode and other driver implementations remain deferred. |

## Implemented API and evidence

[Compact extraction receipt](../review/261117-0334-model-transport-extraction.json). High-parallelism GPU fixture failure is retained separately; no tolerance or scientific criterion was changed.


The 0.4 prototype exports `model-transport`, `model-tools`, `model-drivers/traex`, `model-drivers/codex` and `model-drivers/claude`; old TraeX exports are removed. The relay/Source use explicit role/model bindings and a pinned project governance module. Model budget and scientific admission remain separate. Source/state/proofs and detailed [qualification evidence](../../local_artifacts/dsh-research/model-transport/261117-0213/qualification.json) are retained in the worktree artifact area.

Native file-lock scope is one host/PID namespace. CLI shutdown evidence covers the owned POSIX process group; provider-specific escaped-child behavior remains a live qualification gate. Missing served-model evidence is explicitly unobserved; fixture callbacks cannot authorize real vendor/account content. No live deployment, model spend or scientific authority mutation occurred.

## Acceptance and scope

Track each acceptance property from the plan as implemented, passed in declared scope, unresolved or deferred. Fixtures establish mechanism conformance, not served-model identity, provider terms or hosted scientific adequacy. Preserve failures, actual/unknown usage and existing consumed state.

No backward API compatibility is required. Retain historical IDs/artifacts and protect unrelated workspace edits. Detailed execution records remain in ignored package artifacts; this tracker holds concise milestones and gate reasons.

## Revision History

| Timestamp | Change |
|---|---|
| 2026-11-17T02:13:36.898930-08:00 | Created the execution tracker after user authorization and TraeX-only steering. |
| 2026-11-17T03:20:21.873326-08:00 | Recorded 0.4 shared transport implementation, removed prototype aliases, 238/15 scoped checks, source-review repairs and remaining live route/host gates; additional drivers remain deferred. |
| 2026-11-17T03:34:01.033680-08:00 | Finalized 243/15 scoped acceptance, package/source pins and independent review; recorded retained high-parallelism failure and exact live/auth/cutover gates. |

| 2026-11-17T11:32:04.195391-08:00 | Opened Codex implementation in the existing worktree after the new user request; other drivers stay deferred. |

| 2026-11-17T11:48:32.799029-08:00 | Implemented Codex and mixed relay; 262 full regressions passed before the final compaction/type/mixed-relay repairs. Native0.166 local endpoint proves tools/context isolation, omitted-usage zero tuple and context-limit failure; final checks/reviews remain in progress. |

| 2026-11-17T12:02:25.436422-08:00 | Completed Codex raw-protocol mechanism qualification and 265 regressions; retained original exec findings, verified current source repairs, and bounded native/local-auth/live-host claims. No vendor model/GPU dispatch or scientific cutover. |

| 2026-11-17T13:11:25.135939-08:00 | Committed the TraeX/Codex baseline as 8c33295, then opened Claude implementation in the same isolated worktree after the user request. |

| 2026-11-17T13:36:51.130407-08:00 | Completed Claude mechanical qualification, 285/18 checks, actual native driver acceptance/refusal and grouped/cross review. Retained SDK framing/internal-attempt limits and private evidence; Claude live/subscription/backend adoption remains unqualified. |
