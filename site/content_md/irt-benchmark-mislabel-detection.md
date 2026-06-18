# IRT Catches Mislabeled Benchmark Items at 95% Precision Without Human Annotation

Benchmark labels are usually treated as ground truth. They're not. Across seven widely used LLM evaluation benchmarks — covering preference ranking, factual multiple-choice, and math — roughly one in twenty items has a wrong or unanswerable label. That's not a rounding error. It's the kind of systematic noise that quietly distorts model rankings, misleads reward model selection, and makes leaderboard positions mean less than they appear to.

The standard response to this problem is human review, which doesn't scale, or disagreement-based heuristics, which miss a lot. This paper takes a different route: fitting a psychometric model — Item Response Theory — to the response patterns of 114 models across 20,986 items, then using a likelihood contrast to surface the items where something is structurally wrong. No labels required at training time.

The anchoring result: among the top 200 items flagged by the method, 95% are genuinely mislabeled or unanswerable. Among the 18,236 items the method leaves unflagged, 97% are correctly labeled.

---

## The Problem: Benchmark Labels Are Quietly Wrong

Manual inspection of 874 flagged items confirmed three recurring failure modes. The first is construction and verification artifacts — items where the benchmark's own assembly process introduced an error that made it through review. The second is inherited source errors: mistakes copied unchanged from the upstream datasets the benchmark drew on. The third is items with no stable single best answer — questions where reasonable, well-informed respondents would disagree, and where calling any one option "correct" is a choice the benchmark made rather than a fact it recorded.

These aren't edge cases. They account for most of the noise the method surfaces. And they're distributed across benchmarks that practitioners treat as reliable: RewardBench, RewardBench 2, RM-Bench, JudgeBench, GPQA Diamond, MATH-MC, and GSM-MC.

The scale matters here. Of 874 flagged items, 81% turned out to be mislabeled or subjective. Of 18,236 unflagged items, 97% were correctly labeled. That's a 27-fold difference in noise rate between the flagged and unflagged populations — which means the method is doing real work, not just identifying hard items.

> **81%** of flagged items confirmed mislabeled or subjective (n=874) · **3%** of unflagged items found to be mislabeled (n=18,236)

---

## How the Indicator Works: Forced-Ceiling IRT

Item Response Theory was developed for educational testing. The core idea is that both test-takers and test items have latent parameters, and you can estimate both from the pattern of right and wrong answers. A four-parameter logistic (4PL) model adds a ceiling parameter — the probability that even the most capable respondent gets the item right.

For a well-formed benchmark item, that ceiling should be close to 1.0. A genuinely hard question is one that the best models sometimes miss, not one that the best models consistently get wrong. When the fitted ceiling is low — when even the strongest models are failing an item at high rates — that's a signal worth investigating. It might mean the item is extraordinarily hard, or it might mean the labeled answer is wrong.

The method distinguishes between those two cases using a likelihood ratio. For each item, it compares how well the data fits when the ceiling is forced to 1.0 versus when it's left at its fitted value. Items where forcing the ceiling to 1.0 dramatically improves fit are the ones where the data is inconsistent with the item being genuinely hard — they're more consistent with the answer being wrong. That contrast, ∆ℓ_i, is the mislabel score.

One implementation detail matters a lot. The raw ceiling parameter d_i is nearly bimodal across the 19,164-item fit set: 151 items cluster near zero, 12,357 cluster near one, and there's not much in between. That distribution leaves almost no ranking resolution within either mode — you can't usefully sort items by d_i alone. The likelihood contrast is what provides the ranking signal, which is why a supervised classifier trained on the raw 4PL parameters (XGBoost, five-fold cross-validated) can't recover the same performance even though it has access to d_i directly.

Before fitting, a consistency filter removes items where correctness is uncorrelated with model ability — items where Pearson r between item correctness and model mean accuracy falls below 0.2. That filter removes 2,864 items and improves P@200 from 92% to 95% while keeping average precision near 0.843.

> **95.0%** precision at top 200 flagged items under strict mislabel scoring, versus 90.0% for an XGBoost classifier trained on the same IRT parameters

