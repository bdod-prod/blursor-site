# BLURSOR Investigation-First AI Visibility Diagnostics

Date: 2026-07-22  
Status: approved product direction; written specification awaiting Alex's review  
Initial case: Dr. Kamran Aghayev, authorized site  

## Decision

BLURSOR is not a visibility tracker. It is a service-supported AI visibility investigation and diagnostic system.

Scheduled prompt collection remains necessary infrastructure, but the product does not culminate in a score, rank chart, or monitoring dashboard. It culminates in an evidence dossier that answers a bounded question:

> What observable evidence can explain this sampled AI answer pattern, what alternative explanations remain, and what should be tested next?

BLURSOR's core public promise is an independently constructed evidence trace. Provider-supplied reasoning or rationale may appear as optional supporting evidence when a provider exposes it and its retention is permitted. It never substitutes for BLURSOR's trace and is never presented as ground truth about a model's hidden reasoning.

This design supersedes the product posture, terminology, and client presentation in `2026-07-20-licensed-core-visibility-tracker-design.md`. It does not weaken that document's data, budget, surface-separation, privacy, or approval controls. The controlled supplier-UI risk decision in `2026-07-22-controlled-supplier-ui-closed-beta-design.md` also remains in force.

## Product claim and limit

BLURSOR may retain the brand line:

> Science-backed data on why AI says what it says.

The method note must immediately narrow that claim:

> BLURSOR reconstructs the observable evidence path behind sampled AI answers. It does not claim access to a model's complete hidden reasoning or guarantee what every user will see.

The investigation may identify evidence consistent with an explanation. Unless the design later supports a controlled causal test, it must not claim that a source or site change caused an answer.

## Vocabulary contract

### Product language

Use:

- investigation;
- diagnostic;
- dossier;
- observation;
- evidence item;
- evidence trace;
- finding;
- hypothesis;
- alternative explanation;
- confidence;
- intervention;
- follow-up observation;
- unresolved.

Avoid in product navigation, headings, and primary sales copy:

- tracker;
- rankings;
- universal visibility score;
- leaderboard;
- market share;
- ChatGPT rank;
- what users see.

Existing internal `visibility_*` module and field names may remain where they accurately describe the observation infrastructure. A mechanical internal rename is not part of v1.

## V1 outcome

The first complete proof is one longitudinal investigation for Dr. Kamran Aghayev:

1. establish a pre-intervention baseline;
2. identify one or more answer patterns worth investigating;
3. trace observable claims, citations, broader sources, and website-delivery evidence;
4. state a reviewable hypothesis and credible alternatives;
5. implement an authorized website intervention;
6. repeat the comparable observations;
7. report what changed, what did not, and what remains unresolved.

The career-proof artifact is the complete decision chain, not a screenshot of a chart.

## V1 scope

### Included

- one authorized project: Dr. Kamran Aghayev;
- one frozen 15-prompt panel;
- English only;
- United States location context;
- collection every three days during the baseline and follow-up windows;
- one exact logged-out consumer-web surface through a supplier approved for the closed beta;
- two separately labelled OpenAI Responses API experiments:
  - `openai_responses_web_search_auto`, where the surface decides whether to search;
  - `openai_responses_web_search_required`, where retrieval is required;
- immutable observations and request configuration;
- answer claims, citations, returned source lists, brand and competitor evidence;
- crawler and page-delivery evidence from BLURSOR's existing checker;
- analyst-reviewed hypotheses, alternatives, confidence, interventions, and follow-up findings;
- an investigation dossier as the primary interface;
- an isolated Otterly comparison dataset for directional calibration only.

One collection cycle therefore plans 45 BLURSOR observations: 15 prompts across three separately labelled surfaces. At an every-three-days cadence, a 30-day planning month contains about 10 cycles and 450 BLURSOR observations. Otterly comparisons are outside that count. Before any live activation, the planner must calculate the exact supplier and API cost for this volume and refuse the run when pricing or a hard ceiling is missing.

The baseline and follow-up each require at least three completed comparable cycles. If the authorized website intervention occurs before that minimum, BLURSOR may continue the case but must label the affected window as under-sampled and lower the strength of any conclusion.

### Excluded

