# Cross-Encoder Training: The Loss Function Matters More Than the LLM Teacher

## What a Large-Scale Reproduction Study From Sorbonne Actually Shows About Cross-Encoder Training

The standard narrative in neural re-ranking has been moving toward complexity: larger backbones, richer training signals, and increasingly, distillation from large language models. The logic is intuitive — if a generative model can rank passages well, its judgments should make a better training signal than supervised labels alone. A paper from Sorbonne Université, CNRS, and ISIR challenges that logic directly, not with a theoretical argument but with 162 controlled experimental runs across nine backbones and six training objectives.

Prior comparisons of cross-encoder training approaches have been difficult to interpret. Different studies use different retrievers, different candidate depths, different evaluation suites, and different checkpointing strategies. A result attributed to a better loss function might reflect a better negative pool. A result attributed to LLM distillation might reflect a larger training set. The Sorbonne study eliminates those confounds by running every objective through the same pipeline — same first-stage retriever (SPLADE-v3-DistilBERT, top-1000 candidates), same evaluation suite spanning MS MARCO, TREC-DL, BEIR-13, LoTTE Search, and Robust04, same optimizer and schedule across all 162 runs.

The number that anchors the study: 3,870 total evaluations across both experimental phases, covering the full factorial of nine backbones, six objectives, and three random seeds in Phase II alone.

---

## The Setup: 162 Runs, Six Losses, Nine Backbones

The six objectives span the full design space of cross-encoder training. On the pointwise end: Binary Cross-Entropy (BCE) and Hinge Loss, both standard baselines. On the pairwise end: MarginMSE, originally designed for dual-encoder distillation and applied here to cross-encoders — a new application rather than a direct reproduction. On the listwise end: InfoNCE, using ColBERTv2 hard negatives. And two LLM-distillation methods — DistillRankNET and ADR-MSE — both using RankZephyr as teacher, trained on 10,000 MS MARCO queries with 50 passages per query.

The nine encoder-only backbones range from 17M to 184M parameters: BERT-Base, MiniLM-L12, RoBERTa, ELECTRA, DeBERTaV3, and the Ettin scaling suite at 17M, 32M, 68M, and 150M. The Ettin suite is particularly useful here — it provides a clean within-study capacity ladder without the pretraining variation that complicates cross-architecture comparisons.

Hyperparameters were tuned in Phase I on proxy models (MiniLM and BERT-Base) and held fixed for Phase II. This introduces a caveat: per-backbone tuning might shift some rankings at the margins. The researchers are transparent about this tradeoff. With 162 runs at three seeds each, per-backbone search was computationally out of scope.

Statistical analysis uses a Friedman test followed by Nemenyi post-hoc tests — appropriate for ranked comparisons across multiple conditions. The Friedman test is run over 54 backbone-evaluation combinations for objectives and 36 loss-benchmark combinations for backbones. Results are reported as average ranks, where lower is better.

---

## Objective Choice Is the Dominant Lever

The Friedman test confirms highly significant differences among objectives. The Nemenyi post-hoc rankings are unambiguous: InfoNCE averages rank 1.83 across the 54 backbone-evaluation combinations, MarginMSE averages 2.17, and both form a statistically distinct top tier. DistillRankNET lands at 3.61, ADR-MSE at 3.66 — a middle tier, statistically below both listwise and pairwise supervised objectives. BCE sits at the bottom with an average rank of 5.74, significantly worse than every other objective tested.

The magnitude of the gap matters. The difference between the best objective (InfoNCE, rank 1.83) and the worst (BCE, rank 5.74) is comparable in magnitude to the gap between small and large backbone architectures. A team running BCE on a large backbone is leaving performance on the table that a switch to InfoNCE or MarginMSE would recover — without any change to the model itself.

MarginMSE's position in the top tier is notable for a separate reason. It uses BM25-mined negatives with cross-encoder teacher scores, while InfoNCE uses ColBERTv2 hard negatives. The two methods differ in both loss formulation and negative pool quality, yet they land in the same statistical tier. This is indirect evidence that the loss formulation is doing more work than the negative source — though the study doesn't include a controlled ablation isolating that factor.

The practical implication is direct: before adjusting architecture, training data, or teacher model, changing the loss function from pointwise to listwise or pairwise is the highest-leverage intervention the evidence supports.

---

## LLM Distillation Does Not Deliver on Its Promise

