# GraphRAG's Community Detection Problem Has a Formal Proof Now

The original GraphRAG pipeline, introduced by Microsoft Research, uses Leiden community detection to partition a knowledge graph into clusters, summarize each cluster, and answer global sensemaking queries from those summaries. The method works well enough on dense social graphs, where Leiden was designed. Knowledge graphs are not dense social graphs.

A paper from the University at Buffalo, published on arXiv in March 2026, does two things prior work hasn't done together: it formally proves why Leiden is structurally mismatched with knowledge graphs, and it benchmarks a deterministic replacement that wins 70–75% of head-to-head quality comparisons while cutting token usage by up to 40%.

The anchoring number: 55–60% of nodes in the experimental knowledge graphs have degree 1. That single structural fact is what makes the rest of the argument follow.

---

## Why Leiden Community Detection Is the Wrong Tool for Knowledge Graphs

Leiden optimizes modularity — a measure of how much edge density inside communities exceeds what random chance would produce. On sparse graphs, where average degree is constant and most nodes have low degree, this optimization landscape becomes pathological. The paper's Theorem 1 formalizes the problem: for a graph with n_low low-degree nodes, the number of near-optimal modularity partitions is at least 2^(n_low/3). When 55–60% of nodes have degree 1, that lower bound grows exponentially with graph size. Leiden doesn't converge to a unique answer because there is no unique answer — there are exponentially many partitions that look equally good to the objective function.

The practical consequence is non-reproducibility by construction. Run Leiden on the same knowledge graph twice and get different communities, different summaries, different answers. This isn't a bug in any particular implementation. It's a theorem.

Knowledge graphs compound the problem in a second way. Edges in a knowledge graph connect entities through distinct relation types — born_in, capital_of, acquired_by. This produces bipartite-like local structure with global clustering coefficients well below 0.05. The graph is triangle-poor. Triangle-based alternatives like k-truss are ruled out for the same structural reason: even the 3-truss discards the vast majority of the graph when triangles are rare. Degree-based decomposition is what the structure calls for.

The experimental datasets confirm the characterization. Average degrees range from 2.88 to 4.42 across the three corpora. Nearly 45% of clusters produced by the k-core hierarchy have size 2 — a direct consequence of how many low-degree nodes exist and how they connect.

---

## The k-Core Replacement: Deterministic, Linear-Time, Density-Aware

k-core decomposition assigns every node a coreness value by recursively removing nodes with degree below k, for increasing k. The algorithm runs in O(|V|+|E|) time. There is no optimization landscape and no stochasticity — the same graph always produces the same hierarchy.

The paper builds on this with RkH (Residual-aware k-core Hierarchy), which iteratively separates dense cores from sparse residuals and applies size bounds to each level. Oversized components are broken using SPLIT — greedy splitting from high-degree seed nodes — or SPLIT-2HOP, which uses anchor-based grouping over 2-hop neighborhoods. The ~45% of resulting clusters with size 2 are addressed by two merging heuristics: M2hC (Merge 2-hop Clusters) and MRC (Merge Residual Clusters), which extend M2hC to also handle small residual connected components.

The leaf-level (LF) variants — which use the finest-grained cluster level rather than rolling up to L1 summaries — consistently outperform their L1 counterparts by 5–10 percentage points. Granularity preservation matters more than hierarchical compression for sensemaking tasks. The intuition is straightforward: L1 summaries aggregate across clusters, losing the specific entity relationships that distinguish one community from another. For queries that require precise attribution, that loss is not recovered downstream.

MRC, the most aggressive merging configuration, achieves only 55–60% source token coverage while still winning the majority of head-to-head comparisons. The original GraphRAG pipeline appears to over-index on coverage at the expense of density.

---

## Head-to-Head Performance Against the Original GraphRAG Configurations

The evaluation covers three datasets — a podcast corpus (~1M tokens), a news corpus (~1.4M tokens), and S&P 500 semiconductor earnings transcripts (232M tokens total) — with 125 sensemaking questions evaluated by five LLM judges. Comparisons are made against Edge et al.'s C2 and C3 configurations, the two standard GraphRAG baselines.

Across all three datasets and all configurations, k-core heuristics beat Leiden C2 and C3 in approximately 70–75% of comparisons under GPT-3.5-turbo evaluation on post-cutoff data. M2hC LF is the only configuration that is statistically significant (p<0.05, Wilcoxon signed-rank with Holm-Bonferroni correction) against both C2 and C3 across all three datasets — with p<0.001 in every case. It never records a negative net win rate across any dataset, condition, or metric.

Gains are largest on the semiconductor earnings dataset, where MRC LF reaches 67–69% win rates against C3 on diversity. That corpus has the densest and most coherent domain structure — earnings transcripts from a single industry sector — which rewards density-aware clustering most directly. The podcast dataset, with only 13 post-cutoff documents under GPT-4o-mini evaluation, produces sparse graphs where the heuristics show minimal improvement, a practical floor worth noting.

Under GPT-4o-mini and GPT-5-mini evaluation, margins narrow to 45–55%. Stronger models rely more on parametric knowledge and are less sensitive to retrieval quality differences — the discriminative power of head-to-head evaluation decreases when the judge can answer from memory. The GPT-3.5-turbo results, where the model is more dependent on what it retrieves, are the more informative signal for assessing retrieval architecture choices.

---

## Token Efficiency: RRTC Cuts Costs Without Proportional Quality Loss

RRTC (Round-Robin Token-Constrained Selection) samples edges by combined endpoint degree, traversing from higher to lower k-shells in round-robin fashion. At an 80% edge budget, it reduces token usage by roughly 40% relative to Leiden C2/C3 while maintaining comprehensiveness win rates of 50–56%.

The tradeoff is not linear. At a 60% edge budget, comprehensiveness on the podcast dataset drops below 50%, indicating a practical floor — aggressive pruning eventually degrades coverage on smaller, sparser corpora. The 80% budget appears to be the operating point where the density-aware sampling removes genuinely redundant edges without cutting into coverage.

The mechanism behind the efficiency gain is structural. By traversing from higher to lower k-shells, RRTC preferentially retains edges connecting high-coreness nodes — the entities that appear in the most relationships and carry the most contextual weight. Low-coreness peripheral nodes, which in a knowledge graph are often single-mention entities with one relation, get pruned first. This is the same structural logic that makes k-core decomposition outperform Leiden in the first place: density is a better proxy for informational centrality than modularity on sparse graphs.

---

## Before the Next GraphRAG Deployment

The paper's practical implication is not that GraphRAG is broken — it's that one component of the pipeline was designed for a different graph type and can be swapped without architectural changes.

The replacement decision is straightforward for any deployment on sparse knowledge graphs. M2hC LF is the configuration to start with: it is the only one with p<0.001 significance against both baselines across all three datasets, it never goes negative, and it runs deterministically. MRC LF is the right choice when token budget is the binding constraint — it achieves 55–60% source token coverage while still winning the majority of comparisons, and RRTC at 80% edge budget can cut costs another 40% from there.

The one caveat worth carrying: if the evaluation model is GPT-4o-mini or stronger, the quality margins narrow substantially. The gains are largest where retrieval quality actually determines answer quality — which is precisely the deployment condition where GraphRAG is being used instead of a parametric-only approach. That's not a reason to avoid the swap. It's a reason to be precise about what the evaluation is measuring.

*Hossain, J., & Sarıyüce, A. E. (2026). Core-based Hierarchies for Efficient GraphRAG. arXiv:2603.05207*