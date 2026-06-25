# LLMs mostly source “brand reputation” from other people’s pages

Large language models do not seem to treat brand reputation as something they mostly learn from the brand itself. In this paper, the citation trail points somewhere else: third-party pages dominate, and the same pattern holds across 12 markets and 13 languages.

That matters because the paper is not just asking which brands get mentioned. It is asking where the models go when they need evidence. That is a different question, and it leads to a more practical answer for anyone trying to influence how a brand shows up in AI search: visibility is mediated by the web’s authority layer, not just by owned pages.

The backbone result is simple.

---

## What the paper measures, and what it doesn’t

The paper merges three Rankfor.AI citation datasets covering 128 brands, 12 home markets, and 13 languages, and then analyzes 167,551 URL-grounded citations. That scope is large enough to make the pattern hard to dismiss as a one-off from a single model, language, or country.

But the study is careful about what it claims. It measures what LLMs cite, not human reputation itself. The “owned vs third-party” split is also heuristic: a citation counts as “owned” only if the brand token appears in the cited domain. That is useful for seeing attribution patterns, but it is not the same as measuring whether a page is truly brand-owned or whether a person would recognize it as authoritative.

There is another important wrinkle. The analysis is built from a backbone plus a cross-link merge, not one perfectly uniform table. Some datasets are much less URL-resolvable than others, and one of them contributes mostly keyword-based attribution rather than explicit URLs. So the cleanest takeaway is not “this is the internet’s true reputation map.” It is “this is the citation layer LLMs actually use when they answer brand questions.”

---

## Third-party pages are the default evidence layer

On the NB URL-grounded backbone, 85.7% of citations point to sites the brand does not own. Only 14.3% point to owned domains. That is the central finding of the paper, and it is a big one if you have been assuming that owned content is the main lever for brand visibility in AI answers.

The source mix makes the same point from another angle. Open third-party web pages, labeled `other_web`, account for 77.0% of URL citations. Company websites account for 16.4%, and Wikipedia accounts for 3.9% at the source-type level. So even before you get to individual domains, the overall picture is already tilted toward the open web rather than the brand’s own properties.

The long tail is not actually that long. Eighty percent of citations come from about 18% of domains, or 3,778 domains out of the registrable-domain base. The domain-rank distribution fits a Zipf law, which means a relatively small number of domains do most of the work. For practitioners, that matters more than the exact curve fit: if the citation economy is concentrated, you do not need to win everywhere. You need to be present in the places the models already trust and reuse.

---

## Wikipedia leads across languages, but local hubs can beat it

Wikipedia is the single most-cited domain in 11 of 12 languages. Its share ranges from 3.71% in Polish to 5.70% in Finnish, which is a good reminder that “most cited” does not mean “dominant.” The shares are only a few points apart, but the lead is persistent across languages.

The exception is Lithuanian, where `vz.lt` — Verslo žinios — edges out Wikipedia at 4.38%. That matters because it shows the models are not blindly defaulting to one global reference source. In at least some markets, a strong local business publication can sit in the same place in the citation stack that Wikipedia occupies elsewhere.

Poland gives an even sharper example of local sourcing behavior. For 46 Polish national brands, the most-cited single domain is YouTube, with 2,289 citations and 6.4%. Four HR and careers portals together supply 637 citations, compared with 297 for Polish Wikipedia. That is a very different pattern from the generic “Wikipedia everywhere” story. It suggests that in some markets, models are pulling brand evidence from the channels where audiences and recruiters actually encounter the brand, not just from encyclopedic pages.

The practical implication is straightforward: if you care about a specific market, you have to know which local information hubs the model is already using there. Global authority and local authority are not the same thing.

---

## Model choice changes how much and where the system cites

The paper also shows that citation behavior is model-dependent, not just query-dependent. Perplexity Sonar Pro accounts for 90,276 of 131,514 backbone citations, or 68.6%, and it grounds across 15,995 domains, the widest domain set in the comparison.

That means two things at once. First, some models simply cite more often. Second, they cite from a broader range of domains. If you are measuring brand visibility in AI answers, you cannot treat all models as interchangeable. A brand that is well covered in one model’s citation ecosystem may be much less visible in another’s.

This is also why raw citation counts need context. A high volume of citations does not automatically mean the model is better informed; it may just mean the model is more willing to ground answers in explicit sources. Likewise, a narrow domain set can make a model look more stable while actually making its evidence base more concentrated. The paper’s point is not that one model is “better.” It is that the citation surface itself changes materially by model.

---

## What to do about it if you work on AI visibility

If your job is to influence how a brand shows up in LLM answers, the paper points to a very different playbook than the usual “publish more on your own site” advice.

Start with the third-party domains the models already lean on. Wikipedia is the obvious global baseline, but not the only one. In some markets, local business media, job platforms, YouTube, and career portals appear to play the same role. If the citation economy is concentrated, a small number of external domains may matter more than a much larger volume of owned content.

That does not mean owned content stops mattering. It does mean owned content is probably upstream of the real action. The brand site helps when it gets picked up, cited, mirrored, or summarized by the third-party sources the models prefer. So the question shifts from “How do we rank our own page?” to “Which external pages are most likely to become the evidence layer for our brand, in this market, in this model?”

And because citation behavior varies by model, this should be monitored model by model, not averaged into a single dashboard. Perplexity’s citation footprint in this paper is not the same as everyone else’s, so any visibility strategy that ignores model-specific sourcing will miss part of the system.

*Dmitrij Żatuchin. (2026). How Large Language Models Source Brand Reputation Across Languages and Markets. arXiv:2606.25787*