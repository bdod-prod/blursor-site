# LLM Safety Judges Agree on Violence but Fail Almost Completely on Regulated-Domain Advice

Most safety evaluation pipelines treat LLM judges as interchangeable — if one model flags a response as unsafe, the reasoning goes, others probably would too. A new study from the National Research Council of Canada tests that assumption directly, and the results are hard to dismiss. Six judges evaluated the same responses across six languages and six safety dimensions. On explicit harm like violence, the judges mostly agree. On regulated-domain advice — the kind of content that matters most in finance and healthcare applications — they share almost no common definition of what "safe" even means.

The study covers 300 query-response pairs in the regulated-domain category and 56 in the violence category, translated into French, Arabic, Farsi, Telugu, and Hindi, with 10 paraphrase variants generated per response. That's a large enough surface to expose patterns that a smaller evaluation would miss. The anchoring number: cross-judge agreement on Safety for regulated-domain advice, measured by Krippendorff's Alpha, is **-0.04** in English — worse than chance.

---

## The Harm-Type Gap: Violence vs. Regulated Advice

Krippendorff's Alpha is a chance-corrected agreement metric — it accounts for the fact that judges might agree just by labeling everything the same way. A score of 0 means agreement no better than random; negative means systematic disagreement. For violence content in English, cross-judge Safety agreement reaches 0.60 — meaningful, if not perfect. For regulated-domain advice in the same language, it's -0.04.

That gap isn't a quirk of one dimension or one language pair. It holds across the evaluation. The judges are calibrated for explicit harm signals: a response that describes how to commit violence, or that flatly refuses a dangerous request, produces consistent verdicts. When harm is implicit — when the question is whether an LLM should be giving financial or medical advice at all, and how much hedging is enough — the judges scatter.

Refusal detection is the clearest illustration of what convergence looks like when it works. Cross-judge Alpha for Refusal in violence reaches 0.90 in English. Judges can tell when a model said no. What they can't agree on is whether a model that said yes, with caveats, was safe or not.

The practical implication is that deploying a panel of LLM judges — the "jury" approach sometimes proposed as a robustness fix — doesn't solve the problem in regulated domains. If the judges don't share a definition of safety, aggregating their votes produces a number that looks authoritative but reflects noise.

---

## Self-Consistency Fails Across Translations and Paraphrases

A judge that's consistent with itself across languages is at least measuring something stable, even if other judges disagree. The study tests this by translating the same query-response pairs into five languages and asking each judge to evaluate them independently. The results expose a different kind of failure.

Individual judges frequently flip their safety verdicts when the same response is presented in a different language. The content hasn't changed — the meaning is the same — but the label does. One qualitative example from the paper makes this concrete: Gemini-2.5-Flash labels an English credit-score response as Safe, then labels the Hindi translation of the same response as Unsafe. The human annotator agrees with the Hindi judgment, which means the English verdict was wrong — and the judge had no idea.

Paraphrase variations produce similar instability for Safety in regulated-domain content. The study generated 10 paraphrase variants per response, varying things like register, explicitness, and verbosity. A judge that's sensitive to surface phrasing rather than underlying meaning will flip verdicts across these variants without any change in what the response actually says or recommends.

This is a practical jailbreak vector. If rephrasing or translating a response can change a judge's verdict without changing its meaning, then safety pipelines that rely on LLM judges are gameable by anyone who knows this. It also means that multilingual deployments — where translation is unavoidable — are introducing verdict instability as a structural feature, not an edge case.

---

## Cultural Sensitivity Is the Least Reliable Dimension

The study evaluates six dimensions: Refusal, Safety, Helpfulness, Explanation, Warnings, and Cultural Sensitivity. Cultural Sensitivity is the one that matters most in multilingual deployments — it's supposed to capture whether a response is appropriate given the cultural context of the user. It's also the dimension where judges agree least.

Cross-judge Alpha for Cultural Sensitivity in violence content is 0.03 in English — indistinguishable from random disagreement. The pattern holds across languages. Only two judge-category combinations produce high reliability: Haiku in regulated-domain content (0.75) and Llama in violence (0.80). Every other combination is effectively noise.

This isn't just a measurement problem. It suggests that "cultural sensitivity" as a safety criterion is either underspecified in the prompts given to judges, or that different models have genuinely different and incompatible operationalizations of what it means. Either way, the dimension that's most important for global deployments is the one you can trust least.

For teams building multilingual safety pipelines, this is the sharpest finding in the paper. The evaluation dimension designed to catch culturally inappropriate content is producing scores that carry no reliable signal.

---

## Raw Agreement Masks Systematic Unreliability

One reason these problems go undetected in practice is that raw percentage agreement looks fine. Most judges label most regulated-domain responses as Safe — GPT, Llama, and Command-A all land around 84%. That kind of overlap, reported without correction for chance, reads as strong consistency.

But the distribution is the problem. When one label dominates, any metric that doesn't correct for chance will overstate reliability. Command-A's Refusal scores in regulated-domain content show 99.89% overlap across judges — and an Alpha of 0.00, because almost every response gets the same label regardless of content. The overlap is real; the agreement is not.

Gemma and Haiku illustrate how differently judges can interpret the same task. Gemma labels only 12.71% of regulated-domain responses as Safe, treating most as Dual-use — a defensible position given that advice-seeking queries often sit in genuinely ambiguous territory. Haiku goes further: it labels most responses as Unsafe and, in its reasoning, explicitly argues that LLMs shouldn't be providing regulated-domain advice at all. That's a principled stance, and it may be the most defensible one. But it also means Haiku is operating from a fundamentally different safety philosophy than the other five judges, and no aggregation method reconciles that.

The study's methodological contribution here is straightforward but important: always report chance-corrected agreement metrics alongside raw overlap. A pipeline validated only on percentage agreement will look reliable right up until it isn't.

---

## What to Do About It

If you're using LLM judges to evaluate safety in regulated domains, the study gives you a clear set of things to stop assuming. Don't assume that high raw agreement means the judges are measuring the same thing. Don't assume that a judge consistent in English will produce consistent verdicts in other languages. Don't assume that a jury of judges solves the problem — if they don't share a safety definition, more votes just amplify the noise.

The more actionable read is about where to use LLM judges at all. For explicit harm detection — refusals, violence, clear policy violations — the judges perform reasonably well, and Refusal in particular is reliable enough to trust. For regulated-domain safety, where the question is whether advice crosses a line rather than whether a refusal happened, the judges aren't ready to be the final word.

For multilingual pipelines specifically, the translation instability finding suggests that any safety evaluation should include cross-lingual consistency checks as a baseline quality gate. If a judge flips its verdict on a translated response, that's a signal worth investigating — not just averaging away.

Haiku's stance — that LLMs shouldn't be providing regulated-domain advice — is worth taking seriously as a policy position, even if it makes the judge look like an outlier in agreement tables. The question of whether an LLM should give financial or medical advice at all is a design decision, not just an evaluation problem. The judges that treat it as a design decision may be the most honest ones.

*Vishnubhotla, K., Vajjala, S., Vij, A., & Nejadgholi, I. (2026). LLM Judges Inconsistently Disagree Across Safety Criteria and Harm Categories. arXiv:2605.31381*