# Rewording a Buying Question Changes the Brands AI Recommends More Than Switching Models Does

## Paraphrase brittleness makes prompt wording the dominant signal in AI brand recommendations

If you're tracking which brands an AI assistant recommends for a given buying category, the prompt you use to ask the question matters more than which AI you're asking. That's the central finding of a new study measuring recommendation stability across 12,000 runs on OpenAI and Anthropic production models. The researchers varied two things independently — the model and the phrasing — and found that cosmetic rewording of a buying question produces more brand-recommendation divergence than switching providers entirely.

This has a direct implication for anyone running GEO measurement, brand-visibility benchmarks, or AI-search optimization programs: if your tracking methodology uses a fixed prompt corpus, you're not measuring what you think you're measuring. The signal is partly a function of which phrasing you happened to choose.

The anchoring number is this: same-prompt reruns within a single day produce recommendation-set overlap (Jaccard similarity) of 0.50–0.61. That's the stability ceiling — the best-case reproducibility before any variation is introduced. Everything else in the study is measured against it.

---

## The Rerun Baseline: What Stability Actually Looks Like

Before measuring how paraphrase affects recommendations, the researchers established how stable recommendations are when nothing changes at all. Running the same prompt repeatedly, within the same day, on the same model, produces Jaccard similarity of 0.50–0.61 on the recommendation slot. The mini model at low reasoning effort sits at the bottom of that range (0.50); the sonnet model at low effort sits near the top (0.61).

That baseline is worth sitting with. Even at its upper end, two runs of the identical prompt agree on only about 60% of recommended brands. This isn't a measurement artifact — it reflects genuine stochasticity in how these systems retrieve and rank. The retrieval pool, measured at the domain level, is even more volatile: within-cell retrieved-domain Jaccard ranges from 0.40 to 0.74 depending on model and reasoning effort, with the lower-capability cells showing more churn in what gets pulled before the final recommendation is assembled.

The rerun baseline isn't a high bar. It's the ceiling against which paraphrase robustness is measured — and as the next section shows, paraphrase falls well below it.

---

## Paraphrase Brittleness: Two Tiers of Collapse

The study tested five paraphrase axes: synonym swaps, structural rewrites, modifier substitutions, region/language changes, and specificity ladders (moving from a generic to a more constrained version of the same buying question). The first two are cosmetic — they preserve all the constraints in the original prompt. The last three add or shift constraints.

Cosmetic rewording drops recommendation-set similarity to 0.288. That's a 21–32 percentage-point fall from the rerun baseline of 0.50–0.61. The confidence interval for the cosmetic estimate runs from 0.215 to 0.361 — and even the upper bound of that interval sits 14 percentage points below the lower bound of the rerun baseline. The two distributions don't overlap.

Constraint-adding rewrites collapse further, to 0.135. Adding a region modifier or moving up or down a specificity ladder produces recommendation sets that share only about 13–14% of brands with the original phrasing. That's 37–48 percentage points below the rerun baseline.

The cross-provider comparison is where the finding gets counterintuitive. Running the same prompt on OpenAI versus Anthropic produces a recommendation-set Jaccard of 0.33 — worse than the within-provider rerun baseline, but better than cosmetic paraphrase within a single provider (0.288). Prompt wording, not provider identity, is the dominant input to which brands surface.

---

## Reasoning Effort Does Not Close the Gap

One reasonable hypothesis is that higher reasoning effort — the kind that helps on math and competition benchmarks — might stabilize recommendations by forcing more deliberate retrieval. The data doesn't support it.

Scaling from low to high reasoning effort moves rerun stability by a few Jaccard points at most. On the mini model, it goes from 0.50 to 0.54. On sonnet, the effect is slightly negative: 0.61 to 0.59. The effect on paraphrase robustness is similarly negligible across all tested cells.

The researchers' explanation is structural: math benchmarks have one correct answer, so additional reasoning can converge on it. Commercial recommendation admits many plausible correct answers — there's no single right list of CRM vendors for a mid-market buyer. Sampling more reasoning paths can't collapse onto a stable output when the output space is genuinely wide. The rerun-versus-paraphrase gap isn't a compute problem, and it won't be solved by dialing up inference-time effort.

---

## What This Means for Brand-Mention Tracking

The practical problem is that paraphrase-induced variation at Jaccard 0.13–0.29 completely swamps the run-to-run noise envelope of 0.50–0.61. If your brand-visibility metric moves week over week, you can't tell whether that movement reflects a model update, a content change on your site, or simply the fact that your tracking prompt is one of many phrasings that would produce different results.

This contaminates more than just raw tracking. Any GEO or AI-visibility benchmark that reports lift on a fixed prompt corpus inherits a paraphrase-choice artifact. If a study reports that optimizing your content raises AI recommendation rates by some percentage, part of that lift is a function of which phrasing the study happened to use — not just which content was optimized.

The fix isn't complicated in principle, though it's more expensive to run: paraphrase-stratified sampling across multiple phrasings of the same buying intent, rather than single-prompt tracking. A measurement program that runs one prompt per category is measuring the behavior of that specific string, not the behavior of the model toward that buying intent. Those are different things, and the gap between them — 21 to 48 percentage points of Jaccard, depending on how much the phrasing shifts — is large enough to make single-prompt tracking actively misleading.

If you're building or buying an AI brand-visibility measurement product, the first question to ask is how many paraphrase variants are in the prompt corpus and how they were sampled. A corpus of fixed prompts, however carefully chosen, produces a number that's partly about the prompts.

*Jack, W., Lehman, N., Maloney, K., & Xu, S. (2026). Paraphrase Brittleness in Production Retrieval-Augmented Commercial Recommendation: Reproducibility Below the Rerun-Stability Baseline. arXiv:2605.27440*