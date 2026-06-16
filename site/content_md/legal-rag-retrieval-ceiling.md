# When AI Gets the Law Wrong, It's Usually Not the AI's Fault

Most legal AI benchmarks test the wrong thing. LegalBench and LegalBench-RAG — the two most cited evaluation frameworks in the field — are, in the authors' assessment, "dominated by trivial yes/no classification tasks" that require little more than text classification or sentiment analysis. A system that aces those benchmarks may still fail completely when asked to retrieve the correct passage from a 4,876-chunk legal corpus and synthesize a citation-grounded answer to a complex procedural question. That gap is what Legal RAG Bench is designed to close.

The paper, from Isaacus — an Australian legal AI company — constructs a 100-question end-to-end benchmark from the Victorian Criminal Charge Book, runs a full factorial experiment across 3 embedding models and 2 LLMs, and uses hierarchical error decomposition to separate retrieval failures from generative failures. The experimental design is clean enough to isolate effects that aggregate benchmarks obscure. The central finding is not subtle.

Across 600 observations, the embedding model main effect on correctness is χ²(2) = 28.63, p < 0.001. The LLM main effect on correctness is χ²(1) = 0.46, p = 0.499 — statistically indistinguishable from zero.

---

## The Benchmark and What It Tests

Legal RAG Bench is built from the Victorian Criminal Charge Book, converted from Microsoft Word documents to Markdown and chunked into 4,876 passages at a maximum of 512 tokens using a semantic chunking algorithm. The 100 questions are hand-crafted to demand expert-level knowledge of Victorian criminal law and procedure, with long-form answers and supporting passages identified for each. Every question requires the system to retrieve the right material and synthesize a grounded response — not classify a clause or answer yes or no.

The experimental design is a full factorial cross: 3 embedding models (Kanon 2 Embedder, Gemini Embedding 001, Text Embedding 3 Large) paired with 2 LLMs (Gemini 3.1 Pro, GPT-5.2), run through a barebones Langchain-based RAG pipeline with default hyperparameters. That yields 6 combinations and 600 total observations. Evaluation uses GPT-5.2 in high reasoning mode as judge, with an internal review reporting 99% accuracy against a human-annotated rubric. Errors are classified into three types — hallucinations, retrieval errors, and reasoning errors — enabling the decomposition that makes the statistical results interpretable.

The benchmark is narrow by design: one jurisdiction, one legal domain, 100 questions. The authors are explicit that generalizability is limited. But the narrowness is also what makes the factorial design tractable and the effect separation credible.

---

## Retrieval Is the Dominant Variable

The performance gap between embedding models is large enough that it dwarfs everything else in the experiment. Kanon 2 Embedder averaged 94.0% correctness across both LLMs; Text Embedding 3 Large averaged 76.5%; Gemini Embedding 001 averaged 74.0%. Retrieval accuracy follows the same pattern: 86.0% for Kanon 2 Embedder versus 52.0% and 53.0% for the two general-purpose alternatives — a 34-point gap between the top and second embedder.

The LLM comparison is almost the inverse. Gemini 3.1 Pro averaged 82.3% correctness across all embedding models; GPT-5.2 averaged 80.7%. The difference is 1.6 points, and the statistical test returns p = 0.499. The best single combination — Kanon 2 Embedder with Gemini 3.1 Pro — reaches 95.0% correctness. The worst — Gemini Embedding 001 with GPT-5.2 — reaches 73.0%. That 22-point spread is almost entirely explained by the embedder swap.

For correctness, the gains from embedding model and LLM are linearly additive: the interaction term is χ²(2) = 0.08, p = 0.962. A better embedder lifts performance regardless of which LLM is paired with it, and the LLM choice doesn't modulate how much the embedder matters. The ceiling is set upstream.

---

## Most Hallucinations Are Retrieval Artifacts

