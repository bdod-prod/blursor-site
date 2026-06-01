# Ecosystem GEO Beats Page-Level Optimization by Up to 31 Points for Agent Search

Most GEO work assumes the same basic model as traditional SEO: write a better page, rank higher, get cited. That assumption made sense when the retrieval unit was a single document evaluated by a keyword index. It breaks down when the retrieval unit is a multi-step crawl session executed by an LLM agent that follows links, issues follow-up queries, and synthesizes evidence across several pages before making a recommendation.

A paper from ShanghaiTech University argues that this mismatch is the core reason existing GEO methods stall out on agentic benchmarks. Their framework, TRACE, treats the optimization target not as a page but as a trajectory — a coordinated seven-page evidence ecosystem designed to guide where the agent goes after it lands on the first result. The gains are large enough to suggest this isn't a marginal improvement on existing methods; it's a different problem being solved.

The anchoring number: on the SafeSearch dataset, the best page-level GEO baseline achieves a 35.9% target recommendation rate. TRACE reaches 67.2% — a 31.3 percentage-point gap on the same queries, against the same agent.

---

## The Page-Level GEO Ceiling

The three established page-level GEO methods tested here — C-SEO, E-GEO, and AutoGEO — all work roughly the same way: rewrite or restructure a single page to improve how it reads to an LLM, whether through snippet quality, content signals, or authority cues. They were designed for retrieval systems that evaluate documents in isolation, and they show it.

On OPR-Bench, none of these methods consistently beats an unoptimized single-page baseline. On SafeSearch, all three land at or below 35.9% — the same rate as doing nothing. The implication isn't that these methods are poorly implemented; it's that snippet-level rewriting doesn't move the needle when the agent controls its own crawl path. If the agent decides to follow a link to a competitor's review page, the quality of your original page's prose is irrelevant.

What the page-level framing misses is that an LLM search agent doesn't just read the page it lands on. It issues follow-up queries, crawls linked pages, and builds a picture from multiple sources before it answers. Optimizing one node in that graph while leaving the rest to chance is the structural problem TRACE is designed to fix.

| Method | SafeSearch Recommendation Rate |
|---|---|
| Single-Page baseline | 35.9% |
| Best page-level GEO baseline | 35.9% |
| TRACE ecosystem | 67.2% |

---

## How TRACE Structures the Evidence Ecosystem

TRACE builds a seven-page structure: one navigation entry page that surfaces in the initial search result, plus six role-specialized support pages — official, review, expert, news, forum, and social — that the agent can reach via internal links from the entry page. The entry page isn't optimized to answer the query on its own. It's optimized to be crawled first and to direct the agent toward the support pages.

When the agent issues follow-up queries within the same session, a semantic reranker (BAAI/bge-reranker-v2-m3) selects which support pages surface as results, so the ecosystem responds dynamically rather than serving the same content regardless of what the agent asks next. The agent can issue up to five queries and crawl up to five pages per session, so the design of the trajectory — which page leads where — matters as much as any individual page's content.

The role specialization across support pages matters because different agent queries call for different evidence types. A follow-up query about reliability calls for a review page; one about specifications calls for an official page. By pre-building pages that match the likely follow-up query space, TRACE increases the probability that whatever the agent searches for next, a target-aligned result appears.

---

## Internal-Link Crawling as the Differentiating Mechanism

The clearest signal in the data is the internal-link crawl rate. TRACE is the only method that generates any — 9.4% on SafeSearch, 19.0% on E-Commerce, and 20.4% on E-GEO. Every page-level baseline shows zero, because none of them builds a linked multi-page structure for the agent to traverse. There's nothing to follow.

The ablation isolates this effect directly. When the researchers compare a coordinated-but-unlinked ecosystem against the full TRACE structure (with the navigation entry page), internal-link crawl jumps from 0–6.6% to 25–30% under forced-exposure conditions. That structural change — adding the navigation page and its links — lifts recommendation rates by 6–7 percentage points on top of the gains from coordination alone.

One counterintuitive finding: TRACE actually achieves *lower* follow-up target-result crawl rates than some baselines. On E-Commerce, single-page methods reach 18–21.5% follow-up crawl; TRACE lands at 15.7%. On E-GEO, the gap is wider — 32.6% for the E-GEO baseline versus 24.9% for TRACE. Yet TRACE still wins on final recommendation across all three datasets. The agent encountering the target page again via a follow-up search matters less than the agent being guided through a coherent evidence trail from the start.

| | Internal-Link Crawl Rate |
|---|---|
| TRACE (E-GEO dataset) | 20.4% |
| Any page-level GEO baseline | 0% |

---

## Gains, Limits, and What the Benchmark Cannot Tell You

The absolute gains over the strongest baseline range from 14.9 percentage points on E-GEO to 31.3 points on SafeSearch. The largest gains appear on the dataset where page-level methods are weakest — consistent with the idea that trajectory control matters most when content signals alone aren't enough to differentiate the target.

The benchmark itself has real constraints worth naming. OPR-Bench uses fictional products inserted at rank 5 in a controlled 9+1 protocol — nine organic Google Search API results plus one synthetic target result. Whether a TRACE ecosystem page would be crawled, indexed, and ranked by a live search engine is entirely outside the study's scope. The controlled insertion is what makes the comparison clean; it's also what makes the results non-transferable to organic search without further work.

All experiments use GPT-5.1 as the sole agent backbone, so generalizability to other LLM families or agent architectures is an open question. The ablation covers only two small datasets — 64 and 121 query-product pairs — which limits how much weight the ablation conclusions can carry. And the full experimental code won't be publicly released, which constrains reproducibility.

None of that undermines the core finding. Within the scope of the study, the trajectory-aware ecosystem consistently outperforms every page-level approach by a margin that page-level optimization cannot close.

**+31.3 pp** — TRACE's absolute gain over the best baseline on SafeSearch, the largest margin across all three OPR-Bench datasets.

---

## What to Do With This

If your GEO investment is currently concentrated on rewriting individual pages — improving snippet quality, adding authority signals, restructuring content for LLM readability — this paper suggests you're optimizing for the wrong unit. Those techniques were built for retrieval systems that evaluate documents in isolation. Agentic search doesn't work that way.

The practical shift is toward thinking about the evidence environment around your target page: what support pages exist, how they're linked, whether they cover the follow-up query space an agent is likely to explore, and whether the entry point is designed to guide navigation rather than just answer the initial query. The internal-link structure isn't a nice-to-have — in TRACE's ablation, it's the mechanism that separates coordinated-but-flat from coordinated-and-directed.

The caveat is real: building a seven-page ecosystem for every product or topic is expensive, and the benchmark conditions don't tell you whether these pages would surface organically. But the directional finding is clear enough to inform where to experiment first: start with your highest-priority targets, build a small linked ecosystem around each, and measure whether agent-driven traffic and citations shift. The page-level ceiling is documented. The question is whether you're still building under it.

*Ye, H., Mao, J., Guan, Z., & Tian, Z. (2026). EcoGEO: Trajectory-Aware Evidence Ecosystems for Web-Enabled LLM Search Agents. arXiv:2605.12887*