# Agentic RAG's Compounding Failure Modes: What a New SoK Survey Actually Shows

Standard RAG pipelines have a simple control flow: retrieve once, then generate. The determinism is a feature — it makes the system auditable and the failure modes legible. When the initial retrieval is bad, the output is bad, and the error is terminal. That's a tractable problem.

Agentic RAG breaks that simplicity deliberately. It separates planning from generation, introduces iterative retrieval loops, adds persistent memory and tool orchestration, and allows the system to revise its own queries based on intermediate outputs. The architectural gains are real — these systems can self-correct, handle multi-hop reasoning, and operate across longer horizons than any static pipeline. The problem is that every property that makes agentic RAG more capable also makes it harder to evaluate, harder to secure, and harder to reason about when it fails.

A new SoK paper synthesizes approximately 118 works to provide the first formal framework for reasoning across these systems — modeling Agentic RAG as a finite-horizon POMDP and building a taxonomy across planning, memory, tool orchestration, and retrieval strategy. The paper's central finding isn't that agentic RAG is dangerous. It's that the field's evaluation infrastructure and security models were built for static pipelines and are structurally incapable of detecting the failure modes that agentic architectures introduce.

The number that anchors the concern: retrieval-augmented legal research tools — a high-stakes deployment category — exhibited hallucination rates up to 33% in empirical testing, directly contradicting vendor reliability claims.

---

## The Fragmentation Problem Agentic RAG Inherits

The SoK authors frame their contribution as addressing "severe field fragmentation, a lack of a unified taxonomy, and an absence of standardized evaluation frameworks" in Agentic RAG. That framing is precise. The field has accumulated architectural innovations faster than it has developed shared vocabulary for describing them, which means practitioners are comparing systems that aren't actually comparable and deploying tooling whose failure modes haven't been formally characterized.

Static RAG's brittleness is well-understood: retrieval quality depends entirely on the initial query, with no mechanism to refine the search based on what the model generates. If the initial evidence is noisy or incomplete, the system cannot self-correct. Agentic RAG was designed to fix that — and does. But the fix introduces a new class of problems that static-pipeline thinking doesn't surface.

The paper's formal contribution is modeling Agentic RAG as a finite-horizon Partially Observable Markov Decision Process with four analytically necessary properties. The POMDP framing matters because it makes the state-space explicit: the agent operates under partial observability, its actions have consequences that propagate across steps, and the system's behavior at any point depends on accumulated history — not just the current query. None of that is true of static RAG, and none of it is captured by the evaluation frameworks currently in common use.

The taxonomy organizes the space across six modular components — Planner, Retrieval Engine, Reasoning Engine, Memory Systems, Tool Orchestration Layer, and Verification/Self-Correction Modules — and identifies seven recurring control-flow design patterns. The point isn't architectural completeness for its own sake. It's that without this kind of decomposition, it's impossible to localize where a failure originated in a multi-step system, which makes debugging and auditing both harder.

---

## How Iteration Amplifies Risk

In a static RAG pipeline, a hallucinated claim is a terminal error — bad output, identifiable cause, recoverable. In an agentic setting, that same hallucinated claim becomes input to the next retrieval step. The retriever may then surface passages that spuriously corroborate it. The error propagates and reinforces across iterations. The paper calls this "Compounded Hallucination Loops" — a failure mode that has no analog in single-pass systems and that no static-pipeline metric is designed to detect.

The cost structure compounds too. Intermediate reasoning, tool queries, and critique steps expand generated tokens and multiply model invocations — what the paper terms token amplification. Iterative retrieval paradigms scale cost directly with the number of planning steps, which means a system that loops unnecessarily isn't just slow; it's expensive in proportion to how lost it is.

Corpus poisoning represents the most quantified security risk in the paper's analysis. Injecting as few as five carefully crafted malicious documents into a RAG corpus can cause the system to generate attacker-specified answers with a 90% success rate — figures from the PoisonedRAG study presented at USENIX Security Symposium. That attack surface exists in static RAG too, but agentic systems compound it: an injected document that shapes one retrieval step can influence subsequent steps through the same hallucination-loop mechanism.

Memory poisoning is a distinct and harder problem. Where corpus poisoning targets a shared knowledge base — detectable, in principle, through corpus auditing — memory poisoning targets individual user session state. The corrupted information is specific to a single session, making it significantly harder to detect at the system level. The paper cites research on AI worm attacks that survive session terminations, suggesting the threat model extends beyond individual interactions.

---

## Why Current Evaluation Metrics Fail Agentic Systems

