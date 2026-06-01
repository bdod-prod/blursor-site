# Provider Architecture Drives Citation Quality—Not Model Size

## Why Fixing Your LLM Won't Fix Its Citations

When a search-augmented LLM gets a citation wrong, the instinct is to blame the model. Swap in a smarter one, scale it up, maybe try a reasoning variant. That instinct is wrong—or at least, it's aimed at the wrong layer.

A new study from Yonsei University evaluated ten search-augmented LLMs across five providers, collecting 112,000 responses to 11,200 real-world queries and examining 761,495 evaluable citation pairs. The finding that should reorient how practitioners think about citation quality: provider-level search architecture explains 88–96% of the variance in citation quality. The LLM sitting on top of the retrieval pipeline explains almost none of it.

The anchoring numbers are stark. Across all ten models, 30.6% of citations distort their sources and 27.1% pull from domain-inappropriate sources—failures that compound across multiple citations per response until up to 96% of users encounter at least one structurally misleading citation in a given reply.

---

## The Scale of Structural Failure

These aren't edge cases. At the citation level, nearly one in three citations either misrepresents what its source says or links to a source that has no business being cited for that topic. At the response level, even the best-performing model in the study—claude-haiku—leaves 71.3% of responses containing at least one structurally flawed citation.

The source pool composition helps explain why. Blog and Social sources account for 29.2% of all citations; Company sources add another 21.1%. Together they make up more than half the citation pool. Research sources account for just 8.8%. This isn't a model behavior—it's an index composition problem baked into the retrieval layer before any LLM processes a word.

The problem concentrates in the queries where it matters most. In YMYL domains—Medical, Legal, Finance—the suitability failure rate climbs to 38.3%, compared to 21.1% elsewhere. The odds ratio is 2.3, meaning the highest-stakes queries are systematically the worst-served. A user asking about drug interactions or legal rights is more than twice as likely to get a citation from an inappropriate source than someone asking about software or hobbies.

There's also a harder-to-measure floor problem: Forum and Q&A hosts fail to crawl at 67.9% due to bot blocking, meaning community-sourced content is structurally under-represented in what could even be evaluated. The reported failure rates are conservative lower bounds. Including those failed pages would push YMYL suitability failure rates 7–9 percentage points higher than the already-troubling 38.3%.

---

## Provider Architecture, Not Model Intelligence, Drives Quality

The study ran a two-way ANOVA decomposing citation-quality variance by provider and by within-provider model differences. Provider identity accounts for 96.5% of the variance in intent–purpose alignment, 96.1% of source suitability variance, and 88.3% of fidelity variance. Within-provider model differences—the gap between a provider's larger and smaller models—account for the remainder.

That remainder is small. The Anthropic pair (claude-sonnet vs. claude-haiku) differs by less than 0.8 percentage points on fidelity failure rate and 1.6 points on suitability. The largest within-provider gap in the entire dataset is 6.3 percentage points on suitability, between gpt-5 and gpt-5-mini—and even that gap is dwarfed by the spreads between providers.

What this implicates is the retrieval pipeline itself: source selection, index composition, ranking policy. These are decisions made at the provider level, upstream of any model. Swapping claude-haiku for claude-sonnet doesn't change which URLs Anthropic's search backend returns. Upgrading to gpt-5 from gpt-5-mini doesn't change which sources OpenAI's index prioritizes. The model is downstream of the problem.

---

## The Fidelity–Suitability Trade-Off No Model Escapes

There's a second structural problem, and it's more frustrating: the models that cite faithfully tend to pull from inappropriate sources, and the models that cite appropriate sources tend to distort what those sources say. No model in the study occupies the low-failure corner on both dimensions simultaneously.

claude-haiku achieves the lowest fidelity failure rate in the dataset at 12.3%—but ranks 7th on suitability with a 30.1% suitability failure rate. gpt-5 shows the mirror image: a suitability failure rate of just 8.0%, the lowest of any model, but a fidelity failure rate of 42.3%. Improving one dimension appears to come at the cost of the other.

Reasoning models partially break the pattern on fidelity. Perplexity's reasoning model cuts its fidelity failure rate by 16 percentage points relative to its non-reasoning counterpart—18.0% versus 34.1%. But suitability failure rate changes by less than 2 percentage points. Reasoning improves what the model does with a source; it cannot change which sources the retrieval layer selects.

The three failure dimensions—fidelity, suitability, and intent–purpose alignment—also fail independently rather than together. The observed rate of all three failing simultaneously is 0.42%, which matches almost exactly what you'd expect if the failures were statistically independent. That independence matters practically: fixing fidelity won't cascade into better suitability, and vice versa. Each dimension requires its own intervention.

---

## Response-Level Exposure and the Phantom-Citation Problem

Citation-level failure rates understate the user experience because responses contain multiple citations. Failures compound. claude-haiku's citation-level fidelity failure rate is 12.3%, but at the response level—across roughly 12–13 citations per response—71.3% of its responses contain at least one structurally flawed citation. For grok-reasoning, that figure reaches 96.1%.

Separate from structural mismatches, there's a distinct failure mode the study calls phantom citations: URLs that were never reachable at crawl time, pointing to sources that simply don't exist. Phantom-citation rates range from 2.1% to 15.5% across models. Google's two models both exceed 14%. A citation that points nowhere is worse than a bad citation—it's unfalsifiable.

The PDF-format citation problem compounds this for specific models. gpt-5 routes 16.8% of its citations to PDFs, concentrated on Research and Official sources. These fail at higher crawl rates, which means the models that appear to cite the most authoritative sources may be partially obscuring their actual failure rates behind uncrawlable documents.

---

## What to Do About It

The practical implication is a reordering of priorities. Before evaluating which model to deploy in a search-augmented system, audit the retrieval pipeline: what's in the index, how sources are ranked, what source types are over- or under-represented. The model layer is not where citation quality is determined.

For YMYL applications specifically, the 38.3% suitability failure rate in Medical, Legal, and Finance domains should be treated as a hard constraint, not a benchmark to optimize around. If the retrieval layer can't be configured to prioritize authoritative sources in those domains, the application probably shouldn't be deployed there—regardless of which model sits on top.

The fidelity–suitability trade-off means there's no single model choice that resolves both problems. Teams that need high fidelity (the model accurately represents what sources say) and high suitability (the sources are domain-appropriate) will need to address both dimensions separately—likely through retrieval-layer controls rather than model selection. Reasoning models help with fidelity at the generation stage, but they can't fix what the retrieval layer hands them.

Finally, phantom citations warrant their own monitoring. A 14–15% phantom rate means roughly one in seven citations from those models points to nothing. That's not a quality issue—it's a reliability issue, and it requires a different kind of fix.

*Seo, Y., Jeong, W., Kim, E., Jang, H., & Lee, D. (2026). Verified Misguidance: Measuring Structural Citation Failures in Search-Augmented LLMs. arXiv:2605.28565*