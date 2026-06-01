# You Can Predict How Good a Search Reranker Will Be Before Building It

Scaling laws have become standard infrastructure for large language model development — fit a power law on small runs, forecast where a large run lands, avoid training the expensive model to find out it underperforms. The same logic hasn't been applied systematically to information retrieval rerankers. Most reranker development still involves training at target scale and measuring. A new paper from UMass Amherst asks whether that's necessary.

The paper studies cross-encoder rerankers specifically — models that score query-document pairs jointly, as opposed to late-interaction architectures like ColBERT or generative rerankers. It trains six model sizes from 17M to 1B parameters across three training objectives — pointwise, pairwise, and listwise — on 100K MS MARCO passage ranking queries, then tests whether power law fits on sub-400M checkpoints can accurately forecast 1B-scale NDCG. The answer is yes, with important caveats about which metrics and which objectives the forecasts apply to.

The anchoring result: NDCG@10 at 1B parameters can be forecast from models up to 400M with RMSE of 0.015 for pointwise and pairwise objectives, and 0.018 for listwise — on held-out evaluation.

---

## The Core Finding: Reranking Obeys Power Laws

NDCG@10 scales predictably with both model size and training steps across all three reranking paradigms. The researchers fit a saturating power law to checkpoints up to 400M parameters, then test the fit against the 1B model. The held-out errors are low enough to be operationally useful: 0.015 RMSE for pointwise and pairwise, 0.018 for listwise, all on MSMARCO-dev.

The finding extends out of domain. TREC DL datasets from 2019 through 2023, plus DL HARD, show similarly low prediction errors. This matters because in-distribution results can reflect artifacts of the evaluation setup rather than genuine generalization. The TREC DL results suggest the scaling behavior is real — the power law isn't just fitting noise in the MS MARCO dev set.

Data scaling follows the same pattern. Fitting curves on training step checkpoints for a 150M model produces predictable trajectories for all three objectives. Joint scaling — fitting both model size and training data simultaneously — also works, with RMSE of 0.026 for pointwise, 0.023 for pairwise, and 0.026 for listwise on MSMARCO-dev. The joint fits are less precise than model-only fits, but still low enough to inform resource allocation decisions before committing to a full training run.

The practical implication is direct: teams can fit scaling curves on sub-400M training runs and forecast where a 1B model lands without training it. The forecast won't be exact, but RMSE around 0.015–0.018 is tight enough to distinguish between paradigm choices and architecture decisions at scale.

---

## Objective Choice Shapes the Scaling Curve

The three training objectives don't produce the same scaling curve — and the best-performing paradigm at one scale is not the best at another. At 400M parameters, pairwise training leads. As model size increases beyond that, listwise overtakes it. A team that benchmarks paradigms at 400M and extrapolates to 1B will draw the wrong conclusion.

Pointwise loss saturates earliest during data scaling. Both pairwise and listwise outperform pointwise around the first epoch mark, and the gap widens with additional training data. For teams constrained to shorter training runs, this ordering matters less — but for anyone training past one epoch, pointwise is the weakest option.

The scaling exponents and fit quality differ enough across the three objectives that a single universal scaling law cannot reliably cover all three. The paper is explicit on this: paradigm-specific fits are necessary. Fitting one curve and applying it across objectives will produce misleading forecasts — particularly for listwise, which shows slower early gains but stronger performance at large scale.

This means the forecasting workflow requires a decision upfront: pick a paradigm, fit its curve, forecast within that paradigm. Comparing paradigms at scale requires fitting separate curves for each and comparing the forecasts — not fitting one curve and reading off relative positions.

---

## Why Contrastive Entropy Fails as a Reranker Proxy

Contrastive Entropy has been used as a cheap proxy metric in dense retrieval scaling — a way to track model quality without running full retrieval evaluation. The UMass paper tests whether it transfers to rerankers. It doesn't.

For pointwise model scaling on MSMARCO-dev, CE RMSE is 0.348. NDCG RMSE for the same setting is 0.015. That's a 23× gap. The problem is score calibration: reranker score margins can fluctuate independently of ranking quality. A model can improve its ranked list while its score distribution shifts in ways that make CE worse — or vice versa. CE doesn't reliably track whether the ranking is actually improving.

The pairwise case illustrates this further. CE data scaling for pairwise doesn't decrease monotonically with more training steps — the curve isn't even directionally reliable as a proxy. For the pairwise paradigm, CE is not just imprecise; it's uninformative as a data-scaling signal.

The practical consequence: teams building rerankers should not substitute CE for NDCG in scaling experiments to save evaluation cost. The savings aren't worth the forecasting error. NDCG — or a metric that directly measures ranking quality — is necessary for the power law fits to be reliable.

---

## Scope and Limits of the Evidence

All experiments use BM25 as the first-stage retriever with top-100 candidates. Whether scaling laws hold under learned first-stage retrievers, or under different candidate set sizes, is untested. Retrieval quality affects the ceiling available to a reranker — a different candidate set could change the scaling dynamics in ways the paper doesn't address.

Only cross-encoder architectures are studied. Late-interaction models and generative rerankers are explicitly out of scope. The power law results here don't transfer to ColBERT-style models without separate validation.

MRR doesn't behave as cleanly as NDCG. On TREC DL '19 specifically, MRR doesn't follow predictable scaling trends — RMSE for MRR model scaling reaches 0.101 for pointwise on TREC DL datasets. Metric choice matters when applying these forecasts operationally. NDCG@10 is the reliable target; MRR is not.

Out-of-domain evaluation is limited to TREC DL variants. Broader benchmarks like BEIR are left to future work. The generalization claim — that scaling behavior holds out of domain — is supported within the TREC DL family, but shouldn't be extended to arbitrary retrieval benchmarks without additional validation.

---

## Before the Next Large Training Run

The paper's operational implication is straightforward. Before committing compute to a 1B-parameter reranker, train at 17M, 32M, 68M, 150M, and 400M. Fit a saturating power law to the NDCG@10 results. The forecast for 1B will be within roughly 0.015–0.018 NDCG points of the actual result — tight enough to make paradigm and architecture decisions without running the full experiment.

Fit separate curves per training objective. Don't use a single fit across pointwise, pairwise, and listwise. The objectives have different scaling exponents and different saturation points, and conflating them produces unreliable forecasts.

Don't use Contrastive Entropy as a proxy to avoid running NDCG evaluation. The 23× error gap makes it unsuitable for this purpose in the reranker setting, regardless of its utility in dense retrieval.

For teams choosing between paradigms at a given compute budget: pairwise is competitive at mid-scale; listwise becomes the stronger choice as model size grows past 400M. If the target deployment size is 1B or larger, fitting listwise curves early will give a more accurate picture of where the best-performing paradigm lands.

*Seetharaman, R., Bansal, A., Zamani, H., & Dhole, K. D. (2026). Scaling Laws for Reranking in Information Retrieval. arXiv:2603.04816*