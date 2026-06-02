# LLM failures concentrate in 8–20 recurring modes — and a small intervention library can cover most of them

The question "how reliable is this model?" turns out to be the wrong question. Reliability isn't a property of a model in the abstract — it's a property of a specific deployment: a particular task domain, schema, user population, knowledge source, and evaluation policy. Ask the wrong question and you get answers that don't transfer. Ask the right one and the problem becomes tractable.

This paper, from a team of independent researchers and one from Palo Alto Networks, synthesises 60 published results and three large error taxonomies to make two claims that pull in opposite directions. The first is a formal impossibility: across all possible tasks and configurations, new failure modes appear without bound, so no finite intervention library can guarantee reliability universally. The second is the practical rescue: within any fixed deployment, failures are sparse, repetitive, and concentrated in a small catalogue — and a surprisingly compact set of interventions can cover most of them.

The anchoring number is 86.35%. On HumanEval, just two error types — AssertionError (63.64%) and NameError (22.71%) — account for that share of all failures across 14 LLMs. That concentration isn't a quirk of one benchmark; it replicates across 23 models on HumanEval Pro and MBPP Pro, and similar patterns appear in math and general-capability taxonomies.

---

## The Impossibility Result

The paper opens with a formal proof by contradiction. If you allow the task domain to be unbounded — any possible schema, any knowledge source, any evaluator — then for any finite intervention library you can construct, there exists a failure mode it doesn't cover. The failure catalogue is provably infinite when the domain is unbounded. This isn't pessimism; it's a scope constraint. Reliability claims must always specify an operational patch, not a model.

The practical implication is discipline about what you're claiming. When a vendor says their model is "reliable," the claim is only meaningful relative to a defined patch: a tuple of task domain, schema, user distribution, knowledge sources, evaluation criteria, policy constraints, and time horizon. Change any of those dimensions significantly and you're in a different patch, with a potentially different failure catalogue.

This reframing matters because it redirects effort. Instead of chasing universal reliability — which the paper shows is mathematically out of reach — practitioners can ask which failure modes actually appear in their deployment, how many there are, and which ones can be eliminated versus merely reduced.

---

## Within a Patch, Failures Are Sparse and Repetitive

Across three large empirical taxonomies, the number of distinct named failure modes stabilises between 8 and 20 regardless of how large the corpus gets. ErrorAtlas covers 83 models across 35 datasets and organises failures into 17 named categories. MWPES-300K categorises 304,865 errors from 15 LLMs across four math word-problem datasets. HumanEval categorisation covers 14 LLMs. All three land in the same range.

The HumanEval concentration — 86.35% of failures from two error types — is the sharpest illustration, but the pattern holds more broadly. RFMDataset finds "strikingly similar failure mode distributions" across ten advanced reasoning models, which suggests the catalogue is a property of the task domain rather than the model. Swap the model and the same failure modes show up in roughly the same proportions.

The paper formalises this with a logarithmic mode-discovery postulate: the number of distinct failure modes grows as roughly c₀ × log(N), where N is the number of observed failures and c₀ ≈ 2 is calibrated from the ErrorAtlas endpoint (17 categories at roughly 10⁶ failures). This is an empirical postulate, not a derived theorem — the authors are explicit that a domain with genuinely different discovery dynamics would change the quantitative constants while preserving the qualitative conclusion.

> **86.35%** of HumanEval failures across 14 LLMs are covered by just two error types — AssertionError (63.64%) and NameError (22.71%)

The concentration has a direct operational consequence. If 86% of your failures come from two modes, fixing those two modes is not a partial solution — it's most of the solution. The remaining 14% still matter, but the priority ordering is clear.

---

## The Intervention Budget Grows Polylogarithmically

Here's where the framework gets useful for planning. Under the logarithmic mode-discovery assumption, the number of interventions you need to cover a given fraction of failures grows polylogarithmically in sequence length — and once the patch catalogue saturates, it becomes effectively constant for that domain.

The paper uses a log-head approximation for cumulative coverage: C(k) = log(1+k) / log(1+K), where K is the total number of failure modes in the catalogue. For the ErrorAtlas anchor of K = 17, covering the top 8 failure modes reaches roughly 77% cumulative coverage; covering the top 16 reaches roughly 94%. Each additional intervention buys less than the last, but the curve flattens fast.

| Top-k interventions | Cumulative coverage (K=17 anchor) |
|---|---|
| 8 of 17 | ~77% |
| 16 of 17 | ~94% |

