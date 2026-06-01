# When AI Cites AI: The Synthetic Source Problem in Generative Search

Generative search engines don't just answer questions — they cite sources, and those citations carry an implicit claim: *this is where the answer comes from*. Users treat cited sources as evidence. Practitioners building content strategies treat them as signals of what gets surfaced. But a new audit of ChatGPT, Copilot, Gemini, and Perplexity finds that a meaningful share of what these engines cite was itself written by AI — creating a feedback loop where synthetic content gets laundered into the citation record.

The study submitted 712 real-world queries across health, politics, and environment topics to all four engines, collected 26,266 unique cited URLs, and ran the successfully scraped content through an AI-detection classifier. The picture that emerges isn't a fringe problem. It's structural.

Roughly 16% of cited sources across all four engines were classified as AI-generated — and because the detection tool carries a 31.4% false negative rate on real-world web content, that figure is a floor, not a ceiling.

---

## The Scale of the Problem

Of the 19,154 sources the researchers were able to scrape and analyze, about 3,056 came back as AI-generated — combining the classifier's "Highly Likely AI" and "Likely AI" categories. That's roughly 1 in 6 cited sources, across engines that collectively handle an enormous share of the world's information queries.

The domain-level picture is arguably more striking. Nearly 28% of all unique source web domains in the sample — 1,754 out of 6,258 — contained at least one AI-generated citation. That's not a handful of bad actors skewing the numbers. It's contamination distributed across more than a quarter of the web's citation footprint in this dataset.

And the 16% figure almost certainly understates the real rate. The detection tool missed roughly 31% of AI-generated articles in a benchmark of known AI-slop domains. Another 27% of cited URLs couldn't be scraped at all — PDFs, paywalled content, videos — and weren't analyzed. The "Possibly AI" category (another 1.4% of sources) was excluded from counts entirely. Stack those gaps and the true share of synthetic citations is higher than what the headline number suggests.

---

## Provider Breakdown: Copilot Is an Outlier

The aggregate 16% masks enormous variation across providers. Copilot cited AI-generated sources at 27.8% — nearly 3 in every 10 citations. ChatGPT came in at 7.3%. Gemini and Perplexity fell between them at 14.7% and 9.4% respectively.

What makes the Copilot number harder to explain away is that it cites *fewer* sources per response, not more. ChatGPT averages 14.68 cited sources per response; Copilot averages 8.44. Copilot isn't casting a wider net and accidentally scooping up more AI content — it's selecting from a narrower pool and still ending up with nearly four times ChatGPT's AI-source rate. That points to something in how Copilot ranks and selects sources, not just how broadly it searches.

Copilot also has the most dispersed citation pattern of the four engines (Gini = 0.492 versus ChatGPT's 0.648), meaning it draws from a wider variety of domains. That breadth appears to come at a cost: the further out you go from the well-established, frequently cited domains, the more AI-generated content you encounter. The long tail of the web is increasingly synthetic, and Copilot is reaching further into it.

These differences matter for how practitioners think about the problem. AI-source contamination isn't an inherent property of generative search — it varies by a factor of nearly four across providers using the same underlying web. That means it's a design-dependent outcome, and one that could be addressed.

---

## Topic Risk: Health and Environment Are Most Exposed

Health queries produced the highest share of AI-generated citations at 16.3% of all cited sources in that category. Environment queries followed at 13.3%, with politics at 11.1%. For anyone thinking about where synthetic sourcing does the most damage, health is the obvious concern — medical misinformation that traces back to AI-generated content, cited by an AI engine, is a compounding reliability failure.

Health queries also had the highest rate of citation-free responses: 11.6% of health queries got a response with no citations at all, compared to 8.2% for environment and 5.7% for politics. So health is both the topic most likely to surface AI-generated sources *and* the topic most likely to surface no sources at all. Both outcomes leave users with less ability to verify what they're being told.

The concentration of AI-generated sources in health and environment may reflect a structural gap. Authoritative human-authored sources in these areas are often paywalled, published in formats that can't be scraped, or simply sparse relative to the volume of queries. AI-generated content fills that vacuum — and generative search engines, optimizing for coverage, retrieve it.

---

## Citation Concentration and the Long Tail

The overall citation distribution across all four engines is highly unequal: a Gini coefficient of 0.68, where the top 25 source domains account for 23.8% of all citations. At the head of that distribution sit familiar, trusted names — Wikipedia alone accounts for 15.2% of citations within the top 25, government websites collectively account for 33.0%, and academic sources like Nature, ScienceDirect, and MDPI account for 14.6%.

But 59.1% of cited domains appear only once in the entire dataset. That long tail is where AI-generated content concentrates. The top 35 domains by AI-generated source count together account for 24.7% of all AI-generated citations in the sample — meaning the rest is scattered across thousands of one-off domains that no one is monitoring.

This is the structural problem in plain terms: the trusted, high-frequency domains at the head of the distribution are relatively clean. The long tail — which accounts for the majority of unique cited domains — is not. And generative search engines, particularly those with more dispersed citation patterns, are pulling from that tail constantly.

---

## What This Means for How You Work

If you're building content for AI search visibility, the implication is uncomfortable: the citation ecosystem you're competing in is partly synthetic, and the engines can't reliably tell the difference. A source doesn't need to be authoritative or human-authored to get cited — it needs to be retrievable and plausible-looking to the classifier.

For practitioners advising clients on health or environmental topics specifically, the risk is highest. Those are the query categories where AI-generated sources are most prevalent and where citation gaps are most common. Content that is clearly human-authored, properly attributed, and structured for scrapeability has a real differentiation advantage — not just on quality grounds, but because it's distinguishable from the synthetic content filling the gaps.

For teams evaluating GSE outputs — whether for research, journalism, or product decisions — the 16% figure should reframe how you treat citations. A cited source is not a verified source. Provenance checking needs to be part of the workflow, not an afterthought. The gap between Copilot (27.8%) and ChatGPT (7.3%) also suggests that provider choice matters when citation quality is a concern.

The deeper issue is that detection tools aren't reliable enough to solve this at scale — a 31% false negative rate means roughly a third of AI-generated content slips through even when you're looking for it. Until retrieval pipelines treat source provenance as a first-class signal rather than an afterthought, the synthetic source problem will keep compounding.

*Allaham, M., & Diakopoulos, N. (2026). Synthetic Sources?: Auditing Generative Search Engine Citations for Evidence of AI-Generated Sources. arXiv:2605.23684*