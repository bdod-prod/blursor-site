# Investigation-First Dossier Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a provider-disabled, synthetic-evidence BLURSOR investigation that validates the Kamran v1 scope, preserves exact observation provenance, constructs a reviewable evidence trace, and renders the approved investigation dossier hierarchy.

**Architecture:** Extend the existing dependency-free visibility planning library with a separate `investigation` domain. Pure modules validate v1 scope, observations, evidence, case transitions, and dossier view models; a feature-gated synthetic Kamran case exercises the complete flow through private Cloudflare Pages API and page handlers. No provider adapter, persistence layer, or production scheduler is added in this milestone.

**Tech Stack:** Node.js 20+, JavaScript ES modules, Node's built-in test runner, Cloudflare Pages Functions, static HTML/CSS/JavaScript, no third-party packages.

## Global Constraints

- Product language is `investigation`, `diagnostic`, `dossier`, `observation`, `evidence trace`, `hypothesis`, `alternative`, `next test`, and `unresolved`; do not present BLURSOR as a tracker, ranking product, or composite score.
- The v1 scope is exactly one project, 15 prompts, English, United States context, collection every three days, and three separately labelled surfaces.
- The two OpenAI API surface identities are `openai_responses_web_search_auto` and `openai_responses_web_search_required`; neither is ChatGPT consumer-interface data.
- No real consumer-web supplier exists in executable configuration until a later supplier-selection review. Synthetic consumer-web evidence must use `collectionClass: "synthetic_fixture"` and a `synthetic_` surface ID.
- Provider-supplied rationale is optional, separately labelled, and insufficient by itself to establish BLURSOR's diagnostic rationale.
- Inline citations and provider-returned source lists are separate evidence types.
- Missing answers, refusals, collector failures, and absence of a brand mention are separate states.
- `unresolved` is a valid investigation result.
- No patient-identifiable, patient-derived, or confidential medical data may appear in prompts, fixtures, source evidence, or screenshots.
- Keep Otterly exports and comparison data outside the production and synthetic dossier stores.
- Do not add provider calls, credentials, supplier signup, database migrations, n8n workflows, live scheduling, deployment, or a merge to `main`.
- The synthetic dossier is disabled unless `INVESTIGATION_DEMO_ENABLED` is exactly `true` and is served with private, no-store, noindex headers.
- Use test-driven development and commit each task independently.

---

## File Structure

### Documentation

- Create `docs/methodology/ai-visibility-investigation-v0.2.md`: investigation-first methodology and public claim limits.
- Modify `docs/methodology/ai-visibility-tracking-v0.1.md`: historical supersession notice only.
- Modify `docs/superpowers/specs/2026-07-20-licensed-core-visibility-tracker-design.md`: product-framing supersession notice.
- Modify `docs/ops/provider-rights-register.md`: replace the one generic OpenAI row with the two disabled API experiments.
- Modify `docs/visibility-run-planner-runbook.md`: list the two exact disabled API surfaces.

### Investigation domain

- Create `functions/lib/investigation/v1-scope.mjs`: frozen Kamran v1 constraints and observation-volume calculation.
- Create `functions/lib/investigation/observation-model.mjs`: immutable normalized observation contract.
- Create `functions/lib/investigation/answer-extractor.mjs`: deterministic claim, alias, citation, and source extraction.
- Create `functions/lib/investigation/evidence-trace.mjs`: evidence-item and relation validation plus evidence-level rules.
- Create `functions/lib/investigation/case-model.mjs`: investigation lifecycle and append-only review transitions.
- Create `functions/lib/investigation/dossier-model.mjs`: reviewed client-safe view model in the approved hierarchy.
- Create `functions/lib/investigation/kamran-synthetic-demo.mjs`: generated 15-prompt, three-surface, baseline/follow-up fixture.
- Create `functions/lib/investigation/investigation-handlers.mjs`: feature-gated private JSON and page handlers.

### Runtime surfaces

- Modify `functions/lib/visibility/surface-registry.mjs`: two exact disabled OpenAI API surfaces.
- Create `functions/api/investigations/[id].js`: private dossier JSON endpoint.
- Create `functions/i/[id].js`: private dossier page endpoint.
- Create `investigation-dossier.html`: dossier shell and renderer.

### Tests

- Create `tests/investigation/methodology-language.test.mjs`.
- Create `tests/investigation/v1-scope.test.mjs`.
- Create `tests/investigation/observation-model.test.mjs`.
- Create `tests/investigation/answer-extractor.test.mjs`.
- Create `tests/investigation/evidence-trace.test.mjs`.
- Create `tests/investigation/case-model.test.mjs`.
- Create `tests/investigation/dossier-model.test.mjs`.
- Create `tests/investigation/investigation-handlers.test.mjs`.
- Create `tests/investigation/dossier-ui.test.mjs`.
- Modify `tests/visibility/surface-registry.test.mjs`.
- Modify `package.json`: add `test:investigation`.

---

### Task 1: Make Investigation-First Terminology Authoritative

**Files:**

- Create: `docs/methodology/ai-visibility-investigation-v0.2.md`
- Modify: `docs/methodology/ai-visibility-tracking-v0.1.md:1-4`
- Modify: `docs/superpowers/specs/2026-07-20-licensed-core-visibility-tracker-design.md:1-8`
- Create: `tests/investigation/methodology-language.test.mjs`
- Modify: `package.json`

**Interfaces:**

- Produces: one current methodology named `BLURSOR AI Visibility Investigation Methodology v0.2`.
- Produces: `npm run test:investigation`, used by every later task.
- Preserves: the two older documents as dated historical records rather than silently rewriting them.

- [ ] **Step 1: Write the failing terminology test**

Create `tests/investigation/methodology-language.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const current = new URL("../../docs/methodology/ai-visibility-investigation-v0.2.md", import.meta.url);
const historical = new URL("../../docs/methodology/ai-visibility-tracking-v0.1.md", import.meta.url);
const licensedCore = new URL("../../docs/superpowers/specs/2026-07-20-licensed-core-visibility-tracker-design.md", import.meta.url);

test("current methodology is investigation-first and narrows the why claim", async () => {
  const markdown = await readFile(current, "utf8");
  assert.match(markdown, /^# BLURSOR AI Visibility Investigation Methodology v0\.2/m);
  assert.match(markdown, /reconstructs the observable evidence path/i);
  assert.match(markdown, /does not claim access to a model's complete hidden reasoning/i);
  assert.match(markdown, /unresolved is a valid result/i);
  assert.doesNotMatch(markdown, /universal visibility score/i);
});

test("historical tracker documents point to the approved investigation design", async () => {
  const [methodology, design] = await Promise.all([
    readFile(historical, "utf8"),
    readFile(licensedCore, "utf8"),
  ]);
  for (const markdown of [methodology, design]) {
    assert.match(markdown, /2026-07-22-investigation-first-ai-visibility-diagnostics-design\.md/);
    assert.match(markdown, /historical/i);
  }
});
```

- [ ] **Step 2: Add the investigation test command and verify RED**

Add this script to `package.json` without changing the existing scripts:

```json
"test:investigation": "node --test tests/investigation"
```

Run:

```bash
npm run test:investigation
```

Expected: FAIL because `ai-visibility-investigation-v0.2.md` does not exist and the historical notices are absent.

- [ ] **Step 3: Write the current methodology and historical notices**

Create `docs/methodology/ai-visibility-investigation-v0.2.md` with these exact required sections and claims:

```markdown
# BLURSOR AI Visibility Investigation Methodology v0.2

Status: internal validation draft; do not publish before provider-language, evidence, and legal review
Effective date: not yet active

## What BLURSOR investigates

BLURSOR reconstructs the observable evidence path behind sampled AI answers. It records exact surfaces, prompts, answers, citations, returned sources, website evidence, repeated patterns, analyst hypotheses, credible alternatives, interventions, and comparable follow-up observations. It does not claim access to a model's complete hidden reasoning or guarantee what every user will see.

## Investigation unit

The primary unit is a bounded question, not a score. Every investigation states its project, prompt-panel version, exact surfaces, language, location context, collection windows, evidence state, and next test.

## Evidence levels

1. Single observation.
2. Repeated pattern.
3. Observable evidence link.
4. Corroborated hypothesis with alternatives reviewed.
5. Intervention and comparable follow-up.

`Unresolved` is a valid result at every stage. A higher evidence level permits stronger wording but does not erase uncertainty or establish causality automatically.

## Observation controls

Results from consumer interfaces, official APIs, native dashboards, and search-result features remain separate surfaces. Missing answers, refusals, collection failures, and absence of a brand mention remain separate states. Inline citations remain distinct from a provider-returned source list.

## Provider-supplied rationale

When a provider returns a retainable reasoning summary, rationale, or tool trace, BLURSOR stores it separately and labels it as provider-supplied rationale. It is optional supporting evidence and never substitutes for BLURSOR's independently constructed evidence trace.

## Diagnostic review

A reviewed hypothesis identifies supporting evidence, contradictory evidence, inference steps, credible alternatives, confidence, and a falsifier. BLURSOR uses `observed`, `repeated`, `consistent with`, and `likely` according to the evidence level. It uses `caused` only when the research design can support that claim.

## V1 case boundary

The first case is one authorized Dr. Kamran Aghayev project using a frozen 15-prompt English panel, United States context, and collection every three days. OpenAI API experiments and a logged-out consumer-web sample remain separate. Prompts contain no patient-identifiable, patient-derived, or confidential medical information.

## Independence and limitations

BLURSOR is independent and is not affiliated with or endorsed by a measured provider unless a specific written partnership says otherwise. Prompt panels are samples. Model, retrieval, location, account state, interface, and time can change results. A citation shows an observable source relationship, not necessarily endorsement or cause.
```

Add this notice immediately below each historical document's title:

```markdown
> Historical document. Product framing and v1 presentation are superseded by `2026-07-22-investigation-first-ai-visibility-diagnostics-design.md`. Its observation, rights, budget, privacy, and surface-separation controls remain applicable where the newer design does not replace them.
```

- [ ] **Step 4: Run terminology tests and full tests**

Run:

```bash
npm run test:investigation
npm test
git diff --check
```

Expected: terminology tests PASS; the full suite remains green; no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add package.json docs/methodology/ai-visibility-investigation-v0.2.md docs/methodology/ai-visibility-tracking-v0.1.md docs/superpowers/specs/2026-07-20-licensed-core-visibility-tracker-design.md tests/investigation/methodology-language.test.mjs
git commit -m "docs: make investigation methodology authoritative"
```

---

### Task 2: Encode the Exact V1 Scope and API Surface Identities

**Files:**

- Create: `functions/lib/investigation/v1-scope.mjs`
- Create: `tests/investigation/v1-scope.test.mjs`
- Modify: `functions/lib/visibility/surface-registry.mjs`
- Modify: `tests/visibility/surface-registry.test.mjs`
- Modify: `docs/ops/provider-rights-register.md`
- Modify: `docs/visibility-run-planner-runbook.md`

**Interfaces:**

- Consumes: `validatePromptPanel(input)` from `functions/lib/visibility/prompt-panel.mjs`.
- Produces: `V1_INVESTIGATION_SCOPE`.
- Produces: `validateV1InvestigationScope(input) -> frozen scope`.
- Produces: `calculateV1ObservationVolume({ cycles, surfaceCount }) -> integer`.
- Produces: two disabled OpenAI surface records; no provider adapter or price.

- [ ] **Step 1: Write failing v1-scope tests**

Create `tests/investigation/v1-scope.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  V1_INVESTIGATION_SCOPE,
  calculateV1ObservationVolume,
  validateV1InvestigationScope,
} from "../../functions/lib/investigation/v1-scope.mjs";

