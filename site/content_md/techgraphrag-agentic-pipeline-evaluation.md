# TechGraphRAG Reaches P@5=0.78 on a Six-Query Test — Here's What That Actually Means

Most RAG systems published in the research literature make one or two architectural bets — hybrid retrieval, or a reranker, or a knowledge graph — and evaluate on a clean benchmark. TechGraphRAG makes all of those bets simultaneously, adding evidence-gated control flow, external API loops, citation verification, and a self-correcting generation step on top. The result is a 13-step pipeline that's genuinely more integrated than most published systems.

The catch is the evaluation. The end-to-end test covers six queries. The retrieval ablation covers ten. Those numbers are too small to validate a system this complex — and the authors say so directly, describing the ablation results as "preliminary" and flagging expansion to 20–50 queries as ongoing work. What the paper offers is a detailed architecture with directionally useful performance data, not a validated production system.

The anchoring number is P@5=0.78 for the full pipeline versus P@5=0.52 for BM25 alone — a 50% relative improvement, measured on that ten-query development set.

---

## What the Pipeline Actually Does

TechGraphRAG organizes its 13 steps into two agentic loops. The first handles evidence gathering: classify the query by intent, run hybrid retrieval, score the evidence against a 100-point rubric, retry with a reformulated query if the score is too low, and search external academic APIs if the local corpus still falls short. The second loop handles answer curation: traverse the knowledge graph for relational context, verify citations, generate the answer, and run a quality check with automatic regeneration if something fails.

Query intent gets classified into four route types — content, bibliometric, trend, and current_world — each triggering a different subset of the pipeline. That routing decision explains most of the latency spread: a current_world query that skips academic search finishes in 10.9 seconds, while a content query that hits retry and external search takes 22.1 seconds, with a mean of 16.4 seconds across the six test queries.

The evidence sufficiency rubric is one of the more unusual design choices here. Before deciding whether to answer from the local corpus, enrich with external sources, or trigger a retry, the system scores retrieved context across five dimensions: Retrieval Confidence (40 points), Answer Specificity (25), Source Diversity (15), Metadata Completeness (10), and Recency/Intent Fit (10). Scores of 80–100 go straight to generation; 50–79 optionally pull in external sources; below 50 triggers a retry. The authors note this trades end-to-end learnability for interpretability — you can audit why the system made a given routing decision, which matters in a research assistant context.

The knowledge graph runs on Neo4j with entities extracted by GPT-4o-mini and author metadata validated against OpenAlex. When OpenAlex returns a confident title match, its author list replaces the LLM's extraction — a practical guard against misattribution. Co-citation traversal uses both external citation edges and intra-corpus citation links, which is how the system surfaces related papers that don't appear in the top-20 vector or keyword results.

---

## Retrieval Gains Are Real, But Measured Narrowly

The ablation study isolates the contribution of each pipeline component on a ten-query development set with expert-labeled relevant chunks. BM25 alone reaches P@5=0.52. Adding dense retrieval and fusing the two ranked lists via Reciprocal Rank Fusion brings it to P@5=0.66. Cross-encoder reranking on top of that jumps to P@5=0.74 — that single step accounts for +8 P@5 points, the largest gain of any individual component. Adding query rewriting and keyword boosting gets the full pipeline to P@5=0.78, with MRR=0.87.

The ordering matters: reranking contributes more than query rewriting or keyword boosting in this configuration. That's a useful signal for practitioners deciding where to invest engineering effort, even if the sample size limits how far you can generalize it.

The ten-query set was labeled by one expert, and the authors are explicit that these results are preliminary. The relative ordering of components is probably stable — cross-encoder reranking reliably helps in other published work too — but the absolute numbers shouldn't be treated as benchmarks.

---

## The Evaluation Gap

Route classification accuracy is reported as 6/6 — perfect, across three route types. That's not a meaningful statistical result; it's a sanity check that the classifier works on a handful of examples. All six answers also passed the automated quality check without regeneration, which sounds reassuring until you notice that the quality judge is GPT-4o-mini evaluating outputs produced by GPT-4o-mini. LLM-as-judge setups are known to exhibit self-enhancement bias, and there's no human evaluation or inter-rater reliability analysis here to calibrate against.

The proprietary corpus — roughly 2,100 papers on intelligent tires, vehicle dynamics, and vehicle control, accumulated over 15 years — can't be released. That means neither the retrieval ablation nor the route evaluation is reproducible by external researchers. The knowledge graph's qualitative benefit (surfacing co-cited papers absent from top-20 retrieval results) is illustrated with one example query about tire friction estimation, not measured across the test set.

None of this makes the architecture uninteresting. It makes the performance claims provisional. The gap between "this is a well-designed system" and "this system performs at P@5=0.78" requires more evaluation to close.

---

## Operational Characteristics Worth Noting

At a mean of $0.0045 per query — the six-query test totaled $0.027 — the pipeline is cheap enough for production use in low-volume research assistant contexts. GPT-4o-mini handles query classification, evidence scoring, query rewriting, citation verification, and generation throughout, which keeps costs down while keeping latency in the 10–22 second range.

There are hard limits worth knowing before deploying anything like this. PDFs over 40 pages are skipped entirely. Figures, tables, charts, and equations rendered as images aren't extracted or indexed. The pipeline depends on three external academic APIs — Crossref, OpenAlex, and Semantic Scholar — whose availability and rate limits are outside the system's control. And the whole thing runs on OpenAI's API, so model deprecation and pricing changes are real operational risks.

The 40-page PDF cap is actually less restrictive than it sounds in the context of the broader motivation. The paper notes that even extended-context LLMs typically handle only 15–20 pages of dense technical text usefully — so the RAG approach is doing real work here, not just compensating for an artificial constraint.

---

## What to Do With This

If you're building a domain-specific research assistant over a proprietary technical corpus, TechGraphRAG's architecture is worth reading carefully. The evidence-gated control flow — score first, then decide whether to retrieve more — is a cleaner design than most published systems, and the explicit routing by query intent is practical rather than theoretical. Cross-encoder reranking being the single largest retrieval gain (+8 P@5 points) is a useful calibration point if you're deciding where to invest.

What you shouldn't do is treat P@5=0.78 as a benchmark to beat or cite as evidence that this architecture generalizes. Six end-to-end queries and ten ablation queries, on a corpus that can't be shared, evaluated partly by a model judging its own outputs — that's a prototype with promising numbers, not a validated system. The authors know this and say so. The architecture deserves a real evaluation; it hasn't had one yet.

For practitioners thinking about AI-search visibility or how technical content gets surfaced by retrieval systems: the evidence sufficiency rubric and the explicit routing logic are the parts most worth borrowing. They make the system's decisions auditable in a way that implicit end-to-end models don't, and auditability matters when you're trying to understand why certain content gets retrieved and certain content doesn't.

*Singh, K. B. (2026). TechGraphRAG: An Agentic Graph-Augmented RAG Framework for Technical Literature Reasoning. arXiv:2606.01613*