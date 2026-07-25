# Homepage Findings Carousel Verification

Date: 2026-07-25
Branch: `codex/research-method-explainer`
Implementation commit: `ef44271`

## Result

PASS with one local-server limitation documented below.

The homepage now contains five primary carousel cards in the approved order:

1. `85.7%`
2. `1 in 10`
3. `AI Crawler Checker`
4. `+29.6%`
5. `21–32 pts`

The same sequence appears once more for the seamless loop. Duplicate cards are hidden from assistive technology and removed from keyboard order.

## Automated verification

| Check | Result |
|---|---|
| `node --test tests/research-method-explainer.test.js` | PASS — 5 tests, 0 failures |
| `node --test tests/*.test.js` | PASS — 50 tests, 0 failures |
| `git diff --check` | PASS — no whitespace errors |
| Exact primary and duplicate sequences | PASS |
| Checker is the third primary card | PASS |
| Duplicate `aria-hidden` and `tabindex` | PASS |
| Carousel duration is `42s` | PASS |
| Reduced-motion duplicate suppression | PASS |

## Route targets

| Local target | Result |
|---|---|
| `research/llm-brand-reputation-citations-third-party.html` | PASS |
| `research/citation-failures-generative-engine-agentgeo.html` | PASS |
| `ai-crawler-checker.html` | PASS |
| `research/structured-data-rag-entity-pages.html` | PASS |
| `research/paraphrase-brittleness-brand-recommendation.html` | PASS |

## Rendered browser QA

Environment:

- URL: `http://127.0.0.1:4173/`
- Browser: Codex in-app Browser
- Desktop viewport: `1440 × 1000`
- Mobile viewport: `390 × 844`
- Local server: Python static server bound to `127.0.0.1`

| Check | Result |
|---|---|
| Page URL and title | PASS — homepage and expected BLURSOR title |
| Meaningful DOM content | PASS |
| Framework error overlay | PASS — none present |
| Console warnings/errors | PASS — none |
| Five primary cards rendered | PASS |
| Red checker treatment | PASS — `rgb(183, 53, 36)` background and white heading |
| Tool prominence | PASS — checker is third and visible within the desktop sequence |
| Card sizing | PASS — desktop cards `320px` wide and equal height; mobile cards `285px` wide |
| Horizontal page overflow | PASS — `0px` at both inspected viewports |
| Keyboard focus | PASS — checker receives focus and changes the track to `animation-play-state: paused` |
| CTA navigation | PASS with local limitation — click changed the URL to `/ai-crawler-checker` |
| Reduced-motion behaviour | PASS programmatically — animation removal and duplicate suppression are protected by CSS and regression test |

Desktop screenshot:

`/Users/alex/.codex/tmp/blursor-carousel-desktop-2026-07-25.png`

Mobile screenshot:

`/Users/alex/.codex/tmp/blursor-carousel-mobile-2026-07-25.png`

## Local-server limitation

The plain Python static server does not apply the production host's extensionless-route handling. Clicking the checker card therefore reached the correct `/ai-crawler-checker` URL but returned a local 404. The target file `ai-crawler-checker.html` exists, and the change does not alter routing or deployment configuration.

## Scope confirmation

- No research article content changed.
- No archive, feed, sitemap, checker implementation, database, workflow, or deployment configuration changed.
- No merge or production deployment occurred during verification.
