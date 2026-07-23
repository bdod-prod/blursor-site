# DRNoise shows how one plausible false document can knock deep research agents off course

A lot of agent evaluation assumes the hard part is finding enough evidence. DRNoise tests something narrower and, for deployed systems, more uncomfortable: what happens when the evidence is already sufficient, but one ordinary-looking document says the wrong thing directly.

That setup matters because it separates retrieval coverage from trust behavior. The clean corpus contains the indirect evidence needed to derive the answer. The noisy corpus is identical except for one added false summary that states a conflicting answer plainly. In other words, the benchmark is not asking whether an agent can eventually stumble onto the truth. It is asking whether it can stay anchored to the derivation when a plausible direct claim shows up.

66–88 percentage points.

---

## What DRNoise measures: answer recovery under misleading evidence

DRNoise is a 100-task benchmark built for answer recovery under misleading evidence. It spans 10 families of evidence operations, with 10 tasks in each family, so the evaluation is broad enough to show whether the failure is tied to one kind of reasoning or to the general way agents handle conflict.

Each task has one gold answer, but that answer is not treated as authoritative because some document says so. It is defined by derivability from indirect records. The benchmark instance includes two corroborating indirect evidence chains, and the noisy condition adds one ordinary-looking document that directly states a conflicting answer.

That design is the important part. It means the benchmark is not measuring whether the model can memorize a trusted source hierarchy. It is measuring whether the agent can recover the answer from distributed evidence and resist being pulled off course by a direct contradiction that looks easier to accept.

The corpus is also large enough to make the intervention visible. Across the benchmark, there are 1,750 task-specific documents: 1,650 indirect evidence documents and 100 direct false summaries.

---

## How the evaluation is run: paired clean and noisy conditions with the same agent harness

All models are evaluated on the same BrowseComp-Plus search-agent framework, using a ReAct-style agent with a single search interface. Every model runs on all 100 tasks in both clean and noisy conditions, so the paper can compare each system against itself rather than against a different retrieval setup.

The search budget is generous enough that failure is not just a matter of giving up too early. Each run can issue searches and retrieve documents for up to 100 iterations, retrieving the top 5 documents per search and using 512-token snippets from retrieved content.

That matters because the paper is not trying to show that one configuration is worse than another. It is trying to isolate the effect of one misleading document while holding the rest of the search environment fixed.

The evaluation also separates two related but different notions of failure. The paper reports accuracy, and it also reports conditional deference. Conditional deference is stricter: it is computed only on tasks the model solved when the misleading document was absent, and it only counts noisy answers that match the benchmark’s designated false value.

---

## One false direct claim causes a large accuracy collapse

The headline result is blunt: across agents that do well on clean tasks, adding one plausible direct-conflict document drops accuracy by 66–88 percentage points.

The strongest clean-task models still look strong before noise is introduced. Gemini 3.5 Flash reaches 96% clean accuracy, and DeepSeek V4 Flash reaches 89%. MiMo v2.5 and GPT-5.4 sit near 82%. But once the misleading document appears, all four lose most of that advantage.

That pattern matters more than the raw drop alone. It says the failure is not limited to weak systems or to systems that are already missing the evidence. These are agents that can solve the task when the corpus is clean, and then stop solving it when one plausible contradiction is added.

In practical terms, the problem is not just retrieval quality. It is what the agent does after retrieval exposes conflict.

---

## Where it breaks: verification inertia after conflict appears

The paper’s trace analysis points to verification inertia as the dominant failure mode. The agent encounters evidence that should make it re-check the answer, but it keeps behaving as if the originally supported answer is still the right one to pursue or defend.

That shows up in retrieval behavior too. The fraction of runs that retrieve a complete evidence route falls from 45% in clean conditions to 16% in noisy conditions. So the misleading document is not only changing the final answer; it is changing whether the agent completes the evidence path at all.

The important nuance is that the benchmark is not dominated by a single easy or fragile family. The date and cost families have lower clean ceilings for some models, and the paper treats them that way. They do not drive the main conclusion. The effect spans the task families.

So the takeaway is not “agents fail on hard numeric questions.” It is “agents can become less willing to finish verification once a direct contradiction enters the search space.”

---

## What to do with this if you are building or deploying agents

If your agent is going to operate in messy environments, DRNoise says you should assume a single plausible false claim can cause a disproportionate failure. That makes passive retrieval pipelines risky when the downstream behavior treats the first good-looking answer as settled.

The practical response is to build for re-verification, not just for retrieval. A useful agent should be forced to revisit its evidence when it finds a direct contradiction, rather than drifting into confirmation of the first coherent story it assembled. That can mean explicit conflict checks, answer-conditioned re-querying, or a second pass that looks for derivational support instead of surface agreement.

The benchmark also suggests a useful evaluation habit: test paired clean and noisy conditions, not just aggregate accuracy. A system that looks strong in a clean corpus may still be brittle when a single misleading summary appears, and that brittleness is easy to miss if you only measure average task success.

If you care about search visibility, content strategy, or agent reliability, the lesson is simple: a believable false document is enough to expose whether the system is verifying evidence or merely following the path of least resistance.

*Nie, J., Yang, Z., Tang, Z., Zhang, Y., Chu, X., Tian, X., & Han, B. (2026). DRNoise: Benchmarking Deep Research Agents in Misleading Evidence Environments. arXiv:2607.17291*