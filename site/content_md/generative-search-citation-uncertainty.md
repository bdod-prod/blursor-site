# Generative Search Citation Share Is a Noisy Estimator, Not a Score

## What a New Statistical Framework for Generative Search Measurement Actually Shows

A paper from IQRush, published on arXiv, does something most AI visibility reporting hasn't: it treats citation share as a statistical estimator with a sampling distribution rather than a fixed performance score. The distinction matters because generative AI platforms use stochastic sampling at generation time — the same query submitted twice can return different cited sources. Citation share is therefore an estimate of a population parameter, subject to the same uncertainty as any other sample-based estimate. Most current reporting ignores this entirely.

The study collected 374,052 citations over nine consecutive days from three platforms — Perplexity Search, OpenAI SearchGPT, and Google Gemini — across three consumer product topics, using 200 queries per topic per platform per sample. A parallel high-frequency dataset of 379,276 citations was collected at ten-minute intervals. The result is the first systematic characterization of citation share uncertainty across platforms, including bootstrap confidence intervals, rank stability analysis, and CI width convergence curves as a function of query count.

The number that anchors the paper: a single-run estimate of nationalgeographic.com's citation share on one platform came in at 0.032. The cross-sample mean was 0.005. The bootstrap confidence interval from that single run failed to capture the long-run value.

---

## The Measurement Problem: Citation Share Is a Sample Estimate, Not a Score

Generative search platforms don't return a deterministic ranked list. They sample from a distribution at generation time. This means citation share — the fraction of responses in which a domain appears — is an estimator of an underlying population parameter, and like any estimator it has variance. The variance is not small.

Citation distributions across all nine platform–topic combinations follow a power-law form. A small number of domains absorb most citations; the long tail is sparse and especially noisy. For gardeningknowhow.com on Gemini bird feeders — the highest observed domain-level dispersion in the dataset — the log-space standard deviation across nine daily samples was 1.93, equivalent to citation shares varying by a factor of roughly 6× the geometric mean. That is not a domain with a stable citation share. It is a domain with a citation share that is largely undefined from any single measurement.

The nationalgeographic.com example is the clearest illustration of what single-run reporting produces. A point estimate of 0.032 — presented without a confidence interval — would suggest a domain with meaningful citation presence. The cross-sample mean of 0.005 tells a different story. The bootstrap CI from the single run failed to contain the long-run value. This is not an edge case; it is what happens when a noisy estimator is reported as a score.

The most stable frequently-cited domain in the entire dataset was runnersworld.com on Perplexity, with a log-std of 0.062. That is the ceiling. Most domains are considerably noisier, and the practical implication is that any visibility report presenting citation share as a point estimate is reporting noise as signal.

---

## Platform Stability Rankings: Perplexity Holds, Gemini Drifts

The three platforms form a clear and consistent stability ordering. Perplexity is the most stable, with median Jaccard similarity across repeated runs of the same query at approximately 0.50. SearchGPT sits in the middle at 0.33–0.40. Gemini exhibits the greatest volatility, with median Jaccard of 0.29–0.31. This ordering holds across topics and across both the daily and high-frequency sampling regimes.

Citation-set similarity is essentially flat across the observed range of citation counts per response. Gemini hovers near 0.30 whether a response contains 10 or 70 citations; SearchGPT near 0.40–0.42 across 3–12 citations; Perplexity near 0.50 across 5–35 citations. The dominant determinant of citation consistency is platform identity, not how many sources a response includes.

SearchGPT contains a structural anomaly worth noting separately. Nine frequently-cited domains in the multivitamins topic showed a log-std of exactly 0.0 — identical citation counts across all nine daily samples. A deterministic layer fires consistently for certain domain–query pairings on that platform, while other domains on the same platform are highly variable. The platform is not uniformly stochastic; it is stochastic for most domains and deterministic for a subset, with no obvious external signal distinguishing which regime applies to a given domain.

Mean log-space dispersion across all frequently-cited domains tells a more compressed story: Gemini at 0.504, Perplexity at 0.421, SearchGPT at 0.417. The platform ordering by mean dispersion is closer than the Jaccard ordering suggests — Gemini is clearly noisiest, but Perplexity and SearchGPT are similar in aggregate even though their citation-set overlap patterns differ.

