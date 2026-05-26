# ReFeed: What Style-Aware Query Rewriting Actually Requires

Query rewriting for retrieval-augmented generation has a quiet assumption baked in: that the problem is semantic. A query is ambiguous, or it omits context from a prior turn, or it uses a pronoun where a noun would help. Fix those things and retrieval improves. That assumption drives most of the benchmark work — CANARD, QReCC, and the LLM-based rewriting methods that followed them all optimize for meaning preservation.

A paper from Myung, Son, Lee, Park, and Han proposes a different diagnosis. When a query fails to retrieve its ground-truth document, the cause is often phrasing mismatch rather than missing information. The corpus has a style — a characteristic way of expressing facts — and queries that don't match that style fail even when they're semantically correct. Fixing the meaning doesn't fix the retrieval. ReFeed is a pipeline for building a dataset of query pairs that encode this style gap directly, using retrieval failure itself as the curation signal.

The number that anchors the paper: 18.7% of queries in the SQuAD v1.1 training split — roughly 16,000 out of approximately 87,000 — failed to retrieve their ground-truth passage in the top-3 results under standard dense retrieval. Those miss cases are the only queries the pipeline touches.

---

## The Problem: Semantic Rewriting Ignores Corpus Style

Existing query rewriting benchmarks optimize for meaning preservation, not for matching the linguistic style of the target retrieval corpus. The distinction matters operationally. A query can be semantically complete — unambiguous, fully specified, contextually grounded — and still fail retrieval because the phrasing doesn't resemble how the relevant passage is written. Dense retrieval models learn from co-occurrence patterns; style divergence between query and document is a real signal they respond to.

The prior work that uses retrieval feedback at all — reinforcement learning approaches, reward modeling — uses it during model training, not data construction. The feedback shapes a model's weights rather than producing a reusable artifact. ReFeed's departure is treating retrieval failure as a data curation filter: miss cases are exactly the queries where style-aware rewriting has something to fix, and verified rewrites of those cases are exactly the examples worth keeping.

The practical consequence of this framing is a small dataset. Most queries don't need rewriting — they already retrieve correctly. Rewriting them anyway produces noise. Starting from failures keeps the dataset high-signal by construction.

---

## How the Pipeline Works: Fail, Rewrite, Verify

The pipeline runs in three stages. First, dense retrieval using e5-base-v2 embeddings indexed with FAISS identifies miss cases — queries whose ground-truth passage does not appear in the top-3 results. Of approximately 87,000 SQuAD training queries, 16,000 (18.7%) failed this threshold. The remaining 81.3% already retrieved correctly and were excluded entirely.

For each miss case, an LLM rewrites the query conditioned on three inputs: the original query, the ground-truth document, and the incorrectly retrieved documents. That last element is the key signal. The model sees both what the corpus returned and what it should have returned — the style gap is explicit in the prompt rather than inferred.

Rewrites are accepted only if re-retrieval places the ground-truth passage in the top-3. Of the 16,000 miss cases, 67.5% yielded verified rewrites — producing 11,044 final pairs. The remaining 32.5% of miss cases failed verification and were discarded. Each retained pair is stored with metadata: the retrieval model used, the original ranking position, and the similarity score improvement — making the dataset auditable and model-specific rather than a generic rewriting resource.

---

## What the Dataset Actually Contains

The 11,044 verified pairs represent roughly 13% of the original miss-case pool and under 13% of the full training split. The filtering is aggressive by design — only pairs where the rewrite demonstrably fixed retrieval are kept.

Qualitative analysis of the rewrites shows the LLM does not apply a uniform transformation. Simple or ambiguous queries are expanded for clarity; verbose or redundant ones are compressed. The rewrite is driven by the retrieval gap, not a style template. That context-sensitivity is a feature of conditioning on both the ground-truth document and the incorrectly retrieved documents simultaneously — the model has explicit evidence of what the corpus responds to.

The paper references GPT-5 as the rewriting model, run at temperature 1.0. The designation is non-standard and the authors don't clarify which model it refers to, which creates a replication problem. The pipeline's logic is sound regardless, but exact reproduction of the dataset is uncertain until that detail is resolved.

---

## Validation and What It Does Not Prove

The authors validate the dataset by retrieving the five most similar verified pairs as few-shot exemplars for a rewriting prompt. Qualitative examples in Table 2 show improved ground-truth document ranking after rewriting with those exemplars. No aggregate Recall@k or MRR figures are reported — the validation is entirely qualitative.

No fine-tuning experiments are included. The claim that the dataset is operationally useful rests on this lightweight offline few-shot setup alone. That's a meaningful gap. Few-shot exemplars drawn from a verified dataset are a plausible mechanism for improvement, but the paper doesn't establish how much improvement, under what conditions, or whether it holds outside SQuAD.

SQuAD v1.1 is a constrained test bed — short, well-structured factual questions where many queries already align with corpus style. The authors acknowledge this directly: rewriting may not universally enhance retrieval on simple datasets. The 18.7% miss rate reflects a corpus where most queries already work. On domain-specific corpora with larger style gaps — technical documentation, legal text, medical literature — the miss rate would likely be higher and the value of style-aware rewriting more pronounced. That's the experiment the paper doesn't run.

---

## Before Building the Dataset

ReFeed's contribution is methodological rather than empirical. The pipeline — filter by retrieval failure, rewrite with explicit style signal from both sides of the gap, verify via re-retrieval — is a credible blueprint for building corpus-specific rewriting datasets without fine-tuning a rewriting model from scratch.

The practical implication is sequencing. Before constructing a rewriting dataset for a RAG system, run retrieval on the existing query set and measure the miss rate. If most queries already retrieve correctly, the dataset will be small and the marginal value of rewriting is limited. If the miss rate is substantial — as it would be on corpora with distinctive style — the ReFeed approach gives a principled way to identify exactly which queries to rewrite and to verify that rewrites actually fix the problem.

The verification step is the part worth preserving in any adaptation. Rewriting without re-retrieval confirmation produces plausible-looking pairs that may not encode real retrieval signal. The 32.5% of miss cases that failed verification despite LLM rewriting are a reminder that style alignment isn't trivially solved by prompting — and that discarding unverified pairs is the right call even when it shrinks the dataset.

---

*Myung, J., Son, J., Lee, K., Park, J., & Han, J. (2026). ReFeed: Retrieval Feedback-Guided Dataset Construction for Style-Aware Query Rewriting. arXiv:2603.01417*