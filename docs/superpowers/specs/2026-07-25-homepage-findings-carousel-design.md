# Homepage Findings Carousel Design

Date: 2026-07-25
Status: approved by Alex in conversation
Surface: BLURSOR homepage

## Decision

Keep the existing moving carousel and reduce it from eight research findings to four research findings plus one AI Crawler Checker card.

The tool card sits third in the five-card sequence so it is visible near the centre of the initial desktop viewport and reaches mobile readers much sooner than it did in the nine-card production sequence.

## Approved order and copy

1. **85.7%**
   - Copy: `Brand-reputation citations pointed to third-party pages. Find the domains AI cites in your category.`
   - Link: `/research/llm-brand-reputation-citations-third-party`
   - Source: `arXiv:2606.25787`
2. **1 in 10**
   - Copy: `citation failures came from technical problems. Check access, JavaScript rendering and extractability before rewriting.`
   - Link: `/research/citation-failures-generative-engine-agentgeo`
   - Source: `arXiv:2603.09296`
3. **AI Crawler Checker**
   - Copy: `See what AI crawlers can reach, read and extract from your page.`
   - CTA: `Check your page →`
   - Link: `/ai-crawler-checker`
   - Presentation: the established red tool-card treatment
4. **+29.6%**
   - Copy: `In one RAG setup, entity-focused pages improved answer accuracy; appended JSON-LD had little effect.`
   - Link: `/research/structured-data-rag-entity-pages`
   - Source: `arXiv:2603.10700`
5. **21–32 pts**
   - Copy: `Rewording the same question cut overlap between brand recommendations by 21–32 points. Test several phrasings for each intent.`
   - Link: `/research/paraphrase-brittleness-brand-recommendation`
   - Source: `arXiv:2605.27440`

## Behaviour

- Preserve the continuous carousel, pause on hover, and pause while keyboard focus is inside the carousel.
- Duplicate the same five-card sequence once for the seamless loop.
- Duplicates remain `aria-hidden="true"` and `tabindex="-1"`.
- Set the loop to `42s`. This keeps approximately the existing card travel speed after reducing the unique sequence from eight cards to five; leaving `70s` would make the shorter sequence noticeably slower.
- Under `prefers-reduced-motion: reduce`, stop animation, wrap the five primary cards, and hide the duplicate sequence.

## Scope

- Modify the homepage carousel and its regression tests.
- Preserve the surrounding research explainer, archive, article generation path, navigation, and crawler checker.
- Do not change article copy or metadata.
- Do not merge or deploy from this change. Update the existing branch and pull request after local verification.

## Verification

- Programmatically verify exact primary-card count, order, visible copy, links, sources, tool treatment, and inaccessible duplicates.
- Verify all four research targets exist locally and the checker route exists.
- Run the complete repository test suite.
- Inspect desktop and mobile layouts.
- Inspect reduced-motion rendering and keyboard focus behaviour.
