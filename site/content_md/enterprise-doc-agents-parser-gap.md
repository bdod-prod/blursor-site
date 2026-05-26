# The Parser Gap: What a New Databricks Benchmark Actually Shows About Enterprise Document Agents

Most RAG benchmarks test retrieval. This one tests whether agents can actually answer hard questions from dense, domain-specific documents — and then measures every variable in the pipeline that determines whether they can. The paper, from Databricks, introduces OfficeQA Pro: 133 questions drawn from 89,000 pages of U.S. Treasury Bulletins spanning nearly 100 years, containing over 26 million numerical values. The corpus is the kind of material enterprises actually deal with — not Wikipedia summaries or clean web text, but decades of dense tabular financial data that no model has memorized and no web search reliably surfaces.

The benchmark was constructed to be resistant to shortcuts. 99% of answers are numerical, enabling deterministic evaluation via exact match. 62% of questions require data analysis beyond basic arithmetic. 22% require fetching external reference values. Questions solvable by parametric knowledge were filtered out before the benchmark was finalized. What remains is a set of questions that require grounded, multi-step reasoning over real documents — the kind of task that enterprise AI deployments are actually supposed to handle.

The number that anchors the paper: frontier LLMs score under 5% from memory alone on OfficeQA Pro. The best web-search-enabled result — GPT-5.4 — reaches 11.3%.

---

## The Benchmark: Why Parametric Knowledge Fails Here

The sub-5% floor for prompt-only models isn't a surprise given the corpus design, but it closes off a common escape hatch in enterprise AI evaluation. Models that perform well on general knowledge benchmarks have no foothold here. Claude Opus 4.6, GPT-5.4, and Gemini 3.1 Pro Preview all score under 5% without document access. Web search doesn't rescue the situation — GPT-5.4's 11.3% with web search is the ceiling for that configuration, and Claude Opus 4.6 exhausts its generation tokens without producing a final answer in 80% of web-search cases.

The benchmark's numerical answer format removes the ambiguity that inflates scores on open-ended tasks. There's no partial credit for plausible-sounding prose. Either the agent extracts and computes the right number or it doesn't. That strictness, combined with the corpus's density, makes OfficeQA Pro a stress test for the full pipeline — not just the model.

The difficulty is genuine, not an artifact of retrieval. When human annotators familiar with the task and documents were given oracle pages — the exact source pages needed to answer each question — they scored 51.1% on a 30-question subset. Agents given the same oracle pages averaged 71.1%. The gap between humans and agents here runs in the opposite direction from most benchmarks, and it persists: agents are faster and more accurate even when humans know exactly where to look.

---

## Agent Baselines: Even With the Documents, Most Questions Fail

Providing agents with the full PDF corpus improves things substantially over prompt-only — but not enough. Frontier agents average 34.1% accuracy on the full PDF corpus. Claude Opus 4.6 leads at 48.1%, GPT-5.4 reaches 36.1%, and Gemini 3.1 Pro Preview scores 18.1%. More than half of questions fail even when the answer is somewhere in the documents the agent can access.

Failure mode analysis attributes 40–50% of errors in PDF-based agents to parsing failures: misread numbers, corrupted text, misaligned tables. The documents contain the right answer. The agent can't reliably extract it. This is a different problem than model capability — it's a pipeline problem, and it compounds with every question that requires numerical precision.

Latency makes the PDF baseline impractical for production regardless of accuracy. Answering a single question over the full PDF corpus takes an average of 23.6 minutes per agent. That's not a benchmark artifact — it reflects the actual cost of having an agent navigate and parse raw PDFs at inference time. For any deployment where response time matters, the PDF baseline isn't a viable starting point.

The oracle experiment — giving agents only the relevant source pages rather than the full corpus — confirms that retrieval accounts for a significant share of failures, but not all of them. Even on oracle pages, agents using raw PDFs leave substantial accuracy on the table. The best oracle PDF result still trails the best oracle parsed result by 6–11 percentage points depending on the model.

---

## The Parser Gap: The Biggest Lever in the Pipeline

