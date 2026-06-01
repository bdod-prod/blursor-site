# Retrieval Solves Factoid QA but Not Sensemaking

Most RAG evaluations are running on the wrong test. The benchmarks that dominate leaderboards — SimpleQA, HotpotQA — were designed to measure whether models can locate and extract facts. That is a useful capability. It is not the same as synthesizing evidence across thematically distinct sources, and conflating the two has produced a systematic blind spot in how retrieval pipelines get assessed.

A paper from the University of Washington introduces iAgentBench, a dynamically constructed benchmark built specifically to require cross-theme sensemaking. Questions are only retained if they structurally depend on at least two distinct thematic communities and at least one connector relation between them — making single-passage retrieval insufficient by construction. The benchmark is built from GDELT news snapshots, parsed into story graphs via Leiden clustering, and verified by a three-LLM judge panel with majority vote. The researchers then ran four frontier models — Claude Sonnet 4.5, LLaMA 4 Maverick 17B, Mistral Large 3, and Gemma 3 27B — under three inference conditions: no tools, RAG, and Reflexion (agentic self-reflection over retrieved evidence).

The number that anchors the paper: Claude Sonnet 4.5 jumps from 0.240 to 0.740 accuracy on SimpleQA once retrieval is enabled. On iAgentBench, the same model under the same retrieval setup reaches 0.584.

---

## The Problem With Existing QA Benchmarks

The authors' core methodological argument is that multi-hop reasoning is not equivalent to sensemaking. A model can chain two facts — person A worked at company B, company B was acquired by company C — without ever synthesizing evidence across thematically distinct communities of information. HotpotQA is the canonical multi-hop benchmark, but the paper argues its questions still often reward locating a small cluster of lexical matches or short supporting statements. The hard reasoning is shallow enough that retrieval of a single relevant passage frequently suffices.

Sensemaking, as the paper defines it, requires integrating evidence that doesn't share obvious surface features — stories that are connected by influence, causation, or shared actors rather than shared keywords. iAgentBench enforces this structurally. Topics are seeded from GDELT daily snapshots, scored for salience and geographic breadth, then a query-conditioned web corpus is retrieved and parsed into a hypergraph of natural-language claims. Leiden clustering identifies thematic communities within that graph. A question packet is only constructed if it spans at least two communities with at least one cross-community connector relation — and a three-LLM judge panel verifies that the question genuinely requires both. Questions that could be answered from a single community are discarded.

The construction has a practical cost. Unlike static datasets, generating a new evaluation window requires retrieval, graph construction, and generation from scratch. The benchmark degrades gracefully as news cycles evolve — new windows can be produced — but at higher compute and API overhead than pulling from a fixed test set.

---

## Retrieval Helps Everywhere — But Not Equally

Across all four models and all three benchmarks, RAG outperforms the no-tool baseline without exception. That result is clean and consistent: evidence access is universally beneficial, even for frontier models that already carry substantial parametric knowledge.

What varies is how much of the remaining gap retrieval closes. On SimpleQA, the gains are large enough to suggest the benchmark's difficulty was almost entirely an evidence-access problem. Claude Sonnet 4.5 goes from 0.240 to 0.740; LLaMA 4 Maverick goes from 0.174 to 0.657. Once a relevant passage is retrieved, extracting a short factoid answer is not the hard part.

On iAgentBench, the same retrieval setup leaves a meaningful gap. Claude Sonnet 4.5 reaches 0.584 — well below its SimpleQA RAG score — and the pattern holds across models. Retrieving a passage is necessary but not sufficient when the question requires synthesizing across thematic communities that don't share surface-level features. The retrieval step surfaces relevant evidence; the synthesis step is where the deficit persists.

This gap is the paper's central empirical finding. It doesn't mean RAG is failing — it means the benchmarks typically used to evaluate RAG are measuring a problem that retrieval largely solves, while the harder problem goes unmeasured.

---

## Agentic Self-Reflection Is Not a Free Upgrade

Reflexion — iterative self-reflection over retrieved evidence — is the agentic extension the paper tests. The expectation is that multi-step reasoning loops would help on cross-theme questions, where a single retrieval pass may not surface all necessary evidence. The results don't support that expectation uniformly.

LLaMA 4 Maverick improves under Reflexion on iAgentBench, rising from 0.532 to 0.628. That's a meaningful gain. But Mistral Large 3 drops from 0.638 to 0.564, and Gemma 3 27B drops from 0.592 to 0.570 — both regressions relative to plain RAG on the same benchmark. Adding reasoning loops made those models less accurate, not more.

The inconsistency points to a specific failure mode. When the underlying evidence is cross-thematic and ambiguous, iterative reflection can amplify errors rather than correct them. A model that retrieves a plausible but incomplete picture of a cross-community connection may revise toward a more internally coherent but less accurate answer. The loop reinforces the error instead of catching it. Whether a given model benefits from Reflexion on sensemaking tasks appears to depend on properties of the model that aren't captured by its baseline or RAG performance — Mistral Large 3 has the highest RAG accuracy on iAgentBench among the four models and still regresses under Reflexion.

---

## What to Do About It

The practical implication is not that RAG pipelines are broken. It's that the benchmarks used to validate them are systematically understating a real limitation — and that agentic extensions are being deployed on the assumption that more reasoning steps help, when the evidence for cross-theme sensemaking tasks is mixed at best.

For teams building or evaluating retrieval systems, the first step is to check what the benchmark is actually measuring. If the evaluation set can be solved by locating a single relevant passage, strong RAG scores on that set don't tell you much about how the system will perform when questions require synthesizing across thematically distinct sources. That's a different capability, and it needs a different test.

For agentic pipelines specifically, the Reflexion results argue against treating self-reflection as a default upgrade. The models that regressed weren't weak models — Mistral Large 3 at 675B parameters had the highest RAG accuracy on iAgentBench before Reflexion degraded it. The question of whether iterative reflection helps or hurts depends on the task structure, and cross-theme sensemaking appears to be a case where the answer is model-dependent and not reliably positive. Deploying Reflexion without evaluating it on sensemaking-type questions is working from incomplete evidence.

The benchmark itself is available for evaluation, though the dynamic construction means each new window carries compute and API costs. For teams willing to absorb that overhead, it provides a more honest picture of where retrieval pipelines actually stand.

---

*Dammu, P. P. S., Palkhiwala, A., Roosta, T., & Shah, C. (2026). iAgentBench: Benchmarking Sensemaking Capabilities of Information-Seeking Agents on High-Traffic Topics. arXiv:2603.04656*