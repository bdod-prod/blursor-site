# BLURSOR AI Visibility Tracking Methodology v0.1

> Historical document. Product framing and v1 presentation are superseded by `2026-07-22-investigation-first-ai-visibility-diagnostics-design.md`. Its observation, rights, budget, privacy, and surface-separation controls remain applicable where the newer design does not replace them.

Status: publication draft; do not publish before provider-language and legal review
Effective date: not yet active

## What BLURSOR measures

BLURSOR measures how often configured brands and domains appear in answers to a fixed panel of prompts on specifically named AI and generative-search surfaces. It is a sampled monitoring method, not a measurement of total platform traffic, every possible answer, or every user's experience.

Results can vary because models, retrieval indexes, interface modes, location, account state, time, and generation randomness change. BLURSOR reports those conditions and uses repeated observations instead of presenting one answer as permanent truth.

## Surface identity

Every result names the exact measured surface and collection class:

- official API;
- native first-party dashboard;
- contractually licensed supplier;
- consumer-interface observation, if separately authorized.

Results from different surfaces are not silently merged. An API result is not labelled as a consumer application result unless the provider documents their equivalence.

## Prompt panels

Each project uses a versioned prompt panel divided into discovery, comparison, validation, and action intent. The default panel contains 30 prompts. Russian- and English-language observations are reported separately.

Prompts remain fixed during a comparison period. A substantive wording change creates a new panel version. Branded prompts and unbranded prompts are shown separately because they answer different questions.

## Collection schedule

- weekly collection;
- two independent observations per prompt and surface;
- one additional full-panel observation each month;
- documented locale, language, account state, and collection time;
- no retry after a semantically valid answer;
- up to two retries for transport, authentication, throttling, or provider failure.

Failed observations remain in the audit count. They are excluded from visibility denominators and included in the coverage metric.

## Extraction

Brand and competitor mentions are detected using configured aliases. Domains are normalized from provider-supplied citation URLs. Extraction is deterministic and versioned; ambiguous recommendations may be marked `unclear` instead of being forced into a positive or negative class.

BLURSOR preserves the original observation privately for a limited audit period so an extraction can be checked or reprocessed. Client and public reports show derived measurements, citation URLs, and limited evidence excerpts rather than a wholesale archive of model output.

## Metrics

- **Mention rate:** valid observations mentioning the configured brand divided by valid observations.
- **Recommendation rate:** valid observations conservatively recommending the brand divided by valid observations.
- **Owned citation rate:** valid observations citing a configured owned domain divided by valid observations.
- **Competitive share of mentions:** mentions of the configured brand divided by mentions of all configured brands in the panel. This is not market share.
- **First-position rate:** valid observations in which the configured brand is the first configured brand mentioned divided by valid observations.
- **Coverage:** valid observations divided by scheduled observations.
- **Answer stability:** repeated observations whose brand-mention and citation-domain sets agree, divided by repeated observations.

Metrics are calculated separately for each surface, language, prompt-panel version, methodology version, and reporting period.

## Limitations

- A prompt panel cannot represent every way users ask a question.
- Official APIs may not reproduce a provider's consumer interface.
- Native dashboards may use broader query samples that BLURSOR cannot inspect.
- Location and personalization controls differ by surface.
- A cited page is evidence of sourcing, not necessarily endorsement.
- A brand mention is not necessarily a recommendation.
- Model and search-index changes can create discontinuities even when a site has not changed.
- Small prompt groups have wide uncertainty and should be interpreted directionally.

## Change control

Methodology, prompt panels, alias dictionaries, and extractors are versioned. Historical observations are not rewritten. If a new extractor is applied to retained observations, BLURSOR records the new extractor version and retains the ability to reproduce the earlier metric where the underlying data remains available.

Material methodology changes appear in a dated changelog before new and old periods are compared.

## Independence

BLURSOR is an independent measurement service. It is not affiliated with, endorsed by, or acting on behalf of the measured AI or search providers unless a specific written partnership is stated.
