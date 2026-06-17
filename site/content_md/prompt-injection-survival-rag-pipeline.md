# Prompt-Injection Attacks Die Before the Generator — Unless They're LLM-Written

Most research on prompt injection in RAG systems tests attacks the easy way: drop the malicious document directly into the generator's context and measure whether it works. No retrieval. No reranking. Just the attack and the model. That protocol is convenient, but it skips the two pipeline stages most likely to stop an attack before it ever reaches the generator.

A new study from the University of Queensland tests seven prompt-injection attacks the hard way — through a full three-stage pipeline with a retriever, an LLM reranker, and an LLM generator — and compares those results to the frozen-context scores that dominate the literature. The gap is large enough to change how you think about the threat.

The anchoring number: gradient-based attacks, which account for a significant share of the academic literature on adversarial RAG, fall below 2.5% end-to-end generation success once retrieval and reranking are included. The attacks don't fail at the generator. They fail before they get there.

---

## The Frozen-Context Illusion

The standard evaluation protocol in prior work places the attacked document directly into the top-k context the generator sees. That's not how production RAG works. In a real system, an adversarial document has to rank in the top 10 retrieved results, survive an LLM reranker that re-orders those results, and then appear in the top 5 passed to the generator. Each stage is a filter.

The frozen-context protocol bypasses all three filters, which means it measures something closer to "how dangerous is this attack if the attacker already won" rather than "how dangerous is this attack in practice." The gap between those two questions is what this paper actually measures.

The researchers evaluate seven attacks across two retrievers (BM25 sparse and BAAI/bge-large-en-v1.5 dense), an LLM listwise reranker (Qwen3-8B), and an LLM generator (Qwen3-8B), using 200 queries per retriever drawn from the Amazon ESCI product-search corpus. Each attack is placed at two positions — rank 6 and rank 10 — to test whether the document is just inside or just outside the reranker's top-5 cutoff. The result is a stage-by-stage picture of where attacks survive and where they die.

---

## Gradient-Based Attacks Don't Survive Retrieval

SRP, RAF, and STS are gradient-optimized attacks: they use backpropagation through the generator to craft adversarial suffixes that manipulate its output. They work well under frozen-context evaluation. End-to-end, they collapse.

All three fall below 2.5% generation success at rank 10 across both retrievers. SRP reaches 1.0% under both BM25 and dense retrieval. STS hits 0.5% under BM25. The reason isn't that the generator resists them — it's that they never reach the generator. Their adversarial suffixes are optimized against the generator's loss, not the retriever's ranking function, so the token-level perturbations they introduce disrupt the lexical and semantic content that retrievers use to rank documents. The attack wins the wrong game.

Instruction Override Attack (IOA) follows a different failure mode. Its unified suffix is effective at the reranker stage — it achieves a mean rank promotion of 6.16 positions from rank 10 under frozen-context evaluation — but that same suffix dilutes the document's query-relevant content, which hurts first-stage retrieval. IOA's retrieval survival drops to 50.5% under BM25 and 68.0% under dense retrieval at rank 10. It's the largest retrieval survival drop of any attack in the study. The reranker likes it; the retriever doesn't.

<div data-block-type="performance-callout" data-left-desc="End-to-end generation success for all three gradient-based attacks (SRP, RAF, STS) at rank 10" data-left-figure="≤2.5%" data-right-desc="End-to-end generation success for CORE-Reason, the strongest LLM-driven attack" data-right-figure="48–59%"></div>

---

## LLM-Driven Attacks Survive — and One Gets Stronger

The three LLM-driven attacks — CORE-Reason, CORE-Review, and TAP — work differently. Instead of appending adversarial suffixes, they rewrite the document to be persuasive while preserving its query-relevant content. That's exactly what retrievers reward.

CORE-Reason achieves retrieval survival of 91.0% under BM25 and 98.5% under dense retrieval at rank 10. CORE-Review reaches 89.5% and 95.0%. TAP hits 89.5% and 87.0%. These aren't attacks that sneak past the retriever — they're attacks the retriever actively promotes because their rewrites look like highly relevant documents.

