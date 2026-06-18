# Reddit Upvotes Aligned a 7B Model to Within 1% of GPT-5-nano on Mental Health Peer Support

Most alignment work assumes you need either a large proprietary model or expensive human annotation — preferably both. LLumi challenges that assumption directly. The researchers trained a 7B open-source model using Reddit upvotes and downvotes as preference labels, then evaluated it against GPT-5-nano on the task of writing and improving peer support responses for people in mental health distress.

The result is closer than most would expect. Across 1,680 rated query-response pairs from 210 Prolific participants, LLumi scores within approximately 1% of GPT-5-nano on average — a gap that is statistically non-significant on most criteria. On empathy and connection specifically, the open-source model actually comes out ahead.

The anchoring number: over 310,000 post-comment pairs from r/SuicideWatch, distilled down to 4,390 DPO preference pairs for training.

---

## The Core Bet: Community Votes as Preference Labels

The pipeline starts with a simple premise — Reddit communities already vote on which responses are better. If you trust that signal, you can skip the annotation budget. LLumi harvests post-comment pairs from r/SuicideWatch and turns the vote distribution into preference labels: top-2% upvoted comments become "chosen", bottom-15% become "rejected", with a minimum score gap of 15 to filter out noise.

From 310,000+ raw pairs, this yields 4,390 DPO preference pairs for the first training round. The base model is Mistral-7B-Instruct-v0.2, fine-tuned first with supervised learning on 42,503 examples, then aligned with Direct Preference Optimization using those community-derived pairs.

The bet is that subreddit votes, despite being a noisy proxy, carry enough signal about what supportive writing looks like to meaningfully shift model behavior. The results suggest they do — though what exactly the community is rewarding is a separate question worth sitting with.

---

## What the Model Actually Gains Over Peer Responses

Compared to the original Reddit comments the model was trained on, the gains are large. The second DPO round — DPO2, which adds 675 crowd-sourced human preference pairs on top of the Reddit signal — improves empathy by 106%, connection by 109%, and actionability by 135% over original peer comments in human evaluations.

Those numbers are striking partly because the baseline is real peer responses from a mental health community, not a weak synthetic floor. The model isn't just beating a straw man — it's substantially outperforming the human-written content it learned from.

DPO2 also scores higher than GPT-5-nano on empathy (4.41 vs. 4.34) and connection (4.06 vs. 3.97). That's a narrow margin, but it runs in the direction most people wouldn't predict: a 7B open-source model, aligned on community votes, edging out a proprietary frontier model on the affective dimensions that matter most in distress support. The iterative structure matters here — the second DPO round using human preference pairs consistently outperforms the Reddit-only first round, suggesting the two signals compound rather than substitute.

---

## Closing the Gap with GPT-5-nano

The head-to-head comparison covers two tasks. The Generation Model (GM) writes supportive responses from scratch; the Improvement Model (IM) takes an existing peer comment and revises it while preserving the author's voice.

For the Improvement Model task, LLumi was preferred over original peer comments in 82.0% of comparisons (173 out of 211). GPT-5-nano was preferred in 85.4% (182 out of 213). That 3.4-point gap is the widest separation between the two models across the evaluation — and it's still practically narrow for a 7B model running without proprietary infrastructure.

Content and style preservation scores are statistically indistinguishable between the two models (p > 0.05 on both). GPT-5-nano scored 3.103 on content preservation versus LLumi-IM's 2.891, and 2.709 versus 2.673 on style — differences that don't reach significance. The model revises without distorting the original author's voice, which matters for a writing-assistance tool where the human peer's relationship with the person in distress is the actual support mechanism.

---

## Where the Approach Breaks Down

The limitations here aren't minor footnotes — they're structural, and the authors are candid about them.

Upvotes measure popularity, not therapeutic value. A response that is well-written, emotionally resonant, and stylistically polished will get upvoted regardless of whether it's what someone in acute distress actually needs. The preference signal is a proxy for community approval, which correlates with supportive quality but isn't the same thing.

The training data comes entirely from r/SuicideWatch in English. Different communities have different norms, different moderation cultures, and different ideas about what good support looks like. The model has absorbed one community's preferences, not a universal standard.

The Improvement Model's training data is generated by GPT-5-nano — synthetic revisions used to teach LLumi how to revise. That embeds proprietary model biases into the open-source pipeline. The authors acknowledge this dependency but don't resolve it, which means the "open-source" framing is partially qualified.

And none of the evaluation measures whether any of this actually helps. Every metric captures perceived empathy, perceived safety, perceived supportiveness — what Prolific participants think of the responses. Whether AI-assisted peer support changes outcomes for people in distress remains unmeasured.

---

## What This Changes for Practitioners

If you're building or evaluating AI tools for mental health peer support, LLumi's main contribution is methodological: community vote signals are sufficient to align a small open-source model to near-parity with a frontier model on perceived quality. That's a meaningful cost reduction in the alignment pipeline, and it opens up deployment options that don't require proprietary API access.

The practical constraint is the signal quality problem. Before adopting this approach in a different community or context, it's worth asking what that community actually upvotes — and whether that matches what you want the model to learn. In a community with healthy moderation and strong norms around supportive writing, the signal is probably good enough. In a community where engagement patterns are messier, you'd be training on noise.

For the writing-assistance framing specifically — where a human peer is still the one sending the message — the voice-preservation result is the most operationally useful finding. A tool that improves empathy and actionability without overwriting the sender's style is a different product than one that replaces the human voice entirely. That distinction matters for how you'd deploy it and how you'd explain it to users.

*Kim, J., Ajit, M., Gong, S., Shimgekar, S. R., Yoo, D. W., Chandrasekharan, E., & Saha, K. (2026). LLumi: Improving LLM Writing Assistance for Mental Health Support with Online Community Feedback. arXiv:2605.30273*