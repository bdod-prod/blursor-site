# RAG Fusion Doesn't Survive the Reranker: Lessons From a Dell Technologies Deployment

RAG Fusion has a clean theoretical appeal. Generate paraphrase queries, retrieve against each, merge the ranked lists via Reciprocal Rank Fusion, and surface documents a single query would have missed. The expanded candidate pool should improve recall. Recall improvements should improve downstream answer quality. The logic holds — until it meets a production pipeline.

A study from Dell Technologies, published on arXiv in March 2026, tests that logic against a complete enterprise RAG stack: hybrid BM25 plus dense retrieval, cross-encoder reranking via FlashRank, and a fixed Top-10 context window. Three fusion prompt strategies were evaluated, ranging from conservative query reformulation to explicit diversity maximization. The setup is more realistic than most RAG benchmarks, which tend to evaluate retrieval in isolation rather than inside a full pipeline where reranking and truncation operate downstream.

The anchoring result: across all three prompt strategies and all fusion configurations, no variant achieved statistically significant accuracy gains over a single-query baseline. Hit@10 — the metric that best captures whether the right document survives into the final context window — decreased in several configurations relative to baseline.

---

## The Promise vs. The Pipeline

Fusion's theoretical mechanism depends on a chain of transfers. The paraphrase query must retrieve documents the original missed. Those documents must survive reranking. They must then survive Top-K truncation. Only then do they affect what the generator sees. Each step is a filter, and the filters compound.

The Dell study confirms that fusion does expand the candidate pool. Jaccard similarity between the original and paraphrase Top-10 lists is only 0.087–0.094 for diversity-maximizing prompts — the two queries are genuinely retrieving different documents. The union pool grows to roughly 15 distinct sources at Top-10, compared to 10 for a single query. Fusion is doing what it's supposed to do at the retrieval stage.

The problem is what happens next. The cross-encoder reranker operates over that expanded pool but scores against the original query signal. Documents surfaced by the paraphrase query — the ones fusion was supposed to contribute — get scored on their relevance to Q1, not Q2. The reranker then truncates back to K=10. The breadth gain is systematically discarded before it reaches generation.

This is a structural ceiling, not a tuning problem. In any system where a strong reranker operates over a fixed-depth window anchored on the original query, retrieval breadth improvements will be absorbed and neutralized. The architecture makes the outcome predictable.

---

## The Numbers: Fusion Loses Ground After Reranking

Under Prompt 1, the single-query baseline achieves 51.30% Hit@10. All three fusion variants — rerank_on_rrf_q1, rerank_on_rrf_q2, and rrf_q1_q2 — land at 47.83%. The direction is consistent across prompt configurations.

The worst outcome comes from anchoring the final rerank on the paraphrase query rather than the original. The rerank_on_rrf_q2 configuration collapses Top-1 accuracy from 29.57% to 7.83% under Prompt 2 — a near-fourfold drop. The paraphrase query, optimized for diversity rather than precision, becomes a poor anchor for final scoring. The researchers exclude this configuration from statistical significance analysis on the grounds that it doesn't represent a realistic deployment option, but the result illustrates how badly fusion can go when the rerank signal is misaligned.

The best-performing fusion variant, rrf_q1_q2, shows a +4.35 percentage point Top-3 improvement under Prompts 2 and 3, reaching 40.87% against a baseline of 36.52%. This is the one number in the paper that looks like a genuine gain. It does not survive Benjamini-Hochberg correction — the corrected p-value exceeds the significance threshold — and the researchers attribute it to noise given the query set size. The possibility of a real but underpowered effect can't be ruled out, but it can't be acted on either.

---

## Why Fusion Fails to Transfer: Overlap and Rerank Dynamics

The Jaccard overlap finding is worth dwelling on. At 0.087 for Prompt 2 and 0.094 for Prompt 3, the two retrieval lists share almost nothing at Top-10. Fusion is genuinely diversifying the candidate pool — the union growing to roughly 15 distinct sources confirms that. The failure isn't that fusion retrieves the same documents twice. The failure is that the additional documents don't survive the next stage.

The Prompt 1 Jaccard of 0.279 — substantially higher than the diversity-maximizing prompts — is also instructive. More conservative query reformulation produces more overlap, which means less incremental recall from fusion, which means less to lose in reranking. The configurations that most aggressively diversify retrieval are also the ones most exposed to reranker neutralization.

This creates an uncomfortable tradeoff. The prompt strategies most likely to surface genuinely new documents are also the most likely to have those documents discarded. The prompt strategies that preserve overlap contribute less in the first place. Neither path produces a reliable accuracy gain in this architecture.

---

## The Latency Tax

Fusion adds 0.89 seconds for paraphrase generation plus a combined Q1+Q2 retrieval time of 65.98 seconds, against 54.60 seconds for the single-query baseline — roughly a 21% retrieval overhead. RRF computation itself costs 0.012 seconds and is not the issue. The cost is the extra LLM call and the second retrieval pass.

For a system that gains nothing in accuracy, this overhead has no justification at scale. The paper notes that tail latency behavior is consistently higher for fusion configurations, though full tail latency distributions are not reported. In high-throughput enterprise deployments, average overhead understates the operational cost — the tail is where SLA violations occur.

FlashRank reranking adds 0.26 seconds regardless of whether fusion is used. That cost is fixed. The fusion-specific overhead sits entirely in query generation and retrieval, both of which scale with request volume.

---

## When Fusion Might Still Be Worth It

The paper's query-slice analysis finds that fusion occasionally surfaces relevant evidence for queries where the baseline retriever completely fails — cases where the original query returns nothing useful within Top-K. For those queries, the paraphrase provides a second chance. The effect is real.

It applies to a minority of the workload and does not move system-wide metrics. That distinction matters for how fusion should be positioned. As a default pipeline component applied to every query, it adds latency without measurable return. As a fallback triggered by low-confidence retrieval signals — low reranker scores, empty Top-K results, queries flagged as ambiguous — it has a narrower but defensible use case.

The broader implication the paper draws is direct: in mature RAG deployments, reranker quality and context selection strategy are the dominant levers. Retrieval breadth improvements that don't survive reranking don't affect generation. Before adding fusion to a production pipeline, the prior question is whether the reranker will simply undo the expanded recall — and if it will, the only thing fusion adds is latency.

---

*Medrano, L., Verma, A., & Chhabra, M. (2026). Scaling Retrieval Augmented Generation with RAG Fusion: Lessons from an Industry Deployment. arXiv:2603.02153*