- a public or self-serve SaaS;
- multiple clients, languages, or countries;
- a composite BLURSOR score;
- provider results merged into one headline number;
- Otterly data in BLURSOR's production observation database;
- a published named BLURSOR-versus-Otterly benchmark without permission or review;
- X mention monitoring;
- automated lead discovery or suggested replies;
- provider account rotation, false identities, CAPTCHA bypass, or rate-limit evasion by BLURSOR;
- public archives of complete model answers;
- autonomous diagnosis without analyst review;
- a counterfactual laboratory that generates and tests competing interventions automatically.

X monitoring remains a possible later community/reputation evidence lane. It must remain separate from AI-answer visibility. The counterfactual laboratory is a strategically relevant post-v1 investigation feature, not a v1 dependency.

## Investigation dossier hierarchy

The approved primary view is a case dossier, not a metric dashboard.

### Header

- project and investigation identity;
- exact question under investigation;
- case state;
- baseline and follow-up windows;
- exact surfaces, country, language, prompt-panel version, and method version.

### 1. Observed pattern

State only what the sampled observations show:

- which prompts produced the pattern;
- repeat count and valid/missing observations;
- brand mention, recommendation, citation, and competitor evidence;
- whether the pattern repeated;
- any disagreement across surfaces.

This section may contain small supporting counts or trends. Metrics are evidence, not the conclusion.

### 2. Evidence chain

Present the trace in inspectable layers:

1. exact sampled answer or limited excerpt;
2. answer claim or recommendation being explained;
3. inline citations attached to that claim;
4. other sources returned by the surface, clearly distinguished from citations;
5. evidence found on cited or relevant pages;
6. owned-site crawlability, delivery, entity, content, or structured-data evidence;
7. corroborating or conflicting observations from other dates or separately labelled surfaces;
8. provider-supplied rationale, if any, clearly marked as optional provider evidence.

Every item carries provenance, collection time, surface, and review state. Missing links remain visible.

### 3. BLURSOR diagnostic rationale

The rationale states:

- the working hypothesis;
- which evidence supports it;
- which evidence contradicts it;
- which inference steps are analyst judgments rather than direct observations;
- confidence and its basis;
- what would falsify or weaken the hypothesis.

If the evidence cannot support an explanation, the result is `unresolved`. That is a valid and expected outcome.

### 4. Alternatives and next test

List credible competing explanations such as:

- normal surface variance;
- prompt framing;
- search or source availability;
- stale or changing model behavior;
- location or account-state differences;
- insufficient or contradictory site evidence;
- collector failure or incomplete evidence.

End with one bounded next test, not a generic recommendation list. After an intervention, the same section records whether the follow-up strengthened, weakened, or failed to address the hypothesis.

## Evidentiary ladder

BLURSOR uses five evidence levels. Higher levels do not erase lower-level uncertainty.

1. **Single observation** — one answer under a recorded configuration. Descriptive only.
2. **Repeated pattern** — the material feature recurs under comparable prompts or repeated runs.
3. **Observable evidence link** — a claim connects to a citation, returned source, page, or owned-site delivery fact.
4. **Corroborated hypothesis** — several independent evidence items support an explanation and credible alternatives have been reviewed.
5. **Intervention and comparable follow-up** — an authorized change is followed by like-for-like observation. This strengthens or weakens the hypothesis but is not automatically causal proof.

Language follows the evidence level:

- `observed` for direct output;
- `repeated` for recurring patterns;
- `consistent with` for supported interpretations;
- `likely` only for a corroborated hypothesis with alternatives reviewed;
- `caused` only after a design capable of supporting that claim.

No investigation is required to climb the ladder. It may stop at any level and remain unresolved.

## Architecture

```text
Versioned prompt panel
        |
        v
Run planner -> rights gate -> budget gate -> exact surface adapter
        |                                      |
        |                                      v
        |                              immutable observation
        |                                      |
        v                                      v
Case registry                         deterministic extraction
        |                         (mentions, claims, citations,
        |                          sources, surface metadata)
        |                                      |
        +----------------------+---------------+
                               v
                      evidence trace builder
                     /          |             \
          cited/source pages  checker facts  optional provider rationale
                     \          |             /
                               v
                       analyst workbench
                  hypothesis -> alternatives -> next test
                               |
                               v
                     investigation dossier
```

### Component boundaries

1. **Case registry**
   - Creates the investigation question and state.
   - Links prompt panel, baseline window, intervention, and follow-up window.
   - Does not collect provider data.

2. **Observation planner and gates**
   - Reuses the existing prompt-panel validation, deterministic planning, surface rights, kill-switch, and cost-ceiling controls.
   - Produces immutable planned observations.
   - Does not decide what the results mean.