const prompts = Array.from({ length: 15 }, (_, index) => ({
  id: `prompt-${String(index + 1).padStart(2, "0")}`,
  text: `English public-brand question ${index + 1}?`,
  language: "en",
  intent: index < 6 ? "discovery" : index < 10 ? "comparison" : index < 13 ? "validation" : "action",
}));

function validInput() {
  return {
    projectId: "kamran-aghayev",
    location: "US",
    cadenceDays: 3,
    panel: { id: "kamran-us-en-v1", version: 1, methodologyVersion: "0.2", prompts },
  };
}

test("validates and freezes the exact Kamran v1 scope", () => {
  const scope = validateV1InvestigationScope(validInput());
  assert.equal(scope.projectId, "kamran-aghayev");
  assert.equal(scope.location, "US");
  assert.equal(scope.cadenceDays, 3);
  assert.equal(scope.panel.prompts.length, 15);
  assert.equal(Object.isFrozen(scope), true);
  assert.equal(Object.isFrozen(scope.panel), true);
});

test("rejects scope drift", () => {
  assert.throws(() => validateV1InvestigationScope({ ...validInput(), location: "GB" }), (error) => error.code === "V1_LOCATION_MISMATCH");
  assert.throws(() => validateV1InvestigationScope({ ...validInput(), cadenceDays: 1 }), (error) => error.code === "V1_CADENCE_MISMATCH");
  const short = validInput();
  short.panel = { ...short.panel, prompts: short.panel.prompts.slice(0, 14) };
  assert.throws(() => validateV1InvestigationScope(short), (error) => error.code === "V1_PROMPT_COUNT_MISMATCH");
  const russian = validInput();
  russian.panel = { ...russian.panel, prompts: russian.panel.prompts.map((prompt, index) => index === 0 ? { ...prompt, language: "ru" } : prompt) };
  assert.throws(() => validateV1InvestigationScope(russian), (error) => error.code === "V1_LANGUAGE_MISMATCH");
});

test("calculates the approved collection volume", () => {
  assert.deepEqual(V1_INVESTIGATION_SCOPE.apiSurfaceIds, [
    "openai_responses_web_search_auto",
    "openai_responses_web_search_required",
  ]);
  assert.equal(V1_INVESTIGATION_SCOPE.consumerSurfaceStatus, "supplier_pending");
  assert.equal(V1_INVESTIGATION_SCOPE.plannedSurfaceCount, 3);
  assert.equal(calculateV1ObservationVolume({ cycles: 1, surfaceCount: 3 }), 45);
  assert.equal(calculateV1ObservationVolume({ cycles: 10, surfaceCount: 3 }), 450);
  assert.throws(() => calculateV1ObservationVolume({ cycles: 0, surfaceCount: 3 }), /positive integers/i);
});
```

Update `tests/visibility/surface-registry.test.mjs` so the expected registry contains both exact OpenAI IDs and no generic one:

```js
assert.ok(VISIBILITY_SURFACES.openai_responses_web_search_auto);
assert.ok(VISIBILITY_SURFACES.openai_responses_web_search_required);
assert.equal(VISIBILITY_SURFACES.openai_responses_web_search, undefined);
for (const id of ["openai_responses_web_search_auto", "openai_responses_web_search_required"]) {
  assert.equal(VISIBILITY_SURFACES[id].rightsState, "disabled");
  assert.equal(VISIBILITY_SURFACES[id].killSwitch, true);
  assert.throws(() => assertVisibilitySurfaceAllowed(id, "research"), (error) => error.code === "SURFACE_DISABLED");
}
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test tests/investigation/v1-scope.test.mjs tests/visibility/surface-registry.test.mjs tests/visibility/rights-doc-drift.test.mjs
```

Expected: FAIL because the scope module and exact surface IDs do not exist.

- [ ] **Step 3: Implement the v1 scope validator**

Create `functions/lib/investigation/v1-scope.mjs`:

```js
import { validatePromptPanel } from "../visibility/prompt-panel.mjs";
import { VisibilityError } from "../visibility/visibility-error.mjs";

export const V1_INVESTIGATION_SCOPE = Object.freeze({
  projectId: "kamran-aghayev",
  promptCount: 15,
  language: "en",
  location: "US",
  cadenceDays: 3,
  plannedSurfaceCount: 3,
  apiSurfaceIds: Object.freeze([
    "openai_responses_web_search_auto",
    "openai_responses_web_search_required",
  ]),
  consumerSurfaceStatus: "supplier_pending",
});

export function validateV1InvestigationScope(input) {
  const projectId = String(input?.projectId || "").trim();
  if (projectId !== V1_INVESTIGATION_SCOPE.projectId) {
    throw new VisibilityError("V1_PROJECT_MISMATCH", "The v1 project must be kamran-aghayev.");
  }
  if (input?.location !== V1_INVESTIGATION_SCOPE.location) {
    throw new VisibilityError("V1_LOCATION_MISMATCH", "The v1 location must be US.");
  }
  if (input?.cadenceDays !== V1_INVESTIGATION_SCOPE.cadenceDays) {
    throw new VisibilityError("V1_CADENCE_MISMATCH", "The v1 cadence must be every three days.");
  }
  const panel = validatePromptPanel(input?.panel);
  if (panel.prompts.length !== V1_INVESTIGATION_SCOPE.promptCount) {
    throw new VisibilityError("V1_PROMPT_COUNT_MISMATCH", "The v1 panel must contain exactly 15 prompts.");
  }
  if (panel.prompts.some(({ language }) => language !== V1_INVESTIGATION_SCOPE.language)) {
    throw new VisibilityError("V1_LANGUAGE_MISMATCH", "Every v1 prompt must be English.");
  }
  return Object.freeze({ projectId, location: input.location, cadenceDays: input.cadenceDays, panel });
}

export function calculateV1ObservationVolume({ cycles, surfaceCount }) {
  if (!Number.isInteger(cycles) || cycles < 1 || !Number.isInteger(surfaceCount) || surfaceCount < 1) {
    throw new VisibilityError("INVALID_V1_VOLUME", "Cycles and surface count must be positive integers.");
  }
  return V1_INVESTIGATION_SCOPE.promptCount * cycles * surfaceCount;
}
```

- [ ] **Step 4: Replace the generic OpenAI registry entry with two disabled experiments**

In `functions/lib/visibility/surface-registry.mjs`, replace the `openai_responses_web_search` block with:

```js
  defineSurface({
    id: "openai_responses_web_search_auto",
    publicLabel: "OpenAI Responses API · web search auto",
    collectionClass: "official_api",
    rightsState: "disabled",
    killSwitch: true,
    pricing: null,
  }),
  defineSurface({
    id: "openai_responses_web_search_required",
    publicLabel: "OpenAI Responses API · web search required",
    collectionClass: "official_api",
    rightsState: "disabled",
    killSwitch: true,
    pricing: null,
  }),
```

Replace the one OpenAI row in both `docs/ops/provider-rights-register.md` and `docs/visibility-run-planner-runbook.md` with two rows. Both rows must say `disabled`, distinguish natural search choice from required retrieval, state that they are API experiments rather than ChatGPT, and require model/configuration, cost, data-handling, and label review before activation.

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
node --test tests/investigation/v1-scope.test.mjs tests/visibility/surface-registry.test.mjs tests/visibility/rights-doc-drift.test.mjs
npm test
git diff --check
```

Expected: all tests PASS and no rights-document drift.

- [ ] **Step 6: Commit**

```bash
git add functions/lib/investigation/v1-scope.mjs functions/lib/visibility/surface-registry.mjs tests/investigation/v1-scope.test.mjs tests/visibility/surface-registry.test.mjs docs/ops/provider-rights-register.md docs/visibility-run-planner-runbook.md
git commit -m "feat: encode investigation v1 scope"
```

---

### Task 3: Normalize Immutable Observations Without Calling Providers

**Files:**

- Create: `functions/lib/investigation/observation-model.mjs`
- Create: `tests/investigation/observation-model.test.mjs`

**Interfaces:**

- Consumes: `getVisibilitySurface(surfaceId)` for non-synthetic surface identity.
- Produces: `normalizeObservation(input) -> deeply frozen observation`.
- Produces: `OBSERVATION_STATES` and `COLLECTION_CLASSES`.
- Preserves citations as `{ id, url, title, start, end }` and sources as `{ id, url, title }`.

- [ ] **Step 1: Write failing observation contract tests**

Create `tests/investigation/observation-model.test.mjs` with one complete successful observation and focused invalid cases:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { normalizeObservation } from "../../functions/lib/investigation/observation-model.mjs";

function validObservation(overrides = {}) {
  return {
    id: "obs-001",
    investigationId: "kamran-investigation-01",
    promptId: "prompt-01",
    panelVersion: 1,
    runId: "baseline-2026-07-22",
    repeatOrdinal: 1,
    state: "success",
    surfaceId: "openai_responses_web_search_auto",
    surfaceLabel: "OpenAI Responses API · web search auto",
    collectionClass: "official_api",
    synthetic: false,
    scheduledAt: "2026-07-22T09:00:00.000Z",
    collectedAt: "2026-07-22T09:00:02.000Z",
    latencyMs: 2000,
    retryCount: 0,
    cost: { currency: "USD", microAmount: 0 },
    requestId: "req_demo",
    responseId: "resp_demo",
    responseHash: "68ed3796366768f986f8d7196479e15063b9814473578b2212c2fb6ec21146a6",
    requestConfig: {
      promptText: "Who are leading minimally invasive spine surgeons in the United States?",
      wrapper: "Answer for a US audience.",
      instructions: "Use public information only.",
      language: "en",
      country: "US",
      toolChoice: "auto",
      searchMode: "auto",
      liveAccess: true,
      requestedSourceInclusion: true,
      deviceClass: "server",
      authState: "api_account",
      conversationState: "fresh",
      modelLabel: "fixture-model",
    },
    rawAnswer: "Dr. Example is frequently mentioned.[1]",
    citations: [{ id: "citation-1", url: "https://example.org/profile?utm=drop#bio", title: "Profile", start: 35, end: 38 }],
    sources: [{ id: "source-1", url: "https://example.org/directory", title: "Directory" }],
    providerRationale: null,
    featureFlags: { searchUsed: true },
    ...overrides,
  };
}

test("normalizes and deeply freezes a complete observation", () => {
  const observation = normalizeObservation(validObservation());
  assert.equal(observation.citations[0].url, "https://example.org/profile");
  assert.equal(observation.sources[0].url, "https://example.org/directory");
  assert.equal(Object.isFrozen(observation), true);
  assert.equal(Object.isFrozen(observation.requestConfig), true);
  assert.equal(Object.isFrozen(observation.citations), true);
  assert.equal(observation.providerRationale, null);
  assert.equal(observation.responseHash.length, 64);
});

test("keeps provider rationale optional and separately labelled", () => {
  const observation = normalizeObservation(validObservation({
    providerRationale: { kind: "reasoning_summary", text: "Search results emphasized directories.", retentionStatus: "fixture_only" },
  }));
  assert.deepEqual(observation.providerRationale, {
    kind: "reasoning_summary",
    text: "Search results emphasized directories.",
    retentionStatus: "fixture_only",
    provenance: "provider_supplied",
  });
});

test("permits synthetic consumer evidence only under an explicit fixture identity", () => {
  const observation = normalizeObservation(validObservation({
    surfaceId: "synthetic_chatgpt_web_logged_out_us",
    surfaceLabel: "Synthetic ChatGPT web · logged-out US fixture",
    collectionClass: "synthetic_fixture",
    synthetic: true,
    requestId: null,
    responseId: null,
  }));
  assert.equal(observation.synthetic, true);
  assert.throws(() => normalizeObservation({ ...validObservation(), surfaceId: "synthetic_fake", synthetic: false }), /unknown visibility surface/i);
});

