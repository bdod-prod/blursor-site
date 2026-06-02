# Typed Citation Networks Beat Flat RAG on Consensus Reports, Not on General QA

Most retrieval-augmented generation systems treat a scientific paper as a bag of chunks. They don't know whether a citation is a critique, an endorsement, or a benchmark comparison — they just know that two passages are semantically similar. That works fine for point-retrieval questions. It works less well when you want to know what a field actually thinks about a method, or which papers are genuinely controversial, or who influenced whom.

This paper builds a different kind of index. Instead of chunks, it produces a network of typed claims — each citation context labeled by stance (Critique, Adoption, Benchmark, Neutral) and attitude polarity, stored in a triplestore and queryable by structure. The authors instantiate it on 127 papers in 3D point cloud semantic segmentation and run it against standard RAG and GraphRAG on two tasks: general claim-conditioned QA and consensus-report generation.

The anchoring result is narrow but clean: on consensus-report generation, Information Density reaches p=0.0001 (corrected p=0.0004), with 23 wins against 3 losses. On general QA, the system posts a directional win rate of 0.632 but p=0.143 — no dimension reaches significance.

---

## What the System Actually Builds

The pipeline starts with 127 papers gathered by star-shaped expansion around 10 manually selected anchors, using the Semantic Scholar API. Each paper is decomposed into a four-level hierarchy — paper, section, paragraph, sentence — using the Deep Document Model, with the result serialized into a GraphDB triplestore. Citation contexts are then aggregated at the ordered paper-pair level via SPARQL, and an LLM (Qwen3-Max, temperature=0.0) extracts structured labels from each context window.

Every citation gets two labels. The stance axis is multi-label across four classes: Critique, Adoption, Benchmark, Neutral. The attitude axis is single-label: Positive, Negative, Neutral. The output is 8,260 typed claims — not passages, but structured assertions about how one paper positions itself relative to another.

> **8,260** typed claims extracted from 127 papers — each labeled by stance and attitude polarity, queryable by structure rather than text similarity alone.

The distribution is telling. Neutral claims account for 53% of the network, which matches what citation-analysis research has long found: most citations are not evaluative. Among the evaluative classes, Benchmark dominates at 31% — reflecting a community where empirical comparison against established baselines is the primary mode of engagement. Critique is the rarest class at 7%, with only 723 instances across the whole corpus.

Because the claims sit in a triplestore, the system can answer structural queries that semantic similarity retrieval cannot. Weighted PageRank over the Adoption subgraph surfaces influence rankings. A polarity score — (Adoptions minus Critiques) divided by total claims — flags controversial papers. A bridge score identifies papers that connect otherwise-disconnected clusters. These are properties of the citation pattern, not of any individual passage.

---

## Extraction Quality: Strong on Stance, Shakier on Attitude

The authors validate the extractor against 150 pair-windows hand-labeled by the first author. On the stance axis, agreement is strong: Macro-F1 of 0.892, with per-label kappa ranging from 0.811 (Neutral) to 0.904 (Critique) — both in the "almost perfect" range under the Landis–Koch interpretation.

> **Stance axis: Macro-F1 0.892** vs. human annotator (150 pair-windows) · **Attitude axis: Cohen's kappa 0.587** — 'substantial' but notably weaker

The attitude axis is harder. Overall kappa is 0.587 — "substantial" under Landis–Koch, but a meaningful step down from the stance results. Negative is the strongest attitude class (F1=0.951); Positive is the weakest (F1=0.667). The extractor is systematically more willing than the human annotator to call a citation evaluative: it under-predicts Neutral on the stance axis (recall 0.780, with 11 of 50 human-Neutral windows assigned an evaluative label) and over-predicts Positive on the attitude axis (precision 0.625, with 16 of 74 human-Neutral windows assigned Positive).

A separate transferability check runs the extractor against the SciCite test set (1,859 sentences) in two modes: direct SciCite labeling and mapped output from the four-class taxonomy. The two modes agree with each other at accuracy=0.906 and kappa=0.838 — the taxonomy mapping is internally consistent. But both modes sit roughly 30 points below SciCite gold (accuracy around 0.70, Macro-F1 around 0.65). The authors attribute this gap to unit mismatch — the extractor was designed for paragraph-aggregated contexts, not individual sentences — and domain mismatch between 3D point cloud papers and the biomedical/NLP corpus SciCite was built on. The mapping itself doesn't introduce the gap; it's shared between both modes.

