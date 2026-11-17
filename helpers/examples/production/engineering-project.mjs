// Project hooks for the package-owned production-loop engineering qualification.
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DecisionSubjectSchema, ManifestSchema, Version4ResearchStateSchema, canonicalJson, sha256 } from 'dsh-research'

export async function open({ author, root, artifacts, table, config, current, executionSandbox, source_ticket }) {
  const prefix = config.artifact_prefix
  const read = async ref => JSON.parse(Buffer.from(await artifacts.read(ref)).toString())
  const json = (name, value) => artifacts.writeOnce(`${prefix}/${name}`, Buffer.from(canonicalJson(value)))
  for (const ref of [config.project_module, config.producer, config.corpus, config.contract, config.compatibility, config.runtime_lock]) await artifacts.read(ref)
  const register = await read(config.compatibility), row = register.rows.at(-1)
  assert.equal(row.contract_version, '2.4.0')
  const corpus = await read(config.corpus), eventKey = event => JSON.stringify([event.message_id, event.version, event.body])
  const expectedKeys = [...new Set(corpus.events.map(eventKey))].sort(), expectedDigest = sha256(JSON.stringify(expectedKeys))
  let baselineWork = 0, baseline = []
  for (const event of corpus.events) {
    const key = eventKey(event); let found = false
    for (const old of baseline) { baselineWork++; if (old === key) { found = true; break } }
    if (!found) baseline.push(key)
  }
  let registration, policy, policyRef, binding, profile, domainPolicy
  if (current) {
    assert.equal(current.schema_version, 4)
    policyRef = current.policy; policy = await read(policyRef); binding = current.binding
    profile = binding.profile.effective; domainPolicy = policy.domain_policy
    const saved = await read(profile)
    assert.equal(saved.native_mandate_sha256, sha256(canonicalJson(source_ticket.mandate)))
    registration = { author_session_id: author.id, mandate: canonicalJson(source_ticket.mandate), policy: policyRef, binding }
    assert.equal(canonicalJson(saved.execution_sandbox), canonicalJson(executionSandbox))
  } else {
    const authorityRef = await json('authority.json', { project_root: root, project_id: 'dsh-research-engineering',
      authority_id: config.authority_id, writer_id: author.id, prompt_verbatim: config.prompt_verbatim,
      purpose: 'User-authorized package-owned native production-loop engineering qualification',
      budget: config.budget, existing_accorde_authority_used: false })
    const authority = { project_id: 'dsh-research-engineering', project_root: root, authority_id: config.authority_id,
      writer_id: author.id, registration: authorityRef }
    profile = await json('profile.json', { scope: 'project_research', confirmation: 'off', execution_sandbox: executionSandbox,
      host: config.host, source: config.source, models: config.models,
      native_mandate_sha256: sha256(canonicalJson(source_ticket.mandate)),
      source_refs: [config.project_module, config.producer, config.corpus], budget: config.budget,
      scientific_scope: 'Fixed released engineering trace; operation-count comparison only, no GPU/accuracy/confirmation claims' })
    binding = { contract_ref: { id: 'dsh-research/research-loop', version: '2.4.0', artifact: config.contract },
      compatibility_row_ref: { register: config.compatibility, contract_version: '2.4.0', row_id: row.row_id,
        row_sha256: sha256(canonicalJson(row)), table_sha256: register.table_sha256 }, authority,
      profile: { revision: config.profile_revision, effective: profile, lock: config.runtime_lock, releases: config.releases,
        confirmation: 'off', assurance: 'implemented' } }
    domainPolicy = await json('domain-policy.json', { scope: 'Fixed public synthetic engineering event trace',
      goal: 'Demonstrate a correct version-preserving strategy with at least50percent fewer calls to the same source-level comparator than the history-list control',
      expected_retained_digest: expectedDigest, expected_retained_count: expectedKeys.length,
      input_count: corpus.events.length, baseline_comparisons: baselineWork, material_reduction: .5,
      comparison_unit: 'source_compare_function_invocations',
      excluded_from_metric: ['array insertion/movement','allocation','string creation','wall-clock/runtime work'],
      non_goals: ['GPU performance','unseen-workload accuracy','wall-clock speedup','training/confirmation data reuse'] })
    const preset = await json('reviewer-preset.json', { provider: config.models.reviewer_provider, model: config.models.reviewer_model })
    const permissions = await json('reviewer-permissions.json', { tools: [], same_os_account: true, no_filesystem_secrecy_claim: true })
    policy = { scope: 'project_research', authority, binding, goal_id: config.goal_id, goal_revision: 'r1',
      max_attempts: config.budget.max_attempts, max_timeout_ms: config.budget.max_unit_ms, max_total_timeout_ms: config.budget.max_total_ms,
      max_output_bytes: 16384, allowed_executables: [config.node], allowed_operations: ['evaluate'],
      domain_policy: domainPolicy, verifier: config.project_module, entrypoint: config.producer,
      reviewer: { session_id: config.reviewer_session_id, provider: config.models.reviewer_provider, preset, permissions },
      review_limits: { max_requests: config.budget.max_review_requests, timeout_ms: config.budget.review_timeout_ms, subagent_provider: 'spawn', model: config.models.reviewer_model },
      allowed_read_prefixes: ['snapshots/', 'local_artifacts/autoresearch/dsh/'],
      execution: { arguments: [{ kind: 'entrypoint' }, { kind: 'input', index: 0 }, { kind: 'input', index: 1 }, { kind: 'operation' }],
        input_count: 2, input_purpose: 'C_qual', environment: { CUDA_VISIBLE_DEVICES: '' }, cost_purpose: 'C_qual' } }
    policyRef = await json('policy.json', policy)
    registration = { author_session_id: author.id, mandate: canonicalJson(source_ticket.mandate), policy: policyRef, binding }
    await json('registration.json', registration)
  }
  const context = await json('goal-context.json', { prompt_verbatim: config.prompt_verbatim, goal: (await read(domainPolicy)).goal,
    valid_plan_requirement: 'Candidate designs must preserve distinct message versions and content; quantify comparisons on this exact corpus', corpus: config.corpus })
  const interpreter = await json('interpreter.json', { node: config.node, native_node_version: process.version })
  const environment = await json('environment.json', policy.execution.environment)
  const outputFields = { strategy: 'string', comparison_unit: 'string', corpus_sha256: 'string', retained_digest: 'string', retained_count: 'finite_number', input_count: 'finite_number',
    comparisons: 'finite_number', baseline_comparisons: 'finite_number', preserves_versions: 'boolean', score: 'finite_number' }
  const outputSchema = await json('output-schema.json', { required_fields: outputFields, additional_fields: false })
  const inventory = await json('source-inventory.json', { sources: [config.project_module, config.producer, config.corpus], actual_released_bytes: true })
  const verify = async result => {
    assert.equal(result.corpus_sha256, config.corpus.sha256)
    assert.equal(result.input_count, corpus.events.length); assert.equal(result.baseline_comparisons, baselineWork)
    const correct = result.preserves_versions && result.retained_digest === expectedDigest && result.retained_count === expectedKeys.length
    assert.equal(result.comparison_unit, 'source_compare_function_invocations')
    if (result.strategy === 'history-list') assert.equal(result.comparisons, baselineWork)
    else assert.ok(Number.isSafeInteger(result.comparisons) && result.comparisons >= 0
      && result.comparisons <= corpus.events.length*Math.max(expectedKeys.length,1))
    assert.equal(result.score, correct ? 1-result.comparisons/baselineWork : -1)
    return correct && result.score >= .5 ? 'positive' : 'negative'
  }
  const hooks = {
    async propose(args) {
      const design = JSON.parse(args.design_json ?? '{}')
      assert.deepEqual(Object.keys(design), ['strategy'])
      assert.ok(['history-list','binary-index','message-only'].includes(design.strategy))
      const configuration = await json(`designs/${sha256(canonicalJson(design))}.json`, design)
      const plan = await json(`plans/${sha256(canonicalJson([args.plan_revision, design]))}.json`, {
        purpose: 'deliberate', revision: args.plan_revision, design, corpus: config.corpus, original_prompt: config.prompt_verbatim,
        scientific_scope: 'Evaluate exact retained versions and comparison counts, no timing generalization' })
      return { schema_version: 1, kind: 'manifest', binding, author_session_id: author.id, original_prompt: config.prompt_verbatim,
        goal: { id: config.goal_id, revision: 'r1', context, checkpoint: args.checkpoint },
        plan: { purpose: 'deliberate', revision: args.plan_revision, snapshot: plan }, architecture: profile,
        candidate: { commit: 'project-owned-frozen-engineering-source', tree: config.producer, configuration, snapshot_kind: 'content_snapshot', content_inventory: inventory },
        evaluator: { verifier: config.project_module, interpreter, environment },
        inputs: [{ artifact: config.corpus, version: 'engineering-events-v1', split: 'released-engineering', purpose: 'C_qual', access: 'released' },
          { artifact: configuration, version: 'design-v1', split: 'released-engineering', purpose: 'C_qual', access: 'released' }],
        invocation: { executable: config.node, argv: [join(root, config.producer.uri), join(root, config.corpus.uri), join(root, configuration.uri), 'evaluate'], cwd: root, env: policy.execution.environment },
        bounds: { timeout_ms: policy.max_timeout_ms, max_attempts: policy.max_attempts, timeout_reservation_ms: policy.max_total_timeout_ms, concurrency: 1, resource_policy: policyRef },
        output: { schema: outputSchema, required_fields: outputFields, additional_fields: false }, domain_policy: domainPolicy,
        proposal: { decision: 'continue', operation: 'evaluate', prerequisites: [config.project_module, config.producer, context], retry: null } }
    },
    async reviewContext(subject) {
      return subject.kind === 'research_decision'
        ? [subject.scope, subject.domain_assessment, subject.checkpoint, ...subject.evidence]
        : [subject.plan.snapshot, subject.candidate.tree, subject.candidate.configuration, subject.domain_policy, config.project_module, config.corpus,
          ...(subject.goal.checkpoint ? [subject.goal.checkpoint] : [])]
    },
    async decision(kind, rationale, state) {
      const actions = Object.values(state.actions).filter(action => action.phase === 'settled' && action.evidence && action.checkpoint)
      assert.ok(actions.length)
      const assessment = await json(`decisions/assessment-${sha256(canonicalJson(actions.map(action => action.evidence)))}.json`, {
        corpus: config.corpus, scope: domainPolicy, action_ids: actions.map(action => action.action_id), required_goal: 'Valid history-list control and positive version-preserving candidate',
        missing_permissions_or_budget_is_not_scientific_exhaustion: true })
      return DecisionSubjectSchema.parse({ schema_version: 1, kind: 'research_decision', subject_id: config.goal_id+'-decision', subject_kind: kind,
        binding, author_session_id: author.id, goal_id: config.goal_id, goal_revision: 'r1', checkpoint: actions.at(-1).checkpoint,
        scope: domainPolicy, rationale, evidence: actions.map(action => action.evidence), alternatives: actions.map(action => action.checkpoint),
        rebrainstorm: null, domain_assessment: assessment, bounds: { timeout_ms: policy.max_timeout_ms, max_attempts: policy.max_attempts, timeout_reservation_ms: policy.max_total_timeout_ms, concurrency: 1, resource_policy: policyRef }, human_question: null })
    },
    async assertDecisionPremises(subject, state) {
      assert.equal(subject.subject_kind, 'goal_completion', 'This finite engineering profile has no qualified scientific-exhaustion premise')
      const values = await Promise.all(Object.values(state.actions).filter(action => action.evidence).map(action => read(action.evidence)))
      const valid = values.filter(value => value.evidence_status === 'valid' && value.scientific_status === 'eligible')
      assert.ok(valid.some(value => value.result.strategy === 'history-list' && value.verifier.verdict === 'negative'))
      assert.ok(valid.some(value => value.result.preserves_versions && value.verifier.verdict === 'positive'))
      assert.equal(state.active_action_id, null); assert.equal(state.reserved_timeout_ms, 0)
    }
  }
  return { registration,
    initialState: !current ? Version4ResearchStateSchema.parse({ schema_version: 4, authority: policy.authority, binding, policy: policyRef,
      revision: 0, stopped: false, consumed_attempts: 0, consumed_timeout_ms: 0, reserved_timeout_ms: 0, consumed_reviews: [], active_action_id: null,
      actions: {}, hold: null, consumed_review_requests: 0, review_requests: {}, rejected_subjects: {}, feedback: { cursors: {}, items: {} }, publications: {}, loop: { decision: null, notifications: {} } }) : undefined,
    research: { policy: policyRef, artifactPrefix: prefix, hooks, reviewContextMaxBytes: 1048576,
      executionSandbox: { profile, resolve: () => executionSandbox }, verifier: { identity: config.project_module, verify } },
    instructions: `Original authorized task: ${config.prompt_verbatim}\nThis is package-owned production-loop engineering work on an exact released trace. Use research_propose with operation=evaluate and design_json containing only strategy (history-list, binary-index or message-only). First execute a reviewed history-list control. Then find a version-preserving candidate whose comparison count is at least50percent lower in calls to the same source comparator; array insertion/movement, allocation and wall-clock costs are excluded, using a separately reviewed changed plan. Message-only dedup loses edited versions and cannot satisfy the candidate correctness requirement; interpret any request_changes scientifically, capture it through research_status and pass the exact feedback_item_id plus feedback_reason with the changed proposal. Read actual evidence in research_status, retain the valid negative control, and use research_conclude goal_completion only when both control and qualifying candidate have actual settled receipts. This objective involves no GPU, wall-clock speedup, training/confirmation labels or scientific-exhaustion claim. Do not ask a human to continue ordinary work. Report progress with human_action=null while active; ready is permitted only after research_conclude returned the separately reviewed complete decision.` }
}
