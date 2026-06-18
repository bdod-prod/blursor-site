# When a Model Gets Everything Right, Token Entropy Can Still Teach It Something

Most preference-learning pipelines assume the training data contains a mix of correct and incorrect completions. The reward signal comes from that contrast — right answers beat wrong ones, and the model learns accordingly. But what happens when a capable base model already solves every problem in the training set? Every completion is correct. The correctness signal has nothing left to say.

This is the saturated data problem, and it's not a hypothetical edge case. Qwen3-1.7B-Base already achieves perfect pass@1 on 2,302 of GSM8K's training questions — problems the model has, in effect, mastered. Standard training on those examples offers no gradient signal to differentiate quality among all-correct completions.

A new paper from ETH Zurich asks whether a different signal can step in. Their answer: inverse token-level entropy — a measure of how confidently the model generates each token — correlates moderately with solution quality even when correctness can't discriminate, and training on it recovers substantial performance gains. The catch is a sharp one: it only works for base models.

---

## The Saturated Data Problem

The authors split training data into three buckets based on empirical pass@1: D_saturated (the model already solves every sampled attempt), D_hard (pass@1 ≤ 25%), and D'_strict (a strictly easier distribution where pass@1 is also 1, but drawn from simpler problem variants). The question they're investigating is whether anything useful can be extracted from D_saturated and D'_strict — the sets where correctness has already flatlined.

For standard supervised fine-tuning or DPO, saturated data is nearly inert. All completions are correct, so any ranking among them is arbitrary unless you bring in an external quality signal. The paper tests two candidates: a self-judge (the 1.7B model itself doing pairwise comparisons) and inverse entropy (ranking completions by how confidently the model generated them, token by token).

The motivation for entropy as a proxy comes from a well-documented pattern in post-training: instruction-tuning and RLHF systematically compress token-level entropy. Models that have been aligned tend to generate more decisively. So if you select the lowest-entropy completions from a base model's outputs, you're approximating the kind of structured, confident generation that instruction-tuning would eventually induce — without needing the instruction-tuning itself.

**2,302** — GSM8K training questions where Qwen3-1.7B-Base already achieves perfect pass@1, leaving no correctness signal to learn from.

---

## Inverse Entropy as a Quality Proxy

The correlation numbers are what make this worth taking seriously. Inverse entropy correlates with a strong external judge (Qwen3-30B) at ρ = 0.56 on GSM8K and ρ = 0.44 on the chain-sum task. That's a moderate but real signal — the low-entropy completions tend to be the ones a much larger model would also prefer.

The self-judge does the opposite. The 1.7B model's pairwise preferences anti-correlate with the 30B judge on GSM8K at ρ = −0.20. The model's own quality assessments are not just noisy — they're systematically inverted. Using them for training actively misleads the model about which of its outputs are good.

This asymmetry matters because self-judging is the obvious cheap alternative to an external judge. The paper shows it's worse than cheap — it's counterproductive at this scale, at least on GSM8K. Inverse entropy, by contrast, requires no model call at all: it's computed from the generation logits already produced during sampling.

| Signal | Correlation with Qwen3-30B judge |
|---|---|
| Inverse entropy (GSM8K) | ρ = +0.56 |
| Inverse entropy (chain sum) | ρ = +0.44 |
| Self-judge (GSM8K) | ρ = −0.20 |
| Self-judge (chain sum) | ρ = +0.19 |

---

## Training Results: Where the Signal Pays Off

The paper tests two training algorithms: DPO and σ-RRHF, a logistic-weighted variant of RRHF that includes an SFT anchor on the best completion. Both are applied to quality-ranked pairs drawn from saturated training questions.

On the chain-sum task, σ-RRHF with inverse entropy trained on D_saturated improves pass@1 by 18.6 percentage points over the base model (10.63% → 29.25%). Trained on D'_strict, it reaches 22.35% — an 11.7-point gain — and actually outperforms the variant using Qwen3-30B as the judge (19.69%). A cheap, judge-free signal beating an expensive external one is the headline result.

On GSM8K, the picture is more modest. Inverse entropy DPO adds 3.3 percentage points over the base model (67.83% → 71.17%), while the strong external judge DPO adds 7.7% (75.52%). Entropy is useful but not dominant on GSM8K — and the self-judge is actively destructive, dragging σ-RRHF down to 55.43%, well below the base model's 67.83%.

One structural finding stands out from the ablations: the SFT anchor inside σ-RRHF is doing most of the work. Remove it and pass@1 on D_hard collapses from 39.75% to 6.69%. The ranking loss alone, without the anchor pulling the model toward its best completions, is nearly useless. This suggests the gains attributed to quality-based ranking are partly gains from supervised fine-tuning on high-quality completions — the ranking signal adds something, but not everything.

---

## Where the Method Breaks Down

The failure modes are as informative as the successes.

Inverse entropy does nothing for instruction-tuned models. Applied to Qwen3-1.7B (the instruction-tuned variant), DPO with inverse entropy degrades GSM8K accuracy from 84.32% to 82.13%. The reason is straightforward: instruction-tuning has already compressed token-level entropy. The signal that discriminates among base model completions has been erased, so entropy-based ranking becomes noise.

Self-judging at 1.7B scale is unreliable enough to be harmful. The anti-correlation on GSM8K (ρ = −0.20) means the model is systematically preferring its worse outputs. Training on those preferences reinforces errors rather than correcting them — a 12.4-point drop from the base model when using σ-RRHF with self-judge on GSM8K.

DPO is also brittle to the regularization coefficient on saturated data. The standard β = 0.1 yields only 5.06% pass@1 on D'_strict. Even the best setting found (β = 5) reaches only 13.56% — below SFT's 14.62%. Getting DPO to work on saturated data requires careful hyperparameter tuning, and even then it doesn't beat a simple supervised baseline.

The authors flag scorer reliability as the central open problem. If the quality signal is wrong, training amplifies the error. Entropy-based ranking may also reduce solution diversity or push the model toward overconfident generation — neither of which is measured here. And the whole framework is offline: how inverse entropy would interact with online RL methods like GRPO is untested.

---

## What to Do With This

If you're training a base model and your training set is correctness-saturated — either because the model is strong or because the problems are easy — inverse entropy is worth trying before you pay for an external judge. It's free to compute from generation logits, it correlates meaningfully with quality, and it outperforms self-judging by a wide margin at small model scales.

But apply it only to base models. If you're fine-tuning an instruction-tuned checkpoint, entropy has already been compressed and the signal is gone — applying it will likely hurt. And if you're using σ-RRHF, check whether the SFT anchor is doing the heavy lifting before attributing gains to the ranking component.

The broader implication is about where the field is heading. As base models get stronger, correctness-saturated training sets will become the norm rather than the exception. The standard reward signal — right versus wrong — will have less and less to say. Signals like entropy that operate within the space of correct completions will matter more. This paper is an early, honest look at what works and what doesn't in that regime.

*Hiss, H., Dekoninck, J., & Vechev, M. (2026). Learning from Saturated Data: Signals Beyond Correctness for LLM Training. arXiv:2606.01436*