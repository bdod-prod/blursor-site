# ChatGPT referral spikes can overstate AEO unless you control for platform growth

A lot of answer-engine-optimization case studies lean on a single before-and-after multiple. That sounds persuasive until you remember the platform itself may be growing at the same time. If ChatGPT referrals rise 2x in the same window that ChatGPT usage is rising across the web, the raw multiple is mixing two things: the site’s own intervention and the platform tailwind around it.

This paper does something more useful than another growth story. It treats the rest of the same domain as a contemporaneous control, so the treated pages and the untreated pages move through the same overall ChatGPT environment. Then it asks a narrower question: after accounting for that shared tailwind, is there still an AEO-specific jump?

That shift in design matters because the intervention is not randomized. The authors are explicit that this is a product decision, not a trial, so they lean on first-party logs, weekly interrupted time series, and within-domain comparison to make the remaining bias easier to reason about.

The headline anchor is smaller than the usual marketing claim:

**1.8–2.3**

---

## The real problem is not measuring growth, but separating growth from the answer engine itself

The paper starts from a simple identification problem: public AEO case studies often report a dramatic multiple, but answer engines can also grow quickly over the same period. That makes a raw referral lift hard to interpret, because the baseline is moving under your feet.

To deal with that, the authors use the untreated remainder of the same domain as a contemporaneous control. That means the treated pages and control pages share the same domain authority, the same analytics setup, the same bot-filtering regime, and the same broad platform tailwind. What differs is whether the AEO bundle touched them.

That is the core move here. It does not make the study randomized. It does make the comparison more defensible than a plain before-after chart, because the paper is trying to isolate the intervention from the ambient growth in ChatGPT traffic.

---

## What changed, what was measured, and why the data choice matters

The intervention was a bundle applied to the site’s `/youtube/` corpus starting in January 2026. The paper does not try to break out the marginal effect of each tactic, because the tactics were applied together. That is honest, if less satisfying for anyone hoping for a neat component-by-component answer.

The corpus is large: hundreds of thousands of YouTube question-and-answer pages on a single high-traffic domain, glasp.co. Outcomes come from first-party Google Analytics 4 and server logs rather than third-party estimators. For ChatGPT referrals, the definition is direct: sessions whose `sessionSource` contains `chatgpt`.

That choice is easy to miss, but it is important. A lot of AEO reporting relies on proxy tools or inferred visibility. Here the authors are working from first-party referral definitions, so the result is about actual sessions arriving from ChatGPT, not a modeled estimate of likely visibility.

The SEO side is measured too, using Google Search Console for pages matching the `/youtube/` pattern. That matters because the paper is not just asking whether ChatGPT traffic rose; it is also checking whether the intervention damaged ordinary search traffic along the way.

---

## The effect is real enough to matter, but smaller than the raw growth story suggests

The main result is a platform-adjusted, intervention-aligned level effect on ChatGPT referral traffic in the **1.8–2.3** range. That is the number the authors argue is defensible after the treated/control comparison and the time-series design absorb the shared platform tailwind.

What that means in practice is that the raw growth was doing a lot of the work. Once the answer engine’s own growth is accounted for, the AEO bundle still appears to move referral traffic, but by much less than a naive growth multiple would imply.

The authors also test the timing more directly. An interrupted time-series model on the weekly treated/control ratio estimates a discrete jump aligned with January 2026, and the placebo-in-time permutation test says the effect is suggestive rather than conclusive. So this is not a clean victory lap; it is a reasonably careful observational estimate with a signal, not a slam dunk.

---

## The time-series setup is what keeps this from becoming another vanity metric

The paper uses weekly data across **47 weeks** — **26 pre** and **21 post** — and excludes the early part of 2025 because ChatGPT referral volume was too thin and the ratios were dominated by small-count noise. That is a sensible move. Weak early baselines can create fake jumps that look impressive until you realize they were just low-count volatility.

Methodologically, the authors borrow segmented regression from interrupted time-series work and combine it with difference-in-differences logic. They then use HAC Newey–West standard errors, plus a moving-block bootstrap confidence interval and a placebo-in-time permutation test.

That stack matters because each piece answers a different weakness. The segmented regression gives you the level break and slope change. The HAC correction reduces optimism from autocorrelation. The placebo test asks whether a jump this large would also appear if you pretended the intervention happened somewhere else. And the bootstrap gives a more stable sense of the end-state effect.

---

## The failure modes are not hidden, and several of them push the estimate downward

The paper is unusually clear about what could go wrong. Some of the risks are standard observational-study problems. Some are more specific to AEO measurement.

The biggest one is spillover. If the intervention increased the domain’s overall propensity to be cited or surfaced, then untreated pages could benefit too. That would inflate the control group and bias the measured treatment effect downward. In other words, the estimate would be conservative.

There is also a measurement discontinuity: a mid-March bot-filtering change altered session composition. That is the kind of thing that can quietly move counts without changing the underlying behavior, so it belongs in the threat model even if it is not the whole story.

The other limitations are the ones you would expect from a single-site field study. The scope is one domain and one major answer engine, so external validity is untested. The treated and control pages differ in intent and are not matched. And because the tactics were bundled, you cannot say which one mattered most.

- **Pre-period volatility:** spurious jumps can be nearly as large as the observed one.
- **Spillover / SUTVA:** likely biases the effect downward.
- **Measurement discontinuity:** mid-March bot filtering changed session composition.
- **Selection and content heterogeneity:** treated and control are not intent-matched.
- **Bundle confounding:** the estimate is for the package, not each tactic.

---

## What this changes for anyone using ChatGPT referrals as a performance signal

If you are measuring AEO, stop treating “we got 2x more ChatGPT referrals” as a stand-alone outcome. On its own, that number may mostly tell you that the answer engine got bigger. Without a tailwind-controlled design, you cannot tell how much of the lift came from your work and how much came from the platform.

The practical fix is not complicated, but it is stricter than most reporting workflows. Use a contemporaneous control from the same domain or site family, define referrals from first-party logs, and model the change as a time break instead of a single before-after delta. If you can, check for SEO protection too, because an AEO win that quietly suppresses organic search is not really a win.

The bigger takeaway is strategic: treat ChatGPT referral growth as a measurement problem first and a marketing story second. If the effect survives a tailwind-controlled design, it is worth paying attention to. If it does not, the “growth multiple” was probably never yours to claim.

*Watanabe, K., & Nakayashiki, K. (2026). Disentangling Answer Engine Optimization from Platform Growth: A Log-Based Natural Experiment on ChatGPT Referral Traffic. arXiv:2606.04362*