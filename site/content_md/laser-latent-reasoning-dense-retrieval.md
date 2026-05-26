# LaSER: Baking Chain-of-Thought Into the Encoder Itself

Dense retrieval systems struggle with queries that require multi-step inference to match relevant documents. The standard fix is to run a language model over the query first — generating a rewritten or expanded version — and then encode that output. It works. It also adds a full LLM inference pass per query at runtime, which is expensive enough to be a hard constraint in latency-sensitive systems.

A paper from Renmin University of China and Alibaba's Tongyi Lab proposes a different path. Rather than reasoning at inference time, LaSER internalizes the reasoning capability during training — distilling chain-of-thought rationales into continuous latent tokens that the encoder generates before processing the query. At inference, no external rewriter runs. The model reasons implicitly, in its own latent space, using three prepended thinking steps.

The number that frames the problem: the baseline Qwen3-Embedding-8B scores 14.0 nDCG@10 on BRIGHT, a benchmark designed specifically for reasoning-intensive retrieval. A fine-tuned version with explicit query rewriting reaches 25.7. LaSER, without any rewriter at inference time, reaches 29.3.

---

## The Problem: Reasoning Helps Retrieval, But at Enormous Cost

BRIGHT was constructed to stress-test exactly this failure mode. Its queries require multi-step inference to connect with relevant documents — the kind of connection that keyword overlap or shallow semantic similarity misses. The gap between 14.0 and 25.7 nDCG@10 on that benchmark illustrates both the benefit of reasoning and the mechanism required to get it: an external model generating a rewritten query before the encoder sees anything.

For teams running retrieval at scale, that mechanism is the problem. Each query triggers a separate LLM inference pass. Batching helps at the margins, but the fundamental cost is structural — the rewriter and the encoder are sequential, and the rewriter is not cheap. Systems with strict latency budgets have historically had to choose between reasoning quality and response time.

LaSER's premise is that the choice is false, or at least less stark than it appears. If the reasoning capability can be transferred into the encoder's weights during training, the inference-time rewriter becomes unnecessary. The question is whether distillation can actually move that capability — and how much is lost in the transfer.

---

## How LaSER Works: Two Views, One Backbone

The training framework runs two simultaneous views through a single shared LLM backbone. The Explicit View reads a GPT-4o-mini-generated chain-of-thought rationale alongside the query — a single forward pass that gives the model access to explicit reasoning about what the query is really asking. The Latent View autoregressively generates soft "thinking tokens" as weighted vocabulary embeddings, prepended before the query is encoded.

The Latent View is trained to mimic the Explicit View through two distillation objectives. Output-level distillation uses KL divergence over relevance score distributions — the latent view's rankings should match the explicit view's. Process-level trajectory alignment goes further, mapping latent reasoning steps to segments of the explicit reasoning path and aligning intermediate states. The goal is not just matching the final output but matching the reasoning structure that produced it.

The training data is 81,659 synthetic examples across 12 domains, with GPT-4o-mini generating the rationales. Average reasoning length in the training set is 984.8 tokens, capped at 1,024. At inference, only the Latent View runs — three latent thinking steps, then the query, then the encoder. No second model. No rewriter.

---

## The Latency Payoff Is Extreme

LaSER's inference latency is 0.3% of the rewrite-then-retrieve pipeline's latency, measured on 80 BRIGHT queries on a single A100 GPU — a roughly 333× speedup. That figure covers only one hardware configuration and a limited query sample, so production estimates should be treated as directional. The order of magnitude, however, is not in dispute.

The performance numbers hold up under that compression. LaSER with a Qwen3-8B backbone scores 29.3 nDCG@10 on BRIGHT, exceeding the explicit rewrite pipeline's comparable figure by 1.2 points. More striking: the 0.6B model scores 23.10, beating the rewrite pipeline at that scale, which reaches 22.35. A sub-billion-parameter model running latent reasoning outperforms a rewrite pipeline on a benchmark designed to reward reasoning.

LaSER does introduce a modest latency overhead relative to a standard base retriever — the autoregressive generation of latent tokens is not free — but the comparison point that matters for most deployment decisions is the rewrite pipeline, not the no-reasoning baseline.

---

## What the Ablations Actually Reveal

The ablation study uses the Qwen3-0.6B backbone on BRIGHT. The full LaSER model scores 23.10. Removing the Explicit View — the distillation target — drops performance to 20.59. Removing the Latent View entirely causes the largest single drop, to 19.93. Basic contrastive learning alone, with no reasoning component, scores 18.25.

The ordering matters. The Latent View's autoregressive thinking tokens carry more of the performance than the distillation signal alone — the model isn't just benefiting from better training supervision, it's using the latent computation at inference time. Removing the mechanism hurts more than removing the teacher.

A separate analysis tests what happens when explicit rewrites are provided at inference to both a basic retriever and LaSER. LaSER gains 3.4 points on Qwen3-4B; the basic retriever gains 1.7. LaSER has learned to use reasoning structure more effectively than a model that hasn't been trained on it — a sign the distillation is transferring something real rather than surface patterns. On training-time scaling, increasing latent steps beyond three yields negligible gains or slight degradation, suggesting a practical ceiling on that axis.

---

## Caveats Worth Tracking

The training reasoning paths average 984.8 tokens and are capped at 1,024. BRIGHT test queries average 2,412.8 tokens of reasoning. That distribution mismatch is meaningful — the model was trained on reasoning traces roughly half the length of what the benchmark's queries would ideally require. How much ceiling performance this costs is not quantified.

The primary implicit-reasoning baseline, GIRCSE, is architecturally unstable. On LLaMA3.2-3B, it degrades below the standard retriever baseline — making it a weaker comparison point in some settings and inflating LaSER's apparent advantage in those cases. LaSER outperforms GIRCSE in 8 of 9 experimental settings across model scales and datasets, but the one exception and the instability pattern are worth noting before treating GIRCSE as a reliable reference.

On out-of-domain benchmarks — FollowIR and BrowseComp-Plus — LaSER does not consistently beat GIRCSE. On BrowseComp-Plus, GIRCSE achieves R@100 of 40.8 versus LaSER's 38.4. The authors describe LaSER as a preliminary step toward fully autonomous latent reasoning, with reinforcement learning flagged as future work. The GPT-4o-mini dependency for training rationale generation is also a practical constraint: the training pipeline requires access to an external model, and rationale quality is bounded by that model's capabilities.

---

## Before the Next Architecture Decision

For teams where rewrite-pipeline latency is a hard constraint, LaSER offers a credible path. The performance numbers on BRIGHT are not marginal — 29.3 versus 14.0 for the unmodified embedding model is a substantial gap, and the latency reduction is extreme enough to change what's deployable in real-time systems.

The practical checklist before adoption: assess whether your query distribution resembles BRIGHT's reasoning-intensive profile or skews toward simpler lookups where the gap narrows. Check whether the 1,024-token training cap on reasoning paths matters for your domain — if your queries require longer chains of inference, the ceiling may be lower than the benchmark numbers suggest. Evaluate out-of-domain performance on your specific benchmarks rather than assuming BRIGHT results transfer. And account for the GPT-4o-mini dependency in the training pipeline if reproducibility or cost control is a concern.

The 0.3% latency figure is the headline. The distribution mismatch between training and test reasoning lengths is the number to watch as the method matures.

---

*Jin, J., Zhang, Y., Li, M., Long, D., Xie, P., Zhu, Y., & Dou, Z. (2026). LaSER: Internalizing Explicit Reasoning into Latent Space for Dense Retrieval. arXiv:2603.01425*