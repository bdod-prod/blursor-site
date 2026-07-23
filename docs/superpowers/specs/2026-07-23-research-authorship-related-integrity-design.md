# BLURSOR Research Authorship and Related-Article Integrity Design

**Date:** 2026-07-23  
**Status:** Approved design, awaiting written-spec review  
**Repository:** `blursor/blursor-site`  
**Branch:** `codex/research-authorship-integrity`  
**Base:** `origin/main` at `2bf6fa70a5b1f52deb01684337693645e0ef041a`

## Goal

Make every canonical BLURSOR Research article credible as a human-facing evidence link by:

1. showing a visible, linked author byline that agrees with the page metadata;
2. limiting “More from Research” cards to real published articles;
3. deriving the archive, feed, sitemap, article bylines, and related cards from one validated publication inventory; and
4. failing the build when that inventory becomes inconsistent.

This work does not rewrite article content, invent credentials, change the author identity, mutate the external n8n renderer, merge to `main`, or deploy.

## Reconciled Starting State

At the selected `origin/main` revision:

- `research/` contains 30 article HTML files, excluding `research/index.html`.
- `site/content_md/` contains 28 Markdown source files.
- 29 article HTML files contain a parseable `BLURSOR-META` comment.
- `research/agentic-rag-failure-modes-evaluation.html` is the sole article without `BLURSOR-META`.
- The current builder silently skips that page, so the generated archive, feed, and sitemap expose 29 articles while the repository and live site contain 30 article routes.
- Two articles are HTML-only outputs and therefore explain the separate 28-Markdown/30-HTML count. Markdown is an editable source where present, but it is not a complete publication registry.
- All 30 article pages contain `article:author` and Article JSON-LD identifying Alex Rostovtsev, but none shows a visible author byline.
- All 30 pages hard-code the same two related routes:
  - `/research/rag-ranking-signal-amplification`
  - `/research/brand-mention-llm-recommendation`
- Those routes are not members of the current archive/feed/sitemap inventory and resolve through the live site’s homepage fallback rather than to canonical article pages.
- The external n8n + Claude workflow renders article HTML from changed Markdown. The repository’s `scripts/build-research-index.js` then generates the public archive/feed/sitemap during deployment. The external renderer template is not stored in this repository and is outside this change’s authority.

The 29-live/30-local discrepancy is therefore not evidence that the thirtieth article was intentionally unpublished. It is a silent metadata omission.

## Publication Contract

### Canonical published set

Every `research/*.html` file except `research/index.html` is a publication candidate. A candidate belongs to the canonical published set only after it passes the complete publication contract:

- exactly one parseable `BLURSOR-META` comment;
- required metadata fields:
  - `slug`;
  - `title`;
  - `published_date`;
  - `reading_time_min`;
  - `category_label`;
  - `summary_for_card`;
  - `arxiv_id`;
- `slug` equals the article filename without `.html`;
- a self-canonical URL equal to `https://blursor.ai/research/<slug>`;
- no `noindex` robots directive;
- `article:author` equals `https://blursor.ai/author/alex-rostovtsev`;
- Article JSON-LD contains a Person named `Alex Rostovtsev` whose URL is `https://blursor.ai/author/alex-rostovtsev`;
- at least one link to the article’s declared arXiv paper; and
- the expected article header and related-article containers required for deterministic post-processing.

The build must report all validation failures and exit non-zero. It must never warn and skip an article candidate.

### Source of truth

The validated metadata-bearing article HTML set is the repository’s published inventory. The same in-memory inventory drives:

- `research/index.html`;
- `research/feed.xml`;
- article URLs in `sitemap.xml`;
- the visible byline on every article; and
- “More from Research” cards on every article.

Markdown remains the editable source for articles that have it. It cannot be the publication inventory because two currently published articles have no Markdown counterpart.

### Restoring the omitted article

Add a truthful `BLURSOR-META` comment to `research/agentic-rag-failure-modes-evaluation.html` using values already visible in that page and its matching Markdown source:

- slug: `agentic-rag-failure-modes-evaluation`;
- published date: `2026-05-22`;
- reading time: `8`;
- category: `RETRIEVAL · AGENTIC RAG`;
- arXiv ID: `2603.07379`;
- title and card summary drawn from the existing page, without rewriting the article.

Once validated, this article becomes the thirtieth member of the archive, feed, and sitemap.

## Publication Compiler

Extend `scripts/build-research-index.js` from an archive generator into a deterministic publication compiler. Keep the entrypoint and CommonJS runtime so the deployment workflow and local use remain simple.

The compiler has four stages:

1. **Discover and validate**
   - enumerate all article candidates;
   - parse metadata and structural evidence;
   - collect all errors before exiting;
   - sort the valid inventory by published date descending, with slug as the deterministic tie-breaker.

2. **Normalize article surfaces**
   - insert or replace the visible byline;
   - replace the related-card grid;
   - preserve article body copy and unrelated markup;
   - make both transformations idempotent.

3. **Generate collection surfaces**
   - regenerate the archive cards and article count;
   - regenerate the RSS feed;
   - regenerate research URLs in the sitemap while preserving defined static routes;
   - retain RSS discovery and the existing blocked-digest cleanup.

4. **Verify the written result**
   - re-read all generated files;
   - assert that the article, archive, feed, sitemap, byline, and related-card sets agree;
   - exit non-zero if post-processing did not produce the contract.

