# LLM Fact-Checkers Score Well But Retrieve the Wrong Sources

Web access is the single biggest lever for LLM fact-checking accuracy — but which sources a model retrieves matters as much as whether it retrieves anything at all. A new benchmark built from X's Community Notes archive tests ten LLMs across 15,992 multilingual claims in politics and finance, and the central finding is uncomfortable: web-enabled models that score well may be reaching correct verdicts via sources that human fact-checkers would never use, making those systems brittle in ways aggregate scores don't reveal.

The benchmark, CommunityFact, draws on helpful Community Notes created in 2025 across five languages — English, Japanese, Portuguese, Spanish, and French — which together cover 90.1% of the helpful non-media notes in the archive. Claims are extracted from post-note pairs, labeled True or False, and held out by temporal split so the test set reflects genuinely recent content rather than anything a model might have memorized. Independent audits put label agreement at 90.3% against expert factuality judgments and 90.9% in a crowd validation on Prolific.

The gap between closed-input and web-enabled models is the paper's anchoring result: the best model with no live retrieval reaches 69.93 macro-F1, while the weakest web-enabled model clears 75.59.

---

## The Web Access Gap Is Categorical, Not Marginal

Every closed-input model in the study — regardless of size, architecture, or whether explicit reasoning is enabled — sits below every web-enabled model on the temporally held-out test split. Aya-Expanse-32B is the strongest of the closed group at 69.93 macro-F1. GPT-5-nano with web search, the weakest of the web-enabled group, reaches 75.59. The gap between them is not a rounding error; it's a structural ceiling.

The reason is straightforward: misinformation claims are time-sensitive. A model reasoning from its training weights can't adjudicate a claim about something that happened last month. The temporal split in CommunityFact is designed precisely to surface this — the test examples are the most recent in each domain-language group, so any model that happens to have seen related content during training gets no credit for it here.

At the top end, Grok-4.3 with web search reaches 83.80 macro-F1. That's a 14-point spread over the best closed-input model, and it holds across every domain-language slice Grok-4.3 was tested on — it leads every combination. The implication for deployment decisions is direct: if the claims being verified are recent, closed-input systems are not a viable option, and the question shifts to which web-enabled system and how it retrieves.

---

## Source Selection Is Where Models Diverge Most

The paper introduces a metric called domain hit-ratio: the overlap between the source domains a model retrieves and the source domains that Community Notes contributors actually cite in their helpful notes. Human raters converge on a recognizable set of authoritative sources — news organizations, government databases, specialized outlets by domain. Models vary wildly in how closely their retrieval matches that distribution.

Under open web search, Gemini-2.5-Flash has a domain hit-ratio of 0.04. Grok-4.3 has 0.62. That's a 15x spread between two models that both have web access and both score in a competitive range on aggregate macro-F1. The difference is what they're actually reading.

Gemini-2.5-Flash's retrieval is dominated by generic aggregators — google.com/search, YouTube, Reddit — that barely intersect the human reference distribution. GPT-5-nano starts at 0.13, sparse but not zero. Grok-4.3 is already pulling from human-aligned sources at baseline. This source-alignment pattern maps almost perfectly onto which models benefit from evidence-guided search and which don't, which is the paper's sharpest finding.

---

## Explicit Reasoning Is Not a Universal Fix

Enabling chain-of-thought reasoning — what the paper calls +Thinking — hurts three of the five models tested with it. Qwen3-14B drops 3.91 points (62.83 to 58.92), Qwen3-32B drops 4.53 points (65.68 to 61.15), and Gemini-2.5-Flash drops 1.04 points (68.01 to 66.97). The same mode lifts Grok-4.3 by 17.73 points (53.85 to 71.58) and GPT-5-nano by 16.72 points (38.09 to 54.81).

The pattern suggests reasoning amplifies whatever signal is already present. When a model has retrieved good evidence, thinking through it carefully helps. When the evidence is weak or misaligned — as it is for Gemini-2.5-Flash at baseline — the same process amplifies noise instead. The model reasons more confidently toward a wrong answer.

Practitioners treating +Thinking as a default upgrade should stop. It's a model-specific tunable that needs validation against held-out data before deployment. Turning it on without checking is as likely to hurt as to help.

---

## Evidence-Guided Search: Efficiency Profiles Diverge

The paper tests a second intervention: providing note-cited URLs as prioritized sources alongside general web search, so models are steered toward the same evidence trails human raters used. The aggregate results are positive for two of three models tested — GPT-5-nano gains 1.48 points (75.59 to 77.07) and Grok-4.3 gains 1.97 points (83.80 to 85.77) — but the mechanism is completely different for each.

Grok-4.3 under guidance retrieves fewer sources and gets better results. It cuts from 21.9 URLs per prediction to 13.9 — a 36% reduction in citation volume — while its domain hit-ratio climbs from 0.62 to 0.94. It was already finding the right places; guidance helps it focus rather than cast wide.

GPT-5-nano goes the other direction. At baseline it retrieves an average of 1.0 URL per prediction, and only 53.1% of its predictions include any URL at all. Under guidance, coverage jumps to 73.1% and average URLs rise to 1.4. It was evidence-starved; the note leads give it somewhere to start. Its domain hit-ratio moves from 0.13 to 0.56 — a meaningful improvement, though still well below Grok-4.3's guided baseline.

Gemini-2.5-Flash drops 0.67 points under guidance (not statistically significant), and its domain hit-ratio barely moves — 0.04 to 0.02. Providing better source leads doesn't help a model whose retrieval system isn't using them.

Slice-level reversals complicate the picture further. Even among models that gain overall, guidance hurts on specific domain-language combinations: Grok-4.3 drops 4.47 points on Spanish finance, GPT-5-nano drops 1.31 points on French politics. Aggregate improvements can mask real degradation in specific contexts.

---

## What to Do About It

The practical takeaway isn't to wait for a Community Note before verifying a claim — by the time a helpful note exists, the verification is largely done. The takeaway is about how to evaluate and monitor LLM fact-checking systems before and after deployment.

Aggregate macro-F1 is insufficient as a deployment criterion. A model can reach a correct verdict via sources that have nothing to do with why the claim is true or false, and that model will fail unpredictably when its live index shifts, when retrieval policies change, or when the claim type moves outside its training distribution. Source-alignment metrics like domain hit-ratio give you a more honest picture of whether the system is actually doing what you think it's doing.

The 15-point ceiling between closed-input and web-enabled systems means that for any fact-checking application involving recent claims, retrieval is non-negotiable — but retrieval alone isn't enough. Which sources get retrieved, and whether those sources match what domain experts would consult, determines whether the system is robust or just lucky. Auditing that alignment, not just the accuracy score, is the work that's currently being skipped.

For teams choosing between web-enabled models, the source ecosystem each model operates in is a first-order consideration. A model with a 0.04 domain hit-ratio is not doing the same job as one with 0.62, even if their headline numbers look similar. Evidence-guided search can partially compensate for misaligned retrieval — but only for models whose retrieval infrastructure can actually use the guidance.

*Singh, S., Mujtahid, I., Kan, M., & Jaidka, K. (2026). CommunityFact: A Dynamic, Multilingual, Multi-domain Benchmark for Misinformation Detection in the Wild. arXiv:2605.30241*