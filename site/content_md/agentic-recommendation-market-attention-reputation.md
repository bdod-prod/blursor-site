# When users ask first, recommendation markets stop competing on catalog size and start competing on explanation credibility

Agentic recommendation markets flip the usual order of operations. The user states a need first, and platforms compete to be shortlisted instead of waiting to be chosen from a fixed catalog. That sounds like a small interface change, but the paper shows it changes the market design in a more structural way: it widens who can enter the competition, then shifts the real bottleneck to the user agent’s attention.

That distinction matters because wider access does not automatically mean better outcomes. Cross-platform querying brings far more candidates into view, but once the shortlist is still limited, the system has to decide which platform gets attention, and on what basis. In the experiments here, the answer is not item availability alone. It is the credibility of the platform’s explanation, and whether the system has any record of whether that platform’s past claims actually held up.

The anchor number is 73–78%.

---

## What an agentic recommendation market changes

The basic design change is simple: the user declares the need before choosing a platform. That reverses the usual platform-centric flow, where the platform’s catalog is the starting point and the user adapts to it. In the paper’s terms, platforms now compete for the user agent’s attention after the need is known.

That change widens the set of contenders. Relative to platform precommitment, the target reaches the candidate pool in roughly one fifth of episodes under platform-centric recommendation and nearly nine tenths under cross-platform querying. So the market is no longer gated mainly by which catalog the user happened to enter.

But the paper’s bigger point is that this does not eliminate scarcity. It changes where scarcity lives. Once candidate access expands, the scarce resource becomes the user agent’s attention — what gets shortlisted, what gets examined, and what gets ignored.

---

## Cross-platform querying widens reach, then attention still concentrates

Cross-platform querying gives the target a much better chance of entering the candidate pool. Increasing shortlist capacity from 1 to 6 raises target shortlist inclusion by about 37.7 percentage points. That is the cleanest sign that broader participation really does expand reach.

But the downstream picture is less intuitive. As the market expands, target shortlist inclusion and Target Purchase fall by about 13.6 and 13.0 points, respectively. So the wider market gives users more options, but it does not guarantee that the target survives the final attention bottleneck.

This is the important practical shift: once the market is open, more supply can create more competition for the shortlist rather than more certainty for the user. A larger candidate pool makes selection harder, not easier, unless the system has a credible way to sort claims before attention is spent.

---

## From item competition to explanation competition

Once access is limited by attention, platform presentation becomes part of the competition. The paper makes that point explicitly: the platform is no longer just competing with items; it is competing through the explanation attached to the item.

That is where the reputation mechanism matters. In NoRep, the user agent ranks current proposals without platform-specific outcome histories. It sees the present pitch, but not whether that platform’s earlier claims were borne out by what happened after purchase.

In that stateless setting, explanation style can dominate. With equal platform supply from all three policy families, Exaggeration captures 73–78% of Top-1 attention under NoRep. That is a striking result because it suggests the shortlist mechanism is vulnerable to persuasive presentation when nothing ties claims back to outcomes.

---

## Local reputation reallocates attention toward trustworthy platforms

LocalRep changes the basis of attention allocation. Instead of treating each proposal as isolated, it retains and consults user-specific records of whether a platform’s earlier claims were borne out by post-purchase feedback. In other words, it links current claims to demonstrated reliability.

That shift produces a big change in where Top-1 attention lands. LocalRep lowers Exaggeration’s share from 73–78% to 36–41%, redirecting attention toward Balanced and Strict platforms. The mechanism is not subtle: when the system can consult outcome-grounded history, exaggeration stops being the dominant strategy.

The paper also reports that LocalRep raises macro Target Purchase by about 5.8, 3.6, and 2.3 percentage points across the mixed markets it studies. So the attention shift is not just cosmetic. It changes what users end up buying.

The caveat is that this only works when the system can actually observe and use outcome feedback. If feedback is delayed, sparse, noisy, or misattributed, the reputation signal weakens fast.

---

## What to do about it

If you are designing an agentic recommendation flow, the lesson is not “add more candidates.” The lesson is to make sure shortlist attention is grounded in outcomes, not just in the persuasiveness of the latest explanation.

That means two things in practice. First, you need some form of user-specific accountability that links claims to what happened after the purchase. Second, you need to treat uncertainty honestly, because the paper is careful to note that selective evidence can depend on earlier exposure and may vary across users, contexts, and time.

The real design risk is that a market with better reach but no accountability will reward the best-sounding platform, not the most reliable one. In the short run, LocalRep shows that outcome-grounded reputation can correct that tilt. In deployment, the harder task is preserving that effect when user priors, platform participation, catalog overlap, and learning dynamics all start moving at once.

*Hong, D., Zheng, K., Li, Q., Zhang, J., Jiang, J., & Wang, H. (2026). The User Asks, Platforms Compete: How Agentic Recommendation Markets Take Shape. arXiv:2607.25253*