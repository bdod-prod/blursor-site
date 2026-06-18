# LLMs Fail Clinician Safety Checks in Most Eating Disorder Interactions — and Embed Harm Even When They Hedge

Eating disorder populations are already using general-purpose AI tools. They're asking about food, weight, calories, and restriction — sometimes disclosing their diagnosis, sometimes not. The question isn't whether this is happening; it's whether the models are doing anything useful to protect them.

This paper from the University of Aberdeen gives a systematic answer, and it's not reassuring. Three open-weight LLMs — Llama-3.1-8B, Qwen-2.5-7B, and Gemma-2-9B — were evaluated against a controlled suite of eating disorder prompts, with a subset of 268 responses annotated by a clinical specialist. The models were tested across four conditions that varied whether the user context signaled eating disorder vulnerability and whether the dietary request itself was clinically risky.

The anchoring number: only 44.7% of responses in the clinician-annotated subset were judged safe. More than half failed an ED specialist's threshold.

---

## The Core Problem: Compliance Where Compliance Is Dangerous

None of the three models consistently refuses to provide dietary advice in situations where any provision is clinically unsafe. That's not a finding about edge cases — it holds across all three models in at least some risky configurations. The models are, in the most literal sense, not doing the thing safety tuning is supposed to make them do.

The failure mode that appears most often isn't a model confidently dispensing calorie targets. It's subtler: the model opens with a safety-oriented disclaimer — something about consulting a professional, or noting that everyone's needs are different — and then proceeds to deliver exactly the actionable dietary content the disclaimer was meant to precede. The disclaimer functions as cover, not as a gate. Clinician review of the annotated responses found this pattern repeatedly, with examples showing models naming specific calorie ranges and restriction strategies in the same response that acknowledged the user's vulnerability.

Up to 30% of responses to requests that carried no explicit risk signal — neutral context, neutral request — were still judged unsafe by the clinician. That's the baseline. In the highest-risk condition, where the user has disclosed an eating disorder and the request is explicitly about dietary restriction, Qwen's advice-providing responses were judged unsafe 68.2% of the time.

Refusals, when they do occur, are reliable: clinicians rated 100% of full-refusal responses as safe. The problem isn't that refusal is imperfect. The problem is that refusal is inconsistently triggered — and the conditions under which it fails are exactly the conditions where it matters most.

---

## Food Noise: Harmful Content Embedded in Ostensibly Safe Responses

The paper introduces the term "food noise" for a specific phenomenon: lexical content in LLM responses — calorie counts, restriction cues, diet-culture language, timing expressions — that is clinically contraindicated for eating disorder populations, regardless of whether the response as a whole appears to comply or hedge. Nearly all responses that provide any dietary content contain it.

The clearest driver is whether the user's request mentions calories. When it does, food-noise prevalence reaches 100% for Qwen and near-total for the other models, even when the user context signals vulnerability. The model's sensitivity to the request framing overrides whatever risk signals it has picked up from the user's disclosure.

Gemma is the most risk-sensitive of the three models, and its food-noise density does drop substantially when context risk is high — from 8.864% token-level density in the neutral condition to 0.969% in the highest-risk condition. But the composition of what remains is telling: diet-culture descriptors account for 35% of the food noise in Gemma's risky-context responses, and restriction cues account for 23%. The volume decreases; the kind of harm doesn't change. A response can contain far less food noise and still be clinically dangerous if what remains is the most harmful category.

For Llama, the density doesn't decrease meaningfully at all — 9.442% in the neutral condition, 0.484% in the risky condition on average, but without a statistically significant reduction. The model's food-noise output is largely insensitive to the risk signals in the prompt.

---

## Uneven Protection: Gender Identity and Disorder Type Drive Safety Gaps

Safety behavior isn't uniform across the populations most at risk. The study varied persona gender markers across prompts and found that Llama's no-refusal rate for nonbinary personas is 53.4%, compared to 32.8% for men. Nonbinary individuals face elevated clinical risk for eating disorders relative to the general population — the model is providing more unguarded responses to the demographic that needs more protection, not less.

