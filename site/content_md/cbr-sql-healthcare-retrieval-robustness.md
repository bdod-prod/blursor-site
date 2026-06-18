# CBR-to-SQL: Rethinking Retrieval for Clinical Text-to-SQL

Most text-to-SQL systems built on retrieval-augmented generation follow the same basic pattern: retrieve similar question-SQL pairs from a knowledge base, feed them as few-shot examples to a language model, generate SQL. The approach works reasonably well when training data is plentiful and queries follow predictable surface forms. Clinical data environments tend to satisfy neither condition. Annotated question-SQL pairs over EHR schemas are expensive to produce, and medical queries vary enough in entity usage — abbreviations, aliases, institution-specific terminology — that surface-level similarity between questions is an unreliable retrieval signal.

A paper from Aalto University proposes a different retrieval structure. Rather than retrieving concrete question-SQL pairs, CBR-to-SQL first strips those pairs down to abstract templates by masking entity tokens, then retrieves on structural similarity between masked queries. A separate module handles entity grounding — resolving the masked placeholders back to real database values using a medical embedding model and Levenshtein re-ranking. The two problems, query structure and entity resolution, are handled by separate components rather than collapsed into a single retrieval step.

The evaluation rests on MIMICSQL, a dataset of 10,000 question-SQL pairs drawn from MIMIC-III's 46,520-patient database. That scope is narrow enough to warrant caution about generalization — but narrow enough also to make the comparisons internally clean.

---

## What CBR-to-SQL Actually Does Differently

Standard RAG-to-SQL retrieves static question-SQL pairs and passes them directly as few-shot context. The retrieval signal is semantic similarity between the incoming question and stored questions — which means two queries with identical structure but different entities can retrieve completely different examples, and two queries with similar surface phrasing but different intent can retrieve the same ones.

CBR-to-SQL inserts a masking step before indexing. Every training question-SQL pair goes through LLM-based entity tagging; identified entities are replaced with typed placeholders. The resulting abstract templates are what gets indexed. At query time, the incoming question is similarly masked, and retrieval runs over structural similarity between masked forms. The idea is that "what is the age of [PATIENT]" and "what is the diagnosis for [PATIENT]" are structurally different queries that should retrieve different templates, even if both mention the same patient name.

The entity grounding component — called Source Discovery — then handles the second problem separately. It constructs a lookup table from unique values in the EHR database, indexed with a medical embedding model. For each placeholder in the generated SQL template, it runs a two-step retrieval: semantic search over 100 candidates, followed by Levenshtein distance re-ranking to a final 5. An LLM then performs context-aware disambiguation among those candidates.

The pipeline is three stages in sequence: Case Retain (build the masked template index), Template Construction (retrieve and generate parameterized SQL), Source Discovery (fill placeholders from the lookup table). Each stage can fail independently, which matters for understanding where the system breaks in practice.

---

## The Accuracy Numbers — and Where They Fall Short

On MIMICSQL's full 8,000-case training set — the Complete Database (CDB) environment — CBR-to-SQL posts a logical form accuracy of 0.828, the highest reported on this benchmark, and an execution accuracy of 0.882. RAG-to-SQL scores 0.811 on logical form and 0.855 on execution accuracy under the same conditions.

The logical form advantage is the more interpretable result. Logical form accuracy measures structural correctness independent of what values happen to be in the database — it captures whether the generated SQL has the right clauses, joins, and conditions, regardless of whether the entity resolution filled them correctly. That CBR-to-SQL leads on this metric suggests the template abstraction is learning query structure rather than memorizing value patterns.

Execution accuracy — whether the SQL actually returns the right rows — is what practitioners care about. Here the picture is less favorable. GE-SQL, a fine-tuned approach with a comprehensive medical knowledge graph, reaches 0.942 execution accuracy. MedTS reaches 0.899. CBR-to-SQL at 0.882 sits below both. The gap to GE-SQL is substantial: 6 percentage points on the metric that determines whether a deployed system returns correct answers. Both leading approaches bring richer domain supervision that CBR-to-SQL, as a retrieval-only method, doesn't attempt to replicate.

With GPT-4.1-mini instead of GPT-4o, CBR-to-SQL scores 0.876 execution accuracy in CDB — still above RAG-to-SQL with GPT-4o at 0.855. The structural advantage survives a model downgrade, which has practical implications for teams constrained on inference cost.

---

## Where the Approach Earns Its Keep: Data Scarcity and Retrieval Brittleness

The more interesting results come from the Incomplete Database (IDB) environment. Here, the 8,000 training examples are compressed to 774 representative cases via HDBSCAN clustering — HDBSCAN identified 679 clusters with a minimum cluster size of 2 and distance threshold of 0.10, plus 95 noise cases retained as outliers. This simulates the realistic clinical deployment scenario where annotated pairs are scarce.

