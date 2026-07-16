# LLM brand answers are mostly unstable because language changes the signal

If you ask an LLM to score brand sentiment, the answer can move for several different reasons at once: the model sampled a different continuation, the prompt was paraphrased, the model itself changed, or the question was asked in another language. This paper’s value is that it stops treating that instability as a vague “non-determinism” problem and breaks it into variance components you can actually inspect.

That matters because the practical question is not whether the output varies. It does. The question is what kind of variation dominates, and what kind of sampling gives you a better brand ranking for the same budget.

The corpus is large enough to make that question concrete: 12,933 usable responses.

## What “non-determinism” means in this setup

The paper treats each response as a multilingual sentiment-polarity score toward a brand, then decomposes the variation across a fully crossed design: 20 brands, 8 languages, 3 models, and 15 prompts per brand-language-model cell. In other words, it is not just asking whether the model is noisy. It is asking which facet of the evaluation pipeline is doing the most work.

That framing is important because the outcome is heavily concentrated at zero. The median is 0, the mean is -0.0205, and 91.9% of responses score exactly neutral. So this is not a smooth, well-spread target where tiny perturbations behave nicely. The variance decomposition is a first-order approximation to a near-degenerate distribution.

The paper’s key move is to separate four sources of movement in the score: within-prompt resampling, prompt paraphrase, model identity, and query language. Those are not just abstract sources of error. They are four knobs in a real evaluation workflow, and they do not contribute equally.

---

## Query language is the biggest systematic factor

On the full corpus, query language is the largest systematic facet. In the main-effects fit, it accounts for 26.5% of the variance of one response.

That is the first thing to notice if you are using LLMs to compare brands across markets. It means the language you ask in is not a cosmetic choice. It is one of the main drivers of whether the score changes at all.

Brand identity itself is much smaller in the same fit. The paper reports 1.5% of variance for brand identity, with ICC 0.0146. So the signal you might think you are measuring — the brand’s stable sentiment — is dwarfed by language effects in a single-response reading.

The headline here is simple: if you want a stable ranking, treating language as a nuisance variable will hurt you. It is not noise at the margin. It is the dominant facet.

---

## The variance only looks simpler until you isolate the cell term

The paper then moves to a resampling-isolating subset and adds a full brand × language × model × prompt cell term. That matters because without it, interactions are getting mixed into the residual, which makes the resampling problem look flatter than it really is.

Once that cell term is in place, the residual becomes pure within-prompt resampling. On that subset, resampling explains 34.8% of variance, and the brand-in-context interaction accounts for 29.6%.

This is the part that changes how you should read repeated prompting. If you only repeat the same prompt, you are mostly probing decoder variation inside a very narrow slice of the design space. You are not necessarily learning much about whether the brand ranking itself is stable once language, model, and prompt wording are allowed to move.

The paper’s object-by-facet fit makes that even clearer. The brand’s context-free true score is only 0.7%, and the only sizeable brand-by-facet term is brand-by-language at 8.6%.

---

## More repeats help less than broader coverage

The decision study is the most practical part of the paper. It asks what happens to relative-error variance when you spend your query budget in different ways.

The answer is consistent with the decomposition: adding languages and models reduces relative-error variance much more than adding repeats. That is the structural implication of the variance split. The biggest gains come from sampling across facets that actually move the score, not from hammering the same setup over and over.

The paper puts a hard number on the diminishing return from repetition. A repeat past the fifth reduces relative-error variance by only 0.0003. That is not nothing, but it is small enough that you should be skeptical of workflows built around deep repetition as the main stability strategy.

Reliability stays low even when you expand the design. Brand-ranking reliability is near 0.01 for a single answer and only about 0.36 at the full 8-language, 3-model, 15-paraphrase design. That is the clearest operational result in the paper: if you need a ranking you can trust, the default “ask the same thing a bunch of times” approach is not enough.

---

## What to do if you need usable brand comparisons

If your job is to compare brands with LLM outputs, the paper points to a different sampling strategy. Spend budget on coverage first: languages, model identities, and prompt wording. Use repeats, but treat them as the last increment, not the main one.

There are also two reasons not to overread the exact component shares. First, the models were queried at temperature 0.3, which compresses within-prompt variation, so the 34.8% resampling figure is a lower bound relative to a default-temperature setup. Second, two of the three models were queried in parametric mode and one in grounded retrieval mode, so the model facet confounds model identity with retrieval mode.

The broader caution is methodological as much as practical. The outcome is strongly zero-inflated, and the component estimates come from one CEE corpus collected in spring 2026 with three specific model versions. That does not make the result fragile, but it does mean the safest reading is operational: for this kind of brand-sentiment task, stability comes from breadth of sampling, not from repetition alone.

*Żatuchin, D. (2026). Where Does the Noise Come From? A Variance-Components Decomposition of Non-Determinism in LLM Brand Answers. arXiv:2607.13304*