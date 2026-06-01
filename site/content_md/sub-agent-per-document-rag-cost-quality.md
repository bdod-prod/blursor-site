# One Agent Per Document: 85% of the Quality at 38% of the Cost

Retrieval-augmented generation has a coverage problem. Standard top-k retrieval pulls the most semantically similar chunks from a corpus and hands them to a single model. When the answer requires synthesizing evidence scattered across a dozen documents — each running tens of thousands of tokens — that approach misses facts not because retrieval is broken but because the architecture was never designed for that regime. The standard fix, agentic RAG, adds iterative retrieval loops: the model searches, reads, decides whether it has enough, searches again. In principle, this should improve coverage. In practice, as this paper shows, it mostly burns tokens.

The paper from TOBB University of Economics and Technology introduces SPD-RAG — Sub-agent Per Document Retrieval-Augmented Generation — which takes a different structural bet. Instead of one agent iterating over a shared corpus, a coordinator decomposes the query into sub-tasks and dispatches one dedicated Gemini 2.5 Flash agent per document, in parallel. Each agent runs its own retrieval loop over a per-document vector index. A synthesis layer then merges the results. The architecture is evaluated on 102 instances from the Loong benchmark, a long-document QA dataset where each test case averages 11 documents totaling 200k–250k tokens.

The anchoring number: the full-context baseline — stuffing all documents into a 1M-token context window — scores 68.0 on GPT-5-judged evaluation and costs $0.273 per query. Everything else in the paper is measured against that ceiling.

---

## The Setup: When Your Context Window Is the Bottleneck

Loong benchmark instances are designed to stress exactly the scenario where retrieval architectures break down. With an average of 11 documents per query and context lengths reaching 250k tokens, the task requires gathering and synthesizing evidence that no single retrieval call is likely to surface completely. Standard top-k retrieval over a flattened corpus will find the most relevant chunks — but "most relevant" is a local judgment, and the facts needed for a complete answer may be distributed across documents that each look only moderately relevant in isolation.

SPD-RAG's response is architectural rather than parametric. A coordinator agent receives the query and generates a structured decomposition: a list of per-document sub-tasks and a synthesis directive. One Gemini 2.5 Flash agent is then assigned to each document, running up to five retrieval iterations over a per-document Qdrant vector index — dense retrieval with Cohere embed-v4.0 at top-15, reranked to top-5 before the agent reads. All document agents run in parallel via LangGraph's fan-out API. The synthesis layer collects their outputs and merges them, using agglomerative clustering on document embeddings to order the merge when summaries are large — though in these experiments, Gemini 2.5 Pro's 1M-token window absorbed all sub-agent summaries in a single pass, so the recursive path was never triggered.

The comparison set is four systems: SPD-RAG, a full-context baseline (all documents concatenated into the context window), Normal RAG (standard top-k over the full corpus), and Agentic RAG (a single ReAct-style agent with iterative retrieval, up to 10 iterations). All systems use Gemini 2.5 Pro as the primary model except the document-level sub-agents in SPD-RAG, which use Gemini 2.5 Flash for cost efficiency.

---

## The Core Trade-Off: 85% Quality, 38% Cost

SPD-RAG scores 58.1 versus the full-context baseline's 68.0 — a 9.9-point gap that represents the residual cost of not seeing every token simultaneously. At $0.103 per query versus $0.273, the cost reduction is 62%. The ratio works out to 85.4% of full-context quality at 37.9% of full-context cost — a 2.25× improvement in score-per-dollar.

The Perfect Rate metric — the share of queries answered completely correctly, receiving a score of 100 — tells a more nuanced story. SPD-RAG achieves 18.6% Perfect Rate versus the full-context baseline's 13.7%. On well-scoped queries where the evidence is cleanly distributed across documents, the parallel per-document architecture occasionally outperforms brute-force context stuffing. The full-context model sees everything but must attend to it all simultaneously; SPD-RAG's sub-agents each focus on a single document with a targeted sub-task. For some queries, focus wins.

The 9.9-point gap is real and shouldn't be minimized. It reflects cases where cross-document reasoning requires seeing relationships that only emerge when all documents are present at once — connections the synthesis layer can partially reconstruct from sub-agent summaries but not always fully recover. Whether that gap is acceptable depends on query volume and budget. At $0.273 per query, the full-context approach costs 2.65× more per query. At scale, that arithmetic is hard to ignore.

---

## The Agentic RAG Trap: More Tokens, No Gain

Agentic RAG consumes 85,290 tokens per query versus Normal RAG's 27,430 — a 3× increase — yet scores 32.8 versus Normal RAG's 33.0. The difference is within noise. Cost is $0.098 versus $0.080. Agentic RAG is Pareto-dominated: it costs more than Normal RAG on both tokens and dollars while delivering no quality improvement.

