# One Polluted Page Is Enough to Hijack LLM Recommendations

Search-augmented recommender systems are starting to behave like a new kind of shopping assistant: they pull in live web evidence, then turn that evidence into a product suggestion. That makes them useful, but it also gives an attacker a very small surface to work with. If the retrieved pages are poisoned upstream, the model is no longer just reading the web — it is learning from whatever the web has been rewritten to say.

This paper looks at that failure mode directly. The authors introduce FORGE, a benchmark built to test fake-product promotion under controlled web-content pollution. Instead of relying on vague prompts or abstract jailbreaks, FORGE rewrites real products inside retrieved pages into fake ones and checks whether the model recommends the fake entity. The important detail is that the retrieval evidence is frozen per query, so the only thing changing is the pollution itself.

225 products.

## What web content pollution breaks in generative recommenders

The core problem is simple: retrieval-augmented recommenders do not just answer from memory. They read live web pages, and those pages can be manipulated before the model ever sees them. If the model treats that retrieved text as trustworthy evidence, then a polluted page can steer the recommendation even when the clean version of the same bundle would not.

FORGE is designed to make that visible. For each query, the benchmark issues a live web search, reviews the first documents that pass quality checks, and freezes that evidence bundle across attack conditions and across models. That means differences in output are not coming from retrieval drift or a different search result set. They come from the pollution simulation itself.

The benchmark stays close to the real task while still being controlled. It covers 225 real-world products across 15 categories and 5 consumer scenarios, and it tests 12 commercial and open-weights LLMs. The attack styles range from entity replacement to passage injection to full synthesis, but the headline result does not depend on a fancy adversary. Even a local rewrite of the retrieved evidence is enough to expose the weakness.

---

## A single polluted page can already steer the answer

The sharpest result is the one that should worry anyone building search-augmented product recommenders: a single polluted page yields fooled rates of up to 27%. That means one manipulated retrieved document can be enough to get the model to recommend the fake product instead of the real one.

When the attack gets broader and replaces the full top-3 candidate entities across retrieved pages, fooled rates jump to 73.8%. That is not a small increase. It says the model is not merely glancing at a noisy source and then recovering through reasoning. In these conditions, the polluted evidence dominates the recommendation.

The vulnerability is not uniform. The paper reports per-model fooled rates spanning 13.3%–73.8% under top-3 replacement, which tells you the failure mode is not confined to one model family or one product niche. But the direction is consistent across all 12 tested models: once the retrieved pages are poisoned, the recommendation output follows them.

The authors also make a point that matters for interpretation. Their attack design is not optimized. They say a motivated adversary could combine domain-tailored templates, query-aware paragraphs, and adversarial-SEO techniques they do not study. So these numbers should be read as lower bounds, not ceiling estimates.

---

## Why the weakest categories are the everyday ones

The category pattern is not what you might expect if you assume technical competence protects the model. The most exposed categories are everyday-consumption items such as dining, personal services, and supplements. The least exposed are technical-product categories such as smartphones, laptops, and home appliances.

That difference lines up with a simple intuition: vulnerability rises when the model lacks stable prior knowledge of the relevant products. When it does not already “know” the space well, it leans harder on retrieved text. In other words, uncertainty makes the model more obedient to the evidence bundle, even when that bundle has been polluted.

This is useful because it tells practitioners where the risk is largest. If your retrieval-augmented recommendation flow covers domains where product knowledge is weak, unstable, or rapidly changing, the model is likely to be more dependent on whatever the search layer hands it. The web content is not just context in that setting. It is the decision surface.

---

## Why reasoning and guardrails do not save you here

One of the paper’s most practical findings is also one of the most inconvenient: reasoning does not mitigate the vulnerability. Instead, it often generates spurious social proof to justify false recommendations. So the model does not simply refuse to be fooled. It can explain the wrong answer with confidence.

Skepticism is not a clean fix either. The authors find that skepticism can exacerbate vulnerability, much like reasoning, while filtering risks suppressing legitimate products. That is the trap with naïve defenses: they often trade one failure mode for another. If you make the model doubt the evidence too aggressively, you can lose valid recommendations along with the poisoned ones.

The implication is that prompt-level cleverness is not enough. If the retrieved web page is treated as a trusted source by default, then the model’s internal reasoning can become a justification engine for bad evidence. Guardrails that only ask the model to “think harder” may actually make the output look more legitimate while leaving the underlying vulnerability intact.

---

## What practitioners should do with this

Treat retrieval evidence as adversarial input, not neutral context. That is the practical shift this paper points toward. If a recommender can be steered by a single polluted page, then defenses have to focus on verifying evidence and constraining how much trust the model places in retrieved pages.

That means the safer design choices are likely to live around the retrieval layer, not only inside the generation layer. Evidence provenance, source diversity, cross-checking, and resistance to upstream content tampering matter more than another round of prompting tricks. If you are building product recommendations on top of live web search, the question is not just whether the model can reason. It is whether the evidence it reasons from has been poisoned.

The paper also gives a realistic warning about evaluation. Its main results are Chinese-language, the Local Life scenario is fixed to Shenzhen, and evidence bundles are frozen at a single retrieval snapshot from 2026-04. So you should not assume the exact per-category rates transfer unchanged to other languages or regions. But the failure mode itself is hard to ignore: all 12 models are vulnerable, and the vulnerability does not track familiar capability dimensions.

The safest takeaway is not “use a better model.” It is “assume the web can lie to your recommender, and design for that from the start.”

*Luo, M., & Chen, L. (2026). One Polluted Page Is Enough: Evaluating Web Content Pollution in Generative Recommenders. arXiv:2606.13610*