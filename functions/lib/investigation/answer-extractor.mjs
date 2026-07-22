import { VisibilityError } from "../visibility/visibility-error.mjs";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const sentenceSegments = (text) => String(text || "").split(/(?<!Dr\.)(?<=[.!?])\s+/).map((value) => value.trim()).filter(Boolean);
const wordCharacter = "[\\p{L}\\p{N}_]";
const startsWithWordCharacter = (value) => new RegExp(`^${wordCharacter}`, "u").test(value);
const endsWithWordCharacter = (value) => new RegExp(`${wordCharacter}$`, "u").test(value);
const aliasPattern = (alias) => new RegExp(
  `${startsWithWordCharacter(alias) ? `(?<!${wordCharacter})` : ""}${escapeRegExp(alias)}${endsWithWordCharacter(alias) ? `(?!${wordCharacter})` : ""}`,
  "iu",
);
const normalizedAliases = (aliases) => (aliases || []).map(String).map((value) => value.trim()).filter(Boolean);

export function extractAnswerEvidence(observation, config) {
  const version = String(config?.extractorVersion || "").trim();
  const brandAliases = normalizedAliases(config?.brandAliases);
  if (!version) throw new VisibilityError("INVALID_EXTRACTOR_VERSION", "Extractor version is required.");
  if (brandAliases.length === 0) throw new VisibilityError("INVALID_ALIAS_CONFIG", "At least one brand alias is required.");
  if (observation.state === "failed") {
    return Object.freeze({ extractionState: "not_applicable", extractorVersion: version, claims: Object.freeze([]), mentions: Object.freeze([]), citations: Object.freeze([]), sources: Object.freeze([]) });
  }

  const entities = [
    { id: "brand", aliases: brandAliases },
    ...(config?.competitors || []).map((competitor) => ({ id: String(competitor.id), aliases: normalizedAliases(competitor.aliases) })),
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
        if (aliasPattern(alias).test(claim.text)) {
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
