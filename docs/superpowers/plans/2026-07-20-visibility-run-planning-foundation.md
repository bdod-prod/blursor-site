# BLURSOR Visibility Run-Planning Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free, test-first library and local CLI that validates versioned prompt panels, enforces provider-rights states, estimates run cost, and produces deterministic observation plans without calling a provider or changing production data.

**Architecture:** Pure ES modules under `functions/lib/visibility/` hold the surface registry, panel validator, cost model, and run planner so the same code can later run in Node and Cloudflare Pages Functions. A local CLI accepts one JSON planning request and emits a normalized JSON plan; there is deliberately no HTTP endpoint, database migration, scheduler, or provider credential in this slice.

**Tech Stack:** Node.js 20 built-in test runner, Web Platform `crypto.subtle`, JavaScript ES modules, existing Cloudflare Pages repository.

## Global Constraints

- Execute after the reviewed `codex/report-foundation` branch, or an equivalent later commit, supplies `package.json`, `npm test`, and the baseline report tests.
- Do not merge either branch to `main`, deploy a preview, apply a migration, create a provider account, or add a credential as part of this plan.
- Keep all arithmetic in integer microrubles: `1 RUB = 1,000,000 microrubles`.
- Use the verified Yandex list price effective 2026-07-20: `5.08 RUB = 5,080,000 microrubles` per generative request.
- A production plan is allowed only for a surface whose rights state is `production_authorized` and whose kill switch is off.
- Never label Yandex generative Search API observations as consumer Alice observations.
- Never merge observations from different surface IDs into one metric in this slice.
- Do not add third-party packages.
- Do not expose the internal rights register, supplier questionnaire, legal brief, tests, or implementation plans as public site assets. Resolve the repository's explicit deploy-output boundary before these documents are eligible for `main`.
- Preserve the service-enabled pilot scope: no public signup, billing, multi-tenant auth, client dashboard, n8n workflow, or automated Alice consumer-interface collector.

---

## File Structure

- `functions/lib/visibility/visibility-error.mjs`: stable domain error with machine-readable code and safe details.
- `functions/lib/visibility/surface-registry.mjs`: single executable registry and rights-purpose gate.
- `functions/lib/visibility/prompt-panel.mjs`: immutable prompt-panel validation and normalization.
- `functions/lib/visibility/cost-model.mjs`: integer cost estimates and project/global budget checks.
- `functions/lib/visibility/run-planner.mjs`: deterministic plan and idempotency-key generation.
- `scripts/plan-visibility-run.mjs`: local JSON-in/JSON-out planning command.
- `tests/visibility/*.test.mjs`: focused Node tests for every module and the CLI.
- `tests/fixtures/visibility-plan-input.json`: small valid pilot planning request.
- `package.json`: retain repository-wide `npm test`; add a targeted `test:visibility` command.

---

### Task 1: Add the executable surface registry and rights gate

**Files:**

- Create: `functions/lib/visibility/visibility-error.mjs`
- Create: `functions/lib/visibility/surface-registry.mjs`
- Create: `tests/visibility/surface-registry.test.mjs`

**Interfaces:**

- Produces: `VisibilityError`, `VISIBILITY_SURFACES`, `getVisibilitySurface(surfaceId)`, and `assertVisibilitySurfaceAllowed(surfaceId, purpose)`.
- `purpose` is exactly one of `forecast`, `production`, `verification`, or `research`.
- Later tasks consume the returned frozen surface object and its `pricing` field.

- [ ] **Step 1: Write the failing registry tests**

Create `tests/visibility/surface-registry.test.mjs` with these cases:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  VISIBILITY_SURFACES,
  assertVisibilitySurfaceAllowed,
  getVisibilitySurface,
} from "../../functions/lib/visibility/surface-registry.mjs";

test("registry uses exact surface identities and integer pricing", () => {
  assert.deepEqual(Object.keys(VISIBILITY_SURFACES).sort(), [
    "alice_ai_consumer_ui",
    "alice_pro_ui",
    "gigachat_api",
    "openai_responses_web_search",
    "rush_alice_supplier",
    "yandex_gen_search_api_ru",
    "yandex_webmaster_alice_native",
  ]);

  assert.deepEqual(VISIBILITY_SURFACES.yandex_gen_search_api_ru.pricing, {
    kind: "per_request",
    currency: "RUB",
    microrubPerRequest: 5_080_000,
    effectiveDate: "2026-07-20",
  });
  assert.equal(VISIBILITY_SURFACES.yandex_gen_search_api_ru.rightsState, "contract_review");
  assert.equal(VISIBILITY_SURFACES.gigachat_api.rightsState, "contract_review");
  assert.equal(VISIBILITY_SURFACES.gigachat_api.pricing.microrubPer1000Tokens, 65_000);
});

test("forecast permits priced APIs under contract review", () => {
  assert.equal(
    assertVisibilitySurfaceAllowed("yandex_gen_search_api_ru", "forecast").id,
    "yandex_gen_search_api_ru",
  );
  assert.equal(
    assertVisibilitySurfaceAllowed("gigachat_api", "forecast").id,
    "gigachat_api",
  );
});

test("production rejects every surface until downstream rights are approved", () => {
  for (const id of [
    "yandex_gen_search_api_ru",
    "gigachat_api",
    "yandex_webmaster_alice_native",
    "alice_ai_consumer_ui",
    "alice_pro_ui",
  ]) {
    assert.throws(
      () => assertVisibilitySurfaceAllowed(id, "production"),
      (error) => error.code === "SURFACE_NOT_AUTHORIZED",
    );
  }
  for (const id of ["openai_responses_web_search", "rush_alice_supplier"]) {
    assert.throws(
      () => assertVisibilitySurfaceAllowed(id, "production"),
      (error) => error.code === "SURFACE_DISABLED",
    );
  }
});

