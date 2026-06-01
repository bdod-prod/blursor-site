# A 1.7B Model Routes RAG Fallbacks at 1/50th the Cost of GPT-4o-mini

Retrieval-augmented generation pipelines have a noise problem. Retrieved documents aren't always relevant — sometimes they're actively misleading, containing high-similarity passages that contradict the correct answer. The standard engineering response is to add a retrieval critic: a model that inspects retrieved context before generation and decides whether to use it or fall back to a search call. The problem is that the obvious critic — a capable frontier model like GPT-4o-mini — introduces 785 ms of routing overhead and $3.00 per 10,000 queries in API costs. For pipelines running at scale, that's not a rounding error.

A new paper proposes a different approach: fine-tune a 1.7B parameter model with LoRA to perform the same binary routing decision, using constrained decoding to reduce the output space to exactly two tokens. The result is a routing step that completes in 42 ms at $0.06 per 10,000 queries. The quality gap is real but narrow — Routing F1 of 0.912 versus 0.934 for the GPT-4o-mini baseline, and faithfulness under adversarial noise of 0.86 versus 0.88.

The number that frames the paper: under adversarial noise injection, Naive RAG faithfulness collapses to 0.44 — less than half the score achieved by either critic-augmented approach.

---

## The Problem: Retrieval Noise Breaks Naive RAG, But the Fix Is Expensive

The evaluation corpus is 5,000 queries drawn from Natural Questions and HotpotQA, with two noise types injected: hard negatives (documents ranked 10–20 by BGE-M3 cosine similarity, high surface relevance but wrong answers) and conflicting distractors (synthetic contexts with falsified entities). Under these conditions, Naive RAG faithfulness lands at 0.44. That's not a marginal degradation — it means the pipeline is producing unfaithful outputs more than half the time when the retrieval pool is contaminated.

The standard fix, which the paper calls Heavy-CRAG, routes every query through GPT-4o-mini before generation. Faithfulness recovers to 0.88. But the routing overhead is 785 ms in isolation, and total system time-to-first-token reaches 1,235 ms. At $3.00 per 10,000 queries under the paper's 2K-token average context assumption, the cost is also non-trivial for high-volume deployments.

The paper frames this as a false binary. Either accept contamination cascades or pay a steep latency and cost tax on every query — including the majority that don't need fallback at all. The question it sets out to answer is whether task-specific fine-tuning can close the quality gap at a fraction of the infrastructure cost.

---

## The Approach: Constrained Decoding + LoRA Turns a 1.7B Model Into a Router

Qwen3-1.7B is fine-tuned with LoRA to perform a binary routing decision: Generation Path or Fallback Path. A constrained decoding mask restricts the output vocabulary to exactly two tokens, reducing decoding complexity to O(1). Non-Thinking inference mode suppresses chain-of-thought generation entirely. FlashAttention accelerates KV-cache prefill. Together, these choices collapse routing latency to 42 ms.

The LoRA fine-tuning step is not optional, and the ablation makes this concrete. Zero-shot Qwen3-1.7B — the same model, no fine-tuning — produces a false positive rate of 38.2%, driven by sycophancy: the model tends to accept retrieved context rather than flag it for fallback. After LoRA training over 15 epochs, the false positive rate drops to 4.1%. The constrained decoding architecture creates the latency profile; the fine-tuning creates the reliability. Neither alone is sufficient.

Fallback execution uses Tavily Search via Model Context Protocol. The DAG-based routing state space is binary — the model outputs one bit per query — which is what makes the constrained decoding approach tractable at this scale.

---

## The Results: Near-Parity Quality at a Fraction of the Cost

On the 5,000-query adversarial corpus, Tiny-Critic achieves a Routing F1 of 0.912 against Heavy-CRAG's 0.934. Faithfulness under noise is 0.86 versus 0.88. Both gaps are small in absolute terms, and both represent a near-doubling of Naive RAG's degraded 0.44 faithfulness score. The paper characterizes the F1 gap as statistically comparable, though no significance tests are reported — a caveat worth holding onto for high-stakes applications.

The cost and latency differences are less ambiguous. Routing overhead drops from 785 ms to 42 ms — a 94.6% reduction. Total system TTFT drops from 1,235 ms to 492 ms. Explicit cost per 10,000 queries drops from $3.00 to $0.06, a 98% reduction. The paper also estimates $1.20 per 10,000 queries in implicit token waste savings from avoiding multi-hop reasoning over faulty evidence, though the derivation methodology for that figure isn't detailed.

These numbers carry assumptions. The cost figures assume optimal batch utilization and a fixed 2K-token average context, anchored to AWS g5.xlarge pricing for local inference. Variable workloads, longer contexts, or different infrastructure will shift the CPQ numbers. The local-inference assumption is load-bearing for the latency claims — teams routing through a remote endpoint won't see 42 ms.

---

## What to Trust and What to Scrutinize

The evaluation covers two datasets and one noise protocol. Natural Questions and HotpotQA are reasonable benchmarks, but they don't cover domain-specific corpora — legal, medical, financial — where retrieval noise distributions may look different and where the cost of a false negative (failing to flag bad context) is higher. Generalization to those settings is unconfirmed.

The F1 gap between 0.912 and 0.934 is asserted as statistically comparable without a significance test. For pipelines routing queries where a wrong answer has downstream consequences, that 2.2-point gap should be treated as real until evidence suggests otherwise. The paper is transparent that some adversarial inputs won't be correctly intercepted.

The $1.20 implicit savings estimate is the weakest number in the paper. It's described as estimated, and no derivation is provided. It shouldn't factor into infrastructure decisions without independent validation against actual workload data.

What the paper does establish clearly: LoRA fine-tuning — not model scale — is what makes binary routing reliable at the edge. The zero-shot ablation is the most useful result for practitioners evaluating whether to attempt this without fine-tuning. The answer is no.

---

## Before Committing to a Routing Architecture

If a RAG pipeline is already paying GPT-4o-mini rates to filter retrieval noise, the case for evaluating a locally-hosted LoRA-tuned critic is straightforward — the quality trade-off is 2.2 F1 points and 0.02 faithfulness, and the cost and latency gains are an order of magnitude. That's a reasonable exchange for most production workloads.

The practical checklist is short. Confirm that the deployment environment supports local inference at the latency profile the paper assumes — the 42 ms figure requires the full stack: constrained decoding, Non-Thinking mode, FlashAttention, and adequate batch utilization. Recalculate CPQ against actual infrastructure costs rather than AWS g5.xlarge defaults. And if the application domain differs from open-domain QA, run the ablation on domain-specific noise before treating the F1 numbers as transferable.

For teams routing high-stakes queries — where a false negative means a hallucinated answer reaches a user — the 0.912 versus 0.934 gap warrants direct measurement rather than reliance on the paper's comparability claim. For everything else, the cost and latency case is strong enough to justify a pilot.

*Wu, Y., Liang, P., Xiang, Y., Yuan, M., Liu, J., Yang, J., Li, X., & Yan, W. (2026). Tiny-Critic RAG: Empowering Agentic Fallback with Parameter-Efficient Small Language Models. arXiv:2603.00846*