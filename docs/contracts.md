# Research-loop contract

Contract ID: `dsh-research/research-loop`.
Contract version: `2.3.3`.
Created: 2026-11-11 17:02 -0800. Updated: 2026-11-11 21:39:00 -0800.
Status: specified design baseline. M1 public encodings and keyless provider fixtures have scoped development checks; independent/full conformance and live qualification remain pending. This document grants no execution or deployment authority.

## Scope and authority

This is the canonical, versioned contract for how dsh-research supports a hosted project's scientific loop through existing DSH/superagent workers, jobs, review, storage and collaboration facilities. It defines obligations and observable evidence, not a replacement scheduler, event bus, database or scientific verifier.

The [project-state/autonomy policy](../.plan/261105-1705-contract-project-state-autonomy-and-feedback.md) governs ownership and standing authority. Project-specific goals, scientific criteria, authorized bounds and explicit stop remain binding. Domain verifiers supply scientific meaning. This contract cannot waive those policies or make an unsupported provider capability available.

The [1604 meta loop](../.plan/261111-1604-architecture-meta-loop-and-migration.md) revisits dsh-research's own architecture. It audits a pinned version of this contract against actual evidence, local-repair results and its separate structural entry gate. Routine project research and defect repair remain separate work.

## Ownership

| Item | Owner and persistent location |
|---|---|
| This contract, reusable code, deliberate package plans and compact engineering qualification | dsh-research Git |
| Goal, scientific policy, deliberate project plans, accepted methods and compact conclusions | Hosted-project Git and explicitly configured canonical project root P |
| Coupled action/review consumption, attempts, charges/reservations, feedback and publication associations | One project scientific writer through existing storage in P; active legacy authority remains until a verified handoff |
| Native Tickets, jobs, Sessions, recovery and delivery records | Existing DSH/superagent facilities configured under P; native state never grants scientific acceptance or refunds consumption |
| Explorative plan snapshots, raw results/logs, captured comments, released bytes and backups | Project-owned artifacts under P and authorized retained exports |
| Package architectural trigger/design decisions | Deliberate dsh-research engineering records referencing permitted project evidence; no copied project authority |

P is independent of worker cwd, worktree, Session, Ticket, Doc or campaign name. Deliberate work versions accepted plans/contracts and useful compact evidence; explorative alternatives retain detail in project artifacts and contribute summaries. Large/raw outputs stay in artifacts in either case. A source hash or local path alone is not a backup or team-access guarantee.

## Binding and qualification

Each frozen action must bind `contract_ref`: contract ID, version, immutable content SHA-256 and source commit or retained snapshot reference. Also bind the package/runtime/provider releases, effective prompt/tool/profile identity, and canonical project/authority identity. Execution must resolve the exact bytes rather than follow a mutable branch or current checkout implicitly.

For each required obligation/profile, record its assurance separately: `specified`, `implemented`, `fixture_verified`, `live_verified`, or `disabled`, with supporting references and known limits. A specified requirement is a design obligation, not an implemented guarantee. A fixture pass does not establish live provider behavior. Required unsupported operations keep their route disabled or held for qualification.

M1 freezes the public encoding/provider mappings and compatibility matrix for the semantic records below. [Encoding v1](../src/records.ts) and [binding checks](../src/bindings.ts) implement a confirmation-off subset; parsing does not grant authorization or qualify provider semantics. Enabled confirmation remains disabled pending its own reviewed encoding and provider checks.

## Four semantic records

| Record | Required information |
|---|---|
| Manifest/action proposal | Original request or exact retained prompt reference; project/goal/checkpoint and plan revision/hash; contract_ref and profile/release pins; candidate tree/configuration including relevant untracked files/modes/submodules; evaluator/interpreter/environment identity; input version/hash/split/purpose and access class; exact resolved invocation; bounds, output schema, domain policy and proposed next action |
| Evidence receipt | Action/admission/attempt and native job/tool/producer identities; actual terminal facts and raw provider status; pre/post identity checks; immutable captured output bytes/hash/size and capture completeness; bound domain-verifier result; supported actual costs and unresolved reservations; execution, evidence and scientific statuses kept separate |
| Review receipt | Exact subject_kind (scientific_action, architecture_entry or contract_revision), matched request/packet hash and scope; separate reviewer Session/provider/preset and supported permission/assurance references; actual completed review evidence; exact proposal/manifest/checkpoint/action hashes; approve/request_changes/defer with reason and evidence; declared consumable scope, bounds and prerequisites |
| Checkpoint | Question/hypothesis, attempted alternative, validity and scientific outcome, rationale/uncertainty, evidence/review references, current charged/reserved bounds and stop state, next decision/action or hold condition, feedback dispositions/effects and applicable exhaustion assessment |

Identifiers must be nonempty stable strings; content hashes are SHA-256 values over exact bytes. Counters are nonnegative integers, excluding booleans; limits/costs must be finite, nonnegative and bound to declared units/rates/rounding. Do not combine unlike dimensions or replace unavailable native facts/costs with zero. Required missing facts keep dependent acceptance/admission unresolved.

Logical action identity derives from the frozen scientific subject and proposed action, not a fresh transport ID. Native IDs remain linked delivery/execution identities. A permitted fresh retry/replacement has its own admitted action/attempt and explicit parent/recovery-policy references; it preserves earlier failures and costs. Re-delivering or resuming the same admitted action is reconciliation, not another launch.

## Invariants

These are required predicates over states and finite execution traces for the bound contract/profile. The falsifiable claim is that an implementation satisfies them in its declared scope. Each counterexample is a violation witness, not a claim that the failure occurred here. Existing native facts and qualified instrumentation must establish the predicate; inferred success is insufficient.

Record each applicable property as pass, fail with a witness, or unresolved with missing evidence. Every not_applicable result must retain applicability evidence: property ID, contract/profile/scope hashes frozen before evaluation, the false precondition and supporting facts, reason, and an existing qualified rule or completed scoped reviewer reference. A caller flag is not evidence; missing or post-hoc scope proof is unresolved. Use not_applicable only when its premise is demonstrably outside the declared profile: for example, DATA-2's enabled-confirmation release checks can be not_applicable under an approved confirmation-off profile with retained applicability evidence. DATA-1 remains applicable in off mode and requires no protected-byte read; confirmation-off does not exempt it. A required but unsupported/unobservable property is unresolved or disables its route; it is not a pass. Passing sampled traces supports only the tested scope. Keep local conformance failures separate from T1's architectural impossibility finding.

### Provenance and evidence representation