3. **Surface adapters**
   - Translate one exact surface into the normalized observation contract.
   - Preserve the full request configuration and returned evidence.
   - Never imply parity between API and consumer interfaces.

4. **Deterministic extractor**
   - Detects configured aliases, recommendation order, citations, and returned sources.
   - Segments answer claims without assigning causal meaning.
   - Is versioned and can be rerun without rewriting raw observations.

5. **Evidence trace builder**
   - Connects answer claims to citations, sources, page evidence, checker facts, and repeated observations.
   - Records whether a relationship supports, contradicts, contextualizes, or remains unclear.
   - Does not silently convert correlation into explanation.

6. **Analyst workbench**
   - Allows a reviewer to propose hypotheses, attach evidence, record alternatives, choose confidence, and define the next test.
   - Makes inferred steps visually distinct from observed facts.
   - Requires review before a rationale becomes part of a client dossier.

7. **Dossier renderer**
   - Presents the approved hierarchy.
   - Defaults to evidence state and investigation question, not a score.
   - Produces a private client view first; public case-study publication is a later explicit decision.

## Normalized observation contract

Each observation retains:

- observation, case, project, prompt, panel, and run identifiers;
- exact prompt text, wrapper, and instructions;
- exact surface, collection class, supplier or adapter version, and model label where returned;
- requested language, country/location context, device class, authentication state, and conversation state;
- exact `tool_choice`, search mode, live-access setting, and requested source-inclusion setting where applicable;
- request and response identifiers where returned;
- scheduled, started, and collected timestamps;
- repeat ordinal, success/failure state, latency, retry count, and collection cost;
- immutable raw answer or permitted raw-evidence reference;
- inline citations with answer-span attachment where available;
- the source list returned by the provider, not described as every source that influenced the answer;
- search-used and other returned feature flags;
- optional provider-supplied rationale with its own provenance and retention status;
- response hash, extractor version, and review status.

The API experiments remain distinct surfaces. Agreement between an API lane and a consumer-web lane establishes directional similarity only for this panel and period.

## Provider-supplied reasoning policy

BLURSOR does not promise, request for publication, or attempt to reconstruct private chain-of-thought.

When a provider returns an allowed reasoning summary, rationale, tool trace, or search trace:

- retain it only if the applicable terms and data policy permit retention;
- store it separately from the answer and from BLURSOR's rationale;
- label it `provider-supplied rationale`, with exact surface and model provenance;
- treat it as a claim made by the provider output, not verified evidence of the complete internal process;
- allow it to support or conflict with the independent evidence trace;
- omit it without weakening the dossier when unavailable.

The dossier must remain complete enough to review when this field is absent.

## Investigation records

The observation schema from the earlier design remains useful. V1 adds these records:

- `visibility_investigations`: question, scope, method version, baseline/follow-up windows, state, and owner;
- `visibility_answer_claims`: answer segments and claim type linked to immutable observations;
- `visibility_evidence_items`: citations, returned sources, page facts, checker facts, provider rationale, and analyst notes with provenance;
- `visibility_evidence_relations`: typed links between claims, evidence, hypotheses, and interventions;
- `visibility_hypotheses`: wording, confidence, status, falsifier, analyst, and review timestamp;
- `visibility_alternatives`: competing explanation and disposition without forced rejection;
- `visibility_interventions`: authorized change, owner, deployment evidence, and date;
- `visibility_followups`: comparison window, comparability assessment, outcome, and remaining uncertainty;
- `visibility_reviews`: append-only human approvals and revisions.

Browser roles cannot query these tables directly. Cloudflare Pages Functions remain the application boundary; provider and database secrets remain server-only.

## Case lifecycle

```text
draft
  -> baseline_collecting
  -> evidence_review
  -> unresolved | hypothesis_ready
  -> intervention_in_progress
  -> followup_collecting
  -> followup_review
  -> closed_supported | closed_weakened | closed_unresolved
```

State transitions are append-only review events. A case cannot become `hypothesis_ready` without linked evidence and at least one recorded alternative. A case cannot close after an intervention without a comparability assessment for the follow-up window. An unresolved case may remain open or return to collection after a documented next test; new evidence never rewrites the earlier unresolved review.

## Failure and uncertainty handling

