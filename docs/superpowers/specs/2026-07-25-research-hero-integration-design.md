# BLURSOR Research Hero Integration Design

**Date:** 2026-07-25
**Status:** Approved
**Repository:** `blursor/blursor-site`
**Branch:** `codex/research-method-explainer`
**Supersedes:** `2026-07-24-research-method-explainer-design.md`

**Later amendment:** `2026-07-25-homepage-findings-carousel-design.md`
supersedes this document's findings-ticker decisions. The typography amendment
below does not change that five-card carousel contract.

## Goal

Make BLURSOR's paper-to-distill process visible as soon as a desktop visitor lands on the homepage or Research archive. The revised pages should also distinguish the site's two product lanes:

1. research-based insights about how AI systems retrieve, cite, and recommend information; and
2. practical tools for investigating AI visibility.

The homepage should lead visitors into the Research archive while retaining a smaller path to the crawler checker. It should not present the crawler form as part of the research-distillation process.

## Current Problems

The implemented explainer is accurate, but its location and presentation weaken it:

- it appears below the homepage findings band and below the Research hero, so the process is not immediately visible;
- its short headings — “Follow the field,” “Interrogate the paper,” and “Make it usable” — read like instructions to the visitor;
- the homepage URL field gives the crawler checker more visual weight than the Research archive;
- the crawler form, crawler list, research link, and hero message compete for attention;
- the checker card inside “What the research actually says” is not a research finding; and
- the homepage says “Free instruments” while only one public instrument is currently linked.

## Approved Structure

Use an integrated two-column hero on both pages.

### Homepage

The desktop hero contains:

- a left column with the existing editorial headline, the approved positioning sentence, and two links;
- a right column with the three-step paper-to-distill process and the editorial trust line.

The primary link is `Browse the research` and points to `/research`. The secondary link is `Try the crawler checker` and points to `/ai-crawler-checker`.

Remove the homepage URL form, `Develop` button, crawler list, and supporting form copy. The crawler checker remains available through the secondary hero link and primary navigation.

Remove the crawler-checker call-to-action card from the paper-backed findings ticker, including its duplicate used by the animation. That band should contain research findings only.

Remove the standalone homepage research-method section because its content moves into the hero.

### Research archive

The desktop hero contains:

- a left column with the current Research headline and a concise catch-up explanation;
- a right column with the same three-step process and trust line.

The article count and inventory follow the hero directly. Remove the standalone archive research-method section.

### Responsive behavior

At desktop widths, the hero uses a wider editorial column on the left and a narrower process column on the right. The process is presented as an open vertical sequence, without a card background.

At tablet and mobile widths, the columns stack in document order:

1. headline and supporting copy;
2. homepage actions, when present;
3. process steps; and
4. trust line.

The ordered list remains intact so the reading sequence does not depend on the visual grid.

## Approved Web Copy

### Shared positioning

Alex's approved category positioning remains:

> Research-based insights and practical tools to improve your AI visibility.

The homepage now expresses this positioning across its headline and supporting
line instead of repeating the category sentence verbatim. Immediate calls to
action still name the two currently available surfaces: the Research archive
and the crawler checker.

Do not promise freedom from bias. Research and inspectable evidence can improve judgment, but they cannot eliminate bias.

### Homepage left column

**Kicker**

> AI-visibility research · Practical tools

**Headline**

> AI decides who gets recommended. We study why and give you tools to improve AI visibility.

**Supporting copy**

> Research-based insights into how AI systems retrieve, cite, and recommend information.

The headline uses `give you tools` to make BLURSOR's practical role explicit.
`To improve AI visibility` names the intended use without promising that a
tool alone will produce higher visibility. The supporting line explains the
research lane without repeating the headline's tool-and-improvement language.

**Primary link**

> Browse the research

**Secondary link**

> Try the crawler checker

### Research archive left column

**Headline**

Keep the existing headline:

> How AI decides what to cite, rank, and surface

**Supporting copy**

> Catch up with the papers shaping AI visibility. Each distill explains the findings, supporting evidence, and practical implications in plain English.

### Shared process

Do not use short step headings. Each two-digit ordinal introduces one first-person paragraph.

**01**

> We monitor new research papers on AI visibility, LLM ranking factors, and how generative engines find and cite sources.

**02**

> We filter for findings with practical implications, examine the evidence and limitations, and distill the useful parts into readable articles.

**03**

> We publish the findings, the evidence behind them, and what they could mean for your work.

**Trust line**

> The pipeline helps with discovery and drafting. Publication requires editorial review. The original paper stays one click away.

## Visual Design

The change should feel native to BLURSOR's existing editorial system:

