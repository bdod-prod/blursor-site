# Regional Fine-Tuning Makes Indonesian LLMs More Biased, Not Less

Most bias research on large language models focuses on English, and most mitigation advice assumes that adapting a model to a specific language or culture is a neutral or positive step. A new benchmark from researchers at Mohamed bin Zayed University of Artificial Intelligence challenges both assumptions directly.

IndoBias tests LLMs for stereotypical bias in Indonesian and three regional languages — Javanese, Sundanese, and Makasar — using two separate evaluation tracks. What it finds is that the interventions practitioners most commonly reach for when localizing a model (regional fine-tuning, Common Crawl pretraining data, mixing in local-language text) each independently push bias upward. The paper doesn't just document that bias exists; it traces where it comes from.

The anchoring number: decoder models prompted in Indonesian reach prototypical win rates near 80% — Sailor2-8B-Chat hits 79.6% on Identity and Demographics prompts — meaning the model almost always assigns higher probability to the stereotypical sentence than the counter-stereotypical one.

---

## The Benchmark: Two Tracks, Four Languages

IndoBias combines two evaluation approaches that most prior work keeps separate. The first is a contrastive pairs track: 544 sentence pairs, each containing a prototypical (stereotypical) version and a counter-stereotypical version, manually curated across five bias domains and 18 subdomains, then validated by five native Indonesian speakers. A pair was kept only if at least three of the five annotators agreed on the labeling. Those 544 pairs were then translated into Javanese, Sundanese, and Makasar via GPT-5 and reviewed by native speakers, producing 4,352 total statements across all languages and trope types.

The second track is generation-based. It covers 336 Indonesian demographic groups across six categories — 81 ethnic groups, 60 government institutions, 78 names, 20 political parties, 29 religious identities, and 68 universities — and prompts models with seven task formats of increasing complexity, from simple forced choice to code functions. Scoring uses a Stereotype Polarity metric derived from the Social Progress Index, O*NET occupational data, and the Worldwide Governance Indicators, giving each model response a position on a spectrum from counter-stereotypical to strongly stereotypical.

The coverage is deliberately limited relative to Indonesia's actual scale. Indonesia has over 1,300 ethnic groups and more than 700 local languages; IndoBias represents 81 ethnic groups and three regional languages. The benchmark's authors are explicit about this gap, and it matters for interpreting results: the communities that are hardest to represent are also the ones most likely to be harmed by unexamined model behavior.

> **4,352**
> Total evaluated statements across four languages and both trope types in IndoBias-Pairs

---

## Decoder Models Are Heavily Biased; Encoders Are Not

The clearest structural finding from the contrastive track is the gap between decoder and encoder models. Decoder models — the autoregressive, generative kind — frequently exceed 70% prototypical win rates on Indonesian prompts, with Sailor2-8B-Chat reaching 79.6% on Identity and Demographics. Encoder models like mBERT and XLM-R-Base rarely cross 67%, and many stay within 10 percentage points of chance (50%). The architecture itself appears to matter: autoregressive generation amplifies stereotypical associations that masked language models partially suppress.

The language of prompting also shifts results substantially. Indonesian prompts consistently produce higher bias than regional language prompts across most categories — Sailor2-8B-Chat scores 79.6% on Indonesian Identity and Demographics prompts versus 61.3% on the same category in Javanese, an 18-point gap. The exception is Ideology and Religion, where this pattern reverses: Makasar prompts can produce higher bias than Indonesian ones, with Qwen3-8B scoring 73.5% on Makasar versus 59.2% on Indonesian in that category. The reversal likely reflects the particular salience of religious identity in Makasar cultural context, though the benchmark can't fully disentangle data artifacts from genuine cultural signal.

> **79.6%** Sailor2-8B-Chat prototypical win rate on Indonesian Identity & Demographics prompts
> **61.3%** Same model on Javanese prompts — same category, 18 points lower

---

## Regional Fine-Tuning Increases Bias Consistently

Every regionally adapted model in the study showed a net increase in prototypical bias after fine-tuning. Sailor2-8B gained an average of +6.11 points across languages compared to its base model (Qwen2.5-7B). Komodo-7B added +2.94 on average, and SeaLLM-v3-7B added +1.98. The direction is consistent across all three models — fine-tuning for regional adaptation moves the needle toward stereotypical output, not away from it.

