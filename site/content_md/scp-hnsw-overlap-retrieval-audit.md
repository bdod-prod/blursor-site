# SCP-HNSW Proposes a Fix for Chunk Redundancy in RAG, But Has No Ablation to Prove It Works

When you chunk documents with overlap — which most RAG pipelines do — adjacent chunks end up close together in embedding space. Ask a question, run top-k retrieval, and you'll often get back three or four chunks that say essentially the same thing. Prompt budget wasted, context window cluttered, and the model has less room for chunks that actually differ.

SCP-HNSW is a proposed fix for this. The method appends a two-dimensional positional code to each chunk embedding at index time, then uses a two-pass query procedure to infer where in the document the answer is likely to live before applying a gap constraint that filters out near-duplicate neighbors at retrieval time. The HNSW graph itself is untouched — the positional augmentation is the only structural change.

The paper pairs this method description with a descriptive audit of 770 industrial dispute reviews run through a RAG evidence pipeline at eBay. That audit is the bulk of the empirical content. The anchoring number from the text quality results: a projected corpus mean rating of 3.17 out of 5.

---

## The Overlap Redundancy Problem SCP-HNSW Is Solving

Chunked-document RAG with overlap creates a specific retrieval failure. Overlapping chunks share most of their tokens, so their embeddings land close together in vector space. A top-k query over an HNSW index will happily return several of these near-duplicates — they're all high-similarity matches. The result is a retrieved context full of slightly rephrased versions of the same passage, while chunks from other parts of the document get crowded out.

SCP-HNSW addresses this by making chunk position a first-class part of the index. At index time, each chunk embedding gets two extra float dimensions encoding its position in the document as a half-cycle sinusoidal code. At query time, a first semantic pass estimates where in the document the answer is likely to be; a second pass uses that position estimate to bias retrieval toward the right region. Then a deterministic minimum-index-gap selector filters the final context: any candidate chunk too close in document order to an already-accepted chunk gets dropped.

The positional augmentation adds just 0.26% overhead to 768-dimensional embeddings — two extra floats on top of 768. HNSW graph construction and traversal run over the augmented vectors without any structural modification to the algorithm. The gap selector is the only new logic at retrieval time, and it's deterministic: given the same candidates and the same gap parameter δ, it always produces the same output.

The assumptions embedded in this design are worth naming. SCP-HNSW treats chunk index order as a proxy for semantic relatedness — nearby chunks are assumed to be about nearby topics. That holds for linear narrative documents. It breaks for tables, appendices, boilerplate-heavy contracts, or any document where the correct evidence spans distant regions. A unimodal position prior can also over-focus: if the answer requires evidence from two separate sections, the gap constraint may filter one of them out.

---

## What the Industrial Audit Actually Measures

The empirical section of the paper is a descriptive audit of a RAG evidence pipeline used for industrial dispute resolution, not a controlled retrieval experiment. The audit covers 770 unique reviews, of which 318 are fully labeled with complete fields from five reviewers. A separate OCR audit covers 70 cases with five analysts and 350 total ratings.

What this measures is the quality and reliability of the evidence pipeline's outputs — text review quality and OCR acceptability — as a baseline characterization. It does not compare SCP-HNSW against standard HNSW, MMR, or any other retrieval method. There are no per-query retrieval logs for a baseline condition versus a treatment condition. The authors are explicit about this: the artifacts are descriptive and reliability evidence, not causal evidence.

That distinction matters for how you read the numbers below. The audit tells you what the pipeline produces. It doesn't tell you whether SCP-HNSW is responsible for any particular quality level, or whether swapping in standard HNSW would produce different results.

---

## Text Evidence Quality: Mediocre-but-Stable, Not Catastrophic

Projecting from the 318 fully labeled reviews to the 770-review corpus, 574 reviews land at exactly 3 out of 5. Only 39 fall in the 1–2 failure range. The system is producing usable outputs at scale — not excellent ones, but not dominated by catastrophic failures either.

The more operationally useful finding is about where the signal lives. Structured issue flags appear in roughly 77 reviews (10.1% of the projected corpus). Narrative reviewer detail appears in roughly 574 reviews (74.5%). A dashboard that only tracks structured flags misses most of the actionable signal — the kind that shows up in free-text comments rather than checkbox fields.

