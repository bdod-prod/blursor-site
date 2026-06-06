# GNN-ranked internal links win on authority, but they cost you coherence

WebKnoGraph is useful because it takes internal linking out of the realm of guesswork and turns it into a controlled graph intervention problem. Instead of asking whether a proposed link “looks good,” it asks what happens when you add links to a real crawl graph and then replay PageRank-style authority effects inside larger host environments.

That matters for practitioners because internal linking is usually discussed as one thing. This paper shows it is really at least two: you can redistribute authority through the site, or you can keep the page network semantically tidy. Often, you do not get both at once.

The setup is also more grounded than a typical model paper. WebKnoGraph compares automatic selection with expert-assisted selection on a production crawl of Kalicube.com, then evaluates those interventions inside both an empirical FineWeb-based host graph and a synthetic Barabási–Albert host graph. The result is not a live ranking test, but it is a reproducible way to see how link choices change the crawl graph before you ship them.

The intervention budget is about 240 added internal links.

---

## What WebKnoGraph actually evaluates

WebKnoGraph treats a website as a directed graph: pages are nodes, existing internal hyperlinks are edges, and new internal links are interventions. That framing is important because it shifts the question from “what should we link?” to “what graph effect do these candidate links produce?”

The paper does not test live traffic or production rankings. It explicitly says it does not run live A/B tests on production websites, and its results should be read as pre-deployment evidence on authority redistribution and semantic coherence, not as direct measurements of ranking or traffic impact.

That limitation is not a footnote here; it is the point of the framework. The authors are trying to give practitioners a safer decision layer before they commit editorial effort. If you want to know whether a linking plan is likely to move authority around the site in the way you expect, this is the kind of analysis that can tell you that.

The paper’s core move is to compare two selection regimes from the same candidate space: automatic ranking and expert-assisted picking. That makes the comparison cleaner than many internal-linking studies, because the question is not whether experts are better in general. It is whether expertise changes the outcome when both sides are looking at the same set of possible links.

---

## How the candidate links are generated

The pipeline starts by stripping boilerplate — navigation menus, footers, and advertisements — with trafilatura. What remains is embedded with `nomic-embed-text-v1`, using task prefixes for page and anchor-text representations, and the result is a set of 768-dimensional, L2-normalized vectors.

Those content features feed a two-layer mean-aggregation GraphSAGE model. The model combines page-level content with immediate and second-order graph neighborhoods, so the ranking is not just “text similarity” in isolation. It is text similarity plus local graph structure.

Candidate links are then filtered to remove self-links and links that already exist. That sounds basic, but it matters because it keeps the intervention realistic: the model is proposing new internal connections, not rediscovering the ones the site already has.

The automatic regime simply ranks donor-target pairs with GraphSAGE. The expert-assisted regime uses the same GraphSAGE-ranked candidate space, but WordLift SEO professionals select the links, with two intermediate-level experts making the primary selection and a senior expert providing oversight and validation.

---

## Why authority and semantic coherence pull in different directions

The paper’s main finding is a tradeoff: automatic selection generally produces stronger authority redistribution, with higher Authority Yield, but it also brings larger semantic coherence costs. In other words, the model is better at moving PageRank-style value around the site, but worse at keeping the added links topically natural.

Expert-assisted selection behaves the other way. It better preserves semantic coherence, which is what you would expect if humans are making the final judgment about whether a link fits the surrounding page. But the more interesting result is that expertise is not just a “quality control” layer; it also changes which pages benefit most from the intervention.

When the target pages are low-PageRank pages, expert-assisted selection achieves the highest Authority Yield. That is the part practitioners should pay attention to. If you are trying to lift weaker pages, human judgment appears to matter more, not less.

So the practical picture is not “automation bad, experts good.” It is more specific than that. Automation is stronger when the goal is raw authority redistribution under a fixed link budget. Experts are stronger when semantic continuity matters, and they are especially useful when you are trying to help pages that start with little authority to spend.

---

## The metrics are useful, but read them as proxy signals

WebKnoGraph evaluates interventions with four PageRank-based views: Authority Yield, Authority Volatility, Authority Down/Up Ratio, and Semantic-Coherence Change. Together, they frame internal linking as a multi-objective problem rather than a single-score optimization exercise.

That is a better mental model for day-to-day SEO work anyway. A link can be “good” for one objective and bad for another. A model that pushes authority upward may also create more awkward editorial seams. A manually chosen link may read naturally while redistributing less value than you hoped.

Authority Volatility is especially worth treating carefully. The paper says it provides an additional stability perspective, but it is interpreted cautiously because the two regimes use different numbers of intervention sets. So this is not a metric you should overread as a clean head-to-head stability verdict.

The bigger point is that the paper stays in crawl-space, not traffic-space. These are useful signals for deciding where to spend editorial time, but they are still proxy metrics. They help you choose a strategy; they do not tell you, by themselves, what will happen in a search console after deployment.

---

## What to do about it

If your priority is authority redistribution under a fixed link budget, use a model-driven ranking layer and expect it to outperform a purely manual pass on that one axis. That is the clearest case for automation in this paper.

If semantic coherence is a hard requirement — brand-sensitive pages, editorial content with strong narrative flow, or pages where a clunky link would be obvious to a reader — keep experts in the loop. The paper suggests that human selection is not just safer stylistically; it can also be the better choice when the target pages have weak authority to begin with.

The most practical workflow is probably hybrid. Let the model surface a constrained candidate set, then let humans decide which links survive. That gives you the GraphSAGE ranking signal without pretending the model understands every topical or editorial nuance.

And if you are evaluating internal linking in your own stack, use the same caution this paper does: treat crawl-graph metrics as pre-deployment evidence. They are good for narrowing options and catching bad tradeoffs early. They are not a substitute for seeing what happens after the links actually go live.

---

*Gjorgjevska, E., Mirceva, G., & Mirchev, M. (2026). WebKnoGraph: GNN-Powered Internal Linking. arXiv:2606.06106*