| ID | Testable property | Explicit counterexample | Observation/evidence |
|---|---|---|---|
| PROV-1 | Every accepted scientific result and admitted action matches its frozen plan, candidate/configuration, evaluator, input, invocation, contract and relevant profile/environment bindings | A result or action is accepted after an input/candidate hash changes without a new bound review | L1/L3/L5 manifest and pre/post observed identity tuple |
| PROV-2 | For every accepted result, hashing and parsing use the same complete captured artifact bytes, and retrieved bytes match the requested content identity | File A is hashed, the file changes, and file B is parsed while the receipt still cites A | L5 capture/hash/parser-input association, artifact bytes and reproducer instrumentation |
| PROV-3 | Every accepted result satisfies the declared capture-completeness and typed finite-output schema | A truncated capture, missing required field, true in a numeric field, NaN or Infinity is accepted | L5 expected schema, byte size/completeness, parsed values and checker result |

### Review and bounded admission

| ID | Testable property | Explicit counterexample | Observation/evidence |
|---|---|---|---|
| AUTH-1 | Every committed admission has a completed approved review from a separate reviewer under the qualified profile policy, bound to that exact action/subject and consumable scope | Approval for candidate A authorizes changed candidate B, or the author self-approves the action | L2/L3 review subject hashes, producer/role/Session identity and scope consumption |
| AUTH-2 | Every dispatch that can create a new execution uses verified admission proof for its exact action/attempt, establishing durable commit before the qualified launcher invokes dispatch | A job starts before commit, or two timestamps are treated as sufficient order proof without a committed parent | L3 authority/version/sequence and committed tuple proof; L4 matching parent reference plus qualified launcher order witness/native job ID |
| AUTH-3 | Every committed admission satisfies current standing scope, stop state, prerequisites and declared remaining launch/resource limits | A fifth attempt is admitted under a four-attempt cap, or admission commits while stopped | L3 current authority snapshot, checked bounds, counted attempt and reservation |
| AUTH-4 | Replaying the same logical action/attempt cannot create another consumption or execution; a permitted fresh retry has a distinct admitted identity and parent/recovery scope | A duplicate Ticket/completion or renamed Doc causes the same attempt to launch twice | L3/L4 logical IDs, request/native job associations, consumption and recovery parent |

### Execution and uncertainty

| ID | Testable property | Explicit counterexample | Observation/evidence |
|---|---|---|---|
| EXEC-1 | Every result eligible for scientific use has known normal completion satisfying the declared successful terminal condition, without timeout, cancellation, crash, unresolved ownership or identity drift | A timeout handler exits zero with passing JSON and its result becomes scientifically eligible | L4/L5 raw terminal facts, deadline/abort flags, post-run bindings and acceptance |
| EXEC-2 | A definitively timed-out, cancelled, crashed or drifted attempt remains ineligible across parsing, duplicate delivery, restart and replay | A later parser or duplicate receipt overwrites interrupted/invalid with completed/valid | L5 original invalidity witness and subsequent decisions for the same attempt |
| EXEC-3 | While launch, terminal state or durable settlement is unresolved, dependent admission remains held and applicable reservations remain retained until trustworthy reconciliation | Heartbeat expiry or worker loss frees the reservation and starts a dependent/replacement job without query/teardown proof | L3–L7 unknown-state, reservation and hold records plus actual reconciliation evidence |
| EXEC-4 | Scientific verdicts follow the bound domain verifier and eligible evidence; a trustworthy negative result is not mechanically invalidated merely because it fails to improve the metric | A valid negative is relabeled invalid solely for a poor score, or a positive claim overrides a negative verifier | L5 verifier identity/output, mechanical validity and L6 claim/disposition |

### Authority and historical continuity

| ID | Testable property | Explicit counterexample | Observation/evidence |
|---|---|---|---|
| STATE-1 | Each coupled scientific authority has one active authorized writer, and participating worktrees/profiles for the same project resolve its registered authority rather than initialize another | A cloned worktree creates an empty budget/opening authority for the same project, or two writers independently admit from conflicting copies | L0 bindings, registered authority identity and writer/handoff records |
| STATE-2 | Settled charges and consumed attempt/action/review/opening history cannot decrease or disappear through replay, restart, rename, migration or rollback; reservation release requires eligible settlement under policy | A stale backup replaces post-cutover consumption, or renaming a campaign refunds its failed attempts | Before/after committed consumption sets/counters, settlement and migration references |
| STATE-3 | An immutable plan/result/message/evidence identity always resolves its original bytes/hash; corrections append a new version and causal supersession rather than rewrite it | Existing result metrics are overwritten under the old artifact ID/hash | Frozen payload bytes, version/hash resolution and correction/supersession links |

### Protected-data access and release

| ID | Testable property | Explicit counterexample | Observation/evidence |
|---|---|---|---|
| DATA-1 | Disabled-confirmation profiles read no protected bytes; enabled access is preceded by a durable authorized opening covering the frozen scope and registered exposure identity, with no forbidden overlap | Dataset hashing reads protected bytes before consume commits, or a branch rename permits an overlapping opening | L0/L3 access policy, consume acknowledgement before instrumented first read and exposure history |
| DATA-2 | Every enabled-confirmation release passes the exact project-authored, reviewed and pinned release schema before crossing to development/review/publication; only its permitted finite aggregates are emitted | Raw labels leak, an unbound profile whitelist expands allowed fields, or release proceeds without a schema | Project/domain schema owner and hash/review; evaluator/profile binding; actual emitted bytes and qualified release-boundary verdict |

### Scientific continuation

| ID | Testable property | Explicit counterexample | Observation/evidence |
|---|---|---|---|
| LOOP-1 | At a checkpoint with an admissible successor and no explicit stop or unresolved operational hold, continuation has no required human-comment or human-approval dependency | A valid negative has an admissible diagnostic, but the worker waits solely for a teammate to read/approve a Doc | L6/L7 eligibility, stop/hold facts and recorded dependency/reason |
| LOOP-2 | Every revived rejected path cites its prior rejection and a reviewed material change in assumptions, evidence or context; transport/name changes alone do not qualify | The same rejected method/input is rerun because a new comment or Ticket supplies a fresh ID | L1/L6/L7 parent rejection, changed-context snapshot and scoped review |
| LOOP-3 | Required human scientific steering is supported by a scoped exhaustion record, tested alternatives, materially different rebrainstorm and separate completed exhaustion review; an operational hold alone cannot satisfy it | The author requests a new scientific direction solely because permission is missing, budget is uncovered or a job is unknown | L8 exhaustion subject/evidence and review, alternatives, unblock conditions and hold classification |

### Feedback and publication

