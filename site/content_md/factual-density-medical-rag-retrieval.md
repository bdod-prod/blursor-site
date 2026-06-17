# Standard Cosine Retrieval Buries Cochrane Evidence — A Factual Density Fix Surfaces It

When you ask a medical RAG system about cardiovascular risk, it doesn't return the most informative documents. It returns the most lexically similar ones. A 2,000-word article that mentions exercise and heart disease a dozen times will consistently outrank a 200-word Cochrane abstract containing 15 specific, quantified clinical outcomes — because cosine similarity measures word overlap with the query, not informational value. The Cochrane abstract loses not because it's less relevant, but because it's more concise.

This paper names that failure the Expert Blindness Effect and proposes a fix: a length-normalized factual density score (FD*) that, combined 50/50 with cosine similarity, reranks retrieved chunks toward dense, quantified evidence. The approach requires no changes to the embedding model, vector store, or retrieval infrastructure — just a preprocessing step at ingestion time.

The anchoring result: on a cardiovascular risk query, standard cosine retrieval placed only 2 of 5 Cochrane systematic review chunks in the top-5 results. The FD*-composite condition placed all 5.

---

## The Expert Blindness Effect

Cosine similarity does one thing: it measures how much a document's embedding overlaps with the query's embedding. That's useful for topical relevance, but it's indifferent to whether a document contains three vague sentences about a topic or thirty quantified clinical findings. Verbose, topically broad documents accumulate lexical overlap across their length. Dense, structured abstracts — the kind Cochrane produces — don't.

The practical consequence showed up clearly in a three-way retrieval comparison on the query "Does exercise reduce cardiovascular disease risk and mortality?" Standard cosine retrieval (Condition A) returned 2 of 5 Cochrane systematic review chunks in the top-5. BM25 lexical retrieval (Condition B) did better — 4 of 5 — because the query terms were lexically distinctive and BM25's term-frequency weighting rewarded that. The FD*-composite condition (Condition C) returned all 5.

One specific case illustrates the problem precisely. PMID 40326569, a Cochrane abstract, had a cosine similarity of 0.7308 — not good enough to crack the top ten under standard retrieval. Its FD* score was 9.660. Under composite reranking, it rose to Rank 4. The document hadn't changed; the scoring system had started measuring something different.

> **40% → 100%**
> Cochrane SR saturation in top-5 results: standard cosine returned 2 of 5; FD*-composite returned 5 of 5 on the same cardiovascular query.

The implication is that any medical RAG pipeline relying solely on cosine similarity is systematically deprioritizing its highest-quality evidence sources — and the deprioritization is invisible in the similarity scores themselves.

---

## Building a Length-Independent Factual Density Signal

The first attempt at a factual density metric ran into an immediate problem. The raw formula — summing probabilistic factuality scores per sentence, then dividing by token count — was supposed to measure how much verified, specific information a document packed into its length. Instead, it mostly measured how short the document was.

Linear regression of raw FD scores against token counts across the 600-chunk corpus found a Pearson R of -0.8636 (p = 2.27e-07). Document length alone explained 74.6% of the variance in raw FD scores. The slope was -0.000269: for every additional 1,000 tokens, the raw FD score dropped by about 0.27 points. Short documents scored high not because they were dense but because the denominator was small.

> **74.6%**
> Variance in raw Factual Density scores explained by document length alone before correction — the metric was measuring brevity, not informational richness.

The fix was Z-score normalization within three length bins: SHORT (≤288 tokens), MEDIUM (289–500 tokens), and LONG (>500 tokens). After correction, the R-squared dropped from 0.746 to 0.150, and the residual correlation fell to p = 0.0749 — clearing the significance threshold. The corrected metric is called FD*.

That said, the correction is partial. A residual Pearson R of -0.3873 remains between FD* scores and document length, meaning shorter documents still score somewhat higher than longer ones at equivalent informational density. The bin boundaries are also hardcoded from the validation corpus, which may not transfer cleanly to corpora with different length distributions. FD* is a meaningful improvement over raw FD, but it's not a fully solved problem.

---

## Source Tier Extraction: Why Cochrane Dominates

The corpus was built from three source tiers — COCHRANE_SR, CLINICAL_RCT, and SCIENTIFIC_PMC — each contributing 200 chunks retrieved via the NCBI Entrez API. Before any retrieval comparison, the paper ran an extraction analysis to understand how much factual material each tier actually contained.