test("does not collapse refusal, failure, and brand absence", () => {
  const refused = normalizeObservation(validObservation({ state: "refused", rawAnswer: "I cannot answer that.", citations: [], sources: [] }));
  const failed = normalizeObservation(validObservation({ state: "failed", rawAnswer: null, citations: [], sources: [], failure: { code: "TRANSPORT", message: "Collection failed." } }));
  const absence = normalizeObservation(validObservation({ rawAnswer: "Other surgeons were listed.", citations: [], sources: [] }));
  assert.equal(refused.state, "refused");
  assert.equal(failed.state, "failed");
  assert.equal(absence.state, "success");
  assert.throws(() => normalizeObservation(validObservation({ state: "failed", rawAnswer: "should not exist" })), /failed observation/i);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/investigation/observation-model.test.mjs
```

Expected: FAIL because `observation-model.mjs` does not exist.

- [ ] **Step 3: Implement the normalized observation model**

Create `functions/lib/investigation/observation-model.mjs` with these exact exports and rules:

```js
import { getVisibilitySurface } from "../visibility/surface-registry.mjs";
import { VisibilityError } from "../visibility/visibility-error.mjs";

export const OBSERVATION_STATES = Object.freeze(["success", "refused", "failed"]);
export const COLLECTION_CLASSES = Object.freeze(["official_api", "supplier", "consumer_interface", "synthetic_fixture"]);

const required = (value, code, message) => {
  const text = String(value ?? "").trim();
  if (!text) throw new VisibilityError(code, message);
  return text;
};

const timestamp = (value, field) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new VisibilityError("INVALID_OBSERVATION_TIMESTAMP", `${field} must be a valid timestamp.`);
  return date.toISOString();
};

const normalizeCost = (input) => {
  if (input == null) return null;
  const currency = String(input.currency || "");
  if (!/^[A-Z]{3}$/.test(currency)) throw new VisibilityError("INVALID_COST_CURRENCY", "Cost currency must be a three-letter code.");
  if (!Number.isSafeInteger(input.microAmount) || input.microAmount < 0) throw new VisibilityError("INVALID_COST_AMOUNT", "Cost microAmount must be a non-negative safe integer.");
  return { currency, microAmount: input.microAmount };
};

const url = (value) => {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  parsed.username = "";
  parsed.password = "";
  parsed.search = "";
  parsed.hash = "";
  return parsed.href;
};

const normalizeLinks = (items, citation) => Object.freeze((items || []).map((item, index) => {
  try {
    return Object.freeze({
      id: required(item?.id, "INVALID_EVIDENCE_LINK", "Evidence link ID is required."),
      url: url(item?.url),
      title: String(item?.title || "").trim() || null,
      ...(citation ? { start: Number.isInteger(item?.start) ? item.start : null, end: Number.isInteger(item?.end) ? item.end : null } : {}),
    });
  } catch (error) {
    if (error instanceof VisibilityError) throw error;
    throw new VisibilityError("INVALID_EVIDENCE_URL", "Evidence URLs must use http or https.", { index });
  }
}));

const freeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
};

export function normalizeObservation(input) {
  const state = required(input?.state, "INVALID_OBSERVATION_STATE", "Observation state is required.");
  if (!OBSERVATION_STATES.includes(state)) throw new VisibilityError("INVALID_OBSERVATION_STATE", "Unknown observation state.");
  const synthetic = input?.synthetic === true;
  const surfaceId = required(input?.surfaceId, "INVALID_OBSERVATION_SURFACE", "Surface ID is required.");
  const collectionClass = required(input?.collectionClass, "INVALID_COLLECTION_CLASS", "Collection class is required.");
  if (!COLLECTION_CLASSES.includes(collectionClass)) throw new VisibilityError("INVALID_COLLECTION_CLASS", "Unknown collection class.");
  if (synthetic) {
    if (!surfaceId.startsWith("synthetic_") || collectionClass !== "synthetic_fixture") {
      throw new VisibilityError("INVALID_SYNTHETIC_SURFACE", "Synthetic evidence requires a synthetic_ surface and synthetic_fixture class.");
    }
  } else {
    const surface = getVisibilitySurface(surfaceId);
    if (surface.publicLabel !== input.surfaceLabel || surface.collectionClass !== collectionClass) {
      throw new VisibilityError("SURFACE_IDENTITY_MISMATCH", "Observation surface identity does not match the registry.");
    }
  }
  const rawAnswer = input?.rawAnswer == null ? null : String(input.rawAnswer);
  if ((state === "success" || state === "refused") && !rawAnswer) throw new VisibilityError("ANSWER_REQUIRED", "Usable observations require answer text.");
  if (state === "failed" && rawAnswer) throw new VisibilityError("FAILED_OBSERVATION_HAS_ANSWER", "A failed observation cannot contain answer text.");
  if (state === "failed" && !input?.failure?.code) throw new VisibilityError("FAILURE_REQUIRED", "A failed observation requires a failure record.");
  const config = input?.requestConfig || {};
  const observation = {
    schemaVersion: 1,
    id: required(input?.id, "INVALID_OBSERVATION_ID", "Observation ID is required."),
    investigationId: required(input?.investigationId, "INVALID_INVESTIGATION_ID", "Investigation ID is required."),
    promptId: required(input?.promptId, "INVALID_PROMPT_ID", "Prompt ID is required."),
    panelVersion: input?.panelVersion,
    runId: required(input?.runId, "INVALID_RUN_ID", "Run ID is required."),
    repeatOrdinal: input?.repeatOrdinal,
    state,
    surfaceId,
    surfaceLabel: required(input?.surfaceLabel, "INVALID_SURFACE_LABEL", "Surface label is required."),
    collectionClass,
    synthetic,
    scheduledAt: timestamp(input?.scheduledAt, "scheduledAt"),
    collectedAt: timestamp(input?.collectedAt, "collectedAt"),
    latencyMs: Number.isInteger(input?.latencyMs) && input.latencyMs >= 0 ? input.latencyMs : null,
    retryCount: Number.isInteger(input?.retryCount) && input.retryCount >= 0 ? input.retryCount : 0,
    cost: normalizeCost(input?.cost),
    requestId: input?.requestId == null ? null : String(input.requestId),
    responseId: input?.responseId == null ? null : String(input.responseId),
    responseHash: /^[0-9a-f]{64}$/.test(String(input?.responseHash || "")) ? String(input.responseHash) : null,
    requestConfig: {
      promptText: required(config.promptText, "PROMPT_TEXT_REQUIRED", "Exact prompt text is required."),
      wrapper: String(config.wrapper || ""),
      instructions: String(config.instructions || ""),
      language: required(config.language, "LANGUAGE_REQUIRED", "Language is required."),
      country: required(config.country, "COUNTRY_REQUIRED", "Country is required."),
      toolChoice: config.toolChoice ?? null,
      searchMode: config.searchMode ?? null,
      liveAccess: config.liveAccess ?? null,
      requestedSourceInclusion: config.requestedSourceInclusion ?? null,
      deviceClass: config.deviceClass ?? null,
      authState: config.authState ?? null,
      conversationState: config.conversationState ?? null,
      modelLabel: config.modelLabel ?? null,
    },
    rawAnswer,
    citations: normalizeLinks(input?.citations, true),
    sources: normalizeLinks(input?.sources, false),
    providerRationale: input?.providerRationale ? {
      kind: required(input.providerRationale.kind, "RATIONALE_KIND_REQUIRED", "Provider rationale kind is required."),
      text: required(input.providerRationale.text, "RATIONALE_TEXT_REQUIRED", "Provider rationale text is required."),
      retentionStatus: required(input.providerRationale.retentionStatus, "RATIONALE_RETENTION_REQUIRED", "Provider rationale retention status is required."),
      provenance: "provider_supplied",
    } : null,
    featureFlags: { ...(input?.featureFlags || {}) },
    failure: state === "failed" ? { code: String(input.failure.code), message: String(input.failure.message || "Collection failed.") } : null,
  };
  if (!Number.isInteger(observation.panelVersion) || observation.panelVersion < 1) throw new VisibilityError("INVALID_PANEL_VERSION", "Panel version must be a positive integer.");
  if (!Number.isInteger(observation.repeatOrdinal) || observation.repeatOrdinal < 1) throw new VisibilityError("INVALID_REPEAT_ORDINAL", "Repeat ordinal must be positive.");
  if (state !== "failed" && !observation.responseHash) throw new VisibilityError("INVALID_RESPONSE_HASH", "Usable observations require a lowercase SHA-256 response hash.");
  return freeze(observation);
}
```

- [ ] **Step 4: Run focused and investigation tests**

Run:

```bash
node --test tests/investigation/observation-model.test.mjs
npm run test:investigation
git diff --check
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/lib/investigation/observation-model.mjs tests/investigation/observation-model.test.mjs
git commit -m "feat: normalize investigation observations"
```

---

### Task 4: Extract Claims, Mentions, Citations, and Returned Sources Deterministically

**Files:**

- Create: `functions/lib/investigation/answer-extractor.mjs`
- Create: `tests/investigation/answer-extractor.test.mjs`

**Interfaces:**

- Consumes: a normalized successful or refused observation.
- Produces: `extractAnswerEvidence(observation, config) -> { claims, mentions, citations, sources, extractorVersion }`.
- Does not produce a hypothesis, confidence, sentiment score, or causal explanation.

- [ ] **Step 1: Write failing extractor tests**

Create tests that use `normalizeObservation` and assert:

```js
const extracted = extractAnswerEvidence(observation, {
  extractorVersion: "answer-evidence-1",
  brandAliases: ["Dr. Kamran Aghayev", "Kamran Aghayev"],
  competitors: [{ id: "competitor-example", aliases: ["Dr. Competitor"] }],
});

assert.equal(extracted.claims.length, 2);
assert.deepEqual(extracted.mentions.map(({ entityId }) => entityId), ["brand", "competitor-example"]);
assert.equal(extracted.citations[0].evidenceType, "inline_citation");
assert.equal(extracted.sources[0].evidenceType, "returned_source");
assert.equal(extracted.extractorVersion, "answer-evidence-1");
assert.equal(extracted.hypothesis, undefined);
```

Also assert that a failed observation returns no claims but retains `extractionState: "not_applicable"`, aliases are escaped before building regular expressions, and an empty alias list throws `INVALID_ALIAS_CONFIG`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/investigation/answer-extractor.test.mjs
```

Expected: FAIL because `answer-extractor.mjs` does not exist.

- [ ] **Step 3: Implement the deterministic extractor**

Create `functions/lib/investigation/answer-extractor.mjs` with:

```js
import { VisibilityError } from "../visibility/visibility-error.mjs";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sentenceSegments = (text) => String(text || "").split(/(?<=[.!?])\s+/).map((value) => value.trim()).filter(Boolean);

export function extractAnswerEvidence(observation, config) {
  const version = String(config?.extractorVersion || "").trim();
  const brandAliases = (config?.brandAliases || []).map(String).map((value) => value.trim()).filter(Boolean);
  if (!version) throw new VisibilityError("INVALID_EXTRACTOR_VERSION", "Extractor version is required.");
  if (brandAliases.length === 0) throw new VisibilityError("INVALID_ALIAS_CONFIG", "At least one brand alias is required.");
  if (observation.state === "failed") {
    return Object.freeze({ extractionState: "not_applicable", extractorVersion: version, claims: Object.freeze([]), mentions: Object.freeze([]), citations: Object.freeze([]), sources: Object.freeze([]) });
  }
  const entities = [
    { id: "brand", aliases: brandAliases },
    ...(config?.competitors || []).map((competitor) => ({ id: String(competitor.id), aliases: (competitor.aliases || []).map(String) })),
  ];
  const claims = sentenceSegments(observation.rawAnswer).map((text, index) => Object.freeze({
    id: `${observation.id}-claim-${index + 1}`,
    observationId: observation.id,
    ordinal: index + 1,
    text,
    claimType: /recommend|leading|best|top|consider/i.test(text) ? "recommendation_or_comparison" : "statement",
  }));
  const mentions = [];
  for (const claim of claims) {
    for (const entity of entities) {
      for (const alias of entity.aliases) {
        if (new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(claim.text)) {
          mentions.push(Object.freeze({ claimId: claim.id, entityId: entity.id, alias }));
          break;
        }
      }
    }
  }
  return Object.freeze({
    extractionState: "complete",
    extractorVersion: version,
    claims: Object.freeze(claims),
    mentions: Object.freeze(mentions),
    citations: Object.freeze(observation.citations.map((item) => Object.freeze({ ...item, evidenceType: "inline_citation", observationId: observation.id }))),
    sources: Object.freeze(observation.sources.map((item) => Object.freeze({ ...item, evidenceType: "returned_source", observationId: observation.id }))),
  });
}
```

