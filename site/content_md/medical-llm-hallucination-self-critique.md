# Medical LLMs Fail Clinical QA by Losing Track of Evidence, Not by Making Things Up

The standard story about hallucination in medical AI is that models invent facts — fabricated citations, made-up drug names, confident nonsense. That story is mostly wrong, at least for the kind of clinical question-answering that actually matters in practice. When researchers at the University of Maryland, Baltimore County tested open-source medical LLMs against real discharge summaries, fabricated sources showed up in just 5.2% of wrong answers. The real problem was something harder to fix: models failing to pull together evidence spread across multiple patient records.

The paper introduces Med-HEAL, a self-critique pipeline that retrieves examples of past hallucinations and uses them to prompt a model to catch and correct its own errors — no fine-tuning required. Tested across five open-source medical LLMs on 962 clinical questions from the EHRNoteQA benchmark, it's the only intervention that reliably improves accuracy. Standard retrieval-based in-context learning and chain-of-thought prompting both fail to do so consistently.

The anchoring number: BioMistral-7B's accuracy drops from 74.1% to 38.9% as the number of discharge notes in a question grows from one to three — a 35-point collapse that frames everything else in the paper.

---

## The Hallucination Problem in Clinical LLMs Is Mostly Reasoning Failure, Not Fabrication

When BioMistral-7B got a question wrong — and it got 348 of 962 wrong — GPT-4o was used to classify what kind of wrong it was. The breakdown is striking: 98.0% of incorrect answers involved factual errors (incorrect or unsupported claims), 82.2% showed incomplete reasoning (failure to integrate evidence across the record), and only 5.2% involved fabricated sources.

Those categories aren't mutually exclusive — a single wrong answer can be both factually incorrect and show incomplete reasoning — but the pattern is clear. The model isn't inventing things wholesale. It's reading a patient record, missing connections between pieces of evidence, and arriving at a conclusion that doesn't hold up. That's a different failure mode than the one most hallucination mitigation work targets.

The multi-document context makes this worse in a predictable way. With a single discharge note, BioMistral-7B answers correctly 74.1% of the time. Add a second note and accuracy falls to 62.3%. Add a third and it falls to 38.9%. The model isn't degrading randomly — it's being asked to integrate more evidence than it can reliably handle, and it fails by omission rather than invention.

---

## Context Length Kills Accuracy — and Naive Fixes Make It Worse

The obvious response to a retrieval problem is retrieval-augmented in-context learning: show the model examples of correct answers, incorrect answers, or both, and let it calibrate. It doesn't work here. BioMistral-7B's accuracy actually drops from 53.8% to 48.4% under contrastive ICL — examples of both good and bad answers. Qwen2.5 falls from 88.7% to 86.9% under negative and contrastive conditions. Across models, the pattern is inconsistent at best and counterproductive at worst.

Chain-of-thought prompting fares similarly. DeepSeek-R1-8B picks up 1.4 points under a conclusion-first CoT variant, going from 76.9% to 78.3%. Qwen3 reaches 94.3% with the same strategy. But these aren't systematic gains — they're model-specific fluctuations that don't generalize. If you're looking for a prompt-engineering fix that works across the board, neither ICL nor CoT is it.

The likely reason is that these strategies add tokens to an already-crowded context. When the model is already struggling to integrate three discharge notes, adding demonstration examples doesn't help it reason better — it just gives it more to process. For smaller models with tight context windows, this is a hard constraint, not a tuning problem.

---

## Self-Critique With Retrieved Hallucination Examples Works — For Most Models

Med-HEAL takes a different approach. Instead of showing the model examples of correct answers, it shows it examples of its own past mistakes on similar questions. The pipeline has four steps: generate a zero-shot answer, detect potential errors in that answer, retrieve semantically similar hallucination examples from the Med-HEAL dataset using GTR-T5-Base embeddings, then prompt the model to critique and correct itself. No weights are updated.

The results hold up across three of five models. DeepSeek-R1-8B improves from 76.9% to 85.9% — a 9.0-point gain, the largest in the study. Llama-3.1-8B goes from 92.1% to 94.1% (+2.0 points). Qwen2.5-7B moves from 91.6% to 92.8% (+1.2 points). All three are statistically significant by McNemar's exact test.

The two exceptions are instructive. BioMistral-7B can't run the pipeline at all — its 4K context window isn't large enough to hold the self-critique prompt, and when fine-tuned to try, it starts outputting unrelated biomedical text instead of critiquing its answers. Qwen3, at the other end, is already scoring around 92–93% at baseline, leaving little room for measurable improvement. The pipeline's value is concentrated in the middle tier: models capable enough to self-correct but not already near ceiling.

---

## GPT-4o Outperforms Human Reviewers as a Clinical QA Judge

Evaluating open-ended clinical answers is genuinely hard. The paper used three human reviewers — medical students — to build a 100-item gold standard, resolving disagreements by majority vote. Inter-rater agreement was only fair-to-moderate, driven largely by one reviewer (a first-year preclinical student) applying a systematically stricter threshold than the others. Reviewers A, B, and C agreed with the gold standard at 89%, 87%, and 80% respectively.

GPT-4o, calibrated using the Rogan-Gladen estimator against that same gold standard, hit 94.0% — higher than any individual human reviewer. That's a meaningful result for anyone building evaluation infrastructure for clinical NLP: a well-calibrated LLM judge can be more consistent than a small panel of human reviewers, at least on this kind of task.

The runtime cost of Med-HEAL is real and worth naming. The self-critique pipeline runs at roughly 3x the latency of zero-shot inference for Llama-3.1 (5 seconds per item versus 16 seconds on an RTX 4090) and 3.4x for Qwen2.5. For batch evaluation that's manageable; for real-time clinical decision support it's a harder sell.

---

## What to Do With This

If you're deploying or evaluating open-source medical LLMs on multi-document clinical QA, the practical read is this: don't expect retrieval-based ICL or chain-of-thought to bail you out. They're inconsistent enough that you can't rely on them, and in some configurations they make things worse.

The self-critique approach is the more defensible intervention — but it requires a model with enough context capacity to run the pipeline (ruling out anything near 4K tokens), and it works best when the model has real accuracy headroom to recover. DeepSeek-R1-8B's 9-point gain is the clearest case for it; if your baseline is already above 90%, the gains will be smaller and may not justify the latency cost.

The deeper finding — that clinical hallucination is mostly a failure to integrate evidence, not a failure of factual recall — has implications beyond this specific pipeline. Interventions that help models track and synthesize evidence across long documents are likely to matter more than interventions aimed at grounding factual claims. That's a different design target, and it's worth keeping in mind as the field moves toward longer-context clinical applications.

*Liao, Y., Franco, Z., Lizarraga Mazaba, J. E., & Chen, K. (2026). Med-HEAL: Analyzing and Mitigating Hallucinations in Medical LLMs with Hallucination-Aware In-Context Learning. arXiv:2606.01301*