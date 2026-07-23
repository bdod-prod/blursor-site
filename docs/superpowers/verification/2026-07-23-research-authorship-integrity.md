# Research Authorship Integrity Verification

Date: 2026-07-23

Merge base: `2bf6fa70a5b1f52deb01684337693645e0ef041a`

Task 4 branch input: `4bbe4dd3a0a3a7633169c9d68688970700989120`

## Inventory Receipt

- Before: 30 article HTML files / 29 metadata-bearing articles / 29 legacy-builder inventory members / 0 visible bylines / 60 legacy related links.
- After: 30 article HTML files / 30 metadata-bearing articles / 30 generated inventory members / 30 visible bylines / 60 valid related links.
- Baseline clarification: the legacy builder would discover 29 metadata-bearing articles, as recorded in the reconciled design baseline. The tracked archive, feed, and sitemap files themselves were additionally stale at 25 entries before this build.
- The omitted article metadata uses its existing page description verbatim for `subtitle` and `summary_for_card`: “A new SoK survey of 118 works shows that agentic RAG's iterative retrieval and memory systems introduce failure modes that static metrics and current benchmarks cannot detect.”
- All 30 current `.article-body` blocks remain byte-identical to the Task 4 branch input.

## Automated Verification

Command:

```text
node --test tests/research-publication.test.js tests/research-repository.test.js
```

Result: 29 tests passed, 0 failed, 0 skipped.

Compiler command:

```text
node scripts/build-research-index.js
```

Result:

```text
Compiled and verified 30 research article(s)
```

The first real compiler run exposed a recovery-order defect: four existing articles lacked RSS discovery, but discovery rejected them before the compiler could restore the tag. A focused RED fixture reproduced the failure. The corrected compiler treats RSS insertion as normalization and retains exact RSS verification after writing.

The required mobile inspection then exposed metadata clipping at 390 × 844. Two focused RED tests reproduced the missing compiler-managed mobile rule and missing post-write guard. The corrected compiler deterministically inserts and verifies one managed `@media (max-width: 640px)` rule that allows `.article-header__meta` to wrap.

Syntax checks passed for:

```text
node --check scripts/build-research-index.js
node --check scripts/lib/research-publication.js
node --check tests/research-publication.test.js
node --check tests/research-repository.test.js
```

## Idempotence

Commands:

```text
git diff --binary > /tmp/blursor-research-before-second-build.patch
node scripts/build-research-index.js
git diff --binary > /tmp/blursor-research-after-second-build.patch
cmp /tmp/blursor-research-before-second-build.patch /tmp/blursor-research-after-second-build.patch
```

Result: `cmp` exited `0`. Both patch files have SHA-256 `57ddd06e86a21a9f7e4f8ee30075b4ab1e89462c44f9a53ca3d538de629ac754`.

## Published-Set Equality

- Article HTML inventory: 30 unique slugs.
- Archive: 30 unique article-card slugs, exactly equal to the article inventory.
- Feed: 30 unique item URLs, exactly equal to the article canonical URL set.
- Sitemap: 30 unique article URLs, exactly equal to the article canonical URL set, plus the four required non-article routes.
- Every article has one exact linked byline and two deterministic, unique, non-self related targets.
- The two legacy soft-404 related targets occur in no related grid.

## Visual Verification

Page: `http://127.0.0.1:4173/research/drnoise-shows-one-false-document-can-knock-agents-off-course.html`

Desktop viewport override: 1440 × 1000 (`innerWidth` 1440, `innerHeight` 1000; content client width 1425 because of the scrollbar).

- One visible `By Alex Rostovtsev` byline links to `/author/alex-rostovtsev`.
- Metadata client/scroll dimensions are 624 × 20 in both cases; no clipping or overlap.
- Two related cards render without overflow; grid client/scroll width is 1029 in both cases.
- Targets are `generative-search-citations-surface-predictors` and `generative-engine-optimization-doesnt-translate`; neither is the current article.

Mobile viewport override: 390 × 844 (`innerWidth` 390, `innerHeight` 844; content client width 375 because of the scrollbar).

- One visible `By Alex Rostovtsev` byline links to `/author/alex-rostovtsev`.
- Computed `flex-wrap` is `wrap`; metadata stays within the viewport at left 25.5/right 349.5, with client/scroll dimensions both 324 × 54.
- The arXiv link is fully visible at left 196.36/right 318.77.
- The document has no horizontal overflow: client and scroll widths are both 375.
- Two non-self related cards stack cleanly; grid client/scroll width is 324 in both cases.
- Header text, byline, arXiv link, related cards, and footer remain readable without overlap or clipping.

Primary PNG receipts:

- `/tmp/blursor-research-authorship-desktop.png`
- `/tmp/blursor-research-authorship-mobile.png`

Related-card PNG receipts:

- `/tmp/blursor-research-authorship-desktop-related.png`
- `/tmp/blursor-research-authorship-mobile-related.png`

## Changed-File Categories

- Publication compiler and thin CLI.
- Fixture and real-repository publication tests.
- Deployment workflow pre-deploy integrity gate.
- Thirty compiler-normalized article HTML files.
- Generated research archive, RSS feed, and sitemap.
- This local verification receipt.

The external n8n rendering template remains unchanged and outside this repository change. Markdown article sources also remain unchanged.

## Verdict

**LOCALLY DEPLOY-READY — merge, push, and deployment still require Alex’s approval**