- [ ] **Step 4: Run tests and commit**

Run:

```bash
node --test tests/investigation/answer-extractor.test.mjs
npm run test:investigation
git diff --check
```

Expected: PASS.

```bash
git add functions/lib/investigation/answer-extractor.mjs tests/investigation/answer-extractor.test.mjs
git commit -m "feat: extract answer evidence deterministically"
```

---

### Task 5: Build the Evidence Trace and Enforce the Evidentiary Ladder

**Files:**

- Create: `functions/lib/investigation/evidence-trace.mjs`
- Create: `tests/investigation/evidence-trace.test.mjs`

**Interfaces:**

- Produces: `normalizeEvidenceItem(input)`.
- Produces: `buildEvidenceTrace({ claims, evidenceItems, relations })`.
- Produces: `validateEvidenceAssessment(input)`.
- Evidence relation types: `supports`, `contradicts`, `contextualizes`, `unclear`.
- Evidence levels: integers 1 through 5.

- [ ] **Step 1: Write failing evidence tests**

Cover these assertions:

```js
const trace = buildEvidenceTrace({ claims, evidenceItems, relations });
assert.equal(trace.claims[0].evidence[0].relation, "supports");
assert.equal(trace.claims[0].evidence[1].relation, "contradicts");
assert.equal(trace.claims[0].evidence[2].item.type, "provider_rationale");
assert.equal(trace.claims[0].evidence[2].item.provenance, "provider_supplied");

assert.equal(validateEvidenceAssessment({ level: 1, repeated: false, observableLinks: 0, independentLinks: 0, alternativesReviewed: 0, followupComparable: false }).term, "observed");
assert.equal(validateEvidenceAssessment({ level: 4, repeated: true, observableLinks: 3, independentLinks: 2, alternativesReviewed: 1, followupComparable: false }).term, "likely");
assert.throws(() => validateEvidenceAssessment({ level: 3, repeated: true, observableLinks: 1, independentLinks: 0, providerRationaleLinks: 1, alternativesReviewed: 0, followupComparable: false }), /independent observable evidence/i);
assert.throws(() => buildEvidenceTrace({ claims, evidenceItems, relations: [{ claimId: "missing", evidenceItemId: "e1", relation: "supports" }] }), /unknown claim/i);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
node --test tests/investigation/evidence-trace.test.mjs
```

Expected: FAIL because the evidence module does not exist.

- [ ] **Step 3: Implement evidence normalization, relation checks, and level gates**

Implement these constants and gates in `functions/lib/investigation/evidence-trace.mjs`:

```js
import { VisibilityError } from "../visibility/visibility-error.mjs";

export const EVIDENCE_TYPES = Object.freeze(["inline_citation", "returned_source", "page_fact", "checker_fact", "provider_rationale", "analyst_annotation"]);
export const EVIDENCE_RELATIONS = Object.freeze(["supports", "contradicts", "contextualizes", "unclear"]);
const TERMS = Object.freeze({ 1: "observed", 2: "repeated", 3: "consistent with", 4: "likely", 5: "supported after follow-up" });

export function normalizeEvidenceItem(input) {
  const id = String(input?.id || "").trim();
  const type = String(input?.type || "").trim();
  if (!id) throw new VisibilityError("INVALID_EVIDENCE_ID", "Evidence ID is required.");
  if (!EVIDENCE_TYPES.includes(type)) throw new VisibilityError("INVALID_EVIDENCE_TYPE", "Unknown evidence type.");
  const provenance = type === "provider_rationale" ? "provider_supplied" : String(input?.provenance || "").trim();
  if (!provenance) throw new VisibilityError("INVALID_EVIDENCE_PROVENANCE", "Evidence provenance is required.");
  return Object.freeze({ id, type, provenance, label: String(input?.label || "").trim(), excerpt: input?.excerpt == null ? null : String(input.excerpt), url: input?.url || null, collectedAt: input?.collectedAt || null, reviewState: input?.reviewState || "unreviewed" });
}

export function buildEvidenceTrace({ claims, evidenceItems, relations }) {
  const claimMap = new Map((claims || []).map((claim) => [claim.id, claim]));
  const itemMap = new Map((evidenceItems || []).map((item) => {
    const normalized = normalizeEvidenceItem(item);
    return [normalized.id, normalized];
  }));
  const grouped = new Map([...claimMap.keys()].map((id) => [id, []]));
  for (const relation of relations || []) {
    if (!claimMap.has(relation.claimId)) throw new VisibilityError("UNKNOWN_EVIDENCE_CLAIM", "Evidence relation references an unknown claim.");
    if (!itemMap.has(relation.evidenceItemId)) throw new VisibilityError("UNKNOWN_EVIDENCE_ITEM", "Evidence relation references an unknown item.");
    if (!EVIDENCE_RELATIONS.includes(relation.relation)) throw new VisibilityError("INVALID_EVIDENCE_RELATION", "Unknown evidence relation.");
    grouped.get(relation.claimId).push(Object.freeze({ relation: relation.relation, item: itemMap.get(relation.evidenceItemId) }));
  }
  return Object.freeze({ claims: Object.freeze([...claimMap.values()].map((claim) => Object.freeze({ ...claim, evidence: Object.freeze(grouped.get(claim.id)) }))) });
}

export function validateEvidenceAssessment(input) {
  const level = input?.level;
  if (!Number.isInteger(level) || level < 1 || level > 5) throw new VisibilityError("INVALID_EVIDENCE_LEVEL", "Evidence level must be 1 through 5.");
  if (level >= 2 && input.repeated !== true) throw new VisibilityError("REPETITION_REQUIRED", "Evidence level 2 or higher requires a repeated pattern.");
  if (level >= 3 && (!Number.isInteger(input.observableLinks) || input.observableLinks < 1 || !Number.isInteger(input.independentLinks) || input.independentLinks < 1)) {
    throw new VisibilityError("INDEPENDENT_EVIDENCE_REQUIRED", "Evidence level 3 or higher requires independent observable evidence.");
  }
  if (level >= 4 && (!Number.isInteger(input.alternativesReviewed) || input.alternativesReviewed < 1 || input.independentLinks < 2)) {
    throw new VisibilityError("CORROBORATION_REQUIRED", "Evidence level 4 requires two independent links and a reviewed alternative.");
  }
  if (level >= 5 && input.followupComparable !== true) throw new VisibilityError("COMPARABLE_FOLLOWUP_REQUIRED", "Evidence level 5 requires comparable follow-up.");
  return Object.freeze({ level, term: TERMS[level] });
}
```

- [ ] **Step 4: Run tests and commit**

```bash
node --test tests/investigation/evidence-trace.test.mjs
npm run test:investigation
git diff --check
git add functions/lib/investigation/evidence-trace.mjs tests/investigation/evidence-trace.test.mjs
git commit -m "feat: build reviewable evidence traces"
```

Expected: tests PASS before commit.

---

### Task 6: Enforce the Investigation Lifecycle and Human Review Gate

**Files:**

- Create: `functions/lib/investigation/case-model.mjs`
- Create: `tests/investigation/case-model.test.mjs`

**Interfaces:**

- Produces: `INVESTIGATION_STATES`.
- Produces: `createInvestigationCase(input)`.
- Produces: `transitionInvestigationCase(caseRecord, transition)`.
- Appends review events; never rewrites prior events.

- [ ] **Step 1: Write failing case-lifecycle tests**

Test the approved path, invalid transitions, unresolved reopening, hypothesis requirements, and follow-up comparability:

```js
let record = createInvestigationCase({
  id: "kamran-investigation-01",
  projectId: "kamran-aghayev",
  question: "Why is the brand absent from this US prompt cohort?",
  methodVersion: "0.2",
  panelId: "kamran-us-en-v1",
  panelVersion: 1,
  language: "en",
  location: "US",
  surfaces: ["synthetic_chatgpt_web_logged_out_us", "synthetic_openai_responses_web_search_auto", "synthetic_openai_responses_web_search_required"],
  createdAt: "2026-07-22T09:00:00.000Z",
});
record = transitionInvestigationCase(record, { to: "baseline_collecting", at: "2026-07-22T09:01:00.000Z", reviewer: "alex", note: "Baseline started." });
record = transitionInvestigationCase(record, { to: "evidence_review", at: "2026-07-28T09:01:00.000Z", reviewer: "alex", note: "Three cycles complete." });
assert.throws(() => transitionInvestigationCase(record, { to: "hypothesis_ready", at: "2026-07-28T10:00:00.000Z", reviewer: "alex", evidenceLinks: 1, alternativesCount: 0 }), /alternative/i);
const unresolved = transitionInvestigationCase(record, { to: "unresolved", at: "2026-07-28T10:00:00.000Z", reviewer: "alex", note: "Evidence is insufficient." });
const reopened = transitionInvestigationCase(unresolved, { to: "baseline_collecting", at: "2026-07-29T10:00:00.000Z", reviewer: "alex", note: "Run the smallest next test." });
assert.equal(reopened.events.length, unresolved.events.length + 1);
assert.equal(unresolved.state, "unresolved");
assert.throws(() => transitionInvestigationCase({ ...record, state: "followup_review" }, { to: "closed_supported", at: "2026-08-12T10:00:00.000Z", reviewer: "alex", comparability: false }), /comparable/i);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test tests/investigation/case-model.test.mjs`.

Expected: FAIL because the model does not exist.

- [ ] **Step 3: Implement the case state machine**

Create `functions/lib/investigation/case-model.mjs` with this exact state graph:

