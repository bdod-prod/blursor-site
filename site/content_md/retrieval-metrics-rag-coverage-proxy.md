# Retrieval Metrics Predict RAG Coverage — Until You Add an Agent

Most RAG evaluation pipelines treat retrieval quality and generation quality as a single problem. Improve the retriever, improve the response — that's the working assumption. A paper from Johns Hopkins University, published in March on arXiv, tests that assumption systematically across 15 retrieval stacks, four generation pipelines, and three benchmarks. The result is more conditional than the assumption allows.

The study is the first to run a controlled Pearson correlation analysis between nugget-based retrieval metrics and downstream RAG information coverage at both topic and system level, using two independent evaluation frameworks — Auto-ARGUE and MiRAGE — to check whether findings hold across evaluators. Prior work measured retrieval and generation quality separately; this paper measures the relationship between them, which is a different question.

The anchoring number: for simple RAG pipelines, system-level correlations between nugget-based retrieval metrics and final response information coverage reach 0.94. For iterative agentic pipelines, the same metric drops to 0.09.

---

## The Core Finding: Retrieval Quality Predicts RAG Coverage — With a Catch

Across 15 text retrieval stacks and two TREC benchmarks, nugget-based retrieval metrics are strong predictors of downstream information coverage — but only for simple generation pipelines. The system-level Pearson correlation between nugget-based nDCG and Bullet List coverage on RAG24 reaches 0.9391. On NeuCLIR24, α-nDCG correlates with GPT-R(1) coverage at 0.8105 and nugget-based nDCG at 0.8810. These are not marginal relationships. At system level, knowing which retrieval stack ranks higher is nearly sufficient to predict which pipeline will produce more informative responses.

The finding holds across evaluators. Under MiRAGE — an independent evaluation framework — α-nDCG still correlates with GPT-R(1) information coverage at 0.6777, and the directional pattern is consistent with Auto-ARGUE results. The robustness across two evaluation frameworks gives the finding more weight than single-evaluator studies typically carry.

The catch is structural, not marginal. LangGraph — an iterative retrieval-and-reasoning pipeline — produces system-level correlations of 0.2893 on NeuCLIR24 and 0.0941 in the most mismatched condition. The same retrieval stacks, the same benchmarks, a different generation architecture — and the predictive relationship nearly disappears. This is not noise. It reflects something about how iterative agents interact with retrieved content.

The practical implication is that the shortcut — evaluate retrieval, infer generation quality — is only available for a specific class of pipeline. Teams running agentic systems are not in that class.

---

## Why Relevance-Based nDCG Is the Wrong Metric for Complex Queries

The standard retrieval metric in most evaluation pipelines is relevance-based nDCG: documents are scored by how relevant they are to the query, and the ranked list is evaluated accordingly. On NeuCLIR24 — where queries are rich, multi-faceted report requests — this metric correlates with RAG coverage at 0.1407 for GPT-R(1) and -0.0131 for GPT-R(3). It is, by any reasonable standard, useless as a proxy for generation quality on complex queries.

The failure is conceptual. Relevance-based nDCG rewards retrieving the single most relevant document. Complex information needs require coverage across multiple facets — a document can be highly relevant to one aspect of a query while contributing nothing to the others. α-nDCG, which penalizes redundancy and rewards diversity across subtopics, correlates with GPT-R(1) coverage at 0.5586 on the same benchmark. The metric choice is not a technical detail; it determines whether retrieval evaluation tells you anything useful.

On RAG24 — where queries are short and factoid-like — relevance-based nDCG recovers to 0.3467 for GPT-R(1). The recovery is real but modest, and it reflects a specific condition: when a single highly relevant document can satisfy the information need, relevance and coverage happen to align. That condition does not generalize to the kinds of queries that motivate RAG in the first place. Teams using relevance-based retrieval metrics to predict RAG quality on complex or multi-aspect queries are working from a metric that provides near-zero signal.

---

## Agentic Pipelines Decouple Retrieval From Generation