test("verification and research purposes remain bounded", () => {
  assert.equal(
    assertVisibilitySurfaceAllowed("yandex_webmaster_alice_native", "verification").id,
    "yandex_webmaster_alice_native",
  );
  assert.equal(
    assertVisibilitySurfaceAllowed("alice_pro_ui", "research").id,
    "alice_pro_ui",
  );
  assert.throws(
    () => assertVisibilitySurfaceAllowed("rush_alice_supplier", "research"),
    (error) => error.code === "SURFACE_DISABLED",
  );
  assert.throws(
    () => assertVisibilitySurfaceAllowed("unknown", "production"),
    (error) => error.code === "UNKNOWN_SURFACE",
  );
  assert.throws(
    () => assertVisibilitySurfaceAllowed("gigachat_api", "sales"),
    (error) => error.code === "INVALID_PURPOSE",
  );
});

test("callers cannot mutate registry entries", () => {
  const surface = getVisibilitySurface("yandex_gen_search_api_ru");
  assert.equal(Object.isFrozen(surface), true);
  assert.equal(Object.isFrozen(surface.pricing), true);
  assert.throws(() => {
    surface.rightsState = "disabled";
  }, TypeError);
});
```

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run:

```bash
node --test tests/visibility/surface-registry.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `surface-registry.mjs`.

- [ ] **Step 3: Implement the domain error**

Create `functions/lib/visibility/visibility-error.mjs`:

```js
export class VisibilityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "VisibilityError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}
```

- [ ] **Step 4: Implement the frozen registry and permission matrix**

Create `functions/lib/visibility/surface-registry.mjs`. Define the seven surface objects from the design with these exact rights states:

```js
import { VisibilityError } from "./visibility-error.mjs";

const defineSurface = (surface) => Object.freeze({
  ...surface,
  pricing: surface.pricing ? Object.freeze({ ...surface.pricing }) : null,
});

export const VISIBILITY_SURFACES = Object.freeze(Object.fromEntries([
  defineSurface({
    id: "yandex_gen_search_api_ru",
    publicLabel: "Yandex generative Search API · RU",
    collectionClass: "official_api",
    rightsState: "contract_review",
    killSwitch: false,
    pricing: {
      kind: "per_request",
      currency: "RUB",
      microrubPerRequest: 5_080_000,
      effectiveDate: "2026-07-20",
    },
  }),
  defineSurface({
    id: "yandex_webmaster_alice_native",
    publicLabel: "Alice AI visibility · Yandex Webmaster",
    collectionClass: "native_dashboard",
    rightsState: "verification_only",
    killSwitch: false,
    pricing: null,
  }),
  defineSurface({
    id: "gigachat_api",
    publicLabel: "GigaChat API",
    collectionClass: "official_api",
    rightsState: "contract_review",
    killSwitch: false,
    pricing: {
      kind: "per_1000_tokens",
      currency: "RUB",
      microrubPer1000Tokens: 65_000,
      effectiveDate: "2026-07-20",
    },
  }),
  defineSurface({
    id: "openai_responses_web_search",
    publicLabel: "OpenAI Responses API · web search",
    collectionClass: "official_api",
    rightsState: "disabled",
    killSwitch: true,
    pricing: null,
  }),
  defineSurface({
    id: "alice_ai_consumer_ui",
    publicLabel: "Alice AI consumer interface",
    collectionClass: "consumer_interface",
    rightsState: "research_only",
    killSwitch: false,
    pricing: null,
  }),
  defineSurface({
    id: "alice_pro_ui",
    publicLabel: "Alice Pro interface",
    collectionClass: "consumer_interface",
    rightsState: "research_only",
    killSwitch: false,
    pricing: null,
  }),
  defineSurface({
    id: "rush_alice_supplier",
    publicLabel: "Alice data via licensed supplier",
    collectionClass: "supplier",
    rightsState: "disabled",
    killSwitch: true,
    pricing: null,
  }),
].map((surface) => [surface.id, surface])));

const PURPOSE_STATES = Object.freeze({
  forecast: new Set(["contract_review", "production_authorized"]),
  production: new Set(["production_authorized"]),
  verification: new Set(["production_authorized", "verification_only"]),
  research: new Set(["production_authorized", "verification_only", "research_only"]),
});

export function getVisibilitySurface(surfaceId) {
  const surface = VISIBILITY_SURFACES[surfaceId];
  if (!surface) {
    throw new VisibilityError("UNKNOWN_SURFACE", "Unknown visibility surface.", { surfaceId });
  }
  return surface;
}

export function assertVisibilitySurfaceAllowed(surfaceId, purpose) {
  const states = PURPOSE_STATES[purpose];
  if (!states) {
    throw new VisibilityError("INVALID_PURPOSE", "Unknown visibility run purpose.", { purpose });
  }
  const surface = getVisibilitySurface(surfaceId);
  if (surface.rightsState === "disabled" || surface.killSwitch) {
    throw new VisibilityError("SURFACE_DISABLED", "Visibility surface is disabled.", { surfaceId });
  }
  if (!states.has(surface.rightsState)) {
    throw new VisibilityError("SURFACE_NOT_AUTHORIZED", "Visibility surface is not authorized for this purpose.", {
      surfaceId,
      purpose,
      rightsState: surface.rightsState,
    });
  }
  return surface;
}
```

- [ ] **Step 5: Run the registry tests**

Run: `node --test tests/visibility/surface-registry.test.mjs`

Expected: 5 tests PASS.

- [ ] **Step 6: Commit the surface gate**

```bash
git add functions/lib/visibility/visibility-error.mjs functions/lib/visibility/surface-registry.mjs tests/visibility/surface-registry.test.mjs
git commit -m "feat: gate visibility surfaces by rights state"
```

---

### Task 2: Validate immutable prompt-panel versions

**Files:**

- Create: `functions/lib/visibility/prompt-panel.mjs`
- Create: `tests/visibility/prompt-panel.test.mjs`

**Interfaces:**

- Produces: `PROMPT_INTENTS`, `PROMPT_LANGUAGES`, and `validatePromptPanel(input)`.
- `validatePromptPanel` returns a deeply frozen plain object with `id`, `version`, `methodologyVersion`, and normalized `prompts`.
- Later tasks consume `panel.prompts.length`, `prompt.id`, `prompt.text`, `prompt.language`, and `prompt.intent`.

