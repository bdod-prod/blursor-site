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