Under these conditions, CBR-to-SQL's execution accuracy drops to 0.842. RAG-to-SQL falls to 0.777. The gap between the two — 0.027 in the full-data setting — nearly doubles to 0.065 in the low-data setting. Template-based retrieval degrades more gracefully when the knowledge base is thin, because structural similarity over masked queries is less dependent on having seen the exact entity combination before.

The brittleness results reinforce this. The paper measures brittleness via stochastic rank-based dropout: retrieved cases are randomly removed with probability scaling up to 0.9 for the top-ranked case, and the resulting performance drop is measured. In CDB, CBR-to-SQL's execution brittleness score is 0.047 against RAG-to-SQL's 0.065. In IDB, 0.049 against 0.068. The template abstraction provides a structural scaffold that is less dependent on any single retrieved example matching well — when the best-matching case gets dropped, the remaining cases still share structural properties with the query.

For clinical NLP teams, these two results together make the case more concretely than the headline accuracy numbers. Annotated SQL pairs over proprietary EHR schemas are expensive to collect and maintain. A method that holds up better with 774 examples than with 8,000, and that degrades less when retrieval is noisy, addresses the actual constraints of the deployment environment.

---

## The Cost and the Failure Modes

CBR-to-SQL averages 3.61 seconds per query against RAG-to-SQL's 2.57 seconds — a 40% latency increase. Token usage is 2,919 per query versus 1,799 for RAG-to-SQL. The marginal cost analysis in the IDB environment puts the overhead at roughly 0.16 seconds and 172 tokens per 1% gain in execution accuracy.

The ablation results clarify where the value actually lives. Removing Source Discovery — the entity grounding layer — drops execution accuracy from 0.882 to 0.779, a 10-point collapse. Replacing Template Construction with standard RAG-style retrieval costs only 0.9 points (0.882 to 0.873). The entity grounding component is load-bearing in a way the template retrieval component is not. Most of the system's accuracy comes from resolving entities correctly, not from the structural retrieval itself.

This creates a specific engineering risk. The paper identifies three failure modes concentrated in Source Discovery: entity tagging errors that cascade downstream because the system is overdependent on tagging to identify all relevant information; a lookup table that misses medical abbreviations and acronyms — "CSF" doesn't match "Cerebrospinal Fluid (CSF)" — because the lookup construction is semi-manual and not designed for alias resolution; and Source Discovery resolving entities independently of the generated SQL template, leading to table misreference errors where the right value gets placed in the wrong context.

All three failure modes point to the same component. The template abstraction is the novel contribution the paper argues for, but the entity grounding layer is what the system's production behavior will actually depend on. A team deploying this approach on a new clinical schema would need to invest heavily in lookup table construction and entity tagging quality before the accuracy numbers become meaningful.

The single-dataset evaluation is the other constraint that doesn't resolve. MIMICSQL covers 5 tables and a relatively constrained query vocabulary. Whether the structural similarity signal generalizes to schemas with more tables, more complex joins, or different entity distributions is unvalidated.

---

## Before Building on This

The practical implication isn't that CBR-to-SQL is ready to deploy — it's that the decomposition it proposes is worth taking seriously as a design pattern, with clear eyes about where the risks sit.

For teams building text-to-SQL on clinical data with limited labeled examples, the template abstraction addresses a real problem: surface-level retrieval fails when entity vocabulary is large and training data is sparse. The 0.065 gap in execution accuracy between CBR-to-SQL and RAG-to-SQL in the low-data setting is meaningful. The brittleness advantage is consistent across both data regimes.

But the ablation makes the dependency structure explicit. Before investing in the template retrieval machinery, the entity grounding layer needs to be robust — which means lookup table coverage of abbreviations and aliases, entity tagging quality on domain-specific terminology, and ideally a Source Discovery step that uses the generated SQL template as a constraint rather than ignoring it. The paper's authors flag all three as open problems. They are also the problems most likely to determine whether the approach holds outside MIMICSQL.

The fine-tuned upper bound — GE-SQL at 0.942 execution accuracy — remains out of reach for retrieval-only methods on this benchmark. For teams that can afford domain-specific fine-tuning and knowledge graph construction, that gap matters. For teams that can't, the low-data robustness results are the more relevant comparison.

*Nguyen, H., Moen, H., & Marttinen, P. (2026). CBR-to-SQL: Rethinking Retrieval-based Text-to-SQL using Case-based Reasoning in the Healthcare Domain. arXiv:2603.05569*