# Answer Retention Explains Nearly All of RAG's Accuracy Variance Across Document Representations

Most RAG optimization effort goes into the retrieval side — better embeddings, rerankers, hybrid search. But once a document is retrieved, it often gets transformed before the generator sees it: compressed, summarized, reformatted into propositions, or rewritten to match the query. The assumption is that a cleaner, more focused representation helps the generator find the answer. A new study from the University of Queensland tests that assumption systematically, and the result is simpler than most practitioners expect.

Across 14 document representations, 4 generators, and 2,391 queries, no transformation method beat the original retrieved document. The methods that came closest all shared one property — and it wasn't whether they were query-aware, LLM-produced, or structurally elegant.

The property was whether the gold answer string survived the transformation at all.

---

## The Variable That Actually Drives RAG Accuracy

The study tested every major category of document transformation: sentence-level selection (BM25-scored, cross-encoder-scored, bi-encoder-scored), token-level pruning, abstractive summarization, query-focused abstractive snippets, paraphrasing, and proposition extraction. Transformations came from both LLM and non-LLM sources, query-dependent and query-independent variants, verbose outputs and aggressively compressed ones.

One variable cut across all of them cleanly: answer retention — whether the gold answer string was still present in the transformed document. Methods with retention between 95–99% clustered near baseline accuracy regardless of how they got there. Methods that dropped below that threshold lost accuracy in proportion to what they dropped.

> **95–99%**
> Retention range where representation wording, structure, and query-dependence have limited effect on generator accuracy

The implication is that the other dimensions researchers and practitioners tend to optimize — query-awareness, LLM sourcing, structural format — don't move the needle much once retention is accounted for. High-retention methods matched baseline accuracy whether they were terse or verbose, LLM-generated or not, query-dependent or independent. None exceeded it.

---

## Where Compression Goes Wrong: Retention Cliff vs. Accuracy Cliff

The starkest illustration comes from three methods that all compress documents to under 4% of their original word count. Snippet-BM25, snippet-cross-encoder, and snippet-abstractive-Llama are all aggressive — but their accuracy outcomes diverge by up to 22 points.

| Retention | Method | Accuracy impact |
|---|---|---|
| 52.8% | Snippet-BM25 | 13–22 pt accuracy loss |
| 74.3% | Snippet-cross-encoder | Significant accuracy loss |
| 95.2% | Snippet-abstractive-Llama | ≤2.3 pt accuracy loss |
| 98.5% | LLMLingua2-50 | Within ~2 pts of baseline |

Snippet-BM25 scores sentences by keyword overlap with the query. That's a reasonable heuristic for relevance, but it discards sentences that contain the answer without matching query terms — and it does so 47% of the time. Snippet-abstractive-Llama, by contrast, generates a short abstractive summary focused on the query, and despite producing outputs half the length of snippet-BM25's, it retains the answer in 95.2% of documents.

LLMLingua2-50 is the most counterintuitive case. It prunes at the token level using an XLM-RoBERTa classifier, producing text that's often grammatically incoherent. But it retains the answer string in 98.5% of documents — and its accuracy lands within roughly two points of baseline on Qwen. The generator doesn't need the document to read well. It needs the answer to be there.

One nuance worth noting: accuracy losses are consistently smaller than retention losses alone would predict. When a transformed document drops the answer, generators can still draw on parametric knowledge or answer-bearing content in the other retrieved documents. Gold-document retention is a lower bound on the generator's actual access to answer-bearing content, not a ceiling.

---

## Query-Dependence and LLM Sourcing Are Not the Edge You'd Expect

Two intuitions that don't survive contact with the data: that query-dependent representations outperform query-independent ones, and that generators prefer transformations from their own model family.

On query-dependence: the strongest query-dependent method, snippet-abstractive-Llama, merely matches baseline — it doesn't exceed it. And it does so at substantial latency cost (more on that below). Query-independent methods like paraphrase-Gemma and propositions-Gemma reach the same accuracy at lower cost. The query-dependent framing doesn't buy accuracy; it buys retention through a different mechanism, and retention is what actually matters.

On model family preference: all four generators — Qwen, Gemma, Llama, and Mistral — prefer Gemma-produced summaries over Llama-produced ones. That includes Qwen and Mistral, which share no architectural relationship with Gemma. The apparent preference isn't family affinity; it's retention. Gemma summaries retain the gold answer in 97.8% of documents; Llama summaries retain it in 94.4%. The 3.4-point retention gap explains the accuracy gap across generators.

The same pattern holds for LLM vs. non-LLM transformations. At matched retention levels, high-retention non-LLM methods like RECOMP-extractive-50 and LLMLingua2-50 perform within one to two points of LLM-produced summaries. The generator doesn't care whether a human-designed algorithm or a 70B model produced the document — it cares whether the answer is still in it.

---

## The Latency-Accuracy Frontier: Where the Tradeoffs Actually Land

Snippet-abstractive transformations require the transformation model to process the full document and the query at inference time. That's expensive. Across a 150-query sample, snippet-abstractive's query-time latency ran to about 59 seconds — versus roughly 9 seconds for the original document, which is entirely generator TTFT.

| | |
|---|---|
| **59 s** | Snippet-abstractive query-time latency — 6× baseline for no accuracy improvement |
| **~⅓ latency** | Summary and LLMLingua2-50 achieve comparable accuracy at one-third the cost |

Query-independent methods like summary and LLMLingua2-50 offer a better tradeoff: they retain most of the baseline accuracy at roughly a third of the latency, because the transformation can be precomputed offline rather than run at query time.

For teams considering snippet-abstractive approaches, there's also a model-scale finding worth knowing. Accuracy improves steeply from 270M to 4B parameters — the 270M and 1B Gemma models barely outperform closed-book — then plateaus sharply. Gemma-12B reaches 77.6% accuracy; Gemma-27B reaches 77.5%. Doubling the transformation model size from 12B to 27B buys essentially nothing, at roughly double the latency.

---

## What to Do About It

The practical read is straightforward: before investing in query-aware or LLM-based document transformations, measure answer retention on your dataset. If a cheaper method — token pruning, extractive selection, offline summarization — preserves the answer string at 95% or above, the expensive transformation is unlikely to move accuracy.

The study was conducted on a single dataset (KILT-NQ), a single-hop short-answer QA task, and generators in the 8–12B range. Retention may matter differently in multi-hop settings where per-document retention is harder to define, or with substantially larger generators. Mistral-Nemo also behaved differently from the other three generators throughout — its accuracy deficit on the full retrieved set wasn't well explained by retention, suggesting length sensitivity or some other factor the study couldn't isolate.

But within those bounds, the finding is consistent across 14 representations and 4 generators: the format of the document matters far less than whether the answer survived the trip.

*Ross, J. J., Koopman, B., van der Vegt, A., & Zuccon, G. (2026). On the impact of retrieved content representations in RAG Pipelines. arXiv:2605.30790*