```js
import { VisibilityError } from "../visibility/visibility-error.mjs";

export const INVESTIGATION_STATES = Object.freeze([
  "draft", "baseline_collecting", "evidence_review", "unresolved", "hypothesis_ready",
  "intervention_in_progress", "followup_collecting", "followup_review",
  "closed_supported", "closed_weakened", "closed_unresolved",
]);

const ALLOWED = Object.freeze({
  draft: new Set(["baseline_collecting"]),
  baseline_collecting: new Set(["evidence_review"]),
  evidence_review: new Set(["unresolved", "hypothesis_ready"]),
  unresolved: new Set(["baseline_collecting", "evidence_review"]),
  hypothesis_ready: new Set(["intervention_in_progress", "closed_unresolved"]),
  intervention_in_progress: new Set(["followup_collecting"]),
  followup_collecting: new Set(["followup_review"]),
  followup_review: new Set(["closed_supported", "closed_weakened", "closed_unresolved"]),
  closed_supported: new Set(),
  closed_weakened: new Set(),
  closed_unresolved: new Set(),
});

const date = (value) => {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw new VisibilityError("INVALID_CASE_TIMESTAMP", "Case event timestamp is invalid.");
  return parsed.toISOString();
};

const freeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
};

export function createInvestigationCase(input) {
  const record = {
    schemaVersion: 1,
    id: String(input?.id || "").trim(),
    projectId: String(input?.projectId || "").trim(),
    question: String(input?.question || "").trim(),
    methodVersion: String(input?.methodVersion || "").trim(),
    panelId: String(input?.panelId || "").trim(),
    panelVersion: input?.panelVersion,
    language: String(input?.language || "").trim(),
    location: String(input?.location || "").trim(),
    surfaces: [...(input?.surfaces || [])],
    state: "draft",
    createdAt: date(input?.createdAt),
    events: [],
  };
  for (const [key, value] of Object.entries({ id: record.id, projectId: record.projectId, question: record.question, methodVersion: record.methodVersion, panelId: record.panelId, language: record.language, location: record.location })) {
    if (!value) throw new VisibilityError("INVALID_CASE", `${key} is required.`);
  }
  if (!Number.isInteger(record.panelVersion) || record.panelVersion < 1 || record.surfaces.length !== 3) throw new VisibilityError("INVALID_CASE_SCOPE", "Case panel version and three surfaces are required.");
  return freeze(record);
}

export function transitionInvestigationCase(record, transition) {
  const to = String(transition?.to || "");
  if (!INVESTIGATION_STATES.includes(to) || !ALLOWED[record.state]?.has(to)) throw new VisibilityError("INVALID_CASE_TRANSITION", `Cannot transition from ${record.state} to ${to}.`);
  if (to === "hypothesis_ready" && (!(transition.evidenceLinks >= 1) || !(transition.alternativesCount >= 1))) throw new VisibilityError("HYPOTHESIS_REVIEW_INCOMPLETE", "A reviewed hypothesis requires linked evidence and at least one alternative.");
  if (to.startsWith("closed_") && record.state === "followup_review" && transition.comparability !== true) throw new VisibilityError("FOLLOWUP_NOT_COMPARABLE", "A follow-up conclusion requires a comparable window.");
  const event = Object.freeze({ from: record.state, to, at: date(transition.at), reviewer: String(transition.reviewer || "").trim(), note: String(transition.note || "").trim(), evidenceLinks: transition.evidenceLinks ?? null, alternativesCount: transition.alternativesCount ?? null, comparability: transition.comparability ?? null });
  if (!event.reviewer) throw new VisibilityError("REVIEWER_REQUIRED", "Every transition requires a reviewer.");
  return freeze({ ...record, state: to, events: [...record.events, event] });
}
```

- [ ] **Step 4: Run tests and commit**

```bash
node --test tests/investigation/case-model.test.mjs
npm run test:investigation
git diff --check
git add functions/lib/investigation/case-model.mjs tests/investigation/case-model.test.mjs
git commit -m "feat: enforce investigation review lifecycle"
```

Expected: PASS.

---

### Task 7: Build the Dossier View Model and Complete Synthetic Kamran Case

**Files:**

- Create: `functions/lib/investigation/dossier-model.mjs`
- Create: `functions/lib/investigation/kamran-synthetic-demo.mjs`
- Create: `tests/investigation/dossier-model.test.mjs`

**Interfaces:**

- Consumes: normalized case, observations, extracted claims, evidence trace, assessment, hypothesis, alternatives, next test, intervention, and follow-up.
- Produces: `buildInvestigationDossier(input) -> frozen client-safe view model`.
- Produces: `buildKamranSyntheticDemo() -> complete input plus dossier`.
- The fixture generates 270 observations: 15 prompts × 3 surfaces × 3 baseline cycles plus 15 × 3 × 3 follow-up cycles.

- [ ] **Step 1: Write failing dossier acceptance tests**

Create `tests/investigation/dossier-model.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { buildInvestigationDossier } from "../../functions/lib/investigation/dossier-model.mjs";
import { buildKamranSyntheticDemo } from "../../functions/lib/investigation/kamran-synthetic-demo.mjs";

function minimalInput(overrides = {}) {
  return {
    caseRecord: { id: "case-1", question: "Why?", state: "evidence_review", language: "en", location: "US", panelId: "panel-1", panelVersion: 1, methodVersion: "0.2" },
    projectLabel: "Synthetic project",
    surfaceLabels: ["Synthetic A", "Synthetic B", "Synthetic C"],
    baselineWindow: "baseline",
    followupWindow: "follow-up",
    exampleOnly: true,
    assessment: { level: 3, term: "consistent with" },
    observedPattern: { summary: "Synthetic pattern.", metrics: [{ id: "m1", label: "Mentions", numerator: 0, denominator: 45, surfaceId: "synthetic-a", window: "baseline" }], coverage: { valid: 45, scheduled: 45, failed: 0 } },
    evidenceItems: [{ id: "e1", type: "checker_fact", label: "Checker fact", excerpt: "Synthetic evidence.", provenance: "synthetic checker", relation: "supports", url: null }],
    hypothesis: { wording: "Synthetic hypothesis.", confidence: "bounded", basis: ["Evidence"], contradictions: [], inferenceSteps: ["Inference"], falsifier: "A repeat disagrees.", reviewState: "approved" },
    alternatives: [{ wording: "Normal variance.", disposition: "plausible" }],
    nextTest: "Repeat the frozen panel.",
    intervention: null,
    followup: null,
    review: { analyst: "Alex", reviewedAt: "2026-07-22T12:00:00.000Z", extractorVersion: "answer-evidence-1" },
    limitations: ["Synthetic fixture."],
    ...overrides,
  };
}

test("builds the complete investigation-first Kamran fixture", () => {
  const demo = buildKamranSyntheticDemo();
  assert.equal(demo.observations.length, 270);
  assert.equal(new Set(demo.observations.map(({ promptId }) => promptId)).size, 15);
  assert.deepEqual([...new Set(demo.observations.map(({ surfaceId }) => surfaceId))].sort(), [
    "synthetic_chatgpt_web_logged_out_us",
    "synthetic_openai_responses_web_search_auto",
    "synthetic_openai_responses_web_search_required",
  ]);
  assert.equal(demo.dossier.header.question, "Why is the brand absent from this US prompt cohort?");
  assert.equal(demo.dossier.header.exampleOnly, true);
  assert.deepEqual(demo.dossier.sections.map(({ id }) => id), ["observed-pattern", "evidence-chain", "diagnostic-rationale", "alternatives-next-test"]);
  assert.equal(demo.dossier.evidenceState, "supported_after_followup");
  assert.equal(demo.dossier.sections[2].hypothesis.reviewState, "approved");
  assert.ok(demo.dossier.sections[2].hypothesis.alternatives.length >= 1);
  assert.equal(demo.dossier.sections[1].items.some(({ type }) => type === "provider_rationale"), true);
  assert.equal(demo.dossier.sections[1].items.find(({ type }) => type === "provider_rationale").optional, true);
  assert.equal(demo.dossier.score, undefined);
  assert.equal(JSON.stringify(demo.dossier).includes("Otterly"), false);
  assert.equal(demo.scope.panel.prompts.some(({ text }) => /patient|diagnosis|medical record|treatment outcome/i.test(text)), false);
});

test("keeps every metric denominator and surface identity visible", () => {
  const { dossier } = buildKamranSyntheticDemo();
  for (const metric of dossier.sections[0].metrics) {
    assert.ok(Number.isInteger(metric.numerator));
    assert.ok(Number.isInteger(metric.denominator));
    assert.ok(metric.surfaceId);
    assert.ok(metric.window);
  }
});

test("unreviewed or provider-only rationale cannot become a diagnosis", () => {
  const unreviewed = buildInvestigationDossier(minimalInput({ hypothesis: { ...minimalInput().hypothesis, reviewState: "draft" } }));
  assert.equal(unreviewed.evidenceState, "unresolved");
  assert.equal(unreviewed.sections[2].hypothesis, null);
  const providerOnly = buildInvestigationDossier(minimalInput({ evidenceItems: [{ id: "r1", type: "provider_rationale", label: "Provider rationale", excerpt: "Synthetic.", provenance: "provider_supplied", relation: "contextualizes", url: null }] }));
  assert.equal(providerOnly.evidenceState, "unresolved");
  assert.equal(providerOnly.sections[2].hypothesis, null);
  const noAlternatives = buildInvestigationDossier(minimalInput({ alternatives: [] }));
  assert.equal(noAlternatives.evidenceState, "unresolved");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
node --test tests/investigation/dossier-model.test.mjs
```

Expected: FAIL because the dossier and demo modules do not exist.

- [ ] **Step 3: Implement the dossier builder**

Create `functions/lib/investigation/dossier-model.mjs` with one pure export. It must build this exact top-level shape and must not include raw request IDs, wholesale answer archives, secrets, a score, or an unreviewed hypothesis:

```js
export function buildInvestigationDossier(input) {
  const hasIndependentEvidence = (input?.evidenceItems || []).some(({ type }) => type !== "provider_rationale" && type !== "analyst_annotation");
  const approved = input?.hypothesis?.reviewState === "approved" && (input?.alternatives || []).length > 0 && hasIndependentEvidence;
  const comparable = input?.followup?.comparable === true;
  const evidenceState = approved ? (comparable ? input.followup.outcome : "hypothesis_ready") : "unresolved";
  const rationale = approved ? {
    wording: input.hypothesis.wording,
    confidence: input.hypothesis.confidence,
    basis: [...input.hypothesis.basis],
    contradictions: [...input.hypothesis.contradictions],
    inferenceSteps: [...input.hypothesis.inferenceSteps],
    falsifier: input.hypothesis.falsifier,
    reviewState: "approved",
    alternatives: (input.alternatives || []).map((item) => ({ wording: item.wording, disposition: item.disposition })),
  } : null;
  return deepFreeze({
    schemaVersion: 1,
    header: Object.freeze({
      investigationId: input.caseRecord.id,
      project: input.projectLabel,
      question: input.caseRecord.question,
      state: input.caseRecord.state,
      language: input.caseRecord.language,
      location: input.caseRecord.location,
      panelId: input.caseRecord.panelId,
      panelVersion: input.caseRecord.panelVersion,
      methodVersion: input.caseRecord.methodVersion,
      surfaces: Object.freeze([...input.surfaceLabels]),
      baselineWindow: input.baselineWindow,
      followupWindow: input.followupWindow,
      exampleOnly: input.exampleOnly === true,
    }),
    evidenceState,
    evidenceLevel: input.assessment.level,
    evidenceTerm: input.assessment.term,
    sections: Object.freeze([
      Object.freeze({ id: "observed-pattern", title: "Observed pattern", summary: input.observedPattern.summary, metrics: Object.freeze(input.observedPattern.metrics.map((metric) => Object.freeze({ ...metric }))), coverage: Object.freeze({ ...input.observedPattern.coverage }) }),
      Object.freeze({ id: "evidence-chain", title: "Evidence chain", items: Object.freeze(input.evidenceItems.map((item) => Object.freeze({ id: item.id, type: item.type, label: item.label, excerpt: item.excerpt, provenance: item.provenance, relation: item.relation, url: item.url, optional: item.type === "provider_rationale" }))) }),
      Object.freeze({ id: "diagnostic-rationale", title: "BLURSOR diagnostic rationale", status: rationale ? "reviewed" : "unresolved", hypothesis: rationale }),
      Object.freeze({ id: "alternatives-next-test", title: "Alternatives and next test", alternatives: Object.freeze((input.alternatives || []).map((item) => Object.freeze({ wording: item.wording, disposition: item.disposition }))), nextTest: input.nextTest, intervention: input.intervention || null, followup: input.followup || null }),
    ]),
    review: Object.freeze({ analyst: input.review.analyst, reviewedAt: input.review.reviewedAt, extractorVersion: input.review.extractorVersion }),
    limitations: Object.freeze([...input.limitations]),
  });
}
```

Define this helper above the export so the complete view model, including follow-up and hypothesis arrays, is immutable:

