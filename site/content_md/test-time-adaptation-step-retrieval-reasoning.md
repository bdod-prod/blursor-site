# An AI That Learns From Its Own Past Reasoning, Mid-Answer

Most retrieval-augmented generation systems retrieve evidence once, at the question level, then hand the result to a reasoning chain. That design works when the task is fact lookup. It works less well when the task requires executing a sequence of conditional checks — where an error at step three is not fixed by better evidence about the question as a whole. The failure is local to a step, but the retrieval is global to the query.

Test-time scaling methods take a different approach: sample more reasoning chains and aggregate. The intuition is that more exploration surfaces better paths. But if the model's underlying confusion is about a specific intermediate inference — confusing two nearby causal chains, skipping a gate condition — sampling more chains from the same confused model amplifies the same wrong heuristic rather than correcting it.

TARSE, a system from Wang, Yao, Zeng, Yang, Zamani, and Yu, addresses both problems by adapting model parameters at inference time using retrieved step-indexed reasoning traces, then retrieving procedural skills conditioned on each step of the provisional chain rather than the question as a whole. The anchoring comparison: rStar-Qwen2.5 reaches 58.1% on MedQA while consuming +497 seconds per question. TARSE-7B reaches 70.1% while adding 32 seconds.

---

## The Problem With Conventional RAG and Test-Time Scaling

The latency gap between rStar and TARSE is not the interesting number on its own. The interesting number is that rStar — a heavy test-time search method — scores 58.1% on MedQA while the CoT baseline without any retrieval or search scores 55.1%. Fifteen additional minutes of compute per question buys three percentage points. TARSE adds 32 seconds and buys fifteen.

The token counts make the same point more starkly. rStar consumes +491,132 tokens per question above the CoT baseline. TARSE consumes +56,214. The difference is not engineering efficiency — it reflects a structural difference in what each method is actually doing. rStar is searching harder over the same decision space. TARSE is changing what the model treats as the decision bottleneck.

Conventional RAG sits in between, but closer to the baseline. Adding only RAG-Skills via MedRAG reaches 58.7% — a 3.6 percentage point improvement over CoT, comparable to rStar's gain at a fraction of the compute. The retrieval is helping, but not enough. The relevant evidence is present; the model still fails to apply it correctly at the specific steps where it matters.

The paper's diagnosis: errors in multi-step medical reasoning are step-local. A question about drug interaction management might require correctly executing a contraindication check at step two before the rest of the chain is meaningful. Retrieving a document about the drug at the question level doesn't fix a model that applies the wrong conditional at that step. What fixes it is adapting the model's parameters on examples of that specific step being executed correctly — and then retrieving procedural rules conditioned on that step's transition, not the question's topic.

---

## What TARSE Actually Does

The system has two libraries and two inference stages.

The skills library is built from clinical guidelines — CDC, NICE, WHO, medical textbooks — normalized into actionable rule format: conditions, then test or finding, then action. These are procedural primitives, not documents. The experience library is a collection of step-indexed logical chain trajectories paired with solved QA cases. Each trajectory is indexed by its step-level transitions, not by the question. GPT-4 synthesizes the logical chains from factual documents that don't contain explicit reasoning, using structured instruction templates. Human annotators validated 100 randomly sampled instances: 88% were judged faithful and correctly paired with their QA cases.

Retrieval from the experience library uses a two-stage pipeline — ColBERT for top-K candidates, followed by a cross-encoder reranker trained with contrastive loss on query, gold chain, and hard negative triplets. The Logical Chain Retriever achieves 73.27% top-5 accuracy on QA pairs from PubMed, compared to 62.33% for ColBERT alone. At top-20, the gap is 81.79% versus 70.51%.

At inference, Stage A runs a small number of gradient steps on the retrieved experience traces — lightweight test-time training — to produce query-adapted model parameters. Stage B then generates a provisional reasoning chain using those adapted parameters, retrieves skills conditioned on each step transition of that chain, and generates the final answer conditioned on both the experience minibatch and the step-aligned skills bundle. The adaptation is not fine-tuning in the conventional sense; it's a few gradient steps targeted at the specific reasoning pattern the current query requires.

The design reflects a specific hypothesis: that the failure mode in complex medical QA is not missing knowledge but misapplied procedure — and that the most efficient correction is parameter-level adaptation on structurally similar solved cases, not more search.

---

## How Much Each Component Contributes

