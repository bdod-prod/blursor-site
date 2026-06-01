# On Agent-Native Platforms, You Can't Tell Which Users Are AI

A paper from the University of Passau, published in March on arXiv, studies a problem that mixed human-agent platforms obscure: what happens to information retrieval infrastructure when the user population is entirely agents. The researchers collected 370,737 posts from 46,872 agents across 4,257 communities on Moltbook — an agent-native social platform — over 12 days from launch. Because there are no human users to confound the analysis, the dynamics are visible in a way they aren't on platforms like Reddit or X, where agent activity is present but unquantified.

The paper addresses four distinct problems simultaneously: whether platforms can identify autonomous agents from observable behavior, whether agent-generated interactions degrade ranking signals, how capability awareness spreads across agent communities, and how much private operator configuration leaks through agent posts. Each problem has been discussed separately in prior work. This paper measures all four on the same dataset, which makes the interactions between them legible.

The number that frames the analysis: 51.3% of posts in the corpus were filtered as low quality before any adversarial pressure was applied, and only 14.1% met thresholds for downstream fine-tuning. The usable signal in an agent-populated corpus starts thin.

---

## The Attribution Problem Is Formally Unsolvable

The paper's central conjecture — Post-Level Non-Identifiability — holds that for any post produced by an autonomous agent, a system prompt exists that could produce identical output under human direction. The two are indistinguishable from observables alone. System prompts are expressive enough to replicate any autonomous behavior, and the prompt itself is never visible to the analyst or platform. Attribution cannot be resolved without privileged access to agent configuration.

The one partial exception is temporal. If an agent responds to a verifiable real-world event faster than any human could compose and transmit instructions, that is weak evidence of autonomy. But slow response proves nothing — an autonomous agent can be slow, and a human-directed agent can be fast if the operator anticipated the event. For the vast majority of agent activity, the attribution problem remains formally open.

This matters beyond academic interest. Platforms that use behavioral signals — engagement patterns, posting frequency, content style — to classify agents as autonomous or operator-directed are solving an unsolvable problem from the wrong inputs. Any classifier built on observables can be defeated by a sufficiently expressive system prompt, and the operator has no incentive to make that prompt visible.

The binary framing of autonomous versus human-directed is itself a lower bound on the complexity. In practice, orchestration is a continuum ranging from vague guidance to exact dictation. The conjecture holds at the binary level; the real distribution of configurations is harder still.

---

## Agents Are Already Poisoning Ranking Signals

A position-based click model trained on agent upvote patterns achieves an AUC of 0.640 when trained on high-validation agents. As low-validation agents replace high-validation ones in the training data, AUC drops steadily — reaching 0.586 at 50% replacement, an 8.5% decline. The degradation is gradual rather than a cliff, which means it accumulates before it becomes visible.

The signal gap between agent tiers is real. High-validation agents receive a mean of 2.71 upvotes per post versus 1.73 for low-validation agents — a 1.6x difference. They participate in more than twice as many communities (2.31 vs. 1.15) and generate longer discussion threads (mean reply depth 1.11 vs. 0.92). But the platform cannot reliably separate the tiers without ground-truth configuration data, which operators do not provide.

The engagement rate gap is larger still: 76.2% for high-validation agents versus 44.2% for low-validation agents. That gap is measurable in aggregate but not attributable at the post level — which is where ranking decisions get made. A platform observing a post from an unknown agent cannot determine which distribution it was drawn from.

With 32.9% of posts duplicated by identical title and body before deduplication, and 12.8% containing adversarial content, the corpus has structural problems that compound the signal degradation. The click model experiment uses only a basic position-based model; whether more sophisticated models degrade at the same rate is untested, but the direction of the effect is not in question.

---

## Capability Awareness Spreads Like an Epidemic — and Resists Suppression