```js
const deepFreeze = (value) => {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.isFrozen(value) ? value : Object.freeze(value);
};
```

- [ ] **Step 4: Implement the generated synthetic case**

Create `functions/lib/investigation/kamran-synthetic-demo.mjs`. Use the previously defined functions rather than duplicating their rules. The implementation must:

1. Define 15 public-brand prompts containing no patient information.
2. Validate the scope with `validateV1InvestigationScope`.
3. Generate observations for dates `2026-07-22`, `2026-07-25`, `2026-07-28`, `2026-08-05`, `2026-08-08`, and `2026-08-11` across three synthetic IDs corresponding to the planned v1 lanes.
4. Give all three fabricated lanes `synthetic_` IDs, `collectionClass: "synthetic_fixture"`, and `synthetic: true`. Do not add these IDs to the executable surface registry and do not add a bypass that allows fabricated output to use a real surface ID.
5. Create at least one inline citation, one returned source, one checker fact, one page fact, one contradiction, and one optional provider rationale.
6. Advance the case through baseline, review, hypothesis, intervention, follow-up, and `closed_supported` with append-only events.
7. Build a level-5 assessment only after comparable follow-up.
8. Return `{ scope, observations, dossier }`, all frozen.

Use this complete implementation, including the exact public fixture labels:

```js
import { extractAnswerEvidence } from "./answer-extractor.mjs";
import { createInvestigationCase, transitionInvestigationCase } from "./case-model.mjs";
import { buildInvestigationDossier } from "./dossier-model.mjs";
import { buildEvidenceTrace, validateEvidenceAssessment } from "./evidence-trace.mjs";
import { normalizeObservation } from "./observation-model.mjs";
import { validateV1InvestigationScope } from "./v1-scope.mjs";

const PROMPT_TEXTS = Object.freeze([
  "Which public sources help evaluate minimally invasive spine surgeons in the United States?",
  "What information should someone compare when researching a spine surgeon in the United States?",
  "Which websites commonly document a surgeon's professional background?",
  "How can someone verify a spine surgeon's areas of practice from public information?",
  "What makes a surgeon's website understandable to AI search systems?",
  "Which public evidence is useful when comparing spine surgery specialists?",
  "Compare the types of evidence found on hospital, directory, and surgeon websites.",
  "What public sources are commonly cited when AI systems describe medical specialists?",
  "How should professional credentials be represented consistently across the web?",
  "What can make two public profiles of the same surgeon appear inconsistent?",
  "What does the public web say about Dr. Kamran Aghayev's professional focus?",
  "Which public pages describe Dr. Kamran Aghayev's services?",
  "Are Dr. Kamran Aghayev's public professional profiles consistent with his website?",
  "What public page should be improved first when a surgeon is missing from an AI answer?",
  "How should a website change be evaluated after an AI visibility intervention?",
]);

const DEMO_SURFACES = Object.freeze([
  { id: "synthetic_chatgpt_web_logged_out_us", label: "Synthetic ChatGPT web · logged-out US fixture", collectionClass: "synthetic_fixture" },
  { id: "synthetic_openai_responses_web_search_auto", label: "Synthetic fixture shaped like OpenAI Responses API · web search auto", collectionClass: "synthetic_fixture" },
  { id: "synthetic_openai_responses_web_search_required", label: "Synthetic fixture shaped like OpenAI Responses API · web search required", collectionClass: "synthetic_fixture" },
]);

const WINDOWS = Object.freeze([
  { name: "baseline", dates: Object.freeze(["2026-07-22", "2026-07-25", "2026-07-28"]) },
  { name: "followup", dates: Object.freeze(["2026-08-05", "2026-08-08", "2026-08-11"]) },
]);

const prompts = PROMPT_TEXTS.map((text, index) => Object.freeze({
  id: `prompt-${String(index + 1).padStart(2, "0")}`,
  text,
  language: "en",
  intent: index < 6 ? "discovery" : index < 10 ? "comparison" : index < 13 ? "validation" : "action",
}));

const deepFreeze = (value) => {
  if (!value || typeof value !== "object") return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.isFrozen(value) ? value : Object.freeze(value);
};

function answerFor(windowName, promptIndex) {
  if (promptIndex !== 0) return "Synthetic fixture: this fabricated answer contains no evaluated recommendation and is not a real provider result.";
  if (windowName === "baseline") return "Synthetic fixture: this fabricated answer omits the investigated brand. A public directory is shown as an example source; this is not a real provider result.";
  return "Synthetic fixture: this fabricated answer mentions Dr. Kamran Aghayev after a test intervention. This is not a real provider result or a claim about actual performance.";
}

function hashFor(windowName, promptIndex) {
  if (promptIndex !== 0) return "466ad4e25816d310306754a66c44804ddc768d49143f2f780f28ca1d922a8b3d";
  return windowName === "baseline"
    ? "68ed3796366768f986f8d7196479e15063b9814473578b2212c2fb6ec21146a6"
    : "f6a5ef502fc5d5d1890ba2a4d32130338093d146b69a1fd1db062fd6777906e0";
}

function buildObservations() {
  const observations = [];
  for (const window of WINDOWS) {
    for (const [cycleIndex, day] of window.dates.entries()) {
      for (const surface of DEMO_SURFACES) {
        for (const [promptIndex, prompt] of prompts.entries()) {
          const hasLinks = promptIndex === 0 && surface.id === "synthetic_openai_responses_web_search_required";
          const hasRationale = promptIndex === 0 && window.name === "baseline" && surface.id === "synthetic_openai_responses_web_search_auto";
          observations.push(normalizeObservation({
            id: `${window.name}-${day}-${surface.id}-${prompt.id}`,
            investigationId: "kamran-investigation-01",
            promptId: prompt.id,
            panelVersion: 1,
            runId: `${window.name}-${day}`,
            repeatOrdinal: cycleIndex + 1,
            state: "success",
            surfaceId: surface.id,
            surfaceLabel: surface.label,
            collectionClass: surface.collectionClass,
            synthetic: true,
            scheduledAt: `${day}T09:00:00.000Z`,
            collectedAt: `${day}T09:00:02.000Z`,
            latencyMs: 2000,
            retryCount: 0,
            cost: { currency: "USD", microAmount: 0 },
            requestId: null,
            responseId: null,
            responseHash: hashFor(window.name, promptIndex),
            requestConfig: {
              promptText: prompt.text,
              wrapper: "Synthetic US-English investigation fixture.",
              instructions: "Use public information only. This fixture sends no request.",
              language: "en",
              country: "US",
              toolChoice: surface.id.endsWith("required") ? "required" : surface.id.endsWith("auto") ? "auto" : null,
              searchMode: surface.id.endsWith("required") ? "required" : surface.id.endsWith("auto") ? "auto" : null,
              liveAccess: false,
              requestedSourceInclusion: hasLinks,
              deviceClass: "synthetic_fixture",
              authState: "synthetic_fixture",
              conversationState: "fresh",
              modelLabel: "synthetic-fixture",
            },
            rawAnswer: answerFor(window.name, promptIndex),
            citations: hasLinks ? [{ id: `${day}-citation`, url: "https://example.org/synthetic-directory", title: "Synthetic directory", start: null, end: null }] : [],
            sources: hasLinks ? [{ id: `${day}-source`, url: "https://example.org/synthetic-source-list", title: "Synthetic returned source" }] : [],
            providerRationale: hasRationale ? { kind: "reasoning_summary", text: "Synthetic provider rationale: directory-style sources were emphasized.", retentionStatus: "fixture_only" } : null,
            featureFlags: { searchUsed: hasLinks, fabricated: true },
          }));
        }
      }
    }
  }
  return Object.freeze(observations);
}

function closeSyntheticCase() {
  let record = createInvestigationCase({
    id: "kamran-investigation-01",
    projectId: "kamran-aghayev",
    question: "Why is the brand absent from this US prompt cohort?",
    methodVersion: "0.2",
    panelId: "kamran-us-en-v1",
    panelVersion: 1,
    language: "en",
    location: "US",
    surfaces: DEMO_SURFACES.map(({ id }) => id),
    createdAt: "2026-07-22T08:00:00.000Z",
  });
  const steps = [
    { to: "baseline_collecting", at: "2026-07-22T08:05:00.000Z", note: "Synthetic baseline opened." },
    { to: "evidence_review", at: "2026-07-28T10:00:00.000Z", note: "Three synthetic cycles complete." },
    { to: "hypothesis_ready", at: "2026-07-28T12:00:00.000Z", note: "Synthetic hypothesis approved.", evidenceLinks: 5, alternativesCount: 2 },
    { to: "intervention_in_progress", at: "2026-07-29T09:00:00.000Z", note: "Synthetic intervention recorded." },
    { to: "followup_collecting", at: "2026-08-05T09:00:00.000Z", note: "Synthetic follow-up opened." },
    { to: "followup_review", at: "2026-08-11T10:00:00.000Z", note: "Three synthetic follow-up cycles complete." },
    { to: "closed_supported", at: "2026-08-11T12:00:00.000Z", note: "Synthetic follow-up supports the test hypothesis without proving cause.", comparability: true },
  ];
  for (const step of steps) record = transitionInvestigationCase(record, { reviewer: "alex", ...step });
  return record;
}

export function buildKamranSyntheticDemo() {
  const scope = validateV1InvestigationScope({
    projectId: "kamran-aghayev",
    location: "US",
    cadenceDays: 3,
    panel: { id: "kamran-us-en-v1", version: 1, methodologyVersion: "0.2", prompts },
  });
  const observations = buildObservations();
  const target = observations.find(({ runId, surfaceId, promptId }) => runId === "baseline-2026-07-22" && surfaceId === "synthetic_openai_responses_web_search_required" && promptId === "prompt-01");
  const extracted = extractAnswerEvidence(target, { extractorVersion: "answer-evidence-1", brandAliases: ["Dr. Kamran Aghayev", "Kamran Aghayev"], competitors: [] });
  const claim = extracted.claims[0];
  const evidenceItems = [
    { id: "e-citation", type: "inline_citation", provenance: "synthetic observation", label: "Synthetic inline citation", excerpt: "A directory is attached to the sampled claim.", url: "https://example.org/synthetic-directory", reviewState: "reviewed" },
    { id: "e-source", type: "returned_source", provenance: "synthetic observation", label: "Synthetic returned source", excerpt: "The surface lists an additional source without attaching it to a claim.", url: "https://example.org/synthetic-source-list", reviewState: "reviewed" },
    { id: "e-page", type: "page_fact", provenance: "synthetic page review", label: "Synthetic page fact", excerpt: "The fabricated example page lacks a consolidated service statement.", reviewState: "reviewed" },
    { id: "e-checker", type: "checker_fact", provenance: "synthetic BLURSOR checker report", label: "Synthetic delivery fact", excerpt: "The fabricated checker result shows readable HTML delivery.", reviewState: "reviewed" },
    { id: "e-contradiction", type: "page_fact", provenance: "synthetic conflicting page review", label: "Synthetic contradiction", excerpt: "A second fabricated profile already contains the missing statement.", reviewState: "reviewed" },
    { id: "e-rationale", type: "provider_rationale", label: "Provider-supplied rationale", excerpt: "Synthetic provider rationale: directory-style sources were emphasized.", reviewState: "reviewed" },
  ];
  const relations = [
    { claimId: claim.id, evidenceItemId: "e-citation", relation: "supports" },
    { claimId: claim.id, evidenceItemId: "e-source", relation: "contextualizes" },
    { claimId: claim.id, evidenceItemId: "e-page", relation: "supports" },
    { claimId: claim.id, evidenceItemId: "e-checker", relation: "contextualizes" },
    { claimId: claim.id, evidenceItemId: "e-contradiction", relation: "contradicts" },
    { claimId: claim.id, evidenceItemId: "e-rationale", relation: "contextualizes" },
  ];
  const trace = buildEvidenceTrace({ claims: [claim], evidenceItems, relations });
  const dossierEvidence = trace.claims[0].evidence.map(({ relation, item }) => ({ ...item, relation }));
  const assessment = validateEvidenceAssessment({ level: 5, repeated: true, observableLinks: 5, independentLinks: 4, providerRationaleLinks: 1, alternativesReviewed: 2, followupComparable: true });
  const caseRecord = closeSyntheticCase();
  const metrics = DEMO_SURFACES.flatMap((surface) => [
    { id: `${surface.id}-baseline`, label: "Brand mentions", numerator: 0, denominator: 45, surfaceId: surface.id, window: "baseline" },
    { id: `${surface.id}-followup`, label: "Brand mentions", numerator: 3, denominator: 45, surfaceId: surface.id, window: "follow-up" },
  ]);
  const dossier = buildInvestigationDossier({
    caseRecord,
    projectLabel: "Dr. Kamran Aghayev · synthetic example",
    surfaceLabels: DEMO_SURFACES.map(({ label }) => label),
    baselineWindow: "2026-07-22 to 2026-07-28",
    followupWindow: "2026-08-05 to 2026-08-11",
    exampleOnly: true,
    assessment,
    observedPattern: { summary: "Fabricated test data shows absence in three baseline cycles and presence in three comparable follow-up cycles.", metrics, coverage: { valid: 270, scheduled: 270, failed: 0 } },
    evidenceItems: dossierEvidence,
    hypothesis: {
      wording: "In this synthetic example, clearer consolidated public evidence is consistent with the changed answer pattern.",
      confidence: "bounded",
      basis: ["Repeated fabricated observations", "Synthetic citation and page evidence", "Comparable synthetic follow-up"],
      contradictions: ["A second synthetic profile already contained similar wording"],
      inferenceSteps: ["The evidence pattern is associated with, but does not prove, the answer change"],
      falsifier: "Comparable follow-up returns to the earlier pattern while the intervention remains available.",
      reviewState: "approved",
    },
    alternatives: [
      { wording: "Normal surface variation produced the difference.", disposition: "still plausible" },
      { wording: "The fabricated source set changed independently of the intervention.", disposition: "not ruled out" },
    ],
    nextTest: "Repeat the same frozen panel for three more cycles without changing the synthetic intervention.",
    intervention: { label: "Synthetic intervention", detail: "Add one consolidated public service statement to the fabricated example page.", deployedAt: "2026-07-29T09:00:00.000Z" },
    followup: { comparable: true, outcome: "supported_after_followup", summary: "The fabricated pattern changed, but causality remains unproven." },
    review: { analyst: "Alex Rostovtsev", reviewedAt: "2026-08-11T12:00:00.000Z", extractorVersion: "answer-evidence-1" },
    limitations: ["Every observation and evidence item is fabricated test data.", "The example demonstrates method and interface behavior, not a real finding about Dr. Kamran Aghayev."],
  });
  return deepFreeze({ scope, observations, dossier });
}
```

