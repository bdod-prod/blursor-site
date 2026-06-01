# RAG Doesn't Flatten the Brand Hierarchy — It Just Moves Where You Lose

The promise behind RAG-powered AI search was that retrieval would democratize discovery: if the right document is in the index, the right brand gets surfaced. A 37,000-run audit across 533 brands and 19 commercial sectors tests that premise directly — and finds it doesn't hold. The brand hierarchy doesn't disappear under RAG. It just produces different failure modes at each tier.

The audit tracks brands through four stages: no retrieval at all, retrieved but not mentioned, mentioned but not recommended, and actually recommended. That four-stage funnel reveals something the aggregate surface-rate numbers hide — dominant brands and obscure ones aren't losing in the same place, and the fix for one tier is irrelevant to another.

The anchoring number: 48–52% of L4 specialists and L5 regional players never surface in any of the 37,000 runs, across all retrieval conditions and model configurations. Not occasionally missed — never present.

---

## The Funnel Looks Different at Every Prominence Level

L1 market leaders surface in aggregate across every run — 100% aggregate surface rate — but that universality doesn't translate to recommendations. Their Stage-4 conversion rates run 25–41% depending on model cell, meaning they're present in the retrieval context but losing the recommendation slot more than half the time. The competitive problem for dominant brands isn't discoverability. It's differentiation once they're already in the shortlist.

L2 challengers are the most interesting tier in the data. They also hit 100% aggregate surface rates, but they convert at 37–52% — the highest of any tier, with the top cell (sonnet/low) reaching 51.6%. They're getting found and they're winning recommendations at a higher rate than the brands above them. Their vulnerability shows up elsewhere: persona-mediated swap rates jump to 0.23 on the Anthropic cell, compared to 0.05–0.13 on OpenAI cells. That asymmetry suggests persona sensitivity is partly a model-architecture effect, not just a brand-strength effect.

L3 mid-market brands are the inflection point. Aggregate surface rate drops to 88%, conversion falls to 34–40%, and persona effects peak here — swap rates of 0.67–0.75 mean that holding the prompt fixed and changing only the buyer persona reshuffles L3 recommendations at a rate no other tier matches. They have moderate baseline visibility and high context-sensitivity, which makes their recommendation presence the least predictable of any tier.

Below L3, the picture shifts from instability to absence. L4 specialists reach a 52% aggregate surface rate — meaning 48% of them never appear at all. L5 regional players are at 48% aggregate, so 52% are invisible across the entire run set. The lowest single-cell conversion rate in the audit belongs to L5 brands on sonnet-4.6/high: 12.8% [9.5, 17.1].

---

## Long-Tail Invisibility Is Structural, Not a Retrieval Gap

The most direct test of whether RAG solves long-tail discovery is to compare what surfaces under native model search versus external neural retrieval (Exa) versus conventional keyword search (Brave). If the problem were retrieval coverage, external retrieval should rescue the brands that native search misses.

It partially does — and then hits a ceiling. Among L4 brands that surface at all, 60% appear only via external retrieval, never via native search. For L5 the figure is 56%. External retrieval is doing real work. But nearly half of each tier never surfaces regardless of retrieval source.

The Native vs. Exa Jaccard agreement declines monotonically with falling prominence: 0.83 at L1, 0.75 at L2, 0.58 at L3, 0.56 at L4, 0.50 at L5. The gap between what native search and external retrieval return grows exactly where it would need to shrink to help long-tail brands. And even when external retrieval does surface an L4 or L5 brand, the model's post-retrieval judgment systematically deprioritizes it. The bottleneck isn't the index. It's what the model does with the retrieved content.

This matters for how practitioners frame the problem. Investing in retrieval infrastructure — better indexing, neural search, broader crawl coverage — addresses a real gap at L3 and partially at L4. But for the 48–52% of L4–L5 brands that never surface under any retrieval condition, the problem is upstream of retrieval: the model's prior about which brands belong in a recommendation set for a given category.

---

