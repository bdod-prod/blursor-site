# BLURSOR Provider Rights Register

Status: internal working document
Last reviewed: 2026-07-20

This register determines which collectors the production scheduler may execute. It is operational risk control, not legal advice. Confidential correspondence and contract text belong in a restricted document store, not in the deployed website repository.

## Runtime rule

Only `production_authorized` surfaces may be scheduled or included in paid reports. `contract_review` surfaces may be used for local cost forecasting and adapter development without sending a request. `verification_only` data may be manually inspected for a client-owned property. `research_only` data must remain isolated from customer metrics and public methodology. `disabled` means no execution.

| Surface ID | Access method | State | Evidence and current conclusion | Next review or unblocker |
|---|---|---:|---|---|
| `yandex_gen_search_api_ru` | Official paid API | `contract_review` | Official generative Search API and published per-request tariff exist. Downstream storage and client-report rights still require contract review. Must be labelled as the API surface, not consumer Alice. | Confirm account agreement, downstream-use rights, billing owner, quota, and production key before changing state. Review monthly. |
| `yandex_webmaster_alice_native` | Native UI for verified sites | `verification_only` | Official UI reports Alice AI mentions, query examples, competitors, and weekly SoV for verified sites. The documented Webmaster API resources do not expose this Alice dataset. | Ask Yandex whether partner/API access is available. Do not automate the UI by inference. |
| `gigachat_api` | Official commercial API | `contract_review` | Official pay-as-you-go tariff exists. Downstream storage and client-report rights still require contract review. No evidence that API output equals every consumer GigaChat mode. | Confirm commercial terms, downstream-use rights, model retention settings, and exact model before changing state. Review monthly. |
| `openai_responses_web_search` | Official API with web-search tool | `disabled` | Official API surface is available; optional to the Russian-market pilot. It is not every ChatGPT product mode. | Enable only after budget and product priority approval. |
| `alice_ai_consumer_ui` | Signed-in consumer interface | `research_only` | Consumer terms do not establish a production automation licence. Continuity and account enforcement risk remain. | Written Yandex permission or counsel-approved contract basis. |
| `alice_pro_ui` | Paid Alice Pro interface | `research_only` | Current licence limits use to direct functionality/testing and requires a separate commercial-use licence for other purposes. It also restricts bypass and public references to use/cooperation details. | Written Yandex commercial-use permission covering automated measurement, storage, reporting, and methodology. |
| `rush_alice_supplier` | Rush Analytics API | `disabled` | Public API access is documented, but public documentation does not establish resale, white-label, or downstream customer-report rights. | Signed supplier addendum answering the questionnaire in `supplier-due-diligence.md`. |
| `brightdata_ai_supplier` | Managed collector | `disabled` | A technical service exists, but BLURSOR needs written confirmation that the purchased data may power a customer-facing visibility product and be retained and transformed. | Signed downstream-use confirmation and review of upstream collection warranties. |

## Evidence record requirements

For every state change, preserve:

- provider and exact legal entity;
- document title, URL, version/publication date, and retrieval date;
- relevant account or order form;
- permitted surface, territory, volume, retention, and customer delivery;
- restrictions on benchmarking, redistribution, derived data, and public naming;
- termination and change-notice terms;
- internal decision owner and review date;
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