- [ ] **Step 1: Write failing panel tests**

Create `tests/visibility/prompt-panel.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { validatePromptPanel } from "../../functions/lib/visibility/prompt-panel.mjs";

const VALID_PANEL = {
  id: "ru-saas-pilot",
  version: 1,
  methodologyVersion: "0.1",
  prompts: [
    { id: "discovery-01", text: "Какие сервисы помогают проверить видимость бренда в ответах ИИ?", language: "ru", intent: "discovery" },
    { id: "comparison-01", text: "Compare AI visibility tracking tools for a Russian company.", language: "en", intent: "comparison" },
  ],
};

test("normalizes and deeply freezes a valid panel", () => {
  const input = structuredClone(VALID_PANEL);
  input.prompts[0].text = "  Какие  сервисы помогают проверить видимость бренда в ответах ИИ?  ";
  const panel = validatePromptPanel(input);

  assert.equal(panel.prompts[0].text, "Какие сервисы помогают проверить видимость бренда в ответах ИИ?");
  assert.equal(Object.isFrozen(panel), true);
  assert.equal(Object.isFrozen(panel.prompts), true);
  assert.equal(Object.isFrozen(panel.prompts[0]), true);
  assert.throws(() => {
    panel.prompts[0].text = "changed";
  }, TypeError);
  input.prompts[0].text = "caller mutation";
  assert.notEqual(panel.prompts[0].text, input.prompts[0].text);
});

test("rejects an invalid panel identity and version", () => {
  assert.throws(
    () => validatePromptPanel({ ...VALID_PANEL, id: "" }),
    (error) => error.code === "INVALID_PANEL_ID",
  );
  assert.throws(
    () => validatePromptPanel({ ...VALID_PANEL, version: 1.5 }),
    (error) => error.code === "INVALID_PANEL_VERSION",
  );
  assert.throws(
    () => validatePromptPanel({ ...VALID_PANEL, methodologyVersion: "v1" }),
    (error) => error.code === "INVALID_METHODOLOGY_VERSION",
  );
});

test("rejects duplicate prompt IDs", () => {
  const prompts = [VALID_PANEL.prompts[0], { ...VALID_PANEL.prompts[1], id: "discovery-01" }];
  assert.throws(
    () => validatePromptPanel({ ...VALID_PANEL, prompts }),
    (error) => error.code === "DUPLICATE_PROMPT_ID",
  );
});

test("rejects unsupported prompt fields", () => {
  const invalidCases = [
    [{ ...VALID_PANEL.prompts[0], id: "?" }, "INVALID_PROMPT_ID"],
    [{ ...VALID_PANEL.prompts[0], text: "  " }, "INVALID_PROMPT_TEXT"],
    [{ ...VALID_PANEL.prompts[0], text: "x".repeat(601) }, "INVALID_PROMPT_TEXT"],
    [{ ...VALID_PANEL.prompts[0], language: "de" }, "INVALID_PROMPT_LANGUAGE"],
    [{ ...VALID_PANEL.prompts[0], intent: "awareness" }, "INVALID_PROMPT_INTENT"],
  ];
  for (const [prompt, code] of invalidCases) {
    assert.throws(
      () => validatePromptPanel({ ...VALID_PANEL, prompts: [prompt] }),
      (error) => error.code === code,
    );
  }
});

test("enforces the prompt count boundary", () => {
  assert.throws(
    () => validatePromptPanel({ ...VALID_PANEL, prompts: [] }),
    (error) => error.code === "INVALID_PROMPT_COUNT",
  );
  const prompts = Array.from({ length: 121 }, (_, index) => ({
    id: `prompt-${String(index + 1).padStart(3, "0")}`,
    text: `Prompt ${index + 1}`,
    language: "en",
    intent: "discovery",
  }));
  assert.throws(
    () => validatePromptPanel({ ...VALID_PANEL, prompts }),
    (error) => error.code === "INVALID_PROMPT_COUNT",
  );
});
```

- [ ] **Step 2: Verify failure before implementation**

Run: `node --test tests/visibility/prompt-panel.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `prompt-panel.mjs`.

- [ ] **Step 3: Implement strict normalization**

Create `functions/lib/visibility/prompt-panel.mjs` with:

```js
import { VisibilityError } from "./visibility-error.mjs";

export const PROMPT_INTENTS = Object.freeze(["discovery", "comparison", "validation", "action"]);
export const PROMPT_LANGUAGES = Object.freeze(["ru", "en"]);

const freezePrompt = (prompt) => Object.freeze({ ...prompt });