The ablation in Table 1 isolates each component with a matched backbone, identical prompts, and the same decoding. The CoT baseline — no retrieval, no test-time training — sits at 55.1%. Adding only RAG-Skills (MedRAG) reaches 58.7%. Adding only TTT without experience supervision reaches 59.1%. Adding CoT and RAG together (iMedRAG) reaches 62.5%. The full configuration — TTT plus experience plus RAG-Skills — reaches 70.1%.

The jump from 62.5% to 70.1% is the critical gap. iMedRAG already has both chain-of-thought reasoning and retrieval. What it lacks is parameter adaptation on step-indexed experience. That single addition — holding everything else constant — accounts for 7.6 percentage points. The gap between TTT-only (59.1%) and the full system (70.1%) shows that test-time training without the experience library and step-aligned skills retrieval is nearly as weak as RAG-only.

Error analysis on 100 test cases using Qwen2.5-14B as the base model gives a more granular picture. Compared to ColBERT-RAG, TARSE reduces irrelevant or missing evidence errors from 15 to 7, reduces insufficient reasoning errors from 20 to 12, and eliminates misleading evidence errors entirely — from 6 to 0. Forgotten knowledge errors move from 6 to 5. The largest reduction is in the reasoning category, consistent with the hypothesis that step-aligned adaptation is correcting procedural failures rather than plugging knowledge gaps.

The dominant failure mode, in other words, is not that the model lacks access to relevant information. It's that relevant information retrieved at the question level is too coarse to correct a specific mistaken step. Step-aligned retrieval and parameter adaptation address that failure directly; question-level retrieval does not.

---

## Where the Gains Are Real and Where They Are Not

The method's structural advantage is clearest on tasks where correctness depends on executing checks in the right order. On MultiHopQA, TARSE-7B reaches 45.1% against a baseline of 26.3% for Qwen2.5-7B-Instruct — a 71% relative improvement. The i-MedRAG baseline with the same backbone reaches 35.6%. The gap between i-MedRAG and TARSE on MultiHopQA is larger than the gap on MedQA, consistent with the hypothesis that step-level procedural verification matters most when the task structure requires it.

On MMLU Medical — a benchmark weighted toward fact recall rather than procedural reasoning — the picture changes. TARSE-7B scores 75.4%, barely above the Qwen2.5-14B-Instruct baseline at 75.2%. More notably, rStar-Qwen2.5-14B scores 77.2% on MMLU, outperforming TARSE-7B outright. When the task doesn't require executing a sequence of conditional checks, the method's core mechanism — step-indexed experience retrieval and parameter adaptation — adds little. A model that already knows the relevant facts doesn't benefit from adapting its parameters on procedural traces.

The TARSE-14B configuration reaches 73.8% on MedQA and 78.5% on MMLU Medical, showing that scaling the backbone helps across both task types. But the relative advantage over baselines is larger on procedurally complex tasks regardless of model size.

Several caveats apply. The experience library is synthesized by GPT-4 from documents without explicit reasoning, introducing potential bias from the synthesis model. The paper does not report statistical significance tests. Code is pending release, so results are not yet independently reproducible. And the paper's own impact statement acknowledges that wrong or outdated skills, biased experience traces, or retrieval errors can still produce wrong answers — the method reduces a specific failure mode, it doesn't eliminate failures.

---

## Before Choosing a Scaling Strategy

The practical implication is not that test-time training is universally better than retrieval or search. It's that the right method depends on what kind of errors your application actually makes.

For applications involving procedural or multi-hop reasoning — clinical decision support, legal analysis, multi-step technical troubleshooting — the evidence here suggests that step-aligned parameter adaptation is a more compute-efficient path to accuracy than scaling up search. The 32-second versus 497-second comparison is the operational version of that claim: similar or better accuracy at roughly 6% of the latency cost.

For knowledge-lookup tasks, the method's structural advantage disappears. TARSE-7B's near-zero improvement over the Qwen2.5-14B-Instruct baseline on MMLU Medical is a direct signal. If your task is primarily fact retrieval, conventional RAG or a larger base model is likely the more efficient investment.

The experience library construction pipeline — GPT-4 synthesis of step-indexed logical chains from factual documents — is the component most likely to require adaptation for a new domain. The 88% human validation rate on 100 sampled instances is encouraging but not a guarantee at scale, and the synthesis model's biases will propagate into the experience library. Building that library carefully, with domain-appropriate validation, is the prerequisite the paper's results depend on.

*Wang, J., Yao, Z., Zeng, H., Yang, Z., Zamani, H., & Yu, H. (2026). TARSE: Test-Time Adaptation via Retrieval of Skills and Experience for Reasoning Agents. arXiv:2603.01241*