const clone = (value, seen = new WeakMap()) => {
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  const copy = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  for (const [key, child] of Object.entries(value)) copy[key] = clone(child, seen);
  return copy;
};

const deepFreeze = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
};

export function buildInvestigationDossier(input) {
  const evidenceItems = input?.evidenceItems || [];
  const alternatives = input?.alternatives || [];
  const hasIndependentEvidence = evidenceItems.some(({ type }) => type !== "provider_rationale" && type !== "analyst_annotation");
  const approved = input?.hypothesis?.reviewState === "approved"
    && alternatives.length > 0
    && hasIndependentEvidence;
  const comparable = input?.followup?.comparable === true;
  const evidenceState = approved
    ? (comparable ? input.followup.outcome : "hypothesis_ready")
    : "unresolved";
  const rationale = approved ? {
    wording: clone(input.hypothesis.wording),
    confidence: clone(input.hypothesis.confidence),
    basis: clone(input.hypothesis.basis),
    contradictions: clone(input.hypothesis.contradictions),
    inferenceSteps: clone(input.hypothesis.inferenceSteps),
    falsifier: clone(input.hypothesis.falsifier),
    reviewState: "approved",
    alternatives: alternatives.map((item) => ({
      wording: clone(item.wording),
      disposition: clone(item.disposition),
    })),
  } : null;

  return deepFreeze({
    schemaVersion: 1,
    header: {
      investigationId: clone(input.caseRecord.id),
      project: clone(input.projectLabel),
      question: clone(input.caseRecord.question),
      state: clone(input.caseRecord.state),
      language: clone(input.caseRecord.language),
      location: clone(input.caseRecord.location),
      panelId: clone(input.caseRecord.panelId),
      panelVersion: clone(input.caseRecord.panelVersion),
      methodVersion: clone(input.caseRecord.methodVersion),
      surfaces: clone(input.surfaceLabels),
      baselineWindow: clone(input.baselineWindow),
      followupWindow: clone(input.followupWindow),
      exampleOnly: input.exampleOnly === true,
    },
    evidenceState: clone(evidenceState),
    evidenceLevel: clone(input.assessment.level),
    evidenceTerm: clone(input.assessment.term),
    sections: [
      {
        id: "observed-pattern",
        title: "Observed pattern",
        summary: clone(input.observedPattern.summary),
        metrics: clone(input.observedPattern.metrics),
        coverage: clone(input.observedPattern.coverage),
      },
      {
        id: "evidence-chain",
        title: "Evidence chain",
        items: evidenceItems.map((item) => ({
          id: clone(item.id),
          type: clone(item.type),
          label: clone(item.label),
          excerpt: clone(item.excerpt),
          provenance: clone(item.provenance),
          relation: clone(item.relation),
          url: clone(item.url),
          optional: item.type === "provider_rationale",
        })),
      },
      {
        id: "diagnostic-rationale",
        title: "BLURSOR diagnostic rationale",
        status: rationale ? "reviewed" : "unresolved",
        hypothesis: rationale,
      },
      {
        id: "alternatives-next-test",
        title: "Alternatives and next test",
        alternatives: alternatives.map((item) => ({
          wording: clone(item.wording),
          disposition: clone(item.disposition),
        })),
        nextTest: clone(input.nextTest),
        intervention: clone(input.intervention || null),
        followup: clone(input.followup || null),
      },
    ],
    review: {
      analyst: clone(input.review.analyst),
      reviewedAt: clone(input.review.reviewedAt),
      extractorVersion: clone(input.review.extractorVersion),
    },
    limitations: clone(input.limitations),
  });
}
