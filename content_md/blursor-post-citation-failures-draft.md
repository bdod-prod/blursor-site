# Diagnosing Citation Failures in GEO: What a New Paper From Virginia Tech Actually Shows

A paper from Virginia Tech and Zhejiang University, published this week on arXiv, does something most GEO research hasn't: it measures citation as a binary event rather than a continuous metric. Prior work — including the original GEO paper from Princeton — measured contribution, meaning how much of a generated response comes from a given source. Useful, but it conflates two separate problems: whether a page gets cited at all, and how prominently it gets cited when it does. For content creators, the first problem is the one that matters. No citation means no referral pathway, regardless of how relevant the page is.

The researchers built their dataset by pulling 949 contrastive pairs from GEO-Bench — cases where one page was cited and another wasn't, for the same query. Both pages were retrieved. The difference was somewhere downstream. By analyzing what separated cited from uncited across those pairs, they produced the first systematic taxonomy of citation failure modes — not patterns in what successful pages look like, but diagnoses of why specific pages fail.

The number that motivated the study: 43% of topically relevant pages receive zero citations under baseline conditions.

---

## Four ways citation fails

The taxonomy maps failures across the generative engine pipeline — fetching, parsing, and generation — and the distribution is uneven enough to matter for how you prioritize.

**Technical integrity (10% of failures).** The engine can't properly ingest the page. JavaScript-rendered content, access blocking, content overwhelmed by navigation boilerplate. These are upstream failures — optimization applied to a page with a technical integrity problem is wasted. A rough self-check: strip your page's HTML and read what remains. If your actual content is hard to find in that output, it's hard for a parser to find too.

**Semantic alignment (62% of failures).** The largest category by a significant margin, and the one current GEO advice addresses least directly. The page reaches the model but gets judged insufficiently relevant at generation time. The failure isn't retrieval — it's that the engine doesn't consider the page a good answer to what the query actually asks.

This breaks into four sub-types: intent divergence (your page is informational, the query is transactional), contextual gap (the query asks about a specific entity your page doesn't explicitly address), outdated content (the query implies currency your page doesn't provide), and localization mismatch (your content answers for the wrong geography or regulatory context).

The diagnostic question here isn't "does my page cover this topic" but "does my page answer this specific query intent." A page can fail semantic alignment for one query phrasing and pass for another expressing the same underlying topic. Testing against real query variants — different intents, different phrasings, different user types — is more informative than keyword mapping.

**Content quality (27% of failures).** The page aligns with the query but resists synthesis. Too shallow to support a citation, fragmented into disconnected snippets, key facts diluted across filler, information presented as dense prose where structure would aid extraction. Generative engines don't quote — they synthesize. Content that doesn't yield clean extraction doesn't get cited even when it's on-topic.

A useful test: identify the paragraphs on your page that most directly answer your target queries and ask whether an LLM could extract a clean, attributable answer from those paragraphs alone. If the key facts require reading the whole page to assemble, synthesis becomes harder.

**Systemic exclusion (under 1% of failures).** The page faces a structural disadvantage the content can't address. Either a higher-authority source covers identical facts — Wikipedia, a dominant platform — or the relevant content sits deep enough to fall outside the effective context window. The researchers document cases where optimization improved the page by every measurable standard and citation still didn't follow, because the engine was citing Coursera and edX instead. For these pages, the question isn't how to optimize but whether there's an angle or specificity the dominant source doesn't serve.

---

## What the system found about generic optimization

The paper tests AgentGEO — a diagnostic system that identifies which failure type a page has and applies a targeted intervention — against standard GEO baselines: add statistics, adopt authoritative tone, improve fluency, cite sources. The baselines reflect current best-practice advice.

AgentGEO achieves over 40% relative improvement in citation rates while modifying an average of 5% of content. The baselines average 25% content modification for substantially lower gains.

More relevant for practitioners: the baselines actively decrease citation rates on long-tail and specialized content in several topic categories. Health content, already cited at high rates, went negative after generic optimization — rewrites removed domain-specific language the engine used as relevance signals. Generic rules are derived from aggregate patterns. Content that works by being specific or technical can lose what makes it citable when pushed toward those patterns.

---

## Before the next rewrite

The paper's practical implication isn't a new optimization checklist. It's that optimization applied without diagnosis is working from the wrong starting point.

Check technical access first. Then map your page against real query variants to find where intent alignment breaks. Then test whether your best content supports clean extraction. Then — before committing to content work — check who is actually getting cited for your target queries and whether the gap is a content problem or a positioning one.

The researchers are direct about the ceiling: some pages won't get cited regardless of what you do to them. Knowing that early is more useful than another round of generic improvements.

---

*Tian, Z., Chen, Y., Tang, Y., Liu, J., & Jia, R. (2026). Diagnosing and Repairing Citation Failures in Generative Engine Optimization. arXiv:2603.09296*