export function validatePromptPanel(input) {
  if (!input || typeof input !== "object") {
    throw new VisibilityError("INVALID_PANEL", "Prompt panel must be an object.");
  }
  const id = String(input.id || "").trim();
  const methodologyVersion = String(input.methodologyVersion || "").trim();
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(id)) {
    throw new VisibilityError("INVALID_PANEL_ID", "Prompt panel ID is invalid.");
  }
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new VisibilityError("INVALID_PANEL_VERSION", "Prompt panel version must be a positive integer.");
  }
  if (!/^\d+\.\d+$/.test(methodologyVersion)) {
    throw new VisibilityError("INVALID_METHODOLOGY_VERSION", "Methodology version must use major.minor format.");
  }
  if (!Array.isArray(input.prompts) || input.prompts.length < 1 || input.prompts.length > 120) {
    throw new VisibilityError("INVALID_PROMPT_COUNT", "Prompt panel must contain between 1 and 120 prompts.");
  }

  const seen = new Set();
  const prompts = input.prompts.map((source, index) => {
    const prompt = {
      id: String(source?.id || "").trim(),
      text: String(source?.text || "").replace(/\s+/g, " ").trim(),
      language: String(source?.language || "").trim(),
      intent: String(source?.intent || "").trim(),
    };
    if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(prompt.id)) {
      throw new VisibilityError("INVALID_PROMPT_ID", "Prompt ID is invalid.", { index });
    }
    if (seen.has(prompt.id)) {
      throw new VisibilityError("DUPLICATE_PROMPT_ID", "Prompt IDs must be unique.", { promptId: prompt.id });
    }
    seen.add(prompt.id);
    if (!prompt.text || prompt.text.length > 600) {
      throw new VisibilityError("INVALID_PROMPT_TEXT", "Prompt text must contain 1 to 600 characters.", { promptId: prompt.id });
    }
    if (!PROMPT_LANGUAGES.includes(prompt.language)) {
      throw new VisibilityError("INVALID_PROMPT_LANGUAGE", "Prompt language is not supported.", { promptId: prompt.id });
    }
    if (!PROMPT_INTENTS.includes(prompt.intent)) {
      throw new VisibilityError("INVALID_PROMPT_INTENT", "Prompt intent is not supported.", { promptId: prompt.id });
    }
    return freezePrompt(prompt);
  });

  return Object.freeze({
    id,
    version: input.version,
    methodologyVersion,
    prompts: Object.freeze(prompts),
  });
}
```

- [ ] **Step 4: Run the panel tests**

Run: `node --test tests/visibility/prompt-panel.test.mjs`

Expected: all panel tests PASS.

- [ ] **Step 5: Commit panel validation**

```bash
git add functions/lib/visibility/prompt-panel.mjs tests/visibility/prompt-panel.test.mjs
git commit -m "feat: validate versioned visibility prompt panels"
```

---

### Task 3: Add integer cost estimates and hard budget gates

**Files:**

- Create: `functions/lib/visibility/cost-model.mjs`
- Create: `tests/visibility/cost-model.test.mjs`

**Interfaces:**

- Produces: `RUB_MICRO`, `estimateRunCostMicrorub({ surface, observationCount, estimatedTokensPerObservation })`, `assertRunWithinBudgets(input)`, and `formatRub(microrub)`.
- `assertRunWithinBudgets` returns a frozen cost summary or throws `PROJECT_BUDGET_EXCEEDED` / `GLOBAL_BUDGET_EXCEEDED`.
- Later tasks pass the exact surface object from Task 1.

- [ ] **Step 1: Write failing cost tests**

Create `tests/visibility/cost-model.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { VISIBILITY_SURFACES } from "../../functions/lib/visibility/surface-registry.mjs";
import {
  assertRunWithinBudgets,
  estimateRunCostMicrorub,
  formatRub,
} from "../../functions/lib/visibility/cost-model.mjs";

test("estimates fixed-request Yandex cost in microrubles", () => {
  assert.equal(estimateRunCostMicrorub({
    surface: VISIBILITY_SURFACES.yandex_gen_search_api_ru,
    observationCount: 60,
  }), 304_800_000);
  assert.equal(formatRub(304_800_000), "304.80 ₽");
});

test("estimates token-priced GigaChat cost in microrubles", () => {
  assert.equal(estimateRunCostMicrorub({
    surface: VISIBILITY_SURFACES.gigachat_api,
    observationCount: 60,
    estimatedTokensPerObservation: 1_500,
  }), 5_850_000);
});

test("rejects invalid cost inputs and unavailable pricing", () => {
  for (const observationCount of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () => estimateRunCostMicrorub({
        surface: VISIBILITY_SURFACES.yandex_gen_search_api_ru,
        observationCount,
      }),
      (error) => error.code === "INVALID_COST_INPUT",
    );
  }
  assert.throws(
    () => estimateRunCostMicrorub({
      surface: VISIBILITY_SURFACES.yandex_gen_search_api_ru,
      observationCount: Number.MAX_SAFE_INTEGER,
    }),
    (error) => error.code === "COST_OVERFLOW",
  );
  assert.throws(
    () => estimateRunCostMicrorub({
      surface: VISIBILITY_SURFACES.gigachat_api,
      observationCount: 10,
    }),
    (error) => error.code === "INVALID_COST_INPUT",
  );
  assert.throws(
    () => estimateRunCostMicrorub({
      surface: VISIBILITY_SURFACES.alice_pro_ui,
      observationCount: 10,
    }),
    (error) => error.code === "PRICING_UNAVAILABLE",
  );
});

test("accepts a run that exactly consumes both budgets", () => {
  assert.deepEqual(assertRunWithinBudgets({
    projectedMicrorub: 200,
    projectSpentMicrorub: 800,
    projectBudgetMicrorub: 1_000,
    globalSpentMicrorub: 800,
    globalBudgetMicrorub: 1_000,
  }), {
    projectedMicrorub: 200,
    projectRemainingMicrorub: 0,
    globalRemainingMicrorub: 0,
  });
});

test("rejects project and global budget overruns separately", () => {
  assert.throws(
    () => assertRunWithinBudgets({
      projectedMicrorub: 201,
      projectSpentMicrorub: 800,
      projectBudgetMicrorub: 1_000,
      globalSpentMicrorub: 0,
      globalBudgetMicrorub: 10_000,
    }),
    (error) => error.code === "PROJECT_BUDGET_EXCEEDED",
  );
  assert.throws(
    () => assertRunWithinBudgets({
      projectedMicrorub: 201,
      projectSpentMicrorub: 0,
      projectBudgetMicrorub: 10_000,
      globalSpentMicrorub: 800,
      globalBudgetMicrorub: 1_000,
    }),
    (error) => error.code === "GLOBAL_BUDGET_EXCEEDED",
  );
});
```

- [ ] **Step 2: Verify failure before implementation**

Run: `node --test tests/visibility/cost-model.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `cost-model.mjs`.

- [ ] **Step 3: Implement cost arithmetic**

Create `functions/lib/visibility/cost-model.mjs`:

