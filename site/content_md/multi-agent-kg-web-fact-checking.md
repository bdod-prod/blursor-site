# Knowledge-Graph Fact-Checking Beats GPT-4o Without Fine-Tuning

Fact-checking research has split into two camps. One builds specialized systems trained on labeled datasets, optimizing for a single benchmark. The other prompts frontier LLMs directly, relying on parametric knowledge without retrieval. Both approaches have obvious failure modes — the first doesn't generalize, the second doesn't verify. A paper from the University of Melbourne, published on arXiv in February 2026, takes a third path: an agentic system that combines structured knowledge graph traversal with open-web retrieval, trained on no task-specific labels, and evaluated across seven datasets spanning Wikipedia claims, web-sourced claims, and article summaries.

The system — WKGFC — frames fact-checking as a Partially Observable Markov Decision Process. An agent chooses between four actions at each step: initialize KG retrieval, expand the KG, run a web search, or issue a verdict. The KG retrieval uses beam search over Wikidata and DBpedia, expanding entity-relation paths hop by hop, with LLM relevance scoring pruning each step. Web retrieval acts as a coverage supplement — noisy passages get converted into structured knowledge triplets aligned with the KG schema before being used as evidence. A prompt optimization layer, built on TextGrad, trains the agent's policy on 100 FEVER and HOVER trajectories, with self-reflection storing decision critiques in an experience buffer.

The evaluation covers 6,719 samples. No task-specific fine-tuning. The anchoring result: 74.3% average balanced accuracy across all seven datasets.

---

## The Headline Number: +5.4 Points Over the Best Baseline

The strongest prior specialized system, FIRE, averages 68.9% balanced accuracy across the same evaluation protocol. WKGFC reaches 74.3% — a 5.4-point absolute margin without any task-specific training. The gap over frontier LLMs is larger: GPT-4o scores 64.4% and Claude 3.5 Sonnet 66.5% on the same benchmark, both operating without retrieval augmentation. That's roughly a 10-point gap against models that cost considerably more to run.

The per-dataset numbers are worth examining individually. On FEVER, WKGFC reaches 91.9%, compared to FIRE's 90.6% — a narrow margin on a well-studied benchmark. The more informative result is HOVER, the multi-hop dataset: WKGFC scores 72.8% against FIRE's 67.0%, a larger gap that suggests the agentic retrieval strategy handles chained reasoning better than static pipelines. On web-sourced claims, LIAR-New reaches 81.3% and AveriTeC 73.2%, both above FIRE's 72.8% on each.

The gold-evidence datasets — SummEval, AFact-CNN, PubHealth — present a different comparison. WKGFC averages 67.0% on these, roughly on par with GraphRAG (67.6%) and GraphCheck (66.4%). The caveat is direct: those baselines use gold-provided evidence annotations unavailable in open settings. WKGFC achieves comparable results using only retrieved evidence, which is a different and harder task — but the comparison isn't fully equivalent.

---

## What the Ablation Actually Reveals: Web Retrieval Carries More Weight Than the KG

The ablation isolates a finding that complicates the paper's framing. KG-only retrieval scores 72.3% on FEVER and 63.4% on AveriTeC. Web retrieval alone scores 79.6% on FEVER and 66.2% on HOVER. On both datasets where direct comparison is available, web retrieval alone outperforms KG retrieval alone. The knowledge graph, in isolation, is the weaker component.

This doesn't undermine the system's performance — the full system's gains come from complementarity, not from the KG being independently strong. The KG provides verifiable entity-relation chains with traceable provenance; web retrieval fills coverage gaps the KG can't reach. The agent learns when to switch between them. That coordination is where the performance comes from, not from either source individually.

The implication for system design is that the KG's contribution is structural grounding rather than raw coverage. It constrains the evidence space and provides a schema for integrating web-sourced information. Removing it degrades the system even though web retrieval alone is nominally stronger — because without the KG schema, web passages can't be integrated as cleanly into the verification chain.

---

## Error Taxonomy: Three Failure Modes, Each Dataset-Specific

The error analysis across failed predictions reveals a pattern that's more useful than aggregate accuracy numbers: each failure mode dominates in a different setting, which means the system's weaknesses are predictable from the claim type.

On FEVER — single-hop, Wikipedia-sourced — 64.8% of failures trace to over-confidence: the agent issues a verdict before gathering sufficient evidence. The task is simple enough that the agent converges quickly, but sometimes too quickly. On HOVER — multi-hop — 74.1% of failures come from exceeding the maximum step budget: the agent keeps searching without converging, suggesting the stopping policy degrades under complex reasoning chains. These two failure modes are essentially opposites, and they cluster by task complexity.

The third failure mode is the most structurally significant. On AFact-CNN, 98.3% of failures trace to insufficient KG coverage. On LIAR-New, the figure is 83.3%. These are web-sourced and domain-specific datasets where Wikidata and DBpedia simply don't have the relevant entities or relations. The agent can't compensate with web retrieval alone when the KG schema provides no anchor for integrating what it finds. This is the ceiling for the approach — not a tuning problem, but a coverage problem inherent to the knowledge bases the system relies on.

The prompt optimization was trained exclusively on FEVER and HOVER trajectories. That's a narrow distribution. The optimized stopping and conflict-resolution behavior may not transfer cleanly to datasets where the failure modes are different — a caveat the paper acknowledges but doesn't fully resolve.

---

## Before Deploying This in Production

The practical implication of this paper isn't that hybrid KG-plus-web retrieval is the right architecture for all fact-checking applications. It's that the failure mode distribution tells you where the approach will and won't work — and that distribution is largely determined by whether your claims are Wikipedia-adjacent.

For claims about named entities, historical facts, and relationships well-represented in Wikidata and DBpedia, the system performs well and the KG provides meaningful structural grounding. For web-sourced claims, domain-specific assertions, or anything time-sensitive enough to outpace the KG's update cycle, the coverage ceiling becomes the binding constraint. The 98.3% insufficient-KG failure rate on AFact-CNN isn't an edge case — it's a preview of what happens when the system is applied outside its knowledge base's coverage area, which is most of the real world.

The over-confidence failure mode on single-hop tasks is addressable through stopping policy tuning. The exceeding-steps failure on multi-hop tasks is addressable through better convergence criteria. The KG coverage failure is not addressable within the current architecture — it requires either expanding the knowledge bases or accepting that web retrieval alone will carry the load in those domains, which means losing the structural grounding that makes the hybrid approach work. Any deployment decision should start with an honest assessment of which failure mode will dominate for the target claim distribution.

---

*Gong, S., Sinnott, R., Qi, J., Paris, C., Nakov, P., & Xie, Z. (2026). Multi-Sourced, Multi-Agent Evidence Retrieval for Fact-Checking. arXiv:2603.00267*