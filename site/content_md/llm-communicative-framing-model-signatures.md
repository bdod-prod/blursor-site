# Model Identity Predicts How LLMs Frame Responses, Independent of Topic

Most audits of LLM behavior ask whether a model gets the answer right. This paper asks something different: regardless of what a model says, *how* does it say it? Does it speak as an insider or an outsider? Does it generalize about groups? Does it use emotional, empathetic language? Does it follow basic conversational norms?

The answer turns out to depend heavily on which model you're running — not on what topic you're asking about, and not on which country's cultural context the question comes from. Mistral, Gemma, and Llama each have a communicative signature that persists across subjects and geographies. Choosing between them isn't just a capability decision; it's a rhetorical one.

The paper that establishes this introduces FRANZ, an audit framework covering four dimensions of communicative framing, and applies it to a corpus of 376,000 subjective questions drawn from Reddit communities across seven countries.

---

## The FRANZ Audit: Measuring How, Not What

FRANZ scores LLM responses along four dimensions: insider versus outsider positioning (does the model speak as if it belongs to the community being discussed?), generalizing language (does it make sweeping claims about groups?), anthropomorphism (does it express empathy, validation, emotions?), and adherence to Gricean conversational maxims — the quality, quantity, relevance, and manner norms that underpin cooperative communication.

The corpus behind the analysis — called SQUARE — was built by pulling subjective questions from 57 subreddits mapped to 7 countries and 19 question categories. Each of the 376,000 questions was answered by three open-weight models: Llama-3.1-8B-Instruct, Gemma-3-12b-it, and Ministral-3-14B-Instruct. Each response was then scored by an independent LLM judge for each FRANZ dimension. The judges were validated against 4,500 human assessments, which matters because it rules out a key confound: if the same model is generating responses and judging them, any observed patterns could just be prompting artifacts. Here, the judges are independent, so the couplings they detect are real.

Statistical analysis used Generalized Estimating Equations, which account for the fact that three models are answering the same question — responses aren't independent, and standard tests would overstate significance if that's ignored. Rankings that survive GEE correction are the ones worth taking seriously.

> **376k** subjective questions sourced from 57 subreddits spanning 7 countries and 19 question categories, with responses from three LLMs scored by independent judges validated against 4,500 human assessments.

---

## Model Signatures Are Consistent Across Topics and Countries

Mistral is the most likely of the three models to frame responses from an insider position — 11 percentage points higher than Llama and Gemma. It also leads on generalizing language. The ranking Mistral > Gemma > Llama for generalization is the most consistent cross-model pattern in the dataset, holding across country-category subsets after FDR correction.

Gemma adheres most closely to Gricean maxims of quality and relevance. Llama sits at the bottom of both insider framing and generalization rankings — it's the most constrained model, least likely to adopt an in-group voice or make broad claims about cultural groups.

These rankings don't shift depending on whether the question is about food in India or politics in the USA. That stability is the key finding: these are model-level tendencies, not topic-specific behaviors.

One important calibration: even Mistral's elevated insider framing and generalization are not dominant behaviors. Generalizing language and anthropomorphism stay at or below 15% across all three models. The default posture for all three is outsider-positioned, non-generalizing, and non-anthropomorphizing — Mistral just deviates from that default more often.

> **+11%** Mistral's excess insider-positioning rate versus Llama and Gemma · **≤15%** ceiling for generalizing language and anthropomorphism across all models

---

## Insider Framing and Affective Cues Reinforce Each Other

The four FRANZ dimensions aren't all independent of each other. Insider positioning and anthropomorphism are coupled: when a response is framed as insider-positioned, it's more likely to contain empathy, validation, and emotional language. And when a response contains those affective cues, it's more likely to be judged as insider-framed. The relationship runs both ways, though the effect is stronger from anthropomorphism to positioning than the reverse — affective tone appears to be the leading signal.

All within-model variation in anthropomorphism concentrates in just three cues: empathy, validation, and emotions. Other anthropomorphic signals — agency, desires, relational language — are essentially absent across all three models.

Generalizing language and maxim adherence behave differently. Both are largely orthogonal to positioning and anthropomorphism. A response can be verbose and outsider-framed at the same time, or warm and maxim-compliant. This means that Mistral's higher rates of both insider framing and generalization don't reflect a single underlying tendency — they're independent habits that happen to co-occur in the same model.

The orthogonality of maxim adherence is also worth noting for practitioners: a model that speaks warmly and empathetically isn't necessarily one that's being informative or relevant. These are separate axes.

> **Bidirectional coupling:** insider framing ↔ affective cues (empathy, validation, emotions) · **Orthogonal:** generalizing language vs. cultural positioning and anthropomorphism · **Orthogonal:** maxim adherence vs. positioning, generalization, and anthropomorphism

---

## What to Do About It

The practical implication is that model selection is a communicative choice, not just a capability one. Swapping Mistral for Llama in a culturally sensitive deployment — a mental health chatbot, a community forum assistant, a localized customer service tool — changes how the model positions itself relative to users, how often it makes broad claims about groups, and how it calibrates emotional tone. None of that is visible from benchmark scores.

For teams building on top of these models, a few things follow. First, auditing tone doesn't substitute for auditing generalization, and neither substitutes for auditing maxim adherence — the dimensions are independent enough that you need to check each one. Second, Gemma's advantage on quality and relevance maxims is consistent, which makes it a more predictable choice when communicative precision matters. Third, verbosity (the quantity maxim) varies unpredictably across all three models and lacks a stable ranking — if response length discipline matters for your use case, you'll need to enforce it at the prompt or post-processing level.

Two reliability limits are worth flagging before acting on specific numbers. The judge for the Relation maxim reaches only 0.51 accuracy against human annotators — barely above chance — so findings on relevance should be treated as directional at best. The insider-positioning judge reaches 0.75 for one annotator, which is workable but imperfect. Results on those two dimensions point in a real direction, but the signal is noisier than the others.

Finally, the subreddits in SQUARE skew toward younger, English-fluent, online users — including diaspora communities and visitors — and aren't population-representative. The patterns here are patterns over Reddit communities, not over cultures as a whole. That's a meaningful distinction when the goal is deployment in a specific real-world context.

*Pawar, S., Masud, S., Yoo, H., Oh, A., & Augenstein, I. (2026). Not What, But How: A Framework for Auditing LLM Responses across Positioning, Generalization, Anthromorphism, and Maxims. arXiv:2606.02493*