# Semantic Metadata Makes Agents More Reliable, Not Smarter

## The Precision-Coverage Tradeoff in Agentic Data Retrieval

When an AI agent goes looking for a dataset, finding the right topic is only half the job. The other half is landing on a page where the data can actually be used — not a blog post describing the data, not a portal that links to it somewhere, but a structured registry entry with a machine-readable download. That last-mile problem turns out to be where semantic metadata earns its keep.

A new study from Google pits two retrieval agents against each other across 58 benchmark queries: one searching the open web via Google Search, the other restricted to Google Dataset Search — a 90-million-record corpus filtered to pages with valid schema.org annotations. Both agents run on the same LLM backbone (Gemini 2.5 Pro), so what's being tested is the index, not the model. The result is a clean measurement of what structured metadata actually does for an agent trying to find usable data.

The anchoring number: the Semantic Agent achieves 46.4% FAIR-compliant precision versus 28.0% for the Baseline Agent — a 65.7% relative improvement. But it answers 40 of 58 queries to the Baseline Agent's 56, because schema.org markup simply isn't there for much of the web.

---

## What the Two Agents Actually Do Differently

The Baseline Agent queries the open web and returns whatever Google Search surfaces. The Semantic Agent queries Google Dataset Search, which applies a classification model to filter out pages with invalid or misused schema.org markup — roughly 80% of the raw corpus gets cut, leaving a heavily curated slice of the web. Both agents return up to three datasets per query.

The evaluation scores each returned URL on three dimensions aligned with FAIR principles: topical relevance (is this the right subject?), data accessibility (is there a machine-readable download?), and page type (is this an actual dataset registry entry, or something adjacent to one?). A URL has to pass all three to count as FAIR-compliant.

The design isolates something specific: not whether one agent is smarter at understanding queries, but whether the underlying index changes what kinds of pages agents end up on. The answer is yes, sharply, on the last two dimensions.

---

## Semantic Metadata Eliminates Last-Mile Utility Failures

Both agents retrieve highly relevant datasets at nearly identical rates — 60.4% for the Baseline Agent, 60.7% for the Semantic Agent. Semantic metadata doesn't help agents find more topically correct data. What it does is change where they land once they've found it.

The Baseline Agent returns DATA_NARRATIVE pages — prose descriptions of datasets with no downloadable content — in 20.1% of retrievals. Another 8.5% are DISCOVERY_PORTAL pages: landing pages that point toward data rather than hosting it. These are pages a human researcher would recognize immediately as the wrong destination, but a general web index has no way to exclude them.

The Semantic Agent reduces DATA_NARRATIVE retrievals by 86.6%, DATA_EXPLORER pages by 55.7%, and eliminates DISCOVERY_PORTAL pages entirely. Its results land on DATA_REGISTRY entries — actual structured dataset records — in 88.4% of retrievals, compared to 61.0% for the Baseline Agent. On machine-readable accessibility, the gap is 71.4% versus 48.7%.

These aren't failures of relevance judgment. They're failures of page-type routing — the agent found the right neighborhood but got dropped at the wrong address. Schema.org markup, when present and valid, functions as a signal that a page is actually a dataset page rather than a page about a dataset.

---

## FAIR-Compliant Precision vs. Query Coverage

The precision improvement is real and substantial. The Semantic Agent delivers 52 FAIR-compliant URLs across 40 answered queries — a density of 1.30 per query, utilizing 43.3% of its three-result capacity. The Baseline Agent delivers 46 FAIR-compliant URLs across 56 queries, a density of 0.82 and 27.4% utilization. The per-query density difference doesn't reach statistical significance at this sample size, but the dataset-level precision gap — 46.4% versus 28.0% — is the cleaner measure and it's large.

The coverage cost is harder to dismiss. The Baseline Agent answers 56 of 58 queries; the Semantic Agent answers only 40. That's not a small gap. It reflects a structural reality: schema.org adoption is uneven, and it's thinnest in exactly the places where reliable data discovery matters most — research repositories, domain-specific archives, the long tail of scientific data.

For any given query the Semantic Agent does answer, the results are meaningfully more usable. For the 18 queries it can't answer at all, it returns nothing.

---

## Where the Semantic Agent's Advantage Disappears

The relevance finding is worth sitting with. Both agents score ~60% on highly relevant retrievals. Schema.org metadata carries no signal about whether a dataset is topically appropriate for a query — it only signals that a page is structured as a dataset. An agent searching a semantically annotated corpus isn't better at understanding what the user needs; it's better at avoiding pages that describe data rather than serving it.

Coverage collapses in research domains where schema.org adoption is low. The NTCIR-16 benchmark queries used here are keyword-based IR queries, and the study notes they may not capture the full difficulty of multi-faceted natural language requests. The 58-query sample also limits how far the results generalize. And because both Google Search and Google Dataset Search are proprietary systems, the study measures end-to-end utility — it can't isolate how much of the effect comes from metadata versus Google's internal ranking.

The ~80% filtering rate on the raw schema.org corpus is its own signal. Most pages that attempt semantic markup don't do it well enough to be useful. The Semantic Agent's advantage depends on a curated minority of publishers who got it right.

---

## What This Means for Data Publishers and Agent Designers

If you publish research data and want AI agents to find and use it, schema.org markup on your dataset pages is the most direct lever available. The precision improvement here isn't marginal — it's the difference between an agent landing on your actual data versus landing on a page that mentions your data. The barrier isn't the markup itself; it's that most publishers either skip it or implement it incorrectly, which is why 80% of pages get filtered out before the Semantic Agent ever sees them.

For teams building retrieval agents, the tradeoff is explicit: a semantically filtered index improves the quality of what you return but shrinks what you can answer. Whether that's acceptable depends on the use case. An agent helping a data scientist find a usable dataset for analysis probably benefits from the precision — a page that looks relevant but can't be downloaded is worse than no result. An agent doing broad discovery across unfamiliar domains may need the coverage more than the precision.

The deeper implication is that the web's data infrastructure is bifurcated. A well-annotated slice delivers reliable, machine-usable results. The rest delivers topically relevant but often practically unusable ones. Agents operating across both surfaces will need to handle that gap explicitly, not assume it away.

*Chen, S., Alrashed, T., Halevy, A., & Noy, N. (2026). Do Agents Need Semantic Metadata? A Comparative Study in Agentic Data Retrieval. arXiv:2605.28787*