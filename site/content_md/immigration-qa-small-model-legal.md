# A $29 Fine-Tuning Pipeline Closes 27% of the Gap in Immigration QA — But Leaves the Hard Cases Behind

Most legal AI work splits into two camps: frontier models with no domain adaptation, or expensive fine-tuning projects that require proprietary data and significant infrastructure. This paper sits in a different place — a single researcher building a complete immigration QA pipeline from public sources, for under $30, and then measuring honestly where it works and where it doesn't.

The dataset, ImmigrationQA, covers U.S. immigration law across 13 subdomains, drawing from 11 public sources including the USCIS Policy Manual, the Immigration and Nationality Act, EOIR precedent decisions, and Law StackExchange. The pipeline crawls, chunks, and generates 17,058 source-grounded QA pairs using Claude Sonnet 4.6, then fine-tunes a Llama 3.2 3B model via LoRA on AWS SageMaker. The whole thing — generation, training, storage — costs $29.

The anchoring number is the performance gap it reveals. The fine-tuned 3B model scores 1.08 out of 3.0 on an LLM-judged rubric. Claude Sonnet 4.6 zero-shot scores 1.52. That gap — between a purpose-built small model and a frontier model that has never seen this dataset — is the real finding.

---

## Building a Legal QA Dataset for Under $30

The pipeline starts with 11,327 raw documents crawled from public immigration sources, reduced to 10,056 after deduplication and validation. The main cut removes 1,271 documents that lack a canonical URL — a simple but defensible filter for traceability. USCIS FAQ and myUSCIS help pages dominate the corpus, accounting for 8,934 of the 11,327 raw documents, which means the dataset reflects USCIS's own framing of immigration law more than it reflects immigration courts, advocates, or legal scholars.

Those 10,056 documents get chunked into 18,308 windows of 512 tokens with 64-token overlap, then fed to Claude Sonnet 4.6 through five generation modes: faq, rule, form, precedent, and statistics. Each mode targets a different answer type — procedural how-tos, regulatory rules, form-specific guidance, case-law reasoning, and numerical data. Of 17,079 raw pairs generated, 22 are rejected for having no lexical overlap between the answer and the source passage, and 5 more for being too short. That leaves 17,058 pairs, split 94/6 into training and evaluation.

The $18 spent on Bedrock generation, $10 on a two-hour SageMaker training job on an ml.g5.2xlarge instance, and $1 on S3 storage adds up to a genuinely reproducible budget. The LoRA configuration — rank 32, alpha 64, learning rate 5e-5 — is conservative by design, chosen to avoid catastrophic forgetting of the base model's general capabilities.

One flag worth noting: 47.6% of training pairs carry a `time_sensitive` label, meaning the answer references a fee, form version, date, or numerical threshold that will drift as policy changes. A model trained on this data today may give confidently wrong answers about filing fees or form numbers a year from now.

---

## Fine-Tuning Gains Are Real but Bounded

The evaluation runs on 101 examples drawn proportionally from all 13 subdomains in the 993-pair held-out split. Claude Sonnet 4.6 acts as judge on a 0–3 rubric — which creates a circularity worth keeping in mind, since Sonnet also generated the training data.

Against that rubric, fine-tuning moves the 3B model from 0.85 to 1.08 — a 27% relative improvement over the Llama 3 8B base zero-shot. The fully-correct rate jumps from 4% to 16.8%. Those are real gains for a model a fraction of the size of the baseline.

But the ceiling is visible. Claude Sonnet 4.6 zero-shot scores 1.52 with 24.8% fully correct — without any domain-specific training, without seeing the dataset, just prompted cold. The fine-tuned 3B doesn't surpass Sonnet on any overall metric. The gap between 1.08 and 1.52 represents what parametric fine-tuning alone can't close.

The gains that do appear are concentrated in subdomains where training coverage is dense and rules are relatively stable. Travel documents is the strongest result: the fine-tuned model averages 2.17 out of 3.0, with 50% of examples scored fully correct. Nonimmigrant visas improves by 0.75 mean points. These are areas where the training signal is clear and the answers don't require much discretionary reasoning.

---

## Where the Fine-Tuned Model Regresses

The subdomain breakdown is where the paper gets uncomfortable. On four subdomains — removal, humanitarian, admissibility, and asylum — the fine-tuned 3B actually scores *worse* than the 8B base model it was supposed to improve on.

Humanitarian is the worst: 0.50 mean score for the fine-tuned model versus 0.75 for the 8B base. Removal drops from 1.00 to 0.75. Admissibility and asylum both fall from 1.13 to 1.00. These aren't marginal differences — the fine-tuning actively degrades performance on the cases that require the most nuanced legal reasoning.

The failure patterns the paper identifies are consistent: procedural incompleteness, hallucinated regulatory specifics, and what it calls majority-rule errors — giving the standard answer when the question requires conditional or discretionary analysis. The model appears to memorize surface-level procedural facts well but struggles when the right answer depends on circumstances the training data didn't capture cleanly.

Family-based immigration and asylum together account for 63% of QA pairs in the dataset, yet asylum is one of the weakest subdomains. Volume of training examples doesn't compensate for the complexity of the underlying legal reasoning. If anything, a large volume of imperfectly captured asylum examples may be teaching the model confident-but-incomplete answers.

---

## The Parametric Ceiling Problem

The deeper issue isn't the score gap — it's the architecture. This model has no retrieval component. It can't look anything up at inference time. Every answer comes from parameters baked in during training, which means every answer is potentially stale the moment a fee changes, a form gets revised, or a policy memo updates an eligibility threshold. With 47.6% of training pairs flagged as time-sensitive, that's a structural problem, not an edge case.

The judge-equals-generator circularity is also worth taking seriously. When Claude Sonnet 4.6 both generates the training data and evaluates the model's answers, there's a plausible systematic bias: the judge may be more likely to reward answers that resemble how Sonnet itself would phrase things, and less likely to catch errors that Sonnet itself would make. The 22 hallucination rejections — concentrated in the statistics mode — almost certainly undercount lower-severity quality issues that passed the lexical overlap filter.

Prior work by Mahari et al. (2024) found that retrieval-augmented architectures outperform purely parametric approaches on legal QA. The gap between 1.08 and 1.52 here is consistent with that finding. A fine-tuned small model that can retrieve current source documents at inference time would be a meaningfully different system than what's evaluated here.

---

## What to Do With This

If you're building an immigration QA system on a constrained budget, this dataset is a useful starting point — it's source-grounded, covers 13 subdomains, and the pipeline is reproducible. The fine-tuning gains in stable, procedural subdomains like travel documents and nonimmigrant visas are real and worth having.

But the results argue against relying on parametric fine-tuning alone. The regression on humanitarian, removal, and asylum cases — exactly the subdomains where errors carry the highest stakes — suggests that memorized parameters aren't the right mechanism for legally complex questions. And the time-sensitivity problem means the model's accuracy will erode as policy changes accumulate.

The practical path forward is RAG: use this dataset to give a small model domain vocabulary and procedural grounding, then pair it with a retrieval layer that can pull current source documents at query time. That combination addresses both the accuracy ceiling and the staleness problem. A fine-tuned small model without retrieval, used in production for immigration guidance, is a liability — not because the fine-tuning didn't work, but because the domain moves faster than parameters can.

*Shportun, N. (2026). ImmigrationQA: A Source-Grounded Dataset and Small-Model Adaptation for U.S. Immigration Law. arXiv:2605.30589*