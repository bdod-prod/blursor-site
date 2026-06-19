# AI search visibility starts with brand stature, not prompt tweaks

For brands trying to show up inside AI search results, this paper makes a blunt point: the first run is doing most of the sorting. Across five AI engines, brands that already have stature are recognized quickly, while smaller brands face a much lower ceiling on day-1 visibility.

That matters because a lot of the current conversation around AI search visibility assumes the main problem is optimization — better prompts, better pages, better citations. This paper says the bigger constraint is earlier in the chain. If the model already treats your brand as authoritative, it tends to cite you naturally. If it doesn’t, the gap is structural.

The dataset is not tiny, either. The authors track 102 brands across 3,508 runs and 102,025 prompt responses.

---

## What the paper measures, and why that matters

Ranqo’s setup is closer to an operating measurement system than a one-off benchmark. For each tracked brand, it generates controlled natural-language prompts across six categories — discovery, problem_solution, comparison, use_case, expert, and brand_research — and sends them to five AI engines through official APIs.

The point of that design is to isolate visibility, not just answer quality. For each (brand, prompt, platform, run) tuple, the system extracts whether the engine mentions the brand, where it ranks it, how it frames it, and how much share of voice it gets versus competitors. It also tracks source citations and source-to-brand relationships.

That makes the paper useful in a way many AI-search studies are not. It is not asking, “Can we get an LLM to say something about a brand?” It is asking, “When does a brand surface at all, and what kind of brand does the system already favor?”

It’s also important to keep the method in view. The empirical section is observational and cross-sectional. The paper measures baselines and trajectories; it does not claim that any recommendation or optimization step caused the visibility outcomes.

---

## The visibility ladder is real on day 1

The headline result is a three-tier brand-stature ladder. On the first run with unbranded prompts, Tier 1 brands get 73.5% unbranded visibility, Tier 2 brands get 43.6%, and Tier 3 brands get 11.4%.

That spread is the paper’s core signal. It says the first visibility pass is not a level playing field where every brand gets an equal shot and then optimization takes over. It is already sorted by prior stature.

The other striking detail is that branded recognition can be very high on some engines. On ChatGPT, branded first-run recognition is 94.2%. So the bottleneck is not whether the system can identify a brand in the abstract. The bottleneck is whether the brand shows up when the query is unbranded, which is much closer to how real users search.

Put differently: if your brand is already famous, AI search tends to behave like an amplifier. If your brand is not, it behaves more like a filter.

---

## Stature dominates, and the gap is hard to ignore

The paper’s plainest sentence may also be its most useful: brand stature is the dominant determinant of day-1 AI visibility.

It quantifies that penalty pretty sharply. Each step down the stature ladder costs roughly 30 percentage points of unbranded visibility. That is not a small optimization problem. That is a baseline problem.

The authors are careful not to overstate the causal meaning of that result. Because stature is not randomized, the reading is cross-sectional and observational. In other words, the paper tells you how strongly stature and visibility move together, not that stature alone caused the full gap in every case.

That caution matters. It keeps the finding in the right category: a measured association with strong practical implications, not a proof that visibility can’t move. But for practitioners, the business implication is still clear. If a brand begins with little authority in the corpus the engine already relies on, it should expect a much steeper climb.

---

## Visibility is mostly flat after launch

Once the first-run baseline is set, the trajectories are less dramatic than the hype around AI search might suggest. The paper says unbranded visibility is mostly flat over time, with a mild decline on ChatGPT and Perplexity.

That pattern is easy to misread. It does not mean visibility is fixed forever. It means the dataset, as observed here, does not show a strong natural drift that would make a brand suddenly appear without some external change.

The authors also caution that some of the apparent drift may be prompt-set drift rather than true decay. That is a subtle but important point. If the prompts change, the measured visibility can change even if the engine itself has not materially shifted.

The practical reading is straightforward: if you’re tracking AI visibility over time, you need to be careful about treating small changes as product-level movement. Some of what looks like momentum may just be measurement movement.

---

## The citations tell you where AI engines are actually pulling from

The source mix is another useful part of the paper because it shows what kinds of pages are getting rewarded. Corporate or third-party brand pages account for 75.2% of citation share, while brand-owned pages on their own domain account for only 2.9%.

That gap matters for anyone who assumes “owning the content” is enough. In this dataset, engines are overwhelmingly leaning on corporate and third-party sources, not just brand sites.

The page-type mix leans the same way. Listicle pages make up 35.7% of content citations. That suggests engines are using comparative, structured, and aggregative sources heavily — not just direct brand materials.

There’s a second useful nuance here too: the paper reports a 45.5% sentiment flipping rate. So even when a source is cited, the framing can change substantially by engine or prompt context. Citation presence is not the same thing as citation control.

---

## What to do about it

If you work on AI search visibility, the main takeaway is to stop treating every brand the same at baseline. A smaller or lower-footprint brand should not be judged against the same visibility expectations as a Tier 1 brand, because the paper shows the starting condition is already very different.

That changes how to evaluate work. Instead of asking whether a content or citation effort produced a universal visibility lift, ask whether it moved the brand relative to its stature-driven baseline. If you don’t account for that baseline, you will misread both wins and failures.

It also changes where to spend effort. The data suggest engines are drawing heavily from third-party and corporate sources, so visibility work probably has to extend beyond the brand site itself. That means thinking about the broader source environment a model can find, not just what is published on your own domain.

And finally, treat “optimization” claims carefully. This paper gives you a strong observational map of where AI visibility comes from, but not a randomized test that says a recommendation engine or content change caused the lift. Use it as a benchmark for expectation-setting first, and only then as a guide for experiments.

*Pratyush Kumar (2026). Generative Engine Optimization at Scale: Measuring Brand Visibility Across AI Search Engines. arXiv:2606.20065*