The largest single-language increase was Sailor2-8B on Sundanese: +8.46 points. That's a substantial shift, and it points to a specific risk — fine-tuning on underrepresented languages doesn't surface nuanced cultural knowledge so much as it entrenches whatever stereotypical associations were already present in the training data. The model learns the language's surface patterns while absorbing its biases more deeply.

The effect isn't uniform. Makasar shows smaller increases than Javanese or Sundanese, which suggests the degree of amplification depends on the volume and quality of fine-tuning data available for each language. But the direction is the same across all three, which makes the consistency hard to dismiss as noise.

> **+8.46**
> Largest single-language bias increase observed — Sailor2-8B on Sundanese after regional fine-tuning

---

## Pretraining Data Source Shapes Bias Trajectory

The pretraining experiments use IndoBERT initialized from random weights and trained for 500,000 steps across six different data compositions, with checkpoints saved every 25,000 steps. This lets the researchers watch bias accumulate over training rather than just measuring the endpoint.

Common Crawl (CC-100) pretraining produces a final bias score of 0.585. Wikipedia pretraining lands at 0.555. Liputan6 news — a large Indonesian news summarization dataset — comes in lowest at 0.546. The gap between CC-100 and Liputan6 is small in absolute terms but emerges gradually and persists through the final checkpoint. Web-scraped text carries more stereotypical signal than human-edited text, and that signal accumulates.

Mixing Javanese and Sundanese into Indonesian Wikipedia pretraining consistently raises bias scores across all evaluated target languages. Adding local language data without curation transfers stereotypical associations rather than cultural richness — the model picks up the biases embedded in those texts along with the vocabulary and grammar.

One anomaly is worth noting: in the CC-100 experiments, the highest proportion of local-language data actually lowered Indonesian-language bias scores, contradicting the general trend. The relationship between data mix and bias is non-monotonic and corpus-dependent. There's no simple rule like "more local language data equals more bias" — the source and composition of that data matters as much as the quantity.

---

## Newer Models Show More Demographic Variance, Not Less

The generation track surfaces a different kind of problem. Across the six demographic categories, newer model versions consistently show higher standard deviation in Stereotype Polarity scores — meaning they treat different demographic groups more differently, not more uniformly. GPT-5 mini shows increases over GPT-4.1 mini on every category, with the largest gaps in Institutions (+5.16), Political Parties (+5.33), and Universities (+4.45). Qwen3.5-9B increases over Qwen3-8B on five of six categories, including Universities (+4.79).

This is a counterintuitive finding. Capability improvements don't flatten demographic treatment — they seem to sharpen it. A more capable model produces more extreme positive or negative associations for specific entities, which means the stakes of getting the training data right go up as models improve, not down.

The ethnic group results make this concrete. Korowai and Bajau score lower than Javanese and Sundanese on Basic Human Needs and Foundations of Wellbeing — a measurable hierarchy of model-assigned social standing that tracks real-world marginalization. The model isn't treating all Indonesian ethnic groups as equivalent; it's reproducing a social order. Presidential candidate names show a similar pattern, with one name scoring substantially lower on Opportunity and Foundations of Wellbeing than the other two (the specific names are anonymized in the paper to avoid reputational harm).

---

## What Practitioners Should Do Differently

The practical implication is that regional adaptation is not a bias-neutral operation. If you're fine-tuning a model for Indonesian or any other low-resource regional language, you should expect bias to increase — and you should measure it before and after, not just at the end. The IndoBias framework gives you a way to do that for Indonesian specifically, but the pattern likely generalizes: fine-tuning on underrepresented languages amplifies whatever stereotypical associations are in the data.

On the pretraining side, Common Crawl is the default choice for many teams because it's large and accessible. The IndoBias results suggest it's also the highest-bias option. If you have access to human-edited corpora — news archives, curated encyclopedic text — they produce lower bias at the final checkpoint. That tradeoff is worth making explicit in data sourcing decisions.

Finally, the demographic variance finding argues for auditing generation outputs at the group level, not just in aggregate. A model that scores well on average can still be producing strongly differential outputs for specific ethnic minorities, political figures, or institutions. Aggregate bias scores miss that, and the IndoBias generation track is designed specifically to surface it.

*Hanif, I. A., Azmi, M. F., Tjiaranata, F. A., Yulianrifat, E. P., & Koto, F. (2026). IndoBias: A Dual Track Culturally Grounded Benchmark for LLMs Bias Evaluation in Indonesian Languages. arXiv:2606.01260*