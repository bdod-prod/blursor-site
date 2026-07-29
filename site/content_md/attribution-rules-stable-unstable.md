# Attribution rules can make GenAI publisher ecosystems stable or unstable

In this paper, the important shift is not in how attribution is scored, but in what that scoring rule does to publisher behavior over time. The authors model a GenAI ecosystem as a strategic game: publishers compete for attribution-based exposure, then learn by making better responses to what the platform rewards.

That framing turns attribution into a dynamic systems problem. A rule can look attractive if it improves short-term relevance, yet still create an ecosystem where publishers keep chasing utility in ways that never settle. The paper’s point is that convergence to equilibrium is not automatic; it depends on the mechanism.

The clearest anchor is simple: in their stability analysis, softmax and linear attribution reach a convergence ratio of 1, while argmax-style winner-takes-all does not.

---

## The model treats attribution as the payoff publishers learn from

The paper’s model is built around a familiar platform problem, but it asks a less familiar question. Instead of only asking which documents a system should cite, it asks what happens when publishers can react to those citations and adjust their content strategically.

Publishers and questions are embedded as vectors in the same space, and the platform generates a response from the current strategy profile. Users then see both the generated response and the attributed documents. That matters because attribution is not just an explanation layer here — it is the signal that shapes publisher utility.

Learning is modeled with better-response dynamics. At each step, a publisher changes content only if she can improve utility by more than a threshold. That makes the ecosystem legible as an evolving game, where the main outcome is not a single ranking but whether the system settles down at all.

---

## Winner-takes-all can improve relevance while making the ecosystem brittle

The paper’s sharpest warning is about argmax attribution. In the authors’ setup, it gives the best short-term relevance for attribution, but it also induces unstable ecosystems where dynamics may not converge.

That trade-off is easy to miss if you only look at immediate output quality. A winner-takes-all mechanism can feel clean because it concentrates credit on the most relevant document. But from the publisher’s side, it creates a harder learning problem: everyone has an incentive to crowd toward the same narrow signal, and the resulting game can fail to settle.

The paper also shows a stronger failure mode. Observation 1 says that for both cases considered there exists a set of games in which any instance has no pure-strategy Nash equilibrium. If there is no equilibrium to converge to, better-response learning has no fixed point to land on.

---

## Potential-game structure is the line between tractable and unstable learning

The paper uses potential games as the mathematical test for whether learning dynamics are likely to behave. If the induced game is an exact potential game, then better-response updates become much more tractable, because individual improvement steps line up with a global objective.

That is where the linear attribution result matters. Theorem 3 shows that for mechanisms with context size and the linear attribution function, the induced game is an exact potential game. In plain terms, this gives the system a structure that can support convergence.

But the paper is careful not to overgeneralize from that one success. Theorem 4 shows that mechanisms with context size do not necessarily induce potential games, and Appendix A.2 extends the warning: any proportional attribution function, including softmax, does not induce a potential game. So even when a rule looks smooth or well-behaved, the induced learning dynamics can still lack the structure you would want for stability.

---

## Stability, publisher welfare, and user welfare do not move together

The simulations make the trade-off concrete. The authors run 500 simulations and report bootstrap confidence intervals at 95%, then compare how different attribution rules affect stability and welfare.

The main result is that the best mechanism depends on what you mean by social welfare. The paper does not find a single attribution rule that dominates on every axis. Instead, it finds an interplay among stability, publisher welfare, and user welfare, which means a mechanism can be good for one objective while being worse for another.

The simulations also back up the theory on convergence. In Section 6.2, the dynamics induced by softmax converge in all cases, and Appendix E reports a convergence ratio of 1 for both softmax and linear attribution. But that should not be read as a blank endorsement of smooth attribution. The paper’s broader point is that convergence, relevance, and welfare can pull in different directions.

---

## What this means for platform design

If you design attribution mechanisms for GenAI systems, this paper says you should treat stability as a first-class objective, not a side effect. A rule that improves top-line relevance or makes attribution look cleaner can still produce a learning dynamic that never settles, or one that settles only under narrow conditions.

The practical move is to evaluate attribution rules the way you would evaluate any incentive mechanism: ask what game they induce, whether that game has equilibrium structure, and how the resulting dynamics behave under strategic adaptation. That is the part most platform teams skip when they optimize only for immediate quality metrics.

The paper’s deeper lesson is that “better attribution” is not a single thing. If you care about long-run ecosystem health, you need to choose between stability and welfare trade-offs explicitly, because the optimal rule depends on how you weight the two.

*Dekel, S., Madmon, O., Tennenholtz, M., & Kurland, O. (2026). Learning Dynamics of Strategic Publishers in Generative AI Ecosystems. arXiv:2607.25514*