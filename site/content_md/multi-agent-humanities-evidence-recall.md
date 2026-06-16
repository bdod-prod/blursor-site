# Multi-Agent RAG Doubles Evidence Recall for Classical Scholarship — But Standard Metrics Can't See It

Humanities scholarship runs on provenance. When a classicist argues that a Han dynasty text echoes Stoic cosmology, the argument lives or dies on which passages they can actually point to — not on whether the prose sounds plausible. That's a different demand than most AI-search benchmarks are built to measure, and it exposes a real problem: systems that score well on fluency can be citing nothing verifiable at all.

SPIRE, a multi-agent RAG framework from Peking University, is built specifically for this gap. It decomposes scholarly reading into seven distinct epistemic moves — the things a trained classicist actually does when working through a primary source — and retrieves evidence at three scales simultaneously. The result is tested against a benchmark of 406 peer-reviewed papers on classical Chinese and Greco-Roman Latin scholarship, each manually annotated for which primary-source passages the authors actually cited.

The anchoring number: SPIRE recovers 44.3% of cited primary-source evidence at k=10. The strongest baseline, flat Text RAG, recovers 22.4%.

---

## The Evidence Grounding Problem in Humanities AI

The gap between fluency and grounding is easy to miss because standard evaluation metrics don't look for it. BGE-M3 cosine similarity and BERTScore measure how much the generated answer resembles a reference answer in surface form — which tells you whether the text sounds right, not whether it's traceable to anything real.

The paper makes this concrete with a striking comparison. The no-retrieval Naive LLM — which generates answers entirely from parametric memory, citing nothing from the corpus — scores 81.0 on BGE-M3 cosine and 85.3 on BERTScore. SPIRE, with its full retrieval apparatus, scores 81.8 and 84.4. The difference is within noise. A system that retrieves nothing looks essentially identical to a system that retrieves twice as much as any baseline, if you're only measuring surface similarity.

This is the core methodological contribution of the benchmark: it measures evidence recall directly. Graduate students in history and philology manually extracted the primary-source passages cited in each of the 406 papers, creating a ground-truth pool that lets you ask whether the system actually found what the scholars found — not just whether it produced fluent prose about the same topic.

---

## SPIRE vs. Baselines: Evidence Recall Doubles, Surface Scores Lie

<performance-callout left_desc="SPIRE evidence recall (eR@10)" left_figure="44.3%" right_desc="Text RAG evidence recall (eR@10) — strongest baseline" right_figure="22.4%" />

The evidence recall gap is large and consistent across every threshold and every query category. SPIRE's 44.3% compares to 22.4% for Text RAG, 14.3% for Naive LLM, and 12.4% for GraphRAG. GraphRAG actually underperforms the no-retrieval baseline — community-summary retrieval abstracts away the citation-bearing passage itself, leaving the system unable to surface the specific lines a scholar would need.

Blind evaluation by two human experts and two LLM raters (GPT-5.4 and Qwen3.5-122B) confirms the pattern. SPIRE ranks first on all four aspects — answer accuracy, argument depth, coverage completeness, and evidence quality — across all four raters. The surface metrics, meanwhile, cannot distinguish SPIRE from a system that retrieved nothing.

The robustness re-run with a different generator (Gemini-3-Flash) widens the gap further: SPIRE reaches 54.1% evidence recall versus 9.5% for Text RAG and 16.4% for GraphRAG. The relative ordering is stable; the absolute margins grow.

---

## What Drives the Gain: Seven Agents and a Reflection Loop

<failure-map rows=[
  {"pct":"44.3%","label":"SPIRE (full system)","primary":true},
  {"pct":"33.5%","label":"SPIRE without intra-context community tier"},
  {"pct":"32.5%","label":"SPIRE without cross-context cluster tier"},
  {"pct":"28.5%","label":"SPIRE local-only (both higher tiers disabled)"},
  {"pct":"27.8%","label":"SPIRE without Illustrating agent"},
  {"pct":"13.8%","label":"Text RAG on cross-tradition queries"}
] />