LangGraph's iterative loop — retrieve, reason, retrieve again — means the final response is only loosely tied to any single retrieval stack's performance. A concrete example from the paper: BM25 followed by Qwen3-8B Reranker achieves an α-nDCG@20 of 0.583 — substantially weaker than Qwen3-8B Embed followed by Qwen3-8B Reranker, which reaches 0.691. Under LangGraph, the weaker retrieval stack produces nugget coverage of 0.559, among the highest across all 15 variants. The stronger stack produces 0.532. The ranking inverts.

This decoupling is not reliably beneficial. LangGraph does not consistently outperform simpler pipelines in final coverage — it just makes retrieval metrics uninformative as predictors. The iterative process can compensate for a weak first-stage retriever, but it can also fail to capitalize on a strong one. The relationship between retrieval input and generation output becomes unpredictable in a way that simple pipelines are not.

Under MiRAGE, the detachment is even more pronounced. LangGraph's information coverage correlates with RAG24 α-nDCG at -0.0301 and with RAG24 nDCG at -0.2034 — slightly negative. The direction of the relationship has inverted. For practitioners evaluating agentic RAG systems, there is currently no shortcut to retrieval benchmarks. End-to-end generation evaluation is required.

---

## Multimodal RAG Inverts the Signal: Retrieval Predicts Factuality, Not Coverage

The WikiVideo benchmark — 57 topics, 109K videos — introduces a different failure mode. Better retrieval correlates positively with factuality (InfoP, r = 0.6476 for α-nDCG) but negatively with information coverage (InfoR, r = -0.5821). The signal has not disappeared; it has pointed in the wrong direction for the metric most practitioners care about.

The authors attribute this inversion to how multimodal LLMs handle prominent events. These models are strongly anchored to parametric knowledge — what they learned during training about well-documented topics. Better retrieval surfaces video content that may contradict or diverge from that parametric knowledge, suppressing coverage scores rather than improving them. The model defaults to what it already knows rather than integrating retrieved content. Factuality improves because retrieved content constrains hallucination; coverage suffers because the model doesn't fully use what it retrieves.

This is a warning for multimodal RAG evaluation more broadly. The standard assumption — better retrieval yields better responses — does not hold when the generation model is strongly anchored to training data. The paper notes that multimodal RAG benchmarks requiring genuine information gathering from the collection, rather than relying on parametric knowledge, do not yet exist. Until they do, multimodal retrieval evaluation and generation evaluation are measuring partially different things.

---

## Before the Next Retrieval Benchmark

The paper's practical implication is not that retrieval evaluation is unreliable. It's that its reliability is conditional on pipeline type and metric choice — and both conditions are frequently violated in practice.

For simple pipelines, α-nDCG at system level is a legitimate proxy for end-to-end coverage evaluation. The correlations are strong enough that retrieval benchmarking can substitute for expensive generation evaluation in that setting. That is a real efficiency gain, particularly for teams iterating across many retrieval configurations.

For agentic pipelines, no such shortcut exists. The LangGraph results — system-level correlations below 0.30 on NeuCLIR24, near zero or negative on RAG24 — mean that retrieval benchmarks provide no reliable signal about which system will produce better responses. Running retrieval evaluation alone and inferring generation quality is not conservative; it's uninformative.

The metric choice matters independently of pipeline type. Relevance-based nDCG on complex queries produces correlations indistinguishable from zero. Teams that have not switched to nugget-based or diversity-penalizing metrics for complex information needs are not measuring what they think they are measuring. The 69% precision of LLM-judged nugget-document alignment for RAG24 — compared to TREC relevance judgments — introduces noise, but it does not explain the near-zero relevance-nDCG correlations on NeuCLIR24. That failure is structural.

The multimodal case requires a separate evaluation posture entirely. Until benchmarks exist that require genuine information gathering from video collections rather than parametric recall, retrieval and generation evaluation in multimodal RAG are not measuring the same underlying quality.

*Samuel, S., Martin, A., Yang, E., Yates, A., Lawrie, D., Soboroff, I., Dietz, L., & Van Durme, B. (2026). Beyond Relevance: On the Relationship Between Retrieval and RAG Information Coverage. arXiv:2603.08819*