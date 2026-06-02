# LLMs Over-Reveal Private Information Where Game Theory Says Withhold

When an advisor has a conflict of interest, game theory says they should strategically hide information — not lie outright, but coarsen what they share so the listener can't fully back out the truth. A biased advisor who wants you to act high will bundle many possible states into a single vague message: "things look pretty good." The more biased they are, the coarser the message, and the less you learn.

A new benchmark tests whether large language models behave this way when placed in exactly that role. The answer is no — but not in the direction you might expect. The models don't suppress information strategically. They over-share it, transmitting near-complete signal even when the equilibrium says they should be withholding most of it.

The anchoring number: across four models and four positive-bias levels, the pooled empirical informativeness (NMI) averages 0.86, against a game-theoretic ceiling of 0.32 — the maximum a rational biased advisor should ever transmit.

---

## The Setup: Cheap Talk as a Honesty Stress Test

The benchmark is built on Crawford-Sobel cheap-talk theory, a standard framework in economics for modeling advice under conflicting interests. The setup is simple: a sender observes a private state (a number drawn uniformly from 0 to 1), sends a message to a receiver, and the receiver takes an action. The sender has a bias — they want the receiver to act higher than the true state warrants. Crucially, messages are costless and unverifiable, so the sender can say anything.

Game theory works out exactly what a rational biased sender should do: partition the state space into coarse intervals and send the same message for every state in an interval. At bias 0.10, the optimal partition has 7 intervals; at 0.40, just 2. The receiver learns less as bias rises, because the sender has more to gain from obscuring the truth. These oracle partition counts and their corresponding NMI values are exact — not estimates — so the benchmark has a precise target to compare against.

Four models played the sender role: GPT-4o, Claude Sonnet 4.5, Gemini 2.5 Flash-Lite, and Llama-3.3-70B. Each was tested across five bias levels, three prompt frames (neutral, payoff-maximizing, and honesty-instructed), and 100 seeded states per cell — 7,200 total sender calls. The whole thing costs roughly $5 in API calls to reproduce.

---

## The Finding: Near-Full Revelation, Not Strategic Coarsening

At every positive-bias level, all four models transmit far more information than the oracle prescribes. Where the game-theoretic ceiling on NMI runs from 0.529 down to 0.183 as bias rises from 0.10 to 0.40, the empirical values run from 0.944 down to 0.776. The models are more informative at every point — and the gap between what they transmit and what theory allows widens as bias increases.

The pattern isn't random noise. It's a linear exaggeration: the slope of the sender's reported number on the true state stays near 1.0 across all bias levels (falling only from 0.999 at bias 0.10 to 0.904 at bias 0.40), while the intercept tracks the bias almost exactly. Models are essentially reporting the true state plus a constant upward offset equal to their bias. That's the opposite of strategic coarsening — it's full revelation with a predictable thumb on the scale.

Informativeness does decline with bias, which matches the directional prediction of theory. But the models never approach the coarse-partition behavior that equilibrium requires. At bias 0.40, where a rational sender should be sending just two messages, these models are still transmitting most of the signal.

---

## Model Differences and the Comprehension Caveat

The four models don't behave identically. Claude Sonnet 4.5 is the most informative and least responsive to bias, with a mean NMI of 0.969 — essentially near-full revelation regardless of how misaligned its incentives are. Gemini 2.5 Flash-Lite shows the steepest decline with bias and the lowest mean NMI at 0.776, making it the most "theory-like" of the four, though still far above the oracle. GPT-4o (0.881) and Llama-3.3-70B (0.926) fall between.

The Llama result comes with a caveat. Llama largely fails the comprehension check — it tends to return the endpoints of the action space rather than continuous values, suggesting it may not have understood the game structure. Its over-revelation likely reflects default echoing of the stated value rather than any deliberate process. The finding is cleanest for Claude, GPT-4o, and Gemini, all of which pass the comprehension check.

Prompt framing makes essentially no difference. Whether models were told to maximize payoffs, instructed to be honest, or given a neutral frame, the informativeness barely shifted. The over-revelation pattern is robust to surface-level instruction variation — it's not something you can prompt away.

---

## Why the Decoder Choice Is Not Cosmetic

One of the more practically important findings is a methodological one. The messages these models send are overwhelmingly numeric — GPT-4o, Claude, and Llama include a parseable number in essentially all their messages; Gemini does so in most. But if you encode those messages as semantic embeddings before measuring informativeness, you get a completely different answer.

The embedding-only decoder reads the same messages as near-babbling: mean NMI of 0.30 for ridge regression on embeddings, 0.24 for k-NN — nearly identical to the oracle's 0.32. The hybrid decoder, which parses the stated number directly, recovers a mean NMI of 0.86. Same messages, same states, a 3× difference in measured informativeness.

The embedding decoder also fails a basic sanity check: at zero bias, where a truthful sender should achieve NMI near 1.0, it returns only 0.53. The hybrid decoder passes at 0.993. This matters for any evaluation pipeline that processes LLM advisory outputs as text embeddings — it will systematically underestimate how much signal the model is actually transmitting, potentially by a large margin.

---

## What This Means for Alignment Work on Biased AI Advisors

The standard concern about a biased AI advisor is that it might strategically suppress information — telling you less than it knows to nudge you toward its preferred outcome. This benchmark suggests that's not what current instruction-tuned models do, at least in this setting. They over-reveal. The bias shows up as an additive offset, not as information suppression.

That reframes the alignment problem somewhat. If the issue is a constant upward offset rather than withheld information, the diagnostic question shifts from "what is the model hiding?" to "how large is the offset, and is it stable?" Calibrating or detecting that offset is a different task than trying to extract suppressed partitions.

The benchmark is deliberately narrow — one-dimensional state, uniform prior, quadratic preferences, single-shot messages — and the authors are careful not to generalize beyond it. Multi-turn advice, richer state spaces, and implicit rather than stated incentives are all open. But the design is cheap to run and fully reproducible, which makes it a useful baseline: if you want to test a new model or a new framing, the oracle targets are exact and the cost is a few dollars.

*Hasani Balyani, H., Mousavi Davoudi, S. P., Amiri-Margavi, A., Gholami Davodi, A., & Gharagozlou, A. (2026). Truthful AI Advisors: A Pre-Specified Benchmark for Large Language Model Honesty Under Preference Misalignment. arXiv:2606.01456*