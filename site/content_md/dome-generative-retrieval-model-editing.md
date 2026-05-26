# Editing Five Layers to Fix Generative Retrieval: What DOME Actually Shows

Generative retrieval (GR) models learn to map queries directly to document identifiers — no inverted index, no separate retrieval step. The appeal is architectural simplicity. The problem is that the mapping is baked into model weights at training time. Add a new document to the corpus and the model has no mechanism to retrieve it without retraining. For static corpora, that's manageable. For anything that changes — news, product catalogs, scientific literature — it's a practical ceiling.

Prior work has attacked this through incremental training: fine-tune on new documents while trying to preserve performance on old ones. The results are modest. Catastrophic forgetting is persistent, update times are high, and the gap between incremental training and full retraining remains wide enough to matter. A separate line of work — model editing for LLMs — offers surgical weight updates for factual knowledge, but those methods were designed for a different problem and transfer poorly to retrieval.

A paper from Shandong University and the University of Amsterdam proposes a different framing. Rather than asking how to train more efficiently, it asks where in the model the failure actually lives — and whether a targeted fix to that location is sufficient. The anchoring finding: without any adaptation, GR models achieve Recall@1 of 0.071 and 0.064 on new documents for DSI and Ultron respectively, making the corpus update problem not a performance gap but a near-total retrieval failure.

---

## The Real Bottleneck Isn't the Encoder

The standard assumption is that adapting to new documents requires updating the model's semantic representations — teaching the encoder what the new content means. T-SNE analysis in the paper challenges this. The encoder already positions new documents close to semantically related ones in the representation space. The representation side of the problem is largely solved by pretraining.

The failure lives downstream. The decoder achieves 42.3% accuracy on individual docID tokens for new documents but only 17.3% on complete docID sequences — measured as Recall@10 on NQ. The gap between those two numbers is diagnostic: the model can partially track the right document identifier but collapses before completing the full sequence. The mapping from hidden states to specific document identifiers breaks down before a retrieval can finish.

This reframes the engineering problem. Full retraining updates everything; incremental training updates everything more cheaply. But if the encoder is already doing its job and the failure is localized to decoder FFN layers responsible for docID mapping, then whole-model updates are doing a lot of unnecessary work — and potentially damaging what already functions.

---

## Why Standard Model Editing Fails Here

Model editing methods — ROME, MEMIT, AlphaEdit — were built to update factual associations in LLMs: change what the model believes about a named entity without touching unrelated knowledge. The mechanics are well-understood. The transfer to generative retrieval is not.

The core problem is structural. In factual editing, each target is distinct — the capital of France is a different fact from the population of Berlin. In generative retrieval, docIDs are shared across many queries. Multiple queries map to the same document identifier, and multiple documents share identifier tokens. When you optimize edit vectors with one-hot hard labels under these conditions, the vectors for different documents become nearly indistinguishable — pairwise cosine similarity analysis confirms high overlap among edit vectors sharing the same target token. The updates can't be told apart, so they interfere.

The consequence shows up starkly in forgetting. ROME's Recall@1 on the original corpus drops from 0.696 before editing to 0.285 after adaptation — a 59% degradation. Prior retrieval capability is effectively destroyed. AlphaEdit and MEMIT fare better but remain well below DOME on both adaptation performance and update speed. Methods that work for knowledge editing don't transfer to docID mapping without addressing the discriminability problem directly.

---

## What DOME Actually Does Differently

DOME's design follows from the diagnostic. Average patching analysis identifies layers 14–18 in T5-large as the FFN layers most responsible for docID mapping. Editing earlier layers (11–15) drops Recall@1 to 0.659; editing later layers (18–22) drops it to 0.536. The target window is specific and consequential.

Within those layers, DOME applies constrained closed-form updates — a MEMIT-style formulation — distributed across the five layers, scaled proportionally to inverse layer distance from the final target. This spreads the edit load rather than concentrating it, which matters for preserving existing retrieval behavior.

The more novel contribution is the hybrid-label adaptive training strategy. Rather than optimizing against one-hot hard labels alone, DOME mixes soft labels — the model's existing output distribution — with hard labels, using a mixing coefficient that rises linearly from 0.3 to 1.0 over 50 optimization steps. The soft labels preserve discriminability between edit vectors that pure one-hot supervision collapses. Ablation is direct about the stakes: removing soft labels drops Recall@1 from 0.686 to 0.646; removing hard labels entirely collapses it to 0.325.

Query-side signal comes from pseudo-query generation via docTTTTTquery. The number of pseudo-queries per document matters: using only one yields R@1 of 0.506 versus 0.686 with the default setting. The method requires enough query diversity to anchor the edit vectors across the range of ways a document might be retrieved.

---

## Performance and Speed: The Numbers That Matter

On NQ, DOME reaches Recall@1 of 0.686 on new documents — within 1% of full retraining at 0.693 and above the best incremental training baseline, DSI++, at 0.674. Recall@10 on new documents reaches 0.880. On MS-MARCO, Recall@10 on new documents is 0.764.

Update time per document is 2.14 seconds — 40% faster than DSI++ at 3.54 seconds, and more than five times faster than MEMIT at 12.62 seconds and AlphaEdit at 12.12 seconds. For a corpus receiving thousands of daily updates, the difference between 2.14 seconds and 12 seconds per document is the difference between a viable pipeline and one that can't keep up.

Forgetting is the metric where DOME most clearly separates from alternatives. Recall@1 on the initial corpus drops only from 0.696 to 0.692 after adaptation, yielding a forgetting score of 0.003 — the best among all methods tested. ROME's 0.285 collapse is the extreme case, but even better-behaved baselines show substantially more degradation. The hybrid-label strategy's role in preserving the original distribution appears to be the mechanism.

Performance holds across document update scales from 100 to 1,000 new documents, with initial-corpus retrieval remaining highly stable throughout. The method is also robust to docID scheme: BM25-based identifiers yield R@1 of 0.683, PQ-based yield 0.675, versus 0.686 for the default RQ scheme — differences small enough to be operationally irrelevant.

---

## Before the Next Corpus Update

The practical implication isn't that DOME is a drop-in replacement for retraining pipelines today. The method is validated on T5-large; generalizability to other GR architectures is undemonstrated. The pseudo-query generation step adds a dependency on docTTTTTquery quality. And the hybrid-label mixing schedule — 0.3 to 1.0 over 50 steps — requires tuning whose sensitivity isn't fully characterized.

What the paper does establish is a diagnostic principle with broader application: before optimizing a training procedure, locate where the failure actually occurs. In GR, the encoder isn't the problem. Whole-model retraining and incremental training both spend most of their compute on a component that doesn't need updating. Identifying the five decoder layers responsible for docID mapping and editing only those — with a label strategy designed for the discriminability problem specific to retrieval — recovers near-retraining accuracy at a fraction of the cost.

For teams running GR systems over dynamic corpora, the immediate question is whether their update bottleneck is the encoder, the decoder, or something else entirely. The answer determines whether surgical editing is the right tool. DOME's diagnostic methodology — patching analysis, representation visualization, token-level versus sequence-level accuracy decomposition — is transferable even where the specific method isn't.

*Zhang, Z., Wang, Z., Ma, X., Wang, S., Yin, D., Xin, X., Ren, P., de Rijke, M., & Ren, Z. (2026). Model Editing for New Document Integration in Generative Information Retrieval. arXiv:2603.02773*