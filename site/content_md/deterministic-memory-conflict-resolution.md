# Deterministic Aggregation Beats LLM Freshness Judgment by 21 Points at Long Context

Most work on memory conflict resolution — the problem of surfacing the most recent value of a fact when a system holds multiple contradictory versions — focuses on storage architecture. Temporal knowledge graphs with bi-temporal edges, hippocampal indexing, agentic memory layers: the implicit assumption is that if you build a smarter store, the right answer will be easier to find. A new paper from IIT Kharagpur tests that assumption directly against 22 published systems and finds it doesn't hold. The bottleneck isn't storage. It's what happens after retrieval.

The paper evaluates on MAB FactConsolidation, a benchmark specifically designed for memory conflict resolution. The anchoring result: a three-step pipeline costing roughly $0.0001 per query — BM25 retrieval, structured JSON extraction at temperature 0.0, and a single Python `max()` call on version numbers — scores 82% on the single-hop task at 262K context. The best published RAG system, HippoRAG-v2, scores 54% on the same task. Zep/Graphiti, a temporal knowledge graph built explicitly for agent memory with validity intervals, scores 7%.

---

## The Problem Is Post-Retrieval, Not Storage

Zep/Graphiti is worth dwelling on for a moment. It's not a naive system — it maintains bi-temporal edges and validity intervals specifically to handle the kind of fact-update conflicts this benchmark tests. Yet it scores 7% on FC-SH at 262K context, while a pipeline using BM25 and a Python comparison operator scores 82% with a weaker backbone model. That's a 75-point gap between a purpose-built temporal architecture and something you could write in an afternoon.

The same pattern holds across all 22 systems the paper evaluates. None of them — temporal knowledge graphs, hippocampal RAG, agentic memory architectures — match the deterministic pipeline. The authors argue this points to a misdiagnosis that's been shaping the field: researchers have been investing in storage when the failure is happening downstream, in how retrieved candidates get aggregated into a final answer.

To check whether retrieval itself is the problem, the paper computes union accuracy — the fraction of questions answered correctly by either pipeline. That number is 88.5%, pooled across 400 questions. Retrieval is already recovering the right fact for nearly nine in ten questions. The remaining gap is almost entirely a resolver problem.

> **82%** — Deterministic pipeline (gpt-4o-mini) on FC-SH at 262K context, vs. **7%** for Zep/Graphiti on the same task.

---

## What the Deterministic Pipeline Actually Does

The pipeline has three steps. First, BM25 retrieval with TOP_K=10 pulls candidate passages from the memory store. Second, an LLM extracts candidate answers into structured JSON at temperature 0.0 — no free-text generation, no reasoning about which answer is newer. Third, Python `max(serial)` picks the candidate with the highest version number. The LLM is used for extraction, not judgment.

Fact-level chunking via regex preserves serial numbers as indexing keys throughout the pipeline. This is what makes the deterministic resolver reliable: each chunk carries its version marker, so `max()` has a clean total ordering to work with. The LLM never has to reason about recency — it just has to extract the value, which is a much easier task.

For multi-hop questions, a Chain-Aware Resolution variant (CAR) decomposes the question into atomic hops using Self-Ask-style prompting, runs the single-hop pipeline on each hop, and propagates answers through placeholders. The CAR pipeline executes 86% of planned hops successfully, averaging 2.56 hops per question.

---

## LLM Judgment Degrades at Long Context; Deterministic Does Not

The comparison that makes the case most clearly is the context-length sweep. At 64K context, the LLM-judgment baseline scores 75% and the deterministic pipeline scores 81% — a 6-point gap. At 262K, the LLM-judgment baseline drops to 61% while the deterministic pipeline rises to 82%. That's a 21-point gap, and it opens because the LLM baseline is falling, not because the deterministic pipeline is improving dramatically.

Both pipelines use identical BM25 TOP_K=10 retrieval, so retrieval degradation isn't the explanation. The collapse is specific to asking the LLM to reason about which answer is freshest across a 262K context window. That task — holding multiple conflicting values in mind and judging recency — is exactly what LLMs get worse at as context grows. The deterministic resolver sidesteps it entirely.

With a stronger backbone, the ceiling is higher: gpt-4o reaches 94.8% average on FC-SH, and o4-mini reaches 96.5%. But even the gpt-4o-mini pipeline at 262K beats every published system at any context length.

> **+21 pp** — Deterministic over LLM-judgment at 262K context (82% vs 61%), with the LLM baseline having fallen 14 points from 64K while the deterministic pipeline improved.

---

## Where Deterministic Aggregation Fails

The deterministic pipeline isn't strictly dominant. Across 400 pooled FC-SH questions, 21.3% are answered correctly only by the Python max pipeline, but 10.5% are answered correctly only by the LLM-judgment baseline — cases where strict extraction over-rejection causes the deterministic pipeline to return no answer. A hybrid fallback that uses LLM judgment when extraction returns empty was tested and came out essentially flat, adding just 0.2 percentage points.

| Questions | Share |
|---|---|
| Solved only by deterministic pipeline (Python max wins) | 21.3% |
| Solved only by LLM-judgment (extraction over-rejection) | 10.5% |
| Solved by neither pipeline (retrieval failure floor) | 11.5% |

The cross-benchmark check on LongMemEval knowledge-update questions tells a similar story about scope. On that task, the deterministic pipeline scores 57.8% versus 64.4% for the LLM baseline — a difference well within overlapping 95% confidence intervals on n=45 questions. The deterministic approach wins cleanly on "what is X currently?" questions but doesn't generalize to Yes/No, historical, or aggregation question types, which still require LLM judgment.

Multi-hop resolution remains substantially harder. The CAR pipeline with gpt-4o-mini averages 30.2% on FC-MH — better than the best published result of 7%, but far below the 78% single-hop figure. With gpt-4o, multi-hop rises to 51.5%. The decomposition approach also has a context-length interaction worth noting: at 6K, CAR hurts o4-mini (52% vs 80% without decomposition, because the model can already solve the chain end-to-end), but at 32K it rescues it (42% vs 14% without decomposition, where the plain pipeline has collapsed).

The approach also has a hard prerequisite: source data needs explicit version markers with a total ordering. Partial orders and causal dependencies between updates are out of scope.

---

## What to Do About It

If you're building or evaluating a memory system that needs to answer "what is the current value of X" questions, the practical implication is direct: invest in version markers and deterministic aggregation before investing in storage architecture. A temporal knowledge graph with validity intervals doesn't help if the resolver can't use them reliably at long context.

The specific recipe — fact-level chunking that preserves serial numbers, structured extraction at temperature 0.0, Python `max()` — is cheap enough to run at scale ($0.0001 per query with gpt-4o-mini) and outperforms systems that cost far more to build and maintain. The failure mode to watch for is extraction over-rejection: when the extraction step returns empty, the deterministic resolver has nothing to work with. That's the 10.5% of questions where LLM judgment still wins.

For question types beyond current-value lookup — historical queries, Yes/No, aggregations — the deterministic approach doesn't help, and the paper doesn't claim otherwise. The contribution is a targeted primitive, not a general memory QA solution. But for the specific problem of conflict resolution under version-ordered updates, the evidence here suggests the field has been solving the wrong subproblem.

*Reddy, V., & Challaram, S. (2026). Don't Ask the LLM to Track Freshness: A Deterministic Recipe for Memory Conflict Resolution. arXiv:2606.01435*