The error decomposition is where the retrieval-dominance finding becomes practically actionable. GPT-5.2's average hallucination rate across all embedding models is 11.3%; Gemini 3.1 Pro's is 5.7%. That nearly 2x gap looks like a generative model problem. The decomposition complicates that reading.

Gemini Embedding 001 produces a 4.5-point increase in hallucinations relative to Text Embedding 3 Large. Kanon 2 Embedder reduces hallucinations by 6.75 points on average compared to the general-purpose alternatives. When Kanon 2 Embedder is deployed, GPT-5.2 actually leads Gemini 3.1 Pro on groundedness by 2 points — the direction reverses. The hallucination gap between LLMs largely reflects differential sensitivity to irrelevant context: GPT-5.2 appears more likely to confabulate when retrieval returns the wrong passages. Fix retrieval, and the LLM gap shrinks.

The groundedness metric is the one place where LLM choice produces a statistically detectable effect (χ²(1) = 5.36, p = 0.021), but the effect is not stable across embedders. Switching from Gemini 3.1 Pro to GPT-5.2 reduces groundedness by 9.0 points with Text Embedding 3 Large and by 10.0 points with Gemini Embedding 001 — but produces no detectable change with Kanon 2 Embedder. The interaction term for groundedness is χ²(2) = 8.12, p = 0.017. There is no single global LLM ranking for groundedness; it depends on what the embedder is doing.

Kanon 2 Embedder's overall RAG accuracy — the complement of all error types combined — is 91.5%, against a sample average of 77.3% across all six combinations.

---

## The Conflict of Interest Problem

The result that demands the most scrutiny is also the one the paper leads with: Kanon 2 Embedder, built by Isaacus, outperforms both general-purpose alternatives on every metric in a benchmark also built by Isaacus. The authors are the company's founders. That is a material conflict of interest, and the paper does not fully resolve it.

Several specific concerns compound the structural one. GPT-5.2 is used as judge for its own outputs. The experiment covers only 6 model combinations — the observed interaction between Gemini Embedding 001 and Gemini 3.1 Pro, which perform unusually well together relative to their individual averages, may not generalize. The benchmark covers a single jurisdiction and a single legal domain; a criminal law charge book in Victoria is not a proxy for contract review in New York or regulatory compliance in the EU. And 100 questions constrain statistical power for detecting smaller effects.

None of this invalidates the core statistical finding. The embedding model main effect is large, the LLM main effect is not, and the error decomposition methodology is sound. The magnitude of Kanon 2 Embedder's advantage — 34 points of retrieval accuracy over the nearest alternative — should be treated with appropriate skepticism until independently replicated with a wider model set and a benchmark produced by a disinterested party. The directional claim, that retrieval dominates correctness in legal RAG, is robust to these limitations.

---

## Before the Next LLM Upgrade

The practical implication is direct: teams building or evaluating legal RAG systems are likely optimizing the wrong component. If the LLM main effect on correctness is statistically zero and the embedding model main effect explains nearly all variance, then upgrading from one frontier LLM to another — without addressing retrieval — will not move the performance ceiling.

The diagnostic sequence the data suggests: measure retrieval accuracy first, separately from end-to-end correctness. If retrieval accuracy is below 80%, generative improvements are operating on a broken foundation. The hallucination rate will be inflated by retrieval failures, and attributing those failures to the LLM will lead to the wrong intervention. Once retrieval is fixed, the LLM's sensitivity to irrelevant context becomes visible — and at that point, LLM choice starts to matter for groundedness, even if not for correctness.

The benchmark also surfaces a subtler point about error visibility. With Kanon 2 Embedder, generative errors become proportionally larger — because retrieval errors have been removed. The best embedder can expose generative model weaknesses that weaker embedders were masking. A system that looks acceptable end-to-end may be hiding a generative problem behind a retrieval problem. Fixing retrieval first is both the right move and the move that tells you what you're actually dealing with.

*Butler, A., & Butler, U. (2026). Legal RAG Bench: an end-to-end benchmark for legal RAG. arXiv:2603.01710*