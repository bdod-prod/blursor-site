# Native Query Structure Beats Unified Embeddings Across 309 Knowledge Bases

Most retrieval benchmarks test one backend at a time — a document corpus, a relational database, a knowledge graph. Real systems don't work that way. A question about a company might need a SQL join across a 70-million-row database, a SPARQL traversal of Wikidata's 15 billion triples, and a passage from a 7-million-document corpus — sometimes all three. The question is whether a single pipeline can route across all of them without flattening what makes each backend useful.

OmniRetrieval answers that question with a three-step LLM pipeline that routes queries to native backends — SQL, SPARQL, Cypher, or free-text search — rather than converting everything into a shared embedding space. Tested across 13 datasets and 309 distinct knowledge bases spanning all four retrieval paradigms, it consistently outperforms both single-source baselines and unified-representation approaches.

The number that anchors the paper: OmniRetrieval's average LLM-as-a-Judge score across five backbone models is 65.88, against 57.99 for the next-best baseline and a theoretical Oracle ceiling of 74.55. The gap to the Oracle is real — but where it comes from tells you exactly where to focus engineering effort.

---

## The Problem: One Query, 309 Knowledge Bases

The benchmark OmniRetrieval introduces is the first to stress-test cross-paradigm retrieval at realistic catalog scale. It draws from 13 publicly available datasets: 7 document corpora, 286 relational databases (206 from Spider, 80 from BIRD), 1 RDF knowledge graph (Wikidata, shared across three SPARQL datasets), and 15 labeled property graphs from Text2Cypher. Each dataset contributes 300 questions, and the pipeline has to figure out which of the 309 knowledge bases to query — at inference time, without any paradigm label on the question.

The scale numbers matter because they explain why unified-representation methods struggle. Wikidata holds 15 billion triples. One BIRD database has 70 million rows. Wikipedia-derived corpora run to 7 million passages. Flattening any of these into atomic embedding units isn't just lossy — it's computationally infeasible at the scale the benchmark requires. The unified methods evaluated in the paper can only be tested under a constrained setup that pre-filters to gold-touched triples and edges, an advantage no other method receives.

Beyond scale, there's a structural argument. A SQL join across multiple tables, a multi-hop SPARQL traversal, a Cypher pattern match — these are compositional operations that don't survive conversion to atomic retrieval units. The query structure is part of the answer.

> **309** distinct knowledge bases spanning document corpora, relational databases, RDF knowledge graphs, and labeled property graphs — the catalog OmniRetrieval must route across at inference time.

---

## The Architecture: Select, Query, Compare

The pipeline runs three sequential LLM steps. First, a source selector reads the full catalog of source descriptors alongside the incoming question and returns a ranked short list of candidate sources. Second, a native query generator translates the question into the appropriate query language — SQL, SPARQL, Cypher, or free-form text — conditioned on each candidate source's schema. Third, a cross-source evidence selector verbalizes the executor outputs and picks the most relevant subset.

Document retrieval gets a HyDE-style rewrite before embedding: the question is turned into a hypothetical passage, then matched against the corpus using all-MiniLM-L6-v2. SPARQL generation follows an entity-linking procedure borrowed from the ToG framework to build structural context before formulating the query. Each step preserves the compositional structure — joins, graph traversals, multi-hop chains — that a flat embedding approach would discard.

All three steps use the same shared LLM backbone, and the paper tests five of them: GPT-5.4, Gemini-3.1 Pro, Sonnet-4.6, Qwen-3.5 27B, and Gemma-4 31B. Metrics are macro-averaged across the four retrieval paradigms, which matters because the catalog is heavily skewed toward relational databases (286 of 309 sources). Without macro-averaging, SQL performance would dominate the headline numbers.

---

## Native Queries vs. Unified Embeddings: The Gap Is Not Close

The comparison against unified-representation methods is the clearest result in the paper. Under the constrained feasibility setup — which gives unified methods access to pre-filtered gold-touched triples and edges that no other method receives — the unified baseline scores 31.00 on Source Selection Accuracy, 23.00 on Retrieval Accuracy, and 45.00 on LLM-as-a-Judge (GPT-5.4 backbone). OmniRetrieval on the same backbone, without that advantage, scores 68.58 / 46.62 / 69.72.

