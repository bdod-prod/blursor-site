# 293 Million Papers, One DuckDB File, and a Precision Cliff at 0.75

A paper from Hamburg University of Technology, published in March on arXiv, describes an open infrastructure artifact called the Science Data Lake — a unified query layer over eight open scholarly data sources linked by DOI normalization. The engineering is genuinely careful. The design choices are well-documented. And the paper is unusually honest about where the system breaks down.

Prior multi-source scholarly infrastructure projects have generally taken one of two approaches: build a single canonical index (OpenAlex, Semantic Scholar) that absorbs and reconciles sources, or expose raw source APIs and leave integration to the analyst. The Science Data Lake does neither. It preserves source heterogeneity — citation counts, coverage flags, disruption metrics — and makes the disagreements visible rather than resolving them. That's a deliberate design choice with real consequences for how the infrastructure should be used.

The anchoring number: 293,123,121 unique DOI-linked papers unified across eight sources. That's the scale the system operates at. Everything else in the paper is about what that number conceals.

---

## What Was Built

The Science Data Lake is approximately 960 GB of Apache Parquet files organized into 22 schemas and 153 SQL views — all defined by a single DuckDB file weighing 270 KB. The query layer is nearly weightless; the data is not.

Eight sources are integrated: Semantic Scholar (231 million records), OpenAlex (479 million works), SciSciNet (250 million paper metrics), Papers with Code (513,000 records), Retraction Watch (69,000 records), Reliance on Science (47.8 million patent-to-paper citation pairs), a preprint-to-published DOI map (146,000 mappings), and Crossref. The linkage mechanism is DOI normalization — canonical lowercase, prefix-free format — with no probabilistic record matching.

OpenAlex dominates coverage at 99.67% of all 293 million DOIs. Semantic Scholar covers 45.52% and SciSciNet covers 54.08%, meaning any analysis requiring all three large sources immediately operates on roughly 121 million papers — the intersection — rather than the full corpus. The dominant source combination is OpenAlex-only at 45.0% of papers; the three-way OpenAlex–SciSciNet–S2AG overlap accounts for 38.2%. Across all eight sources, 34 distinct source combinations appear in the data.

The 1,200-line SCHEMA.md is designed for LLM-assisted querying against all 153 views. The paper notes this explicitly — but also notes that systematic text-to-SQL evaluation across LLM providers is out of scope. The capability is asserted, not tested.

---

## The Ontology Alignment Layer — and Where It Breaks

The most technically novel component is the ontology alignment layer. BGE-large sentence embeddings (335 million parameters, 1,024 dimensions) map 4,516 OpenAlex leaf topics to 1.3 million terms across 13 scientific ontologies — MeSH, ChEBI, NCIT, and ten others — using FAISS nearest-neighbor search. At a threshold of 0.60, this produces 16,150 mappings covering 99.84% of topics. That coverage figure is the one that looks impressive in an abstract.

The precision figures tell a different story. Under strict evaluation on a 300-pair stratified gold standard, per-stratum precision is: exact tier (cosine ≥0.95) at 1.00, high-quality tier (0.85–0.95) at 0.51, mid-range tier (0.75–0.85) at 0.13, and borderline tier (0.60–0.75) at 0.00. The recommended operating threshold is 0.75, which retains 2,527 mappings covering 36.5% of topics. Below that line, the system is producing mappings that are wrong under strict evaluation essentially all of the time.

BGE-large achieves F1=0.77 at the recommended threshold, outperforming TF-IDF (F1=0.71), Jaro–Winkler (F1=0.63), and BM25 (F1=0.61) on the same gold standard. The margin over TF-IDF is six F1 points — meaningful but not large. The embedding approach earns its place, but it doesn't make the threshold discipline optional.

A separate constraint compounds this: 31% of papers lack OpenAlex topic assignments entirely. They cannot be ontology-mapped regardless of alignment quality. Any analysis that joins through the ontology layer is working with 69% of the corpus at best, and 36.5% of topics at the recommended threshold.

---

## Citation Counts Disagree — Sometimes Dramatically

Across the 121 million papers present in all three large sources, mean absolute citation differences are 4.14 (S2AG vs. OpenAlex), 3.84 (S2AG vs. SciSciNet), and 2.30 (OpenAlex vs. SciSciNet). OpenAlex and SciSciNet agree most closely. S2AG diverges more from both.

The extreme outlier in the Bland–Altman analysis has 257,887 citations in Semantic Scholar and zero in OpenAlex. That's not a rounding difference or a coverage lag — it reflects fundamental differences in what each source counts as a citation and which documents it indexes. No automated conflict resolution will catch that. The infrastructure doesn't try to.

Relative disagreement is worst precisely where it matters most for tail analyses: papers with ten or fewer citations show a mean relative citation difference of 20%. Studies of emerging research, niche fields, or early-career researchers are working in the zone where source choice has the largest effect on results.

The design decision to leave disagreements unresolved is defensible — imposing a resolution rule would introduce its own biases and obscure the underlying uncertainty. But it means every citation-dependent analysis requires an explicit, documented source selection. Treating citation counts as interchangeable across sources is not supported by the data.

---

## What the Vignettes Actually Demonstrate

The paper includes four proof-of-concept analyses. They demonstrate that cross-source SQL joins work at scale. They are not peer-reviewed findings.

Patent-cited papers — 312,929 of them, 0.107% of the unified corpus — show a mean citation count of 94.3 versus 16.1 for non-patent-cited papers (5.8x), and mean FWCI of 4.7 versus 1.5 (3.1x). The effect size is large. The group is extremely rare, and the Reliance on Science patent citations are strongest through late 2023 due to processing lag, so the most recent papers may have incomplete linkage.

The retraction vignette joins Retraction Watch against SciSciNet metrics for 58,775 retracted papers. The most-cited accumulated 8,062 citations before retraction. The infrastructure is well-suited to this kind of integrity research — the linkage works, the data is there — but SciSciNet disruption metrics end around 2022, which constrains any analysis of recent retraction patterns.

Papers with Code has ceased active operations. Its 513,000-record snapshot is a non-renewable resource. Any analysis built on that layer should be treated as a historical cross-section, not a live data stream.

---

## Practical Constraints Before Deploying This

Full deployment requires approximately 1 TB of local storage. The HuggingFace-hosted version excludes Semantic Scholar and Reliance on Science due to licensing — ODC-BY with additional terms of service, and CC BY-NC 4.0, respectively. Both require local download. Analysts who want the patent-citation layer or the full S2AG coverage need to run this locally.

DOI-based linkage excludes an estimated 5–15% of papers depending on field and era. Older humanities literature and grey literature are systematically underrepresented. OpenAlex extends back several centuries; S2AG is concentrated in recent decades with a computer-science emphasis. Cross-source temporal analyses carry disciplinary and era biases that the infrastructure doesn't correct for.

The practical sequence before running any analysis: confirm which sources cover your target population, check whether the ontology alignment threshold you're using has acceptable precision for your use case, pick a citation source explicitly and document it, and verify whether the distinctive layers you need — SciSciNet disruption metrics, patent citations, code linkage — are current enough for your research question. The infrastructure is a well-engineered starting point. It is not a resolved dataset.

*Wilinski, J. (2026). The Science Data Lake: A Unified Open Infrastructure Integrating 293 Million Papers Across Eight Scholarly Sources with Embedding-Based Ontology Alignment. arXiv:2603.03126*