# Science News Optimized for Reader Learning Outperforms Standard NLP Metrics by Every Human Measure

Most science news is evaluated the way most NLP output is evaluated: ROUGE, BLEU, BERTScore, maybe an LLM judge. These metrics measure lexical overlap, semantic similarity, and generic quality — things that are easy to compute and have become the default proxies for "good." The problem is that none of them measure whether a reader actually learned anything. For science communication, that's the whole point.

A new paper from Old Dominion University takes this problem seriously. The authors built a framework called KnowledgeGain that measures comprehension directly — pre- and post-reading quiz accuracy — and then used it to optimize science news generation. The result is a system that produces articles readers measurably learn more from and overwhelmingly prefer, without any degradation in factual quality.

The anchoring number: the highest Spearman correlation between any standard NLP metric and actual human knowledge gain was 0.296 — ROUGE-2, with a confidence interval that includes zero.

---

## Standard Metrics Don't Measure Whether Readers Actually Learn

Every standard automatic metric the authors tested — ROUGE-1, ROUGE-2, ROUGE-L, BLEU, BERTScore, and LLM judge scores across multiple dimensions — showed near-zero correlation with whether human readers actually learned from science news articles. Not weak correlation. Near-zero, with bootstrap confidence intervals that all include zero. The best of the bunch was ROUGE-2 at 0.296, which is too uncertain to use as a proxy for anything.

This matters because the field has been optimizing for these signals. A science news article that scores well on ROUGE may have high lexical overlap with a reference text while teaching the reader nothing. An article that scores poorly may be the one that actually builds understanding. The metrics and the outcome are measuring different things entirely.

The implication isn't just academic. If you're generating science news at scale — for a publisher, a research institution, or an AI-powered communication tool — and you're selecting or ranking outputs by standard metrics, you have no signal on learning quality. You're optimizing in the dark.

---

## The KnowledgeGain Framework: Pre/Post Comprehension as a Measurable Signal

KnowledgeGain is straightforward in concept: give readers a set of comprehension questions before and after they read an article, and measure the difference in accuracy. The authors built a question generation pipeline (QGen) that automatically creates six questions per research abstract — two true/false, two extractive multiple-choice, two inferential multiple-choice — spanning factual recall and inference following Bloom's Taxonomy.

To validate that the metric captures real differences, they ran a controlled study with 30 STEM undergraduates reading three types of science media: full science news articles, abstracts, and tweets or threads. A mixed-effects model estimated KGain of 58.6 points for science news, 54.0 points for abstracts, and 26.7 points for tweets — a large and statistically significant gap between the long-form formats and the short one.

Running human studies at scale isn't practical for training a generation model, so the authors built LLMSim: an LLM reader simulator calibrated to match human answer-outcome distributions. The calibration uses KL divergence minimization, and the results are close for the formats that matter most — KL of 0.021 for news and 0.007 for abstracts. The gap between simulated and human behavior is small enough to use LLMSim as a scalable proxy for relative comparisons during training.

The naive alternative — just asking an LLM to answer the questions directly — fails badly. A raw LLM answers 91.6% of questions correctly versus the human rate of 35.2%, and never says "I don't know" versus the human IDK rate of 24.1%. That produces a global KL divergence of 4.953 against human distributions. The calibration work is what makes the simulator usable.

---

## Filtering Training Data by Simulated Learning Gain Improves Real Outcomes

With a working simulator, the authors built an optimization pipeline. They fine-tuned a language model on a 2,747-instance corpus of abstract–QA–news triples, then filtered training examples to keep only those where the simulated reader showed positive knowledge gain. This approach — SFT-KG-Positive — is deliberately simple: no reinforcement learning, no reward model, just a learning-centered filter applied before fine-tuning.

The filtering step alone produced a 12.5% relative improvement in simulated KGain over training on all data indiscriminately. On the held-out evaluation set of 300 abstracts, mean KGain rose from 0.1492 (SFT-All) to 0.1678 (SFT-KG-Positive). That's the simulated signal — the human results are what confirm it translates.

The approach is worth noting for its simplicity. The authors didn't need to solve reinforcement learning from human feedback or build a separate reward model. Selecting training examples by whether a calibrated simulator shows learning gain was enough to shift the model's behavior in a measurable direction.

---

## Human Evaluators Confirm the Optimized System Teaches More

The human evaluation covered 20 topics and 640 participant–article observations, comparing the KGain-optimized system against an agentic baseline in both pairwise preference and direct comprehension measurement.

In blinded pairwise comparison, human evaluators preferred the KGain-optimized articles 87.0% of the time, with a Wilson 95% confidence interval of 79.0–92.2%. That's not a close call. Human normalized KGain was significantly higher for the optimized system — 0.777 versus 0.719 for the baseline (Wilcoxon p=0.048) — and post-reading accuracy also improved significantly (p=0.032).

Critically, quality didn't trade off against learning. Pointwise evaluation on accuracy, completeness, relevance, and clarity all favored the optimized system, with the largest gap on the accuracy dimension. The articles that taught more were also rated as better articles by every conventional measure. Learning gain and quality moved together, which suggests the optimization wasn't producing articles that were pedagogically aggressive at the expense of being readable or accurate.

---

## What This Changes for Science Communication Pipelines

If you're building or evaluating a science news generation system, the practical takeaway is that your evaluation stack is probably missing the signal that matters most. ROUGE and BERTScore tell you about surface similarity to a reference; they say nothing about whether a reader walks away understanding the science better. Adding a comprehension-based evaluation — even a simulated one — gives you a signal those metrics can't.

The KnowledgeGain approach is also a template for a broader class of problems. The authors used supervised filtering rather than direct reward optimization, which keeps the pipeline simple and avoids some of the instability that comes with RL-based fine-tuning. The tradeoff is that stronger optimization might yield larger gains — but it also risks overfitting to the simulator's artifacts or encouraging articles that maximize answerability at the expense of nuance. The current approach is conservative by design.

One caveat worth holding: the human studies used STEM undergraduates, not general audiences. Whether the same optimized articles outperform baselines for readers with less scientific background is an open question. The simulator is also calibrated to aggregate distributions, not individual topics — per-topic predictions remain noisy. These are real limitations, but they don't undermine the core finding: optimizing for learning gain produces articles that humans learn more from, and standard metrics give you no way to know that.

*Soós, D., Jiang, M., & Wu, J. (2026). KnowledgeGain: Evaluating and Optimizing Science News Generation for Reader Learning. arXiv:2605.31099*