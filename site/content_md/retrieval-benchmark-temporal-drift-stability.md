# The Web Churns Constantly. Search Rankings Barely Notice.

Most retrieval benchmarks are built once and used indefinitely. The assumption embedded in that practice is that the underlying corpus is stable enough that rankings measured today will still mean something next year. For benchmarks built on technical documentation — repositories that deprecate features, reorganize entire codebases, and migrate functionality to competing frameworks — that assumption has never been tested directly.

A paper from the University of Waterloo does test it. The researchers took the LangChain subset of FreshStack, a retrieval benchmark built on Stack Overflow queries against live GitHub documentation, and evaluated 14 retrieval models against two corpus snapshots taken a year apart: October 2024 and October 2025. The question was whether the rankings held. The answer was largely yes — but the mechanism behind that stability is specific enough to matter for how broadly the finding generalizes.

The number that frames the study: LangChain's documentation shrank by 67% over that year, dropping from 11,037 documents to 3,628.

---

## The Corpus Changed Dramatically. The Rankings Barely Moved.

Across 14 retrieval models, Kendall correlation between 2024 and 2025 rankings reached 0.978 at Recall@50. That is near-perfect rank preservation through a period when the primary documentation source lost two-thirds of its documents and the total corpus contracted from 43,558 to 39,165 documents across ten repositories.

The result holds at nDCG@10 as well, where Kendall correlation was 0.846 — strong enough that the relative ordering of models is largely preserved, with only minor reordering at the margins. Qwen3 (8B) led both snapshots, posting nDCG@10 of 0.503 in 2024 and 0.480 in 2025. The best model stayed the best model. The worst stayed near the bottom.

This is not a trivial finding. Prior work on temporal drift in retrieval has focused on news corpora and federal documents — domains where content accumulates rather than reorganizes. Technical documentation ecosystems behave differently, and the assumption that benchmark validity would degrade proportionally to corpus churn turns out not to hold here.

The practical implication for anyone using FreshStack or similar benchmarks to select retrieval systems: a ranking produced on a year-old snapshot is not obviously wrong. The relative signal survives the corpus upheaval.

---

## Why the Benchmark Stayed Valid: Content Migration, Not Deletion

Of 640 nuggets — atomic facts drawn from 203 Stack Overflow queries — only 1 became unsupported in the 2025 corpus. That is a 99.8% survival rate through a year in which the dominant source repository lost the majority of its documents.

The mechanism is content migration. LangChain's share of relevant documents fell from 50.9% to 24.8% over the year. The information itself did not disappear — it moved. A single query that had 91.7% of its relevant documents in LangChain in 2024 saw those documents spread across six repositories by 2025, with LlamaIndex becoming the largest source at 34.6%. The number of relevant documents for that query grew from 12 to 26 as related frameworks increasingly overlapped in functionality.

The authors are direct about why this happens in LangChain's ecosystem specifically: deprecated functionality tends to be preserved or reimplemented in related and competitor codebases rather than removed from the web entirely. That structural property — an interconnected framework ecosystem where nothing truly disappears — is what makes the benchmark stable. It is not a general property of technical documentation, and the authors flag it explicitly.

Domains where information is genuinely superseded rather than migrated — Wikipedia articles where the factual answer itself changes, or documentation for software that has no active successor — would not be expected to behave the same way.

---

## Where Temporal Drift Does Bite: Coverage@20

The stability finding has a limit. At Coverage@20 — which measures whether a model retrieves a diverse set of relevant passages rather than just the top-ranked ones — Kendall correlation between snapshots drops to 0.692. That is a meaningful degradation relative to the 0.978 and 0.846 seen at Recall@50 and nDCG@10.

The divergence is interpretable. As relevant content disperses across more repositories, models that retrieve from a narrow slice of sources are penalized more heavily on diversity metrics. A model that was good at finding LangChain documentation in 2024 may still rank highly on Recall@50 in 2025 — because the top documents are still findable — but will underperform on Coverage@20 if it fails to reach the six repositories now hosting relevant content for queries that previously resolved within one.

There is also a separate issue with absolute scores. Most models saw decreases in nDCG@10 and Recall@50 between snapshots even when their relative rankings held. The benchmark is stable for comparison purposes — for deciding which model is better than another — but scores are not portable across time. A threshold set against 2024 scores will not transfer to 2025 without recalibration.

This distinction matters for deployment decisions. Using a benchmark to rank candidate models is a different use case than using it to set a performance floor. The former survives temporal drift in this setting. The latter does not.

---

## Scope and Limits of This Study

The study covers 203 queries, one domain, one year. The authors are explicit that this is the LangChain subset of FreshStack, not the full benchmark, and that the stability finding is conditional on the ecosystem dynamics described above.

Nuggets were reused from the 2024 generation pass — produced by GPT-4o from the original Stack Overflow queries — rather than regenerated against the 2025 corpus. New information introduced in 2025 is not captured in the evaluation. The benchmark survives because old information migrated; it would not capture whether new questions have become answerable.

The generalization question the authors raise is the right one: to what extent will other domains behave similarly? The answer depends on whether the domain's information ecosystem preserves content through migration or allows it to be genuinely lost. For tightly interconnected framework ecosystems, the evidence here is encouraging. For anything else, the assumption of stability should be tested rather than borrowed.

---

*Kuissi, N., Subrahmanyan, S., Thakur, N., & Lin, J. (2026). Still Fresh? Evaluating Temporal Drift in Retrieval Benchmarks. arXiv:2603.04532*