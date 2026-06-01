# No LLM Verifies Even Half the Citations It Generates

A paper from New York University, published in March on arXiv, examines what happens to LLM citation quality when real-world deployment constraints are applied — date windows, non-disclosure rules, survey-style formatting, and combinations thereof. Prior work on citation hallucination has largely tested models in unconstrained settings, which is not how they get deployed. Retrieval-augmented systems, enterprise assistants, and research tools routinely impose temporal filters, confidentiality restrictions, or output format requirements. This study treats those constraints as experimental variables rather than background conditions.

The design is systematic: four models — Claude Sonnet, GPT-4o, LLaMA 3.1–8B, and Qwen 2.5–14B — prompted across five conditions (Baseline, Temporal, Non-Disclosure, Survey, and a combined Combo) against 144 question-style claims spanning six academic domains. The automated verification pipeline cross-references Crossref and Semantic Scholar using weighted metadata similarity, producing a three-way label: Existing, Unresolved, or Fabricated. A 100-citation manual audit against Google Scholar and DBLP validates the pipeline at 75% overall agreement and a Cohen's kappa of 0.63.

The number that frames everything else: across 17,443 citations generated in this study, no model under any condition verifies a majority of its citations. The peak existence rate in the entire dataset is 0.475.

---

## The Ceiling Is Already Low at Baseline

Before any constraint is applied, the best-performing model — Claude Sonnet — verifies 38.1% of its citations. GPT-4o reaches 23.5%. Both open-weight models start near the floor: LLaMA 3.1–8B at 6.8%, Qwen 2.5–14B at 9.0%. These are baseline numbers, no restrictions attached.

The gap between proprietary and open-weight models is not marginal. It persists across every condition and every domain tested. In the SE & CS domain group — 24 claims, 2,926 citations — Claude Sonnet reaches an existence rate of 0.349 while both open-weight models stay below 0.10. Social Sciences posts the highest domain-level existence rate at 0.187; the cross-domain average is 0.120. Neither number suggests a system that can be trusted to generate accurate references without verification.

The paper cannot fully disentangle model scale from the proprietary–open-weight distinction — larger models are presumably better trained and better resourced. But the practical implication is independent of the mechanism: open-weight models at current sizes are not reliable citation generators under any tested condition, and the proprietary–open-weight distinction appears to be a stronger predictor of citation quality than any single prompting constraint.

---

## Temporal Constraints Are the Single Biggest Wrecker

Asking models to cite only sources from a specific time window produces the steepest single-condition drop in the study. Claude Sonnet falls from 0.381 to 0.119. GPT-4o collapses from 0.235 to 0.019. The open-weight models, already near zero, decline further.

The mechanism is not that models ignore the date rule. Direct temporal violations — citations that explicitly break the stated date constraint — are almost nonexistent, ranging from 0.001 to 0.026 across models under the Temporal condition. Models obey the constraint. They simply cannot produce verifiable references that satisfy it, so they generate citations that look temporally compliant while being unresolvable or fabricated.

This is the failure mode that format-level compliance checks miss entirely. A system auditing for date-rule adherence would pass nearly all of these citations. The surface looks correct. The underlying reference does not exist, or cannot be confirmed to exist. For any deployment that uses temporal filters to ensure currency or scope — which is common in enterprise and research contexts — this finding is directly operational.

---

## Combining Constraints Produces Near-Total Collapse

The Combo condition stacks temporal restrictions, non-disclosure instructions, and survey-style formatting simultaneously. Three of four models reach existence rates near zero: GPT-4o at 0.005, LLaMA 3.1–8B at 0.008, Qwen 2.5–14B at 0.001. Only Claude Sonnet retains a non-trivial existence rate of 0.106 — itself a number that means roughly nine in ten citations are unverifiable or fabricated.

The volume pattern runs in the opposite direction. Under Combo, models generate 7.4 to 8.0 citations per claim on average — more references, not fewer, precisely as verifiability erodes. Confidence in output format does not track confidence in output accuracy.

Non-disclosure instructions alone produce a subtler effect. Existence rates decline only marginally, but DOI completeness drops, pushing citations from the Existing category into Unresolved — shifting failures from obviously wrong to hard to detect. The errors don't disappear; they become less visible.

---

## The Unresolved Category Masks Additional Fabrications

Across nearly every model-condition cell in the study, Unresolved citations — those the automated pipeline cannot confirm or deny — account for 36 to 61% of all citations. It is the dominant outcome category, not a marginal one.

The manual audit of 35 Unresolved citations found that 16 — 46% — were actually fabricated. The pipeline's precision for the Unresolved label is 0.43, making it the least reliable of the three labels. By contrast, precision for Existing is 0.97 and for Fabricated is 0.88. The system is good at identifying what clearly exists and what clearly doesn't; it is unreliable precisely in the middle category that dominates the data.

A sensitivity analysis proportionally reassigning Unresolved citations based on audit rates pushes fabrication rates to 0.33–0.75 across cells and existence rates to 0.06–0.52. The direction of all constraint effects and the proprietary–open-weight gap remain unchanged — but the headline numbers in the paper are likely conservative. The true fabrication rate is probably higher than reported.

---

## What to Do About It

The paper's implication is not that LLMs shouldn't generate citations. It's that every constraint imposed on a citation-generating system should be treated as a hallucination amplifier until proven otherwise — and that standard compliance checks will not catch the resulting failures.

Temporal filters are the highest-risk single constraint. If a system uses date windows to ensure currency, it needs a verification layer that checks whether the cited reference actually exists within that window — not just whether the citation's stated date falls within it. Models will produce the latter without the former.

The Unresolved category demands attention in any deployment pipeline. Nearly half of citations that can't be automatically confirmed are fabricated. Treating Unresolved as a neutral outcome — neither confirmed nor denied — understates the actual error rate by a substantial margin. Any downstream system that passes Unresolved citations to users without flagging them is passing fabrications at roughly 46% of that rate.

For teams choosing between model classes: the proprietary–open-weight gap is large enough and consistent enough across conditions and domains that it should factor into architecture decisions for citation-dependent applications. Under the Survey condition — the one condition where Claude Sonnet actually improves — Qwen 2.5–14B posts a fabrication rate of 54.7%. The same prompting regime that helps one model class hurts the other.

Finally: citation volume is not a signal of citation quality. Under the worst condition in the study, models generate the most references. A high citation count in LLM output is not evidence of thoroughness. It may be evidence of the opposite.

*Zhao, C., Tang, Y., & Qian, Y. (2026). Do Deployment Constraints Make LLMs Hallucinate Citations? An Empirical Study across Four Models and Five Prompting Regimes. arXiv:2603.07287*