# AI brand recommendations move people onto the open web through search, not just mention counts

A conversational assistant saying a brand name is not the same thing as a brand being mentioned. That distinction matters here, because the paper shows the acquisition-like effect comes from genuine recommendations to people with no recent observed engagement — not from pooling every brand mention into one funnel.

When the recommendation is cleanly isolated, the next move is usually not a direct click from the assistant. It is a search-triggered path: people search the brand on Google, then visit the brand’s site, and in some cases end up on retailer pages too. That makes the effect useful to anyone thinking about AI search visibility or brand discovery, because the outcome is not abstract awareness. It is web behavior.

The authors also try to separate real lift from the kind of pre-existing intent that can make a simple mention funnel look better than it is. Once they condition on non-customers and genuine recommendations, the pre-trend drops out and the acquisition effect reappears.

Same-name Google search rises by **+4.3 percentage points** after a recommendation to a non-customer.

---

## What the paper measures, and what it leaves out

The paper links an opt-in clickstream panel to the same users’ conversations with ChatGPT, Claude, and Gemini at timestamp granularity. That matters, because it lets the authors watch what people do on the web after a specific assistant response rather than infer behavior from coarse aggregate traffic.

The outcome window is seven days after the response, and it includes three separate behaviors: same-name Google search, visits to the brand’s own site, and brand-specific retailer-page visits. The paper treats those as recall, discovery, and retail reach. The retail measure is important, but it is still purchase-adjacent rather than proof of purchase, because the study does not observe transactions.

The unit of analysis is a `(user, response, brand)` row for a curated brand lexicon. The authors keep the lexicon focused on high-recognition brands with low homograph ambiguity, which makes the matching problem cleaner than it would be for a broader, messier set of names.

One other definition matters a lot: “non-customer” does not mean someone who has never had any relationship with the brand. It means a user with no recent observed search, own-site, or retailer engagement with that brand. That is a narrower and more operational label, and it is the one that supports the paper’s main contrast.

---

## Recommendations move the funnel; incidental mentions mostly do not

The headline result is straightforward: when the assistant recommends a brand to a non-customer, same-name search rises by **+4.3 percentage points** over the matched observational baseline. In the same seven-day window, brand-site visits rise by **+2.4**, and retailer-page visits rise by **+1.0**. The effect does not stop at search, but search is clearly the main hinge.

That makes the mechanism feel acquisition-like rather than purely expressive. The assistant does not seem to function as a direct traffic source in the simple sense. It acts more like a trigger that sends people into the open web, where they continue the journey themselves.

The distinction between recommendation and mere name presence is not minor. The paper says a recommendation does roughly two to three times more than an incidental brand mention. That is a useful warning for anyone who is tempted to treat all assistant brand mentions as interchangeable exposure.

The lift is also specific to the named brand. When the assistant names a brand, that brand’s funnel moves; unnamed same-category brands barely move. So the effect is not just a burst of category curiosity. It is tied to the recommendation target itself.

---

## Why pooled mention funnels can look better than they are

If you pool every mention into one funnel, the story gets muddier fast. The paper shows that the naive all-mention approach is confounded, because mention timing can line up with pre-existing intent shocks. That is exactly the kind of thing that makes a clean-looking funnel turn out to be a timing artifact.

The event-study diagnostics make the problem visible. In the three days before a mention, the pooled funnel already shows non-random movement. Once the authors condition on non-customers and isolate genuine recommendations, that pre-trend disappears and the acquisition effect comes back.

They also test a stricter non-customer definition. Under a 28-day no-recent-engagement window, the effect strengthens. That does not prove causality, but it does make it less plausible that the result is just short-term carryover from people who were already close to the brand.

The cleaner interpretation is that recommendation quality and audience state both matter. A named recommendation to someone who is not already in an active brand episode behaves very differently from a generic mention to someone already circling the brand.

---

## The operational caveats are real, but they do not erase the signal

The biggest limitation is also the one the authors are most explicit about: the design is observational, and none of the checks fully rule out a brand-specific intent shock within the session. In other words, a recommendation could still coincide with an unobserved burst of interest that the panel cannot perfectly separate from the assistant’s influence. A randomized or encouragement design would be needed to close that gap.

The paper also does not observe transactions. So when retailer pages move, the right read is “purchase-adjacent,” not “this caused a sale.” The same applies to the web panel more generally: it captures navigation, not attention, and it cannot see what happens offline or outside the seven-day window.

There is also a practical asymmetry across audience types. Among existing customers, the mention coincides with an active episode and adds little beyond it in the pooled case, and the recommend-to-existing subset is too small to resolve a modest acceleration. The clean acquisition effect is really about reach into people who are not already engaged.

Finally, the assistant-level gaps are mostly compositional. The paper argues that the effect is not evenly distributed across assistants because the mix of brands and users differs, not because one model is intrinsically stronger in some simple sense. That means system comparisons need to be read carefully: what matters is not just which assistant speaks, but what it says and to whom.

---

## What to do with this if you care about AI discovery

If you are trying to influence brand discovery in AI surfaces, the practical move is to stop counting mentions and start measuring search-triggered lift. The paper’s strongest evidence says the meaningful unit is a genuine recommendation to a truly non-engaged user, followed by the search and web visit chain that comes after it.

That changes how you evaluate performance. A dashboard that only tracks how often a brand is named will miss the part that appears to matter most: whether the mention prompts people to go look for the brand on the open web. If you cannot connect AI exposure to same-name search and downstream site or retailer visits, you are probably measuring the wrong thing.

It also changes how to segment. The paper’s effect is much cleaner when the audience has no recent observed engagement, so brands and tools should probably distinguish between discovery and reinforcement rather than treating every response as the same kind of impression.

In short: optimize for high-quality named recommendations that reach genuinely cold users, and measure the search step as the first real sign that the assistant is moving the funnel.

*Iannelli, M., & Ai, A. (2026). From Prompt to Purchase: How AI Brand Recommendations Move Consumers on the Open Web. arXiv:2606.10907*