| Method | Source Selection | Retrieval Accuracy | LLM-as-a-Judge |
|---|---|---|---|
| Unified Representation (constrained) | 31.00 | 23.00 | 45.00 |
| OmniRetrieval (GPT-5.4) | 68.58 | 46.62 | 69.72 |

That's more than double on source selection and retrieval accuracy, despite the constrained setup being designed to make unified methods look as good as possible. The unified approach does beat single-backend baselines — it occasionally answers questions from the wrong paradigm because document search has enough overlap with Wikidata's factual content to cover some SPARQL-type questions. But it stays far below KB Routing and OmniRetrieval.

The underlying reason is structural. Unified methods convert knowledge sources into atomic units and retrieve by similarity. That works for passage retrieval. It doesn't work for a question that requires joining three tables or traversing a property graph — the answer isn't in any single atomic unit, it emerges from the query structure. Preserving native query languages isn't an implementation detail; it's the mechanism.

---

## Where the Pipeline Actually Fails: Source Selection

OmniRetrieval's average LLM-as-a-Judge score is 65.88. The Oracle — which always has the gold source in the candidate list — scores 74.55. That 8.67-point gap is almost entirely explained by source selection errors, not evidence extraction errors.

The evidence is in Table 2. Once the gold source is included in the candidate list, the evidence-selection step picks it at 72.81% accuracy for GPT-5.4, 75.29% for Gemini-3.1, 70.44% for Sonnet-4.6, 67.91% for Qwen-3.5, and 74.33% for Gemma-4. The random baselines for those same backbones range from 35.55% to 47.73%. Evidence selection, when given the right candidates, is doing its job well.

Source selection is a different story. Average Source Selection Accuracy across five backbones is 65.71 for OmniRetrieval — meaningful, but with substantial room to improve. The Oracle's LLM-as-a-Judge ceiling of 74.55 shows how much is recoverable if source selection were solved. And the gap between OmniRetrieval and Oracle narrows from the selection step to the judge step, which means evidence selection sometimes recovers a semantically equivalent answer even when the wrong source was selected — document search's broad coverage helps here.

Backbone scale is a hard constraint on source selection quality. At 2B parameters, the source-selection step collapses to a single paradigm — the model can't maintain diversity across SQL, SPARQL, Cypher, and document search simultaneously. Meaningful cross-paradigm diversity only emerges above 4B parameters. There's also a specific bias at Qwen-3.5 9B, which pulls top candidates toward document search. The practical implication: this approach requires a backbone of at least 4B parameters to function as designed.

---

## What to Do About It

If you're building or evaluating a retrieval system that spans more than one storage paradigm, the main lesson is that native query structure is non-negotiable. Converting relational or graph sources into embedding-friendly atomic units doesn't just lose performance — it loses the compositional operations that make those backends worth querying in the first place. The 24-point LLM-as-a-Judge gap between OmniRetrieval and the unified baseline, measured under conditions that favor the unified approach, is about as clear a signal as benchmark results produce.

The engineering priority that follows from the Oracle analysis is source selection, not evidence extraction. Evidence selection already performs well once the right source is in the candidate list — accuracy in the 67–75% range across all five backbones, against random baselines of 35–48%. Improving source selection accuracy is where the remaining gap to the Oracle ceiling lives. That means better source descriptors, better catalog representations, and possibly fine-tuning the selection step on downstream answer quality — the paper flags supervised fine-tuning and reinforcement learning on answer quality as the natural next direction.

One constraint worth flagging before adoption: the 2B parameter floor for source selection to work across paradigms is a real deployment consideration. If your inference budget puts you below 4B parameters, the multi-paradigm routing benefit largely disappears.

*Baek, J., Jeong, S., Park, S., Yeo, W., Kang, M., Trirat, P., Lee, H., & Hwang, S. J. (2026). OmniRetrieval: Unified Retrieval across Heterogeneous Knowledge Sources. arXiv:2605.29250*