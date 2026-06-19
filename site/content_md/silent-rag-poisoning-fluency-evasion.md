# A Single Poisoned Document Can Hijack RAG Outputs — and Evade Detection While Doing It

Most RAG poisoning research has treated the attack and the defense as separate problems. Inject adversarial content to manipulate retrieval; run a perplexity filter to catch it. The implicit assumption was that making a document retrieval-effective would make it detectable — that fluency and attack power trade off against each other.

SilentRetrieval breaks that assumption. The paper introduces a poisoning method that jointly optimizes for retrieval relevance and surface fluency, producing adversarial documents that look nearly indistinguishable from legitimate content. The result is an attack that works at Wikipedia scale, transfers across retrievers and LLMs it was never optimized against, and largely defeats the detection methods that production RAG systems actually use.

The anchoring number: a single poisoned document per query achieves 57.5% attack success — meaning the target LLM genuinely endorses the adversarial answer — while triggering a perplexity-based audit only 8.7% of the time.

---

## The Attack: Fluency as a Weapon

Prior adversarial documents were easy to spot because optimizing for retrieval relevance tends to corrupt surface text. Token-level gradient attacks produce passages that read like noise — high perplexity, obvious to any automated filter. SilentRetrieval's contribution is making fluency a first-class optimization target rather than an afterthought.

The method has two components. Coordinated Beam Search (CBS) perturbs multiple token positions simultaneously, using gradient-guided candidate generation and a beam search over joint replacements. Unlike single-token greedy substitution, CBS can navigate the correlation structure of natural language — finding token combinations that preserve meaning and fluency while shifting retrieval scores. The ablation is clear: CBS outperforms single-token greedy by 4.8% HR@10 at comparable perplexity.

The second component, Context-Adaptive Trigger Generation (CATG), handles the adversarial payload itself. A frozen Llama-2-7B-Chat model generates candidate trigger phrases that embed the target misinformation into the passage naturally. Candidates are filtered by NLI entailment (threshold 0.8) and cosine coherence (threshold 0.7) before being accepted — so the adversarial claim has to fit the surrounding text, not just appear in it. CATG improves attack success by 3.3 percentage points over the best static template approach.

The combined result is a document with GPT-2 perplexity of 32.4 — compared to 28.4 for clean NQ documents. That gap is small enough that a perplexity audit at the 95th-percentile threshold catches only 8.7% of SilentRetrieval documents, versus 94.2% for Zhong et al.'s disfluent method. Human annotators flagged 14.7% of SilentRetrieval passages as suspicious — still above the 7.3% benign baseline, but far below the 83.3% flag rate for Zhong et al. and 56.7% for PoisonedRAG. Seventy-eight percent of SilentRetrieval passages were rated likely to survive initial Wikipedia-style editorial review.

---

## Retrieval and Generation Impact

High fluency would be irrelevant if the attack didn't actually work. It does. On the NQ corpus (361K passages, 3,452 test queries), SilentRetrieval places its poisoned document in the top-10 retrieved results 84.6% of the time — HR@10 — and the target LLM endorses the adversarial answer in 57.5% of cases. On MS MARCO at 8.8M passages, those numbers are 81.3% and 54.8%.

The comparison to GASLITE, the strongest fluency-comparable baseline, is telling. At equivalent perplexity, SilentRetrieval gains 7.8 percentage points on HR@10 and 13.4 points on ASR-LLM. The gap comes from CBS's joint optimization — single-token methods leave retrieval signal on the table that coordinated perturbation can capture.

Cross-model transfer holds across four target LLMs tested with a fixed generator: ASR-LLM ranges from 48.6% on Qwen-7B-Chat to 57.5% on Llama-2-7B-Chat, with Mistral-7B-Instruct at 54.2% and GPT-3.5-Turbo at 51.7%. The attack was optimized against Llama-2-7B-Chat; the fact that it transfers to GPT-3.5-Turbo at above 50% without any per-model tuning suggests the adversarial content is exploiting something general about how instruction-tuned LLMs process retrieved context.

---

## Scalability and Transfer

Two practical questions matter for anyone thinking about real deployments: does the attack hold at actual corpus scale, and does it require white-box access to the target retriever?

On scale: HR@10 drops from 86.4% at 100K passages to 74.2% at 21M — a 12.2 percentage point decline across a 210x corpus expansion, at a poisoning ratio of just 0.016%. That's 3,452 adversarial documents in a 21M-passage corpus. ASR-LLM falls faster than HR@10 with scale (18.3% vs. 12.2% absolute), which suggests that even when the poisoned document is retrieved, legitimate context in a larger retrieval set dilutes its influence on the generator. Still, 74.2% HR@10 at Wikipedia scale with one document per query is not a theoretical concern — it's a practical one.

On retriever transfer: the attack is optimized against Contriever, then evaluated against five unseen retrievers — DPR, BGE-base, ColBERTv2, text-embedding-ada-002, and Cohere embed-v3. Average HR@10 across those five is 64.7%, ranging from 57.2% (Cohere embed-v3) to 72.8% (DPR). The attack does not require per-retriever optimization to remain effective.

---

## Defense Costs and Residual Risk

The paper tests a range of defenses: passage isolation with majority voting, hybrid BM25 + dense retrieval, cross-encoder reranking, and combinations of all three. The results are sobering.

Passage isolation alone — clustering retrieved passages by cosine similarity and filtering outliers — cuts ASR-LLM from 57.5% to 38.2% at k=5. That's meaningful, but 38% attack success is still a serious problem. Stacking hybrid retrieval, a cross-encoder reranker, and passage isolation at k=5 brings ASR-LLM to 25.6%, at 6x inference latency. The strongest tested configuration — all three defenses at k=10 — reaches 21.3%, at 11x latency.

Detection-based approaches fare worse. A RAGuard-style detector catches 34.2% of SilentRetrieval documents; Mahalanobis scoring catches 31.6%. Both methods were trained or calibrated on disfluent adversarial examples — they're not equipped for content that looks like legitimate text. Adaptive attacks make the picture worse: when the attacker knows the reranker configuration (MiniLM-L6-v2), they recover 6.2% HR@10 by incorporating cross-encoder scores into the CBS objective.

The practical implication is that there's no cheap fix. The defenses that actually move the needle require stacking multiple expensive components, and even the strongest combination leaves one-in-five queries vulnerable. Any RAG deployment handling sensitive or high-stakes queries — financial data, medical information, anything where a wrong answer has consequences — needs to treat this as a live threat, not a research scenario.

For teams building or auditing RAG pipelines now, the priority ordering looks like this: passage isolation is the highest-leverage single defense and adds the least latency; hybrid retrieval helps but is less effective alone; reranking adds cost and is partially defeatable by adaptive attackers. Running all three is the only way to get below 25% residual risk — and that requires accepting an 11x latency hit. Detection-based approaches calibrated on prior disfluent attacks should not be trusted to catch fluency-preserving injections.

*Qian, J. (2026). SilentRetrieval: Hijacking Retrieval-Augmented Generation via Semantically-Preserving Adversarial Data Poisoning. arXiv:2605.28074*