- A disabled surface or engaged kill switch fails before any external request.
- A batch over the project or global ceiling is rejected before collection.
- Missing answers, refusals, and collector failures are different states and never become zero visibility.
- Bounded retries apply only to transport or provider failure, never to obtain a preferred answer.
- Partial collection remains inspectable and lowers coverage.
- An extraction failure preserves raw evidence for later reprocessing.
- An inaccessible citation remains recorded as inaccessible; it is not dropped.
- A source returned without an attached citation remains a source, not a citation.
- Conflicting evidence is preserved and shown.
- Surface drift, selector failure, supplier warning, material terms change, or platform complaint trips the supplier-specific suspension process.
- If there is not enough evidence to explain the pattern, the dossier says `unresolved` and proposes the smallest useful next test.

## Otterly calibration boundary

Otterly is a temporary external comparison instrument, not ground truth and not a BLURSOR dependency.

- Keep its exports and notes outside the production observation store.
- Match prompts, location, surface label, and time window as closely as the service allows.
- Compare direction, coverage, mentions, and citation domains privately.
- Document mismatches rather than forcing reconciliation.
- Do not use Otterly observations to fill BLURSOR collection failures.
- Do not publish a named performance comparison without permission or review.

## Privacy and medical-case controls

- Prompts contain no patient-identifiable, patient-derived, or confidential medical information.
- The investigation concerns the public brand, surgeon, services, and website only.
- Raw answers and source evidence are private by default and retained only for the approved audit period.
- Client-facing excerpts are limited to what is necessary to support a finding.
- Public case-study publication requires separate client approval, redaction review, and a claim-by-claim evidence check.

## Testing strategy

### Unit tests

- panel immutability, English-only and US-context constraints for the v1 case;
- surface identity, purpose, rights state, kill switch, and budget ceiling;
- idempotent run planning and every-three-days schedule generation;
- alias, claim, citation, and source extraction fixtures;
- citation/source separation;
- provider rationale remaining optional and separately labelled;
- allowed case-state transitions and unresolved outcomes;
- evidence-level wording rules.

### Adapter contract tests

For every enabled surface fixture, verify:

- complete request configuration is retained;
- raw response and identifiers are immutable;
- inline citation attachment and returned source lists are not conflated;
- missing search, missing citations, refusals, and failures remain distinct;
- API and consumer-web surfaces cannot share an aggregate identity.

### Integration tests

- planned observation -> stored output -> extraction -> evidence item -> reviewed hypothesis -> dossier;
- a collector failure yields partial coverage without a false absence conclusion;
- a checker report can support or contradict a hypothesis;
- a hypothesis cannot be published without an alternative and review record;
- a follow-up cannot be called comparable when the panel, country, language, or surface changed;
- Otterly data cannot enter the production observation store.

### Product and language tests

- the primary v1 navigation and case view contain no product-level `tracker`, `ranking`, or composite-score framing;
- the dossier leads with the investigation question and evidence state;
- observed facts, BLURSOR inferences, and provider-supplied rationale have distinct labels;
- unresolved is rendered as a valid result, not an error;
- every visible metric has its denominator, sample size, exact surface, and date window.

### Acceptance scenario

Using synthetic fixtures before live collection, produce one complete Kamran dossier that:

1. contains a 15-prompt US-English baseline;
2. identifies one repeated answer pattern;
3. maps a claim to citations, returned sources, and checker evidence;
4. records a hypothesis, contradiction or alternative, confidence, and falsifier;
5. records an intervention and comparable follow-up;
6. concludes `supported`, `weakened`, or `unresolved` without overstating causality.

## Delivery sequence

1. Amend product and methodology documents so investigation-first terminology is authoritative.
2. Add the case, evidence, hypothesis, alternative, intervention, follow-up, and review contracts without enabling a provider.
3. Add synthetic fixtures and prove the full dossier flow locally.
4. Add the two OpenAI web-search API adapters behind their disabled surface gates.
5. Select and document one exact consumer-web supplier, price, scope, and kill switch in a separate reviewed change.
6. Activate only the bounded Kamran closed-beta panel after credentials, retention, cost, and labels are reviewed.
7. Run the baseline, complete analyst review, and agree one authorized website intervention.
8. Run the comparable follow-up and prepare the private dossier.
9. Decide separately whether the evidence supports a public case study.

## Approval gates

This approved design does not itself authorize:

- supplier signup or payment;
- provider credentials or calls;
- database migrations;
- scheduled workflow activation;
- importing client or Otterly data;
- deploying or merging to `main`;
- publishing methodology or a client case study.

Each remains a separate reviewable change. The first implementation plan should stop at a provider-disabled, synthetic-evidence dossier unless Alex explicitly expands that change-set.
