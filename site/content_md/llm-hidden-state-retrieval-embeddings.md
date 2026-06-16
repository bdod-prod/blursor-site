# One Model Instead of Two: Replacing the Embedding Model With an LLM's Own Hidden States

Standard agentic RAG pipelines run two large models in sequence. The LLM rewrites the query. A separate embedding model — often another multi-billion-parameter system — encodes that rewrite into a retrieval vector. Both models run at inference time, on every retrieval call, in every session. For latency-sensitive systems making dozens of retrieval calls per conversation, that second forward pass is a fixed cost that compounds.

A paper from Temple University asks whether the LLM's own hidden states can replace that second model entirely. The proposed mechanism is a lightweight projection head — roughly 25 million parameters — trained via knowledge distillation to map the LLM's last-layer hidden states directly into the embedding model's retrieval space. At inference time, the embedding model is gone. The projection head adds a matrix multiplication over representations already computed during generation.

The framing requires one immediate qualification: the embedding model is still required during training, to generate distillation targets. "One model" applies only to deployment. That distinction matters for how broadly the result generalizes.

The number that anchors the paper: per-query latency drops from 43.5ms to 2.0ms — a 21.8× speedup — measured on an NVIDIA RTX PRO 6000.

---

## The Setup: One Model Instead of Two

The architecture is straightforward. During LLM generation, the last-layer hidden states at each decoding step are extracted — non-special tokens only. A projection head consisting of an input linear projection, a transformer encoder with learnable positional embeddings, mean pooling, and an output linear projection with L2 normalization maps those states into the embedding space. The teacher is Qwen3-Embedding-8B. The student is trained to match it.

The training objective combines three losses: an alignment loss (cosine distance between projected and teacher embeddings), a contrastive loss (InfoNCE, to preserve discriminative structure across queries), and a rank distillation loss (KL divergence aligning the student's ranking distribution with the teacher's top-128 document rankings). All three are required — the ablation results make this unambiguous.

The experimental setting is narrow by design. Both the LLM and the embedding teacher are from the same model family: Qwen3-8B and Qwen3-Embedding-8B. Evaluation is on a single dataset — QReCC, a conversational search benchmark — using 346 conversations and 2,189 retrieval triggers. The paper does not test cross-family settings or other retrieval benchmarks. Generalization beyond this distribution is explicitly left for future work.

---

## The Latency Win Is Real and Large

Removing the embedding model's forward pass drops per-query latency from 43.5ms to 2.0ms. The 21.8× speedup is the paper's most actionable result for practitioners. The projection head contributes almost nothing to inference cost — it operates over hidden states that are already computed, adding only a matrix multiplication.

For agentic systems that issue many retrieval calls per session, this is not a marginal improvement. A pipeline running 20 retrieval triggers per conversation goes from 870ms of embedding-model time to 40ms. The savings scale linearly with retrieval frequency.

The practical ceiling on this result is the same-family, single-GPU measurement context. The paper reports p50 latency on an NVIDIA RTX PRO 6000. Relative speedup should be similar across hardware, but absolute numbers will vary. The more important caveat is that the 21.8× figure assumes the embedding model is the bottleneck — in pipelines where retrieval latency is dominated by index lookup or network I/O, the gain is smaller in practice.

---

## The Quality Gap Is Small but Statistically Real

The best projection head configuration reaches Recall@10 of 0.607 against the baseline's 0.637 — a –3.0% relative drop, with a 95% confidence interval of [–4.7, –1.4] and p < 0.001. MRR@10 falls from 0.329 to 0.293 (–3.6%, CI [–4.7, –2.4]). nDCG@10 falls from 0.402 to 0.367 (–3.5%, CI [–4.5, –2.4]). None of these gaps are within noise.

The per-trigger breakdown is instructive. The two methods agree on 84.2% of retrieval triggers. Where they disagree, the projection head loses on 206 triggers and wins on 140 — the gap is not symmetric. Failures are not uniformly distributed: 48 of the 346 conversations account for a disproportionate share of the quality loss, each with at least three triggers where the projection head's recall falls substantially below baseline. The paper hypothesizes these cases involve rare terms, complex coreference chains, or domain-specific vocabulary underrepresented in training.

The implication is that the –3.0% aggregate figure understates the exposure for specific query types. A system serving a narrow domain — legal, medical, technical — may sit closer to those 48 failure-concentrated conversations than the QReCC average suggests.

---

## What the Ablations Actually Reveal

The ablation sequence is the most technically informative part of the paper. Rank distillation alone collapses completely — Recall@10 of 0.001, MRR@10 of 0.000. Without an alignment loss to anchor the embedding space, the ranking signal has nothing to attach to. This is not a marginal failure; it is a complete failure.

Alignment loss alone achieves Recall@10 of 0.567. Contrastive loss alone reaches 0.498. The gap between them — 0.069 Recall@10 — suggests that direct cosine matching to teacher embeddings carries most of the signal, and that contrastive structure adds less than alignment does individually. Adding all three losses together reaches 0.595 under standard training (30 epochs, lr 2e-4), outperforming the best two-loss combination of 0.582.

Extending training to 80 epochs at lr 2e-4 pushes the final result to 0.607 — the largest single improvement in the ablation sequence. But the training recipe is brittle in ways that matter for replication. A learning rate of 5e-4 causes complete collapse (Recall@10 = 0.001). Training for 50 epochs at lr 2e-4 achieves Recall@10 of 0.552, underperforming 30 epochs at the same rate (0.595) — longer training without a reduced learning rate leads to degradation, not improvement. Neither of these failure modes is obvious in advance, and the paper does not provide a principled account of why 80 epochs at 2e-4 is the right stopping point. Anyone attempting to apply this method to a new setting should expect to re-tune.

---

## Before Removing the Embedding Model

The paper's practical implication is specific: if your agentic system is latency-constrained, makes many retrieval calls per session, and can tolerate a ~3% drop in retrieval quality on conversational search, a trained projection head over LLM hidden states is a credible way to eliminate the embedding model at inference time.

The conditions on that statement are load-bearing. The embedding model is still required at training time — this is not a zero-shot capability. The method has been validated on one dataset, with same-family models, in a conversational search setting. Before applying it elsewhere, the relevant questions are: how similar is your retrieval distribution to QReCC, how sensitive is your application to the tail of failure-concentrated queries, and whether the training recipe will transfer without re-tuning.

For teams already running Qwen3-class models in production agentic pipelines, the 21.8× latency reduction is large enough to justify the engineering investment in validation. For teams with different model families, different retrieval domains, or quality requirements tighter than –3%, the paper is a proof of concept — not yet a deployment blueprint.

*Jiang, B. (2026). One Model Is Enough: Native Retrieval Embeddings from LLM Agent Hidden States. arXiv:2603.08429*