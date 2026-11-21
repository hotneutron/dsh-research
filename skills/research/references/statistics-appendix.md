# Statistical methods appendix

Optional methods for planned stopping, candidate allocation and information value. Use them only under an accepted protocol; this appendix grants no execution authority and does not replace the frozen judge.

## Prospective sequential futility

Before observing the stopping evidence, define the target benefit (oriented so larger is better), the minimum useful benefit `delta`, the observation unit, the sampling/error model, legal looks, the error allowance and the maximum authorized resource use. Distinguish a development scheduling decision from a formal scientific conclusion.

With a justified confidence sequence or registered group-sequential rule giving a benefit interval `[L, U]` at a legal checkpoint:

- `U < delta`: evidence that this candidate cannot deliver the declared useful benefit under the bound protocol.
- `L >= delta`: evidence relevant to advancement, still subject to every remaining frozen gate and confirmation obligation.
- The interval crosses `delta`: unresolved; compare a more discriminating measurement, additional supported sampling, or scoped stop/defer.

Ordinary fixed-sample confidence intervals inspected repeatedly at arbitrary times give no time-uniform error guarantee. A confidence sequence addresses optional stopping under its assumptions; it does not repair drift, invalid evidence, leakage, wrong observation units, or uncontrolled comparison across many candidates.

Paired ranks, shared inputs, repeated samples within a job and common host state are potentially dependent. Count the justified independent block or use a supported dependence model; two ranks in one coupled execution are not two replications.

Use sequential likelihood-ratio tests only when the hypotheses, likelihood model and error boundaries are specified and justified. Use best-arm identification only for a defined comparable candidate population and outcome distribution. Neither method identifies the best scientific question.

## Successive halving and racing

Check the fidelity schedule before eliminating candidates: early rankings can change as resources increase. A reduced run that lacks the target observable cannot supply a comparable low-fidelity score, and its measurement failure is handled separately. Never replace the study's frozen success criterion with a halving rank, and keep independent confirmation for the surviving candidate.

## Expected value of sample information

When a justified probabilistic decision model exists:

```text
EVSI(e) = E over Y given D,e [max over a E[U(a, theta) given D,Y,e]]
          - max over a E[U(a, theta) given D]
```

`D` is current evidence, `e` the proposed experiment, `Y` a possible observation, `a` a subsequent decision, `theta` the unknown state. Bound the choices by actual scientific criteria and authority. Subtract experiment cost only when utility and cost share a justified scale, and include the delay of the decision path the experiment enables. A one-step approximation can miss the value of an explicitly necessary sequence.

## Screening designs

Use contrasts that change the suspected mechanism while holding relevant controls; varying one factor at a time can leave joint effects undiscovered. A small factorial or fractional design can be useful within permitted variations, but state its aliasing and unresolved interactions. Augment the design only when the unresolved alias matters to the decision. A screening effect alone is not causal identification.

## Sources

- [Platt, Strong Inference (1964)](https://socialscience.fas.harvard.edu/files/2023/06/Platt1964_Science_StrongInference.pdf): generate alternative explanations and discriminating experiments; design guidance, not a guarantee of a decisive binary test.
- [Reyes and Powell, Optimal Learning for Sequential Decisions in Laboratory Experimentation (2020)](https://arxiv.org/abs/2004.05417): choose information for its effect on later decisions; knowledge-gradient policies require a specified belief and measurement model.
- [Simulating Study Data to Support Expected Value of Sample Information Calculations](https://europepmc.org/articles/PMC8793320): separate information value from net benefit after study cost; transfer the decision principle, not the medical utility model.
- [Howard et al., Time-uniform, Nonparametric, Nonasymptotic Confidence Sequences](https://arxiv.org/abs/1810.08240): repeated looks and optional stopping with bounds suited to the observation model; preserve dependence and multi-candidate error obligations.
- [Garivier and Kaufmann, Optimal Best Arm Identification with Fixed Confidence (2016)](https://arxiv.org/abs/1602.04589): sample allocation for a defined candidate comparison; optimality does not extend automatically to arbitrary scientific alternatives.
- [Li et al., Hyperband (2018)](https://jmlr.org/papers/v18/16-558.html): early elimination with meaningful fidelity and independent final evaluation.
- [NIST, Fractional Factorial Design Resolution](https://www.itl.nist.gov/div898/handbook/pri/section3/pri3344.htm) and [Mirror-Image Foldover](https://www.itl.nist.gov/div898/handbook/pri/section3/pri3381.htm): identify confounding and resolve aliases selectively; an aliased effect is not an isolated mechanism.
