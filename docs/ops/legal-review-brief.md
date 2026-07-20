# BLURSOR Legal Review Brief

Status: internal counsel brief
Last reviewed: 2026-07-20

## Requested deliverable

A Russian IT/IP lawyer should provide a written, source-linked memorandum and document redlines. A generic Terms template is not sufficient.

The review should produce:

1. a provider-by-provider rights conclusion;
2. a redlined public methodology;
3. customer Terms of Service, privacy notice, and DPA requirements;
4. a supplier addendum checklist or draft;
5. trademark and comparative-marketing guidance;
6. a response protocol for a platform notice, competitor complaint, or access suspension.

## Facts to assume

- BLURSOR is initially a service-enabled B2B pilot for approximately ten clients.
- Each project has a versioned panel of approximately 30 Russian/English prompts.
- Official APIs are called from BLURSOR's server-side infrastructure.
- Raw answers are retained privately for 90 days; derived metrics, citations, hashes, costs, and audit metadata may be retained longer.
- Client reports show metrics, citation URLs, and limited evidence excerpts rather than complete response archives.
- No public signup or payment flow exists in the pilot.
- No CAPTCHA solving, fake identities, account rotation, or rate-limit evasion is planned.
- Alice consumer-interface and Alice Pro collection are excluded from production unless separately authorized.
- Competitor dashboards, accounts, prompt databases, and reports are not used as source material.

## Documents for review

- `docs/superpowers/specs/2026-07-20-licensed-core-visibility-tracker-design.md`
- `docs/methodology/ai-visibility-tracking-v0.1.md`
- `docs/ops/provider-rights-register.md`
- `docs/ops/supplier-due-diligence.md`
- current provider terms and order forms;
- draft customer contract and privacy materials once prepared;
- any Yandex, Sber, OpenAI, Rush Analytics, or other supplier correspondence.

## Questions requiring a written conclusion

### Provider contracts and output rights

1. Do the Yandex Search API commercial documents permit automated panel measurement, 90-day raw-response storage, permanent derived metrics, and client delivery?
2. What wording is required to distinguish Yandex generative Search API from Alice AI?
3. Do the GigaChat business terms permit equivalent storage, benchmarking, and customer reporting?
4. Which OpenAI business/API terms govern the optional web-search lane for the chosen contracting entity and customer geography?
5. Does a supplier agreement expressly permit BLURSOR to operate a customer-facing product using supplier data, rather than merely consuming an API internally?
6. Can lawful derived metrics and hashes survive supplier termination?

### Alice research boundary

7. Does internal, non-customer calibration using Alice AI or Alice Pro fit the permitted testing purpose, and at what volume or automation level does that conclusion change?
8. How should the Alice Pro clause on public mentions of use or cooperation details affect an open methodology?
9. What written permission should BLURSOR request to automate a fixed prompt panel, store results, and report aggregates commercially?
10. Would a customer-operated local extension materially change the contractual analysis, or only the custody and scale facts?

### Intellectual property and competition

11. What nominative use of `Алиса AI`, `GigaChat`, `ChatGPT`, `Yandex`, and competitor names is defensible in navigation, reports, methodology, and comparative pages?
12. Which logos, screenshots, answer excerpts, citation lists, and interface elements require permission?
13. Are the proposed metric names and formulas independently protectable or likely generic, and how should independent creation be documented?
14. Which claims could be treated as misleading advertising or unfair comparison in Russia?
15. What procedure should handle a competitor's takedown demand concerning a factual, dated measurement?

### Data protection and customer terms

16. Is BLURSOR an operator, processor, or both for project contacts, prompt panels, and observations under each expected customer arrangement?
17. What Russian localization, consent, notification, cross-border transfer, and deletion requirements apply to the selected providers and storage locations?
18. Should prompts containing personal, confidential, regulated, or special-category data be contractually and technically prohibited?
19. What retention notice and deletion workflow are required for raw responses and derived metrics?
20. Which warranty exclusions are enforceable for probabilistic third-party outputs, provider outages, and discontinuities?

## Red lines for approval

Counsel should flag any proposed production lane that lacks a written basis for:

- automated access at the planned volume;
- raw answer and citation storage;
- derived metric calculation;
- delivery to BLURSOR clients;
- public identification of the measured surface;
- continued lawful retention after termination.

If one of these is absent, the surface remains `disabled`, `verification_only`, or `research_only`.

