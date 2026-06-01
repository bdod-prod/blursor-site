# Frontier LLMs Hallucinate Up to 38% of Scientific Citations

## A Self-Evolving Retrieval Agent Beats Them All at 1% of the Cost

When researchers or AI systems cite scientific papers, the assumption is that those papers exist. That assumption turns out to be wrong surprisingly often. A new study from Shanghai Jiao Tong University tested six frontier LLMs on 244 literature retrieval tasks and found hallucination rates ranging from 12% to 38% — meaning that for some models, more than one in three returned citations were fabricated or misreported.

The same paper introduces PaSaMaster, an agentic retrieval system that achieves zero hallucination across all tested tasks while outperforming the best generative baseline by 30% on retrieval quality. The cost per query: $0.05, versus $6.06 for GPT-5.2.

The anchoring number is 37.79% — the hallucination rate for MiniMax-M2.7, the worst-performing generative model tested. Even GPT-5.2, the best of the six, still fabricates roughly one in eight citations.

---

## The Hallucination Problem in Literature Retrieval

Generative LLMs have a structural problem with scientific citation: they produce text that looks like a citation, and sometimes it is one, but often it isn't. The model has learned the *form* of a citation — author names, a plausible title, a journal, a year — without being anchored to any verified record. When asked to retrieve literature, it generates rather than retrieves.

The six models tested here, all equipped with search and web-visit tools, still couldn't escape this. MiniMax-M2.7 hallucinated 37.79% of citations. Kimi-K2.5 came in at 35.67%. Gemini-3.1 at 32.41%. GLM-5 at 29.07%. DeepSeek-v3.2 at 20.57%. GPT-5.2, the best of the group, at 11.80%. These aren't obscure models — they're the current frontier, tested on a task that research workflows depend on.

The obvious alternative, traditional keyword search via Google Scholar, avoids hallucination by construction — it can only return papers that exist in its index. But it achieves an F1-score of 1.39 on the same benchmark, making it nearly useless for comprehensive literature discovery. Avoiding fabrication while also finding the right papers turns out to be the hard problem.

---

## How PaSaMaster Achieves Zero Hallucination Without Sacrificing Quality

PaSaMaster sidesteps the hallucination problem by reframing what retrieval means. Instead of asking a language model to generate citations, it asks the model to rank papers from a verified corpus. Any paper it returns is guaranteed to exist — because it was pulled from an indexed, verified repository in the first place. The model never has the opportunity to invent one.

The architecture separates two jobs that generative systems conflate. A frontier LLM — the Navigator — handles intent understanding: parsing what the researcher actually needs, identifying coverage gaps as results come in, and refining search directions. The heavy lifting of retrieval and scoring is delegated to lightweight Librarian agents, which keeps costs low without sacrificing the reasoning quality that intent understanding requires. Three complementary retrieval channels feed the system: semantic direct retrieval, citation network expansion, and web-to-repository verification, each catching papers the others might miss.

What makes it self-evolving is the iterative loop. After each retrieval pass, the system analyzes the ranked evidence to identify what's missing, then generates new search intents to fill those gaps. This is closer to how a thorough human researcher works — not a single query, but a sequence of increasingly targeted ones — than to how a standard RAG pipeline operates.

---

## Performance vs. Cost: The 30% Gain at 1% of the Price

PaSaMaster's F1-score@20 on PaSaMaster-Bench is 21.69. GPT-5.2, the strongest generative baseline, scores 16.69 — a 30% gap. Google Scholar Labs, the best fixed-pipeline agentic system, scores 18.87. GLM-5, the strongest generative LLM overall, scores 18.18. PaSaMaster improves over those two by 14.9% and 19.3% respectively. Across all main quality metrics — NDCG of 37.93, Recall of 31.84, Precision of 22.19 — it leads the field.

The cost comparison is where the practical case becomes hard to argue with. GPT-5.2 costs $6.06 per query. PaSaMaster costs $0.05. That's not a marginal efficiency gain — it's a different order of magnitude, driven by the planning-retrieval separation that keeps the expensive frontier model out of the retrieval loop entirely.

For practitioners, the usual tradeoff between quality and cost doesn't apply here. PaSaMaster doesn't ask you to accept worse results to save money, or to spend more to get better ones. It dominates on both axes simultaneously — which is the kind of result that tends to change what people actually build.

---

## Benchmark Design and What It Actually Measures

The evaluation uses PaSaMaster-Bench, a new benchmark of 244 expert-curated literature discovery tasks spanning 38 scientific disciplines — basic sciences, engineering, medicine, AI, and interdisciplinary fields. Each task includes a query, constraints, a target paper list, and an evaluation checklist annotated by human domain experts. The metrics cover Recall@20, Precision@20, F1-score@20, NDCG@20, hallucination rate, and token cost.

One caveat worth noting: the ground-truth target sets were constructed partly using PaSaMaster itself, which could inflate its recall scores relative to baselines that use different retrieval channels. If the "correct" answer set was shaped by what PaSaMaster finds, then PaSaMaster has a structural advantage in recall that the numbers may not fully account for.

The benchmark also focuses on bounded-recall tasks — searches where the target paper set is well-defined enough for expert annotation. Open-ended exploratory searches, very recent literature, and niche subfields may not be well-represented. PaSaMaster's zero-hallucination guarantee also comes with a corresponding limitation: it can't return papers that aren't in its indexed corpus, so its recall ceiling depends on how comprehensive that corpus is. The paper doesn't report the corpus size, which limits reproducibility.

---

## What This Means for Research Workflows

If you're building any workflow that relies on LLMs to surface scientific literature — literature reviews, evidence synthesis, citation checking, research assistants — the hallucination numbers here should change your architecture. Even the best generative model tested fabricates roughly one in eight citations. At that rate, a 20-paper bibliography could contain two or three papers that don't exist. For research workflows, that's not a tolerable error rate.

The practical implication isn't that generative LLMs are useless for research tasks — they're clearly valuable for reasoning, synthesis, and planning. But citation retrieval specifically needs to be grounded in a verified corpus. PaSaMaster's approach — use the LLM for intent and planning, delegate retrieval to systems that can only return verified records — is a pattern worth adopting. The cost argument makes it easier: at $0.05 per query versus $6.06, the retrieval-over-verified-corpus approach isn't a compromise. It's the better choice on every dimension that matters.

*Du, Y., Jin, T., Kang, J., Pang, X., Chai, J., Miao, T., Liu, F., Wang, W., Yao, S., Zhang, Y., & Chen, S. (2026). Towards Self-Evolving Agentic Literature Retrieval. arXiv:2605.14306*