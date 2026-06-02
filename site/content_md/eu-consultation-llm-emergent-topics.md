# An LLM Pipeline for EU Consultation Analysis Found 224 Policy Topics That Fixed Taxonomies Would Have Missed

Public consultations generate thousands of submissions, and the standard computational approach to analyzing them — document-level clustering — answers one question reasonably well: what broad themes appear across the corpus? It doesn't answer who said what, or why, or whether a specific concern appeared in three submissions or three hundred. For policy accountability, that matters.

A new pipeline built for the European Commission's Digital Fairness Act consultation takes a different approach. Instead of clustering documents, it extracts structured topic annotations from individual paragraphs and ties each one to a verbatim quote from the source text. Applied to 4,322 DFA submissions, it produced 15,368 topic annotations supported by 20,951 evidence quotes — every one of them traceable back to a specific passage in a specific submission.

The number that anchors the whole system: 99.1% of extracted quotes verified as exact or near-exact matches against their source paragraphs.

---

## The Grounding Problem in Regulatory Text Mining

Prior computational work on consultation analysis has focused on document-level clustering — useful for getting a bird's-eye view of a corpus, but it doesn't produce records that say "submitter X made claim Y, and here is the sentence where they said it." Without that traceability, the output can't support the kind of accountability that regulatory analysis actually requires.

This pipeline enforces grounding at two levels. The extraction prompt instructs the model to return only verbatim quotes from the source text, never paraphrases. Then, after extraction, every quote is verified by running exact and fuzzy string matching against the source paragraph. Quotes that don't match get flagged. The 99.1% match rate means the failure surface is small — roughly 9 in 1,000 quotes show signs of model hallucination — but the authors note those cases warrant further investigation rather than dismissal.

The corpus itself was heterogeneous in ways that matter for any practitioner thinking about similar work. Of the 4,325 submissions to the Commission's Have Your Say platform between July and October 2025, 94.1% were short web-form responses ingested as single text units. The remaining 5.9% — 338 submissions — included multi-page PDF attachments, which after manual filtering of non-submission files like appended academic papers and annexes came down to 259 documents. Those PDFs are where most of the pipeline's failure modes live.

---

## Hybrid Taxonomy: Predefined Labels Plus Emergent Discovery

The extraction prompt embeds seven predefined topic categories drawn from the DFA's own policy framework. But it also instructs the model to coin a new label when a passage doesn't fit any of them, flagging each with a `topic_source` field that marks it as either a predefined category or something new.

In practice, 11.4% of extracted items were emergent — outside the predefined schema entirely. That generated 1,458 unique raw labels before any consolidation. The raw label space is noisy by design: because each paragraph is processed independently without a shared vocabulary, near-duplicate labels proliferate. Payment Processor Censorship, Payment Processor Gatekeeping, and Payment Processor Pressure all appeared as distinct labels for what is essentially the same concern.

A three-step post-processing pipeline handles consolidation. First, semantic similarity mapping checks whether each emergent label is close enough to a predefined category to be absorbed into it. What remains goes through agglomerative clustering to group near-duplicates, with a canonical label selected for each cluster. A final manual review handles low-frequency residuals that clustering didn't resolve cleanly. The result: 1,458 raw labels reduced to 224 distinct topics. Among those retained were Age Verification, Payment Processor Censorship, and Digital Ownership — concerns that a fixed taxonomy built before the consultation opened would have had no slot for.

---

## Where the Pipeline Breaks: OCR, Chunking, and Interpretive Choices

The most consequential failure mode is upstream of the LLM entirely. OCR errors — particularly reading-order mistakes in multi-column PDFs, where the engine reads across columns rather than down them — corrupt the text units that every subsequent step operates on. No prompt refinement recovers a position paper whose columns were read in the wrong order. The pipeline flags problematic documents but doesn't fix them.

Chunking introduces its own distortions. The pipeline scores each paragraph with a meaning score based on length, alpha-character ratio, and a digit penalty, then filters out chunks that fall below threshold. That heuristic works well on standard narrative prose. It degrades on tables, itemised policy recommendations, and short formulaic statements — exactly the formats that structured policy documents tend to use for their most specific claims.

The empty-output rate is worth sitting with: 33.6% of chunks sent to the model returned nothing. The authors attribute this to prompt rules that instruct the model to return empty output for passages consisting of names, job titles, affiliations, signatures, headers, or procedural text. That's a reasonable design choice — but every threshold and filtering rule in the pipeline is an interpretive choice with real consequences. What gets filtered out doesn't get counted. In a policy context, that's not a technical detail; it's a decision about whose concerns become visible.

No systematic quality evaluation of the extracted topics was performed. The pipeline was tested on a single consultation dataset, so how well the emergent topic consolidation generalizes to other regulatory domains is an open question.

---

## What Adaptation Actually Requires

The architecture is cleaner than most research pipelines of this kind. The only domain-specific element is the topic schema embedded in the extraction prompt. Adapting the pipeline to a different consultation — a national-level data governance review, say, or a pharmaceutical regulation comment period — means modifying a single prompt file. The rest of the infrastructure stays the same.

The output feeds an interactive dashboard with five analytical tabs: Overview, Topics, Search, Landscape, and Submissions, with sidebar filters throughout. That matters for the practical use case: policy analysts who need to navigate 15,000 annotations don't want to write database queries. The dashboard makes the structured output accessible without it.

Two improvements the authors identify as near-term rather than architectural: substituting an open-source LLM for gpt-5-nano (which would reduce cost and dependency on a proprietary API), and replacing paragraph-level chunking with LLM-assisted chunking by argumentative unit. The second one is the more interesting change — argumentative chunking would let the pipeline track a claim across the sentences that develop it, rather than treating each paragraph as an independent unit. That would also reduce the near-duplicate label problem at the source rather than cleaning it up downstream.

For practitioners building similar systems, the lesson from this paper is specific: the bottleneck isn't LLM extraction quality. At 99.1% verbatim grounding, that part works. The bottleneck is OCR fidelity for PDF-heavy corpora, and the cumulative effect of filtering thresholds that each seem reasonable in isolation but together determine which policy concerns make it into the analysis at all.

*Bertaglia, T., Gui, H., Goanta, C., & Spanakis, G. (2026). Traceable by Design: An LLM Pipeline and Dashboard for EU Regulatory Consultation Analysis. arXiv:2605.30995*