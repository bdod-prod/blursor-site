# BLURSOR Licensed-Core AI Visibility Tracker

> Historical document. Product framing and v1 presentation are superseded by `2026-07-22-investigation-first-ai-visibility-diagnostics-design.md`. Its observation, rights, budget, privacy, and surface-separation controls remain applicable where the newer design does not replace them.

Date: 2026-07-20
Status: approved direction under Alex's delegated authority; implementation and production activation remain separate reviewable change-sets

Amendment: the requirement for explicit target-platform permission before any supplier consumer-interface use is superseded for the bounded Western closed beta by `2026-07-22-controlled-supplier-ui-closed-beta-design.md`. General production remains permission-gated; the amendment records internal risk acceptance, not platform authorization.

## Decision

BLURSOR will begin as a service-enabled visibility tracker for approximately ten active clients. It will not launch as a self-serve SaaS, and it will not make centralized Alice consumer-interface automation the dependency beneath paid reports.

The public production core will use sources for which BLURSOR can point to a documented or contractual right of access:

1. Yandex Search API with a generative response;
2. GigaChat's commercial API;
3. OpenAI's Responses API with web search, if enabled;
4. native Yandex Webmaster Alice visibility as a client-owned verification source, not as an undocumented automated feed;
5. a third-party Alice collector only after its contract explicitly grants downstream use, storage, derived reporting, and customer delivery. The separate Western ChatGPT closed beta may use a supplier consumer-interface collector under the dated `supplier_ui_risk_accepted` policy; that exception does not activate or relax the Russian Alice surfaces in this design.

Alice Pro and Alice AI consumer-interface automation remain an isolated research lane. They may be used to test whether licensed surfaces are directionally representative, but the production scheduler, client reports, and public methodology must not depend on them without written permission.

## Why this is narrower than a conventional tracker

The official surfaces are not interchangeable with consumer applications:

- Yandex Search API generates an answer from Yandex search results, but its documentation does not promise parity with the Alice AI consumer interface.
- Yandex Webmaster exposes first-party Alice AI visibility for verified sites, but the documented Webmaster API resource list does not currently expose the Alice visibility dataset.
- GigaChat API measures an API model. It must not be presented as a measurement of the consumer GigaChat application's browsing behavior unless Sber documents that equivalence.
- OpenAI's Responses API with web search is an official searchable surface, but it is still not evidence that every ChatGPT product mode returns the same answer.

BLURSOR therefore measures named surfaces, not vague vendor brands. A dashboard may compare surfaces, but it must never silently combine them into one “Alice,” “GigaChat,” or “ChatGPT” score.

## Product posture

### Included in the pilot

- manual onboarding of up to ten projects;
- Russian and English prompt panels;
- a default panel of 30 prompts per project;
- weekly measurement with two repeats per prompt;
- one additional monthly repeat for the full panel to expose instability;
- explicit competitors and brand aliases per project;
- surface-specific mention, recommendation, citation, and coverage metrics;
- private raw observations for audit;
- internal reports and controlled exports;
- a per-provider kill switch and a hard cost ceiling;
- versioned public methodology and internal rights register.

### Excluded from the pilot

- public signup, billing, and self-serve account management;
- a universal composite visibility score;
- claims about total market share, real user traffic, or all answers shown to users;
- automated Alice Pro or Alice AI consumer collection in production;
- CAPTCHA solving, account rotation, false identities, or rate-limit evasion;
- scraping Rush Analytics or another competitor's dashboard, customer account, prompt library, or reports;
- publishing complete model responses by default;
- client-facing comparison of sources that use materially different collection methods without a visible surface label.

## Acquisition architecture

Every collector implements one normalized interface while retaining its own exact surface identity.

```text
Prompt panel
    -> run planner and budget gate
    -> provider rights gate
    -> provider adapter
    -> immutable raw observation
    -> deterministic extraction
    -> versioned metrics
    -> internal report or controlled export
```

The rights gate is a product control, not a policy document that engineers can ignore. Each surface has one of five runtime states:

- `production_authorized`: scheduler and manual runs allowed;
- `contract_review`: cost forecasting and adapter development allowed, but no provider execution;
- `verification_only`: manual import or analyst comparison allowed, no scheduled collection;
- `research_only`: isolated calibration runs allowed, excluded from customer reports;
- `disabled`: no execution.

The production worker refuses any scheduled job unless the surface is `production_authorized`. Rights status changes require a reviewed configuration commit and a dated evidence entry in the internal provider register.

### Initial surface IDs