```js
import { VisibilityError } from "./visibility-error.mjs";

export const RUB_MICRO = 1_000_000;

function assertNonNegativeSafeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new VisibilityError("INVALID_COST_INPUT", `${name} must be a non-negative safe integer.`, { name });
  }
}

function checkedMultiply(left, right, name) {
  const result = left * right;
  if (!Number.isSafeInteger(result)) {
    throw new VisibilityError("COST_OVERFLOW", `${name} exceeds safe integer precision.`, { name });
  }
  return result;
}

function checkedAdd(left, right, name) {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new VisibilityError("COST_OVERFLOW", `${name} exceeds safe integer precision.`, { name });
  }
  return result;
}

export function estimateRunCostMicrorub({ surface, observationCount, estimatedTokensPerObservation = null }) {
  assertNonNegativeSafeInteger(observationCount, "observationCount");
  if (!surface?.pricing) {
    throw new VisibilityError("PRICING_UNAVAILABLE", "Surface pricing is unavailable.", { surfaceId: surface?.id });
  }
  if (surface.pricing.kind === "per_request") {
    return checkedMultiply(observationCount, surface.pricing.microrubPerRequest, "requestCost");
  }
  if (surface.pricing.kind === "per_1000_tokens") {
    assertNonNegativeSafeInteger(estimatedTokensPerObservation, "estimatedTokensPerObservation");
    const totalTokens = checkedMultiply(observationCount, estimatedTokensPerObservation, "totalTokens");
    const numerator = checkedMultiply(totalTokens, surface.pricing.microrubPer1000Tokens, "tokenCost");
    return Math.ceil(numerator / 1000);
  }
  throw new VisibilityError("UNSUPPORTED_PRICING", "Surface pricing kind is unsupported.", { kind: surface.pricing.kind });
}

export function assertRunWithinBudgets({
  projectedMicrorub,
  projectSpentMicrorub,
  projectBudgetMicrorub,
  globalSpentMicrorub,
  globalBudgetMicrorub,
}) {
  for (const [name, value] of Object.entries({
    projectedMicrorub,
    projectSpentMicrorub,
    projectBudgetMicrorub,
    globalSpentMicrorub,
    globalBudgetMicrorub,
  })) {
    assertNonNegativeSafeInteger(value, name);
  }
  const projectTotalMicrorub = checkedAdd(projectSpentMicrorub, projectedMicrorub, "projectTotalMicrorub");
  const globalTotalMicrorub = checkedAdd(globalSpentMicrorub, projectedMicrorub, "globalTotalMicrorub");
  if (projectTotalMicrorub > projectBudgetMicrorub) {
    throw new VisibilityError("PROJECT_BUDGET_EXCEEDED", "Planned run exceeds the project budget.");
  }
  if (globalTotalMicrorub > globalBudgetMicrorub) {
    throw new VisibilityError("GLOBAL_BUDGET_EXCEEDED", "Planned run exceeds the global budget.");
  }
  return Object.freeze({
    projectedMicrorub,
    projectRemainingMicrorub: projectBudgetMicrorub - projectTotalMicrorub,
    globalRemainingMicrorub: globalBudgetMicrorub - globalTotalMicrorub,
  });
}

export function formatRub(microrub) {
  assertNonNegativeSafeInteger(microrub, "microrub");
  return `${(microrub / RUB_MICRO).toFixed(2)} ₽`;
}
```

- [ ] **Step 4: Run cost tests**

Run: `node --test tests/visibility/cost-model.test.mjs`

Expected: all cost tests PASS.

- [ ] **Step 5: Commit cost controls**

```bash
git add functions/lib/visibility/cost-model.mjs tests/visibility/cost-model.test.mjs
git commit -m "feat: enforce visibility run cost ceilings"
```

---

### Task 4: Produce deterministic, auditable observation plans

**Files:**

- Create: `functions/lib/visibility/run-planner.mjs`
- Create: `tests/visibility/run-planner.test.mjs`

**Interfaces:**

- Produces: `planVisibilityRun(input): Promise<VisibilityRunPlan>`.
- Input uses `projectId`, `panel`, `surfaceId`, `purpose`, `repeatCount`, `scheduledFor`, four budget values, and optional `estimatedTokensPerObservation`.
- Output uses `schemaVersion`, project/panel/methodology/surface identity, normalized ISO schedule, observation count, cost summary, and ordered observation specifications.
- Each observation specification has `sequence`, `promptId`, `language`, `intent`, `repeatOrdinal`, and a 64-character SHA-256 `idempotencyKey`.

- [ ] **Step 1: Write failing run-planner tests**

