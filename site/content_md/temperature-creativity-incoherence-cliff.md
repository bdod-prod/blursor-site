# High Temperature Doesn't Make LLMs More Creative — It Makes Them Incoherent

The conventional wisdom around temperature and creativity goes something like this: turn it up to get more surprising, imaginative output. That intuition is wrong in a specific and measurable way. A new paper from UC San Diego shows that T=1.5 doesn't produce more creative writing — it produces incoherent writing, and the two things look very different when you examine what temperature actually does to the model's logit distributions.

The researchers captured the raw logits before and after temperature scaling at every generation step across 1,500 traces, then asked whether any per-token distributional feature could predict how human and LLM judges would rank the outputs for creativity. The answer is yes — but the reason why reveals something more important than the method itself.

Across 500 prompts evaluated by both GPT-4o and Gemini-2.5-Pro, T=1.5 was ranked most creative by either judge on essentially zero prompts.

---

## The Setup: Measuring What Temperature Actually Does to Logits

At each generation step, the model produces a distribution over its vocabulary before temperature is applied — call it P. Temperature scaling reshapes that into Q. The paper treats these as two distinct distributions and computes a catalogue of divergences between them: KL in both directions, Jensen-Shannon, total variation, Hellinger distance, plus metrics tracking how much probability mass leaks off the pre-temperature plausible set.

This happens at every token across 1,500 generation traces — 500 prompts drawn from WritingPrompts, the Alternative Uses Task, and HellaSwag ActivityNet, each generated at T=0.3, T=0.8, and T=1.5 using Llama-3.1-8B-Instruct. That's 437,837 token positions in total. Each trace gets a per-response aggregate (mean, median, 10th percentile, 90th percentile, max) for every divergence measure.

The question is whether any of those aggregates correlates with within-prompt creativity rankings — without any reference text, just the logit geometry of the generation itself.

---

## Neither Judge Ever Preferred T=1.5

Before getting to the distributional features, the ground truth is worth sitting with. GPT-4o ranked T=0.8 first on 293 of 500 prompts and T=0.3 first on 217. Gemini-2.5-Pro ranked T=0.8 first on 321 and T=0.3 first on 248. T=1.5 was ranked first by neither judge on more than one prompt out of 500.

The human raters — three co-authors working blind to temperature labels, annotating a 150-prompt subset — agreed with the LLM judges above the inter-human ceiling, which means the two ground truths are measuring the same thing. The averaged LLM judge isn't a noisy proxy for human judgment here; it's tracking the same construct, just with more coverage.

What this establishes is that the creativity-temperature relationship isn't a smooth curve where more temperature means more creativity until some quality cliff. The cliff is the whole story. T=1.5 is not a creative regime — it's an incoherence regime.

---

## The Distributional Signal: A Step Function, Not a Gradient

The mass leakage metric — postCumOnPre, measuring how much of the post-temperature distribution's mass falls within the pre-temperature plausible set — sits near 1.0 at both T=0.3 and T=0.8. At T=1.5, it drops roughly 20 percentage points to around 0.8. That drop is not gradual. T=0.3 and T=0.8 are nearly indistinguishable from each other; T=1.5 is a discrete step away from both.

The cumulative-mass width (top-p width) inflates substantially at T=1.5 as well. And the append rate — the fraction of positions where the sampled token fell outside the captured top-K logits and had to be added manually — was 0.00% at T=0.3, 0.09% at T=0.8, and 88.41% at T=1.5. That last number is striking: at high temperature, the model is routinely sampling tokens that weren't even in the top 200 candidates by pre-temperature probability.

The distributional features are picking up a real phenomenon. But the structure of that phenomenon — a step function rather than a gradient — tells you exactly what the features are detecting: whether the model has crossed into incoherence, not how creative it is within the coherent range.

---

## Beating Baselines — But for a Narrow Reason

The top distributional feature outperforms all four standard reference-free baselines: self-perplexity, mean predictive entropy, top-1 margin, and gzip compression ratio. Those baselines cluster tightly within about 0.02 of each other on the averaged-LLM ground truth, so the comparison is against a narrow band of performance. The distributional feature clears that band.

The reason it wins is structurally explained by the step function. Any feature that captures the T=1.5 cliff will outperform baselines that don't explicitly model the divergence between pre- and post-temperature distributions. The baselines aren't measuring that gap — they're measuring properties of the output sequence alone.

But here's what the method can't do: it cannot separate T=0.3 from T=0.8. The per-token feature values at those two temperatures are nearly identical. The gap from either to T=1.5 is one to three orders of magnitude on every metric; the gap between them is essentially nothing. The distinction between genuinely creative output and competent-but-bland output — the distinction that actually matters for practitioners trying to tune a generation pipeline — is not resolved by any single per-token statistic in the catalogue.

The paper is explicit about this. Discriminating the two coherent regimes is left to sequence-level features, described as a complementary layer for future work.

---

## What This Changes for Practitioners

If you're running creative generation tasks and using T=1.5 or higher because you believe higher temperature produces more creative output, the evidence here is clear: stop. Both LLM judges and human raters consistently preferred T=0.8 over T=1.5 across 500 diverse prompts, and the distributional analysis explains why — high temperature is pushing the model to sample tokens that were implausible under its own pre-temperature distribution, which reads as incoherence, not creativity.

The harder question — whether T=0.8 is meaningfully better than T=0.3 for your specific use case — remains open. The judges preferred T=0.8 more often, but the per-token distributional features can't tell them apart, and the paper doesn't claim the T=0.8 advantage is large or consistent enough to generalize. That distinction likely depends on prompt type, model, and what you mean by creative.

For teams building automated quality filters for generated content, the incoherence detection result is immediately useful: pre-vs-post-temperature mass leakage is a lightweight, reference-free signal that catches the regime where high temperature has gone wrong. It won't tell you whether the output is good — but it will tell you whether it's coherent.

*Parupudi, V.S.R., Ponnada, H., Kaushal, A., Parupudi, S.S., Dasari, S., & Bulusu, S. (2026). Before and After Temperature: A Distributional View of Creative LLM Generation. arXiv:2606.01451*