## Persona Context Reshuffles the Middle Tier Most

The persona experiment holds the prompt fixed and varies the buyer context — different user types, different stated needs — then measures how often the recommendation set changes. The swap rate for L3 brands on gpt-5.4-mini/high reaches 0.75, the highest of any prominence-tier combination in the audit.

L1 brands are stable across personas — they're present regardless of who's asking. L4–L5 brands are rarely present to swap. L3 brands are present often enough to be in the running, but not anchored enough to hold their position when the buyer context shifts. That combination — moderate visibility, high sensitivity — is the worst of both worlds for mid-market brands trying to build consistent AI search presence.

L2's persona vulnerability is more specific. On OpenAI cells, swap rates stay between 0.05 and 0.13. On the Anthropic cell, the same brands swap at 0.23. That's a meaningful difference, and it suggests that optimizing for one model's recommendation behavior doesn't automatically transfer. A brand that looks stable in one provider's outputs may be more exposed than it appears when the full provider landscape is measured.

---

## Model Generation Matters More Than Model Class — and Only on One Side

The class-and-generation extension runs six model cells across a 50-prompt corpus to separate the effect of model size (mini vs. non-mini) from the effect of model generation (gpt-5.4 vs. gpt-5.5, opus-4.6 vs. opus-4.7).

Within OpenAI, both axes matter. The within-generation mini-to-non-mini jump lifts distinct brands per run from 7.7 to 10.6 — a 38% increase. The cross-generation jump from gpt-5.4-mini to gpt-5.5 more than doubles brand density to 16.4 distinct brands per run, and that effect is statistically distinguishable from zero at every prominence level. Newer, larger OpenAI models surface more brands, and the effect compounds across both dimensions.

Within Anthropic, neither axis produces the same result. The sonnet-to-opus class jump shows no detectable surface-rate effect on this corpus. The opus-4.6 to opus-4.7 generation jump is at-the-boundary significant at L1 and indistinguishable from zero at L2–L5. The mechanism driving OpenAI's brand-density lift doesn't appear to replicate on the Anthropic side at the same statistical resolution.

Multi-turn conversation doesn't change the long-tail picture. Across 750 four-turn dialogues, per-tier surface rates are within noise of single-shot baselines at every prominence level. What does change is consistency: rerun-stability Jaccard in multi-turn conversations is 0.263 on average, compared to 0.50–0.61 for single-shot reruns. Turn-1 Jaccard starts at 0.387 — close to the single-shot baseline — then collapses to 0.084–0.093 by turns 3 and 4. Conversation doesn't rescue invisible brands; it makes the brands that do appear less predictable over time.

---

## What to Do With This

The practical implication depends entirely on which tier you're in, because the failure modes don't overlap.

For L1–L2 brands, the audit suggests the strategic question is what happens inside the shortlist, not whether you make it. You're being retrieved. You're being mentioned. The gap is between mention and recommendation — which means the work is on how the model characterizes you relative to alternatives, not on getting indexed. Structured positioning signals, clear differentiation from adjacent brands, and monitoring which model cells show lower conversion rates are more useful than retrieval optimization.

For L3 brands, the persona swap data is the most actionable finding. A 0.75 swap rate means your recommendation presence is highly context-dependent. The practical question is which buyer personas your brand is consistently recommended for versus where it's being displaced, and by whom. That's a segmentation problem as much as a content problem.

For L4–L5 brands, the audit is blunt: RAG alone doesn't fix invisibility at this tier. 60% of surfaced L4 brands appear only via external retrieval — which means external retrieval is worth pursuing — but nearly half never surface under any condition. The model's prior about category-relevant brands is the actual barrier. Building that prior requires the kind of third-party citation, authoritative mention, and category-association signals that influence what the model learned during training, not just what it can retrieve at inference time.

*Jack, W., Lehman, N., Maloney, K., & Xu, S. (2026). Prominence-Stratified Failure Modes in Retrieval-Augmented Commercial Recommendation: A 37,000-Run Audit. arXiv:2605.27439*