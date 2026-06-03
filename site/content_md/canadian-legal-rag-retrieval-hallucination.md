# Dense Retrieval Beats Sparse by 3x on Canadian Legal Queries, But One in Five Generated Claims Still Lacks Support

Legal AI deployments tend to treat retrieval quality as the main lever — get the right cases in front of the model, and the answers will follow. A new benchmark built on Canadian case law tests that assumption across 46 retrieval configurations and finds it only half-right. Dense retrieval does dramatically outperform keyword search, but even the best pipeline leaves at least 20% of generated legal claims without document support. Retrieval quality and generation quality fail in partially independent ways.

The benchmark, CANLEGALRAGBENCH, covers 532 queries drawn from Canadian case law across four jurisdictions — Ontario, British Columbia, Alberta, and a combined "Other" group — with 3,193 ground truth query-document pairs across 588 unique documents. Queries were written in two styles: one simulating a legal expert, one simulating a layperson. The evaluation spans retrieval metrics, expert annotation of retrieved documents, and a FActScore-based groundedness analysis of generated answers.

The anchoring number is the retrieval gap: BM25 sparse retrieval averages recall@10 of 0.133 across configurations, while iterative dense retrieval averages 0.400 — roughly three times higher.

---

## Sparse Retrieval Is Not a Viable Baseline for Legal Search

BM25 has been a durable baseline in information retrieval, but it struggles badly on legal case law. Across all configurations tested, BM25 averages recall@10 of 0.133. Dense retrieval averages 0.366. Iterative retrieval — which runs three rounds of retrieval, using a generated intermediate answer to reformulate the next query — averages 0.400. The best single configuration, Gemini-Embedding-2 at 4096 chunk size with iterative retrieval, reaches recall@10 of 0.456 and nDCG@10 of 0.521.

Hybrid retrieval, which combines BM25 and dense signals via reciprocal rank fusion, lands in between at an average recall@10 of 0.308. That's better than BM25 alone, but meaningfully worse than dense retrieval on its own. BM25's weak signal drags the combination down rather than the dense signal lifting it up — which suggests hybrid approaches need a stronger sparse component before they're worth the added complexity in this domain.

Chunk size matters too, though the effect is configuration-dependent. Reranking with a cross-encoder improves some embedding models and not others, so it's not a safe default to add across the board.

| Method | Average Recall@10 |
|---|---|
| BM25 (sparse) | 0.133 |
| Hybrid | 0.308 |
| Dense | 0.366 |
| Iterative (IterRetGen) | 0.400 |
| Best single config (Gemini-2, 4096, iterative) | 0.456 |

---

## Domain-Specialized Embeddings Don't Win — Until Experts Weigh In

Kanon-2, the only legal-domain embedding model in the benchmark, underperforms general-purpose models in automatic evaluation. Its best recall@10 is 0.406 and nDCG@10 is 0.449, compared to 0.456 and 0.521 for the top Gemini-Embedding-2 configuration. Open-source models — Gemma and Qwen embeddings — are competitive with Gemini across most metrics, which matters for practitioners who can't or won't route queries through a proprietary API.

But the automatic evaluation picture reverses when legal annotators get involved. Expert evaluation on a 30-query subset found that annotators frequently identified relevant documents that weren't in the pre-labeled gold set. After those documents were validated and added, Kanon-2's nDCG@10 on the subset reached 1.00 — a complete reversal of its apparent ranking.

This exposes a structural problem with gold-set evaluation in legal retrieval. When the benchmark's relevance labels are incomplete, any model that retrieves correct-but-unlabeled documents gets penalized. The automatic metrics measure coverage of the gold set, not actual retrieval quality. The ranking of models is roughly preserved between automatic and expert evaluation, but the absolute scores are systematically understated — and the understatement is uneven across models, which can distort comparisons.

For practitioners building legal RAG systems, this means automatic retrieval benchmarks should be treated as lower bounds, not ground truth. Domain-specialized embeddings may be recovering relevant law that general metrics can't credit.

---

## At Least 20% of Generated Claims Are Unsupported — Possibly 29%