Create `tests/visibility/run-planner.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { planVisibilityRun } from "../../functions/lib/visibility/run-planner.mjs";

const PANEL = {
  id: "ru-ai-visibility-pilot",
  version: 1,
  methodologyVersion: "0.1",
  prompts: [
    { id: "discovery-01", text: "Какие сервисы отслеживают AI visibility?", language: "ru", intent: "discovery" },
    { id: "comparison-01", text: "Какие AI visibility сервисы лучше?", language: "ru", intent: "comparison" },
  ],
};

const BASE_INPUT = {
  projectId: "blursor-pilot",
  panel: PANEL,
  surfaceId: "yandex_gen_search_api_ru",
  purpose: "forecast",
  repeatCount: 2,
  scheduledFor: "2026-07-21T09:00:00+03:00",
  projectSpentMicrorub: 0,
  projectBudgetMicrorub: 20_000_000_000,
  globalSpentMicrorub: 0,
  globalBudgetMicrorub: 20_000_000_000,
};

test("plans ordered, costed, deterministic Yandex forecast observations", async () => {
  const first = await planVisibilityRun(BASE_INPUT);
  const second = await planVisibilityRun(structuredClone(BASE_INPUT));

  assert.equal(first.observationCount, 4);
  assert.equal(first.scheduledFor, "2026-07-21T06:00:00.000Z");
  assert.equal(first.projectedCost.projectedMicrorub, 20_320_000);
  assert.deepEqual(first.observations.map(({ promptId, repeatOrdinal }) => [promptId, repeatOrdinal]), [
    ["discovery-01", 1],
    ["discovery-01", 2],
    ["comparison-01", 1],
    ["comparison-01", 2],
  ]);
  assert.deepEqual(
    first.observations.map(({ idempotencyKey }) => idempotencyKey),
    second.observations.map(({ idempotencyKey }) => idempotencyKey),
  );
  assert.equal(first.observations.every(({ idempotencyKey }) => /^[a-f0-9]{64}$/.test(idempotencyKey)), true);
  assert.equal(JSON.stringify(first).includes("providerSecret"), false);
  assert.equal(first.surfaceLabel.includes("Alice"), false);
});

test("changes idempotency keys when an identity component changes", async () => {
  const base = await planVisibilityRun(BASE_INPUT);
  const variants = [
    { ...BASE_INPUT, panel: { ...PANEL, version: 2 } },
    { ...BASE_INPUT, scheduledFor: "2026-07-22T09:00:00+03:00" },
    { ...BASE_INPUT, panel: { ...PANEL, prompts: [{ ...PANEL.prompts[0], id: "discovery-02" }] } },
  ];
  for (const input of variants) {
    const changed = await planVisibilityRun(input);
    assert.notEqual(changed.observations[0].idempotencyKey, base.observations[0].idempotencyKey);
  }

  const gigachat = await planVisibilityRun({
    ...BASE_INPUT,
    surfaceId: "gigachat_api",
    estimatedTokensPerObservation: 1_500,
  });
  assert.notEqual(gigachat.observations[0].idempotencyKey, base.observations[0].idempotencyKey);
  assert.notEqual(base.observations[0].idempotencyKey, base.observations[1].idempotencyKey);
});

test("rejects invalid run identity and schedule", async () => {
  await assert.rejects(
    planVisibilityRun({ ...BASE_INPUT, projectId: "" }),
    (error) => error.code === "INVALID_PROJECT_ID",
  );
  await assert.rejects(
    planVisibilityRun({ ...BASE_INPUT, scheduledFor: "not-a-date" }),
    (error) => error.code === "INVALID_SCHEDULE",
  );
});

test("rejects invalid repeats, unauthorized surface, and budget breach", async () => {
  for (const repeatCount of [0, 6, 1.5]) {
    await assert.rejects(
      planVisibilityRun({ ...BASE_INPUT, repeatCount }),
      (error) => error.code === "INVALID_REPEAT_COUNT",
    );
  }
  await assert.rejects(
    planVisibilityRun({ ...BASE_INPUT, surfaceId: "alice_pro_ui" }),
    (error) => error.code === "SURFACE_NOT_AUTHORIZED",
  );
  await assert.rejects(
    planVisibilityRun({ ...BASE_INPUT, projectBudgetMicrorub: 20_319_999 }),
    (error) => error.code === "PROJECT_BUDGET_EXCEEDED",
  );
});
```

- [ ] **Step 2: Verify failure before implementation**

Run: `node --test tests/visibility/run-planner.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `run-planner.mjs`.

- [ ] **Step 3: Implement deterministic hashing and planning**

Create `functions/lib/visibility/run-planner.mjs` with this structure:

```js
import { VisibilityError } from "./visibility-error.mjs";
import { assertVisibilitySurfaceAllowed } from "./surface-registry.mjs";
import { validatePromptPanel } from "./prompt-panel.mjs";
import { assertRunWithinBudgets, estimateRunCostMicrorub } from "./cost-model.mjs";

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeProjectId(value) {
  const projectId = String(value || "").trim();
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(projectId)) {
    throw new VisibilityError("INVALID_PROJECT_ID", "Project ID is invalid.");
  }
  return projectId;
}

function normalizeSchedule(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new VisibilityError("INVALID_SCHEDULE", "Run schedule must be a valid timestamp.");
  }
  return date.toISOString();
}

export async function planVisibilityRun(input) {
  const projectId = normalizeProjectId(input?.projectId);
  const panel = validatePromptPanel(input?.panel);
  const purpose = input?.purpose || "production";
  const surface = assertVisibilitySurfaceAllowed(input?.surfaceId, purpose);
  const repeatCount = input?.repeatCount;
  if (!Number.isInteger(repeatCount) || repeatCount < 1 || repeatCount > 5) {
    throw new VisibilityError("INVALID_REPEAT_COUNT", "Repeat count must be an integer from 1 to 5.");
  }
  const scheduledFor = normalizeSchedule(input?.scheduledFor);
  const observationCount = panel.prompts.length * repeatCount;
  const projectedMicrorub = estimateRunCostMicrorub({
    surface,
    observationCount,
    estimatedTokensPerObservation: input?.estimatedTokensPerObservation ?? null,
  });
  const cost = assertRunWithinBudgets({
    projectedMicrorub,
    projectSpentMicrorub: input.projectSpentMicrorub,
    projectBudgetMicrorub: input.projectBudgetMicrorub,
    globalSpentMicrorub: input.globalSpentMicrorub,
    globalBudgetMicrorub: input.globalBudgetMicrorub,
  });

  const observations = [];
  for (const prompt of panel.prompts) {
    for (let repeatOrdinal = 1; repeatOrdinal <= repeatCount; repeatOrdinal += 1) {
      const keySource = [
        "visibility-plan-v1",
        projectId,
        panel.id,
        panel.version,
        surface.id,
        scheduledFor,
        prompt.id,
        repeatOrdinal,
      ].join("|");
      observations.push(Object.freeze({
        sequence: observations.length + 1,
        promptId: prompt.id,
        language: prompt.language,
        intent: prompt.intent,
        repeatOrdinal,
        idempotencyKey: await sha256Hex(keySource),
      }));
    }
  }

  return Object.freeze({
    schemaVersion: 1,
    projectId,
    panelId: panel.id,
    panelVersion: panel.version,
    methodologyVersion: panel.methodologyVersion,
    surfaceId: surface.id,
    surfaceLabel: surface.publicLabel,
    purpose,
    scheduledFor,
    repeatCount,
    observationCount,
    projectedCost: Object.freeze({ currency: "RUB", ...cost }),
    observations: Object.freeze(observations),
  });
}
```

- [ ] **Step 4: Run planner tests**

Run: `node --test tests/visibility/run-planner.test.mjs`

Expected: all planner tests PASS.

- [ ] **Step 5: Commit deterministic planning**

```bash
git add functions/lib/visibility/run-planner.mjs tests/visibility/run-planner.test.mjs
git commit -m "feat: plan deterministic visibility observations"
```

---

### Task 5: Add a local planning CLI with safe JSON output

**Files:**

- Create: `scripts/plan-visibility-run.mjs`
- Create: `tests/fixtures/visibility-plan-input.json`
- Create: `tests/visibility/plan-cli.test.mjs`

**Interfaces:**

- Consumes: one filesystem path argument pointing to a JSON planning request.
- Produces: normalized plan JSON on stdout and no other stdout content.
- Errors: one JSON object with `ok: false`, safe `code`, and safe `error` on stderr; process exit code 1.

- [ ] **Step 1: Create the valid CLI fixture**

Create `tests/fixtures/visibility-plan-input.json`:

```json
{
  "projectId": "blursor-pilot",
  "surfaceId": "yandex_gen_search_api_ru",
  "purpose": "forecast",
  "repeatCount": 2,
  "scheduledFor": "2026-07-21T09:00:00+03:00",
  "projectSpentMicrorub": 0,
  "projectBudgetMicrorub": 20000000000,
  "globalSpentMicrorub": 0,
  "globalBudgetMicrorub": 20000000000,
  "panel": {
    "id": "ru-ai-visibility-pilot",
    "version": 1,
    "methodologyVersion": "0.1",
    "prompts": [
      {
        "id": "discovery-01",
        "text": "Какие сервисы помогают проверить видимость бренда в ответах ИИ?",
        "language": "ru",
        "intent": "discovery"
      },
      {
        "id": "comparison-01",
        "text": "Какие инструменты AI visibility подходят российской компании?",
        "language": "ru",
        "intent": "comparison"
      }
    ]
  }
}
```

- [ ] **Step 2: Write failing CLI tests**

Create `tests/visibility/plan-cli.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const scriptPath = join(repoRoot, "scripts/plan-visibility-run.mjs");
const fixturePath = join(repoRoot, "tests/fixtures/visibility-plan-input.json");