The mechanism is straightforward once stated. An iterative single agent searching a shared corpus has no structural reason to broaden its reach across documents. It retrieves, reads, decides it needs more, and retrieves again — but from the same pool, guided by the same query, without any assignment that forces it to cover documents it hasn't yet examined. The agent can iterate ten times and still have never looked at document seven. Per-document specialization solves this by construction: each sub-agent is assigned a document and cannot skip it.

This finding has implications beyond this specific benchmark. Agentic RAG is frequently presented as an upgrade over standard RAG for complex queries. The upgrade is real when the bottleneck is retrieval precision — when the agent needs to refine its query to find the right chunks. When the bottleneck is coverage — when the answer requires evidence from many documents — iterative single-agent retrieval doesn't address the structural problem. The agent keeps searching without a reason to look somewhere new.

---

## Where the Gap Is Largest: Academic Papers and Clustering Tasks

The performance differences are not uniform across task types and domains. Clustering tasks — the largest category at 49 of 102 instances — show the starkest gap: SPD-RAG scores 57.2 versus Normal RAG's 15.4, a +40.5-point margin. Clustering tasks require gathering evidence from many documents simultaneously to group or categorize entities. This is precisely the regime where per-document parallelism provides the most structural advantage — every document gets examined, and the synthesis layer assembles the full picture.

On academic paper instances, both Normal RAG and Agentic RAG achieve 0% Perfect Rate, with Avg Scores of 15.2 and 16.8 respectively. SPD-RAG recovers to 60.0 Avg Score on this domain — though its own Perfect Rate on academic papers remains 7.5%, compared to 30.0% for the full-context baseline. Academic papers contain dense technical content where the coordinator's sub-task generation may under-specify queries, leaving sub-agents without enough direction to extract the most relevant facts. The architecture helps substantially but doesn't close the domain gap.

Comparison tasks are the exception where the gap nearly disappears. SPD-RAG scores 42.2 versus the full-context baseline's 42.7 on the 15 comparison instances. Focused two-document comparisons are well within reach of targeted per-document retrieval — each sub-agent handles one document, the synthesis layer compares the outputs, and the task structure maps cleanly onto the architecture. Chain of Reasoning tasks show a +26.2-point gap over Agentic RAG (44.1 vs. 17.9), driven by the same coverage logic as clustering: the reasoning chain requires facts from multiple documents that iterative single-agent retrieval fails to assemble.

---

## What Remains Unproven

The recursive synthesis path — the architecture's answer to cases where sub-agent summaries exceed the synthesis model's context window — was never activated in these experiments. Gemini 2.5 Pro's 1M-token window absorbed all summaries in a single pass. The scalability claim, that SPD-RAG can handle document sets too large for any single context window, remains empirically untested. The Loong instances top out at roughly 250k tokens, only about 25% of the 1M-token context window, which limits the pressure on the full-context baseline and may inflate SPD-RAG's relative standing at larger scales.

The evaluation covers two domains — academic papers and financial reports. Both have relatively predictable document structure. Legal corpora, medical literature, and enterprise document sets with denser cross-document dependencies may shift the cost-quality curve in either direction. The coordinator's sub-task generation is also a potential failure point: if the decomposition under-specifies what a sub-agent should look for in a technically dense document, the sub-agent's retrieval loop starts from a weak prior and the synthesis layer has less to work with.

Latency is a practical consideration the paper documents but doesn't resolve. SPD-RAG averages 54.8 seconds per query versus 40.6–45.6 seconds for the baselines — a modest overhead driven by the minimum three sequential LLM calls the architecture requires. For applications where response time matters, the parallel fan-out helps but doesn't eliminate the coordination overhead.

---

## Before the Next Architecture Decision

The paper's practical implication is a diagnostic question before a design choice: what is the actual bottleneck in your multi-document retrieval task?

If the bottleneck is retrieval precision — finding the right chunks within a small number of documents — standard RAG with better reranking is likely sufficient. If the bottleneck is coverage — needing facts from many documents where no single retrieval call will surface them all — iterative single-agent RAG adds cost without solving the problem. The 3× token overhead for essentially zero quality gain is a concrete data point against defaulting to agentic RAG as the "more capable" option.

Per-document specialization addresses coverage by construction. The cost is a 9.9-point quality gap versus full-context and a synthesis layer that must reconstruct cross-document relationships from summaries rather than raw text. Whether that trade-off is acceptable depends on query volume, budget, and how often the queries require the kind of holistic cross-document reasoning that only full-context can provide. The 18.6% Perfect Rate — higher than the full-context baseline's 13.7% — suggests that for a meaningful share of queries, the architecture's focused parallelism is actually the better approach.

The recursive synthesis path, if it ever gets stress-tested at truly long contexts, will determine whether the architecture's scalability claims hold. Until then, the evidence covers a specific regime: 11 documents, 200k–250k tokens, two domains. That's a useful regime. It's not the whole problem.

---

*Akay, Y. C., Kartal, M. Y., Alparslan, E., Ortakoyluoglu, F., & Akpinar, A. (2026). SPD-RAG: Sub-Agent Per Document Retrieval-Augmented Generation. arXiv:2603.08329*