| Surface ID | Public label | Initial state | Important limitation |
|---|---|---:|---|
| `yandex_gen_search_api_ru` | Yandex generative Search API · RU | `contract_review` | Not consumer Alice parity; account and downstream-use terms still need review |
| `yandex_webmaster_alice_native` | Alice AI visibility · Yandex Webmaster | `verification_only` | Verified client sites; no documented Alice API resource |
| `gigachat_api` | GigaChat API | `contract_review` | Not consumer-app browsing parity; business terms still need review |
| `openai_responses_web_search` | OpenAI Responses API · web search | `disabled` until optional lane is approved | Not every ChatGPT product mode |
| `alice_ai_consumer_ui` | Alice AI consumer interface | `research_only` | Contract and continuity risk |
| `alice_pro_ui` | Alice Pro interface | `research_only` | Separate commercial-use permission required under current licence |
| `rush_alice_supplier` | Alice data via licensed supplier | `disabled` | Requires explicit resale and downstream-use rights |

## Prompt-panel methodology

Each project receives a frozen, versioned prompt panel. Prompts are divided into four intent groups:

1. discovery: unbranded category or problem questions;
2. comparison: requests for alternatives, shortlists, or best options;
3. validation: questions about a named brand, product, or claim;
4. purchase or action: questions with a visible commercial or next-step intent.

The default 30-prompt panel uses 12 discovery, 8 comparison, 6 validation, and 4 action prompts. At least 24 prompts are Russian for a Russian-market project. English prompts are kept as a separate language stratum rather than mixed into the same headline number.

Prompts are not edited in place. A meaningful wording change creates a new panel version. Reports show the panel version and compare only like-for-like periods by default.

### Sampling

- weekly cadence;
- two independent observations per prompt and surface;
- a third full-panel observation once per month;
- provider requests separated according to the documented quota;
- no automatic retry after a semantically valid answer;
- at most two retries for transport, authentication, throttling, or provider errors;
- failed observations remain visible and are excluded from visibility denominators while contributing to the coverage metric.

This is enough to expose obvious instability without pretending to eliminate stochasticity. A future variance study may justify a different repeat count, but the pilot must report uncertainty rather than hide it behind a composite score.

## Metrics

BLURSOR stores simple component metrics before considering any composite score.

### Observation-level fields

- `brand_mentioned`: whether a configured brand alias appears in the answer;
- `competitors_mentioned`: configured competitor aliases found in the answer;
- `brand_first_position`: ordinal position among configured brands, if determinable;
- `brand_recommended`: conservative rule-based recommendation flag, with `unclear` available;
- `cited_domains`: normalized domains from provider-supplied citations;
- `brand_domain_cited`: whether an owned domain is cited;
- `answer_refused`: whether the provider refused or could not answer;
- `valid_observation`: whether the answer is usable in the metric denominator;
- `response_hash`: stable hash of the normalized raw response;
- `extractor_version`: version of the alias and citation extractor.

### Reported metrics

- **Mention rate:** valid observations mentioning the brand / valid observations.
- **Recommendation rate:** valid observations conservatively recommending the brand / valid observations.
- **Owned citation rate:** valid observations citing an owned domain / valid observations.
- **Competitive share of mentions:** brand mentions / mentions of all configured brands. This is not market share.
- **First-position rate:** observations where the brand is the first configured brand mentioned / valid observations.
- **Coverage:** valid observations / scheduled observations.
- **Answer stability:** proportion of repeated observations with the same brand-mention and citation-domain set; wording similarity is secondary and separately labelled.

Every metric is grouped by exact surface, language, panel version, and date window. Missing results are never silently counted as zero visibility.

## Data model

The tracker extends the existing server-only Supabase pattern after the report-foundation branch is reviewed and integrated.

### Core tables

- `visibility_projects`: client/project identity, default locale, active state, budget ceiling;
- `visibility_brands`: owned brand plus aliases and domains;
- `visibility_competitors`: competitor brands, aliases, and domains per project;
- `visibility_prompt_panels`: immutable panel version and methodology version;
- `visibility_prompts`: prompt text, language, intent group, active order;
- `visibility_surfaces`: exact surface ID, public label, rights state, evidence date, kill-switch state;
- `visibility_runs`: scheduled batch, expected observation count, projected cost, actual cost, state;
- `visibility_observations`: immutable provider response, request metadata, response metadata, cost, hashes, and validity;
- `visibility_mentions`: deterministic extracted brand mentions and positions;
- `visibility_citations`: normalized provider-supplied citations;
- `visibility_metric_snapshots`: reproducible aggregates keyed by methodology version;
- `visibility_rights_events`: append-only record of surface-rights decisions without embedding confidential contract text.

No table is directly available to browser roles. Cloudflare Pages Functions are the application boundary. Provider secrets and the Supabase secret key remain server-only.

### Retention

- raw provider answer and provider metadata: 90 days by default;
- normalized mentions, citations, hashes, costs, run metadata, and aggregate metrics: retained;
- screenshots: not collected by default;
- customer export: derived metrics, citations, and short evidence excerpts rather than wholesale answer archives;
- deletion: project-scoped and auditable, with raw observations deleted before retained aggregates are anonymized or removed according to the customer agreement.

