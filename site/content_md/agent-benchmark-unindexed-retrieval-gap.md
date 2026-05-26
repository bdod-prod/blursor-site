# The 47-Point Drop: What Happens When Web Agents Can't Rely on Search Indexes

Most web agent benchmarks measure something narrower than they claim. GAIA, BrowseComp-zh, and similar evaluations present tasks where a capable search engine does the heavy lifting — the agent's job is largely to query, retrieve, and synthesize from indexed results. That's a real skill. It's also not the same skill as navigating the web when indexed results don't exist.

A paper from Huawei Technologies draws that distinction explicitly. The researchers define "unindexed information seeking" (UIS) as tasks where the answer cannot be retrieved via conventional indexed search — requiring agents to crawl, navigate, and synthesize from raw web sources. They built a benchmark to measure it, evaluated the best available systems against it, and trained a purpose-built agent to address it. The results are not encouraging for anyone reading GAIA scores as general web competence.

The anchoring number: Tongyi-DR, which scores 70.9% on GAIA, drops to 23.6% on UIS-QA — a decline of 47.3 percentage points.

---

## The Benchmark Gap Is Not Incremental — It's a Cliff

The performance collapse is consistent across systems, not an artifact of one agent's weaknesses. Memento — which uses O3 and GPT-4.1 as its backbone and scores 79.4% on GAIA — falls to 25.5% on UIS-QA, a decline of 53.9 percentage points. The strongest baseline across all evaluated systems yields only 25.45% on UIS-QA, against GAIA and BrowseComp-zh scores exceeding 70% and 45% respectively.

The gap is large enough to suggest these benchmarks are measuring different things, not different levels of the same thing. GAIA tasks are solvable because search engines surface the relevant content; the agent's contribution is orchestration and synthesis. UIS tasks remove that scaffolding. The agent must locate sources that aren't indexed, crawl them directly, and extract answers from raw page content — a substantially harder problem that current systems handle poorly regardless of their benchmark pedigree.

The authors are careful to note that UIS-QA performance does partially correlate with general capability — systems that score higher on GAIA tend to score relatively higher on UIS-QA as well. The gap isn't a complete disconnect. But a 47-to-54-point drop is not a marginal correction to an otherwise valid signal. It's evidence that benchmark scores are being read as broader claims than the benchmarks support.

---

## How UIS-QA Was Built — and Why It's Hard to Game

The benchmark contains 110 expert-annotated questions — 84 in Chinese, 26 in English — filtered through a three-stage pipeline designed to confirm that indexed search cannot answer them. The stages are: manual Google Search verification by annotators, automatic verification via z.ai, and offline LLM filtering using Deepseek-R1. Questions that any of these methods could answer were excluded.

The small sample constrains statistical power, and the authors acknowledge it directly. They also acknowledge that some questions may still be solvable via indexed information despite the filtering — the pipeline reduces but doesn't eliminate that possibility. The Chinese-language skew (84 of 110 questions) limits generalizability to English UIS tasks, a caveat worth holding onto before drawing conclusions about English-language agent deployments.

The benchmark's value isn't that it's large or perfectly clean. It's that it operationalizes a distinction — indexed versus unindexed retrieval — that existing benchmarks don't make. A 110-question benchmark that measures the right thing is more informative than a larger one that measures something adjacent.

---

## Where Agents Actually Fail: The Two Dominant Modes

Analysis of search behavior across four systems — Memento, Tongyi-DR, WebSailor, and UIS-Digger — identifies two dominant failure categories. Missing retrieval (what the paper calls RRR): the agent fails to locate the correct unindexed source at all. Knowledge sourcing failure (RBR): the agent reaches a relevant raw page but cannot extract or synthesize a correct answer from it.

A third pattern sits upstream of both: untrained models fail to invoke the crawl tool at all. The capability to call a web crawl tool — as opposed to a standard search API — doesn't appear to be latent in base models. It emerges after supervised fine-tuning and improves further with rejection sampling fine-tuning. This matters for how the failure modes are interpreted. An agent that never crawls can't fail at crawl-based retrieval; it simply never attempts it.

Within the same framework architecture and action space, systems show performance gaps of up to 20.9 percentage points. That variance can't be explained by tool availability or action space design — it points to training regime and backbone capability as the primary drivers. The architecture is necessary but not sufficient.

---

## UIS-Digger's Training Pipeline and Its Ceiling

The paper's proposed system, UIS-Digger, uses a four-agent architecture — Planner, Web Searcher, Web Surfer, and File Reader — with dual-mode browsing (textual and visual/screenshot) and a two-stage training pipeline. The Pangu-38B backbone starts at 9.1% on UIS-QA without training. SFT cold start adds 13.6 points, bringing it to 22.7%. RFT adds another 4.6 points, reaching 27.3%.

That 27.3% beats Memento's 25.5% — a system using O3 and GPT-4.1. The authors present this as the state of the art on UIS-QA. It's also, by their own description, "still unsatisfactory." Fewer than 1 in 3 genuinely unindexed retrieval tasks solved by the best available trained system is not a deployment-ready result.

The ceiling problem is visible in the backbone ablation. Untuned O3, used directly as the backbone in the same UIS-Digger framework, scores 30.9% — surpassing the trained 30B models. Untuned GPT-4o in the same position scores 8.2%. The variance between frontier models is enormous, and the best frontier model without any task-specific training still outperforms the best trained smaller model. The authors attribute part of the trained system's gap to distribution mismatch between synthetic training data and the real test set — a structural problem for any agent trained on simulated web environments rather than real unindexed sources.

---

## What This Means for Agent Evaluation and Deployment

The practical implication isn't that GAIA scores are worthless. They measure something real. The problem is the inference chain: high GAIA score → capable web agent → deployable for general information tasks. That chain breaks at the second step when the information task requires sources that search engines don't surface.

For teams evaluating agents for deployment in research, competitive intelligence, regulatory monitoring, or any domain where relevant information is systematically underindexed, benchmark scores from GAIA-class evaluations should be treated as a lower bound on difficulty, not an upper bound on capability. The tasks that matter most in those domains — finding information that isn't easily searchable — are precisely the tasks current benchmarks don't measure.

The training results suggest a path: SFT cold start to establish tool-use behavior, RFT to improve trajectory quality, and backbone selection that prioritizes frontier model scale over parameter count. But the 27.3% ceiling, and the fact that untuned O3 beats it, suggests the current bottleneck is foundation model capability more than training methodology. Until that ceiling rises, the honest framing for UIS performance is that the best available systems solve roughly one in four tasks — and that number should appear alongside any GAIA score used to justify deployment.

*Liu, C., Kuang, C., Zhuang, T., Cheng, Y., Zhou, H., Li, X., & Shang, L. (2026). UIS-Digger: Towards Comprehensive Research Agent Systems for Real-world Unindexed Information Seeking. arXiv:2603.08117*