Both LLM-distillation objectives — DistillRankNET and ADR-MSE — land in the statistical middle tier, below InfoNCE and MarginMSE, despite leveraging RankZephyr as teacher. RankZephyr is a large generative model trained specifically for passage ranking. The distillation training set covers 10,000 MS MARCO queries. By prior reasoning, this should be a strong signal.

Under the unified controlled setup, it isn't. Distilling from an LLM teacher provides no statistically significant advantage over a purely supervised listwise objective or a pairwise objective using cross-encoder teacher scores. The researchers note this contradicts some prior claims about LLM-distillation superiority and suggest the gains reported in original papers may reflect uncontrolled confounds rather than genuine teacher quality effects — a conclusion consistent with the reproduction's ability to recover the original DistillRankNET results on TREC-DL'19 when the candidate pool depth is matched.

There is one exception worth noting: on Robust04, MiniLM-L12 with DistillRankNET achieves the highest score in the study at 0.520 nDCG@10. Robust04 is a genuinely out-of-domain benchmark, and the ranking among top objectives is less stable there than on other benchmarks. The researchers flag this explicitly — no single loss consistently dominates across all backbones on Robust04. The aggregate ranking holds, but practitioners targeting specific OOD domains should treat the Robust04 result as a signal worth investigating rather than noise.

The broader implication: the infrastructure cost of LLM distillation — generating teacher scores, managing the training pipeline, handling the 10k-query subset — is not returning a performance premium over simpler supervised objectives in this controlled comparison.

---

## Backbone Scaling: Efficiency Beats Raw Size

The backbone rankings produce two findings that cut against common assumptions about model scaling.

First, MiniLM-L12 at 33M parameters is statistically indistinguishable from ELECTRA at 110M. In the Nemenyi rankings across 36 loss-benchmark combinations, ELECTRA averages rank 1.97, Ettin-150M averages 2.69, MiniLM-L12 averages 3.11, and BERT-Base averages 3.79 — none significantly different from each other. A 3× parameter difference produces no measurable re-ranking advantage when the smaller model has efficient pretraining.

Second, DeBERTaV3 at 184M parameters — the largest backbone tested — ranks alongside Ettin-68M, with average ranks of 5.63 and 5.76 respectively. DeBERTaV3 performs well on NLU benchmarks. That performance does not transfer to passage re-ranking under this setup. Pretraining advances in language understanding are not automatically pretraining advances for retrieval tasks.

Within the Ettin scaling suite, the picture is more nuanced. The jump from 17M to 32M is substantial: BEIR-13 nDCG@10 rises from 0.433 to 0.469 with InfoNCE. Gains from 68M to 150M are noticeably narrower, pointing to a practical sweet spot around mid-range capacities. A 32M Ettin trained with MarginMSE achieves an ID nDCG@10 of 0.426, matching a 110M BERT-Base trained with ADR-MSE at 0.427 — the right objective compensating fully for a 3× parameter deficit.

The Ettin-17M and Ettin-32M models rank significantly worse than all base-sized models in the Nemenyi backbone rankings (average ranks of 8.97 and 7.94 respectively), confirming that very small models face a capacity floor that objective choice can't fully overcome. The sweet spot the data points to is somewhere between 32M and 68M, depending on the deployment constraint.

---

## Before the Next Infrastructure Investment

The paper's practical implication is not that LLM distillation is useless or that backbone choice is irrelevant. It is that the ordering of decisions matters, and current practice often inverts it.

The evidence from 162 controlled runs is that loss function choice should come first. Teams running BCE — still a common default — should switch to InfoNCE or MarginMSE before evaluating any other change. The performance gap is statistically significant and architecturally comparable in magnitude to moving to a larger backbone.

After objective choice, backbone efficiency matters more than raw parameter count. MiniLM-L12 at 33M matching ELECTRA at 110M is not a marginal result — it is a 3× compute difference with no measurable output difference. DeBERTaV3's underperformance relative to its size is a warning against assuming NLU benchmark rankings transfer to re-ranking tasks.

LLM distillation pipelines carry real infrastructure costs. The controlled evidence here does not support paying those costs for a cross-encoder re-ranker when InfoNCE or MarginMSE is available. That conclusion may not hold under different teacher models, different candidate depths, or different domain conditions — the researchers are explicit about those limits. But the burden of proof has shifted: the gains need to be demonstrated under controlled conditions, not assumed from prior uncontrolled comparisons.

*Morand, V., Vast, M., Van Cooten, B., Soulier, L., Mothe, J., & Piwowarski, B. (2026). Reproducing and Comparing Distillation Techniques for Cross-Encoders. arXiv:2603.03010*