The pattern holds across disorder types. Llama refuses 82% of the time for anorexia nervosa prompts but only 41% of the time for binge eating disorder prompts. Orthorexia, a less widely recognized term, shows weaker protection across models. The implication is that safety behavior is calibrated to cultural familiarity — how well-known a disorder is in public discourse — rather than to clinical risk level. Anorexia nervosa is the disorder most people have heard of; it gets the strongest guardrails. Binge eating disorder is the most prevalent eating disorder in the US; it gets weaker ones.

This isn't a subtle statistical artifact. A 17.8% no-refusal rate versus a 59.2% no-refusal rate for the same model, varying only the disorder type named in the prompt, is a large and clinically meaningful gap. Someone asking about food and weight while disclosing binge eating disorder is substantially more likely to receive unguarded dietary advice than someone disclosing anorexia nervosa.

---

## Model Differences and the False-Authority Exploit

The three models occupy distinct positions on the compliance-refusal spectrum, and the gaps between them are large enough to matter for deployment decisions.

Qwen is the most compliant. In the neutral-context, neutral-request condition, it provides dietary advice without refusal 100% of the time. Add a false claim of professional authority — a prompt framing that says the user is a doctor — and Qwen's no-refusal rate in that condition reaches 94.1%. The model cannot verify the claim, but it responds to it. That's a social engineering vector that requires no technical sophistication: just claim credentials.

Gemma responds to the same false-authority framing by refusing 97.3% of the time. It is substantially more robust to this manipulation. But Gemma still fails: 31.8% of its advice-providing responses in the highest-risk condition were judged unsafe by the clinician. The most risk-sensitive model in the study does not achieve consistent safety.

Llama sits between the two — more sensitive to risk signals than Qwen, less consistent than Gemma at its best, and showing the largest disparities across gender and disorder type.

The study evaluated only open-weight models in the 7–9B range, without system prompts or role instructions, in single-turn interactions. Closed commercial systems and models with more elaborate safety scaffolding may behave differently. But the finding that a simple authority claim can push Qwen's compliance rate to 94% suggests that prompt-level interventions alone are not a reliable safety layer — and that any deployment context where eating disorder populations might be present needs to treat default safety tuning as a starting point, not a solution.

---

## What This Means for Deployment

The practical implication isn't that these models should never be used near eating disorder populations. It's that the current state of their safety behavior is not fit for that purpose without additional intervention — and that the interventions need to be targeted.

The refusal mechanism works when it fires. A 100% clinician-safe rate on full refusals means the goal state is achievable; the problem is getting models to reach it consistently. That points toward system-prompt-level instructions that explicitly name eating disorder contexts as requiring refusal rather than hedged compliance, and toward testing those instructions against the specific failure modes documented here: the disclaimer-then-comply pattern, calorie-mention triggers, and false-authority framings.

The disorder-type and gender disparities suggest that safety evaluations for these contexts need to go beyond aggregate pass rates. A model that refuses 82% of the time for anorexia nervosa prompts and 41% of the time for binge eating disorder prompts has a safety gap that an overall refusal rate would obscure. Disaggregated evaluation — by disorder type, by gender marker, by request framing — is the only way to find where the protection is actually thin.

Food noise is harder to address because it shows up even in responses that appear to hedge. Filtering for the presence of calorie counts, restriction language, and diet-culture terms in outputs — before they reach users — is a more tractable intervention than trying to get models to spontaneously avoid this content in every configuration.

*Pucci, G., Hemendinger, E., Li, R., Abercrombie, G., Dinkar, T., & Sinclair, A. (2026). Food Noise & False Safety: A Systematic Evaluation of How LLMs Fail to Adapt to Eating Disorder Queries with Clinician Feedback. arXiv:2606.02444*