| ID | Testable property | Explicit counterexample | Observation/evidence |
|---|---|---|---|
| FB-1 | A feedback watermark advances only after its complete bounded scan and exact eligible source versions are durably captured/queued; duplicate versions do not mint new scientific actions | A scan stops after page one but advances the cursor past unread comments, or an edited body replaces its old version | F1 scan/page/completeness, source version/body hash, durable queue/cursor association |
| FB-2 | Adoption links a changed frozen plan/action; an executed-effect claim has its corresponding actual receipt, while unexecuted effects remain explicitly pending/failed | A comment is marked adopted with no changed action, or a Doc update is reported as the scientific effect without execution evidence | F2 disposition, frozen successor, review, actual effect receipt and response association |
| FB-3 | A publication/reply retry causes no additional scientific admission, charge, review consumption or opening; concurrent unrelated research changes are attributed to their own actions | Retrying a failed Doc append relaunches the benchmark or restores its old budget | F3 stable operation ID, causal effects and scientific-state mutations by originating action |
| FB-4 | A release marked verified/complete has fetched content matching its intended checkpoint/assets and verified access for the declared audience | A 200 response is called complete while figures point to an inaccessible local path or private asset | F3 refetch/content/hash, checkpoint marker and recipient/asset access evidence |

Each predicate is evaluated at its listed L/F boundary with declared provider mappings. None supplies a universal exactly-once process guarantee, filesystem secrecy from Session separation alone or a hard resource ceiling from worker count. Unsupported required evidence remains unresolved; it cannot be hidden by reducing the declared test scope after a failure.

## Admission order proof

L3 produces admission proof through the qualified existing state/provider boundary: registered authority identity, committed state revision/sequence or qualified opaque commit receipt, action/attempt ID, manifest hash and durable acknowledgement reference. The committed tuple must be resolvable and verified against that authority; an invented token or caller approval flag is insufficient.

L4 references that exact proof and retains a causal order witness from the qualified launcher: verified commit acknowledgement is awaited before dispatch, and the dispatch/start association carries the same admission parent and bound action. Use native monotonic versions/sequences or a qualified single-writer causal chain in existing records. A sequence or token alone proves neither durability nor authority; M1 must validate its meaning and M2 must preserve the actual control-flow/order association. Comparing wall timestamps alone cannot pass AUTH-2.

If the provider cannot supply/validate that proof or commit outcome is unknown, hold launch. M1 freezes the public mapping; this requirement creates no new store, transaction service or assertion of an existing unsupported API.

## Reviewer availability and operational holds

An unavailable, interrupted or unresolved reviewer makes the dependent action non-admissible at L2. Record review_unavailable/unresolved with exact request/action identity, owner, retained costs/reservations, next reconciliation/retry condition and a bounded reassessment deadline. Known failure may retry or use an already qualified equivalent reviewer within standing review/model bounds; rebind/review changed profile identity when required. Unknown dispatch must be queried/reconciled before another reviewer launch. No self-approval, human-signoff substitute or silent waiver of AUTH-1 is permitted.

LOOP-1's admissible-successor premise is false during that hold, so no contradiction authorizes a weaker review. Continue unrelated admissible work; use existing completion/source/scheduled wakeups. Reassessment expiry requires an owner disposition, not automatic execution. Every disabled/held required route records cause, affected scope/property, evidence, owner, exit conditions, next event/check and deadline; continued disablement remains visible unmet qualification, not a completed repair or scientific exhaustion. Permanent unsupported scope requires a deliberate prospective decision and cannot erase earlier failures or bypass inherited policy.

## Project release-schema authority

The project/domain evaluator owner authors the release schema in versioned project configuration or the deliberate confirmation plan. It declares allowed selectors/fields, types/finite checks, aggregate meanings/support, forbidden raw labels/logs and recipient surfaces. The project's policy authority and separate scoped review bind it to the exact opening, candidate, evaluator and input/cohort scope.

The effective profile pins and transports release_schema_ref (ID/version/content hash, owner and approval/scope refs); it cannot widen the schema independently. The evaluator produces the declared aggregates, and the qualified existing confirmation/release boundary validates captured outputs before any release. dsh-research checks binding/types and the trusted domain verdict, rather than inventing aggregate semantics or a statistics engine. Missing, changed or unqualified schema blocks the enabled opening/release; initial confirmation-off policy remains unchanged.

## Normative stages and transitions

| Stage | Responsible actor | Required inputs and resulting evidence | Allowed transition / failure treatment |
|---|---|---|---|
| L0: bind authority | Project author through qualified providers | Existing project/goal policy, canonical P/authority, contract_ref, release/profile and supported limits; binding/compatibility record | Proceed to L1 only within standing scope. Missing authority/history/capability is a hold; never create fresh credit or infer no exposure |
| L1: freeze proposal | Project author | Evidence-backed question/action; retained prompt and exact plan/source/input/evaluator/invocation/bounds; immutable manifest/hash | L2 for the exact proposal. Missing identity or forbidden input access is refusal/hold. Later edits create a new revision |
| L2: scoped technical review | Separate agent reviewer; author collects | Exact L1 packet, evidence, review/model bounds and next-action scope; completed bound review receipt | Approve permits L3 checks. request_changes returns to L1. Unavailable/unknown review enters the explicit operational hold; qualified bounded recovery only, no self/human substitute |
| L3: consume admission | Single project scientific writer using existing public storage | Current review/action, stop/prerequisites/bounds; durable consumption, attempt/reservation and verifiable admission proof | L4 requires verified committed tuple/version/sequence or qualified commit receipt. Duplicates return existing status; missing/unknown durability proof holds launch |
| L4: publish and execute | Existing qualified job/worker route | Exact spec, verified L3 admission parent and qualified launcher order witness; native dispatch/start/job and deadline/stop associations | Invoke only after commit proof. Completion proceeds to L5; dispatch acceptance is not start. Lost associations remain unresolved until actual query/settlement; no blind duplicate launch |
| L5: settle and validate | Author/checker plus existing domain verifier | Actual terminal receipt; captured complete bytes; pre/post identity; bound verifier and actual supported cost facts; evidence receipt and settled/unresolved reservation | Known eligible evidence proceeds to L6. Interrupted/crashed/cancelled/drifted/truncated evidence stays invalid. Unknown outcome retains reservation and holds dependents; diagnosis remains admissible within policy |
| L6: interpret checkpoint | Project author | L5 facts, domain verdict, evidence/counterevidence, costs and relevant feedback; immutable checkpoint/decision | Valid positive, negative or inconclusive results inform the next scientific decision; invalid evidence informs diagnosis only. No automatic promotion from metric rank or job-ready state |
| L7: continue, pivot or hold | Author; separate review for a new action | Frozen successor/recovery or owned hold with evidence, exit/revisit conditions and reassessment deadline | Admissible work returns to L1/L2/L3. Reviewer/other holds resume only on qualified conditions; deadline alone grants nothing. Campaign boundaries do not reset goal consumption |
| L8: complete or request scientific steering | Author plus separate exhaustion reviewer | Fulfilled goal, explicit stop, or scoped exhaustion record with tested alternatives, orthogonal rebrainstorm, unblock choices and reviewer result | Fulfilled goals complete normally. Only challenged scientific exhaustion raises required scientific direction. Missing permission, uncovered budget or unknown process remains an operational hold |