One methodological note worth flagging: the human annotation is single-annotator (the first author), so the kappa values measure agreement between the extractor and one trained annotator rather than inter-annotator agreement. Extractor noise and annotation noise cannot be separated.

---

## Where the Claim Network Wins — and Where It Doesn't

The evaluation runs two tasks. Task 1 is claim-conditioned QA: 15 hand-curated questions, evaluated across three runs (45 items per dimension), with GPT-4o as judge in a four-trial order-counterbalanced protocol. Task 2 is consensus-report generation: 10 target papers, three runs (30 items per dimension), same judge setup.

> **p=0.0001** — Task 2 Information Density, survives Holm–Bonferroni correction (p_corr=0.0004, 23 wins vs. 3 losses) · **p=0.143** — Task 1 General QA overall, directional but null · **0–6 loss** — Source Diversity vs. GraphRAG, a clear reversal of the claim network's advantage over the chunk baseline

On Task 1, the system posts a pooled win rate of 0.632 over 38 decided items — directionally positive, but p=0.143. No individual dimension reaches significance before Holm correction, and after correction every per-dimension p-value rounds to 1. A sensitivity sweep across nine threshold configurations produces overall win rates spanning 0.533–0.786, all directionally positive, none significant at 0.05.

On Task 2, the picture is different. Information Density — how much substantive content the consensus report packs in — reaches p=0.0001, with 23 wins against 3 losses and 4 ties. That result survives Holm–Bonferroni correction across five rubric dimensions (corrected p=0.0004). The overall weighted win rate across 29 decided items is 0.655.

The pattern is interpretable. Typed claim retrieval adds value when the task requires aggregating evaluative stance across many sources — which is exactly what consensus-report generation demands. When the task is answering a specific factual question from retrieved passages, flat chunk retrieval is already adequate, and the additional structure doesn't help.

---

## The GraphRAG Comparison: Quality vs. Cost

The authors also run a head-to-head against GraphRAG on 6 of the 10 Task 2 targets — limited to 6 because GraphRAG is expensive. The cost differential is stark: the claim network pipeline cost approximately 20 RMB for construction and six reports; GraphRAG cost approximately 400 RMB for the same task.

> **20× cost advantage** of claim network over GraphRAG for consensus report generation · **0–6 loss** on Source Diversity — a direct reversal of the 14–6 lead the claim network holds over the plain chunk baseline

On Source Diversity — how broadly the report draws on the available literature — the claim network loses 0–6 against GraphRAG. That's a direct reversal of the 14–6 lead the claim network holds over the plain chunk baseline on the same dimension. GraphRAG's community-detection indexing captures source breadth that SPARQL-based typed retrieval does not.

The comparison is exploratory rather than powered — 6 papers, one dimension reaching significance — but it surfaces a real trade-off. GraphRAG builds a richer graph of the whole corpus and can draw on that breadth when generating reports. The claim network is cheaper and wins on Information Density against the chunk baseline, but it doesn't replicate GraphRAG's coverage. Whether that trade-off is worth it depends on what the task actually requires and what the budget allows.

---

## What to Do With This

If you're building retrieval infrastructure for scientific literature, the practical question this paper answers is: when does the extra structure of a typed citation network pay off?

The answer is specific. If your downstream task aggregates evaluative stance across a literature — consensus reports, controversy detection, influence mapping — a typed claim network earns its keep. The Information Density result is real and survives correction. If your task is answering point questions from retrieved passages, flat chunk retrieval is already adequate, and the claim network adds cost without adding measurable quality.

The cost comparison with GraphRAG is worth keeping in mind. At a 20:1 ratio, the claim network is a viable option for teams that need structured citation analysis but can't afford GraphRAG's indexing costs — provided they don't need the source breadth that GraphRAG's community detection provides. The two systems are not substitutes; they're optimized for different things.

One caveat that matters for anyone considering deployment: the extractor over-represents evaluative content relative to a stricter human annotator, and the polarity score it produces creates an explicit incentive for adversarial manipulation of citing prose. If the score is ever surfaced publicly, that's worth thinking through before it ships.

*Ding, N., Rodríguez Méndez, S. J., & Omran, P. G. (2026). Reading Between the Citations: A Typed Claim Network for Scientific Literature. arXiv:2605.30966*