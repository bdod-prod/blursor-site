# Legal AI Systems Hallucinate 13–21% of Citations — and the Errors Are Subtler Than You Think

Legal AI has a citation problem that nobody has been measuring properly. Prior studies of LLM citation accuracy relied on manual expert review — which works fine for a research paper but falls apart the moment a production system is generating thousands of citations a day. The standard benchmarks (LEXTREME, LexGLUE, LegalBench) don't evaluate citation accuracy at all. So the field has been flying blind on one of the most consequential quality dimensions in legal AI.

This paper builds something different: a citation graph extracted from 100.8 million Ukrainian court decisions, with 502 million edges connecting decisions to the statute articles they cite. That graph becomes a ground-truth reference for automated, expert-free verification of LLM-generated citations. Five systems were evaluated on 100 Ukrainian legal queries, and the results put hallucination rates between 13% and 21% depending on the system.

The anchoring number is 0.791 — the lowest Citation Grounding score recorded, for Amazon Nova Lite, meaning roughly one in five citations it generates fails a verifiable grounding check.

---

## The Measurement Problem Legal AI Has Been Ignoring

The gap in legal AI evaluation isn't subtle. Existing benchmarks test statutory interpretation, contract analysis, and case outcome prediction — but none of them ask whether the citations an LLM produces actually exist, apply to the question being answered, or were in force at the relevant time. For a practitioner using AI-assisted legal research, that's the question that matters most.

The Citation Grounding (CG) metric introduced here decomposes citation quality into three checkable components: existence (does the cited article appear in the graph?), contextual relevance (does the semantic content of the decision match the cited provision, verified via XLM-RoBERTa embeddings?), and temporal validity (was the provision in force when the decision was issued?). Each component can be verified automatically against the graph — no expert required.

The graph itself operates at a scale that prior legal citation network research never reached. Earlier work on U.S. Supreme Court citation networks used around 30,000 decisions. This graph covers 100.8 million decisions and 21,736 unique statute nodes. The extraction pipeline uses compiled regular expressions and achieved precision of 1.00 on a 200-decision validation sample — so the graph is clean enough to use as ground truth.

---

## 13–21% of Legal Citations Are Hallucinated Across Five Systems

Five systems were evaluated on 100 queries distributed across seven legal domains — civil, criminal, administrative, labor, family, constitutional, and military. The Citation Grounding scores ranged from 0.791 to 0.873.

LEX Chat, a RAG-augmented production system, scored highest at 0.873 and generated the fewest citations per response (2.9 on average). Claude Haiku 4.5 generated the most citations (4.8 per response) and scored 0.855. Amazon Nova Lite scored lowest at 0.791. The other two systems — Mistral Pixtral Large (0.823) and Amazon Nova Pro (0.822) — clustered in the middle.

The intuitive assumption that more citations means worse accuracy doesn't hold cleanly. Across the four raw models, the density–accuracy relationship is weak. The RAG system's advantage appears to come from architecture — retrieval grounds the response in actual source material — rather than from simply citing less. That distinction matters for anyone deciding whether to bolt retrieval onto an existing system or treat citation accuracy as a model-selection problem.

Domain-level results are more striking. Constitutional law achieves perfect grounding (CG = 1.0) across all five systems — the provisions are well-established, heavily cited, and unambiguous in the graph. Family and labor law show the widest variance, with scores ranging from 0.46 to 0.90 depending on the model. Those are the domains where coverage gaps in the citation graph are most likely to surface, and where the practical stakes of a misapplied citation are highest.

---

## What 'Hallucinated' Actually Means Here

Of the 54 citations flagged as hallucinations by the production system, not one referred to a non-existent statute. Every single flagged citation pointed to a real article in Ukrainian law. The models weren't inventing provisions — they were citing real provisions in the wrong context, or citing provisions that courts rarely reference and that therefore don't appear in the citation graph.

Breaking down those 54 flags: 32 of them (59%) were graph coverage gaps — real articles that exist in the legislation database but haven't accumulated enough judicial citations to appear in the graph. The remaining 22 (41%) were confirmed real after two missing codexes were imported: the Family Code (292 articles) and the Labor Code (265 articles).

This reframes what legal citation hallucination actually looks like in practice. The failure mode isn't fabricated law — it's misapplied or jurisdiction-confused law. A model that cites Article 651 of the Civil Code when the question involves a labor dispute is technically citing a real provision. A binary existence check would pass it. The CG metric catches it because relevance is a separate component. That distinction has real consequences for how legal AI systems should be audited.

It also points to the harder engineering problem: the metric's false positive rate is driven by graph coverage, not by model behavior. Expanding the graph to include more codexes and more citation sources would reduce false positives without any changes to the models being evaluated.

---

## Training a Model to Recognize Citation Errors

The paper also introduces CG-DPO: a method for training a model to distinguish correct citations from corrupted ones, using preference pairs derived algorithmically from the citation graph.

The dataset was built from 2,244 court decisions, each containing at least three statute citations. Four corruption strategies generate the negative examples in each pair: article swap (replace the cited article with a different article from the same law), law swap (replace the entire law reference), hallucination injection (insert a plausible but non-existent citation), and anachronism (cite a provision that wasn't in force at the time). Each corruption type targets a specific graph constraint, which is what makes the training signal clean.

A Qwen2.5-7B-Instruct model fine-tuned with LoRA on these pairs reached 98.5% mean validation accuracy across three random seeds (individual seed results: 98.7%, 98.2%, 98.7%). Training accuracy hit 100% within the first epoch — fast convergence that reflects how structurally salient the corruption signals are. The model is learning graph-grounded rules, and those rules are learnable quickly because each violation produces a distinct, detectable pattern.

The 98.5% figure measures discrimination on held-out pairs, not hallucination reduction in open-ended generation. The authors are explicit about this: deploying CG-DPO in a production pipeline would require additional supervised fine-tuning or alternative alignment methods to prevent generation degradation. The discriminator works; the path from discriminator to generator improvement is a separate problem.

---

## What to Do With This

If you're building or evaluating legal AI systems, the immediate takeaway is that citation accuracy is measurable at scale without human reviewers — and the measurement reveals meaningful differences between architectures. A 0.08 gap between the best and worst systems (0.873 vs. 0.791) translates to roughly one additional hallucinated citation per five responses at the lower end. That's auditable, and it's the kind of number that should appear in procurement decisions.

The deeper takeaway is about what you're actually measuring. A system that cites real provisions in the wrong context will pass existence checks and fail relevance checks. If your evaluation pipeline only checks whether cited statutes exist, you're missing the failure mode that actually shows up in production. The three-component decomposition — existence, relevance, temporality — is the right frame, even if the temporality component here is still incomplete (current implementation checks existence in the graph, not whether a specific version was in force at a given date).

For teams working on non-Ukrainian jurisdictions: the graph construction methodology is transferable to any legal system with a large corpus of published decisions and structured citation patterns. Common law systems would need modifications to the graph structure, but the core approach — build a citation graph, use it to generate preference pairs, fine-tune a discriminator — is jurisdiction-agnostic in principle. The Ukrainian corpus just happens to be large enough (100.8 million decisions) to make the graph reliable.

*Ovcharov, V. (2026). Citation Grounding: Detecting and Reducing LLM Citation Hallucinations via Legal Citation Graphs. arXiv:2606.00898*