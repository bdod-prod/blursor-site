# BLURSOR Research Method Explainer Verification

**Date:** 2026-07-24
**Branch:** `codex/research-method-explainer`
**Base:** `origin/main`
**Verified implementation HEAD:** `0fd92b50b57046bbb8daf1c78340c18df2b08aaf`

## Automated checks

| Check | Observed result |
| --- | --- |
| `node --test tests/*.test.js` | PASS — 49 tests passed, 0 failed. |
| `node scripts/build-research-index.js` | PASS — `Compiled and verified 30 research article(s)`. |
| `node --test tests/research-method-explainer.test.js` | PASS — 4 tests passed, 0 failed. |
| `git diff --exit-code` after compiler | PASS — exit 0; no generated diff. |
| `curl -fsS http://127.0.0.1:4173/ >/dev/null` | PASS — exit 0. |
| `curl -fsS http://127.0.0.1:4173/research/ >/dev/null` | PASS — exit 0. |
| `curl -fsS http://127.0.0.1:4173/assets/research-method.css >/dev/null` | PASS — exit 0. |
| `git diff --check` | PASS — exit 0. |

## Copy checks

- Forbidden-word scan: PASS — no `every`, `always`, or `never` in either
  explainer section.
- Contrast-formula scan: PASS — no `not … but`, `less … more`, `rather than`,
  or `instead of` in either explainer section.
- Unsupported-statistic check: PASS — no `2,800`, `70,000`, or `March 2026`
  in either explainer section.
- Transparency copy: PASS — both explainers state that the pipeline helps with
  discovery and drafting, publication requires editorial review, and the
  original paper remains one click away.
- Contrast: PASS — focused test passed; fallback runtime measured muted
  explainer text at `5.5963:1` against the method surface (minimum `4.5:1`).

## Visual checks

The in-app Browser runtime failed before tab acquisition:
`agent.browsers.getForUrl("http://127.0.0.1:4173/")` returned `No browser is
available` and `agent.browsers.list()` returned `[]`. The controller then
explicitly authorized a read-only bundled Playwright fallback; no package was
installed and no dependency file changed.

| Screenshot | Viewport | Observed result |
| --- | --- | --- |
| `/Users/alex/.codex/tmp/blursor-research-method-2026-07-24/home-desktop.png` | 1440 × 1100 | PASS — left-to-right process, visible ordinals/boundaries, readable copy, no clipping or overflow. |
| `/Users/alex/.codex/tmp/blursor-research-method-2026-07-24/home-mobile.png` | 390 × 844 | PASS — top-to-bottom numbered sequence, readable wrapping, no clipping or overflow. |
| `/Users/alex/.codex/tmp/blursor-research-method-2026-07-24/research-desktop.png` | 1440 × 1100 | PASS — process precedes inventory; left-to-right process, readable copy, no clipping or overflow. |
| `/Users/alex/.codex/tmp/blursor-research-method-2026-07-24/research-mobile.png` | 390 × 844 | PASS — process precedes inventory; top-to-bottom sequence, readable wrapping, no clipping or overflow. |

Fallback evidence recorded HTTP 200, expected route/title, one visible keyed
method section, ordered steps, approved trust line, no error overlays, and no
console warnings/errors for all four captures. Raw evidence:
`/Users/alex/.codex/tmp/blursor-research-method-2026-07-24/playwright-evidence.json`.

## Interaction evidence

`/` → focus and activate `Browse the research` → `/research/`.

Observed: destination `http://127.0.0.1:4173/research/`; title
`Research — BLURSOR.ai`; archive explainer visible before article inventory;
no console warnings/errors; focused link had a solid red `2px` outline with a
`4px` offset.

At 1440 × 1100, the targeted bundled-Playwright hover check observed
`textDecorationLine: none` before hover and `underline` after hover, with
`textDecorationThickness: 1px` and `textUnderlineOffset: 3px`; the red text
color was unchanged, `hoverVisible: true`, and console/page errors were zero.

Direct screenshot inspection found the component consistent with each page's
paper palette, serif/mono hierarchy, spacing, and red accents rather than
appearing pasted in.

## Branch evidence

Before this evidence follow-up commit, `git status --short --branch` returned
only:

```text
## codex/research-method-explainer...origin/main [ahead 8]
```

At the same time, `git log --oneline origin/main..HEAD` returned:

```text
9eeb82e docs: verify research method explainer
0fd92b5 fix: improve research method text contrast
dd1574f feat: explain the BLURSOR research method
17410da test: guard retired research volume claims
a75f18c test: strengthen research method contract
ef71233 test: define research method explainer contract
a2a25ed docs: plan research method explainer
8894fd9 docs: design research method explainer
```

## Boundaries

No article content, n8n, remote branches, merge state, or production state
changed. No push or deployment occurred.

## Verdict

**READY FOR REVIEW**
