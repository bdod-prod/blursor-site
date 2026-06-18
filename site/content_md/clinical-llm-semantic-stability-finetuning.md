# Medical Fine-Tuning Doesn't Make Clinical LLMs More Stable When Questions Are Rephrased

Clinical AI teams often assume that a model trained on medical data will behave more reliably in medical contexts than a general-purpose one. That assumption is intuitive — domain specialization should mean the model has internalized the right concepts deeply enough that surface variation in how a question is asked doesn't change the answer. A new study from Qatar University tests that assumption directly, and it doesn't hold.

The researchers took 200 clinical questions from MedQA-USMLE and DiagnosisQA, generated 10 meaning-preserving rephrasings of each, and ran all of them through 16 models — 7 general-purpose and 9 domain-specialized. The core question: when the same clinical scenario is worded differently, does a medically fine-tuned model hold its answer more consistently than a general-purpose one? Across nearly every comparison, the answer was no.

The number that anchors the whole study: 1,761 verified meaning-preserving variants, each confirmed by a three-model NLI pipeline, two LLM judges, and a blinded clinical expert who agreed with the automated verification at a 98–99% rate.

---

## The Setup: Rephrasing the Same Clinical Question 10 Ways

The study generated 10 variant phrasings per base question using GPT-4o-mini, covering transformations like question reframing, clinical-to-lay language translation, abbreviation expansion, and active-to-passive voice conversion. To confirm that a rephrasing actually preserved meaning — rather than just sounding similar — the team ran bidirectional entailment checks across three NLI models (PubMedBERT-MNLI-MedNLI, RoBERTa-large-MNLI, DeBERTa-large-MNLI), requiring at least two of three to agree. Variants that passed were then reviewed by GPT and MedLLaMA3 as judges, with a licensed clinician auditing the retained samples under blinded conditions.

Of 2,000 candidate variants, 1,761 made it through the full pipeline. That's a meaningful filter — about 12% were cut because they couldn't be verified as genuinely meaning-preserving. This matters because prior work has shown that automated perturbation methods often fail silently: one study found that 38% of automatically generated perturbations altered meaning despite high similarity scores. Embedding-based similarity metrics, for instance, can score "patient has chest pain" and "patient denies chest pain" as nearly identical.

The primary metric is Meaning-Preserving Variation Sensitivity (MVS): the proportion of verified rephrasings on which a model gives a different answer than it gave on the original. A model with MVS of 0.10 flips its answer on 10% of semantically equivalent variants. That's not a formatting quirk — it's a different diagnosis from the same clinical picture.

---

## Domain Specialization Doesn't Buy Stability

Across matched pairs of general-purpose and domain-specialized models, statistical comparisons of MVS were almost uniformly non-significant. Fine-tuning on medical data neither reliably improved nor reliably reduced robustness to rephrasing. Some domain-specialized models ranked among the most stable; others ranked among the least. There was no consistent direction.

The one statistically significant result cuts the wrong way. MedQwen2.5-7B was significantly *less* robust than its general-purpose base, Qwen2.5-7B, on MedQA — an MVS difference of +0.052 (p = 0.0235, d = 0.230). Medical fine-tuning made that model more likely to change its answer when the question was rephrased, not less.

Raw accuracy tells a similar story. On DiagnosisQA, the strongest general-purpose model — LLaMA 3.1 8B at 0.80 accuracy — matched the best domain-specialized model. On MedQA, LLaMA 3.1 8B reached 0.66, surpassed only by Qwen 3 Biomedical at 0.72. A general-purpose model, with no medical fine-tuning, was competitive with nearly every specialized clinical model on both benchmarks.

Some domain-specialized models (BioMistral, MediChat-LLaMA 3) actually underperformed their general-purpose counterparts, which the authors flag as a possible sign of catastrophic forgetting — where fine-tuning on a narrow domain degrades broader capabilities the base model had.

---

## What Actually Destabilizes Models: Reframing and Register Shifts

Not all rephrasings are equally disruptive. The study breaks down MVS by transformation type, and the pattern is consistent across models and datasets.

Question Reframe — restructuring the clinical scenario without changing its meaning — was the most destabilizing transformation across nearly every model pair on both datasets. Clinical-to-Lay Language translation was similarly disruptive, particularly on MedQA, where replacing technical terminology with plain language produced sharp sensitivity increases in many models.

At the other end, Abbreviation Expansion, Abbreviation Compression, and Active-to-Passive voice changes produced low MVS values. Models are largely invariant to whether "MI" is written out as "myocardial infarction," or whether a sentence is in active or passive voice. These are surface changes — lexical substitutions and shallow syntactic shifts — and models handle them without flipping answers.

The deeper changes are the ones that matter: restructuring how a question is posed, or shifting the register from clinical to lay language. These alter the framing of the scenario without altering its clinical content, and that's enough to change what many models output. MedQA consistently showed higher MVS than DiagnosisQA across nearly all model pairs and transformation types — harder benchmarks amplify instability.

---

## Overconfidence Compounds the Problem

If a model's confidence score tracked its stability, clinicians could at least use it as a warning signal — high confidence meaning the answer is unlikely to flip, low confidence flagging uncertainty. The data shows that's not how it works.

On MedQA, the Pearson correlation between model confidence and accuracy is r = 0.18 — confidence is nearly uninformative as a reliability signal on the harder benchmark. On DiagnosisQA it's somewhat better at r = 0.41, but still weak. Mistral 7B reports confidence of 0.91 while achieving 38% accuracy on MedQA. Qwen 2.5 3B and MedQwen 2.5 3B both report 0.90 confidence at 40% accuracy. These models are not uncertain about wrong answers — they're confidently wrong.

The relationship between confidence variation and prediction instability is similarly weak. When a model flips its answer across rephrasings, it doesn't reliably signal that flip through a confidence drop. The model that changes its diagnosis when a question is reframed doesn't necessarily become less confident — it just gives a different answer with the same apparent certainty.

This is the compounding problem: a model can be unstable, overconfident, and give no signal that either condition applies.

---

## What to Do About It

The practical implication is that switching from a general-purpose model to a medically fine-tuned one doesn't address prompt sensitivity — and the confidence score won't tell you when the model is about to flip. Teams deploying clinical LLMs need to test stability explicitly, not assume it comes with domain specialization.

The transformation types that matter most are question reframing and register shifts. If your clinical workflow involves questions posed by different people — clinicians, patients, intake staff — those natural variations in phrasing are exactly the kind that destabilize model outputs. Testing with rephrased variants of your actual prompts, not just the canonical form, should be part of evaluation before deployment.

Confidence scores as currently implemented shouldn't be used as a proxy for reliability. A model reporting 0.90 confidence on a clinical question may be right, or it may be confidently wrong — the score doesn't distinguish between those cases. Calibration testing against held-out clinical data, and explicit stability checks across phrasing variants, are more informative than the model's self-reported certainty.

The study is limited to multiple-choice benchmarks and constrained inference settings — it doesn't evaluate chain-of-thought prompting or self-consistency sampling, which might reduce instability. But as a test of what these models do by default, under the kind of variation that occurs naturally in clinical language, the finding is clear: domain specialization is not a robustness guarantee.

*Alkaeed, M., Qayyum, A., Abo Kashreef, N., Bilal, M., & Qadir, J. (2026). Same Patient, Different Words, Different Diagnosis? Evaluating Semantic Stability in Clinical LLMs. arXiv:2605.30646*