This has a direct implication for how to think about long-horizon tasks. Sequence-level reliability targets are strictly harder than per-decision targets — if you need 99% reliability over a 100-step sequence, each step needs to be much more reliable than 99%. The framework doesn't dissolve this difficulty; it relocates it. Where the fraction of genuinely hard decisions grows with task length — adversarial compositional structure, multi-hop chains, long agent horizons — reliability remains hard. But for most operational patches, the catalogue saturates, and the intervention budget stays manageable.

One caveat worth holding: the c₀ ≈ 2 estimate is a single-point calibration against the ErrorAtlas endpoint, not a fit to a full discovery curve. A subsample-versus-distinct-modes plot hasn't been published for any LLM error taxonomy. The number is a planning anchor, not a derived constant.

---

## Targeted Interventions Confirm the Cluster Structure

The paper audits 28 quantitatively-anchored citations across six capability axes, stratifying them into patterns based on how they achieve reliability gains. Seven of the 28 achieve zero residual error by mathematical construction — constrained decoders, proof kernels, and static syntax checks that eliminate entire failure classes rather than reducing their rate. Constrained decoders set the probability of grammar-violating outputs to zero at every generation step; there's nothing statistical about it.

The cluster-selective interventions show large, predictable gains when they target the right failure mode:

- PAL (program-aided language models) targets the arithmetic cluster on GSM-Hard: accuracy goes from 20.1% to 61.5%, with residuals shifting to problem-comprehension errors rather than arithmetic ones
- Reflexion + AgentCoder targets the code-logic cluster on HumanEval: pass@1 goes from 80% to 96.3%, with residuals in spec-misinterpretation
- POROver targets the over-refusal cluster: the not-overrefused rate goes from 57.6% to 82.1%
- SAGE-Agent targets tool-call clarification: When2Call accuracy goes from 36.5% to 65.2%

The gains are large because the interventions are matched to the failure mode. This is the selectivity claim in action: an intervention that targets the right cluster doesn't just nudge the metric — it moves it substantially, because it's addressing the dominant source of failures.

DebugBench provides a useful negative control. Execution feedback works for syntax and reference errors but is explicitly "unhelpful for logic errors." That's not a failure of the framework — it's confirmation that selectivity cuts both ways. An intervention that doesn't match the failure mode won't help, and knowing that in advance is valuable.

The paper also re-audits several steep-decay results that are often cited as evidence against LLM reliability at scale. GPT-4 drops from 59% to 4% accuracy going from 3-digit to 4-digit multiplication zero-shot — a dramatic cliff. But the re-audit finds that the decay variable is compositional graph size, not raw token length. Similarly, other steep-decay results in the literature decay over number of supporting facts, log-time horizon, or evidence scope — not context length per se. DeepSeek-R1 maintains accuracy at 130 reasoning operations, where a naive per-token exponential decay model would predict near-zero. The patch-local framing reinterprets these results: they're telling you something about the structure of the hard-decision fraction, not about context windows.

---

## What to Do With This

The practical shift this paper argues for is from model-level reliability assessment to patch-local failure auditing. Before deploying or evaluating an LLM system, define your operational patch explicitly — task domain, schema, user distribution, knowledge sources, evaluation criteria, policy constraints, time horizon. Then audit failures within that patch and count distinct modes. If the pattern holds, you'll find 8–20 recurring categories, with the top two or three accounting for the majority of failures.

From there, the intervention strategy follows the cluster structure. For each dominant failure mode, ask whether it can be eliminated by construction — constrained decoding, schema validation, proof kernels — or whether it requires rate reduction through fine-tuning, process reward models, or retrieval augmentation. The by-construction eliminations are worth prioritising: they remove entire failure classes rather than nudging rates, and they don't degrade under distribution shift within the patch.

The framework is untested on agentic workflows, multi-turn long-horizon tasks, and settings where the hard-decision fraction grows substantially with task length. The authors are explicit about this. For those settings, the catalogue may not saturate cleanly, and the polylogarithmic budget bound may not hold. But for the bounded operational deployments that describe most production use — a specific task type, a defined schema, a stable user population — the argument is that reliability is a local catalogue problem, and local catalogue problems are solvable.

The question to ask isn't "how reliable is this model?" It's "what are the 8–20 failure modes in my deployment, and which ones can I eliminate by construction?"

*Arbuzov, M. L., Mosbacker, L., Bei, S., Dong, Z., Kalaev, D., & Shvets, A. (2026). The Architecture of Errors: From Universal Impossibility to Patch-Local LLM Reliability. arXiv:2605.30628*