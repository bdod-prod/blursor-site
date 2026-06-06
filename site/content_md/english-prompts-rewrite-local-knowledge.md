# English Prompts Suppress Bengali Cultural Knowledge Even When Local Evidence Is Provided

When you ask an LLM a question about Bengali culture in English, you get a different answer than if you ask the same question in Bangla. Not a translation of the same answer — a substantively different answer, one that tends to replace locally grounded knowledge with globally dominant, institutionally recognized narratives. That's the central finding of a new benchmark study from the University of Toronto, and it has direct implications for anyone building multilingual AI systems or relying on retrieval-augmented generation to handle cultural content.

The study introduces CulturalNB, a manually curated dataset of 717 Bengali cultural questions spanning five domains — History & Politics, Religion & Mythology, Traditional Medicine & Ecology, Geography & National Identity, and Art, Literature & Cultural Practices. Each question comes with a parallel Bangla–English pair, a locally validated reference answer, and a supporting evidence passage. Nine frontier models were tested: Claude Sonnet 4.6, GPT-5.4, Gemini 3.1 Pro Preview, Gemma 4 31B Instruct, Grok 4.1 Fast, DeepSeek V3.2, Qwen 3.6 Plus, Llama 4 Maverick, and Mistral Large 2512.

The anchoring number: cross-lingual factual consistency scores stayed below 0.15 for most models under the stricter GPT judge. The same model, asked the same question, in two languages, gives answers that are substantively inconsistent more than 85% of the time.

---

## The Language of the Question Changes the Answer

Across all nine models, English prompts produced Global Substitution Rates above 0.60 — meaning more than 60% of responses replaced local Bengali perspectives with globally dominant framings. The same questions in Bangla yielded GSR between 0.21 and 0.40. That gap is consistent across every model tested, which rules out the explanation that some models are simply better at Bengali than others.

The metric being measured here is not fluency or factual accuracy in the conventional sense. Global Substitution Rate captures whether a model's answer prioritizes a globally recognized, institutionally dominant narrative over a locally grounded one — even when the locally grounded answer is correct. A model can produce a fluent, confident, factually defensible response in English that nonetheless displaces the cultural framing a Bengali speaker would recognize as accurate.

Language-Alignment Bias scores — which measure how much a model's behavior shifts between Bangla and English prompts — clustered between 0.43 and 0.50 under the GPT judge in the question-only setting. No model approached zero across any domain. This isn't a problem concentrated in one or two weak models; it's a consistent feature of how frontier LLMs handle language as a contextual signal.

The mechanism appears to be that English functions as a prior. Before the model retrieves anything, the language of the question is already steering it toward a particular interpretive register — one shaped by the distribution of English-language training data, which skews heavily toward Western institutional sources.

---

## Evidence Helps, But Doesn't Fix the Bias

The natural response to this finding is: provide local evidence. If the model doesn't have the right cultural knowledge, give it the right cultural knowledge. This is the logic behind retrieval-augmented generation, and it's a reasonable instinct. The problem is that it doesn't work as cleanly as expected.

When local supporting passages were provided alongside questions, English GSR remained high — frequently between 0.70 and 0.85 under the GPT judge. Global Narrative Dominance scores for English prompts in the evidence-based setting stayed between 0.75 and 0.83 under the Mistral judge, barely lower than the question-only baseline. Models including Gemma, Qwen, Llama, and DeepSeek continued to exhibit high substitution rates even when the relevant local information was sitting right there in the context.

In some cases, providing evidence actually increased language-alignment bias rather than reducing it. That's a counterintuitive result, and the authors flag it as evidence of complex interactions between evidence injection and prompt-language priors — the model may be using the evidence selectively, filtered through the interpretive frame that English already established.

