# RAG Clarification Systems Have a Privacy Problem Nobody Has Tested Yet

Retrieval-augmented generation has a well-documented membership inference problem. Researchers have shown that by querying a RAG system directly — asking it to complete masked sentences, or crafting questions designed to elicit retrieved content — an attacker can determine whether a specific document exists in the underlying collection. Defenses have followed: anomaly detection, system-prompt guardrails, output filtering. The field has treated the generated answer as the attack surface.

A position paper from the University of Amsterdam argues that framing is incomplete. It identifies a structurally distinct attack surface that existing defenses don't address: the clarifying question itself. In retrieval-augmented intent clarification systems — where the agent grounds its clarifying questions in a document collection rather than relying on parametric LLM knowledge — an attacker never needs to see an answer. The shape and content of what the system *asks* may be enough to infer sensitive document membership.

The paper conducts no experiments. No attack is implemented. No defense is measured. What it offers is a problem framing — and in a domain where the architectural risk is real and the research is absent, that framing is worth examining.

---

## The Setup: RAG Meets Clarifying Questions

Intent clarification in conversational search is the process of asking a user follow-up questions to refine an ambiguous query before returning results. Retrieval-augmenting that clarification step — pulling from the actual document collection to generate more grounded, domain-specific questions — improves performance in specialized domains where LLMs lack reliable parametric knowledge. A general-purpose model doesn't know the internal taxonomy of a hospital's records system or the specific regulatory categories in a government FOIA archive. A retrieval step can supply that context.

In sensitive domains, this creates a structural tension. Healthcare records, FOIA government search, legal e-discovery — these are the domains where retrieval-augmented clarification is most useful, and also where the underlying document collection is most protected. The conversational agent must play two roles simultaneously: mediator helping the user refine their query, and gatekeeper preventing sensitive content from leaking through the interaction. The paper frames this as an analogy to a librarian or a FOIA official — someone with access to a protected collection who must help without disclosing.

The dual role is not merely a design challenge. It creates an attack surface that doesn't exist in simpler RAG architectures where the system either returns documents or generates answers. Here, the system's behavior — what it chooses to ask — is itself a signal.

---

## The Threat: Leakage Through Questions, Not Answers

Existing membership inference attacks on RAG systems work by probing the output layer. An attacker asks the system to confirm or complete sensitive text, observes whether retrieved content surfaces in the generated answer, and infers document membership from that. The attack is direct: the answer either contains the sensitive information or it doesn't.

In a clarification-only system, that pathway is closed. The agent never outputs document content directly. An attacker must instead infer sensitive membership from the indirect signal of which clarifying questions the system generates — their specificity, their framing, the entities and categories they invoke. If a system asks "Are you looking for records related to a specific treatment protocol?" in response to a vague medical query, that question may itself reveal something about what's in the collection.

This indirection is what makes the attack surface novel. Existing defenses — anomaly detection on outputs, guardrails in system prompts — are designed for direct leakage. They monitor what the system says in response to queries, not what the system asks. The paper argues that relying on the LLM itself as a defense produces an unresolvable cat-and-mouse dynamic: LLMs have been shown to be susceptible to jailbreaking and membership inference attacks on training data, and an adversary who understands the system's prompt structure can probe around guardrails iteratively.

The paper is careful to note that the attack model itself remains to be defined. Attacker goal, knowledge, capabilities, and the granularity of sensitive information that can be inferred — all of this is deferred to future work. The contribution here is identifying that the attack surface exists and is structurally distinct, not demonstrating that it is exploitable in practice.

---

## Two Defense Paradigms Proposed (Neither Yet Tested)

The paper sketches two high-level paradigms for addressing the leakage risk, each with candidate mechanisms.

The first is protect-then-search: preprocess the document collection before it ever reaches the retrieval step. This could involve technology-assisted sensitivity review, privacy-preserving text sanitization, or automatic FOIA-style redaction. The collection that the clarification agent retrieves from would be a sanitized version, limiting what signals can propagate into the questions it generates. The mechanism is conceptually clean but introduces an obvious utility cost — sanitization that removes sensitive signals may also remove the domain-specific detail that makes retrieval-augmented clarification useful in the first place.

The second is search-then-protect: keep the full collection accessible for retrieval but intercept and suppress sensitive signals at query time, drawing on sensitivity-aware search literature. Within this paradigm, the paper sketches two specific mechanisms. One is k-anonymity-inspired abstraction — constructing document representations (topics, sentences, labels) such that each document is indistinguishable from at least k others, making membership inference from clarifying questions harder. The other is differential-privacy-inspired noise injection into retrieval results, adding uncertainty about which documents actually influenced a given clarifying question. The paper notes that noise injection may be more acceptable in clarification systems than in direct-answer systems, precisely because the output is a question rather than a factual claim.

None of these mechanisms are implemented. The paper explicitly defers attack modeling, implementation, and utility-privacy tradeoff analysis to future work, and names two candidate datasets — Avocado and SARA — for eventual evaluation. The tradeoff between protection level and system utility is identified as a key challenge but is not quantified.

---

## What This Paper Is and Isn't

This is a position and vision paper. The threat it describes is argued conceptually — there is no empirical demonstration that retrieval-augmented clarification systems actually leak sensitive information in practice. The defenses are sketches. The attack model is a placeholder. Practitioners looking for actionable guidance on which mitigations to deploy will not find it here.

What the paper does provide is a useful architectural prompt. If you are building retrieval-augmented conversational agents over sensitive document collections — medical records, government archives, legal corpora — the clarification layer is a leakage pathway that existing RAG security thinking doesn't cover. The question of whether that pathway is exploitable in your specific system is one you should be asking, even if the research community hasn't answered it yet.

The practical implication is narrow but concrete: before deploying retrieval-augmented clarification in a sensitive domain, map the information flow through the clarification step specifically. What does the retrieval step access? What signals can propagate from retrieved documents into the questions the agent generates? Is there a sanitization or interception layer between the full collection and the clarification component? These are architectural questions that can be asked now, without waiting for the empirical work the paper defers.

The absence of tested defenses is not an argument for inaction. It is an argument for not assuming that guardrails designed for answer-layer leakage cover question-layer leakage — because structurally, they don't.

---

*Larooij, M. (2026). Sensitivity-Aware Retrieval-Augmented Intent Clarification. arXiv:2603.06025*