---

## Confidence Intervals Wide Enough to Swallow Most SEO Wins

95% bootstrap confidence intervals on citation share span 3–6 percentage points for SearchGPT domains. The paper's motivating example is direct: tomsguide.com on SearchGPT running gear has a 95% CI of 5.5% to 12.5% from a 200-query sample. Runnersworld.com on the same platform and topic: 4.0% to 8.0%. These intervals overlap substantially. A domain comparison that looks meaningful as a point estimate is statistically indistinguishable from noise.

An intervention that moves a domain's SearchGPT citation share from 8% to 11% — a 3-percentage-point gain — falls entirely within the typical CI width. It cannot be attributed to the intervention with statistical confidence. This applies to the majority of effect sizes that SEO practitioners would consider meaningful wins.

The queries required to achieve a 95% CI width of ≤0.05 on citation share are roughly 40–50 for Gemini, approximately 100 for Perplexity, and 150 or more for SearchGPT. The SearchGPT convergence curve is non-monotonic — the target CI width may not be reliably achievable at any fixed sample size. For citation prevalence, the picture inverts: SearchGPT reaches a CI width of ≤0.15 with approximately 60–80 queries, while Gemini and Perplexity require 140–150. The choice of metric matters for how much data collection is feasible.

---

## Rank Instability: Adjacent Stability Masks Cumulative Drift

Distribution-wide weighted Spearman rank correlations show that for most platform–topic combinations, the full rank ordering of frequently-cited domains is either unstable or cannot be assessed with sufficient precision from the available sampling budget. For SearchGPT multivitamins and running gear, zero sufficient pairs exist in the rank correlation analysis — the rank ordering is simply unassessable at the current sampling scale.

The more subtle finding concerns consecutive-pair versus span comparisons. For Gemini bird feeders and multivitamins, each consecutive daily pair shows a Spearman ρ above 0.80 — which looks like stability. Span comparisons between the first and last job fall to approximately 0.69–0.73. Cumulative drift is invisible from any single adjacent-pair check. A monitoring system that compares today's rankings to yesterday's will consistently underestimate how much the ordering has shifted over a week.

Content changes are not the explanation. SHA-256 checksums of human-readable page content confirm that the overwhelming majority of source pages were stable across consecutive samples. Citation oscillations occur against a background of largely unchanged source material. The variability is structural — it belongs to the engine, not the content.

The one relatively stable rank structure in the dataset is Gemini running gear, with a mean weighted Spearman ρ of 0.913 across sufficient consecutive job pairs. That is the exception. Most platform–topic combinations do not approach it.

---

## Before the Next Visibility Report

The paper's practical implication is not that generative search measurement is impossible. It is that the current default — a point estimate from a single run, presented as a performance score — is the wrong unit of analysis.

Any report on AI citation share should include bootstrap confidence intervals. Without them, apparent differences between domains and apparent gains from interventions are indistinguishable from platform-level stochasticity. The sample sizes required to produce actionable CIs are non-trivial: 40–50 queries per topic for Gemini, around 100 for Perplexity, 150 or more for SearchGPT — and for SearchGPT the convergence is non-monotonic, meaning larger samples don't reliably solve the problem.

For practitioners evaluating SEO interventions in generative search, the implication is that pre/post comparisons need to be designed with the CI width in mind before the intervention runs. An effect smaller than 5–7 percentage points on SearchGPT citation share will not be detectable as attributable to the intervention regardless of how carefully the intervention is executed. Knowing the noise floor in advance determines whether a measurement program is worth running at all.

The platforms are not equivalent instruments. Perplexity is the most stable measurement surface. Gemini is the least stable for rank ordering but requires the fewest queries for CI convergence on citation share. SearchGPT has a deterministic layer that makes some domains easy to measure and others effectively unmeasurable. Treating them as interchangeable in a cross-platform visibility dashboard produces a composite metric that inherits the worst properties of each.

*Sielinski, R. (2025). Quantifying Uncertainty in AI Visibility: A Statistical Framework for Generative Search Measurement. arXiv:2603.08924*