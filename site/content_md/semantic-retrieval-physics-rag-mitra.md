# When Physicists Paraphrase, Keyword Search Drops From 0.75 to 0.13

Physics collaborations produce enormous volumes of internal documentation — analysis notes, technical memos, detector studies — that members need to query regularly. The problem is that those members rarely remember the exact phrasing those documents use. They remember concepts, experimental approaches, decay channels. They paraphrase. Standard keyword search was built for the other case: users who know what they're looking for and can reproduce the words that describe it.

A paper from the University of Wisconsin-Madison introduces MITRA, a retrieval-augmented generation system built for the CMS collaboration at CERN. The system is designed around a specific constraint — all computation stays on-premise, no collaboration data leaves the secure network — and a specific observation: the retrieval failure mode that matters most in this setting is not broken indexing, it is the mismatch between how physicists describe what they want and how documents are written.

The number that anchors the paper: BM25 returns the correct document first on only 13% of paraphrased queries.

---

## The Problem BM25 Cannot Solve

The evaluation design is the most useful thing about this paper. The researchers constructed two query sets. Set 1 uses exact phrasing drawn from the source documents — the kind of query a user makes when they remember the document's own language. Set 2 uses paraphrased versions of the same queries, with synonyms and conceptual descriptions substituted for the document's actual terminology. This is the realistic case.

On Set 1, both systems perform identically: MRR of 1.00 for both MITRA and BM25. BM25 actually edges MITRA on P@5 (0.32 vs. 0.24) and R@5 (1.00 vs. 0.90). Keyword search is not broken — it is well-suited to the query type it was designed for.

On Set 2, the gap opens sharply. MITRA achieves a Precision@1 of 0.75. BM25 achieves 0.13. The rank-aware metrics tell the same story: MRR of 0.81 versus 0.35, NDCG@5 of 0.88 versus 0.59. The difference is not marginal. A system returning the right document first 13% of the time is not a retrieval system — it is a random baseline with some signal.

The implication is structural. Domain experts do not query like search engine optimizers. They query like people who understand the subject matter and are trying to locate a specific analysis. That cognitive mode produces paraphrased, conceptual queries almost by default. BM25 has no mechanism for bridging that gap.

---

## How MITRA Is Built

The pipeline has three stages before the LLM sees anything. First, DPR embeddings — using facebook/dpr-question_encoder-multiset-base, producing 768-dimensional vectors — encode document chunks for cosine similarity retrieval. Second, a cross-encoder reranker (cross-encoder/ms-marco-MiniLM-L-6-v2) reorders the top candidates. Third, a human-in-the-loop confirmation step asks the user to verify the identified analysis before the LLM generates a response.

The two-tiered vector database separates concerns: an abstracts database handles analysis identification, and a full-text database handles session-specific retrieval once the correct analysis is confirmed. This structure keeps the retrieval problem scoped — the model is not searching across all documents simultaneously for every query.

The LLM is a 4-bit quantized Mistral-7B served via Ollama on a single NVIDIA Tesla T4 with 15GB of memory. The on-premise constraint is not incidental — it is the design requirement. Sensitive collaboration data, including unpublished analysis details, cannot be transmitted to external APIs. The entire stack, from embedding model to generation, runs on local hardware.

Document ingestion uses Selenium for automated acquisition from web-interface databases, with OCR via Surya and Tesseract for PDF extraction. The knowledge base updates by re-embedding new documents rather than retraining the model — operationally significant for collaborations that publish analysis notes on a continuous basis.

---

## Where the Numbers Hold Up — and Where They Don't

The retrieval metrics are consistent across rank-aware measures for paraphrased queries. MITRA's NDCG@5 of 0.88 versus BM25's 0.59 is the clearest single indicator that ranking quality — not just whether the right document appears somewhere in the top five — improves with semantic retrieval.

But the evaluation has real limits. Answer generation quality has not been formally measured. The authors acknowledge this directly, listing a broader evaluation framework encompassing the generation step as immediate future work. The exact number of queries in each evaluation set is not reported, which limits statistical confidence in the results. No formal latency or throughput benchmark has been conducted — the characterization is qualitative, described as "a few seconds" per query in a demo context.

The robustness test is qualitative but worth noting. When the system was queried about Higgs bosons while locked onto a dark matter search analysis, it did not hallucinate. It inferred from the retrieved passages that the document was unrelated to the question and declined to fabricate an answer. That behavior is not guaranteed by the architecture — it reflects the combination of retrieval scope and the model's response to low-relevance context.

The prototype runs on a single T4. Production deployment for a large collaboration with thousands of members has not been demonstrated. The authors note that scaling primarily requires more compute rather than architectural redesign, but that claim is based on qualitative observation of prototype behavior, not a formal concurrency test.

---

## Practical Implications for Domain-Specific Deployment

The paper's practical argument is narrow and defensible: for any closed-corpus retrieval system where users query by concept rather than keyword, dense retrieval with cross-encoder reranking is not an optional upgrade. It is the baseline requirement. BM25 is the wrong tool for the job — not because it is poorly implemented, but because it solves a different problem.

The architecture has one operational property that matters for continuously updated corpora: adding new documents means re-embedding, not retraining. For a collaboration that produces analysis notes on an ongoing schedule, this is a meaningful difference from systems that require model updates to incorporate new knowledge.

The single-T4 constraint also demonstrates something useful for teams evaluating on-premise deployment: a 7B-parameter model at 4-bit quantization is sufficient to serve this use case on modest hardware. The ceiling is not the model size — it is the retrieval quality upstream of generation. Getting retrieval right is the prerequisite. The generation component, in this architecture, is downstream of a solved problem.

For teams building similar systems — internal knowledge bases, collaboration document stores, proprietary technical corpora — the lesson is not to benchmark BM25 against semantic retrieval on exact keyword queries and declare parity. The relevant benchmark is paraphrased queries. That is how users actually search.

---

*Mallampalli, A., & Dasu, S. (2026). MITRA: An AI Assistant for Knowledge Retrieval in Physics Collaborations. arXiv:2603.09800*