import test from "node:test";
import assert from "node:assert/strict";

import {
  VISIBILITY_PURPOSES,
  VISIBILITY_RIGHTS_STATES,
  VISIBILITY_SURFACES,
  assertVisibilitySurfaceAllowed,
  getVisibilitySurface,
  isVisibilityRightsStateAllowed,
} from "../../functions/lib/visibility/surface-registry.mjs";

test("registry uses exact surface identities and integer pricing", () => {
  assert.deepEqual(Object.keys(VISIBILITY_SURFACES).sort(), [
    "alice_ai_consumer_ui",
    "alice_pro_ui",
    "gigachat_api",
    "openai_responses_web_search_auto",
    "openai_responses_web_search_required",
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
  assert.ok(VISIBILITY_SURFACES.openai_responses_web_search_auto);
  assert.ok(VISIBILITY_SURFACES.openai_responses_web_search_required);
  assert.equal(VISIBILITY_SURFACES.openai_responses_web_search, undefined);
  for (const id of ["openai_responses_web_search_auto", "openai_responses_web_search_required"]) {
    assert.equal(VISIBILITY_SURFACES[id].rightsState, "disabled");
    assert.equal(VISIBILITY_SURFACES[id].killSwitch, true);
    assert.throws(() => assertVisibilitySurfaceAllowed(id, "research"), (error) => error.code === "SURFACE_DISABLED");
  }
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

test("accepted supplier UI risk is bounded to closed beta and research", () => {
  assert.deepEqual(VISIBILITY_PURPOSES, [
    "forecast",
    "closed_beta",
    "production",
    "verification",
    "research",
  ]);
  assert.ok(VISIBILITY_RIGHTS_STATES.includes("supplier_ui_risk_accepted"));
  assert.equal(isVisibilityRightsStateAllowed("supplier_ui_risk_accepted", "forecast"), true);
  assert.equal(isVisibilityRightsStateAllowed("supplier_ui_risk_accepted", "closed_beta"), true);
  assert.equal(isVisibilityRightsStateAllowed("supplier_ui_risk_accepted", "research"), true);
  assert.equal(isVisibilityRightsStateAllowed("supplier_ui_risk_accepted", "production"), false);
  assert.equal(isVisibilityRightsStateAllowed("supplier_ui_risk_accepted", "verification"), false);
  assert.equal(isVisibilityRightsStateAllowed("research_only", "closed_beta"), false);
  assert.equal(
    Object.values(VISIBILITY_SURFACES).some(({ rightsState }) => rightsState === "supplier_ui_risk_accepted"),
    false,
  );
});

test("access matrix rejects unknown purposes and rights states", () => {
  assert.throws(
    () => isVisibilityRightsStateAllowed("supplier_ui_risk_accepted", "sales"),
    (error) => error.code === "INVALID_PURPOSE",
  );
  assert.throws(
    () => isVisibilityRightsStateAllowed("permission_assumed", "closed_beta"),
    (error) => error.code === "INVALID_RIGHTS_STATE",
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
  for (const id of [
    "openai_responses_web_search_auto",
    "openai_responses_web_search_required",
    "rush_alice_supplier",
  ]) {
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
