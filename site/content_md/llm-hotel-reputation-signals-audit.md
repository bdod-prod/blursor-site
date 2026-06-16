# LLM hotel assistants mostly optimize for rating and price, not your reputation signals

LLM-assisted hotel recommendation looks less like a nuanced judgment of service quality than a strong preference for two visible cues: guest rating and nightly price. In this audit, those two attributes drive the model’s final choice far more than the rest of the hotel card, while management response is effectively ignored and the order of the list still nudges the outcome.

That matters because the study is not asking whether an LLM can *describe* hotel quality. It asks what actually changes the recommendation when the model has to choose among five already-retrieved options. That is the part product teams tend to treat as neutral, and it is the part this paper shows is not neutral at all.

Across 12 models, the pattern is stable enough to survive confirmatory testing.

## What the audit tests: selection, not retrieval

The paper is deliberately narrow, and that narrowness is the point. The authors run a pre-specified algorithm audit using a randomized choice-based conjoint design, where each model picks one hotel from a set of five alternatives. Each hotel card carries seven randomly assigned reputation attributes, so the analysis can isolate which signals move the final selection.

This is not a retrieval study. The hotel candidates are already on the table, and the audit asks what happens at the selection stage inside the assistant. That makes the result useful for anyone thinking about ranking, reranking, or prompt-mediated recommendation — but it also means you should not read it as a full booking-pipeline study.

The panel includes 12 instruction-tuned models: four open-weight systems and eight proprietary hosted-API models. The setup is run across three traveler personas — business, family, and eco-couple — plus nine prompt paraphrases, with 3,024 main-arm choice sets per model.

So the basic unit here is simple: given five hotel cards, what gets the model to click one over the others?

---

## Guest rating and price carry most of the weight

Guest rating and nightly price dominate the recommendation structure across the pooled panel. The strongest effect in the audit is the rating jump from 3.9 to 4.7, which raises selection by 31.65 percentage points. The strongest negative effect is price: moving from $129 to $249 lowers selection by 30.03 percentage points.

That is the headline, and it is a pretty blunt one. If you are trying to predict the base behavior of an LLM hotel assistant, “high rating, lower price” is the default pattern before anything more subtle comes into play.

The rest of the signals are not irrelevant, but they are secondary. Eco-certification is positive at 11.61 percentage points, and review volume and recency also help. What does *not* help is management response: its AMCE is 0.11, with the paper treating that as statistically equivalent to zero.

In other words, the model is paying attention to a narrow slice of the reputation stack. It sees customer rating and price clearly, gives some credit to sustainability and popularity cues, and mostly discards the signal that a human manager actually replied.

---

## Display order still changes the result

The paper’s most uncomfortable finding may be the simplest one: list position matters even though it carries no content. Being listed first causally shifts recommendation probability, and the authors translate that into a trade-off of about $11.7 per night.

That is a useful reminder for product teams because it means the UI is not just a wrapper around the model. The presentation layer is part of the decision process. Even if the cards are identical in content, order still changes what the model picks.

This is also where the paper’s explanation audit matters. The models’ stated reasons broadly track their revealed weights, but only imperfectly. So the explanation is directionally informative, not a clean forensic record of how the decision happened.

The confirmatory part of the paper holds up better than many audits do: 10 of the 12 pre-specified hypotheses survive Holm correction. That does not make the findings universal, but it does make them more than a loose collection of post hoc patterns.

---

## What to do about it in an LLM hotel product

If you are building or auditing a hotel assistant, the practical move is to stop assuming the model will naturally optimize the signals you care about. It probably will not. By default, it behaves as if guest rating and price are the main objective, and it may ignore management response altogether unless you intervene.

If sustainability, service recovery, or brand quality should matter more, you likely need explicit constraints or a downstream reranker. The paper’s results suggest that merely exposing a feature in the card is not enough. The feature has to be made decision-relevant.

You should also test the full UI pipeline, not just the model prompt. A ranked list can bias the outcome before the model ever “reasons” about the options, and a content-free first slot is enough to move the result.

The cleanest reading is not that LLMs are bad at hotel choice. It is that they are predictably biased toward the signals that already look like consumer shortcuts. If that is not the behavior you want, you have to design against it.

*Mirza Samad Ahmed Baig, Syeda Anshrah Gillani, & Asher Ali (2026). Whose hotel does the AI recommend? An algorithm audit of reputation signals in LLM-assisted hotel selection. arXiv:2606.16344*