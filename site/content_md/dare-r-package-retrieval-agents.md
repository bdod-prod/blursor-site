# DARE: How a 23M-Parameter Model Rescues LLM Agents in the R Ecosystem

R is not Python. The CRAN ecosystem spans thousands of packages with overlapping function names, specialized statistical semantics, and documentation conventions that don't map cleanly onto the broad corpora used to train general-purpose embedding models. When an LLM agent needs to find the right function for a mixed-effects model or a survival analysis, generic retrieval tends to surface plausible-sounding but wrong candidates. The agent then generates plausible-sounding but wrong code.

A new paper introduces DARE — Distribution-Aware Retrieval — a 23M-parameter bi-encoder fine-tuned specifically on R package documentation. The approach is straightforward: build a curated knowledge base of 8,191 R functions from CRAN, generate 245,730 synthetic query–function training pairs, and train with a contrastive InfoNCE objective. The "distribution-aware" part adds one meaningful twist: the query encoder receives not just the natural-language request but a structured profile of the user's dataset characteristics, so retrieval is conditioned on what kind of data the user actually has.

The number that frames everything else: without any retrieval augmentation, Claude-haiku-4.5 succeeds on R statistical analysis tasks at a rate of 6.25%.

---

## The Problem: LLMs Are Nearly Useless at R Without Help

Across 16 statistical analysis tasks — hypothesis testing, goodness-of-fit, survival analysis, mixed-effects modeling — frontier and lightweight LLMs operating on their own knowledge fail at rates that make them impractical. The range runs from 6.25% (Claude-haiku-4.5) to 25% (GPT-5.2). These aren't edge cases or adversarial prompts. They're standard statistical workflows.

The failure mode isn't reasoning. Models that perform well on general coding benchmarks still can't reliably identify which R package and function to use for a given statistical task. The R ecosystem's breadth is part of the problem — thousands of packages, many with overlapping names, none of which appear with sufficient frequency in general pretraining corpora to build reliable associations. A model might know that survival analysis exists without knowing that the `coxme` function in the `coxme` package handles mixed-effects Cox models differently from `coxph` in `survival`.

This is a retrieval problem, not a prompting problem. The ceiling on unaided performance — 25% — doesn't move much regardless of model scale, which suggests the bottleneck is knowledge access, not reasoning capacity.

---

## What DARE Actually Does Differently

The base model is all-MiniLM-L6-v2, a 23M-parameter sentence transformer. Fine-tuning starts from that checkpoint and adds domain signal: 245,730 synthetic query–function pairs generated from 8,191 curated R functions using five prompt templates of varying complexity, producing 30 queries per function. Training runs for 100 epochs with batch size 256 on a single A100 GPU, using in-batch negatives — other functions in the same batch serve as implicit hard negatives.

The distribution-aware mechanism is the architectural departure from standard bi-encoder retrieval. On the query side, DARE concatenates the natural-language request with a structured JSON data profile — dataset dimensions, variable types, distributional characteristics — inferred from the user's data. The intuition is that the right function for a query about "testing group differences" depends on whether the outcome is continuous, binary, or time-to-event. Standard retrieval ignores that context entirely.

The knowledge base itself — RPKB — was built by crawling CRAN documentation, chunking at the function level, and generating structured metadata profiles via an LLM. That pipeline introduces noise: both the training queries and the metadata layer are model-generated, meaning errors in either propagate into the training signal. The paper doesn't quantify how much noise this introduces, and real-world deployment would need to account for it.

---

## Retrieval Performance: Small Model, Large Margin

On the held-out RPKB test set, DARE scores 93.47% NDCG@10. The best open-source baseline — Snowflake/arctic-embed-l, at 335M parameters — scores 79.32%. That's a 17.8 percentage-point gap, or roughly 22% relative improvement, from a model 14 times smaller.

The Recall@1 figure is 87.39%, meaning the correct function surfaces as the top result in nearly nine out of ten queries. The best baseline manages 65.49% — a 33.4% relative gap. Recall@10 reaches 98.63%, compared to the best baseline's 92.35%, which means downstream agents working from the top-10 candidates are starting from a near-complete set.

For context on what fine-tuning actually contributed: the base model (all-MiniLM-L6-v2 without domain training) scores 61.27% NDCG@10. DARE's 93.47% represents an absolute gain of 32.2 points over the same architecture with no domain signal. The parameters didn't change. The training data did.

Efficiency follows from the architecture. DARE achieves 8,512 queries per second at 3.7ms average latency — three to four times faster than the large baseline models, which cluster above 10ms latency and below 3,000 QPS.

---

## Downstream Impact: Agent Success Rates

Retrieval quality translates directly into agent performance. Plugging DARE into RCodingAgent — an iterative agent that retrieves functions, generates R code, and validates against execution output — lifts grok-4.1-fast from 18.75% to 75.00% task success across the 16-task benchmark. Claude-haiku-4.5 moves from 6.25% to 56.25%.

The absolute gains — 56.25 percentage points for grok-4.1-fast, 50 percentage points for Claude-haiku-4.5 — are large enough that the direction is clear even on a 16-task benchmark. The gains are consistent across both frontier and lightweight models, which reinforces the retrieval-bottleneck interpretation: the constraint wasn't model capacity, it was what the model could find.

The 16-task evaluation is thin. The paper doesn't report statistical significance tests, and 16 tasks can't establish robustness across the full range of real-world R workflows. The results are directionally compelling, not conclusive. RPKB's 8,191 functions are also a curated subset — the long tail of domain-specific CRAN packages, where retrieval difficulty is likely highest, hasn't been tested.

---

## Before Deploying an R Agent

The practical implication is narrow but firm. If you are building LLM agents for statistical computing in R, generic embedding models are not a reasonable starting point. The performance gap between a 23M-parameter domain-tuned model and a 568M-parameter general-purpose model — 93.47% versus 79.32% NDCG@10 — is large enough to determine whether the downstream agent is functional or not.

The DARE approach is reproducible in outline: crawl package documentation, generate synthetic queries at scale, fine-tune a small bi-encoder with contrastive training. The distribution-aware query encoding adds complexity but addresses a real problem — statistical function selection depends on data context, not just task description. Whether that mechanism generalizes to other domain-specific retrieval problems outside R is an open question the paper doesn't address.

Two caveats worth tracking before production use: the training signal is entirely synthetic, and the metadata layer is LLM-generated. Both introduce noise that field deployment would surface. And no comparison to proprietary retrieval systems is included, so the ceiling of this approach remains undefined.

---

*Sun, M., Wu, Y., Xie, Y., Han, R., Jiang, B., Sun, D., Yuan, Y., & Huang, J. (2026). DARE: Aligning LLM Agents with the R Statistical Ecosystem via Distribution-Aware Retrieval. arXiv:2603.04743*