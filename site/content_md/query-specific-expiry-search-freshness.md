# Query-Specific Expiry: Why 'Recent' Isn't the Same as 'Fresh'

Search engines have treated freshness as a timestamp problem for years. Filter out documents older than some window — a day, a week, a month — and you've handled recency. It's a reasonable heuristic, but it conflates two different things: when a document was published and whether it's still useful. A two-day-old breaking news story is stale. A five-year-old traffic regulation document might be the most authoritative result on the page.

Researchers at Baidu have built a system — Aurora-Expiry — that replaces the static time-window with a query-specific expiration threshold inferred by a RAG-augmented LLM. The idea is that freshness is a property of the query-document relationship, not of the document alone. The system asks: given what this user is looking for, at what point does this document expire? That's a different question than "how old is this document?"

The anchoring result: in a 14-day live A/B test on Baidu Search production traffic, median document age at rank 4 dropped 12.81% for high-freshness queries — the ones where recency actually matters.

---

## The Static Freshness Problem

Industrial search systems typically apply the same recency treatment to every query. A user searching for a fire that happened this morning and a user searching for traffic regulations both get results filtered through the same time window. That's the failure mode: the filter is applied to documents, not to the relationship between documents and what users need.

The consequence is results that are chronologically recent but semantically expired — or the reverse. A story about a fire from two days ago is probably useless; a policy document from five years ago may be exactly right. Static filters can't distinguish between these cases because they don't model what the query is actually asking for.

This isn't a new observation, but it's one the field hasn't fully solved at production scale. The Baidu paper is notable because it addresses it inside a live ranking system handling real traffic, not in a controlled benchmark.

---

## How Aurora-Expiry Works

The system has three main stages. First, a temporal extraction module parses both the query and candidate documents for temporal anchors — dates, time references, event markers — and constructs what the paper calls a Document Temporal Index alongside query anchor pairs. A sliding window with composite scoring narrows each document down to the passages most relevant to the query's temporal context.

Those passages feed into a structured prompt that combines the user query, the extracted temporal context, and the current search time. The LLM reasons through the problem using chain-of-thought prompting with few-shot examples and negative constraints, then outputs a query-specific expiration threshold — essentially, a judgment about when documents on this topic stop being useful.

Before that threshold gets used, a dual-verification module checks it. Contrastive forward-backward reasoning tests whether the inference holds in both directions; authority-weighted evidence fusion weighs sources by credibility. The result is a binary signal: for each candidate document, is it expired relative to this query's threshold or not? That signal gets injected into Baidu's Aurora deep ranking model through a dedicated Freshness sub-network.

One caveat worth flagging: the paper doesn't disclose which LLM is doing the inference, or its size. That limits how directly anyone outside Baidu can replicate the approach. The architecture is described clearly enough to adapt, but the specific model is a black box.

---

## Freshness Gains Are Concentrated Where They Matter

The offline evaluation ran on 1 million queries and 10 million candidate documents drawn from three months of Baidu Search logs. The headline metric — PNR, which measures how well the ranking captures freshness preferences — improved 7.36% for the most time-sensitive query tier (one-week freshness window) and 5.21% for the one-month tier. General relevance metrics across the random test set stayed flat, which matters: the system isn't trading relevance for freshness.

The live A/B test ran for 14 days at 5% of production traffic per group across all platforms. For high-freshness queries, median document age at rank 4 dropped 12.81% — nearly double the 6.87% improvement seen across all queries. The gap between those two numbers is the honest summary of what the system does: it's a targeted intervention that concentrates its effect where temporal intent is strongest.

The overall freshness improvements at rank 10 followed the same pattern — 11.46% for high-freshness queries versus 6.24% overall — confirming the effect isn't just a top-of-list artifact.

---

## Business Impact and Human Evaluation

The 14-day live test yielded +0.78% Satisfactory Consumption and +0.41% CTR. At search-engine scale, those are meaningful numbers — they reflect real user behavior across millions of queries, not a lab setting.

The blind GSB human evaluation breaks the picture down more honestly. Evaluators rated results as Good, Same, or Bad relative to baseline across three query cohorts. The Long-Tail / Cold Demand cohort — queries where the right answer is harder to find and freshness of sources matters a lot — showed a 12:2 Good-to-Bad ratio. Time-sensitive queries came in at 6:1. The Random Demand cohort, covering general non-time-sensitive traffic, showed a 5:2 ratio with a 1.50% advantage — the system processes that traffic safely but adds little.

That asymmetry is the honest story here. Aurora-Expiry is a fix for a specific failure mode in temporal queries, not a universal ranking upgrade. The gains are real and concentrated exactly where you'd want them — in the queries where getting freshness wrong costs the most.

---

## What This Means for Practitioners

If you're running or advising on a search or retrieval system that applies uniform recency filters, the practical question this paper raises is: do you know which queries in your traffic are time-sensitive? The Baidu results suggest that segmenting by temporal intent — and treating freshness as a query-relative property rather than a document property — is where the leverage is.

For content strategy, the implication runs in the other direction. Documents that are authoritative but old may be getting filtered out by systems that treat age as a proxy for staleness. A policy document, a technical specification, a legal ruling — these don't expire on the same schedule as news. Systems that model expiration at the query level will surface them when they're relevant; systems that don't will bury them behind fresher but less useful results.

The RAG-augmented LLM approach described here requires infrastructure that most teams won't have. But the underlying principle — that expiration is a function of query intent, not document age — is portable. Even a simple query classifier that routes time-sensitive queries to a tighter freshness filter and general queries to a looser one would capture some of this effect. The Baidu results give you a ceiling to aim for.

*Chen, T., Zhang, W., Gao, L., Su, L., Chen, G., Yin, D., & Shi, D. (2026). RAG-Enhanced Large Language Models for Dynamic Content Expiration Prediction in Web Search. arXiv:2605.13052*