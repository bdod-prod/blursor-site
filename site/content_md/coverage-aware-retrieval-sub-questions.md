# Coverage-Aware Retrieval: Why Relevance Training Leaves Nuggets on the Table

When someone asks a retrieval system a multi-aspect question — the kind that has five distinct sub-topics, each worth knowing about — the system's job isn't just to find relevant documents. It's to find documents that collectively *cover* the question. Those are different objectives, and most dense retrievers are only trained for one of them.

The problem is geometric. Relevance training pushes a query and its relevant documents into a tight cluster in embedding space. That's exactly what you want for a focused query. But for a broad, multi-aspect question, it means the top-10 results tend to orbit the same nuggets — the most prominent sub-topics — while the rest go unrepresented. The documents are relevant. They're just redundant.

A new paper from researchers at the University of Amsterdam, Johns Hopkins, and Leiden tests whether you can fix this at training time, by supervising a retriever on sub-question answerability rather than document relevance. The headline result: 10% better nugget coverage on multi-aspect benchmarks, with no meaningful drop on standard retrieval metrics.

---

## The Geometry Problem: Relevance Clusters, Coverage Doesn't

Standard dense retrievers are trained on datasets like MSMARCO, where the signal is whether a document answers a query. That signal is genuinely useful — relevance finetuning lifts average nDCG@10 on BEIR by 2.6 points over an unsupervised baseline. But it translates only weakly into nugget coverage gains. The two objectives pull in different directions.

The evidence for this shows up in metric variance. Across all the systems the authors tested on NeuCLIR24 ReportGen, relevance-based metrics (Precision, nDCG) varied by about 0.8% across systems, while coverage-based metrics (α-nDCG, subtopic recall) varied by only 0.4%. That's not a sign that coverage is easy — it's a sign that most retrieval systems are similarly bad at it. Relevance training differentiates systems on relevance; it barely differentiates them on coverage.

One finding that underscores this: the relevance-finetuned model actually drops below the unsupervised baseline on NeuCLIR ReportGen and CRUX Multi-News. Training harder on relevance makes coverage *worse*, not better. Coverage-based training, by contrast, adds 5 points on coverage scores while keeping relevance ranking at roughly the same level.

---

## How CoveR Builds Coverage Supervision from Sub-Questions

The core idea is to replace document-level relevance labels with sub-question answerability signals. If a document answers several of a query's sub-questions, it's covering more ground — and that's what the retriever should learn to prefer.

Building the training data for this required constructing a new dataset called SCOPE. The authors started with 80K Researchy Questions — long, complex queries with multiple implicit sub-topics — and decomposed them into 1.2M sub-questions. Then Llama 3.3 70B judged the top BM25-retrieved candidates for each sub-question on a 0–5 answerability scale, producing 24M judgments in total. The resulting SCOPE dataset contains 90K training pairs, each annotated with sub-question coverage signals rather than binary relevance labels.

Two training objectives sit on top of this data. CovCon (coverage contrastive learning) samples positives from documents with high answerability scores and negatives from low-answerability ones — a contrastive setup, but with coverage as the criterion. CovDistil (coverage self-distillation) takes a different angle: it aggregates sub-question similarity scores into a teacher distribution and aligns the original query encoder to it via KL divergence, with a weight of λ=0.1 found optimal in ablation.

One practical detail that mattered: the original Researchy Questions are written as exploratory queries, not as retrieval requests. The authors added a query reconstruction step — using in-context prompting to rewrite them into more request-like forms — which provided better lexical anchoring for the coverage signal and measurably improved coverage metrics on DUC04. The full training pipeline runs in two stages: MSMARCO relevance pre-finetuning first, then SCOPE coverage training, so the model retains general retrieval capability while gaining coverage awareness.

---

## Benchmark Results: Coverage Gains Without Relevance Regression

Across three nugget-based benchmarks — NeuCLIR24 ReportGen, CRUX DUC04, and CRUX Multi-News — CoveR improves nugget coverage by roughly 10% over strong dense baselines, while matching or exceeding Nomic-Embed and Qwen3-0.6B on CRUX Multi-News despite training on less data with a smaller backbone.

The heuristic diversification approaches — MMR, multi-query retrieval with RRF, SimSum, or RRB aggregation — consistently hurt performance. They fall below the relevance-only baseline in most conditions. Post-hoc diversity is not a substitute for coverage-aware training; it's actively counterproductive here.

One result worth pausing on: SPLADE-v3 scores 62.9/73.7 on NeuCLIR24 ReportGen (α-nDCG/coverage@10), while Qwen3-Embed-8B — a much larger model with stronger relevance ranking — scores 62.7/69.5. A sparse retrieval model, by virtue of matching on diverse lexical terms, incidentally covers more nuggets than a dense model optimized for relevance. That's not a designed property of SPLADE-v3; it's a side effect of how sparse retrieval works. The authors flag coverage-aware sparse retrieval as a natural direction for future work.

---

## What CoveR Still Can't Do

CoveR scores documents independently. There's no mechanism to detect redundancy across the retrieved set — the model can't see that documents three through seven all cover the same sub-topic while sub-topics four and five go unrepresented. Coverage-aware training shifts the distribution of what gets retrieved, but it doesn't guarantee that the top-10 collectively span distinct nuggets.

The oracle experiment makes the remaining gap concrete. When you replace the original query with annotated nugget sub-questions at retrieval time — OracleQ — performance jumps by more than 10 α-nDCG points above CoveR. Explicit sub-question decomposition at query time, not just at training time, is a large untapped lever. CoveR bakes coverage awareness into the encoder; it doesn't replicate what you'd get from actually knowing the sub-questions.

That 10-point gap is the honest summary of where the field stands. Coverage-aware training is the only approach tested that reliably improves nugget coverage without sacrificing retrieval quality — but it's still well short of what's possible when the sub-questions are known. The path from here likely involves retrieval systems that can reason about what they've already retrieved, not just score each document in isolation.

For practitioners building RAG pipelines over complex, multi-aspect queries, the practical implication is direct: if your retriever is trained only on relevance, your top-k results are probably clustering around the same sub-topics. Coverage-aware training — or at minimum, explicit query decomposition before retrieval — is worth the investment. Heuristic diversification at retrieval time won't save you; the evidence here is that it makes things worse.

*Ju, J., Yang, E., Adriaanse, T., Verberne, S., & Yates, A. (2026). Search for Coverage: Learning Coverage-Aware Retrieval with Augmented Sub-Question Answerability. arXiv:2605.28522*