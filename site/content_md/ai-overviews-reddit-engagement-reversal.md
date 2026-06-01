# AI Overviews Sent Users to Reddit. AI Mode Is Taking Them Back.

When Google rolled out AI Overviews internationally in August 2024, the conventional worry was that AI-generated summaries would drain traffic from the open web. For Reddit, the opposite happened — at least at first. A new study using a 547-day panel of subreddit activity finds that AI Overviews drove a 12% increase in engagement on communities eligible for AI summary treatment, with the gains concentrated in exactly the places you'd expect: communities built around opinions, advice, and personal experience.

The follow-on finding is the one that should get more attention. When Google launched AI Mode — a conversational interface layered on top of AI Overviews — the engagement premium for those experience-based communities fell by 59%. The same capability that sent users to Reddit for human discussion turned out, once it got more conversational, to be good enough at simulating that discussion that users stopped going.

The paper's anchoring number is that 12% lift. It's modest enough to be credible and large enough to matter for communities that depend on fresh participation.

---

## The Natural Experiment: SFW vs. NSFW as Treatment and Control

The study's design turns on a quirk of Google's content moderation policy: AI Overviews don't surface NSFW Reddit content. That creates a clean treatment boundary. SFW subreddits can appear in AI Overview summaries and receive the referral traffic that comes with them; NSFW subreddits cannot. The researchers use this as a difference-in-differences setup, comparing engagement trends across SFW (treated) and NSFW (control) communities before and after the August 15, 2024 international rollout.

A manual audit of 1,000 searches — 500 SFW post titles and 500 NSFW post titles entered into Google — confirmed the policy holds in practice. 57% of SFW queries triggered an AI Overview; 38% of NSFW queries did. None of the NSFW-triggered summaries referenced NSFW content. The control group is genuinely untreated.

The panel runs from January 1, 2024 through June 30, 2025, with subreddit and day fixed effects absorbing community-level differences and day-to-day noise. For the AI Mode analysis, the panel extends through December 2025. One important caveat: the U.S. rollout happened on May 14, 2024, meaning four months of the pre-treatment window already had partial U.S. exposure. The authors treat this as making their estimates conservative lower bounds rather than overestimates.

The SFW and NSFW populations are also genuinely separate. About 98% of Reddit authors who participate in NSFW communities don't appear in SFW communities, so the treatment and control groups aren't drawing from the same pool of users.

---

## AI Overviews Lifted Engagement — But Only at the Extensive Margin

After the international rollout, daily comments in SFW subreddits rose 12.0% relative to NSFW subreddits, and unique comment authors rose 12.3%. Those two figures being nearly identical is itself informative: the growth came from more people showing up, not from existing members posting more. AI Overviews pulled in new participants rather than activating the existing base.

The distribution of gains is uneven in a revealing way. The largest subreddits — top subscriber quartile — saw comments rise about 10% and comment authors about 9%. Mid-sized communities in the second-smallest quartile saw comments rise 54% and comment authors rise 75%. In absolute terms, big communities still account for most of the new activity. But proportionally, AI Overviews redirected attention toward communities that weren't already dominant.

This pattern makes sense if you think about how AI Overviews work as a discovery layer. A user searching for something specific gets a summary and, alongside it, a pointer to a Reddit thread that goes deeper. For large, well-known subreddits, that pointer is redundant — users already knew where to find them. For smaller communities covering niche topics, the AI Overview may be the first time many users encounter them at all.

---

## Experience Goods Drive the Effect — Opinions, Advice, and Personal Stories

The researchers classify subreddits using a search-vs-experience taxonomy drawn from Nelson (1970): search goods are communities where the value is factual and verifiable before you engage; experience goods are communities where the value comes from participating — reading opinions, getting advice, hearing personal stories. Google's Gemini classified 56.6% of subreddits as search goods and 43.4% as experience goods, with 81.3% of classifications receiving high-confidence scores.

A triple-difference model — comparing SFW vs. NSFW, before vs. after, and experience vs. search goods — shows the engagement gains are 2.3 times larger for comments and 2.8 times larger for comment authors in experience-based communities than in fact-based ones. The mechanism is intuitive: if a user wants to know a fact, the AI Overview can just answer it, and they never need to click through. If a user wants to know what people actually think about something, or wants advice from people who've been through it, the AI Overview surfaces the community and sends them there to find out.

This is the core dynamic the paper is documenting: AI search doesn't uniformly suppress human-generated content. It sorts it. Content that AI can replicate gets absorbed into the summary; content that requires human experience gets amplified, at least initially.

---

## AI Mode Reverses the Gains for Experiential Content

The more consequential finding comes from extending the panel through December 2025 and adding AI Mode — Google's conversational interface that lets users interact directly with the AI rather than just reading a summary — as a second treatment.

After AI Mode launched, the experience-good engagement premium collapsed. For comment authors, it fell 59%. For comments, it turned slightly negative. The communities that had benefited most from AI Overviews — the advice-giving, opinion-sharing, story-telling subreddits — were the ones most exposed when the AI got better at conversation.

The substitution logic is direct: AI Overviews sent users to Reddit because the AI couldn't fully replicate what those communities offered. AI Mode narrowed that gap for conversational and advice-driven content. Users who previously needed a human community to talk through a decision or get a recommendation could now get something close enough from the AI itself.

The post-AI-Mode window is still limited, and whether the attenuation stabilizes or continues toward full substitution is genuinely unknown. But the direction is clear, and the speed of the reversal — most of the experience-good premium erased within the observation window — suggests the substitution effect isn't marginal.

---

## What This Means for Content Strategy

The practical read here is that the "AI search is good for human communities" story was always conditional. It was true when AI could surface communities but couldn't replace them. That condition is weakening.

For communities and platforms built around experiential content, the window of AI-search-driven discovery may be narrowing. The subreddits that gained the most from AI Overviews — mid-sized, experience-oriented, previously underexplored — are the same ones most exposed to AI Mode substitution. The traffic dividend was real, but it was tied to a capability gap that AI is actively closing.

For content strategists thinking about AI search visibility, the implication is to focus less on whether AI surfaces your content and more on what the AI can't replicate about it. Factual content was always going to get absorbed into summaries. Experiential content had a temporary advantage. The question now is whether there's a form of human-generated content — sufficiently specific, sufficiently relational, sufficiently tied to real identity and accountability — that conversational AI still can't substitute. The evidence here suggests that gap exists but is shrinking faster than most people assumed.

*Zhang, P., Cui, R., & Zhang, D. J. (2026). The Impact of AI Search on the Online Content Ecosystem: Evidence from Google and Reddit. arXiv:2605.16428*