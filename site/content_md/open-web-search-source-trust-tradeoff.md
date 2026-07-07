# Open-web search answers more questions, but it makes source trust much harder to control

Public AI services keep running into the same operational choice: do you answer from a curated knowledge base, or do you let the system search the open web? This paper is useful because it does not treat that as a generic “RAG versus search” question. It evaluates a real government-funded service, uses the same questions in both modes, and asks reviewers to judge not just whether the answer looks good, but whether the cited sources are actually trustworthy.

That second part matters. In this setting, a fluent answer with the wrong sources is not a minor defect; it is the failure mode that most directly affects whether a public service can be trusted. The paper’s core point is that open-web search buys coverage, but it also raises the odds that experts will flag the citations as untrustworthy or irrelevant.

35% of reviewed web-search answers had at least one flagged cited source.

---

## What the study compared, and how experts judged trust

The paper evaluates Evrópuvefur, an independent, government-funded AI information service run by the University of Iceland, before launch. Each of 287 questions was answered twice: once using curated retrieval and once using live web search. That setup matters because it keeps the input fixed while changing only the retrieval mode.

Five domain experts then produced 551 evaluations of 449 AI-generated answers. They did not just score answers as good or bad. They used a seven-criterion answer rubric and, separately, flagged individual cited sources when something looked wrong.

That split is the paper’s real contribution. Many evaluations stop at answer quality. This one treats source trustworthiness as its own object of measurement, which is closer to what public AI services actually need to manage.

---

## The main trade-off: web search expands coverage, but trust gets shaky

Open-web search answered more questions, but it did so with a much higher rate of source problems. Across the reviewed web-search answers, 35% — 65 of 187 — included at least one cited source that experts flagged. For the curated retrieval path, the figure was 6% — 16 of 262.

The nature of the failures also differed. On the web-search side, flags were almost always about untrustworthiness or irrelevance. On the curated side, the problems were mostly about being out of date. That is a practical distinction: one mode is more likely to surface sources that feel wrong, while the other is more likely to miss timely coverage.

The web path also generated a large volume of citations: 1,088 cited sources across 442 distinct URLs. So this is not a case where the model barely cited anything and a few bad links slipped through. The system was actively assembling evidence, but the evidence quality was uneven.

---

## Trust is not the same thing as fluency or topical fit

One of the more important findings is negative: fluency and topical fit did not predict source trustworthiness. In other words, an answer can sound responsive and stay on topic while still leaning on sources experts do not trust.

That is the uncomfortable part for practitioners. It means you cannot use answer quality alone as a proxy for citation quality. If your evaluation stack only checks whether the model “seems right,” you can miss the failure that matters most in public-facing systems: the citation looks legitimate to the user, but not to a subject-matter reviewer.

The paper’s source flags show that this is not a subtle edge case. Of 110 web flags, 87 were for untrustworthiness and 23 for irrelevance. That distribution suggests the system’s problem is not just poor retrieval breadth; it is the quality of what it decides to cite.

---

## Prompt steering helped a little, but it did not solve the problem

The authors also tested whether adding a trusted-domain list to the web-search prompt would change the citation mix. It did, but only modestly: citations to the listed domains rose from 12% to 21%.

That is an important nuance. The prompt ablation shows that you can steer citation behavior at the margin, but citation routing is not the same thing as source trust. A system can comply more often with a trusted-domain instruction and still produce a citation set that experts would reject.

There is also a telling coverage signal here: across all 287 web-search answers, the system never cited RÚV. So even with prompt steering, some sources simply did not enter the citation stream. That is a reminder that retrieval coverage and citation control are coupled, but not interchangeable.

---

## What to do about it in a public AI service

If you are shipping public AI with live web search, the practical takeaway is simple: treat source trustworthiness as a first-class metric, not a nice-to-have. The paper shows that it is measurable, and it shows that answer quality will not reliably reveal when it has gone wrong.

That has design implications. Curated retrieval is safer for citations, but it will under-answer when the corpus does not cover the question. Open-web search increases coverage, but you need an explicit way to catch or suppress untrustworthy citations — ideally before the user sees them. That can be manual review for a small service, or some automatic proxy for larger deployments, but relying on fluency is not enough.

The limits of the study matter too. The review is labour-intensive, the service is one language and one topic during one referendum period, and the per-flag judgments are descriptive rather than a final adjudication. Even so, the operational lesson is hard to ignore: if you add live web search to public AI, you are not just expanding retrieval. You are taking on citation-risk management.

*Einarsson, H., Einarsson, H. B., Ólafsson, J. G., & Þorsteinsson, J. G. (2026). Curated retrieval versus open web search in public AI information services: a coverage-trust trade-off. arXiv:2607.05217*