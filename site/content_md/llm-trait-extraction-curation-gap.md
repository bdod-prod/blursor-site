# An LLM Pipeline Extracted 5.5 Million Species Trait Records — None Have Been Human-Reviewed

Building a structured knowledge base for nearly half a million species would take decades of manual curation. A new pipeline from NEXLY LLC did it in five days, extracting 5,489,881 trait records across 409,820 species using a two-hop LLM chain. The scale is real. So is the caveat: every single row carries `admin_review_status = 'pending'`, and not one has been reviewed by a domain expert.

The paper describes the extraction architecture honestly, including its limits. That honesty is what makes it useful — practitioners who understand what the pipeline actually guarantees, and what it doesn't, can work with this dataset appropriately. Those who treat it as a validated reference will run into trouble.

The number that frames everything else: 81.57% of persisted rows carry a high-confidence label. That sounds reassuring until you learn those labels are model self-reports with no calibration study behind them. They're a signal, not a ground-truth accuracy estimate.

---

## What the Pipeline Actually Does

The system is the second half of a two-hop chain. In the first hop, an upstream Qwen model generates structured `bio_sections` text from primary literature for each species. In the second hop — the one this paper describes — a Xiaomi MiMo mimo-v2.5 model reads that substrate and extracts values for 39 typed trait keys: things like water temperature range, toxicity to pets, dormancy period, and CITES status.

Every candidate output has to clear two filters before it gets written to the database. First, the evidence quote the model provides must be a verbatim substring of the source `bio_sections` text — if the model cites something that isn't actually in the passage, the row is rejected. Second, the extracted value must conform to a closed-vocabulary registry; outputs that don't match the allowed-value list for a given trait key are dropped. These two filters together are the pipeline's anti-fabrication architecture.

> **37.47%** of all 10.8 million candidate trait cells were model abstentions — the extractor returned null rather than fabricate when source text lacked evidence.

The abstention behavior matters. When the source text doesn't contain evidence for a trait, the model is supposed to return null rather than guess. That it does so at this rate — comparable in magnitude to the admission rate itself — suggests the abstention protocol is functioning. The alternative, a model that fills every cell with something plausible-sounding, would be far harder to catch downstream.

Of the 10,842,378 total candidate cells emitted across successful runs, 52.99% were admitted, 37.47% were abstentions, 9.46% were rejected by the substring filter, and just 0.09% were rejected for enum non-conformance. The asymmetry between those last two is notable: the grounding filter catches two orders of magnitude more bad outputs than the vocabulary filter does.

---

## Scale and Coverage

The pipeline ran 706,220 extraction jobs across a five-day window in late May 2026, covering 409,880 publishable species from the Tropical Species Encyclopedia. Despite a 38.58% failed-run rate — transient HTTP 502 and 429 errors under cluster-scale load — retry logic kept species coverage at 99.985%. Infrastructure noise at this scale doesn't translate to meaningful gaps in the output.

> **5,489,881** trait records persisted across 409,820 species · **99.985%** species coverage despite 38.6% transient run failures

The domain breakdown skews toward commercially relevant taxa. Tropical plants account for 66.3% of the substrate (271,786 species), exotic pets for 21.8% (89,521), and aquatic species for 11.9% (48,573). Species with little horticultural or aquarium footprint are underrepresented — the coverage reflects the encyclopedia's own composition, not a taxonomically balanced sample.

Model selection involved a controlled head-to-head on 19 species comparing the base mimo-v2.5 against the pro variant. The base model produced a higher fraction of high-confidence rows (84.9% vs. 80–82%) and sustained roughly twice the throughput — 3.0–4.0 species per second versus 1.5–2.0 for pro — with per-row quality that was statistically indistinguishable. The full run consumed 4.93 billion tokens, averaging 91 seconds per successful job.

---

## Verification Architecture and Its Limits