The paper's most actionable finding is also its starkest. Across custom agent configurations, Databricks' ai_parse_document averages 50.4% accuracy. Docling, an open-source alternative, averages 38.4%. Unstructured.io, a proprietary option, averages 31.1%. The spread from best to worst parser is 22 percentage points — larger than the gap between the strongest and weakest frontier models in most configurations.

Switching from raw PDFs to structured parsed documents yields a 16.1% average relative accuracy gain across frontier agents in the full-corpus setting. In the oracle setting — where retrieval is removed as a variable — the gain is 50.2% on average. The parsing step isn't just cleaning up text; it's determining whether the model can access the numerical structure that the questions require.

Parsed documents also cut latency dramatically. Average per-question time drops from 23.6 minutes with raw PDFs to 3.9 minutes with state-of-the-art parsing — a 4–9x improvement depending on the model. Gemini 3.1 Pro Preview drops from 26.4 minutes to 2.9 minutes. GPT-5.4 drops from 13.1 minutes to 3.6 minutes. Claude Opus 4.6 drops from 31.2 minutes to 5.3 minutes.

The cost picture follows the same direction. ai_parse_document costs $5.29 per sample on average — a 35% reduction compared to Docling at $8.18. Parsing the full corpus with ai_parse_document costs $178 total, versus $2,670 for unstructured.io. The best-performing parser is also the cheapest. That combination — higher accuracy, lower latency, lower cost — makes parser selection the dominant infrastructure decision in this class of pipeline.

---

## Retrieval and Representation: The Remaining Gains

Once parsing is addressed, retrieval quality becomes the next meaningful variable. Contextual vector search improves accuracy by 21% on average over standard vector search, while simultaneously reducing tool calls by approximately 44%, latency by approximately 38%, and cost by approximately 44%. It's a dominant strategy — better on all four dimensions simultaneously, not a tradeoff.

Combining file search with contextual vector search adds a further 15% performance improvement over contextual embeddings alone. The hybrid approach is more complex to implement, but the gains are consistent enough across configurations to justify the added engineering.

Table representation is a smaller but real variable. HTML outperforms hierarchical Markdown in 7 of 11 agent configurations. The effect is model-dependent — Claude Opus 4.5 and Sonnet 4.5 reverse the trend, benefiting from hierarchical Markdown instead. For most configurations, HTML is the safer default, but the exception is large enough to warrant testing rather than assuming.

The best single configuration — Claude Opus 4.6 with oracle Databricks-parsed documents — reaches 66.9% accuracy. That's the practical ceiling for current frontier systems on this class of task. It also means that even the best possible configuration fails on more than a third of hard enterprise document questions. The benchmark is doing its job.

---

## Before the Next Pipeline Decision

The paper's implication for practitioners is specific: parser selection is not an infrastructure detail to defer. It is the single highest-leverage decision in an enterprise RAG pipeline, capable of shifting accuracy by more than 20 points and cutting cost and latency by 35–80% simultaneously. Treating it as a commodity choice — defaulting to whatever ships with the framework — leaves more performance on the table than any model upgrade is likely to recover.

The sequencing matters. Fix parsing first. Then address retrieval quality — contextual embeddings over standard vector search, with hybrid file search added if the accuracy target justifies it. Then test table representation against the specific models in the stack. Model selection comes last; the variance from parser choice exceeds the variance from model choice in most configurations tested here.

The 66.9% ceiling is also worth sitting with. It represents the best available combination of frontier model, oracle retrieval, and best-in-class parsing — and it still fails on more than one in three questions from a single domain corpus. For enterprise deployments where the documents are messier, the questions are harder, or the retrieval is imperfect, that ceiling is lower. Knowing where the floor actually is — not the floor on a cleaned-up benchmark, but on the kind of dense numerical documents that enterprise workflows actually contain — is more useful than optimizing against a benchmark that doesn't reflect the problem.

*Opsahl-Ong, K., Singhvi, A., Collins, J., Zhou, I., Wang, C., Baheti, A., Oertell, O., Portes, J., Havens, S., Elsen, E., Bendersky, M., Zaharia, M., & Chen, X. (2026). OfficeQA Pro: An Enterprise Benchmark for End-to-End Grounded Reasoning. arXiv:2603.08655*