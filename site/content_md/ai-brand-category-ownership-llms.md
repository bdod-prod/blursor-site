# AI brand “ownership” is moderately concentrated, but the winner changes by model

A useful way to think about this paper is that it tries to map who actually “owns” a category inside LLM recommendations. Instead of asking whether one model is better than another, it asks a narrower business question: when someone types a brand-free category query, which brands get named, how often, and whether different models converge on the same answer.

That framing matters because brand visibility in AI surfaces is starting to look less like traditional search rank and more like a mix of recommendation share, category association, and model-specific taste. The paper’s contribution is to turn that into something measurable across five industries and three models, then check whether the pattern is stable enough to call true ownership.

Across 3,750 responses, the answer is: only partly.

---

## What the study actually measured and how robust it is

The dataset is larger and cleaner than most people’s intuition about “AI brand visibility” work. The authors ran 250 brand-free category queries across five industries, with 10 brands per industry, on three models — OpenAI GPT-5.2, Google Gemini 3 Flash, and Perplexity sonar-pro — and repeated each query five times under a dice-roll stability protocol.

That gives them 3,750 responses in total. For each response, they recorded which brands were mentioned and where each brand first appeared in the list. That means the study is not just counting mentions; it is also using ordinal position as part of its definition of category ownership.

They also tried to make sure the categories they chose were not wildly out of step with model behavior. A BERTopic check found that only 4.2% of discovered topic clusters fell outside the original categories, which is a decent sign that the query setup was not completely detached from how the models organize intent.

The one thing to keep in mind is that the paper is observational. It gives you a map of recommendation behavior, not a causal explanation for why the map looks the way it does.

---

## Recommendation share is real, but it is not monopoly-like

The headline concentration result is moderate, not extreme. The mean Gini coefficient is 0.28, which sits well below the paper’s 0.60 power-law threshold. In plain English: the models do not collapse onto a single brand most of the time, even when the query is brand-free and category-specific.

That matters for anyone thinking in terms of “AI owns this category” or “we need the one brand the model always says.” The paper’s numbers say the market is more distributed than that. Brands do accumulate recommendation share, but they do so in a way that still leaves room for several names to circulate.

The rarest case is a true competitive vacuum, where no brand meaningfully dominates. That happened in only 8.0% of the 250 queries. So most categories do have some visible hierarchy — just not a hard monopoly.

This is the subtle part: moderate concentration does not mean weak category memory. It means the model can still have a recognizable “default set” without making the same single top pick every time.

---

## The top brand is not stable across models

If you only care about the winner, this is the number that matters most: full cross-model agreement on the top-recommended brand occurred in 104 of 250 queries, or 41.6%. That is low enough to make “the AI answer” a misleading simplification.

In other words, less than half the time, all three models land on the same top brand. That is not just random noise. It means the model family you test can materially change which brand looks dominant in a category.

That instability is important for operators who are trying to benchmark visibility. A brand can look strong in one model and less visible in another, even when the prompt stays the same. So if you only test one model, you may be measuring platform preference as much as category ownership.

The practical implication is simple: if you are tracking AI brand visibility, treat cross-model agreement as a first-class metric, not a nice-to-have extra.

---

## Industry changes the kind of displacement you see

The most interesting result in the paper is not just that brands compete differently across industries — it is that some industries do not behave like competition at all. Consulting is the clearest example. Instead of one brand displacing another, consulting rewarded co-recommendation, with a displacement ratio of 0.4:1.

That is very different from the other four industries, where the ratios point to one-directional substitution, ranging from 2.0:1 to 4.3:1. The unweighted mean across all five industries is 2.4:1, but that average hides the fact that consulting behaves like a bundled category while the others behave more like winner-takes-more spaces.

This makes sense if you think about how LLMs talk about consulting brands. The paper notes the familiar “Big 4” and “MBB” framing: the model often enumerates the obvious firms together instead of choosing one. So the category is not being treated as a single-slot leaderboard.

That distinction matters for brand strategy. In some industries, the AI surface is closer to a shortlist generator. In others, it is closer to a substitute picker.

---

## Where the metrics can mislead

The paper is unusually honest about the places where its own mapping could break. First, construct validity is still open: “brand ownership” is a useful operational definition, but it has not yet been proven to match how users actually perceive category choice.

Second, extraction matters. The authors call out an alias-matching problem that likely inflates EY-related results because short aliases can match inside unrelated words. They explicitly warn that EY values are likely inflated due to this artefact, so any EY interpretation should be cautious.

Third, the coverage is narrow. The study only uses three models, one time point, and 10 brands per industry. That means the results are best read as a snapshot of a sampled market, not a complete census of brand coverage.

And fourth, the query set is researcher-designed, which means it may not reflect the real distribution of user prompts. That is a common limitation in this kind of work, but it still matters if you are trying to turn the findings into a production monitoring framework.

---

## What to do about it

If you are tracking AI visibility, this paper argues for a shift in how you measure it. Do not rely on a single model, a single prompt set, or a single “top brand” metric. Track concentration, cross-model agreement, and displacement together, because they are measuring different things.

The most actionable takeaway is to separate two questions that often get blended together: “Does the model mention us?” and “Does the model treat our category as a one-winner space?” The answer can be different by industry, and consulting is the clearest example of that split.

For practitioners, that means the goal is not always to win the top slot. In some categories, the better objective is to become part of the model’s stable co-recommendation set. In others, you are fighting for outright substitution. The strategy should follow the category shape, not the other way around.

*Żatuchin, D. (2026). Who Owns the AI Recommendation? A Multi-Industry Empirical Map of Brand Category Ownership Across Large Language Models. arXiv:2606.23057*