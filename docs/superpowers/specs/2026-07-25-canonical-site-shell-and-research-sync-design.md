# BLURSOR Canonical Site Shell and Research Synchronization

**Status:** Approved design  
**Date:** 2026-07-25  
**Branch:** `codex/research-method-explainer`

## Objective

Stop the BLURSOR layout from shifting when readers move between sections. The homepage header and footer become the canonical site shell, while the Research page receives a distillation-specific explainer instead of repeating the homepage’s four-step product model.

Research publication must also remain synchronized across the archive and homepage:

- `/research` lists the complete canonical article inventory.
- The homepage “Latest digests” section shows the newest three articles from that same inventory and in the same order.
- A publication build fails if the two surfaces diverge.

## Public-page scope

The canonical shell applies to all 34 current public HTML pages:

- homepage;
- AI Crawler Checker;
- Research archive;
- 30 canonical Research articles;
- author page.

Future canonical Research articles inherit the shell through the publication compiler. Runtime report views and non-public reference files are outside this change.

## Canonical header

The homepage header is the visual and structural source of truth.

### Content

- BLURSOR logo linking to `/`.
- Tagline: `Science-backed data on why AI says what it says`.
- Primary navigation:
  - `Tools` → `/ai-crawler-checker`
  - `Research` → `/research`

`What AI Sees` remains the crawler checker’s product name in titles, page content, cards, share receipts, and the footer. Only the primary navigation label changes to `Tools`.

The current page may use `aria-current="page"`. Active-page state must not change the element’s size, spacing, or border geometry.

### Layout

- Shared desktop content width: `1060px`, matching the approved homepage.
- Identical logo size, left and right padding, vertical padding, navigation gap, and typography on all pages.
- The tagline hides at the homepage’s existing compact breakpoint.
- Mobile uses the homepage’s stacked layout and keeps both navigation links visible.
- No page-specific header rule may override shell dimensions.

## Canonical footer

The homepage footer is the content and layout source of truth.

### Content

- BLURSOR brand, existing description, and existing sitewide tagline.
- `Instruments`
  - `What AI Sees` → `/ai-crawler-checker`
- `Research`
  - `All articles` → `/research`
  - `Author` → `/author/alex-rostovtsev`
- `Connect`
  - `@blursor_ai`
  - `contact@blursor.ai`
- Existing copyright and 3AM Energy credit.

The canonical footer removes the obsolete `/digest` and newsletter links currently present on the author-page variant.

### Layout

- Shared desktop content width: `1060px`.
- Shared four-column desktop grid and identical bottom-bar geometry.
- Shared responsive collapse, spacing, typography, and link states.
- Footer placement may follow page content length, but its internal geometry must remain identical.

## Research-page explainer

The homepage retains the approved four-step `How BLURSOR works` model. The Research archive uses a distinct three-step explanation:

### How a distill is made

**01**  
We find papers that address AI visibility, ranking, retrieval, and citation behavior.

**02**  
We examine the methods, results, and limitations, then isolate findings with practical implications.

**03**  
We publish the distill in plain English, with the supporting evidence and a direct link to the paper.

The Research explainer contains no tools step and does not link to its current page.

## Publication synchronization

`BLURSOR-META` remains the single source of truth for published Research articles.

The compiler sorts validated articles by:

1. `published_date`, newest first;
2. slug, ascending, as the deterministic tie-break.

That ordered collection drives:

- the complete Research archive;
- the first three homepage digest rows;
- RSS;
- sitemap entries;
- related-article cards.

The homepage cards inherit the canonical slug, title, publication date, reading time, summary, and arXiv identifier. No separate homepage article list is maintained.

The homepage synchronization is already implemented on this branch. The site-shell work must preserve its generation and verification contracts.

## Implementation architecture

### Shared styling

Create `/assets/site-shell.css` as the authoritative header and footer stylesheet. It loads after page-local styles and uses shell-scoped selectors so historical inline rules cannot alter dimensions.

The stylesheet must not require JavaScript. A versioned asset URL prevents an older cached shell from surviving a deployment.

### Compiler-managed markup

Extend `scripts/lib/research-publication.js` with an idempotent site-shell normalizer that:

- requires one header and one footer on each in-scope page;
- replaces them with canonical markup;
- ensures one versioned shared stylesheet link;
- preserves page-specific metadata and main content;
- applies `aria-current` without introducing visual width changes;
- normalizes the homepage, checker, archive, author page, and all canonical article outputs before verification.

The compiler is the durable boundary because Research articles can be regenerated upstream. Hand-editing only the current HTML files would allow later publications to restore the old shell.

### Validation

Publication verification fails when:

- an in-scope page has a missing or duplicate header/footer;
- canonical shell markup or navigation targets differ;
- the shared stylesheet is absent or duplicated;
- obsolete `/digest` footer links return;
- homepage digest targets differ from the first three canonical Research articles;
- compilation is not byte-identical on a second run.

## Accessibility

- Header navigation has an accessible label.
- The logo has a stable home-link label.
- Decorative SVGs remain hidden from assistive technology.
- Keyboard focus is visible and does not alter layout.
- Mobile navigation remains available rather than disappearing.
- Footer columns retain semantic lists and descriptive link text.

## Verification

Automated checks cover:

- canonical header and footer normalization;
- idempotence;
- exact page inventory;
- page-aware `aria-current`;
- removal of obsolete footer links;
- distinct homepage and Research explainer copy;
- homepage/Research article synchronization;
- existing archive, RSS, sitemap, byline, related-card, and source-link contracts.

Visual QA covers navigation between:

1. homepage;
2. Tools;
3. Research archive;
4. a current Research article;
5. author page.

At desktop and mobile widths, compare header and footer inner left/right coordinates, height, navigation spacing, wrapping, focus states, and horizontal overflow. Browser consoles must remain free of warnings and errors.

## Non-goals

- Renaming the `What AI Sees` product.
- Changing checker metadata, schema, report receipts, or share copy.
- Rewriting footer positioning copy.
- Introducing a JavaScript component framework or client-rendered navigation.
- Changing n8n or production infrastructure.
- Deploying or merging without Alex’s explicit approval.