The generation analysis uses atomic claim decomposition: each answer is broken into individual factual claims, and each claim is checked for support in the retrieved documents. Across every model and pipeline configuration tested, the best groundedness score is 0.7983 — achieved by Gemma in the oracle condition, where the model is given the actual gold documents rather than retrieved ones. That ceiling means at least one in five generated claims lacks document support even when retrieval is perfect.

In the full pipeline condition — where the model works from retrieved documents — things get worse. The best pipeline groundedness is 0.7656 (Gemini), and the best pipeline accuracy drops to 0.467 (Gemma), compared to 0.765 in the oracle condition (Qwen). The gap between oracle and pipeline performance reflects compounding failures: retrieval misses some relevant documents, and the model then generates claims the remaining documents can't support.

Manual categorization of 25 unsupported claims per model adds nuance. For Gemma in the oracle condition, roughly 54% of flagged claims are genuine hallucinations of various types, while about 38% are valid context-establishing statements — things like framing sentences or answer closings — that the judge penalizes because they don't appear verbatim in the retrieved text. For Gemini in the pipeline condition, around 56% of flagged claims fall into a "conversational penalty" category where the model synthesizes or paraphrases in ways that are semantically distant from the source text, even if not factually wrong. The true hallucination rate sits somewhere between 8% and 29% depending on how strictly you define the boundary.

That range matters for legal applications. An 8% hallucination rate in a legal answer is a serious problem; 29% is a disqualifying one. Neither end of the range is acceptable without human review.

---

## Query Framing and Jurisdiction Create Uneven Performance Floors

Queries written in legal-expert style consistently outperform layperson queries in base retrieval configurations — the nDCG@10 gaps are large enough to be practically significant. Iterative retrieval narrows this gap substantially, likely because the intermediate answers it generates are written in legal register regardless of how the original query was phrased. That's a meaningful argument for iterative approaches when the system has to serve non-expert users.

But the relationship between query style and generation quality isn't uniform across models. Gemma shows higher groundedness and accuracy on layperson queries — 0.767 and 0.603 — than on legal-expert queries — 0.723 and 0.445 — despite similar retrieval scores. That's the opposite of what you'd expect if legal phrasing were uniformly helpful. It suggests model-specific sensitivity to query style that can't be assumed away; it has to be tested.

Jurisdiction creates its own complications. Gemini retrieves well on Ontario queries but produces its worst accuracy there — 0.284 — even with strong retrieval scores. Ontario is the largest jurisdiction in the dataset (28% of queries), so this isn't a small-sample artifact. It's a clean example of retrieval and generation failing independently: the model finds the right documents and then generates answers that don't hold up. The two failure modes don't move together, which means optimizing retrieval alone won't close the accuracy gap.

For teams deploying legal RAG in practice, the implication is to evaluate retrieval and generation separately, by jurisdiction and query type, rather than relying on a single aggregate score. A pipeline that looks acceptable on average can be quietly broken for specific user populations or courts.

---

## What to Do About It

The benchmark makes a few things harder to ignore. Sparse retrieval isn't a starting point worth iterating from in legal search — the gap to dense methods is too large to close with tuning. Iterative retrieval is worth the added inference cost, particularly for layperson queries, and the best open-source embeddings are close enough to proprietary ones that the tradeoff is real.

Automatic nDCG scores understate true retrieval quality in legal domains, and they do so unevenly across models. If you're comparing embedding models for a legal application, expert annotation of a small query subset — even 30 queries — can reverse the apparent ranking. That's a cheap investment relative to deploying the wrong model.

On generation: the 20% unsupported-claim floor is a hard constraint, not a tuning problem. It holds even in the oracle condition, with perfect document access. Legal RAG outputs need claim-level verification before they reach users, and the verification needs to distinguish genuine hallucinations from conversational framing that an automated judge will over-penalize. The 8–29% true hallucination range is wide enough that the distinction matters operationally.

Finally, retrieval quality and generation quality should be tracked as separate metrics, broken down by jurisdiction and query type. A single aggregate accuracy score will hide the kind of jurisdiction-specific failure — strong retrieval, weak generation — that the Ontario results demonstrate.

*Zhao, E., Taranukhin, M., Cui, W., Aikenhead, M., & Shwartz, V. (2026). CanLegalRAGBench: Evaluating Retrieval-Augmented Generation on Canadian Case Law. arXiv:2605.30497*