Author/reviewer work must have its declared standing/model bounds checked before dispatch. L3 consumes the scientific attempt; it does not retroactively authorize earlier paid review or reasoning. Preserve their actual costs through existing supported accounting.

The author/reviewer is activated by existing completion/source/scheduled routes. A stage record documents obligations and observations; it is not a new orchestrator. Running work obeys its frozen profile, and new action admission cannot depend on a speculative event or an unrelated newer review.

Execution status, evidence status and domain verdict remain separate. Suggested normalized labels are `not_started/running/completed/interrupted/cancelled/crashed/unknown`, `pending/valid/invalid/unresolved`, and `positive/negative/inconclusive/not_assessed`; M1 records their exact native mapping. A valid negative result has eligible execution and trustworthy evidence while failing to support improvement. A passing-looking value from invalid execution cannot supply positive scientific support.

## Required failure treatment

| Observation | Required result |
|---|---|
| Timeout handler writes a passing result and exits zero | L5 records interrupted/invalid; preserve result and charge; no positive acceptance |
| Crash after L3 but before job association | Attempt remains consumed/reserved; query existing ownership before any permitted recovery; no second publication for the same intent |
| Normal completion with trustworthy negative domain verdict | Record valid negative; allow evidence-backed diagnosis/pivot within scope |
| New plan, input or provider/profile bytes after review | PROV-1/AUTH-1 reject dependent acceptance/admission; freeze and review the changed action |
| Duplicate completion, review, comment or publication delivery | Return/reconcile original associations; do not spend, open or launch twice |
| Worker/runtime restart without terminal settlement | Keep unknown ownership/reservation and use actual query/teardown evidence; a restarted Session does not prove continued or stopped execution |
| Final/sealed input referenced under the initial profile | Refuse before protected-byte access; no new ledger or implicit enabled-confirmation path |

The bounded Accorde pilot remains a proposed released-input example: at most four benchmark attempts, each with a 60-second timeout reservation (240 seconds total), concurrency one, no fan-out/GPU collection/fresh confirmation. Retries count within the four. Model/reviewer work and runtime overhead require their own declared bounds. This example grants no launch authority, and a campaign bound is not a goal-exhaustion rule.

## Feedback and publication side channels

| Stage | Obligation and evidence | Effect on the scientific loop |
|---|---|---|
| F1: capture | Existing source/scheduled reader completes a bounded paginated/incremental scan; captures source/actor/ID/body version/hash, referenced checkpoint and pending queue through project storage before advancing its cursor | A duplicate version is a no-op; an edit is a new captured version. Partial/unavailable scans advance no watermark. Restart reloads pending records |
| F2: assess | Author assesses at a safe boundary and records adopted/rejected/deferred/stale, rationale and reassessment condition. Adoption links a new frozen action, scoped review and actual executed/failed/pending effect | Collection/read/resolution is not adoption; adoption is not execution. Feedback cannot alter an active snapshot, mint an unchanged action or waive scope/validity/bounds/exposure |
| F3: publish/reply | Retain exact permitted release bytes and manifest; bind checkpoint/operation/native Doc/file identities; fetch revision, patch narrowly, preserve human comments, refetch and reconcile uncertain delivery before retry. Verify intended audience can access required assets/source/data | Publication retry changes no scientific consumption. Missing comments, unavailable Docs or failed publication do not block unrelated admissible execution; retain local decision and retry transport only |

Lark/Feishu is a presentation and feedback source. Actual captured decisions/evidence remain in P. Credentials, private labels and raw restricted logs are excluded from ordinary releases. A local Session path, content hash, signed delivery URL or Doc access alone does not prove artifact persistence and recipient access.

## Trace envelope and expected-versus-observed audit

Attach trace associations to existing provider records and immutable artifacts; use existing persistence/exports rather than another event service. Each relevant observation needs:

- Project/goal, contract_ref and package/provider/profile identity; stage/event kind and assurance scope.
- Action/admission/attempt/review and actual native Session/job/tool/source IDs, with causal parent/reference hashes.
- Actor role and producer evidence; source occurrence/receipt times and sequence where available. Missing historical fields stay disclosed; timestamps alone do not establish order.
- `expected` obligation/invariant reference and `observed` operation/status/payload reference. Mark proposed, actually observed, invalid, unresolved and unavailable evidence distinctly.
- Source/output/plan hashes, raw terminal facts, capture completeness, supported reservation/charge dimensions, units and rate/version where relevant.
- Receipt/archive/capture/publication state and permitted reference/audience; correction/supersession links without rewriting original bytes.

Do not synthesize success events from a requested transition. A latest assignment report, delivered message or accepted dispatch is a view/communication fact, not execution or scientific qualification. Derive expected traces from the bound contract and profile; compare observed native receipts without rewriting evidence to fit expectations.

For costs, distinguish required package coordination/review/persistence from scientific workload time. Record stage-attributed elapsed/resource/model cost, cohort/denominator and overlapping activity; do not add overlapping wall intervals as serial time or equate worker slots with a global resource budget. Actual spent cost, unused reservation and consumed logical attempts are different facts.

## Requirement review and contract revision

Triage has three decision paths: supported local repair; a justified requirement/applicability revision; or qualified architecture review. A potentially mistaken/over-constrained requirement may be challenged using its rationale, permitted evidence and alternatives. Freeze a proposed contract/scope delta with a completed separate review, compatibility, qualification and migration before prospective adoption. This is a parallel contract-revision path, not a T1–T4 shortcut.

Inherited project/user safety, validity, budget, stop and exposure requirements remain non-waivable unless their actual authorized owner changes the governing policy. Protected-byte hashing still counts as access under the bound protected classification; public metadata can be classified prospectively from independent permitted evidence, not by first viewing protected contents. A revised requirement cannot retroactively relabel invalid results, refund consumption or make exposed data fresh. Report requirement supersession distinctly from repairing an architectural witness.

## Structural assessment evidence

Freeze a finite supported repair matrix before the structural conclusion: configuration, narrow adapter, public facade/equivalent qualified route, compatible-version choice, and authority-preserving correction. Each row names candidates, scope/bounds, attempted results or concrete rule-out/not-applicable evidence and reviewer basis. A changed ownership/trust/service boundary is an architecture candidate, not a local repair disguised as one. Unresolved relevant rows do not prove insufficiency; unavailable budget/permission alone is an operational condition, not impossibility.

