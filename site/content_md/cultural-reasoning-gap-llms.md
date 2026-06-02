# LLMs Score 94% on Cultural Knowledge Tests and 40% When the Answer Choices Are Removed

Most cultural benchmarks ask models to pick the right answer from a list. That's a reasonable starting point, but it turns out to be measuring something much narrower than cultural reasoning — it's measuring whether a model can recognize a correct answer when it sees one. Remove the scaffolding, and performance collapses.

That's the central finding from CultureForest, a new benchmark that tests the same cultural knowledge across three formats of increasing difficulty: multiple-choice, binary classification without grouped options, and open-ended generation. The same model, the same norms, the same countries — just different amounts of scaffolding. The results expose a gap that's hard to explain away.

The anchoring number: GPT-4.1 scores 94.38% in multiple-choice mode and 40.15% when the answer choices are stripped out.

---

## The Knowledge-Reasoning Gap in Cultural AI

Prior cultural benchmarks — CulturalBench, FORK, TyDiP, NativQA, and others — mostly test recall. They ask whether a model knows a norm, not whether it can apply one. The distinction matters because real-world cultural competence looks more like the latter: a model helping draft a business email, advising on etiquette, or navigating a sensitive topic doesn't get a list of options to choose from.

CultureForest operationalizes this distinction across 5,378 instances covering 53 countries and 8 domains — Business Culture, Communication, Etiquette, Family, Greetings, Naming, Religion, and Dates of Significance. Each instance exists in three parallel formats. Easy mode is standard multiple-choice. Medium mode presents each option individually as a binary classification problem, removing the relative comparison that makes multiple-choice tractable. Hard mode asks for open-ended generation with no options at all.

The benchmark also needed a reliable automated judge for open-ended outputs, since human annotation at scale is expensive. The team trained C-Verifier, a lightweight classifier based on Qwen3.5-0.8B, to label responses as Satisfy, Neutral, or Violate relative to a stated norm. In K-fold cross-validation, it hits 91.53% accuracy — compared to 85.30% for Gemini-3.1-Pro used as a judge. That gap matters: a weaker judge would blur the very distinctions the benchmark is designed to surface.

---

## Difficulty Mode Reveals the Illusion of Cultural Competence

In Easy mode, top-tier models cluster so tightly near the ceiling that the benchmark barely distinguishes them. GPT-4.1 scores 94.38%, Claude-Sonnet-4 scores 96.31%, and most frontier models exceed 90%. If you stopped here, you'd conclude that cultural knowledge is largely a solved problem for large models.

Medium mode tells a different story. GPT-4.1 drops to 40.15%. Smaller models don't just drop — they essentially stop working: Phi-3.5-mini scores 0.47%, Mistral-7B scores 3.53%. Error analysis confirms these aren't formatting failures; the models are generating content that's simply wrong about the norms. The pattern holds across the benchmark: models are good at relative discrimination — picking the best answer from a set — and poor at absolute discrimination, where they have to construct or classify without a reference frame.

Hard mode (open-ended generation) partially recovers scores for top-tier models, which is somewhat counterintuitive. The authors attribute this to the format giving models more room to hedge and elaborate. But the regional disparity in Hard mode is severe: GPT-4.1's max-min performance gap across countries reaches 80.85, against a mean accuracy of 52.15. The gap exceeds the mean — meaning the spread between the model's best and worst regions is wider than its average score. OpenAI-o3 is the strongest overall model in Hard mode at 59.89%, but still carries a 72.31 regional gap. No model comes close to resolving this.

---

## Scaling and Reasoning Don't Fix Cultural Equity

The paper tests two obvious interventions: scaling up model size and enabling test-time reasoning (chain-of-thought). Scaling helps — larger models consistently score better across all three difficulty modes. Test-time reasoning, by contrast, yields only modest average gains, which is striking given how much it improves performance on math and code benchmarks.

More troubling is what test-time reasoning does to regional equity. In Easy and Medium settings, enabling reasoning modes widens the max-min gap across countries rather than narrowing it. Models that reason more carefully appear to do so unevenly — improving on the regions they already handle well, while leaving others behind. The regional preference structures are also largely shared across models: pairwise Spearman correlations between models' country-level rankings are moderate-to-high in Medium mode and rise sharply in Hard mode, approaching near-universal agreement. Whatever biases are driving regional disparities, they're not idiosyncratic to individual models — they're systemic.

The implication is that neither of the standard levers for improving model capability — more parameters, more reasoning — addresses the equity dimension of cultural performance. The best current model still fails on roughly 40% of open-ended cultural reasoning instances, and fails much more on some regions than others.

---

## Knowing a Norm and Using It Are Different Skills

To separate knowledge acquisition from reasoning, the paper runs a context augmentation condition: models are given the relevant cultural norms explicitly before being asked to reason about them. Performance improves consistently across models when knowledge is provided — confirming that knowing the norm matters.

But the benefit is uneven in a revealing way. For models at 0.8B and 2B scale, the gap between the knowledge-provided and knowledge-withheld conditions is negligible. These models nominally possess the relevant knowledge — they can classify norms correctly in isolation — but they can't use it when reasoning is required. A meaningful threshold emerges around 4B parameters, where both knowledge coverage and the benefit of explicit context augmentation grow substantially.

Even at large scale, the gains from context augmentation plateau. Providing knowledge helps, but it doesn't close the gap. The bottleneck isn't retrieval — it's reasoning over norms once they're available.

The response-type breakdown adds another layer. Across all models in open-ended generation, the Violate rate stays below 1% — models rarely explicitly break a stated norm. But smaller and lower-capability models compensate by going neutral: 40–50% of their outputs avoid taking any position at all. Qwen3.5-0.8B hits 50.50% Neutral on norms that sometimes apply; Phi-3.5-mini reaches 43.53%. Under stricter norms, even larger models shift toward neutral responses. The safe non-answer is the dominant failure mode, not the wrong answer.

---

## What This Means for How You Evaluate Cultural Capability

If you're assessing a model for any application where cultural sensitivity matters — localization, customer-facing tools, content moderation, regional deployment — multiple-choice cultural benchmarks are not sufficient. They measure recognition, not reasoning, and the two diverge sharply once scaffolding is removed.

The practical implication is to test in formats that match your deployment context. If your application generates text rather than selects from options, your evaluation should too. The CultureForest Hard mode results are the closest proxy for that scenario, and the best current model scores 59.89% there — with a 72-point spread across regions.

Context augmentation is worth using: providing explicit cultural norms as context improves performance for models above roughly 4B parameters. But treat it as a partial fix, not a solution. The reasoning bottleneck persists even when knowledge is handed to the model directly.

For regional coverage specifically, the shared preference structures across models mean you can't solve this by switching providers. The regional gaps are systemic. If equitable performance across geographies matters for your use case, that needs to be a first-class evaluation criterion — and current models don't meet it.

*Ye, Y., Feng, X., Tang, J., Cao, X., Zhang, Z., Feng, X., Yang, B., & Qin, B. (2026). CultureForest: Understanding and Evaluating Cultural Norm Grounded Reasoning in LLMs. arXiv:2606.01879*