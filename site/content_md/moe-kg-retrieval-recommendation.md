# When to Retrieve Nothing: Adaptive KG Routing Beats Richer Graphs for LLM Recommenders

Knowledge graphs promise to fix a real problem with LLM-based recommenders: the model knows language but not your catalog. The obvious fix is to retrieve relevant graph data and inject it into the prompt. The less obvious finding is that this fix often makes things worse — and the reason tells you something important about how retrieval should work.

A new paper from The Hong Kong Polytechnic University introduces MixRAGRec, a system that routes each recommendation query to one of four retrieval experts, ranging from no retrieval at all to a full connected-graph traversal. The routing is learned, not heuristic, and it's paired with an alignment step that converts whatever the graph returns into natural language before the recommendation model sees it. The result is a system that's simultaneously more accurate and dramatically faster than fixed-retrieval baselines.

The anchoring number: MixRAGRec cuts average retrieval latency to 0.063 seconds — a 45x reduction versus the best-performing fixed-retrieval baseline — while improving recommendation accuracy by up to 20.4%.

---

## The Problem with Always Retrieving the Same Thing

The standard approach to KG-augmented recommendation picks a retrieval strategy and applies it uniformly. Every query gets the same graph structure, whether that's a set of triples, a k-hop subgraph, or something more elaborate. The assumption is that more graph data is better, or at least not worse.

The data says otherwise. On MovieLens-1M with a LLaMA3-8B backbone, naively injecting retrieved KG triples as text — the approach taken by KG-Text and KAPING — produces accuracy scores of 0.234 and 0.232 respectively. Fine-tuned LLM recommenders with no graph data at all score 0.391 (TallRec) and 0.402 (Rec-r1). Raw KG injection doesn't just fail to help; it actively hurts relative to a well-tuned baseline that never touches a knowledge graph.

The problem isn't the graph — it's the mismatch between what the graph returns and what the model can use. A dense set of triples about an item the user has seen before adds noise, not signal. The same dense retrieval for a cold-start user with two interactions in their history might be exactly what's needed. A single retrieval strategy can't serve both cases well.

Zero-shot inference sits at 0.130 accuracy on the same benchmark, which confirms that neither raw model capability nor raw graph data is sufficient on its own. The gap between 0.130 and 0.504 — MixRAGRec's score — is the space where retrieval design actually matters.

---

## Four Experts, One Router: How MixRAGRec Works

MixRAGRec defines four retrieval experts ordered by granularity. Expert 1, DirectGenerator, performs no retrieval — it answers from the model's parametric knowledge alone. Expert 2, TripleRetriever, fetches relevant triples from a vector-indexed triple database. Expert 3, SubgraphRetriever, expands to a k-hop neighborhood around relevant entities. Expert 4, ConnectedGraphRetriever, runs Personalized PageRank over the graph and then extracts a minimum spanning tree via Kruskal's algorithm to return a compact but richly connected subgraph.

A reinforcement-learning router selects one expert per query. The reward has two components: recommendation accuracy on the target item, and a marginal information gain term that penalizes unnecessary retrieval cost. That second term is what keeps the system from defaulting to the most expensive expert — it has to earn the retrieval cost by actually improving the recommendation. When the MIG weight is set to zero and the reward is purely accuracy-based, retrieval time increases and ranking quality drops, which shows the penalty is doing real work.

Once an expert returns its output, a Knowledge Preference Alignment agent takes over. It verbalizes the retrieved structure — triples, subgraph edges, or connected-graph paths — into natural-language knowledge snippets using a template-based step followed by LLM-based refinement. This is the bridge between graph topology and token-space reasoning. The recommendation model never sees raw graph data; it sees prose.

The full system is trained end-to-end using a proximal policy optimization variant the authors call MMAPO, with contrastive learning on hard negatives to sharpen the recommendation agent's item discrimination. Both the LLaMA3-8B and Mistral-7B backbones are fine-tuned with LoRA throughout.

---

## Routing Behavior Reveals What Queries Actually Need

The expert selection distributions are worth examining because they show the system isn't just learning a soft preference — it's making genuinely different choices based on query context.

In standard settings on LFM-1K with Mistral-7B, 30.2% of queries go to Expert 1 (no retrieval), and the load distributes fairly evenly across Experts 2 and 3 at 28.6% and 28.2%. Only 13.0% of queries reach Expert 4, the most expensive option. The system is conservative by default: most queries either don't need graph data or need only lightweight retrieval.

Under cold-start conditions — users with sparse interaction histories — the routing inverts sharply. Expert 4 handles 58.7% of queries and Expert 3 handles 37.9%. Together they account for nearly all cold-start traffic. This makes intuitive sense: when the model has little behavioral signal to work with, relational context from the graph becomes load-bearing. The routing learned this without being told.

The ablation results point to something equally important. Removing the alignment agent — leaving the recommendation model to consume raw graph output — produces the largest single performance drop across all tested variants, and the effect is especially pronounced on LFM-1K. Getting the retrieval granularity right is necessary but not sufficient. The format translation step is doing roughly as much work as the routing itself.

---

## Accuracy Up, Latency Down

The efficiency numbers are stark. K-RagRec, the strongest fixed-retrieval baseline, takes 2.867 seconds for retrieval and 3.776 seconds end-to-end on MovieLens-1M. MixRAGRec takes 0.063 seconds for retrieval and 1.563 seconds end-to-end. The 45x retrieval speedup comes directly from the routing: when 30% of queries skip retrieval entirely and only 13% trigger the expensive connected-graph expert, average latency collapses.

On accuracy, MixRAGRec reaches 0.504 on MovieLens-1M and 0.798 Recall@3 — an 11% and 20.4% relative gain over K-RagRec's 0.454 and 0.659. On LFM-1K the accuracy reaches 0.934. Gains hold across both backbones: under Mistral-7B, the relative accuracy improvement over K-RagRec on MovieLens-1M is 18.3%. Across all three datasets and both models, relative improvements range from 5.3% to 20.4%.

Cold-start performance follows the same pattern. MixRAGRec scores 0.501 accuracy in the cold-start setting versus K-RagRec's 0.392 — a gap that's larger than in the standard setting, which is consistent with the routing analysis: the system is doing more work for cold-start users, and that work is paying off.

---

## What to Do About It

If you're building or evaluating KG-augmented LLM recommenders, the practical implication is that retrieval strategy selection deserves as much attention as graph construction. The experiments here show that a well-constructed graph with the wrong retrieval strategy underperforms a fine-tuned model with no graph at all. The graph is only as useful as the retrieval decision in front of it.

The alignment step is the other underappreciated lever. Teams that have tried injecting KG triples directly into prompts and seen degraded performance may have diagnosed the wrong problem — it's not necessarily that the graph data is wrong, it's that the model isn't equipped to reason over raw graph syntax. Converting structured output to natural language before the recommendation model sees it is worth treating as a first-class component, not an afterthought.

The routing behavior under cold-start conditions also suggests a practical heuristic: if you can identify low-history users at query time, routing them to richer retrieval by default — even without a learned router — would likely outperform a uniform strategy. The learned router confirms what the heuristic would predict, but you don't need the full system to act on the insight.

*Wang, S., Liu, C., Ding, Y., Lin, S., Ng, S., Xin, X., & Fan, W. (2026). Mixture-of-Experts Knowledge Graph Retrieval-Augmented Generation for Multi-Agent LLM-based Recommendation. arXiv:2605.28175*