const run = (args) => spawnSync(process.execPath, [scriptPath, ...args], {
  cwd: repoRoot,
  encoding: "utf8",
});

test("prints one valid JSON plan", () => {
  const result = run([fixturePath]);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.observationCount, 4);
  assert.equal(plan.projectedCost.projectedMicrorub, 20_320_000);
  assert.equal(plan.observations.length, 4);
});

test("requires one input path", () => {
  const result = run([]);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).code, "INPUT_PATH_REQUIRED");
  assert.equal(result.stdout, "");
});

test("returns a safe malformed-JSON error", async () => {
  const dir = await mkdtemp(join(tmpdir(), "blursor-plan-"));
  const path = join(dir, "bad.json");
  await writeFile(path, "{bad", "utf8");
  const result = run([path]);
  const error = JSON.parse(result.stderr);
  assert.equal(result.status, 1);
  assert.equal(error.code, "INVALID_INPUT_JSON");
  assert.equal(result.stderr.includes("stack"), false);
  assert.equal(result.stdout, "");
});

test("does not leak input secrets when a surface is unauthorized", async () => {
  const dir = await mkdtemp(join(tmpdir(), "blursor-plan-"));
  const input = JSON.parse(await readFile(fixturePath, "utf8"));
  input.surfaceId = "alice_pro_ui";
  input.providerSecret = "must-not-appear";
  const path = join(dir, "unauthorized.json");
  await writeFile(path, JSON.stringify(input), "utf8");
  const result = run([path]);
  const error = JSON.parse(result.stderr);
  assert.equal(result.status, 1);
  assert.equal(error.code, "SURFACE_NOT_AUTHORIZED");
  assert.equal(result.stderr.includes("must-not-appear"), false);
  assert.equal(result.stderr.includes("providerSecret"), false);
  assert.equal(result.stderr.includes("stack"), false);
});
```

- [ ] **Step 3: Verify CLI test failure**

Run: `node --test tests/visibility/plan-cli.test.mjs`

Expected: FAIL because `scripts/plan-visibility-run.mjs` does not exist.

- [ ] **Step 4: Implement the CLI**

Create `scripts/plan-visibility-run.mjs` using `readFile` from `node:fs/promises`, `resolve` from `node:path`, `VisibilityError`, and `planVisibilityRun`. Keep all normal output as one pretty-printed plan. Convert unexpected failures to `INTERNAL_PLANNING_ERROR` without a stack or raw input.

The error boundary must be:

```js
function fail(code, message) {
  process.stderr.write(`${JSON.stringify({ ok: false, code, error: message })}\n`);
  process.exitCode = 1;
}

const inputPath = process.argv[2];
if (!inputPath) {
  fail("INPUT_PATH_REQUIRED", "Pass one visibility plan JSON file.");
} else {
  try {
    let input;
    try {
      input = JSON.parse(await readFile(resolve(inputPath), "utf8"));
    } catch {
      throw new VisibilityError("INVALID_INPUT_JSON", "Visibility plan input must be valid JSON.");
    }
    const plan = await planVisibilityRun(input);
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  } catch (error) {
    if (error instanceof VisibilityError) fail(error.code, error.message);
    else fail("INTERNAL_PLANNING_ERROR", "Visibility planning failed.");
  }
}
```

- [ ] **Step 5: Run CLI tests and one manual smoke command**

Run:

```bash
node --test tests/visibility/plan-cli.test.mjs
node scripts/plan-visibility-run.mjs tests/fixtures/visibility-plan-input.json
```

Expected: tests PASS; smoke output contains `"observationCount": 4`, `"projectedMicrorub": 20320000`, and four 64-character idempotency keys.

- [ ] **Step 6: Commit the CLI**

```bash
git add scripts/plan-visibility-run.mjs tests/fixtures/visibility-plan-input.json tests/visibility/plan-cli.test.mjs
git commit -m "feat: add local visibility run planner"
```

---

### Task 6: Prevent rights-document drift and wire repository verification

**Files:**

- Create: `tests/visibility/rights-doc-drift.test.mjs`
- Modify: `package.json`
- Modify: `docs/ops/provider-rights-register.md`

**Interfaces:**

- Consumes: `VISIBILITY_SURFACES` and the Markdown rights register.
- Produces: a test failure whenever a surface ID or rights state in executable code is absent from the register.

- [ ] **Step 1: Write the drift test**

Create `tests/visibility/rights-doc-drift.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { VISIBILITY_SURFACES } from "../../functions/lib/visibility/surface-registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const registerPath = resolve(here, "../../docs/ops/provider-rights-register.md");

