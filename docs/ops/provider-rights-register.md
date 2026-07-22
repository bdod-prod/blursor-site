# BLURSOR Provider Rights Register

Status: internal working document
Last reviewed: 2026-07-22

This register determines which collectors the production scheduler may execute. It is operational risk control, not legal advice. Confidential correspondence and contract text belong in a restricted document store, not in the deployed website repository.

## Runtime rule

Only `production_authorized` surfaces may be scheduled or included in paid reports outside an explicitly approved closed beta. `supplier_ui_risk_accepted` surfaces may be used only for a dated, bounded `closed_beta` run or isolated research; this state records internal risk acceptance and never implies target-platform permission. `contract_review` surfaces may be used for local cost forecasting and adapter development without sending a request. `verification_only` data may be manually inspected for a client-owned property. `research_only` data must remain isolated from customer metrics and public methodology. `disabled` means no execution.

No current executable surface is assigned `supplier_ui_risk_accepted`. Supplier selection, pricing, credentials, and the first provider request require a separate reviewed change with an exact supplier-specific surface ID.

| Surface ID | Access method | State | Evidence and current conclusion | Next review or unblocker |
|---|---|---:|---|---|
| `yandex_gen_search_api_ru` | Official paid API | `contract_review` | Official generative Search API and published per-request tariff exist. Downstream storage and client-report rights still require contract review. Must be labelled as the API surface, not consumer Alice. | Confirm account agreement, downstream-use rights, billing owner, quota, and production key before changing state. Review monthly. |
| `yandex_webmaster_alice_native` | Native UI for verified sites | `verification_only` | Official UI reports Alice AI mentions, query examples, competitors, and weekly SoV for verified sites. The documented Webmaster API resources do not expose this Alice dataset. | Ask Yandex whether partner/API access is available. Do not automate the UI by inference. |
| `gigachat_api` | Official commercial API | `contract_review` | Official pay-as-you-go tariff exists. Downstream storage and client-report rights still require contract review. No evidence that API output equals every consumer GigaChat mode. | Confirm commercial terms, downstream-use rights, model retention settings, and exact model before changing state. Review monthly. |
| `openai_responses_web_search` | Official API with web-search tool | `disabled` | Official API surface is available; optional to the Russian-market pilot. It is not every ChatGPT product mode. | Enable only after budget and product priority approval. |
| `alice_ai_consumer_ui` | Signed-in consumer interface | `research_only` | Consumer terms do not establish a production automation licence. Continuity and account enforcement risk remain. | Written Yandex permission or counsel-approved contract basis. |
| `alice_pro_ui` | Paid Alice Pro interface | `research_only` | Current licence limits use to direct functionality/testing and requires a separate commercial-use licence for other purposes. It also restricts bypass and public references to use/cooperation details. | Written Yandex commercial-use permission covering automated measurement, storage, reporting, and methodology. |
| `rush_alice_supplier` | Rush Analytics API | `disabled` | Public API access is documented, but public documentation does not establish resale, white-label, or downstream customer-report rights. | Signed supplier addendum answering the questionnaire in `supplier-due-diligence.md`. |
| `dataforseo_chatgpt_web` | Third-party ChatGPT web collector candidate | `disabled` | DataForSEO markets its APIs as infrastructure for SEO software and exposes a ChatGPT web-result collector. Its public terms do not establish target-platform authorization and currently prohibit access or use by anyone located, resident, incorporated, or established in Russia. | Establish account eligibility, confirm client-facing derived analytics are within the purchased use, record the residual upstream risk, add pricing, and approve the exact beta surface. |
| `scrapellm_chatgpt_web` | Anonymous third-party ChatGPT web collector candidate | `disabled` | ScrapeLLM describes anonymous public-interface collection and client-facing visibility use cases. Its terms require disclosure for a directly competing product, restrict API resale without written approval, and place target-platform compliance on the customer. | Confirm the BLURSOR analytics use is accepted, record the residual upstream risk, add pricing, and approve the exact beta surface. |
| `brightdata_chatgpt_web` | Managed ChatGPT collector candidate | `disabled` | A technical service exists, but the standard Data Services agreement prohibits distributing or selling data to offer a similar or competing product. Low self-serve collection cost does not cure that restriction. | Use only under a custom order form that changes the competing-product restriction; then record residual upstream risk and approve the exact beta surface. |

## Evidence record requirements

For every state change, preserve:

- provider and exact legal entity;
- document title, URL, version/publication date, and retrieval date;
- relevant account or order form;
- permitted surface, territory, volume, retention, and customer delivery;
- restrictions on benchmarking, redistribution, derived data, and public naming;
- termination and change-notice terms;
- internal decision owner and review date;
- whether `supplier_ui_risk_accepted` is limited to an exact closed-beta project, prompt panel, language, country, cadence, and volume;
- a hash or immutable copy of the reviewed document where lawful.

Do not place API keys, credentials, account IDs, private legal correspondence, signatures, or full confidential contracts in this repository.

## Re-review triggers

- monthly scheduled check of public terms;
- provider changes product name, model, interface, or authentication;
- collector begins returning materially different citations or answer structure;
- unexplained authentication, rate-limit, or account warning;
- planned increase above the contracted volume;
- new geography, customer type, or data-retention purpose;
- any cease-and-desist, platform complaint, or supplier notice;
- before a surface is named in public methodology or marketing.
- before a `supplier_ui_risk_accepted` surface is used for another client or ordinary production.
