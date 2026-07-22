import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEvidenceTrace,
  normalizeEvidenceItem,
  validateEvidenceAssessment,
} from "../../functions/lib/investigation/evidence-trace.mjs";

const claims = [
  { id: "claim-1", text: "The brand is recommended." },
];

const evidenceItems = [
  { id: "e1", type: "inline_citation", provenance: "returned_answer", label: "Citation" },
  { id: "e2", type: "checker_fact", provenance: "independent_checker", label: "Checker" },
  { id: "e3", type: "provider_rationale", label: "Provider rationale" },
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

test("normalizes evidence items and requires provenance outside provider rationale", () => {
  const item = normalizeEvidenceItem({ id: " e1 ", type: "page_fact", provenance: "site_capture", excerpt: 42 });

  assert.deepEqual(item, {
    id: "e1",
    type: "page_fact",
    provenance: "site_capture",
    label: "",
    excerpt: "42",
    url: null,
    collectedAt: null,
    reviewState: "unreviewed",
  });
  assert.throws(() => normalizeEvidenceItem({ id: "e2", type: "page_fact" }), /provenance/i);
});

test("returns the allowed assessment wording for each qualifying level", () => {
  assert.equal(validateEvidenceAssessment({ level: 1, repeated: false, observableLinks: 0, independentLinks: 0, alternativesReviewed: 0, followupComparable: false }).term, "observed");
  assert.equal(validateEvidenceAssessment({ level: 4, repeated: true, observableLinks: 3, independentLinks: 2, alternativesReviewed: 1, followupComparable: false }).term, "likely");
});

test("rejects level three wording when only provider rationale is linked", () => {
  assert.throws(
    () => validateEvidenceAssessment({ level: 3, repeated: true, observableLinks: 1, independentLinks: 0, providerRationaleLinks: 1, alternativesReviewed: 0, followupComparable: false }),
    /independent observable evidence/i,
  );
});

test("rejects evidence relations that point at an unknown claim", () => {
  assert.throws(
    () => buildEvidenceTrace({ claims, evidenceItems, relations: [{ claimId: "missing", evidenceItemId: "e1", relation: "supports" }] }),
    /unknown claim/i,
  );
});