Repeated failed trials establish empirical failure of those candidates, not universal impossibility. T1 requires an independent structural explanation of why the adopted composition/declared repair space cannot enforce the accepted requirement, with reproducible traces or a bounded capability/authority argument. It does not require testing every conceivable future implementation, and a completed checklist alone does not establish a structural barrier.

Architecture-entry and contract-revision decisions reuse the review-receipt semantics with a distinct subject kind (architecture_entry or contract_revision, rather than scientific_action). Bind package scope, contract_ref, package/provider/profile, requirement/applicability, witness/evidence, repair-matrix hash, T category, cost and proposed assessment/next action. Retain a separate reviewer Session/provider/preset, actual successful completion, qualified role/producer evidence, decision/reason and exact packet hash. A provider/model need not differ if the qualified separation policy permits it; a model alias, conversation agreement or author flag is insufficient. Package receipts cannot authorize scientific actions by changing the subject kind.

An entry used against changed bound contract/profile, requirement, witness/cohort/evidence, repair matrix, scope or cost is stale and requires a new applicable review. A superseding local fix or changed applicability also requires reassessment. Preserve the old immutable decision and active frozen-run bindings; an unrelated repository edit does not rewrite their history. T4 limits, units, rates, cohort, denominator, sampling/statistic and observation window must be frozen before the relevant measurement, with order evidence, not accepted after seeing a convenient result.

Distinguish T2 missing capability from T3 joint incompatibility. T2 has a required obligation that cannot be satisfied even in isolation within the accepted composition. T3 requires positive isolated witnesses for each obligation under the same bound contract/profile and permitted configuration space, plus a joint failure and repair that breaks the other obligation. Missing evidence is unclassified, not a weaker T2 fallback. Related symptoms use one episode/primary classification with secondary links, not duplicate admission/cost.

After a reviewed architecture change, qualify every applicable property and retain evidence for not_applicable cases. Rerun the frozen original reproducer/paired workflow/operating-envelope witness under the new composition and record that it no longer occurs in the demonstrated scope. A better unrelated metric is not sufficient. If the requirement itself was prospectively revised, record its supersession/compatibility and old failure rather than claim the unchanged witness was repaired. Finite regression evidence does not prove universal absence.

## Audit interface for T1–T4

Contain the affected dangerous/unresolved route, retain evidence and reconcile execution immediately; that requires no architectural trigger and review must not delay it. Then freeze the still-applicable accepted requirement, baseline contract_ref, supported profile/capability mapping and qualification level. A defect against the contract first enters local triage. A required design obligation can have a structural counterexample before deployment, but it must not be reported as a violated live-qualified guarantee without that assurance evidence.

