# A Fine-Tuned GLiNER Model Tracks Dataset Use in Research Papers With Near-Zero False Positives

Citation infrastructure for academic papers is well-developed. Google Scholar and Semantic Scholar can tell you how many times a paper has been cited, by whom, and in what context. Dataset citations have no equivalent. When a research paper uses a household survey or a displacement registry, that use is rarely captured in any structured way — the mention might appear in a footnote, a methods section, or a data availability statement, each formatted differently, none of it machine-readable at scale.

That's the gap this paper addresses. Macalaba and Solatorio, working within the World Bank's Development Data Group, built an automated pipeline to extract dataset mentions from research literature, classify how each dataset was used, and do it with enough precision that downstream consumers can actually trust the output. The domain is World Bank policy research on forced displacement, refugees, and migration — narrow by design, because that's where the authors had annotated data and a real operational need.

The anchoring result: a multitask GLiNER model fine-tuned on synthetic and curated annotations reaches an F-beta of 0.96 at the document level, with precision of 1.00 on the original annotated corpus. General-purpose LLMs, tested as baselines, don't come close.

---

## The Blind Spot in Research Infrastructure

Dataset provenance is genuinely hard to track. Unlike paper citations, which follow relatively standardized formats, dataset mentions appear in wildly inconsistent forms — sometimes a formal citation, sometimes just a name dropped in a sentence, sometimes an acronym with no expansion. There's no DOI norm for datasets the way there is for journal articles, and many datasets are referenced by informal names that vary across papers.

This matters beyond academic bookkeeping. Funders want to know whether the datasets they paid to produce are actually being used. Data producers need impact metrics to justify continued investment. Policy researchers building on prior work need to know which datasets have been validated across multiple studies and which haven't. None of that is possible without knowing where datasets appear in the literature — and right now, that knowledge is largely invisible.

The authors frame automated extraction as the only scalable path to closing this gap. Manual annotation can seed a training set, but it can't process a corpus of thousands of papers. The question is whether a model can be precise enough that its output is trustworthy, not just approximately right.

---

## Why General-Purpose LLMs Fall Short Here

The core failure mode for instruction-tuned models on this task is paraphrase. When Phi-3-mini was asked to extract dataset mentions, it occasionally returned a description of the dataset rather than the verbatim string that appeared in the text. For a summarization task, that's fine — for an extraction task where you need to match mentions across documents, it's a critical failure. A paraphrased name can't be deduplicated, canonicalized, or linked to a registry entry.

NuExtract-v1.5 reached an F-beta of 23.55 in zero-shot evaluation. The untuned GLiNER-large-v2.1 did better at 64.10, but that's still a long way from useful. Even Phi-3-mini, fine-tuned on the same synthetic and curated data used to train the multitask model, topped out at 71.43 — and came with the hallucination risk that makes its output harder to trust.

The architectural choice to use GLiNER rather than a generative model directly addresses the verbatim-reproduction requirement. GLiNER is a span-extraction model: it identifies boundaries in the source text rather than generating tokens. It can't hallucinate a name that isn't there, because it's not generating names at all.

---

## What the Model Actually Achieves

On the original annotated corpus, the multitask GLiNER model reaches precision of 1.00 at both the passage and document level — effectively zero false positives. Recall at the passage level is 0.81, rising to 0.88 when evaluated at the document level. That gap between passage and document recall is consistent across all three evaluation sets and reflects a real property of the task: dataset mentions are often dispersed across a paper rather than concentrated in one place, so aggregating across passages captures references that any single passage evaluation would miss.

Generalization to the JDC corpus — a separate collection of Joint Data Center publications, related to but distinct from the training domain — holds at F-beta 0.95 at the passage level and 0.96 at the document level, without any domain-specific fine-tuning. That's a meaningful result: the model wasn't retrained on JDC documents, yet it performs as well there as on the corpus it was built for.

The PRWP evaluation, covering a broader set of World Bank policy research papers, shows slightly lower recall — 0.83 at the passage level, 0.87 at the document level — while precision stays above 0.99. The pattern suggests the model's remaining sensitivity gap comes from heterogeneous citation formats and writing styles, not from confusion about what a dataset mention looks like. It's missing some mentions, not inventing them.

---

## Pipeline Design Choices That Drive Reliability

The training approach is two-stage. First, the model is pre-trained on synthetic examples generated via the OpenAI GPT API, using prompt templates conditioned on realistic dataset-usage scenarios. This gives the model broad coverage of extraction patterns before it's ever shown a human-verified annotation. Then it's fine-tuned on curated, validated data with a tighter learning-rate schedule. The synthetic stage teaches the shape of the task; the curated stage tightens it.

Between those two stages sits an LLM-as-a-JUDGE revalidation step. Before curated annotations enter the fine-tuning set, an LLM reviews each one, filtering out false positives and enforcing consistency in how mentions are labeled. It's an automated quality-control layer that compensates for the practical impossibility of fully manual annotation at scale. The authors note this step as a key contributor to the model's stability across different evaluation sets.

Class imbalance is handled with focal loss. In a corpus of research papers, most spans of text are not dataset mentions, and within dataset mentions, some usage-context labels are far more common than others. Without focal loss, a model can achieve decent aggregate metrics by collapsing toward majority-class predictions. Focal loss down-weights easy examples and forces the model to learn from the harder, rarer cases.

The remaining gap — recall of 0.83–0.87 on PRWP papers versus 0.92–0.93 on JDC — points to heterogeneous citation formats as the primary unsolved problem. The model handles the formats it's seen; it struggles with formats it hasn't. That's a data problem more than an architecture problem, and the authors flag adaptive fine-tuning and broader training coverage as the natural next step.

---

## What This Means for Dataset Provenance Pipelines

If you're building infrastructure to track dataset use — for a funder, a data repository, or a research evaluation system — the headline property here is precision. A pipeline that returns false positives forces a manual review step that defeats the purpose of automation. A pipeline with precision at or near 1.00 produces output you can act on directly: feed it into a database, surface it in a search interface, use it to compute dataset impact metrics.

The practical constraint is domain specificity. This model was trained on World Bank papers about forced displacement. It generalizes well within adjacent policy-research domains, as the JDC results show, but there's no evidence yet that it transfers to, say, biomedical literature or economics papers with different citation conventions. Replicating the pipeline in a new domain requires annotated seed data and probably a new round of synthetic generation — the architecture is reusable, but the training data isn't.

For teams working in policy research or development economics, the path is relatively clear: the model and pipeline design are described in enough detail to adapt, the two-stage fine-tuning approach is straightforward to implement, and the JDC generalization result suggests you don't need a massive domain-specific corpus to get useful performance. For teams in other domains, the paper is more useful as a blueprint than as a deployable system.

*Macalaba, R., & Solatorio, A. V. (2026). AI for Monitoring and Classifying Data Used in Research Literature. arXiv:2605.30582*