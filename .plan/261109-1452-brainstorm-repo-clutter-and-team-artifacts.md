# Proposal summary — Repository clutter, branch plans and team sharing

Created: 2026-11-09 14:52 -0800. Updated: 2026-11-11 16:14 -0800.

Status: proposal. This revision reorganizes this development draft; hosted-project code, scientific state and cloud content are unchanged.

Keep dsh-research's reusable package small and each hosted project's research record in its canonical workspace. The [current ownership/autonomy contract](261105-1705-contract-project-state-autonomy-and-feedback.md) remains the governing boundary.

## Planning and artifact layout

~~~text
P/.plan/                              # deliberate plans/contracts and useful summaries
P/local_artifacts/autoresearch/dsh/
  <goal>/paths/<path-id>/planning/     # ignored explorative plans and trackers
  <goal>/<campaign>/<attempt>/        # immutable execution manifests and evidence
  <goal>/published/<checkpoint>/      # exact team-release bytes and sharing receipt
~~~

Classify hosted-project work by purpose. Deliberate branching has defined scope, method, bounds and deliverables: version its accepted plans/contracts and useful evidence. Explorative branching investigates uncertain alternatives: keep detailed plans/trackers and exact prompts in ignored project artifacts with snapshots/hashes, and summarize findings. Promotion into deliberate work requires defined purpose and applicable review, preserving the original exploratory records. Avoid a new .plan/ file for every speculative path or attempt.

Each summary records the question/method, outcome and validity, decision/next action, source identity, path/checkpoint IDs and references to immutable plan/evidence/export manifests. Preserve detailed records in project backups and authorized team exports; ignored does not mean disposable.

dsh-research's own engineering milestones and shared architecture proposals are deliberate development records; this exploration rule does not require hiding them. Large/raw outputs stay in artifacts for either kind of work.

## Existing main code and research integration

Classify shared capabilities, duplicated logic, active experiments, historical one-offs and frozen dependencies. Consolidate only compatible shared behavior. Archive and restore coherent historical source/plan families before removing eligible files from the default tree; retain compact findings and references.

For research integration, preserve the evaluated snapshot and prepare a focused change containing reusable code, appropriate checks/docs and a curated summary. Include accepted deliberate plans; exclude explorative per-attempt planning and raw outputs. Validate the resulting integration tree and retain its identity alongside the original evaluated candidate. Squashing alone does not reduce the merged file set.

Existing tracked explorative plans need a scoped migration: preserve exact bytes and dependencies, verify restoration, update references, then remove eligible files from the tracked tree. Ignore rules alone do not untrack them. Active source/plan/state authorities stay available until reconciled.

## Team sharing and retention

Use existing Lark briefs for discovery, permitted evidence for claim review and project-owned source/config/input bundles for reproduction. Verify intended teammates can access underlying assets and source/data as well as the Doc. Keep release hashes, stable cloud identities and exact bytes in the project; local paths alone are not shared artifacts.

Detailed plans needed for review/reproduction travel in those retained exports, with appropriate native permissions. Captured comments link to a project disposition, changed action if adopted, actual effect and response. Normal research continues without waiting for feedback; reviewed scoped scientific exhaustion remains the human-steering boundary.

## Detailed development artifact

[Full proposal and verbatim prompts](../local_artifacts/dsh-research/repo-clutter/261109-1452-brainstorm-repo-clutter-and-team-artifacts.md).

- SHA-256: `ce03a2f31fe34d9996adebef0e0a6250174501087f2c07803f0faff01583fe76`
- Retention/share status: local ignored development draft; no remote replica or team publication has been created in this task.
- The duplicated latest request is preserved twice in the full artifact. This is the curated record of the clutter proposal; deliberate shared architecture plans may have their own versioned documents.

## Revision History

| Revision | Timestamp | Change |
|---|---|---|
| r1 | 2026-11-09 14:52 -0800 | Created the full proposal covering source clutter, existing main code, research integration and team sharing. |
| r2 | 2026-11-09 14:53 -0800 | Restored final punctuation in the team-sharing prompt during verbatim verification. |
| r3 | 2026-11-09 16:01 -0800 | Moved the full draft to ignored local development artifacts; retained this curated summary and specified branch-plan preservation, sharing and merge exclusions. |
| r4 | 2026-11-11 16:14 -0800 | Distinguished hosted-project deliberate plans from explorative detail and retained versioned package-development records; preserved detailed history and refreshed its hash. |