The 90.12% substring verification rate is the pipeline's strongest quality signal. It's computed via a full-population SQL query — not a sample — checking whether each evidence quote actually appears in the source text. Excluding `cites_appendix_in_bio`, a compliance meta-trait whose evidence by design references structured fields outside `bio_sections`, the rate rises to 93.49%.

| Outcome | Share of 10.8M candidates |
|---|---|
| Model abstentions (null returned) | 37.47% |
| Substring / evidence-unsupported rejects | 9.46% |
| Registry-OOV or enum-conformance rejects | 0.09% |
| Admitted (passed both filters) | 52.99% |

The manual audits add some texture but have real limits. A quote-supports-value check on 100 stratified non-red-zone rows yielded 100/100, giving a 95% Wilson lower bound of 96.30%. A face-validity check on 50 red-zone rows (30 toxicity-to-pets, 20 toxicity-to-humans) yielded 50/50 Accept, with a lower bound of 92.86%. Both audits were conducted by the paper's sole author, without blinding, and without a second rater — so there's no inter-rater agreement figure.

The more fundamental limit is architectural. Substring verification confirms that hop-2 outputs are grounded in the `bio_sections` substrate. It says nothing about whether that substrate is faithful to the primary literature it was generated from. Hop-1 fidelity — whether the Qwen-generated text accurately represents the source — is entirely unvalidated. A hallucination introduced in hop 1 would pass every filter in hop 2 cleanly.

---

## The Curation Gap

The pipeline's safety-critical outputs — toxicity to humans, toxicity to pets, physical hazards, and CITES status — are already accessible through public API endpoints. All 428,668 red-zone rows are unreviewed. The paper flags this directly: unreviewed assertions about non-toxicity or absence of hazard could be misused as care or medical guidance. The red-zone rows actually carry a *higher* high-confidence rate than the global average (87.82% vs. 81.57%), which might create false reassurance — but those confidence labels are still model self-reports.

No validation against authoritative external sources has been performed. ASPCA toxicity lists, CITES Species+, IUCN Red List, POWO — none of these have been used to check the pipeline's outputs. No overlap study against curated trait databases like TRY, BIEN, or AusTraits has been run either. Both are deferred to a subsequent release.

The cross-version consistency check covers only 2,064 of 5,489,881 (species, trait) pairs, and 92.8% of those are within the same model family — so it's measuring run-to-run stability more than cross-model robustness. Among the 546 divergent pairs, 83.3% are soft disagreements (ordering differences, text paraphrase), and 16.7% are genuine categorical disagreements in constrained-vocabulary fields.

---

## How to Actually Use This

The pipeline's structural guarantees are real: registry binding prevents out-of-schema outputs, substring verification catches hop-2 fabrication, and model abstention keeps the null rate honest. For building a first-pass structured knowledge base at species scale, this architecture is genuinely useful.

But the dataset is a structured draft, not a reference. The right use cases are ones where you can tolerate unvalidated inputs — exploratory analysis, training data with downstream filtering, or a seed layer for human curation workflows. The wrong use cases are ones where a single incorrect row causes harm: care guidance, toxicity warnings, conservation status decisions.

For practitioners building on top of this data, the most important immediate step is treating red-zone traits as unverified until the curation queue is exercised. The pipeline has done the hard work of getting to 5.5 million structured rows with evidence quotes attached — that's a meaningful head start for any curation effort. The evidence quotes themselves, being verbatim substrings of the source text, give reviewers a direct path back to the passage that generated each value. That's a better starting point than a bare assertion with no provenance.

The hop-1 fidelity question is harder to address without access to the primary literature the Qwen substrate was generated from. Until that's validated, the confidence labels and verification rates describe the pipeline's internal consistency — not its accuracy against the real world.

*Wang, J. (2026). A Registry-Bound LLM Pipeline for Evidence-Grounded Trait Extraction across Tropical Plants, Aquatic Species, and Exotic Pets. arXiv:2606.00994*