# English-only AI reputation monitoring misses local champions in multilingual markets

AI visibility tools often assume that one English prompt can stand in for every market. This paper shows that assumption breaks as soon as you look across European languages. The same brands do not surface in the same way, and the biggest distortion is not just tone — it is which brands the model recommends at all.

The authors do not try to prove what human consumers think. They measure something narrower and more operational: how grounded LLMs construct brand reputation when the query language changes. That makes the paper useful for anyone using AI outputs as a monitoring signal, because it isolates the failure mode that matters in practice: English-only pipelines can undercount local visibility while looking perfectly “consistent” on the surface.

Across twelve languages, the outputs diverge in a structured way rather than as random noise.

---

## What the paper measures, and why that matters

The study is about AI-constructed reputation, not human reputation. That distinction matters. The authors explicitly say they are measuring properties of model outputs, and they do not claim those outputs track real-world perception one-to-one.

They queried three grounded models — GPT-5.4, Google Gemini 3.1 Pro, and Perplexity Sonar Pro — about 66 brands across eleven Northern, Baltic, and Central European home markets. The design spans twelve languages from four language families: Germanic, Uralic, Baltic, and Slavic. In total, the corpus contains 35,640 grounded responses.

Methodologically, the paper does two useful things. First, it compares cross-language narrative similarity using multilingual embeddings so it can test whether the same prompt yields the same meaning across languages without translating everything back into English. Second, it looks at recommendation share in brand-language prompts, which is closer to the operational question most monitoring teams actually care about: when the model names brands, which ones get recommended?

That framing also sets the limit of the result. Without per-market human survey baselines, the authors cannot tell whether language differences reflect true cultural differences, training-data artifacts, or both. They can still show that language materially changes the signal AI systems produce.

---

## Language changes the signal, not just the wording

The main finding is blunt: AI-constructed reputation is language-bound. Mean cross-language cosine similarity is 0.825, which is not low enough to say the outputs are unrelated, but it is low enough to show that the “same” brand discussion shifts in a measurable way when you change the language.

The pattern is even clearer when the authors compare language families. Responses in the same language family are more similar than responses across families, with mean similarity of 0.844 versus 0.820. That is a small gap on paper and a meaningful one in practice, because it suggests the differences are not just prompt noise. They track linguistic structure.

Sentiment also moves by language. Uralic and Baltic languages skew more positive, while Germanic languages — including English — are the most critical. The paper does not settle why that happens, and it does not need to in order to be useful. For monitoring, the important part is that absolute polarity is noisy, but the cross-language ordering is stable enough to matter.

In other words: if your dashboard treats English as the default reference language, you are not just changing the phrasing. You are changing the output distribution.

---

## The real blind spot is recommendation share

The most important practical effect is not how brands are described. It is which brands are recommended.

When the query moves from English to a brand’s home language, recommendation share rises by 0.80 for local champions on a 0–1 scale. For global multinationals, the same shift is only 0.15. That gap is the heart of the paper. It shows that language does not affect all brands equally; it interacts with recognition tier.

That interaction is what creates the blind spot. English-only monitoring may still “see” global brands because those brands travel well across language contexts. But locally headquartered brands are much more sensitive to whether the prompt is in their home language. If you ask only in English, you are more likely to miss the brands that matter most in a specific country or language market.

The authors’ interpretation is straightforward: the assumption behind most AI-visibility monitoring — that an English-language query gives a representative picture — does not hold in multilingual European markets. The data support that conclusion most clearly where it matters most operationally: recommendation outcomes, not sentiment labels.

---

## The structure behind the differences is stable enough to act on

The paper also asks how much of this reputation structure can be reduced to a small number of dimensions. A two-dimensional factorization explains 60.8% of the variance, with a weaker third dimension appearing at larger scale. That is not a complete map, but it is enough to say the outputs are organized, not chaotic.

Language clustering reinforces that point. The dendrogram fidelity is high, with a cophenetic correlation of 0.915. So the languages are not just scattered randomly in embedding space; they group in a way that reflects systematic similarity in the model-generated narratives.

There is one more practical detail worth noting: response stability varies more with model choice than with language. The reported mean stability is 0.935 in the companion cohort. That means model governance still matters. You cannot ignore which grounded model you use.

But the bigger lesson is that model choice and language coverage are different controls. One reduces variance from the system you query. The other reduces the blind spot created by querying in only one language.

---

## What to do about it in a multilingual monitoring stack

If you monitor brand reputation or AI visibility in multilingual markets, English should not be your only query language. At a minimum, include the brand’s home language, and better yet cover the relevant language families in your market set. The paper’s results show why: English-only pipelines systematically under-capture local champions.

You should also treat recommendation share as a first-class metric, not a side note. Sentiment alone is a weaker proxy because the polarity signal is noisy and varies by language. A brand can look “similar” across languages while still losing recommendation share in the market that matters.

The embedding approach used here is also a reminder that metric choice shapes the answer. Cross-language comparison without translation is valuable, but only if you are clear about what it is measuring: semantic similarity in model output, not truth about the brand. For teams building dashboards, that means separating measurement layers instead of collapsing them into one score.

The operational takeaway is simple. Pair model selection with language coverage planning. If you only manage one of those failure modes, you will still miss part of the picture.

*Żatuchin, D. (2026). The Language Blind Spot: How Query Language and Brand Recognition Tier Shape AI-Constructed Brand Reputation Across Twelve European Languages. arXiv:2606.23165*