SPIRE's seven agents map onto the epistemic moves that define humanities argument: Discovering (scoping the question), Annotating (close reading of passages), Comparing (cross-textual analysis), Referring (citation tracing), Sampling (representative selection), Illustrating (generating claims that drive a second retrieval pass), and Representing (synthesis). Each targets something a flat retrieval call can't do in a single step.

The Illustrating agent turns out to be the most consequential single component. Removing it drops evidence recall to 27.8% — below the local-only baseline of 28.5%. The reason is structural: Illustrating generates specific claims about the text, and those claims feed a reflective second retrieval pass. Without it, the system loses its ability to self-correct on what it hasn't yet found.

Retrieval operates at three scales: raw passage chunks, intra-context entity-relation graph communities detected via Leiden clustering, and cross-context semantic clusters built with HDBSCAN. The knowledge graph underlying this is substantial — 209,004 entities and 462,528 relation edges across 936 classical documents. Disabling either the community or cluster tier cuts recall to 32–34%; disabling both drops it to 28.5%, comparable to losing the Illustrating agent entirely.

Cross-tradition queries — papers that draw on both Chinese and Latin sources — expose flat retrieval's structural weakness most sharply. Text RAG drifts toward whichever linguistic tradition dominates the query and collapses to 13.8% evidence recall on cross-tradition papers. SPIRE holds at 36.5%, because the agent layer can explicitly balance across traditions in a way that vector similarity cannot.

---

## The Cost: 14× More Tokens, 3× the Latency

<stat-callout number="14×" text="SPIRE's token usage versus flat Text RAG (505k vs. 36k per paper), with 3× the latency — the deliberate price of evidence grounding" />

SPIRE processes each paper in 4.37 minutes on average, versus 1.39 minutes for Text RAG, running through a mean of 22 agent steps. The token cost is the starker number: roughly 505k tokens per paper against Text RAG's 36k. That's not an implementation inefficiency — it's what multi-scale retrieval with reflection rounds actually costs.

The failure modes that remain are qualitatively different from retrieval errors, and that distinction matters for deployment. When asked about classical Chinese philosophy, SPIRE sometimes grounds its answer in Song-Yuan Neo-Confucian sources rather than pre-Qin classics — the generator's parametric knowledge blends historically distinct Confucian strata in ways the retrieval architecture can't fully correct. On the Latin side, SPIRE occasionally self-translates long quotations rather than surfacing established scholarly translations like the Loeb Classical Library editions, which are accurate, vetted, and citable. Both failures reflect the limits of what the language model knows, not what the retrieval system found.

---

## What to Do About It

The practical implication splits cleanly depending on what you're building.

If you're evaluating any RAG system for humanities or archival use, stop relying on BERTScore and cosine similarity as proxies for quality. The data here is unambiguous: a system that retrieves nothing can match a well-grounded system on surface metrics. You need evidence recall — which requires a ground-truth annotation of what sources the answer should be traceable to. That annotation work is expensive, but it's the only measurement that tells you whether the system is actually doing what humanities scholarship requires.

If you're deploying a retrieval system for classical or archival research, the 14× token cost is the decision point. SPIRE's gains are real and consistent, but 505k tokens per query is a meaningful operational constraint. The cross-tradition case is where the argument for the added cost is strongest: flat retrieval collapses to 13.8% recall on queries that span linguistic traditions, while SPIRE holds at 36.5%. For single-tradition queries, the gap is still large (22.4% versus 44.3%), but the cost-benefit calculation depends on how much provenance matters in your specific context.

The deeper lesson is about what "working" means for humanities AI. A system that produces fluent, plausible-sounding answers about Cicero or the Analects is not the same as a system that can tell you which passage it's drawing on. For scholarship where the citation is the argument, only the second kind is useful.

*Pan, Y., Zhang, J., Wang, J., & Su, Q. (2026). Extending AI for Research to the Humanities: A Multi-Agent Framework for Evidence-Grounded Scholarship. arXiv:2605.30947*