<div data-block-type="stat-callout" data-number="98.5%" data-text="CORE-Reason retrieval survival under dense retrieval at rank 10 — the attack's persuasive rewrites align so well with query content that the retriever actively promotes them."></div>

CORE-Reason is the one attack that performs *better* end-to-end than under frozen-context evaluation. Under BM25, its generation success goes from 44.5% frozen-context to 48.0% end-to-end. Under dense retrieval, it goes from 54.5% to 59.0%. The reason is structural: CORE-Reason's few-shot template causes the optimizer to repeat the user query multiple times in the rewritten document, and retrievers reward that lexical-semantic overlap with higher ranking. The pipeline doesn't attenuate this attack — it amplifies it.

The reranker plays a role here too. Across all seven attacks, the reranker promotes attacked documents up the ranking relative to a no-reranker baseline. For LLM-driven attacks, that promotion is substantial. One architectural lever that helps: restricting the generator to the top-5 reranked results rather than top-10 reduces mean attack success. It doesn't eliminate the threat, but it narrows the window.

---

## Off-the-Shelf Guards Fail; A Small Finetune Fixes It

If the real threat is LLM-driven attacks, the natural question is whether existing detection tools catch them. The answer for off-the-shelf guards is mostly no.

Prompt Guard (off-the-shelf) achieves 95.6% F1 on IOA and 80.6% on STS — attacks that carry explicit injection-style markers the guard was implicitly trained to recognize. Against CORE-Reason, it scores 0.0% F1. Against CORE-Review, 0.5%. The attacks that survive the pipeline are exactly the ones the guard misses, because they don't look like injections — they look like persuasive product descriptions.

<div data-block-type="failure-map" data-rows='[{"pct":"0.0%","label":"Off-the-shelf Prompt Guard F1 on CORE-Reason — the most effective E2E attack","primary":true},{"pct":"0.5%","label":"Off-the-shelf Prompt Guard F1 on CORE-Review"},{"pct":"95.6%","label":"Off-the-shelf Prompt Guard F1 on IOA (explicit injection markers)"},{"pct":"~100%","label":"PG-FT (finetuned on 104 queries) average F1 across all seven attacks"}]'></div>

The fix is surprisingly cheap. Finetuning Prompt Guard on a balanced sample drawn from just 104 training queries yields near-perfect detection across all seven attack types. The detection problem isn't hard once you have examples of what you're looking for — the off-the-shelf guard fails not because the task is difficult but because it was never trained on LLM-rewritten adversarial content. A small, targeted dataset closes that gap entirely.

One caveat worth noting: in a realistic pipeline where clean documents vastly outnumber attacked ones, the finetuned guard's false discovery rate rises to around 29% due to class imbalance. That's a deployment consideration, not a fundamental limitation — but it means the guard works best as one layer in a defense stack rather than a standalone filter.

---

## What This Changes for Practitioners

If your threat model for RAG security is based on gradient-based attacks, you're defending against something that doesn't survive contact with a real pipeline. The attacks that matter end-to-end are the ones that rewrite documents to be genuinely persuasive — CORE-Reason and CORE-Review — and they're the ones most off-the-shelf guards completely miss.

A few concrete adjustments follow from this. First, evaluate attacks end-to-end, not in frozen context. A benchmark that bypasses retrieval and reranking is measuring a threat that doesn't exist in production. Second, treat LLM-rewritten content as the primary attack surface. Documents that look relevant and read persuasively are harder to filter at retrieval and harder to detect without targeted training. Third, finetune your guard on examples of the attacks you actually face — 104 labeled queries was enough to achieve near-perfect detection across all seven attack types in this study. The labeled data requirement is low enough that this is tractable for most teams.

Architecturally, restricting the generator to the top-5 reranked documents rather than top-10 provides a meaningful reduction in attack exposure at essentially no cost. It's not a complete mitigation, but it's a free one.

*Yin, Y., Wang, S., Koopman, B., & Zuccon, G. (2026). Can It Reach the Generator? Investigating the Survival of Prompt-Injection Attacks in Realistic RAG Settings. arXiv:2605.28017*