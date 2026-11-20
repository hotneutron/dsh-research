# Fail-fast exits and informative next experiments

## Contents

- [Keep the decision and methodology explicit](#keep-the-decision-and-methodology-explicit)
- [Choose a scoped fail-fast technique](#choose-a-scoped-fail-fast-technique)
- [Use statistical futility only with a valid protocol](#use-statistical-futility-only-with-a-valid-protocol)
- [Generate and compare the next alternatives](#generate-and-compare-the-next-alternatives)
- [Evaluate decision value and reasonable cost](#evaluate-decision-value-and-reasonable-cost)
- [Record the decision and reassess](#record-the-decision-and-reassess)
- [Apply the exposure example](#apply-the-exposure-example)
- [Sources and applicability](#sources-and-applicability)

## Keep the decision and methodology explicit

Start from the original objective, current methodology, frozen judge, available capabilities, standing authority and existing consumption. Identify the important decision blocked by current uncertainty: keep or reject a candidate, choose between implementations, qualify an observable, advance a stage, or return a limitation. Separate that decision from the action of collecting data.

Keep diagnostics and experiment variations within the current methodology. Mark an alternative measurement approach, observable definition, representation family or inference contract as a prospective outer-loop subject. Returning an inner-loop limitation can inform that later assessment; it does not itself change methodology or establish goal exhaustion.

Read both supported and negative results, partial lessons, rejected alternatives and unresolved claims. Ensure the author and reviewer can inspect the relevant evidence. Use the shared-lesson and visibility instructions in the main skill; do not infer a common scientific context from Session persistence or a full-byte-retention flag.

Before running a development batch, state its question, required observables, candidate/repair scope, legal checkpoints, exit conditions, usable partial outputs and resource bounds. Use the applicable prospective contract rather than a global failure count, candidate count or token cap.

## Choose a scoped fail-fast technique

| Technique | Apply it when | Legal result and follow-up |
| --- | --- | --- |
| Prerequisite gates ordered by cost | Identity, schema, capability, correctness or evidence prerequisites can be checked before dependent work | Stop the dependent stage when its prerequisite fails; retain the failure and select a supported repair or diagnostic. |
| Small faithful observability pilot | It is unknown whether the current instrument/schedule can expose the required signal | Test the minimum representative unit preserving relevant work, concurrency and measurement semantics. Adequate observation opens the next stage; inadequate or ambiguous observation returns a measurement limitation. |
| Deterministic feasibility or identifiability check | Fixed constraints or identical predictions can rule out a required result or distinction | Retain the explicit bound/collision witness. End only the affected candidate or experiment; a heuristic estimate is not an impossibility proof. |
| Finite mechanism-backed repair slate | A failed implementation has specific plausible repairs under the current methodology | Give each repair a failure mechanism, changed condition and expected distinguishing result. Stop repeating unchanged failures; return a limitation when the declared slate yields no supported successor. |
| Prospective sequential futility | Adequate observations and an accepted sampling model permit inference about the candidate's attainable benefit | Apply the registered stopping/error rule at legal checkpoints. Preserve an inconclusive result when useful benefit remains plausible. |
| Successive halving or adaptive racing | Candidates share an adequate evaluator, target and meaningful resource/fidelity progression | Allocate development resources to remaining plausible candidates. Treat elimination as allocation within that search; retain independent confirmation requirements. |

Use cheap prerequisite checks before expensive collection, fitting or profiling. Reuse accepted checks only when their source, environment and applicability still match. Do not rerun accepted evidence solely to fill a new checklist.

For a faithful pilot, explain which reduced dimensions preserve the proposed mechanism and which claims remain untested. A single-rank substitute may miss a coupled-rank failure; a short work unit may change concurrency; fewer samples may lose required measurement precision. If fidelity to the target is unestablished, return a feasibility observation rather than a qualification pass.

Check identifiability before increasing sample size. If competing explanations imply the same observable under every proposed condition, more repeats cannot separate them. Add an allowed control that changes their predictions or return the limitation. Allow explanations to coexist; do not force a false binary choice.

Preserve unknown process ownership, reservations and settlement requirements. Fail-fast does not authorize killing an owned process outside its accepted lifecycle, skipping teardown or declaring a missing result negative. Finish mandatory protocol obligations even when a dependent stage has already become ineligible, unless the frozen protocol permits early termination.

## Use statistical futility only with a valid protocol

Define the target benefit, minimum useful benefit `delta`, observation unit, sampling/error model, legal looks, error allowance and maximum authorized resource use before observing the stopping evidence. Orient the benefit so larger is better. Distinguish a development scheduling decision from a formal scientific conclusion.

When a justified confidence sequence or registered group-sequential rule supplies a benefit interval `[L, U]` at a legal checkpoint:

- Treat `U < delta` as evidence that this candidate cannot deliver the declared useful benefit under the bound protocol.
- Treat `L >= delta` as evidence relevant to advancement, subject to all remaining frozen gates and confirmation obligations.
- Treat an interval crossing `delta` as unresolved; compare more discriminating measurement, additional supported sampling and scoped stop/defer.

Choose bounds appropriate to the data and adaptive sampling. Ordinary fixed-sample confidence intervals repeatedly inspected at arbitrary times do not provide a time-uniform error guarantee. A confidence sequence addresses optional stopping under its assumptions; it does not repair drift, invalid evidence, data leakage, wrong observation units or uncontrolled comparisons across many candidates.

Treat paired ranks, shared inputs, repeated samples within a job and common host state as potentially dependent. Count the justified independent block or use a supported dependence model. Do not count two ranks in one coupled execution as two independent experiment replications.

Use sequential likelihood-ratio tests only when the hypotheses, likelihood model and error boundaries are specified and justified. Use best-arm identification only for a defined comparable candidate population and outcome distribution. Those methods do not identify the best scientific question automatically.

Check a fidelity schedule before using successive halving. Early rankings can change as resources increase. A reduced run that lacks the target observable cannot supply a comparable low-fidelity score; handle its measurement failure separately. Do not replace the study's frozen success criterion with a halving rank.

## Generate and compare the next alternatives

Generate alternatives from the blocked decision and surviving explanations, rather than from every tool that happens to be available. Include continued work on the present candidate when justified, a discriminating diagnostic, a distinct allowed experiment, and scoped defer/stop when relevant. List methodology-changing alternatives separately.

Give each feasible option:

- The blocked decision and primary evidence motivating it.
- The explanations or candidate choices it can distinguish, with observable predictions and required controls.
- At least two plausible result branches with different follow-up actions, including an inadequate/inconclusive branch when possible.
- Minimum useful evidence, legal exit point, costs, prerequisites and evidence reuse/applicability changes.
- The reason to prefer it now, or the fact needed before a preference is justified.

Reject options that cannot supply the required observable, repeat an unchanged rejected subject, or only create more examples of an already established fact without a protocol or decision purpose. If all plausible outcomes lead to the same next action, identify the fixed replication obligation or explicitly necessary multistep decision path that justifies the experiment.

Use contrasts that change the suspected mechanism while preserving the relevant controls. Consider interactions: varying one factor at a time can leave joint effects undiscovered. A small factorial or fractional design can be useful within permitted variations, but state its aliasing and unresolved interactions. Augment a screening design only when the unresolved alias matters to the decision; a screening effect alone is not causal identification.

Prefer an option only relative to the inspected slate and evidence. State that limitation. If several options remain indistinguishable, choose the least costly supported disambiguating step or retain the tie; do not invent a unique winner.

## Evaluate decision value and reasonable cost

Separate the best current candidate from the best next experiment. The latter can be a measurement of a weaker candidate if its outcome most improves a consequential choice. Reduced uncertainty, more hypotheses and a better score are useful only in relation to that choice and the applicable protocol.

When a justified probabilistic decision model is available, use expected value of sample information:

```text
EVSI(e) = E over Y given D,e [max over a E[U(a, theta) given D,Y,e]]
          - max over a E[U(a, theta) given D]
```

Let `D` denote current evidence, `e` the proposed experiment, `Y` its possible observation, `a` a subsequent decision and `theta` the unknown state. Bound the choices by actual scientific criteria and authority. Subtract experiment cost only when utility and cost have a justified common scale. Include cost and delay of the decision path the experiment enables. A one-step approximation may miss the value of an explicitly necessary sequence.

Do not fabricate calibrated priors, likelihoods, success probabilities or utility scores. When they are unavailable, compare observable outcome branches, consequences of a wrong decision, evidence adequacy and cost ranges directly. Keep confidence in an estimate separate from the importance of the decision.

Order the comparison as follows:

1. Check authority, feasibility and evidence validity. Potential benefit cannot compensate for an unmet hard prerequisite.
2. Check whether the outcomes can change the important decision or enable its declared evidence path.
3. Remove dominated options: if another option provides the necessary discrimination with no worse supported cost, delay and relevant risk, retain the latter. State uncertain comparisons.
4. Compare the remaining options' decision consequences, measurement support, switching/setup burden and opportunity costs. Use sensitivity to plausible costs/outcomes instead of an unsupported precise ranking.

Track compilation, CPU fitting, GPU/profiler collection, qualification, repetitions, interpretation, reviewer/model work, artifact delivery and delay separately. Keep `C_science`, `C_qual` and recurring coordination costs distinct. Do not add overlapping wall intervals or combine seconds, money and tokens without a supported conversion. Record unavailable costs as unavailable. Actual model spending can inform choice without imposing a token cap.

Close a finite batch when its purpose is answered or its remaining options lack stated decision value under the current constraints. Record whether that is a valid negative, measurement limitation, resource hold or unresolved candidate result. Preserve the entire objective's separate completion/exhaustion assessment.

## Record the decision and reassess

Retain one compact project-owned decision artifact with the trigger, fixed methodology/judge, blocked decision, evidence and partial lessons, compared options, selected experiment/reason, outcome-to-action branches, costs, legal stopping points, reused/inapplicable evidence and next checkpoint.

Bind its actual bytes through supported plan/prerequisite references and reviewer context. Keep strict native record/receipt encodings intact; a skill does not add a runtime field or operation. Obtain the existing exact-subject review and guarded admission before execution.

Reassess on a failed prerequisite, completed development batch, stage gate, contradictory evidence or new human direction. Coalesce related facts at legal checkpoints. Avoid repeated reflection for every sample or transport retry. Reopen a rejected option only with a material evidence/context change, and retain its prior rejection.

On return, compare the observed result with its stated branches. Retain useful partial findings even when the batch's main gate fails. Feed evidence-backed lessons and the unresolved remainder to both parties. Judge efficiency by actual decision improvement and cost, not the number of pivots, approvals or reflections.

## Apply the exposure example

For a study whose unchanged gate requires 95% contender coverage of the full probe, distinguish that coverage threshold from a 95% statistical confidence level. Real kernel activity or some overlap does not establish the required exposure.

Compare an audit of retained interval accounting with a bounded permitted scheduling/duration contrast. An accounting defect calls for a scoped correction; consistent accounting favors a diagnostic of the schedule. Qualified exposure can open the next measurement gate; persistent failure returns a schedule limitation. Name an inconclusive branch when the diagnostic cannot distinguish the explanations.

Preserve source/protocol successes and the failed exposure screen together. Do not infer physical contention's absence from inadequate exposure. Place a new instrument or observable contract in a separate future methodology-change proposal.

## Sources and applicability

- [Platt, Strong Inference (1964)](https://socialscience.fas.harvard.edu/files/2023/06/Platt1964_Science_StrongInference.pdf): Generate alternative explanations and discriminating experiments; use this as design guidance, not a guarantee that every mechanism admits a decisive binary test.
- [Reyes and Powell, Optimal Learning for Sequential Decisions in Laboratory Experimentation (2020)](https://arxiv.org/abs/2004.05417): Choose information for its effect on subsequent decisions; numerical knowledge-gradient policies require a specified belief/measurement model.
- [Simulating Study Data to Support Expected Value of Sample Information Calculations: A Tutorial](https://europepmc.org/articles/PMC8793320): Distinguish information value from net benefit after study cost; transfer the decision principle, not the medical utility model.
- [Howard et al., Time-uniform, Nonparametric, Nonasymptotic Confidence Sequences](https://arxiv.org/abs/1810.08240): Support repeated looks and optional stopping with bounds suited to the observation model; preserve dependence and multi-candidate error obligations.
- [Garivier and Kaufmann, Optimal Best Arm Identification with Fixed Confidence (2016)](https://arxiv.org/abs/1602.04589): Allocate samples and stop for a defined candidate-comparison problem; its optimality does not extend automatically to arbitrary scientific alternatives or costs.
- [Li et al., Hyperband (2018)](https://jmlr.org/papers/v18/16-558.html): Allocate development resources through early elimination; require meaningful fidelity and preserve independent final evaluation.
- [NIST, Fractional Factorial Design Resolution](https://www.itl.nist.gov/div898/handbook/pri/section3/pri3344.htm) and [Mirror-Image Foldover](https://www.itl.nist.gov/div898/handbook/pri/section3/pri3381.htm): Identify confounding and selectively resolve aliases in screening designs; do not present an aliased effect as an isolated mechanism.