The paper's metric failure analysis is the most practically consequential section for anyone currently running evaluations. BLEU and ROUGE measure lexical overlap. They cannot distinguish a correct final answer reached through flawed multi-step logic from one reached through valid planning. For static RAG, that limitation is tolerable — the reasoning path is short and largely implicit. For agentic systems with multi-hop reasoning chains, it means the metric is measuring the wrong thing entirely.

Exact Match has the same structural problem: it cannot assess partial correctness or the validity of intermediate reasoning steps. Final-Answer Accuracy is worse in a specific way — it actively rewards correct answers regardless of whether the planning path was sound, which means a system that gets the right answer for the wrong reasons scores identically to one that reasons correctly. That's a meaningful distinction when you're trying to understand whether a system is reliable or merely lucky on the benchmark distribution.

LLM-as-a-judge methods correlate with human judgments but are highly sensitive to prompt sequencing and exhibit sycophantic bias toward their own generated output patterns. The paper identifies this as a reproducibility crisis: as frontier models evolve, baseline comparisons made with earlier judge models become unstable. The evaluation infrastructure is moving at a different rate than the systems being evaluated.

Existing benchmarks — RGB, RAGBench, RAGEval — lack capacity for long-horizon trajectory evaluation and dynamic tool invocation assessment. Those are precisely the dimensions that define agentic behavior. The benchmarks were built for the systems that existed when they were designed, and the field has moved past them without building replacements.

---

## The Deployment Reality Gap

The 33% hallucination rate in legal research tools isn't an outlier finding from a hostile audit. It's from an empirical study of leading commercial products in a deployment category where vendors had made reliability claims. The gap between claimed and observed performance is a direct consequence of evaluating agentic systems with metrics that can't see their failure modes.

The paper identifies a structural divergence between academic research and industrial deployment that makes this worse. Academic prototypes maximize benchmark scores through unconstrained tool usage — more tool calls, more retrieval steps, more intermediate reasoning. Industry deployments prioritize determinism and constrained interfaces, because production systems need predictable behavior and bounded costs. The two optimization targets are structurally divergent, which means benchmark performance doesn't transfer to deployment conditions in any straightforward way.

The convergence problem has no current solution. Iterative retrieval loops rely on arbitrary heuristics — rigid max_steps parameters, fixed query reformulation strategies — with no formal stability guarantees or mathematical convergence proofs. A system that loops indefinitely isn't a theoretical concern; it's a cost and reliability risk with no principled stopping criterion. The paper is direct: the field currently lacks empirical standardization for halting iterative retrievals securely.

Self-reflection mechanisms — the verification and self-correction modules that make agentic RAG appealing — rely on the model's own judgments, which are fallible in the same ways the model is fallible. Verification quality is bounded by the retriever's recall; the system cannot correct a claim if the grounding truth is missing from the corpus. These aren't edge cases. They're the conditions under which agentic RAG is most likely to be deployed — on novel queries, in specialized domains, where the corpus is necessarily incomplete.

---

## Before the Next Deployment

The paper's practical implication isn't that agentic RAG shouldn't be deployed. It's that the evaluation and security infrastructure required to deploy it responsibly doesn't yet exist out of the box, and practitioners need to build it deliberately.

Trajectory-level evaluation is the first gap to close. Final-answer accuracy tells you almost nothing about whether an agentic system is reasoning correctly. Logging and evaluating intermediate retrieval steps, tool calls, and reasoning chains — not just outputs — is the minimum necessary to understand what a system is actually doing. This requires instrumentation that most current frameworks don't provide by default.

Adversarial corpus auditing is the second. The five-document, 90% success rate finding from PoisonedRAG sets a low bar for attack feasibility. Any corpus that accepts external contributions — or that aggregates from sources with varying trust levels — needs explicit poisoning detection before an agentic system queries it. Static RAG systems need this too, but agentic systems amplify the downstream consequences of a successful injection.

Explicit convergence constraints are the third. Max_steps parameters are not convergence proofs. Until formal stability guarantees exist, the practical substitute is conservative loop limits with explicit fallback behavior — not open-ended iteration with a hope that the system will stop. The paper frames this as a grand research challenge; practitioners can't wait for it to be solved before deploying.

The authors are precise about what the POMDP formalization does and doesn't give you: the four analytically necessary properties classify a system as Agentic RAG, but they are not sufficient to guarantee stability or safety. Classification is not certification. Knowing what kind of system you have is the starting point, not the endpoint.

---

*Mishra, S., Niroula, S., Yadav, U., Thakur, D., Gyawali, S., & Gaire, S. (2026). SoK: Agentic Retrieval-Augmented Generation (RAG): Taxonomy, Architectures, Evaluation, and Research Directions. arXiv:2603.07379*