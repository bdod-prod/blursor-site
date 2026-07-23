# BLURSOR Controlled Supplier-UI Closed Beta

Date: 2026-07-22
Status: approved by Alex; supplier selection and provider execution remain separate reviewable changes

## Decision

BLURSOR accepts the controlled contractual, continuity, and platform-enforcement risk of obtaining sampled consumer-interface observations through a third-party collector during a closed beta.

This is an internal business-risk decision. It is not evidence that OpenAI or another target platform granted BLURSOR or its supplier permission to automate a consumer interface. Public and client language must not describe the lane as licensed, official, authorized by the target platform, or representative of all users.

No supplier is selected or enabled by this decision. A later change must name the exact supplier and surface, document the supplier terms and internal risk owner, add pricing and cost ceilings, and retain a kill switch before any request is sent.

## Why the permission-only assumption changed

The earlier licensed-core design assumed that consumer-interface data should enter production only after explicit downstream and upstream permission. Subsequent Western-market research found that browser and public-interface collection is common, while public evidence of target-platform authorization is generally absent. Waiting for a warranty that a target platform approved a supplier's collection would probably make a consumer-interface beta impossible without materially reducing the underlying risk.

BLURSOR will not hide that unresolved risk. It will separate official APIs, third-party consumer-interface collection, internal research, and external comparison instruments as different observation classes.

## Closed-beta scope

The initial Western beta is bounded to:

- one authorized client project initially: Dr. Kamran Aghayev;
- a frozen 15-prompt panel;
- English prompts only;
- United States location context;
- one sampled logged-out consumer-web lane from an exact third-party supplier;
- collection every two or three days until observed variance justifies another cadence;
- a separately labelled OpenAI Responses API web-search lane;
- an isolated Otterly comparison dataset that is not imported into BLURSOR's observation store;
- private raw evidence, derived client metrics, and short reviewable excerpts;
- no patient-identifiable or patient-derived prompt content.

The beta is service-supported. It does not authorize public signup, general multi-client production, annual availability commitments, unlimited prompt execution, or a public corpus of complete model answers.

## Runtime access policy

The visibility gate distinguishes the purpose of a run from the risk state of a surface.

### Purposes

- `forecast`: cost and observation planning without implying provider execution;
- `closed_beta`: an explicitly approved, bounded client experiment;
- `production`: ordinary scheduled customer operation outside the closed beta;
- `verification`: client-owned or native-source comparison;
- `research`: isolated investigation excluded from customer metrics.

### Relevant states

- `production_authorized`: allowed for general production, closed beta, forecast, verification, and research as applicable;
- `supplier_ui_risk_accepted`: allowed only for closed beta and isolated research, but never forecasting or ordinary production;
- `contract_review`: forecast only;
- `verification_only`: verification and research only;
- `research_only`: research only;
- `disabled`: no execution.

The kill switch overrides every state and purpose.

`supplier_ui_risk_accepted` means that Alex or a later documented decision owner accepted the residual supplier, target-platform, and continuity risk for the exact beta scope. It does not mean a supplier, OpenAI, or another platform approved BLURSOR's product.

## Supplier-specific activation gate

Before an exact surface can move to `supplier_ui_risk_accepted`, the reviewed change must record:

- supplier legal entity and product name;
- exact consumer surface and authentication mode;
- whether the supplier permits client-facing analytics and derived metrics;
- known restrictions on competing products, resale, storage, excerpts, and exports;
- the absence or presence of any upstream platform warranty;
- supported country and language controls;
- per-observation pricing and a hard monthly ceiling;
- retention and deletion rules;
- internal decision owner, acceptance date, and next review date;
- kill-switch behavior and supplier replacement path.

Vague permission, a marketing page, or mere technical access does not become platform authorization. Conversely, the lack of platform authorization is not hidden behind the supplier's contract.

## Measurement and presentation rules

The consumer-web lane must be labelled with the exact surface and supplier class, for example:

> ChatGPT web, logged-out US sample via third-party collector

It must not be labelled simply `ChatGPT`, `ChatGPT ranking`, `official ChatGPT data`, or `what users see`.

Every report must show the prompt panel, location, language, dates, cadence, valid observation count, missing observations, and collection class. API and consumer-web observations remain separate series. Agreement with Otterly establishes only directional similarity for the measured panel and period.

## Operational controls

- no BLURSOR-owned consumer account automation in this beta;
- no account rotation, false identities, CAPTCHA bypass implementation, or rate-limit evasion by BLURSOR;
- one provider-specific kill switch;
- hard project and global cost ceilings;
- bounded retries for transport failures only;
- immutable raw observations with the supplier response metadata available;
- private evidence by default and no wholesale answer publication;
- immediate suspension after a platform complaint, supplier warning, unexplained access change, or material terms change;
- re-review before adding another client, language, country, authenticated surface, or materially higher volume.

## Delivery boundary

This design authorizes the access-policy state and documentation amendment only. It does not authorize supplier signup, payment, credentials, provider calls, database migrations, scheduled workflows, deployment, client-data import, public methodology publication, or merging to `main`.