---

## Detection Performance Against Baselines

The forced-ceiling indicator outperforms every baseline tested, including methods that have access to the same underlying data.

| Method | P@200 |
|---|---|
| 4PL forced-ceiling ∆ℓ_i (proposed) | **95.0%** |
| Top-10 model disagreement | 91.5% |
| XGBoost on raw 4PL parameters | 90.0% |
| Plain 4PL single-stage / 2PL variants | 88.5% |

The gap between the forced-ceiling indicator and XGBoost is the most telling comparison. XGBoost has all four IRT parameters, including d_i, but achieves 90.0% P@200 versus 95.0% for the likelihood contrast. That 5-point gap suggests the contrast captures a structural signal — the relationship between the fitted ceiling and the data's fit under a constrained model — that isn't directly readable from the parameter values themselves.

The top-10 disagreement baseline, which flags items where the ten strongest models disagree with the reference label, reaches 91.5% P@200. That's a reasonable heuristic, but it's also one that requires choosing which models count as "top" and that conflates genuine difficulty with label error. The IRT approach separates those two things by design.

GPQA Diamond — the hardest factual benchmark in the set, covering graduate-level science — contributes only 6 false positives out of 165 fitted items. That's important because it shows the method isn't just flagging hard items. Expert-level questions that are correctly labeled mostly survive the filter intact.

---

## A Contamination Signal Hidden in the Data

Beyond label quality, the IRT framework surfaces something else: reward models behave differently from general-purpose LLMs in ways that are consistent with specialization — and in at least one case, with possible benchmark contamination.

Subset-level ability refitting estimates each model's latent ability separately on each benchmark subset, then compares that to its global ability estimate. Reward models consistently score above their global mean on preference benchmarks and below it on factual multiple-choice tasks, with typical deviations of 0.2–0.5 ability units. That's expected — these models are trained on preference data, not math — and it confirms that reward model rankings on mixed benchmarks are measuring something closer to stylistic fit than general capability.

One model stands out. Skywork-Reward V2 Llama 8B agrees with the flagged mislabels on preference tasks at 78%, roughly double the ~38% rate of peer reward models. That's a large gap. Skywork-Reward V2 was trained on a 40M-pair preference mixture drawn from public datasets — the same ecosystem from which these benchmarks draw their items. High agreement with detected mislabels is consistent with training data overlap: if the model was trained on data that includes the benchmark's mislabeled items as positive examples, it would learn to prefer the wrong answers.

The authors are careful here. They don't have access to Skywork's training data, so this is a screening signal, not a finding of contamination. But a 2× gap from peer models is large enough that anyone using Skywork-Reward V2 as a preference judge should treat its scores on these benchmarks with some skepticism.

---

## What to Do About It

If you're selecting a reward model for preference ranking or RLHF, run subset-level ability refitting before trusting leaderboard positions. A model that ranks highly overall but shows large positive deviations on preference subsets and large negative deviations on factual subsets is a specialist, not a generalist — and its scores on preference benchmarks may reflect training data overlap more than genuine capability.

If you're auditing a benchmark — whether you built it or you're using someone else's — the forced-ceiling IRT indicator gives you a prioritized list of items to review without requiring exhaustive human annotation upfront. At 95% precision in the top 200, you can focus human review where it's most likely to find real problems. The method is unsupervised, scales to tens of thousands of items, and handles multiple-choice and preference formats without modification.

The consistency filter (r > 0.2) is worth applying before any IRT-based analysis. It removes items where the response pattern is too noisy to fit reliably — items that would otherwise add noise to the ability estimates and reduce precision downstream.

One honest limitation: the method's resolution depends on having a panel of models with enough ability spread to distinguish hard items from mislabeled ones. On benchmarks evaluated by a narrow set of similarly capable models, the signal would degrade. The 114-model panel used here — spanning 2023 through 2026, including six dedicated reward models — provides enough spread to make the contrast meaningful. Smaller panels would need validation before the precision numbers transfer.

*Land, S., & Bikel, D. M. (2026). Auditing LLM Benchmarks with Item Response Theory. arXiv:2605.30504*