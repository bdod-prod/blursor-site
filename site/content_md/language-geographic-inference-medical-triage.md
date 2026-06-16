# An LLM Medical Triage System Gave Zero ER Referrals in Japanese and 30% in English — for the Same Symptoms

When a patient describes persistent headache, blurred vision, morning nausea, and visual disturbances, the clinical picture is the same regardless of what language they use. A model evaluating that symptom profile should route them to care based on what they're describing, not how they're describing it. A new study shows that's not what happens.

Researcher Qi Han Wong ran the same neurological symptom scenario through Gemini 3.5 Flash in six languages — English, Spanish, Chinese, Hindi, Japanese, and Arabic — with no location context provided. The model assigned severity scores between 7.7 and 8.0 out of 10 across all six languages. The clinical reasoning it produced was nearly identical: intracranial pressure risk, papilledema, need for MRI. But the action it recommended varied dramatically.

The ER recommendation rate ranged from 0% for Japanese and Hindi to 30% for English and Arabic — a 30-percentage-point gap, driven entirely by language, invisible in the model's own stated rationale.

---

## The Disparity: Language Changes the Recommendation, Not the Diagnosis

The core finding is stark. Across 30 runs per language, a 38-year-old patient presenting with the same neurological symptoms received an ER referral in 9 out of 30 English runs and 0 out of 30 Japanese or Hindi runs. The model's reasoning field, in every case, described the same clinical concern — yet the recommended action diverged completely.

This isn't a translation artifact. Wong tested that directly: the Japanese prompt was translated into English by the same model, then triaged. The back-translated version produced a 36.7% ER rate, with a confidence interval almost entirely overlapping the English baseline of 30%. The content, once rendered in English, triggered English-level triage. The language itself was doing the routing.

Spanish (13.3%) and Chinese (20%) fell in the middle, with confidence intervals wide enough that they can't be statistically distinguished from either the high or low groups at n=30. But the endpoints — 0% versus 30% — are clear, and the mechanism connecting them is consistent across all six languages.

---

## The Mechanism: Language as a Geographic Proxy

The model appears to infer a patient's country from the language of the query, then apply the healthcare norms of that country. English maps to US defensive medicine. Japanese maps to a clinic-first pathway. Hindi maps to conservative triage. None of this is stated anywhere in the model's output — it shapes the recommendation silently.

Wong tested this by adding a single sentence to each non-English prompt specifying that the patient was located in the United States. The effect was immediate and large. Chinese-language prompts jumped from 20% to 96.7% — a 76.7 percentage-point increase. Hindi went from 0% to 73.3%. Japanese from 0% to 46.7%. Arabic, already at 30%, climbed to 90%.

English prompts, given the same US anchor, shifted only 10 percentage points — from 30% to 40% — a change that isn't statistically significant. The model was already assuming a US context for English queries. The anchor confirmed what it had already inferred.

---

## The Reverse Effect: Anchoring English to Tokyo or Mumbai

The mechanism works in both directions. When an English prompt was given a Tokyo location anchor, ER recommendations dropped from 30% to 6.7% — nearly matching the Japanese baseline. A Mumbai anchor reduced them to 0%, matching the Hindi baseline exactly.

This bidirectionality rules out a simpler explanation — that the model is just more cautious in English, or that non-English prompts are somehow less clinically legible. The model is adjusting its triage pathway to match the inferred healthcare system, and it does so consistently whether the anchor pushes the rate up or down.

The clinical consequence is direct. A patient describing the same neurological symptoms could receive an ER referral or a clinic appointment based solely on which language they used to ask. The model's severity assessment doesn't change. Its reasoning doesn't change. Only the action does — and the action is what determines whether the patient goes to an emergency room.

---

## What This Study Can and Cannot Establish

The study tests one model, one symptom scenario, and 30 runs per condition. That's enough to detect effects of this magnitude — a 30-point gap is not subtle — but it's not enough to generalize. Cross-model replication across GPT-4, Claude, and open-weight models is the obvious next step, and the results may differ across model families trained on different corpora.

There's also no human clinician baseline. Without knowing what a Japanese emergency physician or a US emergency physician would recommend for the same presentation, it's not possible to say which language's triage rate is correct — only that they diverge, and that the divergence is driven by implicit geographic inference rather than clinical judgment.

The prompts were manually authored to match native phrasing conventions rather than machine-translated, which is methodologically careful. But they weren't independently verified by medical professionals or native speakers, so subtle pragmatic differences in how symptoms are described across languages could contribute to the observed disparity. The system prompt was always in English, which may introduce its own asymmetry for non-English queries.

What the study does establish clearly is the mechanism: language functions as a geographic proxy, the geographic inference shapes care recommendations, and the inference is invisible in the model's own output. That structure is plausible across any model trained on geographically skewed data — and it's correctable.

---

## What to Do About It

The fix Wong demonstrates is simple in principle: make the geographic assumption explicit rather than implicit. A single sentence specifying patient location collapsed most of the disparity in this study. That's a low-cost intervention, but it requires knowing the problem exists in the first place.

For anyone deploying an LLM triage or clinical decision-support tool to a multilingual population, the practical implication is that the model is not language-neutral. It is implicitly geography-aware, and it will apply different care pathways to patients based on the language they use — without flagging that it's doing so. System prompts that specify the care context explicitly, or that include patient location as a required field, are the most direct mitigation.

The deeper issue is that the model's reasoning output doesn't surface this. A clinician reviewing the model's rationale would see consistent clinical logic across languages and have no indication that the recommended action was being modulated by an inferred geography. Audit processes that check only for clinical accuracy in the reasoning field will miss this class of disparity entirely.

*Wong, Q. H. (2026). Implicit Geographic Inference in LLM Medical Triage: Language-Driven Disparities in Emergency Recommendations. arXiv:2606.01204*