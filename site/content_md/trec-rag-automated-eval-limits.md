# TREC 2025 RAG Track: Automated Evaluation Works Until It Doesn't

The TREC 2025 Retrieval Augmented Generation Track is the most systematic attempt yet to answer a question that has become unavoidable: can automated evaluation replace human judgment for RAG systems? The track drew over 150 submissions across four tasks — Retrieval, RAG, Answer Generation, and Relevance Judgment — and deployed LLM ensembles at every stage of the evaluation pipeline. The result is a detailed map of where automation holds and where it quietly fails.

Prior RAG evaluation efforts, including TREC RAG 2024, relied heavily on manual assessment and left most of the pipeline's reliability untested at scale. This year's track inverted that: automated methods covered the full submission pool, manual assessment served as a calibration signal. That design choice makes the gaps visible in ways earlier tracks couldn't.

The number that anchors the paper's findings: even the best automated relevance judgment run achieved agreement with human assessors only 30–34% of the time, with a kappa of 0.21 — placing it in the "slight to fair" range, where most agreement is attributable to chance.

---

## The Track's Design Shift: From Keywords to Narratives

The 2025 track replaced short keyword queries with multi-sentence narrative topics — 2–3 sentence descriptions designed to simulate deep, complex search scenarios. The intent was to stress-test RAG systems beyond surface-level retrieval, forcing both retrieval and generation components to handle specificity and context that keyword queries don't require.

105 narrative queries were distributed to participants. Answers were capped at 400 words. Sub-narratives — up to 10 per narrative — served as the atomic unit of coverage evaluation, allowing the track to measure not just whether a system answered a question but which facets of a complex information need it addressed.

The track drew 46 retrieval runs from 12 groups, 51 RAG runs from 16 groups, 25 Answer Generation runs from 9 groups, and 36 Relevance Judgment runs from 5 groups — over 150 submissions in total. Manual assessment, conducted by NIST assessors, covered only 22 of the 105 narratives, a constraint imposed by time rather than design.

---

## Where Automated Evaluation Holds — and Where It Breaks

At the run level, automated relevance assessments — an ensemble of GPT-4.1, Gemini 2.5 Pro, Qwen3 Thinking 32B, and GPT-OSS variants — track manual judgments well. Kendall's tau correlations for nDCG@30, nDCG@100, and recall@100 are high enough that automated rankings and manual rankings produce substantially the same system ordering. For the purpose of declaring which retrieval system outperforms another, automation is adequate.

The alignment tightens at larger cutoffs. nDCG@100 shows stronger rank correlation than nDCG@30, suggesting automated methods are more reliable when evaluating broader retrieval depth — a pattern consistent with the idea that aggregate signals smooth out per-document noise.

At finer granularity, the picture changes. At the narrative-average level and across individual narrative-run pairs, scatter increases substantially. Automated scores diverge from human judgments in ways that matter for diagnosing individual system behavior. A practitioner trying to understand why a specific system underperforms on a specific topic cluster cannot trust automated scores the way a practitioner comparing two systems overall can. The paper is explicit: the correspondence that holds at the run level does not hold at the narrative level.

---

## The Relevance Judgment Task: Automated Systems Still Far From Human-Level

Five groups submitted 36 runs to the Relevance Judgment task, producing passage-level relevance labels for comparison against NIST human assessors. The best runs achieved agreement fractions of 0.30–0.34. The kappa for the top-performing run — GPT-OSS 120B — was 0.21.

A kappa of 0.21 falls in the "slight to fair" agreement range. Most of the agreement between that system and human assessors is explainable by chance. The agreement fraction of 0.30–0.34 means that even when the automated system and the human assessor agree, they agree less than a third of the time.

This ceiling applies to the track coordinators' own strong LLM baseline, not just participant submissions. The difficulty is structural. The paper does not attribute it to model capability gaps that better models will close — the framing is that passage-level relevance judgment against complex narrative queries is a hard problem that current automated methods haven't solved, regardless of the model used.

---

## Nugget Assignment Is the Fragile Link in RAG Scoring

The RAG evaluation pipeline has three configurable components: nugget generation, nugget assignment, and support evaluation. Ablations across three configurations — fully automated, AutoNuggetizer with NIST qrels, and post-edited nuggets with automated assignment — reveal that these components have different failure profiles.

Strict vital scores are highly sensitive to how nuggets are assigned. Sub-narrative coverage scores are comparatively stable across most pipeline changes — except when nugget assignment is modified. The implication is that leaderboard positions based on strict vital scores are more contingent on pipeline configuration than positions based on sub-narrative coverage.

Automated nugget assignment introduces less point-level variance than other pipeline components, but it can still reorder runs in ways that reduce rank correlation for sub-narrative coverage. The paper identifies this as a subtle but consequential failure mode: a system that ranks second under manual assignment may rank fourth under automated assignment, not because its outputs changed but because the assignment method changed. GPT-OSS 120B functions as a reliable surrogate for manual support evaluation at the run level — Figure 8 scatterplots show strong Kendall's tau for both weighted recall and weighted precision — but that reliability doesn't extend to the nugget assignment step upstream of it.

---

## What Evaluation Builders Should Take From This

The practical implication isn't that automated RAG evaluation is broken. It's that it operates at a specific level of resolution, and using it outside that level produces misleading results.

Run-level rankings are trustworthy. If the question is "does system A outperform system B overall," an automated ensemble gives a reliable answer. Build leaderboards and regression tests on this basis with reasonable confidence.

Per-document and per-narrative scores are noisy proxies. If the question is "why does this system fail on queries about X," automated scores are a starting point for investigation, not a verdict. Manual spot-checks on the narratives where automated and manual scores diverge most are more informative than treating automated narrative-level scores as ground truth.

Nugget assignment deserves explicit attention in pipeline design. Strict vital scores are the metric most sensitive to this step. Teams building internal RAG eval pipelines should test whether their nugget assignment method is stable across runs before anchoring evaluation decisions to strict vital scores.

The 22-narrative manual assessment coverage — out of 105 total — is a constraint worth noting for anyone planning to use TREC 2025 results as a benchmark. The calibration signal exists, but it's partial. The track's own findings suggest that narrative-level divergence between automated and manual scores is high enough that the uncovered 83 narratives carry meaningful uncertainty.

*Upadhyay, S., Thakur, N., Pradeep, R., Craswell, N., Campos, D., & Lin, J. (2026). Overview of the TREC 2025 Retrieval Augmented Generation (RAG) Track. arXiv:2603.09891*