# AutoJudge for News-Trustworthiness RAG: What a New TREC Benchmark Paper From Waterloo Actually Shows

Most RAG evaluation benchmarks treat retrieval and generation as ends in themselves. A paper from the University of Waterloo, published on arXiv in February, takes a narrower and more applied target: systems that help readers assess whether a news article is trustworthy. The task requires generating investigative questions a reader should ask, then producing a short attributed report grounded in a fixed retrieval corpus. Both outputs are evaluated against rubrics built by TREC assessors doing the kind of lateral reading a journalist would do — not keyword matching, not surface fluency scoring.

The paper introduces DRAGUN, a benchmark collection built on 30 news article topics drawn from the MS MARCO V2.1 Document Corpus, covering the 2019–2021 publication period. It also introduces AutoJudge, an LLM-based evaluation system designed to replace or supplement human assessors at scale. The central question is whether automated evaluation can track human rankings closely enough to be trusted for system development — and under what conditions it fails.

The anchoring number: 11.3% of questions submitted by participating systems were compound questions that had to be filtered before scoring — a systematic quality problem that inflates apparent coverage if left unchecked.

---

## What the DRAGUN Benchmark Is Actually Testing

DRAGUN targets a specific RAG use case that existing benchmarks don't cover: helping a reader decide whether to trust a news article. That framing shapes both tasks. Task 1 asks systems to generate 10 ranked investigative questions per article — the questions a skeptical reader should pursue. Task 2 asks for a 250-word attributed report grounded in the 114-million-segment MS MARCO V2.1 Segmented Corpus, with explicit citations to retrieved passages.

The gold standard was built by TREC assessors conducting open-web lateral reading — the same process a fact-checker would use. Across 30 topics, assessors produced 236 weighted rubric questions and 551 short answers, averaging 7.9 questions and 18.4 answers per rubric, with each answer backed by at least one supporting reference URL. That grounding gives the benchmark an unusually journalist-style reference standard rather than one derived from the retrieval corpus itself.

That last point matters for interpreting scores. Rubric answers were built from the open web, not restricted to MS MARCO V2.1. Some correct answers may be structurally unretrievable by participating systems — meaning rubric coverage scores undercount what a well-designed system could theoretically achieve, and the gap between best-run scores and the pooled ceiling partly reflects corpus coverage limits rather than system failure.

Task 1 received 37 runs from 10 teams, producing 11,100 questions. Task 2 received 28 runs from 8 teams, producing 840 reports. Human assessors evaluated 12,733 question pairs for Task 1 and 15,428 answer-report pairs for Task 2.

---

## AutoJudge Correlation With Human Rankings

For Task 2 — report generation — AutoJudge's run-level ranking closely tracks human assessors, with Kendall's tau of 0.872 across 26 runs averaged over 30 topics. That sits within the range reported for AutoNuggetizer-style nugget evaluation (0.727 to 0.901 depending on manual reference condition) and above the approximately 0.8 reported by the TREC 2024 RAG Track for LLM-based support judging. For a single-GPU automated system, that's a credible result.

For Task 1 — question generation — correlation drops to 0.678 across 33 runs. The harder problem is semantic matching: comparing open-ended investigative questions requires judging whether two questions are asking the same thing, not whether a short answer is supported by a passage. The gap between 0.872 and 0.678 is a direct measure of how much that semantic matching problem costs.

Label-level agreement tells a similar story. For Task 2, AutoJudge agrees with human assessors on 86.7% of individual answer-report labels. For Task 1, agreement is 82.1% after collapsing the "different" and "very different" categories into a single no-credit class. Both figures are high enough for system-level comparisons, though run ordering for Task 1 carries more uncertainty.

One caveat worth noting: the AutoJudge uses gpt-oss-120b specifically. The authors state that other capable LLMs should also work but don't validate that claim. The 0.872 and 0.678 figures are specific to that model.

---

## Where Current RAG Systems Actually Fail

Contradictions are not the problem. Across all runs and topics, contradictory scores are near zero — systems rarely produce explicit factual contradictions to rubric answers. The failure mode is omission, not commission. Systems miss rubric answers; they don't actively contradict them. AutoJudge is also poorly positioned to distinguish between runs on contradictory scores precisely because those scores are similarly low across the board.

Task 2 supportive coverage is consistently lower than Task 1 across topics. That reflects the compounding difficulty of the report task: a system must retrieve relevant evidence from 114 million segments, then compress it into a 250-word attributed report that covers rubric answers. Each step loses coverage. The 250-word ceiling also means the pooled ceiling — the coverage achievable by combining all runs — is not attainable by any single report. It should be read as an information-availability ceiling, not a target.

The compound question problem is the most actionable finding for system builders. 11.3% of submitted questions were compound — questions that bundle multiple investigative threads into a single item. These were filtered before scoring. Because the filtering happened after question selection for human judging, a compound question could have been selected as the closest match to a rubric question; if subsequently filtered, the run receives no credit even if a valid non-compound alternative existed. That's a scoring penalty with a clear fix: enforce single-question constraints at generation time.

---

## The Practical Cost of Automated Evaluation

AutoJudge assessed 77,880 question pairs and 780 reports in 13 hours on a single NVIDIA RTX PRO 6000 GPU. Human assessment of 12,733 question pairs and 15,428 answer-report pairs required coordinated TREC assessor effort over weeks. The cost difference is the point: full-track evaluation becomes feasible for iterative system development without waiting for a shared evaluation cycle.

The compound question classifier that feeds into scoring achieved a True Positive Rate of 0.989 and a False Positive Rate of 0.124 on a stratified validation sample of 200 questions. The false positive rate means roughly 12.4% of valid single questions are incorrectly flagged and penalized — a meaningful error rate if compound filtering is applied aggressively during development. Systems that generate borderline questions near the compound boundary will be systematically underscored.

The current evaluation covers only rubric-answer coverage — support and contradiction. Citation faithfulness and readability are not assessed. A report that correctly attributes retrieved passages but misrepresents their content would score the same as one that doesn't. For news trustworthiness specifically, that's a gap worth noting.

---

## Before the Next System Build

The DRAGUN benchmark and AutoJudge together make a specific thing possible that wasn't before: iterative evaluation of news-trustworthiness RAG systems without human assessor scaling. The 0.872 run-level correlation for report generation is high enough to trust for system comparisons. The 0.678 for question generation is usable but noisier — treat question-generation rankings as directional rather than definitive.

For teams building question-generation systems, the compound question problem is the first thing to fix. 11.3% of submitted questions were filtered for compounding. That's a systematic quality issue with a direct scoring penalty, and it's addressable with a post-generation filter before submission. The compound classifier the paper describes — TPR 0.989, FPR 0.124 — is reliable enough to use as a quality gate during development.

For report generation, the retrieval corpus coverage gap is the harder constraint. Rubrics were built from the open web; some answers are structurally absent from MS MARCO V2.1. Systems that retrieve well within the corpus ceiling are already near the practical limit. The gap between best-run scores and the pooled ceiling is partly a corpus problem, not purely a system problem — and that distinction matters for where to invest optimization effort.

*Zhang, D., Smucker, M. D., & Clarke, C. L. A. (2026). Resources for Automated Evaluation of Assistive RAG Systems that Help Readers with News Trustworthiness Assessment. arXiv:2602.24277*