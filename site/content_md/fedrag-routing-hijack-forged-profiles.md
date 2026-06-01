# A Wolf in Sheep's Clothing: How Forged Profiles Hijack Federated RAG Routing

Federated RAG systems distribute retrieval across many clients, each holding a slice of domain knowledge. A central router matches incoming queries to the right client by comparing the query's embedding against each client's semantic profile — a compact representation of what that client knows. The assumption baked into this design is that profiles are honest. They're not verified. They're just trusted.

A new paper from Politecnico di Milano shows exactly what happens when that assumption breaks. A malicious client submits a forged profile at federation join time, constructed from publicly available passages in the target domain. The router, seeing a profile that looks highly relevant, starts sending it queries it was never meant to handle. Those queries then get poisoned answers or hallucinations instead of real knowledge.

The attack requires 100 proxy passages — publicly available, no access to other clients' data, no model weights, no coordination. With that, a single malicious client hijacks 70–91% of target queries across embedding-based routing systems.

---

## The Attack Surface: Routing as the Weak Link

The core mechanism is straightforward. Federated RAG routers select clients by cosine similarity between a query embedding and each client's profile. A malicious client wants to maximize that similarity for a target domain. The paper proves — in Proposition 1 — that the optimal strategy is to set the forged profile to the normalized centroid of target-domain query embeddings. In plain terms: average the embeddings of 100 representative passages from the target domain, normalize the result, and submit that as your profile.

This is a one-time operation at registration. The attacker doesn't need to monitor traffic, adapt over time, or compromise any other component. The forged profile sits in the routing table and passively attracts queries.

Homomorphic encryption, which some federated systems use to protect profile privacy during routing, provides no protection here. The attack exploits the ranking that cosine similarity produces — and encryption preserves that ranking exactly. Plaintext and encrypted routing produce identical hijack rates: 33.2% HR@1 and 93.7% HR@3. The privacy control and the security control are solving different problems, and only one of them is present.

For LLM-based routing, where clients submit natural-language descriptions of their knowledge rather than embedding vectors, the attack adapts to a universal-competence description — text claiming broad expertise in the target domain. The underlying vulnerability is the same: the router has no way to verify whether the description matches what the client actually holds.

---

## Hijack Rates Across All Three Router Families

The paper evaluates three routing architectures that cover the main design space in federated RAG: embedding-based routing using cosine similarity, neural routing via RAGRoute's learned MLP scorer, and LLM-based routing via ReSLLM's natural-language source descriptions.

Embedding-based routing is the most exposed. In a 20-client system built from StackExchange Q&A data, a single malicious client reaches 70–91% HR@3 depending on domain. Three malicious clients push that to 86–95%. The Gaming domain hits 91% HR@3 with one malicious client and 95% with three — meaning nearly every target query lands on a malicious client.

LLM-based routing via ReSLLM is equally vulnerable in a different way. Against 157 legitimate sources in the FedWeb-2013 benchmark, three malicious sources using a universal-competence description achieve 73% HR@1 and 97% HR@3. The attack surface here is the description text itself — there's no embedding to inspect, just a claim about expertise that the router accepts at face value.

RAGRoute is comparatively harder to fool. Its learned scorer doesn't rely purely on profile-query cosine similarity, so the centroid attack reaches only 32% HR@3 with three malicious clients. That's still meaningful attack surface — roughly one in three target queries misrouted — but it's a different threat level than the other two families.

Proxy data quality scales the attack linearly. Increasing clean target-domain proxy passages from 25 to 100 raises HR@1 from 10.9% to 39.5% with one malicious client, and from 25.8% to 65.7% with three. The more representative the public data, the better the forged centroid, the higher the hijack rate. As more domain-specific content becomes publicly available, this attack gets cheaper.

---

## From Routing Access to Downstream Harm

Hijacking the router is the first step. What happens to the query after that determines the actual damage.

The paper tests two downstream attack modes: harmful-content injection and data poisoning. Harmful-content injection — where the malicious client returns explicitly harmful passages — triggers refusal in nearly all cases at k=1. Safety filters catch it. Data poisoning is a different story: the malicious client returns plausible-sounding false evidence that supports an incorrect answer. Safety filters don't flag it because the content looks legitimate.

