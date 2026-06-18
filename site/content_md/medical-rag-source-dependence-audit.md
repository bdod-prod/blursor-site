# When the Retriever Decides the Diagnosis

A patient who just received a kidney transplant asks a simple question: how long before I can travel internationally? The RAG system retrieves a handbook from one center and says three months. Retrieve from another center and it says six months. A third says twelve. Each answer is fluent, confident, and grounded in a real institutional document. None of them is wrong, exactly — and that's the problem.

This is the failure mode that a new paper from Carnegie Mellon targets. The researchers built a benchmark called TransplantQA — 1,115 patient questions paired against 102 institutional handbooks from 23 U.S. transplant centers — and ran every question against every handbook to measure how often the answer changes depending on which source the retriever happened to return. The answer: almost always.

The anchoring number is this: across 5,730,465 pairwise answer comparisons, genuine agreement between sources appeared in just 7.1% of the pairs that required a full evaluation. The standard benchmarks used to evaluate medical NLP systems — MedQA, PubMedQA, BioASQ — assume one correct answer per question. They can't see this problem at all.

---

## The Evaluation Gap: One Question, Many Correct Answers

The dominant paradigm for evaluating medical AI is the multiple-choice exam. A model reads a question, picks an answer, and gets scored against a gold label. That works fine for testing whether a model knows that metformin is a first-line diabetes drug. It fails completely for testing whether a deployed RAG system gives consistent guidance to patients across different institutions.

The distinction matters because real RAG systems don't retrieve from a single authoritative source. They retrieve from whatever corpus they're pointed at — and in healthcare, that corpus is typically a collection of institutional documents written by different teams at different times with different clinical philosophies. The question isn't whether the model knows the right answer in the abstract. The question is whether the answer changes based on which document the retriever surfaces.

MedQA and its siblings were never designed to measure that. They assume the answer is a property of the question. In a multi-source RAG deployment, the answer is partly a property of the retriever — and no standard benchmark will tell you that.

---

## What 5.7 Million Pairwise Comparisons Actually Show

The scale of the analysis is what makes the findings credible. The researchers generated 48,056 grounded answers — every question against every applicable handbook — then compared every pair of answers for the same question across different sources. That produced 5,730,465 pairwise comparisons.

The first thing the data shows is that silence is the dominant inter-source relationship. Nearly 79% of all pairs were pre-screened as Absent — at least one handbook simply didn't address the question. That's not a retrieval failure; it's a coverage reality. Even handbooks matched to the correct organ type fail to address the majority of relevant patient questions, with per-organ absence rates ranging from 60% to 78%.

Among the 1,211,220 pairs that required a full LLM evaluation, outright contradiction was rare — under 1%. The more common patterns were Complementary (sources covering different aspects of the same question, 75.4%) and Divergent (sources giving substantively different recommendations, 12.9%). Consistent agreement between sources came in at 7.1%.

That breakdown matters for how you think about the risk. The danger isn't primarily that two handbooks say opposite things. It's that one handbook says "wait three months" and another says "wait twelve months" — both grounded, neither technically wrong from the perspective of the issuing institution, but delivering materially different guidance to the same patient.

---

## Coverage Is Sparse and Uneven Across Institutions

The per-handbook absence rates tell a story about institutional inequality that's easy to miss in aggregate numbers. Across the 102 handbooks in the corpus, absence rates ranged from 0.45 to 0.99 with a mean of 0.74. The most comprehensive handbook in the corpus covers roughly twice as many patient questions as the most silent one.

For a patient, that spread is a lottery. Which center's materials your hospital system has indexed, which handbook the retriever ranks highest, which document happens to be most recent in the corpus — these retrieval accidents determine whether you get a substantive answer or a gap.

Retrieval quality compounds the problem in a counterintuitive direction. When the researchers upgraded their pipeline from a 14B to a 32B model, absence rates dropped by 12 to 19 percentage points across every organ type, with a mean drop of 13.6 points. Better retrieval didn't reduce apparent disagreement — it revealed more of it, by surfacing passages the weaker pipeline had missed entirely. Prior estimates of inter-source divergence, run on weaker retrievers, were understating how often sources actually disagree.

---

## Why Structured Output Is a Clinical Safety Requirement

One of the more striking findings comes from an ablation study on the evaluation design itself. The researchers compared two approaches to classifying answer pairs: a structured single-call judge that returns a classification, reasoning, divergence topic, and clinical significance in one output; and a label-only judge followed by a separate post-hoc extractor.

The post-hoc approach downgraded 78% of Divergent pairs to Complementary. Clinical significance was unrecoverable after the fact — the extractor returned high significance for all 44 Divergent and Contradictory pairs it was asked to evaluate, regardless of actual content. The signal that distinguishes a safety issue from a coverage gap was lost the moment the structured call was split into two steps.

The judge validated well against human annotation: it agreed with the human majority on 128 of 146 adjudicated pairs. Of the 18 errors, 14 clustered on the Complementary/Divergent boundary — the exact distinction that matters most clinically. That's where the system is soft, and it's also where the stakes are highest.

The practical implication is that structured output isn't an engineering preference. It's the mechanism that preserves the information needed to flag when a patient is receiving materially different guidance than they'd receive from another institution. Lose the structure and you lose the audit trail.

---

## What to Do About It

The paper is scoped to U.S. solid-organ transplant patient education, but the framework it describes applies anywhere a RAG system draws from a multi-author corpus — hospital systems, insurance portals, clinical decision support tools. The specific numbers will differ; the structural problem won't.

For teams building or evaluating medical RAG systems, the immediate takeaway is that retrieval quality and source-dependence auditing need to be treated as prerequisites, not optimizations. Running a benchmark that assumes one correct answer per question tells you nothing about whether your system gives consistent guidance across sources. You need a benchmark designed to measure variation — and you need structured output from your judge to preserve the signal that distinguishes a divergence worth flagging from one that isn't.

The coverage gap is worth taking seriously on its own. A mean absence rate of 0.74 means the average handbook in this corpus doesn't address three-quarters of the questions patients are actually asking. Before worrying about which source gives the better answer, it's worth asking whether your corpus covers the questions at all — and whether the retriever you're using is strong enough to surface the coverage that does exist.

*Li, Y., Padman, R., & Krishnan, R. (2026). Same Question, Different Source, Different Answer: Auditing Source-Dependence in Medical Multi-Source RAG. arXiv:2605.29084*