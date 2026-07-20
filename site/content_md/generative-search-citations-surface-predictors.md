# Chinese generative search cites only a small slice of available brand sources, and external quality scores do not predict what surfaces

Chinese-language generative search engines do not seem to treat citations as a broad reservoir of usable evidence. In this study, the final answers pulled from a very narrow slice of the available citation pool, and the sources that made it through were not the ones best explained by a generic site-quality score.

That matters if you care about brand visibility, contact details, or whether a page is likely to be used as grounding at all. The paper’s main move is not just counting citations. It links answers, citations, and source pages, then checks what actually got absorbed into the answer text and what stayed behind.

The result is less about “who has the highest authority” and more about “which pages fit the answer’s structure, recur across sources, and align semantically with the target.”

8.3% of brand candidates in the citation pool were selected into answers.

---

## What the study actually measured

The authors built a controlled dataset across the Web and App interfaces of four mainstream Chinese large-language-model platforms, giving them eight platform-interface combinations in total. They ran 614 controlled queries, and each query–platform-interface pair was collected in three fixed replications. That replication detail matters because it gives the comparisons more stability than a one-off scrape would.

They also did substantially more work than a simple citation count. The raw dataset contained 214,119 records. After field linkage, deduplication, and removal of invalid records, they built a citation-level master dataset of 160,860 records.

The key point is that the unit of analysis is citation behavior, not just answer quality. The paper separates nominal, general, and deep citations — in other words, it asks how much of a source is actually used in the answer, not merely whether a source appears in the citation list.

---

## The answer surface is much narrower than the citation pool

The most striking finding is the gap between what is available and what actually shows up. Brands in the citation pool were highly selectively included in answers, with an overall selection rate of 8.3%.

The same pattern shows up for contact details, which are often the thing practitioners care about most. Only 12.4% of the retrieved sources containing contact information contributed contact information to the answers.

That is a lot of attrition between source availability and answer surface. It means a source being present in the citation pool is not enough to assume the answer will expose the useful part of that source. In practice, a page can be “near” the answer without becoming visible in the way that matters.

The paper also reports mismatches that are easy to overlook if you only look at the citation list. About 13% of brand exposures could not be matched to the contemporaneous citation pool, and about 71% of contact-information exposures could not be matched to the crawled body text. So even when something appears in the answer, the underlying grounding path is not always straightforward.

---

## What predicts citation selection: fit beats composite quality

The model results point in a fairly consistent direction: source selection is driven more by fit than by an external quality badge. Content fit, cross-source occurrence count, and semantic role had relatively high importance in the predictive models.

By contrast, the 5118-Baidu Composite Quality Score was not the leading predictor for any of the outcomes examined. That is a useful corrective if you are tempted to treat a composite site score as a proxy for generative-search visibility. In this dataset, it was not the main lever.

The score itself is a weighted composite — 0.4 × Baidu Webmaster indexed-page count + 0.3 × 5118 Weight Score + 0.2 × website-filing age score + 0.1 × filing-type score — which makes the result even more interesting. A fairly standard authority-style blend does not explain citation behavior as well as variables tied to how the page matches the answer task.

The practical read is simple: if a page is semantically close to the target, plays the right role in the information structure, and appears across sources, it is more likely to be surfaced than a page that merely scores well in an outside metric.

---

## Recency matters, but not uniformly

The paper also gives a sense of how time-sensitive citation behavior is. Among cited pages with publication dates, the fitted half-lives for high- and low-timeliness queries were approximately 39 days and 68 days, respectively.

That difference suggests the system does not treat recency as a single switch. For some queries, the decay is fast. For others, older sources keep their value for longer. So the timing signal is conditional on the query’s need for freshness, not just the age of the page itself.

This is another reason a one-size-fits-all authority strategy falls short. A page can be technically strong and still miss if it is too old for a time-sensitive query, while a newer page with the right semantic role can win out even without a heavyweight site score.

---

## What to do about it

If your goal is to show up in generative search with the right brand name, address, hotline, or other contact detail, do not optimize only for abstract authority. This paper says the systems are looking harder at content fit, repeated presence across sources, and semantic role than at a composite site-quality score.

That means the content itself has to do more work. Put the answer-ready facts where a model can easily extract them. Use consistent naming. Make the page’s purpose obvious. Build pages that are semantically aligned with the query class you want to win, not just pages that look reputable on paper.

It also means you should not assume a citation list is enough proof that the answer will surface the right detail. The answer layer is more selective than the underlying pool, and the grounding path can be messy. If visibility matters, test the answer surface directly, not just the crawlability or the authority of the source domain.

*Zhen, T., Liu, Y., Zhang, G., & Niu, Y. (2026). What Do Chinese-Language Generative Search Engines Cite and Surface? A Large-Scale Empirical Study. arXiv:2607.15771*