- retain the cream paper background and Research archive crosshair texture;
- retain Source Serif for editorial copy and IBM Plex Mono for kickers, ordinals, and actions;
- use red as an accent rather than a large surface;
- use a roughly 58/42 desktop split with enough gap to keep the headline and steps distinct;
- render the process as three compact rows with thin rules;
- place each ordinal beside its paragraph, rather than above a separate heading;
- keep the primary Research link visually stronger than the checker link; and
- avoid a new card, illustration, or decorative pipeline diagram.

The homepage hero should use the site's full content width rather than the current narrow text column. Its type scale may be reduced modestly so the complete message and process are visible together without crowding.

The approved homepage headline scale is:

- a `3.05rem` maximum at desktop widths, reduced from `3.35rem`;
- `2.35rem` below the existing `820px` breakpoint, reduced from `2.55rem`; and
- the existing `2.15rem` size below `560px`.

This reduction applies only to the homepage H1. It preserves the naturally
wrapping sentence and its three red italic phrases while giving 13-inch laptop
screens more breathing room. It does not change the headline wording, column
split, line height, or Research archive typography.

At 1440 × 900 and 1280 × 800, a desktop visitor should see the complete three-step process without scrolling. This above-the-fold requirement applies to the process, not to the following findings or article inventory.

## Information Hierarchy

The homepage establishes this order:

1. BLURSOR's editorial point of view;
2. the research-and-tools positioning;
3. the Research archive as the primary next step;
4. the paper-to-distill method;
5. the crawler checker as a secondary product path; and
6. paper-backed findings.

The Research archive establishes:

1. what the archive covers;
2. how its distills are produced; and
3. the current article inventory.

Research findings and tool promotion should remain visibly separate even though both support the same AI-visibility practice.

## Markup and Accessibility

Each hero is labelled by its existing `h1`.

The process is an ordered list containing three list items. CSS may remove visible list markers, so the list must retain explicit list semantics for Safari and VoiceOver. The two-digit ordinals remain decorative to assistive technology.

The homepage actions are ordinary links. Both need visible hover and keyboard-focus states. The primary and secondary treatments must remain distinguishable without relying on color alone.

On mobile, the DOM order must match the reading order. No content may require horizontal scrolling.

## Durability

The Research compiler replaces only the article-grid contents and visible article count. The integrated archive hero remains outside those managed markers and must survive repeated compiler runs without changes.

The shared process copy appears in both published HTML surfaces. Tests are the contract that keeps the wording and structure aligned; this change does not introduce a new template system.

## Regression Coverage

Update the focused tests to prove that:

- the homepage hero contains one ordered three-step process;
- the Research hero contains the same ordered process;
- the retired step headings do not appear;
- the approved positioning sentence appears on the homepage;
- the homepage contains links to `/research` and `/ai-crawler-checker`;
- the homepage no longer contains the URL form, `Develop` button, crawler-list copy, or standalone research-method section;
- the paper-backed findings band contains no crawler-checker call-to-action card;
- the Research archive no longer contains a standalone research-method section;
- the trust line appears on both surfaces;
- the Research compiler preserves the integrated archive hero;
- repeated compiler runs remain idempotent;
- copy-discipline guards still reject `every`, `always`, `never`, contrast formulas, and retired volume claims inside the new process; and
- muted process text still meets WCAG AA contrast.

The full existing test suite must also remain green.

## Verification

Implementation verification must include:

1. a failing focused test that describes the new hero contract;
2. the focused suite after implementation;
3. the complete Node test suite;
4. one Research compiler run followed by a second idempotence run;
5. HTML and diff checks;
6. desktop screenshots of both pages at 1440 × 900 and 1280 × 800;
7. a homepage screenshot at `712 × 800` to exercise the narrow-laptop breakpoint;
8. mobile screenshots of both pages at 390 × 844;
9. checks for wrapping, overlap, horizontal overflow, focus visibility, list semantics, and contrast; and
10. confirmation that the branch is still unmerged and undeployed.

## Boundaries

This change does not:

- modify the crawler checker itself;
- remove the crawler checker route or primary-navigation link;
- alter research article bodies, metadata, or source links;
- change the external n8n workflow;
- add another public tool;
- add analytics or subscription behavior;
- push the branch;
- merge to `main`; or
- deploy the site.

## Acceptance Criteria

The branch is review-ready when:

- both desktop heroes show the paper-to-distill process immediately;
- the homepage uses the approved research-and-tools positioning;
- Research is the primary homepage action and the checker is secondary;
- the homepage crawler form and crawler list are gone;
- the findings ticker contains research findings only;
- both pages use the approved first-person process copy without mini-headings;
- the source-paper and editorial-review disclosure remains visible;
- desktop and mobile layouts pass visual inspection;
- automated, compiler, accessibility, and copy-discipline checks pass; and
- the branch remains unmerged and undeployed.