Conditioned on a successful hijack, data poisoning produces incorrect answers in 66.7% of embedding-routing cases and 83.4% of RAGRoute cases at k=1. At k=3, where the router selects three clients and the malicious client is one of them, incorrect answer rates drop to 30.8% and 57.7% respectively — still substantial, because the poisoned evidence competes with honest evidence from other clients and sometimes wins.

The medical routing stress test makes the stakes concrete. With 15 non-medical clients, 3 honest medical clients, and 3 malicious clients holding forged medical profiles, the honest medical clients' access rate drops from 100% to 67.7%. Three malicious clients with 100 proxy passages reach 75.1% HR@3 on medical queries — meaning patients' questions are routed away from legitimate medical knowledge nearly three-quarters of the time.

Model scale doesn't eliminate the risk. Qwen3-30B-A3B, a large reasoning model, produces incorrect outputs in 44% of poisoned MedQA cases. Llama-3.1-8B fails at 82%. Larger models are more resistant, but the failure mode persists — a model that reasons carefully over fabricated evidence can still reach a fabricated conclusion.

---

## TASR: A Partial Mitigation with Real Limits

The paper proposes Trust-Aware Secure Routing (TASR), a post-routing layer that accumulates feedback signals — retrieval relevance, profile consistency, cross-client agreement — and uses them to reweight client trust scores over time. It doesn't change the initial routing decision; it adjusts future decisions based on observed behavior.

On embedding-based routing, TASR works well once it's warmed up. HR@1 drops from 35.6% to 3.5% with one malicious client and from 64.9% to 5.7% with three. After the warmup period, post-warmup HR@1 reaches 0.0% — the forged client is effectively excluded. The latency cost is negligible: 0.35 ms per query on average, 0.60 ms at P95.

On RAGRoute, TASR is less effective. HR@3 falls from 96.8% to 49.7% — a real improvement, but the attack still succeeds roughly half the time. The feedback signals TASR uses are relevance and consistency, not factual truth. A malicious client that returns semantically relevant but factually false evidence can partially evade detection, because the returned passages look on-topic even when they're wrong.

The warmup window is a genuine vulnerability. Until enough queries have accumulated to build reliable trust scores, hijacking persists at the undefended rate. How long that window lasts depends on query volume and domain diversity — the paper doesn't quantify it precisely, but it's real exposure time in any live deployment.

Byzantine-robust aggregation methods — Krum, Median, Trimmed Mean — largely fail as alternatives. Krum works only when the forged profile is a geometric outlier; at an intermediate target fraction of 0.50, Krum stops flagging the forged profile while HR@1 stays at 44.4%. Median and Trimmed Mean show no meaningful reduction under adaptive attack. These methods were designed for gradient aggregation in federated learning, and they don't transfer cleanly to the profile-routing setting.

---

## What to Do About It

The practical implication is that open client registration in federated RAG is a security boundary, and it's currently unguarded. Any system that lets clients self-report semantic profiles without verification is exposed to this attack class — and the attack requires only public data and a one-time registration.

The immediate step is to treat semantic profiles as untrusted inputs. That means implementing post-routing verification before deploying federated RAG in any setting where clients aren't fully vetted. TASR's feedback loop is a reasonable starting point for embedding-based routing, but it needs to be paired with a registration-time check that can catch forged profiles before they enter the routing table.

For LLM-based routing, the description-text attack surface needs a different approach — some form of challenge-response or held-out query verification at join time, rather than relying on the description alone. The paper doesn't propose this, but the gap is clear.

Systems handling sensitive queries — medical, legal, financial — should treat the medical stress-test result as a design constraint: if three malicious clients can redirect 75% of medical queries away from legitimate knowledge, the routing architecture needs a trust layer before it handles real users. Homomorphic encryption, if it's in the design for privacy reasons, provides no security benefit against this attack and shouldn't be cited as one.

*Mu, J., & Li, Q. (2026). A Wolf in Sheep's Clothing: Targeted Routing Hijacking in Federated RAG. arXiv:2605.28112*