function assertRegistryAligned(markdown) {
  const lines = markdown.split("\n");
  for (const surface of Object.values(VISIBILITY_SURFACES)) {
    const row = lines.find((line) => line.includes(`| \`${surface.id}\` |`));
    assert.ok(row, `missing rights row for ${surface.id}`);
    assert.ok(row.includes(`| \`${surface.rightsState}\``), `wrong rights state for ${surface.id}`);
  }
  const normalized = markdown.replaceAll("`", "").replace(/\s+/g, " ");
  assert.ok(normalized.includes("Only production_authorized surfaces may be scheduled or included in paid reports"));
}

test("executable surface states match the rights register", async () => {
  assertRegistryAligned(await readFile(registerPath, "utf8"));
});

test("drift checker fails when a registered surface disappears", async () => {
  const markdown = await readFile(registerPath, "utf8");
  const damaged = markdown.replace("`yandex_gen_search_api_ru`", "`yandex_gen_search_api_ru_drifted`");
  assert.throws(() => assertRegistryAligned(damaged), /missing rights row/);
});
```

- [ ] **Step 2: Run the drift test against the current register**

Run: `node --test tests/visibility/rights-doc-drift.test.mjs`

Expected: PASS when all seven executable IDs and exact rights states are represented. A failure identifies a real code/document drift that must be corrected before the branch proceeds.

- [ ] **Step 3: Add the targeted package command**

Keep the existing repository test command and add:

```json
{
  "scripts": {
    "test": "node --test",
    "test:visibility": "node --test tests/visibility"
  }
}
```

- [ ] **Step 4: Run targeted and full verification**

Run:

```bash
npm run test:visibility
npm test
git diff --check
```

Expected: visibility tests PASS; the complete report-foundation and visibility suites PASS; no whitespace errors.

- [ ] **Step 5: Commit verification wiring**

```bash
git add tests/visibility/rights-doc-drift.test.mjs package.json docs/ops/provider-rights-register.md
git commit -m "test: keep visibility rights controls aligned"
```

---

### Task 7: Document the foundation handoff and stop before provider work

**Files:**

- Create: `docs/visibility-run-planner-runbook.md`

**Interfaces:**

- Documents the exact local command, input contract, output contract, error codes, rights-state change process, pricing review, and the boundary before provider execution.

- [ ] **Step 1: Write the runbook**

Create `docs/visibility-run-planner-runbook.md` with this content:

````markdown
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
| `openai_responses_web_search` | `disabled` | none |
| `alice_ai_consumer_ui` | `research_only` | research |
| `alice_pro_ui` | `research_only` | research |
| `rush_alice_supplier` | `disabled` | none |

Planning permission does not itself authorize a provider call. Production adapters, credentials, contracts, and deployment remain separate gates.

## Money units

`1 RUB = 1,000,000 microrubles`.

- Yandex generative Search API: `5.08 ₽` per request = `5,080,000` microrubles per request, effective 2026-07-20.
- GigaChat Lite synchronous API: `0.065 ₽` per 1,000 tokens = `65,000` microrubles per 1,000 tokens, effective 2026-07-20.

Update a price only after checking the current primary pricing page. Change the amount and `effectiveDate` together, update the rights register evidence date, run the full test suite, and commit the evidence-backed change.

## Rights-state changes

1. Add the dated source, agreement conclusion, allowed surface, volume, retention, and downstream-use rights to `docs/ops/provider-rights-register.md`.
2. Keep confidential correspondence and contracts outside the deployed repository.
3. Change the exact `rightsState` and `killSwitch` in `functions/lib/visibility/surface-registry.mjs`.
4. Add or update tests that demonstrate the newly permitted and still-forbidden purposes.
5. Run `npm test` and review the rights-document drift test.
6. Obtain the separate production approval required by the design.

## Safe error codes

- `UNKNOWN_SURFACE`
- `INVALID_PURPOSE`
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

The next reviewed plan may add a private Supabase schema and the Yandex generative Search API adapter. It must preserve exact surface identity, server-only credentials, immutable observations, the rights gate, and cost ceilings.

Stop before applying a migration, adding a credential, activating n8n, importing client data, deploying a preview, or merging to `main`.
````

- [ ] **Step 2: Verify commands and document references**

Run:

```bash
npm run test:visibility
node scripts/plan-visibility-run.mjs tests/fixtures/visibility-plan-input.json > /tmp/blursor-visibility-plan.json
node --input-type=module -e 'const p=JSON.parse(await (await import("node:fs/promises")).readFile("/tmp/blursor-visibility-plan.json","utf8")); if(p.observationCount!==4) process.exit(1)'
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 3: Commit the runbook**

```bash
git add docs/visibility-run-planner-runbook.md
git commit -m "docs: add visibility planner runbook"
```

---

## Self-Review Checklist

Before reporting completion:

1. Match every surface ID and rights state against `docs/ops/provider-rights-register.md`.
2. Confirm no code path calls a provider, Supabase, n8n, or a browser interface.
3. Confirm cost calculations use microrubles and safe integers.
4. Confirm the Yandex label contains `generative Search API` and never claims Alice parity.
5. Inspect every error branch and runbook section for a concrete code, message, command, and expected outcome; reject empty stubs or generic prose.

6. Run `npm test` and `git diff --check`.
7. Review `git diff main...HEAD` and separate pre-existing report-foundation changes from this foundation.
8. Stop. The Yandex adapter, database schema, scheduler, credentials, and client reporting require their own plans and approval gates.
