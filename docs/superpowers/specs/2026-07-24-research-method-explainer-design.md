# BLURSOR Research Method Explainer Design

**Date:** 2026-07-24
**Status:** Superseded on 2026-07-25 by `2026-07-25-research-hero-integration-design.md`
**Repository:** `blursor/blursor-site`
**Branch:** `codex/research-method-explainer`
**Base:** `origin/main` at `ed4a2becf6e772e8ee2b0d865e0a2a64221e8549`

## Goal

Restore the missing explanation of how BLURSOR turns scientific papers into useful research distills. The result should make three ideas clear:

1. AI research moves faster than most practitioners can follow.
2. BLURSOR helps readers catch up by finding, examining, and translating relevant papers.
3. The original paper and its limits remain visible, so readers can inspect the evidence themselves.

The explanation belongs on both the homepage and the Research archive. It must fit BLURSOR's current darkroom design, use light pipeline transparency, and avoid language that makes the process sound automatic or infallible.

## Recovered Evidence

The pre-redesign homepage made the catch-up problem central. It said that practitioners could not keep pace with the volume of new papers, followed by a numbered process:

1. monitor research hubs;
2. filter for findings with practical implications; and
3. publish the insights, supporting data, and practical meaning.

It closed with a link promise for the original paper.

The current homepage still says BLURSOR distills research and shows paper-backed findings, but it no longer explains the process or the reader problem being solved. The Research archive has a single sentence about turning arXiv papers into actionable articles, followed immediately by the article list.

The repository and current project specification support a narrower process claim:

- an automated pipeline handles arXiv intake, filtering, full-text retrieval, evidence extraction, synthesis, and drafting;
- publication includes editorial review through the pull-request workflow; and
- published distills visibly link their source paper.

The old homepage's monthly paper-volume statistic has no preserved citation. It will not return.

## Placement Decision

Use a two-surface explanation with one conceptual message.

### Homepage

Place the complete explainer after the paper-backed findings band and before “Latest digests.”

This sequence lets the homepage establish BLURSOR's evidence first, explain how the evidence becomes a distill, and then offer current articles. It also prevents the crawler checker from becoming the site's sole apparent product.

### Research archive

Place a compact version after the Research hero and before the article count and grid.

Readers who enter through `/research` should understand the method before choosing an article. The archive version keeps the same numbered steps and trust line, with a shorter introduction.

## Approved Web Copy

### Homepage

**Kicker**

> How the research gets useful

**Heading**

> Catch up with the papers shaping AI visibility

**Introduction**

> AI research moves faster than most practitioners can follow. BLURSOR follows the work on retrieval, citations, recommendations and generative search, then turns the useful papers into briefings people can act on.

**Step 01 — Follow the field**

> A research pipeline watches arXiv for new work on how AI systems find, trust and surface information.

**Step 02 — Interrogate the paper**

> Promising studies are checked for their method, evidence, useful findings and limits. The headline opens the investigation.

**Step 03 — Make it usable**

> We publish a plain-English distill: what the study found, where the finding applies and what it could change in your work.

**Trust line**

> The pipeline helps with discovery and drafting. Publication requires editorial review. The original paper stays one click away.

**Link**

> Browse the research →

### Research archive

**Kicker**

> How a distill is made

**Heading**

> From paper to practical briefing

**Introduction**

> The archive is built for catching up. It follows research on AI visibility and turns the useful papers into readable briefings.

The archive then uses the same three numbered steps and trust line as the homepage. It does not repeat the homepage link.

## Copy Constraints

The new explainer copy must:

- use no instance of `every`, `always`, or `never`;
- avoid `not X but Y`, `less X, more Y`, and similar contrast formulas;
- avoid claims that the publishing process runs perfectly or without judgment;
- describe the pipeline as helpful rather than autonomous;
- keep editorial review explicit;
- avoid an unsupported numerical claim about research volume; and
- preserve the scientific-paper origin and the link to the paper as the source of value.

Two existing homepage lines within the surrounding research story will also be tightened:

- `Every number links to its paper` becomes `Numbers link to their papers`.
- The “Show the work” paragraph will remove its repeated `Every` construction while preserving the sourcing commitment.

Article titles and summaries are outside this copy cleanup. A legitimate phrase such as “3 of every 10 citations” remains unchanged.

## Visual Design

The explainer should look like part of the current BLURSOR system:

- cream paper background against the homepage's dark sections;
- Source Serif for headings and body copy;
- IBM Plex Mono for kickers, step numbers, and labels;
- red used sparingly for the current accent and link treatment;
- a three-column step layout at desktop widths;
- a single-column numbered sequence on mobile;
- visible boundaries and generous spacing instead of decorative illustrations.

The old tilted screenshot will not return. It consumed half the section, disappeared on smaller screens, and explained less than the numbered copy.

On the Research archive, reuse its existing light page palette and grid rhythm. The section can share semantic class names and structure with the homepage while carrying page-specific color tokens.

## Markup and Accessibility

Each explainer is a labelled `<section>` containing:

- one `h2`;
- one introductory paragraph;
- an ordered list with three list items;
- visible two-digit ordinals that are decorative to assistive technology;
- a short trust note; and
- the homepage-only Research link.

The ordered list preserves the process sequence without relying on visual layout. Heading IDs and `aria-labelledby` connect each section to its title. Link focus states must remain visible.

## Durability

The archive compiler currently replaces only the article-grid contents and visible article count. The new archive explainer will sit outside those managed markers, so a normal research rebuild must preserve it.

Regression coverage will assert that:

- both pages contain one research-method explainer;
- both explainers contain the three approved step labels in order;
- the trust line appears on both pages;
- the homepage link points to `/research`;
- the archive compiler preserves the archive explainer;
- forbidden copy patterns do not appear inside either explainer; and
- neither page contains the two existing homepage `Every` constructions after cleanup.

## Verification

Before handoff:

1. run the new test first and confirm it fails because the explainers are absent;
2. implement the smallest markup and style changes that make it pass;
3. run the complete Node test suite;
4. run the research compiler and confirm the archive explainer survives;
5. run the compiler again and confirm idempotence;
6. validate the edited HTML structure;
7. serve the site locally;
8. inspect the homepage and Research archive at desktop and mobile widths;
9. check layout, reading order, contrast, focus treatment, and copy wrapping; and
10. record screenshots and exact verification results.

## Boundaries

This change does not:

- alter research article bodies or their generated metadata;
- change the external n8n workflow;
- add a research-volume statistic;
- add analytics or subscription behavior;
- change the crawler checker;
- merge to `main`; or
- deploy the site.

The branch may be committed and made review-ready. Pushing, merging, and deployment remain separate approval gates.

## Acceptance Criteria

The work is ready for review when:

- the catch-up value proposition is visible on the homepage and Research archive;
- the numbered process is understandable without surrounding context;
- the light-transparency wording matches the actual pipeline;
- scientific papers and source access remain central to the explanation;
- the new copy passes the agreed style constraints;
- the research compiler preserves the archive section;
- the full automated suite passes;
- desktop and mobile visual checks show no regression; and
- the isolated branch remains unmerged and undeployed.