Title-evidence alignment is the dominant explicit failure mode. About 29 projected reviews carry a "title not aligned" flag (3.8%) and 27 carry "title inaccurate" (3.5%) — the two largest structured issue categories. These are the cases where the retrieved evidence doesn't match what the review title claims, which is the kind of failure that erodes trust in the system even when the underlying retrieval is otherwise functional.

The core/pilot reviewer split reveals something that aggregate scores would hide. Core reviewers show 81.7% positive feedback and an 8.7% issue flag rate. The pilot spot-check block shows 50.0% positive feedback and a 33.3% issue flag rate. That's not a small calibration difference — it suggests the two groups are applying the rubric differently, and any quality estimate that mixes them without stratification is misleading.

| Segment | Positive feedback | Issue flag rate |
|---|---|---|
| Core reviewers | 81.7% | 8.7% |
| Pilot spot-check | 50.0% | 33.3% |

The template-level breakdown adds another layer. The "buyer confirmed receipt" template accounts for roughly 85 reviews with a 25.7% title-issue rate — about 22 issue cases. The "seller provided return instructions" template has a higher per-review issue rate (33.3%) but only about 15 reviews, so roughly 5 issue cases in absolute terms. Volume times rate is the right way to prioritize remediation: the buyer-confirmed-receipt template is the larger operational risk.

---

## OCR Reliability Degrades Monotonically With Image Noise

OCR pass rates across the five image categories tell a clean story: the noisier the capture, the worse the results, and agreement among analysts falls alongside acceptability.

| Image category | Pass rate | Fleiss' κ |
|---|---|---|
| Clean chat screenshots | 95% | 0.68 |
| Email / page captures | 85% | — |
| Mixed-UI screenshots | 78% | — |
| Label / receipt photos | 60% | — |
| Handwritten / blurry captures | 45% | 0.54 |

The global weighted median for overall OCR scores is 3.2 out of 5, with pairwise weighted kappa ranging from 0.646 to 0.753 across the five analysts. Binary pass/fail agreement is consistently stronger — kappa 0.72 to 0.85 — than ordinal scoring. That gap suggests coarser rubrics are more reliable for difficult image categories, and that asking analysts to make fine-grained quality distinctions on noisy captures introduces more noise than signal.

Blur drop-out is the single highest-disagreement subcategory, with a mean case standard deviation of 0.91. When analysts disagree most, it's on blurry images — which makes sense, but also means that evidence from this category can't be trusted in production without slice-specific reviewer guidance. The current rubric isn't calibrated tightly enough for it.

---

## What Practitioners Should Actually Do With This

SCP-HNSW is a plausible architectural direction for overlap-aware retrieval. The positional augmentation is cheap, the gap selector is auditable, and the problem it targets — near-duplicate chunk retrieval — is real and common. If your RAG pipeline uses overlapping chunks and you're seeing redundant context in retrieved results, this is worth investigating.

But the paper doesn't include the experiment that would tell you whether it works. There's no controlled comparison of semantic HNSW versus SCP-HNSW on retrieval metrics — no precision, recall, or answer quality numbers with a baseline condition. The industrial audit establishes that the evidence pipeline produces mediocre-but-stable outputs; it doesn't establish that SCP-HNSW is responsible for any particular quality level, or that it outperforms alternatives.

Before adopting SCP-HNSW, run your own ablation. Compare standard HNSW, HNSW with a post-hoc gap filter, MMR, and SCP-HNSW on your actual document corpus with your actual queries. Pay attention to whether your documents are linear narratives (where positional assumptions hold) or structured documents with tables, appendices, or non-linear organization (where they may not). The gap parameter δ will need tuning for your overlap settings.

On the audit side: if you're running a similar evidence quality program, the core/pilot stratification finding is the most transferable result. Mixing reviewer cohorts with different calibration into a single quality estimate produces numbers that look stable but mask real disagreement. Report strata separately, and treat blur drop-out and other high-disagreement OCR categories as requiring dedicated rubric guidance before you trust their outputs in production.

*Agaram Sundar, N., & Morabia, T. (2026). Self-Conditioned Positional HNSW for Overlap-Aware Retrieval in Chunked-Document RAG Systems: Method and Industrial Evidence-Quality Audit. arXiv:2606.01542*