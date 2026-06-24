# The Warrant Gap: why fact-checkers can be right and still cite the wrong evidence

LLM fact-checkers have a specific failure mode that matters more than it first sounds: they can land on the right verdict while citing evidence that does not actually license that verdict. In other words, the label looks correct, but the warrant does not hold up. That is a problem if you want outputs that people can audit, not just accept.

This paper is useful because it does not treat that as a vague “explainability” concern. It turns the mismatch into a measurable gap between label correctness and evidential licensing, then proposes a second pass that re-checks the verdict against the full claim instead of trusting a decomposed claim fragment. The result is a fact-checking pipeline that is trying to be both more accurate and more defensible.

The motivating number is simple: naive 5W1H decomposition can cost up to 27.6 points.

---

## The warrant gap: when the verdict is right but the evidence is not

The core issue here is that a fact-checking system can be “correct” in the coarse sense and still be wrong in the way that matters for users. If the system predicts **Supports** but the cited span does not entail the full claim, the verdict may look fine while the justification is broken. That is the gap this paper names the **warrant gap**.

The paper formalises that gap as slack between label correctness and evidential licensing. That is a useful distinction, because it separates the thing a benchmark usually scores from the thing a reader actually needs. A system that reaches the right label by the wrong route is still fragile when someone asks, “why does this evidence support that claim?”

To make licensing measurable, the paper introduces **WSP, Warranted Supports Proportion**. WSP is an automatic NLI-based diagnostic: for a predicted Supports case to count as admissible, there must be a warrant that is verbatim-grounded in the evidence pool and entails the claim. That makes the evaluation closer to an auditable standard than a plain verdict metric.

---

## SIFT: extract only the claim parts that matter, then re-score against the whole claim

SIFT starts with a structured extraction stage built around 5W1H, but it does something important differently from naive decomposition: it selects the active units of the claim and ignores inactive ones instead of forcing every slot to be filled. That matters because not every claim cleanly maps onto who, what, when, where, why, and how.

For each active unit and each evidence item, the system extracts a verbatim span when the evidence supports or contradicts it, or marks the unit unsupported. That keeps the pipeline grounded in text the model can point to. It also makes the failure mode visible: if the right span never gets surfaced, later stages cannot recover it.

The second step is the real change. Claim-conditioned re-scoring revisits the verdict against the full claim, not just a parent facet, and then promotes or demotes the label based on whether the grounded evidence explicitly licenses or contradicts the claim as a whole. That is the paper’s answer to the “supports-but-not-licensed” problem: do not trust the first pass to have captured the right semantic unit.

The admissibility rule is equally direct. A predicted Supports label is admissible only if there exists a verbatim-grounded warrant in the pool that entails the claim. That makes “Supports” a stronger promise than “the model found something vaguely related.”

---

## What the numbers say: the second pass repairs decomposition losses

The headline result is that rigid decomposition can do real damage, and SIFT recovers a substantial share of that loss. On FEVER, the largest reported drop from naive 5W1H is 27.6 points for Gemma2-9B. That is not a small calibration issue. It is the difference between a method that mostly works and one that breaks on the wrong shape of claim.

Across the 12 primary held-out cells, Design B improves accuracy in 9 and WSP in 10 relative to SIFT. That is the important pattern: the claim-conditioned verifier is not just making the system more “conservative” or more “liberal.” It is improving both the verdict and the admissibility of the warrant in most of the tested settings.

There is also some evidence that this improvement is not a one-off artifact of one verifier setup. MiniCheck preserves the Design B-over-SIFT direction in 13 of 16 held-out cells. That does not mean the result is universal, but it does suggest the effect survives more than one downstream choice.

The experiment stack is broad enough to matter: the paper evaluates on FEVER, SciFact, 5PILS, and DP across four open-source backbones, and it limits FEVER to 1000 validation samples. The important point is not that every cell moves the same way. It is that the specific failure caused by naive slotting shows up clearly enough to be repaired.

---

## Where this helps, and where it still breaks

The biggest deployment lesson is that WSP should be treated as a proxy admissibility check, not as a substitute for expert review. The paper is explicit that WSP is an automatic diagnostic, and that its validation is partly model-mediated. The human-curated calibration covers FEVER and SciFact, but the paper deliberately does not crowd-source admissibility for the retrieved-evidence datasets, 5PILS and DP.

That limitation matters because the evaluation target is not just “did the system say Supports?” It is “did the cited warrant really entitle that label?” In some settings, automatic NLI is a good operational proxy for that question. In others, it is only a rough filter.

There is also a domain boundary baked into the design. 5W1H is less natural for abstract scientific relations, long causal chains, and claims whose warrant is statistical. The paper is candid that claim-conditioned re-scoring does not guarantee the chosen facets are the right semantic units for those cases. If your claims live in that territory, the decomposition scheme may need to change, not just the verifier.

And there is a hard ceiling on what any post-hoc rule can do: if extraction never surfaces the relevant entity or predicate, no later step can reconstruct it. That is the constraint to keep in mind when people treat rescoring as a general fix. It is a repair layer, not a substitute for good extraction.

---

## What to do about it in practice

If you are building or evaluating a fact-checking workflow, the practical move is to separate three questions that are often collapsed into one: did the system pick the right verdict, did it cite text that actually warrants that verdict, and did it expose that warrant in a form a reader can inspect? This paper argues you should measure all three.

For teams shipping fact-checking or evidence attribution, the immediate take is to stop treating decomposition as the finish line. A first-pass 5W1H or slot-based extraction can still be useful, but it should feed a claim-level re-check before you trust a Supports label. If the evidence only supports a fragment of the claim, the output should not be promoted as if the whole claim were licensed.

The more operational lesson is to use WSP-style admissibility as a gate for any output you expect someone to audit. That will not solve every domain, and it will not recover missing spans, but it does force the system to prove that its warrant is more than a nearby paraphrase. For practitioners, that is often the difference between a demo and something you can actually stand behind.

*Arka Ujjal Dey & John Collomosse (2026). The Warrant Gap: Claim-Conditioned Re-scoring for Fact-Checking. arXiv:2606.24627*