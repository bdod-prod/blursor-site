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

Unresolved is a valid result at every stage. A higher evidence level permits stronger wording but does not erase uncertainty or establish causality automatically.

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
