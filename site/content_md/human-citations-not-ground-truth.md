# Human Citation Lists Are Not a Ground Truth for Literature Search

## Why benchmarking against what humans cite understates AI retrieval — and hides a social bias problem

Most literature search benchmarks work on a simple assumption: what a human author cited is what a good retrieval system should find. That assumption turns out to be wrong in a measurable way. A new paper from Mila tests it directly, across 250 recent CS papers, and finds that human citation lists are systematically less topically relevant than what AI re-rankers return — and that they carry a detectable social bias toward close collaborators.

The implication isn't that human citations are useless as a signal. It's that treating them as ground truth penalizes AI systems for surfacing papers that are *more* relevant, and obscures the fact that roughly half of what humans cite serves functions other than topical relevance.

The anchoring number: 48.6% of human citations receive the lowest relevance score from an LLM judge — compared to 12–14% for the strongest AI re-rankers at the same list length.

---

## The Ground Truth Problem

Standard literature search evaluation works by asking: did the system find what the author cited? That framing treats the human reference list as the correct answer. But human citations do a lot of things that have nothing to do with topical relevance — they credit software libraries, acknowledge methodological lineage, fulfill social obligations, and nod to foundational work that everyone in a field cites regardless of direct relevance.

The paper tests this by running an LLM judge (GPT-OSS-120B, scoring on a 0–100 rubric) over 9,204 human citation pairs drawn from 250 June 2025 arXiv CS papers. The benchmark, RollingEval-Jun25, was built specifically to post-date the training cutoffs of all evaluated models, which reduces the risk that any system is simply recalling memorized associations.

What the judge finds is striking. Nearly half of human references score at the lowest relevance tier. The human reference list as a whole sits at 47.3 on semantic relevance at k=10 — a number that will matter more once you see what AI re-rankers score at the same position.

> **48.6%** of human citations scored at the lowest relevance tier — compared to 12–14% for the strongest AI re-rankers at matched list length

This doesn't mean those citations are wrong to include. Software attribution and foundational acknowledgment are legitimate citation functions. It does mean that a benchmark built on human citations will systematically undercount AI retrieval quality, because the AI systems are being penalized for finding topically relevant papers that the human author didn't cite.

---

## Deep Research vs. Vanilla API Search

Before getting to the relevance comparison, the paper establishes a large gap in raw recall between a Deep Research pipeline and standard API search. Vanilla arXiv API search tops out near 15% recall at k=1000 and never exceeds it. Every Deep Research variant surpasses 80% recall at the same cutoff — an order-of-magnitude improvement.

The pipeline runs in two phases. First, an LLM constructs keyword queries from the full text of the query paper and submits them to arXiv, OpenAlex, and Semantic Scholar. Second, it expands breadth-first through the citation graph to depth 3, pulling in papers that cite or are cited by the initial results. That graph expansion is where most of the recall gain comes from.

> **Deep Research variants:** >80% recall at k=1000 · **Vanilla API search:** <15% recall at any k

The best single re-ranker, Qwen3-Embedding-8B, achieves 51.9% recall at k=1000 and 16.8 precision at k=20. Those numbers look modest — but the denominator is the human reference list, which, as established above, contains a large fraction of non-topical citations. Recall against a noisy ground truth is a noisy metric.

---

## AI Re-rankers Outperform Human Relevance

When the LLM judge scores AI re-ranker outputs at matched list length, the gap is large. Only 51% of human citations score at moderate relevance or higher (≥60 on the 0–100 scale). The strongest AI re-rankers reach 86–88%: Qwen3 embeddings at 86.0%, the Debate+Qwen3 ensemble at 87.8%.

Across the full k=1 to k=1000 window, AI re-rankers start at semantic relevance scores of 73–75 at k=1 and stay above the human curve throughout. Human references score 47.3 at k=10. The Debate+Qwen3 ensemble — which averages LLM debate scores with embedding similarity — scores 67.9 at k=10, the highest of any method at that position.

> **Human citations rated moderately relevant or higher:** 51% · **Strongest AI re-rankers at matched list length:** 86–88%

The ensemble also leads on diversity-aware α-nDCG at larger k, meaning it's not just finding relevant papers — it's finding a more topically varied set of them. The Debate-only variant (without Qwen3) achieves the strongest α-nDCG at k=100 and k=1000 (79.7 and 89.1 respectively), suggesting that prompt-based scoring pushes toward broader coverage.

This is the core finding that reframes the evaluation problem. If AI re-rankers are consistently returning more topically relevant results than human authors cite, then recall against human citations isn't measuring retrieval quality — it's measuring overlap with a reference set that includes substantial noise.

---

## Social Bias in Human Citing

The paper also runs a co-authorship graph analysis, matching each cited paper back to its authors and computing the shortest-path distance between the citing and cited author sets in OpenAlex. The results are quantitatively clear.

Humans cite direct collaborators (d=1) at a rate of 5.13%. The strongest AI re-rankers cite at 1.9–2.1% — making humans 2.5× more likely to cite someone they've worked with directly. The gap extends to two hops: the cumulative within-two-hop rate is 12.2% for humans versus 6.9–7.4% for AI methods.

> **2.5×** more likely: humans cite direct collaborators at 5.13% vs. 1.9–2.1% for the strongest AI re-rankers, with no corresponding boost in topical relevance

The critical detail is what happens when you look at relevance scores by co-authorship distance. For human citations, semantic relevance is essentially flat across distance classes: 56.1 at d=1, declining to 50.9 at d=5. Network proximity doesn't predict topical relevance. The social graph and the intellectual graph are largely decoupled — which means the elevated co-authorship citation rate reflects social dynamics, not a genuine relevance signal.

AI re-rankers, which have no access to the social graph, don't exhibit this pattern. They surface topically relevant work regardless of whether the authors have collaborated.

---

## What to Do About It

For practitioners building or benchmarking literature search systems, the practical implication is a dual-metric approach. Recall against human citations still captures something real: foundational work, software attribution, and methodological lineage that an LLM judge won't credit. Don't discard it. But it shouldn't be the only metric, because it systematically undervalues topical precision.

Pair it with a semantic relevance signal — an LLM judge scoring retrieved papers against the query — to get a fuller picture. The two metrics measure different things, and both matter depending on what the system is supposed to do.

The co-authorship finding has a direct implication for AI-assisted writing tools. Because these systems lack the social graph that shapes human citation decisions, they may surface more topically diverse references by default. That's a feature, not a bug, for researchers trying to avoid citation insularity.

One caution worth stating plainly: the semantic relevance rubric used here is not appropriate for gating citations during peer review or automating rejection decisions. A single LLM judge, however well-calibrated, isn't a defensible standard for that purpose. The tool is useful for retrieval evaluation; it shouldn't be repurposed as a citation arbiter.

For teams maintaining evaluation benchmarks, the RollingEval approach — using papers that post-date model training cutoffs — is worth adopting. The contamination-resistance guarantee weakens as models update, so the snapshot needs periodic refreshes, but the principle of using genuinely held-out papers is sound.

*Sahu, G., Charlin, L., & Pal, C. (2026). Rethinking Literature Search Evaluation: Deep Research Helps, and Human Citation Lists Are Not a Ground Truth. arXiv:2605.29234*