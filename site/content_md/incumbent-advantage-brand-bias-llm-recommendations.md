# Incumbent brands get a built-in advantage in LLM recommendations — but only until a competitor clears a narrow threshold

LLM recommenders do something that looks a lot like a brand moat. When product specs are identical, the familiar brand is not just preferred — it is effectively locked in. But the paper’s more useful finding is that this dominance is brittle. A small factual edge, like a slight rating lift, can flip the outcome, and authority-heavy marketing language can do the same even when the product itself has not changed.

That matters because it shifts the question from “Do LLMs like big brands?” to “What exactly breaks their default preference, and how much does it take?” The answer is more operational than philosophical. In a controlled setup across GPT-4o-mini, Claude Sonnet, and Gemini 3 Flash, the authors show that brand effects show up most strongly when the model has to resolve ambiguity among otherwise similar products.

The anchoring number is simple: with identical specs, the real brand is recommended in 100% of valid trials.

---

## LLMs don’t just favor incumbents. They give them a conditional monopoly

The paper’s core term is “Conditional Monopoly,” and it fits the behavior pretty well. In the cleanest experiment, all 10 skincare products have identical specifications, and the only difference is the brand name. Under that setup, the real brand is recommended in 100% of 670 valid trials, which the authors translate into an Incumbent Advantage Index of 10.0 — the theoretical maximum.

That is a stronger result than “brand matters.” It says that, in a tie, the model is not balancing identity against features; it is defaulting to the incumbent with complete consistency. For practitioners, that means brand recognition is acting like a tie-breaker with very high confidence, not a small nudge.

The important part is the shape of the effect. The advantage is not linear. It holds until a competitor crosses a narrow threshold, and then it falls apart quickly. That is why the paper frames the result as a step function rather than a smooth preference curve.

---

## Product facts explain most of the behavior, but brand still gets a small independent push

The authors try to separate brand from everything else the model might be using as a cue. In the variance decomposition, product parameters — rating, price, and reviews — explain 82.4% of the variance. List position explains 6.5%. Brand identity explains only 1.2%.

That split is useful because it keeps the result from being oversold. The model is not acting like a pure brand-loyalty machine. It is mostly responding to product signals, with brand identity showing up as a small residual force.

But “small” is not the same as “irrelevant.” In the equal-spec setting, brand identity is enough to decide the outcome every time. So the practical read is not that brand dominates all decisions, but that it becomes decisive when the rest of the field is flat.

---

## A small factual edge can flip the recommendation

Once the competitor is no longer perfectly tied, the incumbent advantage starts to crack. The paper reports that the dominance disappears with just a +0.1-star rating advantage for a competitor. More precisely, the 50% breakthrough thresholds are a +0.075-star rating advantage, a review-count advantage, or a 7.3% price discount.

Those are small numbers. That is the main takeaway. In a recommendation environment like this, you do not need a huge product lead to beat the incumbent. You need enough of one to push the model over the decision boundary.

The paper’s Exp 1b makes the same point from the other direction. The brand-only advantage is not enough to overwhelm a clearly better fictional product: the brand override rate is only 1.7% to 4.6% across subcategories, and when the fictional brand is clearly better, the model recommends it about 96% of the time. So the incumbent moat is real, but it is not a wall.

---

## The strongest “marketing” effect is really a credibility effect

The paper separates five bias strategies into two groups. Authority and Social Proof behave very differently from Anchoring, Scarcity, and Loss Aversion. Credibility biases — Authority and Social Proof — achieve 50% to 73% breakthrough rates, while the classic marketing-style biases stay at 10% to 13%.

That distinction matters. The model is not equally swayed by every persuasive trick. It responds much more to signals that look like legitimacy, expertise, or collective validation than to scarcity framing or anchor-setting.

The authors make this even sharper by translating authority language into a Bias Surplus Value. Authority-style marketing language, including fabricated clinical-evidence claims, breaks the monopoly at a BSV equal to +0.17 rating points. In other words, the model seems willing to treat credibility language as though it were a real product improvement.

---

## The size of the effect depends on the strategy, not just the content

The paper’s two-tier pattern is one of its most actionable findings. The clustering bootstrap lower bound for Authority is 58.9%, which exceeds the Anchoring upper bound of 21.1% with no overlap. Social Proof sits in the same high-breakthrough tier. Anchoring, Scarcity, and Loss Aversion stay low.

So if you are thinking in terms of optimization, the choice of strategy matters more than the amount of persuasion. A weak authority cue is still materially more powerful than a stronger scarcity cue. That is a useful correction for anyone assuming that “marketing language” is a single bucket.

It also helps explain why the model’s behavior can look inconsistent if you only test one kind of prompt manipulation. The effect is not random; it is stratified. Some cues act like credibility shortcuts, and others do very little.

---

## The bias survives a robustness check, but the authors are careful about scope

The main experiments are in skincare, which the authors correctly treat as an experience-good category. That matters because quality is hard to inspect before purchase, so brand reputation is naturally more salient. They also run a robustness check on two search-good categories — USB-C charging cables and AA batteries — and the Conditional Monopoly plus step-function transition replicate there.

That said, the paper does not overclaim. Experiments 2 and 3 were not tested on search goods, so the authority-language result may not carry over cleanly. The authors also note that whether authority-style language has the same Bias Surplus Value in search-good categories is still open.

The RAG probe adds one more layer. Using OpenAI text-embedding-3-small, cosine similarity, and 1,080 calls, the authors find that under RAG-K5 S0 the real brand ranks 8.50/10 in embedding similarity and the incumbent-switch rate drops to 0.0%. That does not prove commercial RAG systems behave the same way, but it does suggest that retrieval context can materially shape the same bias pattern.

---

## What this means for anyone trying to win in LLM recommendations

The practical lesson is not “build a famous brand” or “stuff prompts with authority language.” It is more specific than that. If your product is already the incumbent, the model is likely giving you a default advantage when specs are close. If you are trying to displace an incumbent, you probably do not need a dramatic lead — you need a narrow but legible edge in rating, reviews, or price that clears the model’s threshold.

If you are doing content or search visibility work, the more interesting implication is that credibility signals are not interchangeable with generic persuasion. Authority and social proof behave differently from scarcity or anchoring. That means the copy, citations, and proof structure around a product may matter more than the usual “make it sound urgent” playbook.

And if you are building or auditing an AI recommender, this paper is a reminder to test ties explicitly. The bias is most visible when the model lacks a clean reason to choose. That is exactly where default priors, brand familiarity, and authority language can quietly take over.

*Chu, X., & Hou, Y. (2026). Incumbent Advantage: Brand Bias and Cognitive Manipulation Dynamics in LLM Recommendation Systems. arXiv:2606.17443*