Do not use real patient claims, outcomes, rankings, or fabricated statements about Dr. Kamran. The synthetic answer pattern should describe only a neutral absence/presence example and explicitly say it is fabricated test data.

- [ ] **Step 5: Run focused, investigation, and full tests**

```bash
node --test tests/investigation/dossier-model.test.mjs
npm run test:investigation
npm test
git diff --check
```

Expected: 270 observations, complete approved hierarchy, all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/lib/investigation/dossier-model.mjs functions/lib/investigation/kamran-synthetic-demo.mjs functions/lib/investigation/observation-model.mjs tests/investigation/dossier-model.test.mjs tests/investigation/observation-model.test.mjs
git commit -m "feat: build synthetic investigation dossier"
```

---

### Task 8: Serve a Private Feature-Gated Dossier and Verify the Complete Story

**Files:**

- Create: `functions/lib/investigation/investigation-handlers.mjs`
- Create: `functions/api/investigations/[id].js`
- Create: `functions/i/[id].js`
- Create: `investigation-dossier.html`
- Create: `tests/investigation/investigation-handlers.test.mjs`
- Create: `tests/investigation/dossier-ui.test.mjs`

**Interfaces:**

- Produces: `getInvestigationDossierResponse(context)`.
- Produces: `getInvestigationDossierPageResponse(context)`.
- Demo ID: `kamran-synthetic`.
- Feature flag: `INVESTIGATION_DEMO_ENABLED === "true"`.
- JSON route: `/api/investigations/kamran-synthetic`.
- Page route: `/i/kamran-synthetic`.

- [ ] **Step 1: Write failing private-handler tests**

Create `tests/investigation/investigation-handlers.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { getInvestigationDossierPageResponse, getInvestigationDossierResponse } from "../../functions/lib/investigation/investigation-handlers.mjs";

const request = new Request("https://blursor.test/api/investigations/kamran-synthetic");

test("demo JSON is indistinguishable from missing when disabled", async () => {
  const response = await getInvestigationDossierResponse({ request, params: { id: "kamran-synthetic" }, env: {} });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { ok: false, error: "Investigation not found." });
});

test("enabled demo returns private synthetic dossier", async () => {
  const response = await getInvestigationDossierResponse({ request, params: { id: "kamran-synthetic" }, env: { INVESTIGATION_DEMO_ENABLED: "true" } });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
  assert.equal(body.ok, true);
  assert.equal(body.dossier.header.exampleOnly, true);
  assert.equal(body.dossier.header.question, "Why is the brand absent from this US prompt cohort?");
});

test("private page serves the dossier shell only when enabled", async () => {
  const asset = new Response("<html>dossier shell</html>", { headers: { "Content-Type": "text/html" } });
  const disabled = await getInvestigationDossierPageResponse({ request: new Request("https://blursor.test/i/kamran-synthetic"), params: { id: "kamran-synthetic" }, env: { ASSETS: { fetch: async () => asset.clone() } } });
  assert.equal(disabled.status, 404);
  const enabled = await getInvestigationDossierPageResponse({ request: new Request("https://blursor.test/i/kamran-synthetic"), params: { id: "kamran-synthetic" }, env: { INVESTIGATION_DEMO_ENABLED: "true", ASSETS: { fetch: async () => asset.clone() } } });
  assert.equal(enabled.status, 200);
  assert.equal(await enabled.text(), "<html>dossier shell</html>");
  assert.equal(enabled.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");
});
```

- [ ] **Step 2: Write failing UI contract tests**

Create `tests/investigation/dossier-ui.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = new URL("../../investigation-dossier.html", import.meta.url);

test("dossier shell uses the approved investigation hierarchy", async () => {
  const html = await readFile(page, "utf8");
  assert.match(html, /Investigation dossier/i);
  assert.match(html, /Observed pattern/i);
  assert.match(html, /Evidence chain/i);
  assert.match(html, /BLURSOR diagnostic rationale/i);
  assert.match(html, /Alternatives and next test/i);
  assert.match(html, /Provider-supplied rationale/i);
  assert.match(html, /Unresolved is a valid result/i);
  assert.doesNotMatch(html, />\s*Tracker\s*</i);
  assert.doesNotMatch(html, /visibility score/i);
});

test("dossier shell loads only the ID in its private route", async () => {
  const html = await readFile(page, "utf8");
  assert.ok(html.includes("window.location.pathname.match(/^\\/i\\/([^/]+)$/)"));
  assert.ok(html.includes("fetch('/api/investigations/' + encodeURIComponent(id)"));
  assert.match(html, /textContent/);
  assert.doesNotMatch(html, /innerHTML\s*=/);
});
```

- [ ] **Step 3: Run tests and verify RED**

```bash
node --test tests/investigation/investigation-handlers.test.mjs tests/investigation/dossier-ui.test.mjs
```

Expected: FAIL because handlers and the dossier page do not exist.

- [ ] **Step 4: Implement private handlers and routes**

Create `functions/lib/investigation/investigation-handlers.mjs`:

```js
import { buildKamranSyntheticDemo } from "./kamran-synthetic-demo.mjs";

const PRIVATE_HEADERS = Object.freeze({
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
});

const enabled = (context) => context?.env?.INVESTIGATION_DEMO_ENABLED === "true";
const known = (context) => enabled(context) && context?.params?.id === "kamran-synthetic";
const json = (body, status) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...PRIVATE_HEADERS } });
const text = (body, status) => new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", ...PRIVATE_HEADERS } });

export async function getInvestigationDossierResponse(context) {
  if (!known(context)) return json({ ok: false, error: "Investigation not found." }, 404);
  return json({ ok: true, dossier: buildKamranSyntheticDemo().dossier }, 200);
}

