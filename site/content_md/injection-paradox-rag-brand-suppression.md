# Safety-trained RAG models can turn a prompt injection into brand suppression

A prompt injection in retrieved text is usually framed as a way to steer a model toward the attacker’s goal. This paper shows a nastier failure mode: in safety-trained LLMs, the injection can backfire and push the target brand below the no-injection baseline.

That matters because the failure is not just a weird one-off. The authors turn it into a reproducible recommendation problem, run it across seven models, and show that the effect can survive at the brand level even when only one document in the corpus is contaminated.

In Claude Opus 4.6, the target brand falls from a 54% baseline to 0% top-2 recommendations across 50 trials.

---

## What the paper proves in one failure: the injection can erase the target brand

The cleanest result is also the most uncomfortable one. In the main Claude Opus 4.6 setting, a single injected document flips the expected direction of attack: instead of promoting the target brand, the model stops recommending it entirely.

The paper reports a 54% baseline top-2 hit rate for the target brand. Under the Injection condition, that drops to 0% across all 50 trials. That is not a small degradation. It is a complete collapse of recommendation success.

The authors call this the Injection Paradox because the prompt injection backfires against the attacker. In stronger safety-trained models, the injected directive is treated as a safety problem, and the model responds by suppressing the very brand the attacker wanted to surface.

What makes this especially relevant for practitioners is that the failure is directional. If you are thinking only in terms of “will the attack elevate my product or suppress a rival,” this paper says the model may do something stranger: it may treat the injected brand as broadly untrustworthy and push it out of the ranking altogether.

---

## The trigger is narrow, but not narrow enough

The failure only appears when three conditions line up: the model has safety training of the Constitutional AI / normative-objective kind, at least one retrieved document contains an injection-like directive, and recommendations that involve that pattern are treated as unsafe output.

That is a useful boundary because it makes the mechanism legible. The authors are not claiming that every RAG system will behave this way. They are saying the combination of alignment and retrieved directives can change the model’s output policy in a way that is visible at the recommendation layer.

A single retrieved document is enough. In their setup, one injection-containing document in a 40-document corpus is sufficient to trigger the failure. The reproduction is also lightweight: they achieve it with roughly a 10% document-length increase from payload insertion, without changing the system prompt, decoding setup, or any other RAG pipeline structure.

For anyone running retrieval over third-party or semi-trusted content, that is the important bit. You do not need a large poisoning campaign to create a failure mode. One contaminated document can be enough to poison the brand-level outcome.

---

## Why “just remove the bad doc” is not the right mental model

The paper’s most operationally useful claim is that the effect composes at the brand level. Once the model detects an injection pattern in one document for a brand, it can suppress the remaining unmodified documents from that same brand.

That makes the failure strictly worse than a document-level cleanup problem. If the model merely ignored the contaminated document, the damage would be limited. Instead, the injected document can act like a trust poison that spills onto the rest of the brand’s corpus.

The authors treat this as a composable primitive rather than a one-off artifact. The same directional signature shows up when the operator is moved across Edifier, Apple, and Galaxy, which suggests the effect is not tied to a particular product name or a single target item.

There is a practical distinction here that matters for safety work. A document-level filter answers “is this text malicious?” The paper suggests you also need to ask “did this document make the model distrust the brand behind it?” Those are different failure surfaces, and the second one is harder to spot after the fact.

---

## How the experiment was built, and where it stops

The setup is deliberately simple: a wireless earbud recommendation task in Korean, built from 40 documents across 9 brands. The corpus was curated and edited from real blog reviews, product description pages, and expert reviews, then directly injected into the model context to simulate the generation stage of RAG.

The metric is top-2 recommendation hit rate. If the target product appears in the top-2 of the JSON ranking output, it counts as a hit. Otherwise it is a miss. The paper uses Fisher’s exact test, 95% Wilson confidence intervals, and Cohen’s d, and it runs more than 4,500 trials across seven models.

That setup gives the paper a very specific kind of strength. It isolates the generation-time behavior cleanly, so you can see the injection effect without retrieval noise getting in the way. But it also means retrieval, re-ranking, and chunking are out of scope. In a live RAG stack, those stages may dampen the effect, amplify it, or change it in ways this experiment cannot measure.

The model lineup also matters. GPT-4o-mini and Claude Haiku 4.5 were run for 100 trials per condition, while Claude Sonnet 4.6 and Claude Opus 4.6 were run for 50 trials. Within Claude, scale and alignment are confounded, so the paper cannot cleanly separate whether the observed behavior is driven more by model size or by safety configuration.

---

## What to do about it in a real RAG stack

Treat retrieved content as an integrity and availability problem, not just a relevance problem. If a single injected document can suppress a whole brand, then ingestion-time defenses matter at least as much as ranking-time defenses.

The first practical move is to harden corpus sanitization before retrieval. That means scanning documents for injection-like directive patterns, metadata-style payloads, and anything that could be interpreted as a hidden instruction rather than ordinary content. If you wait until generation time to notice it, the trust penalty may already have spread across the brand.

The second move is to make injection detection document-scoped and brand-scoped. The paper suggests that the failure is not confined to the contaminated page. Your defenses should therefore track whether one document changes the model’s treatment of sibling documents from the same source or brand.

The third move is to test for suppression, not just promotion. Many prompt-injection evaluations implicitly ask whether an attacker can make a model say “buy this.” This paper says the more important question for safety-aligned systems may be whether an attacker can make the model distrust everything tied to that brand.

That is the actionable shift: stop thinking of prompt injection only as content steering. In safety-aligned RAG, it can become a brand-level anti-promotion mechanism, and your controls need to be built for that failure mode.

---

*Paeng, H. (2026). The Injection Paradox: Brand-Level Suppression in Safety-Trained LLM Recommendations via RAG Context Injection. arXiv:2606.09204*