The asymmetry was large. COCHRANE_SR produced 11,954 extracted claims across its 200 chunks. CLINICAL_RCT produced 5,745. SCIENTIFIC_PMC produced 4,463. Cochrane generated more than twice the claim volume of clinical trial abstracts and nearly three times that of general PMC articles — a direct consequence of the mandatory exhaustive reporting format that Cochrane structured abstracts follow.

| Source Tier | Claims Extracted | Mean prob_fact |
|---|---|---|
| COCHRANE_SR | 11,954 | 0.921 |
| CLINICAL_RCT | 5,745 | 0.958 |
| SCIENTIFIC_PMC | 4,463 | 0.887 |

Claim volume and claim quality are distinct dimensions. CLINICAL_RCT achieved the highest mean probabilistic factuality score at 0.958, compared to 0.921 for COCHRANE_SR and 0.887 for SCIENTIFIC_PMC. Cochrane abstracts contain more claims per document; RCT abstracts contain more verifiable, specific claims per sentence. Both matter, and FD* is sensitive to both — which is why source-tier composition becomes a first-order design decision in any factual-density-aware pipeline.

The prob_fact score itself measures verifiability and specificity, not empirical truth. A claim can score 1.0 and still be factually wrong. That's a meaningful caveat: FD* surfaces documents that make precise, checkable claims, but it doesn't verify those claims against external ground truth.

---

## What the Evaluation Could and Could Not Confirm

The paper planned a Wilcoxon signed-rank test across 50 paired Precision@5 scores — a standard statistical comparison that would have established whether FD*-composite retrieval outperforms cosine retrieval across a range of query types. That test never ran.

The problem was corpus-benchmark alignment. The HealthFC benchmark contains 750 expert-labeled health claims. The 600-chunk corpus, built from high-authority biomedical sources, mapped to confirmed ground truth chunks for only 14% of the 50 locked evaluation queries — 7 queries with confirmed mappings, producing 25 valid chunk-to-claim pairs. The 40% coverage threshold required to proceed with statistical testing was never reached.

> **14%**
> Actual query coverage achieved against the 50-query HealthFC evaluation set — far below the 40% threshold needed for the planned statistical test.

A seeded pre-check on 12 Cochrane chunks had shown 38.62% alignment, which looked promising. Full corpus ingestion revealed the real number was 14%. Topically curated samples systematically overestimate how well a corpus will cover a general benchmark — a methodological lesson the paper documents explicitly.

All retrieval findings therefore rest on a single cardiovascular query audit. The Expert Blindness Effect is directionally supported: the numbers from that one query are clear, and the mechanism is well-explained. But whether the same pattern holds across query types, domains, and different corpus compositions remains an open question. The paper is transparent about this, framing all findings as preliminary evidence rather than confirmed conclusions.

---

## What to Do With This

The practical case for FD*-composite reranking is real even with the evaluation limitations. The mechanism behind the Expert Blindness Effect is structurally sound — cosine similarity genuinely doesn't reward informational density, and that's a problem in any domain where the highest-quality evidence is also the most concise. Medical RAG is the clearest example, but the same dynamic applies anywhere systematic reviews or structured evidence compete against longer, topically adjacent documents.

The implementation ask is low. FD* is computed once at ingestion time. Composite reranking at query time uses scores already stored in the database. Nothing about the embedding model, vector store, or retrieval infrastructure changes. For teams already running a medical RAG pipeline, this is a preprocessing addition, not an architectural decision.

The caveats worth tracking: the length normalization is partial, the bin parameters may not generalize to your corpus, and the source authority weights (0.95 for Cochrane, 0.90 for RCTs, 1.0 for PMC) were set by judgment rather than empirical optimization. Different weight assignments would produce different FD* scores. And the retrieval gains shown here come from one query — replication across a broader benchmark is the obvious next step before treating this as a validated production method.

For now, the directional finding is useful: if your RAG system is supposed to surface the best clinical evidence, checking whether it's actually doing that — rather than surfacing the longest documents on the topic — is worth the audit.

*DeMarco, M. R. (2025). Evaluating Factual Density in Multi-Source RAG: A Study in Medical AI Accuracy. arXiv:2605.31506*