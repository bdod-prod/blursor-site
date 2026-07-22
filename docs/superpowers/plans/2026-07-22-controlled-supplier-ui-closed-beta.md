# Controlled Supplier-UI Closed Beta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encode Alex's decision to accept controlled third-party consumer-interface collection risk for a closed beta without representing that decision as platform permission or enabling an unselected supplier.

**Architecture:** Extend the existing surface-access matrix with a distinct `closed_beta` purpose and `supplier_ui_risk_accepted` state. Keep general production restricted to `production_authorized`; document the exact controls that must accompany any future supplier-specific surface before its kill switch can be opened.

**Tech Stack:** Node.js 20 built-in test runner, JavaScript ES modules, Markdown operational documents, existing dependency-free visibility planner.

## Global Constraints

- Do not select a supplier, call a provider, add credentials, deploy, apply a migration, or activate a scheduler in this change-set.
- `supplier_ui_risk_accepted` means an internal, dated business-risk decision; it does not mean OpenAI or another target platform granted permission.
- A supplier-UI observation must retain an exact supplier-specific surface ID and a visible consumer-web/supplier label.
- `production` remains limited to `production_authorized`; supplier-UI risk acceptance permits only `closed_beta` and `research` purposes.
- The initial beta remains service-supported, US-English, bounded to the approved prompt panel and cadence, free of patient-identifiable information, and protected by a kill switch and cost ceiling.
- Otterly remains an isolated comparison instrument and is not imported into BLURSOR's production observation store.
- No third-party packages.

---

### Task 1: Record the approved risk posture

**Files:**

- Create: `docs/superpowers/specs/2026-07-22-controlled-supplier-ui-closed-beta-design.md`
- Modify: `docs/superpowers/specs/2026-07-20-licensed-core-visibility-tracker-design.md`
- Modify: `docs/ops/provider-rights-register.md`
- Modify: `docs/visibility-run-planner-runbook.md`

**Interfaces:**

- Produces the authoritative meaning of `supplier_ui_risk_accepted` and `closed_beta`.
- Preserves the older licensed-core design as historical context while marking the permission-only assumption as superseded.

- [ ] **Step 1: Write the policy amendment**

Create a dated design amendment that records:

```text
official API -> production only after ordinary account, budget, and data review
supplier UI risk accepted -> closed beta and research only
research only -> isolated calibration, no client metric
production authorized -> general scheduled production
```

The amendment must explicitly state that no supplier has been selected and no target-platform authorization is being claimed.

- [ ] **Step 2: Align the historical design and operations documents**

Add a supersession note to the licensed-core design. Update the rights register and runbook so they define the new state and purpose, require an exact supplier-specific surface, and preserve the general-production prohibition.

- [ ] **Step 3: Run the documentation drift test**

Run: `node --test tests/visibility/rights-doc-drift.test.mjs`

Expected: PASS before the executable state changes because existing surface rows remain aligned.

- [ ] **Step 4: Commit the policy amendment**

```bash
git add docs/superpowers/specs/2026-07-22-controlled-supplier-ui-closed-beta-design.md docs/superpowers/specs/2026-07-20-licensed-core-visibility-tracker-design.md docs/ops/provider-rights-register.md docs/visibility-run-planner-runbook.md
git commit -m "docs: approve controlled supplier UI beta"
```

---

### Task 2: Make the closed-beta state executable

**Files:**

- Modify: `functions/lib/visibility/surface-registry.mjs`
- Modify: `tests/visibility/surface-registry.test.mjs`
- Modify: `tests/visibility/rights-doc-drift.test.mjs`

**Interfaces:**

- Produces: `VISIBILITY_RIGHTS_STATES`, `VISIBILITY_PURPOSES`, and `isVisibilityRightsStateAllowed(rightsState, purpose)`.
- Extends accepted purpose values with `closed_beta`.
- Preserves `assertVisibilitySurfaceAllowed(surfaceId, purpose)` as the runtime gate.

- [ ] **Step 1: Write failing access-matrix tests**

Add tests asserting:

```js
assert.equal(isVisibilityRightsStateAllowed("supplier_ui_risk_accepted", "closed_beta"), true);
assert.equal(isVisibilityRightsStateAllowed("supplier_ui_risk_accepted", "research"), true);
assert.equal(isVisibilityRightsStateAllowed("supplier_ui_risk_accepted", "production"), false);
assert.equal(isVisibilityRightsStateAllowed("research_only", "closed_beta"), false);
```

Also assert that unknown rights states throw `INVALID_RIGHTS_STATE`, unknown purposes still throw `INVALID_PURPOSE`, and the documented runtime rule contains the exact closed-beta limitation.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
node --test tests/visibility/surface-registry.test.mjs tests/visibility/rights-doc-drift.test.mjs
```

Expected: FAIL because the new exports and runtime rule do not exist.

- [ ] **Step 3: Implement the minimal access policy**

Add these frozen values:

```js
export const VISIBILITY_RIGHTS_STATES = Object.freeze([
  "production_authorized",
  "supplier_ui_risk_accepted",
  "contract_review",
  "verification_only",
  "research_only",
  "disabled",
]);

export const VISIBILITY_PURPOSES = Object.freeze([
  "forecast",
  "closed_beta",
  "production",
  "verification",
  "research",
]);
```

Use this exact permission matrix:

```js
const PURPOSE_STATES = Object.freeze({
  forecast: new Set(["contract_review", "supplier_ui_risk_accepted", "production_authorized"]),
  closed_beta: new Set(["supplier_ui_risk_accepted", "production_authorized"]),
  production: new Set(["production_authorized"]),
  verification: new Set(["production_authorized", "verification_only"]),
  research: new Set(["production_authorized", "supplier_ui_risk_accepted", "verification_only", "research_only"]),
});
```

`isVisibilityRightsStateAllowed` must validate both inputs and return the matrix result. `assertVisibilitySurfaceAllowed` must continue to let the kill switch and `disabled` state override every purpose.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
node --test tests/visibility/surface-registry.test.mjs tests/visibility/rights-doc-drift.test.mjs
```

Expected: all focused tests PASS.

- [ ] **Step 5: Run full verification**

Run:

```bash
npm run test:visibility
npm test
git diff --check
```

Expected: all tests PASS and no whitespace errors.

- [ ] **Step 6: Commit the executable policy**

```bash
git add functions/lib/visibility/surface-registry.mjs tests/visibility/surface-registry.test.mjs tests/visibility/rights-doc-drift.test.mjs
git commit -m "feat: gate supplier UI collection to closed beta"
```

---

## Self-Review Checklist

1. Confirm no runtime surface was silently assigned `supplier_ui_risk_accepted` before an exact supplier is selected.
2. Confirm `production` still rejects `supplier_ui_risk_accepted`.
3. Confirm `closed_beta` rejects `research_only`, `contract_review`, `verification_only`, and `disabled`.
4. Confirm every document says internal risk acceptance rather than platform permission.
5. Confirm no credentials, provider calls, migrations, scheduler changes, deployments, or client data were added.
6. Run `npm test`, `git diff --check`, and review `git diff HEAD~2..HEAD` before reporting completion.
