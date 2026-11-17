# Review — Pluggable model transport plan

Reviewed: [.plan/261116-1708-plan-pluggable-model-transport.md](../261116-1708-plan-pluggable-model-transport.md), SHA-256 `3addd0d8a5169e7084428ab11a1cd4d2f39c3a0b2c855795e031fe654e55950b`.
Review date: 2026-11-16 23:11 -0800. Scope: document and code review only; no implementation, model call, deployment or scientific execution was performed.
Baseline verified: `HEAD` = `origin/main` = `de8ed8bb5fab6d346639c4d1e27ad37fa2bed8cc`; working tree clean apart from the reviewed plan.

## Verdict

The boundary is right and should be accepted: **transport is a pluggable `LlmAdapter` driver, not delegation of the research agent to a CLI**. The current-coupling section accurately describes the code, the falsifiable-property format is the right shape, and the prototype-replacement stance (no compatibility aliases) is consistent with the repository's own "no backward compatibility requirement" instruction.

It is not ready to implement as written. Three gaps make stated acceptance properties unverifiable or under-authorized, and one earlier claim in the plan is now narrower than the plan assumes.

## Verified claims

| Claim | Result |
|---|---|
| Baseline `de8ed8b`, helper `0.3.2`, contract `2.4.0` | Confirmed (`git rev-parse`, [helpers/package.json](../../helpers/package.json), [docs/contracts.md](../../docs/contracts.md)) |
| "219-test result" | Confirmed: `npm test` in `helpers/` → 219 tests, 219 pass, 0 fail, ~25 s |
| All referenced source files exist | Confirmed: `traex.ts`, `traex-tools.ts`, `traex-context.ts`, `relay.mjs`, `remote-model.mjs`, `source.mjs`, `docs/integration.md` |
| Coupling description | Accurate: `TraexTextAdapter` extends `LlmAdapter` with a fixed model literal ([traex.ts](../../helpers/src/traex.ts#L10-L20)); `TraexToolAdapter` constructs that concrete adapter ([traex-tools.ts](../../helpers/src/traex-tools.ts#L52)) and validates every selection before emitting blocks ([traex-tools.ts](../../helpers/src/traex-tools.ts#L84-L86)); the relay commits request accounting before contacting the model ([relay.mjs](../../helpers/examples/traex-tools/relay.mjs#L99-L102)); the remote adapter pins the model identity ([remote-model.mjs](../../helpers/examples/traex-tools/remote-model.mjs#L9-L11)) |

One claim is weaker than stated: the plan defers "Codex feasibility" as future work, but the current transport already speaks a Codex-shaped CLI protocol (`exec`, `--sandbox read-only`, `--disallowed-tool '*'`, `--ephemeral`, `--json`, `--output-last-message`, `thread.started`/`turn.completed` events — [traex.ts](../../helpers/src/traex.ts#L82-L83) and [traex.ts](../../helpers/src/traex.ts#L112-L116)). See M3.

## High

**H1 — External model transport is an exposure boundary, and the plan does not treat it as one.**
The route contract binds provider, model, driver, configuration, context policy and a *protected authentication* reference, plus spending/resource scope. It says nothing about which **content classes** may leave the project into a CLI/model vendor. Contract 2.4.0 keeps exposure explicitly separate ("These controls do not change separately authorized financial, GPU, scientific-admission or exposure limits", [contracts.md](../../docs/contracts.md#L192)), and DATA-1/DATA-2 bind protected-byte access and release. A full-context, lossless transport can carry protected evidence into a third-party endpoint; that is at least as irreversible as publication.
Required before the canary: add a per-route **context exposure class** to the accepted project profile (allowed content classes, whether protected bytes may ever enter model context, and the project authority that approved it), a refusal path before dispatch when the class is not covered, and an acceptance property ("a protected byte reaches a model endpoint without an authorized exposure decision" fails). Confirmation-off projects should be stated as "protected bytes never enter model context", not left implicit.

**H2 — Route identity is asserted but currently unobservable.**
Acceptance property 1 fails when "a requested unapproved model/driver version is substituted or contacted". The adapter rejects a mismatched *request* ([traex.ts](../../helpers/src/traex.ts#L49-L52)), but the receipt records only the configured values: `model: this.config.model`, `transport: 'traecli exec'`, `thread_id` ([traex.ts](../../helpers/src/traex.ts#L120-L124)). It records neither the CLI version/executable hash nor a provider-reported model identity. `executable` is a bare path taken from configuration ([integration.md](../../docs/integration.md#L80)).
Result: the property cannot be evaluated from existing evidence. Require each route to pin `driver_version`/executable hash and each receipt to capture the observed CLI version and any provider-returned model id; otherwise state the property as unqualified rather than passing.

**H3 — Lossless delivery has no declared input bound.**
Output capture is bounded (1 MiB stdout, 128 KiB answer — [traex.ts](../../helpers/src/traex.ts#L102-L119)), and project-document delivery has `project_doc_max_bytes` ([traex.ts](../../helpers/src/traex.ts#L74)). The literal/stdin path has no bound: `deliveredPrompt` is written and piped whole, with sizes only recorded after the fact ([traex.ts](../../helpers/src/traex.ts#L96-L100), [traex.ts](../../helpers/src/traex.ts#L128)). The file's own revision note refers to a "per-message CLI stdin limit".
Consequence: a large frozen packet consumes a model request (and may partially reach the CLI) before failing. Add a declared `maxEncodedInputBytes` to the route contract, refuse **before** dispatch, and make refusal consume no request allowance.

## Medium

**M1 — "Unknown usage remains unknown" does not match implemented behavior.**
`mapTraexUsage` throws when a counter is missing or inconsistent ([traex.ts](../../helpers/src/traex.ts#L21-L35)), so an unresolved-usage completion is unusable and fails closed rather than being retained as a completion with unknown usage. That is defensible, but the plan's wording implies the opposite. State the chosen semantics: unknown usage ⇒ response ineligible, failure retained, request still charged. (The existing "no synthesized zeros" intent is preserved either way.)

**M2 — Author/reviewer separation basis is unstated.**
One driver, model and credential set can serve both roles. Contract AUTH-1 requires a separate reviewer under the qualified profile policy, and the contract permits same provider/model only when the qualified separation policy allows it. The route profile should record that basis (distinct Session, review preset, scoped review evidence). Otherwise "separate Session, same model" becomes an unexamined default rather than a reviewed decision.

**M3 — Re-scope the Codex stage; it is version/auth qualification, not protocol discovery.**
Because the current CLI protocol is already Codex-shaped, stage 3 is mostly: pin an exact CLI version, qualify authentication and event/usage deltas, and confirm the flag set remains fully tool-denying. Say what would make Codex *infeasible* (e.g., cannot disable tools, cannot report completion/usage, cannot pin version). Conversely, if no concrete Codex project/model/auth requirement exists yet — none is recorded in the repository — stage 3 should not start.

**M4 — No concurrency bound in the route contract.**
The relay tracks active requests, but the plan's responsibility table has no max-concurrency or queue rule. Two Sessions can spawn multiple CLI processes against one authentication and rate limit. Add a declared concurrency bound plus a refusal/queue rule, consistent with EXEC-3's "unknown/unresolved state holds dependents".

## Low

**L1 — Test replacement needs a mapping.** Stage 2 says to "replace tests tied only to obsolete API shapes". Without an old→new coverage mapping (or an explicit retained-deletion rationale), regression coverage can shrink silently. Require the mapping in the stage-2 receipt.

**L2 — State retention should name identity resolution, not only facts.** The plan correctly preserves consumed facts and allows dropping old schema readers. Add one sentence: old record IDs/hashes remain resolvable from retained artifacts even though the new runtime cannot read their APIs (STATE-3), so a later audit does not have to reconstruct identity from the new representation.

**L3 — Name the consumer documents.** "Update current consumers, tests and documentation together" should list at least [docs/integration.md](../../docs/integration.md), the README usage section and the milestone tracker, to avoid the drift the repository already experienced with earlier adapter changes.

## Requested review decisions

| Decision requested by the plan | Recommendation |
|---|---|
| Accept `LlmAdapter` boundary with CLI drivers and shared native tool projection | **Accept.** It matches the implemented seam; no smaller existing DSH interface is apparent. |
| Confirm the first concrete Codex project/model/auth requirement | **Defer stage 3** until a concrete requirement exists; the protocol shape is already demonstrated, so the remaining value is version/auth pinning. |
| Lossless extraction first, separately qualified context projection | **Accept**, but only with H3's input bound and H1's exposure class. Byte round-trip proves representation fidelity, not reasoning equivalence — the plan already says so. |
| Review clean API, cutover, mapping and canary matrix before implementation | **Accept.** Add H1/H2 to that review packet; otherwise the canary will verify behavior while leaving model identity and exposure unauditable. |

## Re-review with the original question

The plan was commissioned by a decision question that is not recorded in it:

~~~text
do you think we need to add support for codex (traex forked from it), claude, opencode, etc
~~~

That asks **whether, and which first**, not only how. The plan answers the design half well and the decision half only implicitly ("add a CLI bridge for a concrete model/authentication requirement"; "Claude/OpenCode follow a concrete consumer/model/auth need"; "no dependency or automatic registration for every CLI"). The implicit answer — add drivers on demand, Codex first — is defensible in direction, but its stated rationale is the wrong one, and one decisive argument is missing entirely.

**H4 — The plan never states why a second driver is needed, and orders the work by cost instead of value.**
The only reason given for Codex first is "Codex's shared lineage is a feasibility advantage" ([plan](../261116-1708-plan-pluggable-model-transport.md#L29)) — that is an implementation discount, not a need. The strongest reason to support a second vendor is scientific: **reviewer independence**. AUTH-1 requires a separate reviewer under the qualified profile policy; an author and reviewer served by the same vendor and model retain correlated errors, so a second vendor is the only way to obtain genuine review independence. The plan mentions the reviewer only as a DSH subagent and never as a motivation for multi-vendor transport.
Without that framing the plan cannot distinguish "needed" from "nice to have", and it will sequence whatever is cheapest to build rather than what the loop requires. Recommended ordering of motives, to be stated in the plan before any driver work:
1. cross-vendor review independence (scientific; contract-aligned);
2. a model capability or cost unavailable on existing routes;
3. subscription/CLI-only authentication where an API key is not available;
4. availability or rate-limit relief (explicitly **not** automatic failover, which the plan already excludes).
"Shared lineage" belongs to cost, not to this list.

**Answer to the implicit fifth decision.** Yes to **at most one** additional driver now, and only if it provides either a different vendor for review or a model/auth route otherwise unavailable. Codex is the cheapest to build; that is not sufficient reason to build it first if its model or auth is not approved for this use. No to OpenCode at this stage: it is a provider matrix rather than one new vendor, and it multiplies the qualification surface (M5). "Etc" should be answered with a stopping rule, not an open-ended registry.

**M3 update — the fork is now confirmed.** With TraeX confirmed as a Codex fork, the current adapter already speaks the upstream protocol, so Codex protocol feasibility is low-risk and the real work is de-branding vendor assumptions plus pinning an exact upstream version. The converse also applies: a fork may lag or diverge from upstream in flags, events and usage fields, so "Codex support" must be validated against a pinned upstream release — not inferred from TraeX's present behavior.

**M5 — Per-driver qualification cost needs an explicit portfolio bound.**
Every driver × model × authentication class × context policy becomes a new scope stratum in the frozen coverage matrix, and contract 2.3.x requires that matrix to be funded from a declared qualification budget. The plan has per-driver gates but no cap, budget rule or stopping condition. Recommend: a maximum of two qualified drivers per profile until actual qualification cost is measured; each new driver must name the cells it adds and fund them from the declared budget; "on demand" must mean an accepted requirement record, not an intention in a plan.

**M6 — Authentication terms are a qualification item, not an implementation detail.**
The entire value of a CLI driver is subscription authentication, but consumer plans (TraeX/Trae, Codex/ChatGPT, Claude) may not authorize unattended, programmatic or multi-user research use. The plan treats authentication as a protected reference and never as a policy question. Add to the route contract: authentication class, the terms basis on which unattended automation is permitted, and the authorized principal; refuse a route whose auth class is not qualified for unattended use.

## User Prompt, Verbatim

~~~text
review `/Users/bytedance/wk/dsh-research/.plan/261116-1708-plan-pluggable-model-transport.md`, and persist it in .plan/review
~~~

~~~text
one missed original prompt is "do you think we need to add support for codex (traex forked from it), claude, opencode, etc". Given that context, review the plan again.
~~~

## Revision History

| Timestamp | Change |
|---|---|
| 2026-11-16 23:11 -0800 | Created the review record: verified baseline/version/test claims against the working tree, confirmed the coupling description, and raised H1–H3, M1–M4 and L1–L3 with recommendations on the four requested decisions. |
| 2026-11-16 23:16 -0800 | Re-reviewed with the originally omitted prompt ("do you think we need to add support..."): recorded it verbatim, added H4 (missing need/value rationale and a cost-based ordering), the implicit fifth decision, an M3 update confirming the Codex fork, and M5/M6 on qualification portfolio cost and authentication terms. |

