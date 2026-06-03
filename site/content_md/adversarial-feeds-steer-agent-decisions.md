# Adversarial Feed Injection Can Flip Small LLM Agent Decisions — Including Security Ones

Most prompt injection research focuses on what happens when an attacker gets something into the system prompt or the tool-call chain. This paper asks a different question: what if the attacker never touches any of that, and just controls what the agent reads?

The setup is an LLM agent scrolling a ranked social feed — ten turns, five posts per turn — before issuing a recommendation. The only variable is how many of those posts were written to push a particular outcome. No jailbreak, no hidden instruction, no system-level access. Just feed composition. Across 2,785 decision rollouts on four open-weight models from three labs, that turns out to be enough.

The anchoring result: Llama 3.2-3B goes from recommending remote-first in all 20 baseline seeds to a split of 1/9/10 under heavy injection. Every single default recommendation moves.

---

## The Attack: Poisoning the Feed, Not the Model

The protocol is deliberately minimal. An agent is given a persona and a decision topic, then shown ten rounds of social posts before being asked to make a forced-choice recommendation — option A, B, or C. Organic baseline runs use randomly sampled posts from a 500-post pool. Attack runs replace some fraction of those posts with adversarial ones drawn from a 50-post pool written to favor a specific outcome. Everything else stays fixed.

What varies is the ratio. At heavy injection, all five posts per turn are adversarial. At light injection, just one of five is. The mechanism isn't mysterious — it's context accumulation. The agent sees a feed that skews one way, and its recommendation follows.

The threshold matters here. Below two adversarial posts per five-post batch, the effect is essentially invisible. Above that, remote-first recommendations on Llama decline monotonically as adversarial density increases — a clean dose-response relationship confirmed by Pearson chi-squared across six dose levels. The attack isn't a blunt instrument; it has a floor, and crossing it produces a predictable shift.

A directional control rules out the obvious alternative explanation. When the adversarial pool pushes *toward* the model's existing default rather than against it, Llama's remote-first recommendations stay intact across every condition. That asymmetry means the effect isn't general instability from adversarial content — it's specifically the direction of the injection that matters.

---

## Three Response Regimes Across Four Models

Not every model moves. Across the four models tested — Llama 3.2-3B, Gemma 4-e4b, Qwen 3.5-2B, and Qwen 3.5-9B — the results split into three distinct patterns.

Llama 3.2-3B capitulates. Its baseline is unanimous: 0/0/20 in favor of remote-first across all 20 seeds. Under heavy injection, that collapses to 1/9/10 — a statistically significant shift by Fisher's exact test. The default was strong, and the attack moved it anyway.

Gemma 4-e4b shifts completely, but differently. Its baseline is already mixed at 0/12/8, split between hybrid and remote-first. Under heavy attack, it locks to 0/20/0 — every seed lands on hybrid. The model doesn't capitulate to the adversarial option; it migrates entirely to the middle. That's a different failure mode than Llama's, and the defenses that work on Llama don't replicate on Gemma.

Both Qwen models show nothing, and the reason is structural: they're already saturated near hybrid answers before any attack begins. Qwen 3.5-2B sits at 0/20/0 at baseline; Qwen 3.5-9B at 0/18/2. There's no movable default to attack. The null result isn't a sign of robustness in the usual sense — it's that the attack requires a contestable decision to contest.

A generator-swap test strengthens the Llama finding. Replacing the Claude-written post pools with Gemma 4-written equivalents replicates the attack and makes it stronger, ruling out post style or Claude-specific phrasing as a confound.

---

## Security Decisions Are Not Exempt

The remote-work task is a policy opinion — reasonable to wonder whether harder decisions would resist the same pressure. The generalization battery tests three additional tasks, two of which are explicitly security-critical: removing a production deployment approval gate, and relaxing mandatory MFA and least-privilege access controls.

On Llama, heavy injection significantly shifts all three tasks. On Gemma, the UBI policy task and the deployment gate replicate. The access controls task on Gemma doesn't shift significantly — consistent with the pattern that the attack requires a movable default, and Gemma may already hold a stronger prior on that specific task.

But the headline is that an agent governing a deployment approval gate moved under feed injection. That's not a soft preference. The attack surface here isn't limited to opinion-like decisions where some drift seems tolerable — it extends to the kind of binary approvals that agentic pipelines are increasingly being asked to make.

---

## Defenses Work Unevenly — and Probes Mislead

Two defenses were tested: balanced exposure, which caps adversarial posts at two of five per batch, and ranking disclosure, which tells the agent that posts are ranked by engagement rather than presented neutrally. On Llama, both restore remote-first recommendations relative to the heavy-attack condition — a meaningful result. On Gemma, neither works: both defense conditions leave the model locked at hybrid, matching the heavy-attack arm rather than the baseline.

That asymmetry matters for anyone thinking about mitigations. A defense validated on one model in this class doesn't transfer automatically to another, even when both are susceptible to the underlying attack.

The probe results carry a separate warning. Linear probes on residual-stream activations appeared to recover feed policy at 70–80% balanced accuracy — which would suggest the model's internal state encodes what kind of feed it's been exposed to. But that figure came from naive random cross-validation. Group-aware splits — leaving out entire runs rather than individual turns — cut the accuracy by more than 30 percentage points. A visible-history baseline using plain features of the conversation often matched or exceeded the activation probe under the harder evaluation. The apparent mechanistic signal was mostly leakage from the conversation history the probe could already see.

That's a methodological point worth carrying into any multi-turn agent interpretability work: turn-level random splits will inflate probe accuracy, and the right comparison is always a baseline that uses only what's already visible.

---

## What This Means for Agentic Pipelines

The practical implication is specific: any pipeline that routes ranked social or user-generated content to a small open-weight LLM before a decision step should be treated as an attack surface. The attacker doesn't need system access. They need enough posts in the feed, above the two-in-five threshold, pushing in the right direction.

The model selection matters more than it might seem. Deploying a model that's already saturated near a safe default — like the Qwen models near hybrid — provides incidental protection, but only because there's no default to move. That's not a designed defense. A model with a strong, contestable prior on a security-relevant decision is the vulnerable configuration, and Llama's unanimous remote-first baseline is exactly that shape.

For teams building agentic systems that consume feeds: balanced exposure caps are a reasonable starting point for Llama-class models, but don't assume they generalize. Test defenses on the specific model and decision type in your pipeline. And treat activation probe results from multi-turn settings with skepticism until group-aware evaluation confirms them — the 30-percentage-point inflation gap is large enough to make a probe look useful when it isn't.

*Usman, R. M. (2026). Adversarial Feeds Steer LLM Agent Decisions Against Their Defaults. arXiv:2606.00914*