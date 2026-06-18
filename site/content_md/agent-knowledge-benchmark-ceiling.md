# The Best AI Support Agents Still Fail 3 Out of 4 Real Tasks

Most agent benchmarks measure capability under favorable conditions — clean queries, well-scoped tasks, retrieval that works. τ-Knowledge, a new benchmark from researchers at τ-Knowledge, takes a different approach: it measures what happens when agents face the kind of knowledge complexity that characterizes real enterprise support deployments. The benchmark places agents inside a fintech customer support simulation with 698 interconnected documents, 51 discoverable tools, and tasks that require multi-step policy reasoning across an evolving database state. The conditions are not adversarial. They are just realistic.

Prior work on retrieval-augmented agents has largely treated retrieval quality as the primary lever for improving performance. Better embeddings, better rerankers, larger retrieval sets. The implicit assumption is that if agents had access to the right documents, they would use them correctly. τ-Knowledge tests that assumption directly — by running agents with perfect document access alongside agents using real retrieval — and finds it does not hold.

The number that anchors the paper: the best frontier agent, under any retrieval configuration, solves 25.52% of tasks on a single attempt.

---

## The Ceiling Is Low and Retrieval Isn't the Bottleneck

The benchmark tests a range of frontier models — Claude-4.5-Opus, GPT-5.2, Gemini-3-Pro, Gemini-3-Flash — across retrieval configurations including dense embeddings, sparse BM25, and terminal-based filesystem search. The best result under real retrieval conditions is 25.52% pass^1, achieved by GPT-5.2 with high reasoning and terminal-based search.

The more diagnostic result comes from the golden-retriever configuration, where retrieval is removed as a variable entirely: agents receive the exact documents required to solve each task. Under those conditions, the best model — Claude-4.5-Opus with high reasoning — reaches 39.69% pass^1. Retrieval was not the bottleneck. Even with perfect document access, agents fail on more than 60% of tasks.

The no-knowledge baseline confirms the tasks are not solvable from parametric memory. Averaged across all models, pass^1 drops to 2% when agents have no access to the knowledge base. The documents matter. Agents just cannot reliably reason over them.

The long-context ablation — providing all 698 documents directly in context — peaks at 12% pass^1 for GPT-5.2 with high reasoning and Gemini-3-Pro. Unlimited access to the right information does not solve the reasoning challenge; it introduces noise that degrades performance relative to selective retrieval.

---

## Reliability Collapses Under Repeated Trials

pass^1 measures whether an agent solves a task on a single attempt. pass^4 measures whether it solves the task correctly across four independent runs — the metric that matters for production systems where users expect consistent answers.

The best pass^4 result across all models and configurations is 13.40%, achieved by GPT-5.2 with high reasoning and Qwen3-emb-8b retrieval. The best golden-retriever configuration reaches 26.80% pass^4 — Claude-4.5-Opus with high reasoning. Even under perfect retrieval conditions, the best agent fails consistently on more than 73% of tasks across repeated attempts.

The benchmark's average task requires 18.6 documents and 9.52 tool calls, with some tasks demanding up to 33 sequential actions. Complexity compounds variance. A system that occasionally produces the right answer is not the same as one that reliably does — and the gap between those two things is larger here than most benchmark reporting suggests.

For practitioners evaluating agents for deployment, this distinction is not academic. A 25% pass^1 rate might suggest an agent that handles a quarter of cases autonomously. A 13.40% pass^4 rate suggests an agent that handles far fewer cases without inconsistency — and that the 25% figure overstates practical reliability by roughly half.

---

## Terminal-Based Search Helps Recent Models, But at a Cost

Across models, terminal-use — free-form shell access to the knowledge filesystem — outperforms both dense and sparse retrieval with statistical significance. The benchmark reports p-values of 0.005 against Qwen3-emb-8b, 0.013 against BM25, and 0.001 against text-embedding-3-large. The aggregate result is real.

The benefit is not evenly distributed. GPT-4o, GPT-4.1, and GPT-5.2 without reasoning see no improvement from terminal access — and in some configurations perform worse than structured retrieval. Terminal-use gains are concentrated in the most capable recent models with extended reasoning enabled.

The efficiency cost is substantial. GPT-5.2 with terminal-use matches Claude-4.5-Opus in pass^1 but requires approximately 1.7× more tokens, executes roughly 2.3× more shell commands, and takes roughly 9× longer per task — 1,567.8 seconds average task duration versus 177.1 seconds for Claude-4.5-Opus. That is not a rounding difference. It is a deployment constraint.

The mechanism behind terminal gains is also not what the retrieval-engineering framing would predict. Document recall does not uniformly improve with terminal use. The gains appear to come from how capable models parse and reason over retrieved content, not from retrieving more of it.

---

## What the Failure Pattern Reveals About Agent Reasoning

The benchmark's ablation structure isolates where reasoning breaks down. The progression from no-knowledge (2% pass^1) to real retrieval (25.52%) to perfect retrieval (39.69%) to full long-context (12%) maps the contribution of each component — and the gaps are informative.

The 14-point gap between real retrieval and perfect retrieval is the retrieval tax: what agents lose because they don't find the right documents. The 60-point gap between perfect retrieval and full task success is the reasoning tax: what agents lose even when they have everything they need. The reasoning tax is roughly four times larger.

Document recall diverges sharply by model in ways that complicate retrieval engineering. text-embedding-3-large retrieves 57% of gold documents when paired with Claude-4.5-Opus but only 28% when paired with GPT-5.2 without reasoning. The same retriever, different query behavior from the agent, different recall. Retrieval performance is not a fixed property of the retriever — it depends on how the agent queries it.

Standard retrieval tuning levers produce no statistically significant improvement in pass^1. Adding a reranker: no significant change. Adding a grep tool alongside dense retrieval: no significant change. Increasing k from 10 to 20: no significant change. The failure mode is not addressable through retrieval engineering. The tasks require agents to navigate cross-document dependencies and multi-step policy logic — and current models, including the most capable frontier systems, do not do this reliably.

---

## Before the Next Deployment Decision

The practical implication is not that agents are useless for knowledge-intensive workflows. It is that the current reliability ceiling — 13.40% pass^4 under real conditions — is too low for unsupervised deployment on complex tasks, and that the path to improving it runs through reasoning, not retrieval.

Retrieval engineering is not wasted work. The 14-point gap between real and perfect retrieval is real, and closing part of it matters. But the benchmark makes clear that even closing it entirely would leave the majority of tasks unsolved. Organizations evaluating agents for support automation should test against pass^k metrics, not single-trial accuracy — and should test under realistic document complexity, not curated retrieval conditions.

The benchmark also surfaces a practical asymmetry between models. Claude-4.5-Opus reaches comparable pass^1 to GPT-5.2 in roughly one-ninth the time. For latency-sensitive deployments, that difference is not a footnote. And for teams considering terminal-based search as an upgrade path, the gains are real but model-gated: earlier GPT models and models without extended reasoning do not benefit, and the efficiency cost for models that do benefit is significant enough to require explicit evaluation.

The researchers are direct about the ceiling's source. The tasks in τ-Knowledge require reasoning over 698 interconnected documents, 51 tools, and evolving state — conditions that expose failure modes invisible in simpler benchmarks. Agents that perform well on those benchmarks may not generalize. The gap between benchmark performance and production reliability is, in part, a gap in what the benchmarks measure.

---

*Shi, Q., Zytek, A., Razavi, P., Narasimhan, K., & Barres, V. (2026). τ-Knowledge: Evaluating Conversational Agents over Unstructured Knowledge. arXiv:2603.04370*