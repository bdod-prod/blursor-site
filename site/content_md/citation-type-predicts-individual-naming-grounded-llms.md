# Citation type predicts who grounded LLMs name — and roster-based visibility misses almost all of it

Grounded LLMs do not seem to name people at random. In this paper, the main split is not how many citations a response includes, but what kind of sources those citations come from. When the model leans on category portals and the person’s own site, it is more likely to attach a specific individual to the answer. When it leans elsewhere, naming drops.

That matters because a lot of visibility measurement assumes you can track “who got mentioned” by matching names against a roster. This paper shows why that misses most of the action. The overlap between model output and a 939-person LinkedIn roster was tiny: 128 of 27,293 name-shaped mentions matched, and only 26 of the 939 people were ever named.

25.8% of responses named an individual.

---

## What the study measured, and what “grounded naming” means here

The setup is narrow in a useful way: the prompts are all buyer-intent queries in three categories where people are choosing a person, not just a product or a page. The paper crosses four European markets — Poland, Ireland, the Netherlands, and a combined Lithuania/Estonia Baltics market — with real estate agents, car dealership sales representatives, and insurance brokers.

It runs 2,400 grounded API calls in one two-hour window on 24 July 2026. That comes from 120 unique prompts, four models, and five iterations per prompt-model pair. The models are GPT-5.6 Sol, Gemini 3.6 Flash, Perplexity Sonar Pro, and Grok 4.5, and every call requested live web-search grounding.

The paper is careful about what counts as naming. Its primary outcome is a rule cascade applied to the response text, and that cascade never opens the roster. So the main measurement is not “does this name appear in a list we already have?” It is “does the response itself name an individual professional?” The roster comes later as a separate instrument for comparison.

One more constraint matters: grounding is incomplete. Of the 2,400 responses, 2,223 carry at least one citation and 177 carry none. The paper treats the rates below as lower bounds, and that is the right framing — because any missing grounding can only hide some naming behavior, not create it.

---

## Naming is driven more by category than by raw citation count

The headline result is simple: grounded models named an individual in 619 of 2,400 responses, or 25.79%. But that average hides most of the action.

Category does a lot of the work. Real estate leads at 35.4%, car dealerships follow at 32.9%, and insurance trails far behind at 9.1%. If you are trying to estimate whether a grounded answer will surface a named person, the business category is doing more predictive work than a single global visibility score ever would.

The model effect is just as large. Grok 4.5 names an individual in 38.0% of responses, while Gemini 3.6 Flash does so in 9.3%. That is roughly a four-fold gap under the same prompt structure, the same grounding requirement, and the same overall measurement setup.

The important practical point is that this is not a small calibration difference. The paper is showing structural variation: some categories invite individual naming, and some models are simply much more willing to do it.

---

## Citation type predicts naming; citation volume does not

The most useful finding in the paper is also the least intuitive if you are used to counting citations as a proxy for authority. The model’s decision to name a person tracks citation type, not citation volume.

In naming responses, the model cites the individual’s own site 2.6 points more often and category portals 4.3 points more often. It cites social platforms less. Firm-owned pages, by contrast, appear at essentially the same rate whether or not the response names someone: 44.1% versus 45.5%.

That means “more citations” is the wrong summary. Two responses can have the same amount of grounding and still behave differently because the sources are different. A category portal plus a personal site seems to be a much stronger naming trigger than a generic accumulation of citations.

For anyone measuring AI visibility, that is the real lesson. If you only count citations, you flatten the signal that actually correlates with person-level naming. The source mix matters more than the total.

---

## A LinkedIn roster catches only a sliver of what the models actually name

The paper’s roster instrument is where the measurement problem becomes obvious. It builds a 939-person roster from public LinkedIn search, then scans model output for name-shaped spans and matches them back to that roster.

That instrument finds 128 matches out of 27,293 name-shaped mentions. That is 0.47%. And only 26 of the 939 people in the roster are ever named.

The authors also report precision of 96.9% and recall of 61.7% against the 128 roster mentions. So when the roster match hits, it is usually right. The problem is that it misses a lot, and the miss is not random. A roster-based view only sees the intersection of two populations: the people in the roster and the people the model chooses to name.

That is why roster coverage becomes a hidden assumption. If the sampled market is small, fragmented, or not well covered by the roster, the measured visibility drops even if the model is naming people frequently.

---

## What to do about it

If you are measuring AI visibility for named individuals, do not start with a roster and assume the result is the whole picture. Start with the response itself. Track whether the model names a person, and then track which source types show up when it does. Citation-source mix is the variable this paper says actually moves with naming.

If you are building a dashboard or audit process, treat roster-based metrics as a lower bound, not a score. They are useful for one slice of the problem, but they will systematically undercount behavior outside the roster — which, in this paper, was most of it.

And if you are trying to reduce unwanted individual naming, pay attention to the sources your content is feeding into the web. Category portals and person-specific pages are the combination most associated with naming in this setup. That does not prove causation, but it gives you a concrete place to look.

*Żatuchin, D. (2026). Who Gets Named: Citation Type Predicts Individual Naming by Grounded Language Models, and a Roster Instrument Captures 0.5% of It. arXiv:2607.23893*