Running the compiler twice without source changes must produce no additional diff.

## Visible Authorship

Each article must contain exactly one human-readable byline in the existing `.article-header__meta` row:

```html
<span class="sep">·</span>
<span class="article-byline">By <a href="/author/alex-rostovtsev" rel="author" class="article-byline__link">Alex Rostovtsev</a></span>
```

The byline follows the date and reading time and precedes the arXiv reference. Existing `.article-byline` styles are reused; no redesign is required.

The compiler replaces an existing compiler-managed byline rather than appending another one. A malformed or duplicate byline after generation is a build failure.

Authorship agreement is exact:

- visible text: `By Alex Rostovtsev`;
- visible author link: `/author/alex-rostovtsev`;
- `article:author`: `https://blursor.ai/author/alex-rostovtsev`;
- JSON-LD Person name: `Alex Rostovtsev`;
- JSON-LD Person URL: `https://blursor.ai/author/alex-rostovtsev`.

## Related-Article Selection

Each article receives exactly two related cards selected from the same canonical published set.

For v1, the deterministic selection rule is:

1. take the globally newest articles by `published_date` descending;
2. exclude the current article;
3. use slug ascending as the tie-breaker; and
4. select the first two.

This is intentionally simple. Semantic relatedness would require a separate relevance system and evidence that it improves recommendations. The current goal is integrity, not recommendation optimization.

Every generated card uses the selected article’s canonical slug, formatted date, reading time, title, and arXiv ID. The current article cannot link to itself. The two cards cannot duplicate each other.

The two legacy soft-404 routes are removed from recommendations. Their files or historical concepts are not deleted, redirected, or restored by this work because no evidence currently places them in the canonical published set.

## Failure Behaviour

The compiler exits non-zero and does not claim success when it finds:

- missing, duplicate, or invalid metadata;
- a filename/slug/canonical mismatch;
- duplicate slugs or canonical URLs;
- missing or inconsistent author metadata;
- `noindex` on a publication candidate;
- missing arXiv evidence;
- missing article header or related-card insertion markers;
- fewer than three valid published articles, because two non-self related cards would be impossible;
- archive/feed/sitemap disagreement;
- missing, duplicate, self-referential, or noncanonical related targets; or
- missing or duplicate visible bylines.

Validation errors identify every affected filename and field in one run. No candidate is silently omitted.

To avoid partially rewritten source when preconditions are invalid, discovery and pre-write validation finish before any file is written. Unexpected write errors still fail the command; version control remains the recovery mechanism for a local interrupted write.

## Regression Protection

Add a Node built-in test suite with no new production dependencies. Tests exercise a temporary fixture tree so failure cases do not rewrite repository articles.

The suite covers:

- missing `BLURSOR-META` fails rather than skips;
- invalid metadata and duplicate slugs fail with actionable filenames;
- filename, metadata slug, and self-canonical must agree;
- a `noindex` article fails;
- author meta and JSON-LD must agree with the visible author identity;
- missing arXiv evidence fails;
- the compiler inserts exactly one linked byline and is idempotent;
- related selection excludes self, has no duplicates, and contains only published targets;
- related rendering is idempotent;
- the archive, feed, sitemap, and article inventory agree after a complete build;
- RSS discovery and Article JSON-LD remain present;
- all 30 real repository articles pass the contract after restoration; and
- a second real build produces no diff.

The deployment workflow runs the compiler and then the complete research verification before Cloudflare deployment. A failing compiler or test prevents deployment.

## Verification

Before handoff:

1. run the complete Node test suite;
2. run the real publication compiler;
3. run the complete-set verification against all 30 articles;
4. run the compiler a second time and confirm idempotence;
5. confirm the archive contains 30 unique cards;
6. confirm the feed contains the same 30 canonical article URLs;
7. confirm the sitemap contains the same 30 canonical article URLs plus the defined static routes;
8. confirm every article has exactly one visible linked byline and two valid related targets;
9. confirm every article retains its self-canonical, indexability, Article JSON-LD, RSS discovery link, and arXiv evidence; and
10. serve the static worktree locally and visually inspect at least one current article at desktop and mobile widths for byline placement and related-card layout.

The final evidence report includes changed files, exact test/build results, the reconciled count, before/after receipts, screenshots or equivalent visual receipts, and any remaining ownership limitation.

## Pipeline Ownership and Deployment Boundary

The durable repository protection is the publication compiler because it runs after externally rendered HTML and before every configured Cloudflare deployment. It repairs compiler-managed bylines and related cards even when a future n8n render omits them.

This does not correct the external n8n template itself. That remains a documented upstream ownership gap: a preview produced directly by n8n may lack the byline until the repository compiler runs. Mutating n8n requires separate authorization.

This branch may be built and tested locally. It must not be merged, pushed, or deployed without Alex’s explicit approval.

## Acceptance Criteria

The change is deploy-ready when:

- the canonical published inventory is exactly 30 articles;
- every one of those 30 articles has exactly one visible linked byline consistent with its author metadata and schema;
- every article has exactly two valid, non-self related cards drawn from the same inventory;
- the two legacy soft-404 routes appear in no related grid;
- archive, feed, sitemap, and article inventory agree exactly;
- the builder fails closed on invalid candidates;
- the full test suite, real build, post-build verification, and idempotence check pass;
- desktop and mobile visual inspection finds no byline or related-card layout regression; and
- the branch remains isolated, unmerged, unpushed, and undeployed.
