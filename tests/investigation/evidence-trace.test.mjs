import assert from "node:assert/strict";
import test from "node:test";

import {
  EVIDENCE_TERMS,
  buildEvidenceTrace,
  normalizeEvidenceItem,
  validateLowLevelEvidenceAssessment,
} from "../../functions/lib/investigation/evidence-trace.mjs";
import { reviewedEvidence } from "./test-fixtures.mjs";

const claims = [{ id: "claim-1", observationId: "obs-1", text: "The brand is recommended." }];

const evidenceItems = [
  reviewedEvidence({
    id: "e1",
    type: "inline_citation",
    provenance: "returned_answer",
    label: "Citation",
    observationId: "obs-1",
    surfaceId: "synthetic_api_auto",
    surfaceLabel: "Synthetic API auto fixture",
  }),
  reviewedEvidence({
    id: "e2",
    type: "checker_fact",
    provenance: "independent_checker",
    label: "Checker",
    surfaceId: "blursor_checker",
    surfaceLabel: "BLURSOR checker",
  }),
  reviewedEvidence({
    id: "e3",
    type: "provider_rationale",
    label: "Provider rationale",
    observationId: "obs-1",
    surfaceId: "synthetic_api_auto",
    surfaceLabel: "Synthetic API auto fixture",
  }),
];

test("builds an immutable trace without hiding contradictory or provider-supplied evidence", () => {
  const trace = buildEvidenceTrace({
    claims,
    evidenceItems,
    relations: [
      { claimId: "claim-1", evidenceItemId: "e1", relation: "supports" },
      { claimId: "claim-1", evidenceItemId: "e2", relation: "contradicts" },
      { claimId: "claim-1", evidenceItemId: "e3", relation: "unclear" },
    ],
  });

  assert.equal(trace.claims[0].evidence[0].relation, "supports");
  assert.equal(trace.claims[0].evidence[1].relation, "contradicts");
  assert.equal(trace.claims[0].evidence[2].item.type, "provider_rationale");
  assert.equal(trace.claims[0].evidence[2].item.provenance, "provider_supplied");
  assert.equal(Object.isFrozen(trace.claims[0].evidence), true);
});

test("normalizes complete item-level provenance and safe URLs", () => {
  const item = normalizeEvidenceItem(reviewedEvidence({ id: " e1 ", excerpt: 42 }));

  assert.deepEqual(item, {
    id: "e1",
    type: "page_fact",
    provenance: "synthetic owned-page review",
    label: "Synthetic owned-page fact",
    excerpt: "42",
    url: "https://example.org/page",
    surfaceId: "owned_page_review",
    surfaceLabel: "Owned-page review",
    observationId: null,
    collectedAt: "2026-07-28T10:00:00.000Z",
    reviewState: "reviewed",
  });
  assert.throws(() => normalizeEvidenceItem(reviewedEvidence({ provenance: "" })), /provenance/i);
  assert.throws(() => normalizeEvidenceItem(reviewedEvidence({ type: "invented_evidence" })), (error) => error.code === "INVALID_EVIDENCE_TYPE");
  assert.throws(() => normalizeEvidenceItem(reviewedEvidence({ reviewState: "approved" })), (error) => error.code === "INVALID_EVIDENCE_REVIEW_STATE");
  assert.throws(() => normalizeEvidenceItem(reviewedEvidence({ collectedAt: "invalid" })), (error) => error.code === "INVALID_EVIDENCE_TIMESTAMP");
});

test("keeps the low-level assessment validator explicitly non-authoritative", () => {
  assert.deepEqual(EVIDENCE_TERMS, {
    1: "observed",
    2: "repeated",
    3: "consistent with",
    4: "likely",
    5: "supported after follow-up",
  });
  assert.equal(validateLowLevelEvidenceAssessment({ level: 1, repeated: false, observableLinks: 0, independentLinks: 0, alternativesReviewed: 0, followupComparable: false }).term, "observed");
  assert.equal(validateLowLevelEvidenceAssessment({ level: 4, repeated: true, observableLinks: 3, independentLinks: 2, alternativesReviewed: 1, followupComparable: false }).term, "likely");
  assert.throws(
    () => validateLowLevelEvidenceAssessment({ level: 3, repeated: true, observableLinks: 1, independentLinks: 0, providerRationaleLinks: 1, alternativesReviewed: 0, followupComparable: false }),
    /independent observable evidence/i,
  );
});

test("rejects duplicate identities and dangling evidence relations", () => {
  assert.throws(
    () => buildEvidenceTrace({ claims: [...claims, { ...claims[0] }], evidenceItems, relations: [] }),
    (error) => error.code === "DUPLICATE_EVIDENCE_CLAIM",
  );
  assert.throws(
    () => buildEvidenceTrace({ claims, evidenceItems: [...evidenceItems, { ...evidenceItems[0] }], relations: [] }),
    (error) => error.code === "DUPLICATE_EVIDENCE_ITEM",
  );
  assert.throws(
    () => buildEvidenceTrace({ claims, evidenceItems, relations: [{ claimId: "missing", evidenceItemId: "e1", relation: "supports" }] }),
    /unknown claim/i,
  );
});