| Trigger | Contract and trace evidence needed | Additional structural finding required by 1604 |
|---|---|---|
| T1: invariant cannot be enforced | Cite the violated category/property ID and affected L/F stage; compare expected obligation with bounded operation/authority trace on exact versions; preserve reproducer and repair results | Retain the finite repair matrix plus structural barrier in adopted scope; empirical failures alone are insufficient. Identify the authority/contract/composition boundary that must change |
| T2: required semantics cannot fit composition | Cite required L/F operations and approved profile compatibility; compare native lifecycle/storage/review semantics with the contract; test configuration/adapter/facade/compatible-version routes | Show a required capability missing even in isolation; do not use T2 to bypass T3 joint-conflict evidence or classify an optional feature/API rename |
| T3: coupling creates supported-workflow conflict | Bind two relevant manifests/profiles, their required obligations and paired traces/dependency maps; record a repair that satisfies one but breaks the other | Show each requirement works in isolation under the same bound profile, but jointly conflicts with paired failure and cross-breaking repairs; no T2 shortcut, recurrence or file-count proof |
| T4: architectural overhead defeats envelope | Bind accepted envelope_ref/W/D and separate qualification-budget reference, pre-measurement units/rates/cohort/statistic, original C_run/C_qual total and causal attribution. Use the [qualification-cost rule](#qualification-cost-budget-and-t4-accounting) and [arbitration](#budget-and-envelope-arbitration-for-t4); retain local optimization and original-window result | Qualification-only failure first receives plan/baseline review; qualify architecture only for evidenced avoidable required steps with the full structural gate. Budget pass, expensive coverage or short W alone is insufficient; extended horizons do not erase failure |

The package design author and separate reviewer own the structural entry decision. Project scientific evidence stays in P; the package records permitted immutable references and compact engineering findings. All three 1604 conditions remain necessary: material blockage, architectural cause and insufficient narrower repair. This contract introduces no automatic trigger, deployment grant or new authority.

## Historical trace query

Resolve a trace by exact contract ID/version/content hash and original property ID against its retained snapshot and native origin. Missing bindings/snapshots return unresolved; never infer current semantics from a familiar ID. Keep old labels/bytes intact. If an actual cross-version audit needs a concordance, create a separately reviewed one-off query-only relation (equivalent, split, partial or changed) for that case; it grants no current conformance, alias or automatic migration. No legacy trace case is supplied by this review, so no concordance is invented.

## Declared-scope coverage and qualification

M1 freezes a qualification plan before evaluation. Bind its contract/content hash, source/provider/profile, assurance target, scope strata, applicable property IDs, supported L/F transitions, feature modes, native failure/lifecycle classes, known interaction risks, case fixtures and expected assertions. Scope strata include each claimed provider/version/profile configuration and relevant input/authority/deadline/recovery mode; define supported equivalence classes and their rationale rather than silently generalize from one fixture. M4 checks the frozen plan and results. These are ordinary engineering records, not a new scheduler or scientific database.

The finite required coverage matrix is the union of these obligations:

| Coverage class | Minimum required cells for the claimed scope |
|---|---|
| Property behavior | For each applicable property in each claimed scope stratum, at least one satisfying case and one controlled rejecting-witness case; cover every distinct failure shape explicitly listed in the contract or accepted plan (such as truncation, missing fields, bool-as-number, NaN and Infinity) |
| L/F boundary | Each claimed transition affecting admission, ownership, validity, consumption or feedback has its successful branch and relevant rejection/defer/replay branch. This includes L0/L1 binding, L1/L2 freeze/review, L2/L3 approve, L3/L4 commit-before-dispatch, L4/L5 terminal, L5/L6 verdict, L6/L7/L1 successor, L8 completion/exhaustion and enabled F1/F2/F3 capture/assessment/publication paths |
| Feature mode | Test every mode claimed supported, with off/on guard cells when both are claimed. Initial off-only confirmation needs DATA-1 refusal-before-read tests and evidenced DATA-2 not_applicable; it grants no enabled-release qualification. M5's required feedback path cannot be excluded to shrink the matrix |
| Lifecycle and faults | Cover declared first-run, durable-settlement replay/restart, unknown dispatch/running loss, duplicate delivery, stop/expiry and any claimed migration/rollback behavior. Do not claim running-job survival from a settled-restart test |
| Interactions | Include the accepted risk combinations: source drift plus stale review; duplicate/concurrent admission plus authority/recovery; timeout-zero plus parsing/late delivery; confirmation mode plus schema; and publication retry plus concurrent research. Any justified exclusion needs frozen scope/applicability evidence and review |

Each cell records a stable cell ID, scope-stratum/property/transition/mode reference, satisfying/rejecting/recovery case kind, fixture/source/input hashes, expected predicate and evidence, assurance level, actual native trace/receipt and assertion results. One execution may cover several cells only if each assertion and observation is explicitly associated. An interrupted or missing test observation is unresolved, not a passing negative test.

A rejecting-witness test passes only when the implementation detects/refuses/holds the controlled violation as specified; observing an accepted violation is a conformance failure. A negative scientific verdict is a separate valid-result case. not_applicable cells retain the pre-evaluation contract/profile/scope and premise proof required above, including qualified rule/review references; unsupported required cells cannot be removed from the denominator.

Qualification for a declared assurance/scope requires every required cell to have matching eligible observations and passing expected assertions, all not_applicable proofs to be valid, and no unresolved/failed required cells. Report required, covered, failed, unresolved and evidenced-not-applicable cell IDs, not just a global pass count. Coverage is complete only for that frozen matrix; fixture evidence cannot satisfy live-qualification cells. The minimum case counts do not prove all possible inputs or interleavings: additional domain/statistical sampling criteria and scope-class equivalence must be prospectively frozen and reviewed where required.

Newly discovered witness/fault strata extend or reopen the plan and require applicable review/qualification. Narrowing scope needs a new prospective reviewed plan/contract decision and preserves old failures; do not delete failed cells or reinterpret old results. No coverage execution or completed matrix is claimed by this specification.

## Qualification cost, budget and T4 accounting

Here qualification means dsh-research/provider contract conformance, not the project's scientific validation/replication or final confirmation. Calling a domain evaluator as a conformance fixture does not make that engineering cost scientific workload.

Before evaluation, the M1 qualification plan must freeze a qualification_budget_ref with owner/authority, declared units/rates, required cell counts by stratum/mode, distinct planned execution count and cell-to-execution associations, setup/capture/storage/reviewer work, supported cost estimates, retry/failure reserve, total ceilings and deadline/observation window. The matrix is an explicit union of required cells, not an automatic Cartesian product of every dimension. Shared evidence may cover multiple cells only with separately justified assertions and compatible assurance.

Check the full planned cost and available authority before starting qualification work; collect actual source/native execution and model/review costs against that budget. The coverage-completion rule never overrides a budget. If required cells cannot close within available scope/bounds, remain unqualified and hold or propose a reviewed new plan/requirement/budget; do not omit failed cells, infer zero for unknown cost or spend beyond authority. A qualification-budget or coverage shortfall follows the [owned operational-hold rule](#reviewer-availability-and-operational-holds). Record owner, qualification/profile/scope and affected required cells, cause/evidence, current budget/consumption, exit conditions, next event/check and reassessment deadline. Hold qualification/adoption until a valid exit condition is met; a review deadline alone neither grants budget nor completes coverage. Keep prior failures/reservations and continue unrelated admissible work. A proposed plan/budget change is not an exit event until covered by actual standing authority and applicable review.

Use existing accounting and job controls, not a second financial ledger. Package engineering costs stay in package records; project adoption costs stay under P's existing authority and receipts.

For T4, distinguish recurring coordination/review/persistence cost C_run from one-off/incremental qualification/requalification cost C_qual. Include C_qual in package-coordination totals, separately from scientific workload C_science. Pin envelope_ref (accepted version/hash, window W, workflow denominator D, cost units/rates, ceiling and allocation rule) before measurement. Default amortization uses H = W and the accepted D; a different period/count cannot silently replace that envelope.

Report the original-window total C_run(W) + C_qual(W) and the corresponding accepted-denominator result, including upfront/incremental qualification attributable to that claim under the original accepted allocation. Do not hide cost by placing payment/setup outside W or inventing additional future workflows. A longer horizon or larger denominator requires its own prospective scoped review/authority and separate result; always also report and retain the original W/D cost and pass/fail. An extended-horizon pass cannot override an original-window failure. Changing the actual accepted envelope uses the reviewed contract/requirement-change lane and preserves the earlier result.

Freeze timing boundaries, workflow cohort/denominator and attribution with the envelope before observation. Steady-state C_run and lifecycle coordination including C_qual remain separate declared claims; show both when both are asserted. These conditions bind the earlier pre-measurement rule to an accepted envelope, rather than merely allowing any convenient prospective horizon.

Implementation/migration/change costs and qualification overlap are reconciled by linked work/execution IDs and a predeclared allocation rule, with each physical cost charged once. Read-only reuse of an already admitted scientific trace adds qualification analysis cost, not a second charge for the original execution. Do not hide conformance fixtures under scientific cost because they use the same benchmark or tools. Different units/rates and overlapping elapsed work retain their existing typed/causal treatment.

A qualification-budget overrun or qualification-only envelope failure uses the [budget/envelope arbitration](#budget-and-envelope-arbitration-for-t4): owned plan/baseline triage first, not automatic T4 or scientific exhaustion. T4 still needs an accepted material envelope violation, attribution to required architectural work and insufficient narrower optimization. Its redesign/canary/qualification cost and expected recoverable benefit are compared explicitly. Applicable existing hard ceilings must be qualified; documentation estimates alone cannot claim a provider financial/resource guarantee.

## Budget and envelope arbitration for T4

Qualification budget and an operating envelope are different constraints with their own bound references, units and purpose. The Accorde pilot's 240 seconds is a benchmark timeout reservation, not automatically the package-coordination window W or a qualification budget. Compare only against the actual accepted envelope, retaining its original W/D and C_run+C_qual result.

| Observation | First disposition | T4 eligibility |
|---|---|---|
| Qualification budget cannot fund required coverage, irrespective of envelope result | Owned qualification hold and prospective plan/budget review; coverage remains incomplete | Not automatic T4 or scientific exhaustion |
| Budget suffices and original accepted envelope passes | Continue qualified plan/adoption checks | No envelope-violation trigger |
| Budget suffices, but C_qual alone produces original-envelope failure while recurring C_run fits | Record the failure and hold affected adoption when the exact accepted envelope_ref declaration marks it binding; review matrix size/reuse, one-off baseline/operating assumptions and requirement validity first | The raw qualification bill or short W alone is not architecture entry |
| C_run violates its accepted bound, or an identified C_qual component is demonstrably caused by an avoidable required architectural step | Local attribution/optimization and requirement/baseline validation first | Candidate T4 only after material blockage, architectural cause, finite narrower-optimization insufficiency and separate scoped review |
| Attribution, units, scope or envelope baseline is unresolved | Keep observed costs/failure and owned measurement/qualification hold | No inferred T4 qualification or fabricated pass |

Envelope binding, owner, units, ceiling, W/D and allocation come from the exact accepted declaration resolved by envelope_ref, including its accepted policy reference. The analyst or adoption caller cannot override binding as a second interpretation. A missing/unverifiable declaration holds that envelope assessment.

C_qual remains in total package-coordination cost even when triage chooses the plan/baseline lane. To escalate a qualification-driven case, compare the same accepted required logical coverage under bound alternative implementations or causal trace evidence; identify the architectural step and eligible optimization results. Freeze the attribution/allocation method before analysis, and preserve every physical charge once. Neither inherently required conformance work nor an expensive matrix by itself proves architectural overhead.

A prospectively reviewed requirement/envelope revision may correct an unsound baseline but cannot rewrite the original-window failure, remove failed cells or refund consumption. All three 1604 entry conditions still apply; a budget pass does not certify an envelope pass, and an envelope failure does not by itself authorize redesign.

## Compatibility assessment of new obligations

This register was established in 2.3.2. Rows 1.0.0–2.3.1 are retrospective assessments recorded at that time; they do not claim a release-time review. Original decisions remain in each version’s revision history and retained snapshots. The 2.3.2 and later rows are contemporaneous with their contract revisions.

Maintain this cumulative register for every contract version, not only the latest correction. A new version must have a row matching the header and naming its changed obligations, semantic/encoding compatibility consequence, affected consumers and required review/qualification. Release/adoption checks must reject a missing current row; do not assume a patch/minor label or unchanged property IDs means no obligation changed.

| Contract version | Added/changed obligations | Compatibility assessment | Affected consumers/adoption gate |
|---|---|---|---|
| 1.0.0 | Initial record/stage/identity, review, admission, evidence and continuation specification | Specified baseline; no implemented public encoding or live qualification established | M1 must freeze actual mappings; project adopters pin exact bytes/profile |
| 2.0.0 | Category-specific testable predicates, counterexamples and applicability outcomes replace flat IDs | Identifier/granularity change; no aliases or retrospective trace relabeling | M1/M4 and audit/query consumers use the version-bound property set; M6 preserves old snapshots |
| 2.1.0 | Admission order proof, reviewer holds, release-schema ownership, applicability proof and scoped structural review | Additional evidence/record obligations; old encodings/qualification cannot be presumed sufficient | M1–M4 qualify proof/schema/review mappings; M6 assesses affected adopters |
| 2.2.0 | Mandatory frozen qualification cells, scope closure and reviewed scope changes | New coverage obligations, not editorial clarification | M1 freezes scope/cases; M4 provides evidence; M6 revalidates adoption claims |
| 2.3.0 | Qualification budget and C_run/C_qual cost attribution, explicit anomaly annotation | Added budget/accounting obligations; typed cost-purpose and authority mappings need review | M1/M4 and T4 consumers bind accounting; M6 inventories actual adopter impact |
| 2.3.1 | Amortization pinned to accepted W/D, owned qualification holds, explicit T4 combined cost evidence | Tightened cost/evidence/hold obligations despite unchanged IDs and patch label | M1/M4/M6 and T4 consumers reassess envelope and hold data; preserve original-window failure |
| 2.3.2 | Cumulative version assessment and budget/envelope/qualification-cost arbitration | Added release/adoption completeness and triage rules; conformance remains prospective | Documentation gate requires this row; M1/M4/M6 and 1604 apply explicit cost classification before T4 |
| 2.3.3 | Machine-checkable compatibility row binding, retrospective assessment labeling and accepted-declaration envelope binding | Added qualification/adoption reference encoding; parsing is not semantic compatibility or adoption approval | M1 encoding/checks bind register bytes, table and row hash; M4/M6 and T4 consumers retain review and accepted envelope authority |

Qualification/adoption records must carry compatibility_row_ref: register artifact URI/exact-byte hash/size, contract version, stable row ID, row content hash and compatibility table hash. [Machine-readable register](compatibility.json) mirrors the table and labels assessment timing. The binding checker rejects a missing current row, drifted register/table/row bytes or mismatched contract version. A checked reference is necessary but does not establish semantic compatibility.

No adopted running profile is evidenced in this repository; M1 encoding/provider development does not qualify a project deployment. The current edits perform zero runtime/schema/state migration here, not a verified zero-impact conclusion for every external adopter. Before adopting a row, M1 must qualify its public encoding/assurance, M6 must inventory exact old/new adopter bindings, and the scoped review must record compatible, incompatible or unresolved transitions and necessary tests/migration. Old receipts remain evidence for their original bound version.

Future entries also retain baseline/delta/evidence references and the explicit review decision in the deliberate change record. Unknown affected adopters or unverified encoding behavior stays unresolved; the register does not manufacture compatibility from an absent implementation.

## Document timestamp meaning

Created identifies initial authoring. Updated and the latest revision row identify the final content write for that revision, with timezone and second precision. A later validation receipt has its own execution time and binds exact document hashes; it may legitimately postdate the document it checks. Filesystem mtime may change through copying/checkout and is not native happens-before proof. Preserve prior reviewed bytes and timestamp anomalies rather than retroactively rewriting old snapshots to make a timeline look consistent.

## Versioning, conformance and migration

Version 2.3.3 adds compatibility_row_ref to qualification/adoption bindings, labels retrospective register judgments and derives envelope binding from its accepted declaration. The confirmation-off M1 encoding has scoped development checks; no hosted-project state/profile migration occurs. The prior 2.3.2 bytes remain [retained](../local_artifacts/dsh-research/contract-history/261111-2124-reviewed-contract-2.3.2-ebfafa15545b.md).

Version 2.3.2 adds cumulative per-version obligation/compatibility assessment and explicit qualification-budget versus envelope arbitration. Preserve [the reviewed 2.3.1 snapshot](../local_artifacts/dsh-research/contract-history/261111-2112-reviewed-contract-2.3.1-87e6d84f8caf.md); no runtime/profile migration occurs.

Version 2.3.1 bound amortization to the accepted envelope, applies owned holds to qualification-budget/coverage shortfalls and makes C_run/C_qual explicit in the T4 evidence row. Preserve [the reviewed 2.3.0 snapshot](../local_artifacts/dsh-research/contract-history/261111-2030-reviewed-contract-2.3.0-681a105d8389.md); profile qualification/migration remains pending.

Version 2.3.0 added the qualification-budget and cost-accounting obligations and explicitly assesses the added 2.2.0 coverage obligations. Preserve [the reviewed 2.2.0 snapshot](../local_artifacts/dsh-research/contract-history/261111-2020-reviewed-contract-2.2.0-ef684ac90fc5.md); qualification/migration remains prospective.

Version 2.2.0 clarified DATA-2 applicability and timestamp meaning, and introduced the mandatory frozen qualification-coverage matrix described in the compatibility assessment. Preserve [the reviewed 2.1.0 snapshot](../local_artifacts/dsh-research/contract-history/261111-1859-reviewed-contract-2.1.0-089b8d9b6652.md); property/stage IDs remain unchanged and no profile/state is migrated.

Version 2.1.0 clarified order proof, reviewer holds, schema/applicability evidence and reviewed contract/architecture decisions without changing the 23 property IDs. Preserve [the reviewed 2.0.0 snapshot](../local_artifacts/dsh-research/contract-history/261111-1808-reviewed-contract-2.0.0-3815ee13ebed.md). New encodings/profiles require qualification and compatibility; this task deploys none.

Version 2.0.0 replaced the former flat property IDs with category-specific predicates and violation witnesses. There are no canonical RL-I/P aliases. Retain [the local 1.0.0 draft snapshot](../local_artifacts/dsh-research/contract-history/261111-1742-contract-1.0.0-9d446e0011da.md) for historical audit; this documentation task adopts or migrates no running profile. Preserve any original trace bindings and do not relabel them or apply the new property set retroactively. Provider encodings/live profiles remain pending, and this documentation revision migrates no running authority.

Version this stable document and retain immutable adopted snapshots. Record the content hash as well as the version; a version label alone cannot distinguish changed bytes. Changed obligations, stage/identity semantics or supported profiles require an explicit compatibility assessment and new applicable review. Preserve old contract bindings and historical receipts rather than backfill a new meaning into them.

[Current M1 capability/document receipt](../.plan/review/261111-2124-m1-runtime-capabilities.json) records encoding and native fixture scope plus document checks; independent integrated-provider conformance remains pending. The 2.3.2 [document check](../.plan/review/261111-2112-N11-N12-validation.json) remains historical evidence for its exact prior hash.

M1 records the contract and public provider encoding/capability mappings. M2 binds records/capture/checks to existing execution/storage. M3 emits observable scientific/review/feedback associations. M4 qualifies invariants and positive/negative conformance cases. M5 adopts only a qualified released-input profile. M6 handles revised-profile/state compatibility and single-writer handoff; documentation completion does not complete any runtime milestone.

Qualification must cover drift, timeout-zero invalidity, corrupted/non-finite evidence, valid negatives, stale/duplicate review/action delivery, uncertain launch/restart, stop/bounds, final-input refusal, feedback edits/duplicates/partial scans, publication retries, and preservation of contract/state identity across worktrees/migration. Tests record assurance and unsupported cases explicitly; no mocked count substitutes for live guarantees.

Migration preserves current charges/reservations, consumed attempts/actions/reviews, feedback/cursors/effects/publication associations and confirmation history. Keep active contracts/profiles pinned until terminal/reconciled. A code/profile rollback must be compatible with current authority; do not overwrite post-cutover consumption using a stale backup. Unknown mapping or native persistence semantics holds the affected handoff. Supported backup/restore includes ignored plan/evidence and native WAL requirements, not only Git or one database file.

## User Prompt, Verbatim

~~~text
Persist the formalized research-loop to docs/contracts.md, so that we can audit meta-loop (T1-T4). update related docs.
~~~

## Property Rewrite Requests, Verbatim

~~~text
update the "Invariants" table of contracts to be testable properties with explicit counterexamples grouped by fitting categories.
~~~

~~~text
don't have to preserve the RL-I1–RL-I8 and P01–P08 mappings.
~~~

## Recorded historical timestamp anomaly

The r4 value `2026-11-11 18:08 -0800` is retained from the initial edit, but is not the final-content-write time of the reviewed 2.1.0 bytes. Before the 2.2.0 rewrite, the recorded filesystem last-write metadata for that reviewed file was `2026-11-11T18:19:52.459747-08:00` (captured in [the frozen context](../local_artifacts/dsh-research/architecture-revision/261111-1859-review-r5-context.json)). Treat r4 as an explicitly flagged historical anomaly, not final-write or native causal-order evidence. Preserve its original value and reviewed snapshot; current Updated/latest revision timestamps follow the rule above.

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-11 17:02 -0800 | Specified research-loop contract 1.0.0 with stage/record obligations, RL-I1–RL-I8, feedback/publication, trace and T1–T4 audit interfaces, assurance and continuity requirements; implementation/live qualification remain pending. |
| r2 | 2026-11-11 17:07 -0800 | Clarified scalar/unknown-fact semantics and pre-dispatch author/reviewer cost bounds while finalizing the initial specification and related references; no provider/profile has adopted this draft. |
| r3 | 2026-11-11 17:46 -0800 | Specified contract 2.0.0 with 23 category-scoped testable predicates, explicit counterexamples and observation evidence; removed canonical legacy aliases and retained the prior snapshot. No runtime qualification or migration performed. |
| r4 | 2026-11-11 18:08 -0800 | Addressed human review: explicit admission order proof, reviewer holds, release-schema ownership, applicability evidence, requirement revision/repair matrix, scoped review validity and witness-based acceptance; specified 2.1.0 without runtime execution. |
| r5 | 2026-11-11 18:59:17 -0800 | Addressed review r5 N-1–N-3/F-8: explicit DATA-2 applicability, final-write timestamps and frozen scope/cell coverage criteria; specified 2.2.0 without runtime conformance claims. |
| r6 | 2026-11-11 20:20:31 -0800 | Addressed N4–N7: classified new coverage/budget obligations and prospective compatibility, linked qualification cost to its budget/T4, and flagged r4's retained timestamp anomaly; specified 2.3.0 without runtime migration. |
| r7 | 2026-11-11 20:30:26 -0800 | Addressed N8–N10: accepted-envelope horizon/denominator binding, owned qualification holds and explicit T4 C_run/C_qual evidence; specified 2.3.1 without runtime qualification. |
| r8 | 2026-11-11 21:12:18 -0800 | Addressed N11–N12 with a cumulative version assessment/adoption gate and explicit budget/envelope/qualification-cost arbitration; specified 2.3.2 without runtime conformance or migration. |
| r9 | 2026-11-11 21:39:00 -0800  | Incorporated N13–N15 into M1 encoding: labeled retrospective assessments, bound machine-readable compatibility rows and accepted envelope declarations; retained prior contract bytes and pending independent/provider/live qualification. |