export async function getInvestigationDossierPageResponse(context) {
  if (!known(context)) return text("Investigation not found.", 404);
  if (!context?.env?.ASSETS?.fetch) return text("Investigation page is temporarily unavailable.", 500);
  const assetUrl = new URL("/investigation-dossier", context.request.url);
  const upstream = await context.env.ASSETS.fetch(new Request(assetUrl));
  const headers = new Headers(upstream.headers);
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) headers.set(name, value);
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
}
```

Create the two route files:

```js
// functions/api/investigations/[id].js
import { getInvestigationDossierResponse } from "../../lib/investigation/investigation-handlers.mjs";
export function onRequestGet(context) { return getInvestigationDossierResponse(context); }
```

```js
// functions/i/[id].js
import { getInvestigationDossierPageResponse } from "../lib/investigation/investigation-handlers.mjs";
export function onRequestGet(context) { return getInvestigationDossierPageResponse(context); }
```

- [ ] **Step 5: Implement the dossier shell without unsafe HTML injection**

Create `investigation-dossier.html` as a complete HTML document. Reuse the site's existing BLURSOR colors and typography, but keep the logic dependency-free. Include:

- `<meta name="robots" content="noindex,nofollow,noarchive">`;
- a header with `BLURSOR`, `Investigations`, `Evidence library`, and `Method`;
- a visible `Example structure only` label;
- four semantic `<section>` elements in the approved order;
- distinct labels for `Observed fact`, `BLURSOR inference`, and `Provider-supplied rationale`;
- a loading state, generic unavailable state, and `Unresolved is a valid result` note;
- responsive stacking below 800px;
- no charts, rankings, score cards, or product-level tracker language.

Use only `document.createElement`, `textContent`, and `append` for server-returned content. The data loader must be exactly:

```js
const match = window.location.pathname.match(/^\/i\/([^/]+)$/);
if (!match) showError();
else {
  const id = match[1];
  fetch('/api/investigations/' + encodeURIComponent(id), { credentials: 'same-origin' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('unavailable')))
    .then(({ dossier }) => renderDossier(dossier))
    .catch(showError);
}
```

The renderer must set the question, provenance, sample counts, evidence items, hypothesis, alternatives, next test, limitations, and review metadata from the safe dossier view model. It must render a missing hypothesis as `Unresolved — the evidence does not yet support a diagnosis.`

Use this complete document:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>Investigation dossier — BLURSOR</title>
  <style>
    :root { color-scheme: dark; --bg:#10100f; --panel:#191918; --line:#33322f; --text:#f1efe8; --muted:#aaa69d; --accent:#e9d66b; --soft:#24231f; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font:16px/1.55 Inter,ui-sans-serif,system-ui,sans-serif; }
    a { color:inherit; }
    .nav { display:flex; justify-content:space-between; gap:24px; padding:18px max(24px,calc((100% - 1180px)/2)); border-bottom:1px solid var(--line); }
    .brand { font-weight:700; letter-spacing:.12em; }
    .nav-links { display:flex; flex-wrap:wrap; gap:20px; color:var(--muted); }
    main { width:min(1180px,calc(100% - 40px)); margin:0 auto; padding:48px 0 72px; }
    .eyebrow { color:var(--accent); font-size:.78rem; letter-spacing:.12em; text-transform:uppercase; }
    h1 { max-width:900px; margin:12px 0 18px; font:500 clamp(2rem,5vw,4.5rem)/1.02 Georgia,serif; }
    h2 { margin:0 0 14px; font-size:1.15rem; }
    h3 { margin:0 0 8px; font-size:1rem; }
    p { margin:0 0 12px; }
    .subhead,.muted { color:var(--muted); }
    .meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:24px; }
    .pill,.label { display:inline-block; padding:5px 9px; border:1px solid var(--line); border-radius:999px; color:var(--muted); font-size:.75rem; }
    .layout { display:grid; grid-template-columns:minmax(0,2.1fr) minmax(260px,.9fr); gap:28px; margin-top:46px; }
    .stack { display:grid; gap:18px; }
    section,.aside-block { padding:24px; border:1px solid var(--line); background:var(--panel); }
    .section-number { color:var(--accent); margin-right:8px; }
    .metric-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:16px; }
    .metric { padding:14px; background:var(--soft); }
    .metric strong { display:block; font-size:1.3rem; }
    .evidence-list,.plain-list { display:grid; gap:12px; padding:0; margin:14px 0 0; list-style:none; }
    .evidence { padding:16px; border-left:3px solid var(--line); background:var(--soft); }
    .evidence[data-type="provider_rationale"] { border-left-color:var(--accent); }
    .evidence-top { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
    .relation { color:var(--muted); font-size:.78rem; }
    .rationale { padding:16px; background:var(--soft); }
    .status { min-height:28px; margin-top:20px; color:var(--muted); }
    .error { color:#ffaaa0; }
    .aside-block + .aside-block { margin-top:18px; }
    .aside-block dt { margin-top:12px; color:var(--muted); font-size:.78rem; text-transform:uppercase; }
    .aside-block dd { margin:2px 0 0; overflow-wrap:anywhere; }
    @media (max-width:800px) { .layout { grid-template-columns:1fr; } .metric-grid { grid-template-columns:1fr; } .nav { align-items:flex-start; flex-direction:column; } main { width:min(100% - 28px,1180px); padding-top:32px; } section,.aside-block { padding:18px; } }
  </style>
</head>
<body>
  <nav class="nav" aria-label="Primary">
    <span class="brand">BLURSOR</span>
    <span class="nav-links"><span>Investigations</span><span>Evidence library</span><span>Method</span></span>
  </nav>
  <main>
    <header>
      <div class="eyebrow">Investigation dossier · <span id="example-label">Example structure only</span></div>
      <h1 id="question">Loading investigation…</h1>
      <p class="subhead" id="project"></p>
      <div class="meta" id="scope-meta" aria-label="Investigation scope"></div>
      <p class="status" id="status" role="status">Loading evidence…</p>
    </header>
    <div class="layout">
      <div class="stack">
        <section aria-labelledby="observed-title">
          <h2 id="observed-title"><span class="section-number">01</span>Observed pattern</h2>
          <span class="label">Observed fact</span>
          <p id="observed-summary"></p>
          <div class="metric-grid" id="metrics"></div>
        </section>
        <section aria-labelledby="evidence-title">
          <h2 id="evidence-title"><span class="section-number">02</span>Evidence chain</h2>
          <p class="muted">Citations, returned sources, page facts, and checker facts remain distinct.</p>
          <div class="evidence-list" id="evidence"></div>
        </section>
        <section aria-labelledby="rationale-title">
          <h2 id="rationale-title"><span class="section-number">03</span>BLURSOR diagnostic rationale</h2>
          <span class="label">BLURSOR inference</span>
          <div class="rationale" id="rationale"></div>
        </section>
        <section aria-labelledby="next-title">
          <h2 id="next-title"><span class="section-number">04</span>Alternatives and next test</h2>
          <ul class="plain-list" id="alternatives"></ul>
          <h3>Next test</h3>
          <p id="next-test"></p>
          <h3>Follow-up</h3>
          <p id="followup"></p>
        </section>
      </div>
      <aside>
        <div class="aside-block">
          <h2>Evidence state</h2>
          <p id="evidence-state">Unresolved is a valid result.</p>
          <dl><dt>Level</dt><dd id="evidence-level">—</dd><dt>Method</dt><dd id="method">—</dd><dt>Review</dt><dd id="review">—</dd></dl>
        </div>
        <div class="aside-block">
          <h2>Surface provenance</h2>
          <ul class="plain-list" id="surfaces"></ul>
          <p class="muted">Provider-supplied rationale is optional supporting evidence.</p>
        </div>
        <div class="aside-block">
          <h2>Limitations</h2>
          <ul class="plain-list" id="limitations"></ul>
        </div>
      </aside>
    </div>
  </main>
  <script>
    'use strict';
    const byId = (id) => document.getElementById(id);
    const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };
    const element = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    };
    const addList = (target, values, format) => {
      clear(target);
      for (const value of values || []) target.append(element('li', '', format ? format(value) : String(value)));
    };
    const evidenceLabel = (type) => ({
      inline_citation: 'Inline citation',
      returned_source: 'Returned source',
      page_fact: 'Page evidence',
      checker_fact: 'BLURSOR checker evidence',
      provider_rationale: 'Provider-supplied rationale',
      analyst_annotation: 'Analyst annotation',
    }[type] || 'Evidence');

    function renderDossier(dossier) {
      byId('question').textContent = dossier.header.question;
      byId('project').textContent = dossier.header.project;
      byId('example-label').textContent = dossier.header.exampleOnly ? 'Example structure only' : 'Private client evidence';
      const meta = byId('scope-meta');
      clear(meta);
      for (const value of [dossier.header.language.toUpperCase(), dossier.header.location, `Panel ${dossier.header.panelId} v${dossier.header.panelVersion}`, dossier.header.baselineWindow, dossier.header.followupWindow]) meta.append(element('span', 'pill', value));
      const observed = dossier.sections.find((section) => section.id === 'observed-pattern');
      byId('observed-summary').textContent = observed.summary;
      const metrics = byId('metrics');
      clear(metrics);
      for (const metric of observed.metrics) {
        const card = element('div', 'metric');
        card.append(element('span', 'muted', `${metric.label} · ${metric.window}`));
        card.append(element('strong', '', `${metric.numerator}/${metric.denominator}`));
        card.append(element('span', 'muted', metric.surfaceId));
        metrics.append(card);
      }
      const evidenceSection = dossier.sections.find((section) => section.id === 'evidence-chain');
      const evidence = byId('evidence');
      clear(evidence);
      for (const item of evidenceSection.items) {
        const row = element('article', 'evidence');
        row.dataset.type = item.type;
        const top = element('div', 'evidence-top');
        top.append(element('span', 'label', evidenceLabel(item.type)));
        top.append(element('span', 'relation', item.relation));
        row.append(top, element('h3', '', item.label), element('p', '', item.excerpt || 'No excerpt retained.'), element('p', 'muted', `${item.provenance}${item.optional ? ' · optional' : ''}`));
        evidence.append(row);
      }
      const rationaleSection = dossier.sections.find((section) => section.id === 'diagnostic-rationale');
      const rationale = byId('rationale');
      clear(rationale);
      if (!rationaleSection.hypothesis) rationale.append(element('p', '', 'Unresolved — the evidence does not yet support a diagnosis.'));
      else {
        const hypothesis = rationaleSection.hypothesis;
        rationale.append(element('h3', '', hypothesis.wording), element('p', 'muted', `Confidence: ${hypothesis.confidence}`));
        addList(rationale.appendChild(element('ul', 'plain-list')), hypothesis.basis);
        rationale.append(element('p', 'muted', `Falsifier: ${hypothesis.falsifier}`));
      }
      const nextSection = dossier.sections.find((section) => section.id === 'alternatives-next-test');
      addList(byId('alternatives'), nextSection.alternatives, (item) => `${item.wording} — ${item.disposition}`);
      byId('next-test').textContent = nextSection.nextTest;
      byId('followup').textContent = nextSection.followup ? nextSection.followup.summary : 'No comparable follow-up yet.';
      byId('evidence-state').textContent = dossier.evidenceState === 'unresolved' ? 'Unresolved is a valid result.' : dossier.evidenceState.replaceAll('_', ' ');
      byId('evidence-level').textContent = `${dossier.evidenceLevel} · ${dossier.evidenceTerm}`;
      byId('method').textContent = dossier.header.methodVersion;
      byId('review').textContent = `${dossier.review.analyst} · ${dossier.review.reviewedAt}`;
      addList(byId('surfaces'), dossier.header.surfaces);
      addList(byId('limitations'), dossier.limitations);
      byId('status').textContent = 'Evidence dossier loaded.';
    }

    function showError() {
      byId('question').textContent = 'Investigation unavailable';
      byId('status').textContent = 'The private dossier could not be loaded.';
      byId('status').classList.add('error');
    }

    const match = window.location.pathname.match(/^\/i\/([^/]+)$/);
    if (!match) showError();
    else {
      const id = match[1];
      fetch('/api/investigations/' + encodeURIComponent(id), { credentials: 'same-origin' })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error('unavailable')))
        .then(({ dossier }) => renderDossier(dossier))
        .catch(showError);
    }
  </script>
</body>
</html>
```

- [ ] **Step 6: Run the complete verification story**

Run:

```bash
npm run test:investigation
npm run test:visibility
npm test
git diff --check
git status --short
```

Expected:

- all investigation, visibility, and full-suite tests PASS;
- synthetic case has 270 observations and no Otterly data;
- both real OpenAI surfaces remain disabled and kill-switched;
- no provider adapter, credential, migration, scheduler, or dependency was added;
- only the intended files are changed.

- [ ] **Step 7: Manually inspect the local page**

Start the project's normal local Cloudflare Pages development command only if it is already documented and available. Set `INVESTIGATION_DEMO_ENABLED=true` only in the local process environment. Open `/i/kamran-synthetic` and verify:

1. the investigation question is the visual anchor;
2. evidence precedes rationale;
3. citations and returned sources have different labels;
4. provider rationale is visibly optional;
5. alternatives and the next test are not visually subordinate;
6. the page remains readable at 390px and desktop width;
7. a direct request without the feature flag returns 404.

If no documented local Pages command exists, do not install or deploy anything. Report that visual runtime inspection remains pending while retaining the passing static UI and handler tests.

- [ ] **Step 8: Commit**

```bash
git add functions/lib/investigation/investigation-handlers.mjs functions/api/investigations/[id].js functions/i/[id].js investigation-dossier.html tests/investigation/investigation-handlers.test.mjs tests/investigation/dossier-ui.test.mjs
git commit -m "feat: add private investigation dossier demo"
```

---

## Final Review Checklist

1. Run `npm test` from a clean process and record the exact pass count.
2. Run `git diff --check`.
3. Review `git diff 5367923..HEAD --stat` and `git log --oneline 5367923..HEAD`.
4. Confirm every new public-facing heading uses investigation-first language.
5. Confirm every metric includes numerator, denominator, exact surface, and window.
6. Confirm the synthetic consumer lane and fabricated API-shaped observations are visibly synthetic.
7. Confirm no code path calls OpenAI, a supplier, Otterly, Supabase, or n8n.
8. Confirm no migration, credential, deployment configuration, or production flag was added.
9. Confirm both exact OpenAI surfaces remain `disabled` with `killSwitch: true`.
10. Confirm the dossier works without provider rationale and returns `unresolved` without an approved hypothesis.
11. Confirm the feature-gated route returns the same 404 for disabled and unknown demo IDs.
12. Stop and request Alex's review before provider selection, provider-adapter work, database persistence, scheduling, deployment, or merging to `main`.
