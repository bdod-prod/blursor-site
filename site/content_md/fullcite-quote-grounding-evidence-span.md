# FullCite gets better quote grounding by separating the document from the evidence span

LLMs are already decent at naming the right source document. The harder part is pointing to the exact words that support the claim. That gap matters if the goal is not just “cite something relevant,” but to make each answer line traceable to a verifiable quote.

This paper’s basic move is simple but useful: it treats inline citation as a two-part problem. First, choose the document. Then, choose the evidence span inside it. FullCite compares three ways to do that — prompt-only generation, constrained decoding, and posthoc span alignment — and checks them against document correctness, evidence-span identification, and claim-citation faithfulness.

The most striking result is on ASQA, where posthoc alignment lifts snippet-F1 from 12.80 to 61.87 for Qwen3-8B.

## Why inline citations are easy to get half right

The paper starts from a failure mode practitioners will recognize: an answer can look well cited even when the citation is only loosely connected to the actual supporting words. In other words, the model can often get the document right and still miss the quote.

That distinction is the whole point of FullCite. The authors argue that true grounding needs joint reference to both the document and the evidence span, because document-level attribution alone leaves too much room for vague or misleading support. They evaluate citations on three dimensions: document-level correctness, evidence span identification, and claim-citation faithfulness.

There’s also a dataset-level clue that the problem is not evenly distributed. In BioASQ, 81.8% of citations target only the first two of five context documents. That kind of primacy bias suggests models are not really searching the full context for the best evidence; they’re settling early.

## What FullCite actually changes

FullCite makes every cited claim carry two pieces of information: the source document ID and a verbatim evidence span from that document. That structure is what turns generic citation generation into quote-grounded citation generation.

The paper tests three strategies. Prompt-based generation asks the model to do the whole job through instruction-following alone. Constrained decoding uses a finite-state automaton over a citation grammar, so the model can only emit citations that fit the expected structure. Posthoc alignment takes the generated document citation and then tries to locate the cited span afterward, using word-level overlap via Jaccard similarity.

That last step is the most practical idea in the paper. Instead of assuming the model will produce a perfect quote in one shot, it lets the model recover the document first and then explicitly aligns the span. In a setting where exact evidence extraction is the hard part, that extra pass matters.

FullCite is evaluated on three QA benchmarks — ASQA, BioASQ, and ExpertQA — using two open-weight models, Qwen3-8B and Gemma-3-12B-it. The runs use the same default settings throughout: starting temperature 0.7, top-p 0.95, top-k 50, and output length capped at 1500 tokens.

## The results: evidence spans improve a lot, but semantics can slip

The clearest win is span identification. On ASQA, posthoc alignment pushes snippet-F1 from 12.80 to 61.87 for Qwen3-8B. That is the paper’s strongest signal that structured citation plus explicit span alignment does something prompt-only generation does not.

The more nuanced part is the trade-off. Both the constrained and posthoc strategies improve evidence identification, but they can reduce semantic alignment. So the model gets better at selecting the cited quote, but not always better at preserving the broader meaning relationship between the claim and that quote.

The paper also notes that the posthoc Generate-then-retrieve baseline gets the highest Doc-F1, which fits the general pattern: document retrieval is easier than span retrieval. But FullCite is the only framework that reports both Doc-F1 and Snippet-F1 while still keeping competitive similarity scores, so it gives a more complete view of how citation quality is changing.

That matters because document-level accuracy alone can hide weak grounding. A system can cite the right source and still fail to land on the line that actually supports the answer.

## What to do about it in a real QA pipeline

If your product goal is “cite the exact quote,” don’t rely on prompt-only citation generation. Use a structured citation format that separates document selection from evidence-span selection, and plan for an explicit alignment step after generation. In this paper, that posthoc step is the biggest mover.

You should also treat span accuracy and semantic faithfulness as two different knobs, not one. Better quotation fidelity can come with weaker semantic alignment, so a production pipeline may need reranking, tighter generation constraints, or calibration around when to trust a generated span.

The evaluation caveats matter too. The paper only tests two open-weight models, and the automatic metrics do not fully capture whether a cited span actually entails the claim. Human evaluation helps, but it is limited to 50 examples. So the practical read is not “solve citations with one trick,” but “use structured citation to get more faithful grounding, then validate carefully before you assume the numbers transfer.”

*Yeginbergen, A., Wührl, A., Rogers, A., & Agerri, R. (2026). Explicit Evidence Grounding via Structured Inline Citation Generation. arXiv:2606.07130*