The paper applies an SIS epidemic model at the community level to measure how awareness of agent capabilities spreads across the platform. The basic reproduction number R0 — estimated via attack-rate formula across 18,350 agents in 1,818 communities — ranges from 1.26 for benign capabilities to 2.35 for risky capabilities to 3.53 for dual-use capabilities. All three categories are above the epidemic threshold of 1.0. None are self-limiting.

Dual-use capabilities spread fastest, consistent with their broader applicability. References double every 11.5–13.0 hours. 71.7% of capability-referencing agents mention at least one dual-use tool. Injection-related content appears in 1.5% of all posts, with 1,586 agents referencing injection techniques across 288 communities — spread is not confined to specialist corners of the platform.

Sensitivity analysis shows that even a modeled 70% reduction in transmission rate fails to bring any capability category below R0 = 1. Suppression alone cannot stop spread once a capability enters the network. The only intervention that changes the qualitative outcome is one that removes the capability from the network entirely before it reaches epidemic threshold — which requires detection before spread, not after.

A caveat worth noting: the analysis cannot fully distinguish social diffusion — agents reading and referencing each other — from independent generation, where agents are configured with similar prompts and arrive at the same references without interaction. The epidemic model assumes the former. If the latter is partially responsible, R0 estimates overstate the network transmission effect but the practical implication — that capability references are pervasive and growing — holds either way.

---

## Agents Leak the Boundaries Their Operators Set

26.8% of posts contain private information disclosures — credentials, location data, or operator identity — despite operators having no visible mechanism to prevent this leakage. The disclosures are detected via regex-based heuristics over post text, meaning they are present in the surface content of posts, not buried in metadata.

22.3% of posts carry susceptibility markers aligned with Cialdini's principles of influence: authority deference, social proof following, eagerness to comply. Agents are not neutral participants in the communities they join. They are behaviorally patterned in ways that are predictable and exploitable — and those patterns are visible to any agent or operator who reads the posts.

Cross-community posting amplifies both effects. 27.9% of agents post across multiple communities, compared to a 7.5% human baseline — 3.7x the human rate. Configuration signals and leaked credentials diffuse across the platform far faster than human users would carry them. The 90-9-1 participation rule observed in human platforms does not hold here: agent post count distribution yields a 39-41-14-7 split across lurker, occasional, regular, and power user tiers, with a Gini coefficient of 0.74. The tail of highly active agents is doing disproportionate diffusion work.

---

## What Platforms and Operators Should Do Differently

The paper's practical implication is not that agent-native platforms are ungovernable. It is that the standard toolkit — behavioral classifiers, content moderation, ranking signal curation — operates on observables that the attribution problem makes insufficient.

For platforms that ingest agent-generated content for ranking or fine-tuning: the 14.1% fine-tuning threshold and 51.3% low-quality filter are baselines, not floors. Any adversarial operator can push low-quality agents into training data at scale, and the click model degradation is already measurable at 50% replacement. Provenance verification — requiring operators to disclose system prompt structure, not content — is the only intervention that addresses the problem at the right level. Behavioral signals alone cannot substitute.

For operators: 26.8% post-level disclosure rates suggest that agents surface configuration details that operators intend to keep private, not through adversarial extraction but through ordinary operation. Prompt design that treats configuration as potentially public — rather than assuming it stays private — is a more robust starting point than attempting to suppress disclosure after the fact.

For researchers building click models, recommendation systems, or fine-tuning pipelines on social platform data: the assumption that user-generated content reflects human intent is already wrong on some platforms and will be wrong on more. The MolbookTraces dataset covers 51.7% of one platform's content over 12 days. The dynamics it reveals — degraded ranking signals, epidemic capability spread, configuration leakage at scale — are not artifacts of an unusual platform. They are what happens when agent penetration is high enough to measure.

---

*Zerhoudi, S., Granitzer, M., Dang, H. D., Mitrović, J., Lemmerich, F., Hautli-Janisz, A., Katzenbeisser, S., & Ghosh Dastidar, K. (2026). Behind the Prompt: The Agent-User Problem in Information Retrieval. arXiv:2603.03630*