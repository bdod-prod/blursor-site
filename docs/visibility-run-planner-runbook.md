# Visibility Run Planner Runbook

Status: local planning foundation; no provider or production connection

## Purpose

The planner validates a versioned prompt panel, checks the exact provider surface and rights state, estimates cost in integer microrubles, applies project and global ceilings, and emits deterministic observation specifications. It does not call an AI provider, write Supabase, activate n8n, or accept client traffic.

## Verify

```bash
npm run test:visibility
node scripts/plan-visibility-run.mjs tests/fixtures/visibility-plan-input.json
```

The fixture must produce four observations and a projected Yandex cost of `20,320,000` microrubles, or `20.32 ₽`.

## Runtime surfaces

| Surface ID | Runtime state | Permitted planner purpose |
|---|---|---|
| `yandex_gen_search_api_ru` | `contract_review` | forecast only |
| `yandex_webmaster_alice_native` | `verification_only` | verification, research |
| `gigachat_api` | `contract_review` | forecast only |
| `openai_responses_web_search_auto` | `disabled` | none — natural web-search choice API experiment, rather than ChatGPT; before activation review model/configuration, cost, data-handling, and labels |
| `openai_responses_web_search_required` | `disabled` | none — required-retrieval API experiment, rather than ChatGPT; before activation review model/configuration, cost, data-handling, and labels |
| `alice_ai_consumer_ui` | `research_only` | research |
| `alice_pro_ui` | `research_only` | research |
| `rush_alice_supplier` | `disabled` | none |

Planning permission does not itself authorize a provider call. Production adapters, credentials, contracts, and deployment remain separate gates.

## Access purposes and controlled supplier risk

The planner recognizes five purposes: `forecast`, `closed_beta`, `production`, `verification`, and `research`.

`supplier_ui_risk_accepted` is reserved for an exact third-party consumer-interface surface whose residual supplier, platform-enforcement, and continuity risk has been accepted for a dated closed beta. It is permitted only for `closed_beta` and isolated `research`; it is never sufficient for `forecast` or ordinary `production`. The kill switch overrides every state.

No current runtime surface has this state. Do not create a generic `ChatGPT` supplier surface. Supplier activation must add an exact provider-specific ID, visible label, pricing, cost ceiling, dated rights/risk evidence, and tests in a separate reviewed change.

## Money units

`1 RUB = 1,000,000 microrubles`.

- Yandex generative Search API: `5.08 ₽` per request = `5,080,000` microrubles per request, effective 2026-07-20.
- GigaChat Lite synchronous API: `0.065 ₽` per 1,000 tokens = `65,000` microrubles per 1,000 tokens, effective 2026-07-20.

Update a price only after checking the current primary pricing page. Change the amount and `effectiveDate` together, update the rights register evidence date, run the full test suite, and commit the evidence-backed change.

## Rights-state changes

1. Add the dated source, agreement conclusion, exact allowed surface, volume, retention, downstream-use position, upstream uncertainty, and internal risk owner to `docs/ops/provider-rights-register.md`.
2. Keep confidential correspondence and contracts outside the deployed repository.
3. Change the exact `rightsState` and `killSwitch` in `functions/lib/visibility/surface-registry.mjs`.
4. Add or update tests that demonstrate the newly permitted and still-forbidden purposes.
5. Run `npm test` and review the rights-document drift test.
6. Obtain the separate closed-beta or production approval required by the applicable design.

## Safe error codes

- `UNKNOWN_SURFACE`
- `INVALID_PURPOSE`
- `INVALID_RIGHTS_STATE`
- `SURFACE_DISABLED`
- `SURFACE_NOT_AUTHORIZED`
- `INVALID_PANEL`
- `INVALID_PANEL_ID`
- `INVALID_PANEL_VERSION`
- `INVALID_METHODOLOGY_VERSION`
- `INVALID_PROMPT_COUNT`
- `INVALID_PROMPT_ID`
- `DUPLICATE_PROMPT_ID`
- `INVALID_PROMPT_TEXT`
- `INVALID_PROMPT_LANGUAGE`
- `INVALID_PROMPT_INTENT`
- `INVALID_COST_INPUT`
- `COST_OVERFLOW`
- `PRICING_UNAVAILABLE`
- `UNSUPPORTED_PRICING`
- `PROJECT_BUDGET_EXCEEDED`
- `GLOBAL_BUDGET_EXCEEDED`
- `INVALID_PROJECT_ID`
- `INVALID_SCHEDULE`
- `INVALID_REPEAT_COUNT`
- `INPUT_PATH_REQUIRED`
- `INVALID_INPUT_JSON`
- `INTERNAL_PLANNING_ERROR`

These messages may be logged or shown to an operator. They must not contain credentials, raw input JSON, provider response bodies, or stack traces.

## Next change-set

The next reviewed Western plan may select one exact ChatGPT web supplier and add its priced adapter behind `closed_beta`. The Russian plan may separately add a private Supabase schema and the Yandex generative Search API adapter. Both must preserve exact surface identity, server-only credentials, immutable observations, the access gate, and cost ceilings.

Stop before applying a migration, adding a credential, activating n8n, importing client data, deploying a preview, or merging to `main`.