The implication for RAG pipelines is uncomfortable: if the retrieval system surfaces accurate local content but the prompt language is English, the model may still anchor its response to globally dominant narratives. The retrieved evidence gets processed through the same language-conditioned framing that caused the problem in the first place. Fixing the retrieval step without addressing the prompt-language effect leaves the core issue intact.

---

## Where the Bias Concentrates: Domains and Institutional Framing

History & Politics consistently showed the highest Institutional Bias Rate across both judges and both languages — meaning responses in this domain most reliably privileged globally recognized institutional narratives over locally grounded interpretations. That's also the domain where the stakes are highest: 61.9% of CulturalNB instances carry locally validated epistemic status, and History & Politics is precisely where local and global framings diverge most sharply.

The dataset's epistemic composition is worth sitting with. Nearly two-thirds of the questions have answers that are locally validated — grounded in Bengali sources, community knowledge, or regional scholarship — rather than globally institutionalized. Only 6.7% are genuinely contested. When a model substitutes a global narrative for a local one in this domain, it's not resolving ambiguity; it's overwriting something that has a clear, locally recognized answer.

Across all five domains, Language-Alignment Bias scores between 0.43 and 0.50 confirm that the effect isn't concentrated in one corner of Bengali cultural knowledge. Traditional Medicine & Ecology, Geography & National Identity, and Art & Literature all show meaningful shifts between Bangla and English prompts. The domain variation matters for prioritization — History & Politics is where the institutional framing is most aggressive — but no domain is clean.

---

## LLM Judges Undercount the Problem — Especially for Their Own Models

The study used two LLM judges (GPT-5.4-mini and Mistral 4 small) alongside human annotators for a subset of outputs. The comparison is striking. For GPT-5.4 outputs, human annotators scored Global Substitution Rate at 0.745. The GPT judge scored the same outputs at 0.213 — a gap of more than 0.53. For Claude Sonnet 4.6, humans scored GSR at 0.632 while the GPT judge gave 0.322.

The largest discrepancy appeared when GPT judged GPT-5.4 outputs. That pattern suggests something specific: LLM judges may systematically fail to flag cultural failures that align with their own training priors. If GPT-5.4 produces a response that substitutes a globally dominant narrative for a local Bengali one, and that substitution reflects the same distributional biases present in GPT-5.4-mini's training, the judge may not recognize it as a failure at all — because from its perspective, the answer looks correct.

For practitioners running LLM-as-judge pipelines to audit cultural bias, this means treating those scores as lower bounds. The Mistral judge performed closer to human judgments in some settings, but neither LLM judge reliably caught what human annotators caught. The actual rate of narrative substitution in your system is likely considerably higher than your automated evaluation suggests.

---

## What to Do About It

The practical takeaway isn't that English prompts are always wrong or that RAG is useless for cultural content. It's that the standard toolkit for handling cultural knowledge — retrieve local evidence, prompt in the user's language when possible, evaluate with an LLM judge — has gaps that this research makes concrete.

For teams building multilingual systems: prompt language should be treated as a design variable, not an afterthought. If your pipeline accepts English queries about non-English cultural content, you're introducing a framing effect that retrieved evidence won't fully cancel. Testing in the target language, not just the query language, is a minimum check.

For evaluation pipelines: if you're using GPT-family models to judge cultural appropriateness of GPT-family outputs, you're likely undercounting failures by a substantial margin. Human evaluation on a stratified sample — even a small one — gives you a calibration point that automated judges can't provide on their own.

For the broader question of what cultural bias in LLMs actually is: this paper argues it's not primarily a missing-knowledge problem. The knowledge is often there. What's missing is the right framing trigger. That reframes where the intervention needs to happen — less in the retrieval layer, more in how prompts are constructed and how models are trained to weight locally grounded sources against globally dominant ones.

*Hasan, M. A., Naswan, R., Samir, F., Sultana, S., & Ahmed, S. I. (2026). When English Rewrites Local Knowledge: Global Narrative Dominance in Large Language Models. arXiv:2605.30481*