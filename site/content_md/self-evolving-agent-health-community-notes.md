# An LLM Agent That Learns From Its Own Mistakes Beats Human Fact-Checkers on Health Misinformation 89% of the Time

Community Notes — X's crowd-sourced correction system — has a structural problem that no amount of volunteer effort can fix. The crowd has to converge on a note before it becomes visible, and that convergence takes time. For health misinformation, the window between a post going viral and a correction appearing is typically over 13 hours. Most corrections never appear at all.

A new paper from the National University of Singapore introduces EvoNote, an LLM agent that generates health Community Notes by accumulating lessons from its own past correction episodes. The system doesn't just retrieve similar cases — it distills what went wrong and right in each episode into reusable, phase-tagged memory items, then draws on those items in future corrections. The result is a system that improves continuously as it processes more cases.

The anchoring number: only 10.1% of health-related Community Notes in the wild are ultimately rated Helpful by the crowd — out of 48,295 notes analyzed.

---

## The Human Note Pipeline Is Slow and Mostly Unhelpful

The crowd-sourced model has two compounding failure modes. First, it's slow: the median time from post creation to a first note is 6.1–7.1 hours, and then another 6.4–7.3 hours pass before the crowd reaches a helpfulness verdict. By the time a correction is visible, the original post has already done most of its damage.

Second, most corrections never reach a verdict at all. Of 48,295 health-related notes collected through October 2025, only 13.12% received any crowd-derived helpfulness label. The remaining 86.88% sit in a permanent "Needs More Ratings" limbo — technically present but invisible to readers.

Even the notes that do get rated aren't reliably good. When evaluated under a hierarchical judge that checks evidence relevance, evidence correctness, and communication quality separately, only 38.33% of human-written notes pass. Crowd-rated helpfulness, it turns out, doesn't catch systematic evidence failures — notes can earn community approval while citing weak or tangentially relevant sources.

---

## How EvoNote Accumulates and Reuses Correction Experience

EvoNote runs four coordinated agents in a closed loop: a Claim Analyzer, a Note Writer, a Social Utility Judge, and a Memory Evolver. After each correction episode, the Memory Evolver distills what happened into structured memory items — each carrying a Trigger (what situation prompted the action), an ActionStrategy (what the agent did), and a Phase label (which step in the pipeline the lesson belongs to). On the next similar case, the system retrieves only the items relevant to the current phase rather than replaying full past trajectories.

This design matters because health misinformation has recurring patterns. A post making an unsupported claim about a medical mechanism will appear dozens of times in different forms. If an agent successfully corrects one instance, the lessons from that correction — which sources were authoritative, how to frame the rebuttal clearly — should transfer to the next. Without cross-episode memory, each correction starts from scratch.

The paper illustrates the cost of this gap directly. A timeline analysis shows that an earlier helpful note for a medical mechanism overclaim contained reusable lessons that later notes for structurally similar posts never accessed. Those later notes were rated Not Helpful. The lesson existed in the system's history; it just wasn't being retrieved.

Across 1,200 episodes in the MM-HealthCN benchmark, EvoNote accumulated 4,277 memory items. Ablations confirm that ongoing accumulation matters: a frozen memory bank — loaded once and never updated — achieves a 84.75% win rate, while the continuously evolving version reaches 89.59%. The gap isn't enormous, but it's consistent, and it grows as the system processes more cases.

---

## Performance Against Human Notes and Competing Agents

EvoNote is preferred over human-written notes in 89.6% of pairwise comparisons, under a GPT-4.1-based judge validated at 98% agreement with human majority votes on 100 sampled pairs. That preference holds even when the human note is already good: in cases where human notes pass the hierarchical quality judge, EvoNote still wins the pairwise comparison 74.1% of the time. When human notes fail the judge, EvoNote produces a helpful alternative in 77.0% of those cases.

On a separate set of 300 recent posts that never received a crowd verdict — the Needs More Ratings cases that represent the bulk of the backlog — EvoNote produces helpful notes 82.0% of the time.

The speed advantage is substantial. EvoNote takes a mean of 112.6 seconds per case on a single H200 GPU. DeepResearch, a strong agentic baseline, takes 153.0 seconds and achieves a 78.09% win rate. ReMem, which asks the agent to infer reusable lessons on the fly rather than storing them explicitly, takes 118.3 seconds and reaches 74.50%. EvoNote is faster than both and more accurate than either — the structured memory retrieval is doing real work, not just adding overhead.

On evidence quality specifically, EvoNote leads across all five measured dimensions: source quality (72.93), domain diversity (93.32), semantic diversity (22.56), average URLs cited (1.97), and multi-source rate (68.92%). The notes aren't just preferred stylistically — they're grounded in broader, higher-quality evidence.

---

## Multimodal Handling and Where the System Breaks

Health misinformation on X isn't just text. EvoNote handles image and video posts through a caption-based preprocessing step — Nanonets Docstrange for images, Gemini-2.5-Flash for video — rather than feeding visual content directly to the language model. Caption quality validation on 200 sampled instances showed majority-vote accuracy of 0.95 for images and 0.96 for video, suggesting the preprocessing is reliable enough to support downstream reasoning.

The alternative approach — direct visual language model inference using MedGemma-27B — failed badly. Of 400 image cases tested, 63 runs remained invalid even after repair heuristics, producing ungrounded answers, schema mismatches, or timeouts. Even the valid outputs underperformed the caption-based pipeline and fell below the no-memory LLM baseline. The lesson is that multimodal grounding requires explicit pipeline design; a capable vision model alone isn't sufficient.

The deeper risk is memory propagation. EvoNote learns from its own trajectories, which means a flawed correction — one that cites a poor source or misrepresents a mechanism — can generate a memory item that influences future corrections. The authors flag this directly: memory auditing, decay, and deletion are unresolved requirements for any real deployment. A system that improves through experience can also entrench its mistakes through experience. There's also an automation bias concern specific to health contexts: notes that look authoritative and well-sourced may be trusted even when the underlying evidence is incomplete or selectively cited.

---

## What This Means for Health Correction at Scale

The practical implication isn't that EvoNote should replace human annotators — the paper doesn't claim that, and the caveats around memory propagation and automation bias are real. What it does show is that the current pipeline's failure mode is structural, not just a resource problem. Throwing more volunteers at Community Notes won't fix a system where 86.88% of corrections stall unresolved and the median correction takes 13 hours to become visible.

For teams working on health misinformation infrastructure, the more actionable finding is the memory architecture itself. Phase-specific, action-level memory items that accumulate across episodes outperform both full-trajectory retrieval and on-the-fly lesson inference — and they do it faster. If you're building correction or fact-checking pipelines, the design question isn't whether to use retrieval-augmented generation, but *what unit of experience* to retrieve. EvoNote's answer — structured lessons tied to specific workflow phases, not raw past outputs — is worth testing in other domains.

The system currently handles English health claims only, and the authors note that political, financial, or sociocultural misinformation may require different utility criteria entirely. But the core mechanism — an agent that gets better at a task by distilling its own correction history — is domain-agnostic. The health domain just happens to be where the need is most acute and the human pipeline most visibly broken.

*Fu, Z., Li, F., Gu, J., Wang, H., Nakov, P., Hooi, B., Kan, M., & Wu, J. (2026). Better with Experience: Self-Evolving LLM Agents for Evidence-Grounded Health Community Notes. arXiv:2606.02215*