## Scheduling and failure handling

The pilot reuses n8n for orchestration because it already operates BLURSOR's scheduled workflows. Provider calls and writes remain behind Cloudflare Pages Functions so n8n does not become a second implementation of parsing, rights checks, or metrics.

The first executable change-set will expose an authenticated internal endpoint that runs one planned observation. A later inactive n8n workflow may claim and execute due observations at the provider's permitted rate. Activating that workflow and adding production credentials are separate explicit decisions.

Failure rules:

- a disabled or non-production surface fails before any provider call;
- a run whose projected cost exceeds its project or global ceiling is rejected;
- provider throttling pauses that surface rather than increasing concurrency;
- authentication failure trips the provider kill switch and alerts operations;
- extraction failure preserves the raw answer and marks the observation for reprocessing;
- one provider outage does not erase results from other surfaces;
- methodology or extractor changes reprocess stored observations into a new version rather than rewriting historical metrics.

## Pilot cost envelope

For ten clients, 30 prompts, two weekly repeats, and one additional full-panel repeat per month:

- four-week month: `10 × ((30 × 2 × 4) + 30) = 2,700` Yandex generative requests;
- Yandex list price verified 2026-07-20: `2,700 × ₽5.08 = ₽13,716` including VAT;
- a 4.33-week planning month is approximately ₽14,732;
- initial hard ceiling: ₽20,000 per month for Yandex generative Search API, with execution stopped before an over-budget batch is created.

GigaChat usage is expected to be small relative to Yandex at its published API token rates. OpenAI remains an optional, separately budgeted surface. Legal review, supplier licensing, and analyst time are not hidden inside request cost.

## Client and public presentation

The pilot produces an internal dashboard or export first. Client-facing access follows only after the data has passed a representative four-week validation period.

Every view and export must show:

- exact measured surface;
- collection dates and locale;
- prompt-panel and methodology versions;
- repeat count;
- valid/failed observation counts;
- surface limitations;
- no-affiliation statement;
- “sampled prompt-panel visibility,” never “market share” or “what all users see.”

BLURSOR may publish its formulas and sampling rules. It must not publish provider credentials, account identifiers, selectors, internal endpoints, anti-bot implementation, confidential supplier terms, or contract text. Transparency must describe the source class accurately; it cannot be used to disguise consumer-interface automation as an API.

## Competitive clean-room controls

- Own UI, report structure, copy, metric names, and formulas.
- No competitor dashboard or account access for product reconstruction.
- No competitor prompt database, customer export, or report ingestion.
- Public pricing and marketing pages may inform market analysis but not be copied.
- Timestamped design decisions and source links demonstrate independent creation.
- Platform and competitor names are nominative text references only; logos and endorsement language are excluded unless licensed.
- Comparative claims remain dated, reproducible, and limited to the measured panel.

## Delivery sequence

1. Keep the current checker/report foundation separate and finish its review.
2. Establish the provider-rights register, public methodology draft, and supplier questionnaire.
3. Add the tracker schema, normalized observation model, rights gate, and cost planner test-first.
4. Implement Yandex generative Search API as the first production adapter.
5. Run a one-project, four-week internal validation panel.
6. Add GigaChat API and optional OpenAI web-search adapters without merging surfaces.
7. Negotiate Yandex permission or a supplier agreement for consumer Alice data.
8. Add a client view only after the acquisition lane and metric stability are defensible.

## Verified primary references

- Alice Pro licence: https://yandex.ru/legal/aliceproagreement/ru/
- Alice AI terms: https://yandex.ru/legal/alice_chat/ru/
- Yandex Webmaster Alice visibility: https://yandex.ru/support/webmaster/ru/service/alice-answers
- Yandex Webmaster API resource overview: https://yandex.ru/dev/webmaster/doc/ru/concepts/getting-started
- Yandex Search API generative response: https://aistudio.yandex.ru/docs/ru/search-api/concepts/generative-response.html
- Yandex Search API example: https://aistudio.yandex.ru/docs/ru/search-api/operations/generative-search.html
- Yandex Search API pricing: https://aistudio.yandex.ru/docs/ru/search-api/pricing.html
- GigaChat business API pricing: https://developers.sber.ru/docs/ru/gigachat/tariffs/legal-tariffs
- OpenAI Responses API quickstart with web search: https://platform.openai.com/docs/quickstart/make-your-first-api-request
- Rush Analytics API documentation: https://www.rush-analytics.ru/api

## Approval gates

The approved direction does not authorize production deployment. Separate review is required before:

- applying database migrations;
- creating or rotating provider credentials;
- activating an n8n tracker workflow;
- sending data to a new provider;
- publishing the methodology;
- importing client Webmaster data;
- enabling a supplier or consumer-interface collector;
- merging or pushing a site change to `main`.
