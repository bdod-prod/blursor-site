# BLURSOR Research Hero Integration Verification

**Date:** 2026-07-25  
**Branch:** `codex/research-method-explainer`  
**Verified implementation HEAD:** `b4f05002092a4edcf36eb3b1658356b83e3202b1`

## Automated checks

| Check | Observed result | Exit result |
| --- | --- | --- |
| `node --test tests/*.test.js` | 49 tests passed; 0 failed, cancelled, or skipped | 0 |
| `node scripts/build-research-index.js` | `Compiled and verified 30 research article(s)` | 0 |
| `node --test tests/research-method-explainer.test.js` | 4 tests passed; 0 failed, cancelled, or skipped | 0 |
| Compiler idempotence in the complete suite | `a second compiler run produces byte-identical output` passed | 0 (within the 49-test suite) |
| Post-compiler working-tree idempotence | `git diff --exit-code` produced no output after the compiler ran | 0 |
| `git diff --check` | Produced no whitespace errors | 0 |

The focused contrast test passed with the shared muted colour `#665f55`; its measured contrast against `#f5f1ea` is 5.5963:1.

## Contract evidence

| Contract | Observed result |
| --- | --- |
| Homepage positioning and CTAs | The homepage hero renders the research-based positioning, a primary `Browse the research` action with `href="/research"`, and a distinct secondary `Try the crawler checker` action with `href="/ai-crawler-checker"`. At all three measured homepage viewports both actions were visible; the primary background was `rgb(26, 26, 24)` and the secondary background was transparent. |
| Retired crawler-form and ticker CTA | The homepage-hero contract test passed: the hero contains no `form`, `slot__`, or `Develop` workbench content; the document contains neither `finding-card--cta` nor `Fetches as`. Visual inspection of all homepage screenshots found no crawler form or bot list in the hero. |
| Shared process and trust line | Both pages rendered one `data-research-process` block with exactly three `.research-process__step` items, `role="list"`, and the shared publication-review/original-paper trust line. |
| Archive compiler preservation | The focused compiler-preservation test passed, and the direct compiler invocation completed with 30 verified articles without changing the working tree. |

## Responsive and accessibility evidence

Browser method: the in-app Browser could not acquire `http://127.0.0.1:4173/` (`No browser is available`), so the already installed Playwright 1.58.0 Python runtime was used without changing dependencies. `python3 -m http.server 4173` served `/`, `/research/`, and `/assets/research-method.css` successfully before browser checks.

| Route | Viewport | Process bottom / viewport | Process above fold | Overflow | Steps / list role | Layout observation | Console / page errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 1440x900 | 576.73 / 900 | true | false (1440 / 1440) | 3 / `list` | Two columns; editorial x=215.5, process x=849.7 | [] / [] |
| `/` | 1280x800 | 576.73 / 800 | true | false (1280 / 1280) | 3 / `list` | Two columns; editorial x=135.5, process x=766.5 | [] / [] |
| `/` | 390x844 | 1218.50 / 844 | Not required on mobile | false (390 / 390) | 3 / `list` | One column; editorial y=170.8 before process y=768.2 | [] / [] |
| `/research/` | 1440x900 | 643.72 / 900 | true | false (1440 / 1440) | 3 / `list` | Two columns; editorial x=255.5, process x=841.7 | [] / [] |
| `/research/` | 1280x800 | 643.72 / 800 | true | false (1280 / 1280) | 3 / `list` | Two columns; editorial x=175.5, process x=758.5 | [] / [] |
| `/research/` | 390x844 | 858.27 / 844 | Not required on mobile | false (390 / 390) | 3 / `list` | One column; editorial y=150.0 before process y=434.1 | [] / [] |

Keyboard interaction on the 1440x900 homepage reached both actions by Tab. Each focused control had `outline: solid 2px rgb(183, 53, 36)` with `outline-offset: 4px`.

- Activating `Browse the research` set the local pathname to `/research/` and returned the Research page (HTTP 200).
- Activating `Try the crawler checker` set the local pathname to `/ai-crawler-checker`, exactly matching its href. The source page `http://127.0.0.1:4173/ai-crawler-checker.html` returned HTTP 200. Python's static server does not emulate the deployment's extensionless-route rewriting, so its direct `/ai-crawler-checker` request returned a local 404 and added one post-navigation console resource error. This was not present on either page before navigation.

## Screenshot evidence

| Screenshot | Inspection result |
| --- | --- |
| `/Users/alex/.codex/tmp/blursor-research-hero-2026-07-25/home-1440x900.png` | Headline readable; process fully above fold; primary Research action visibly stronger; no crawler form or bot list; muted process text readable. |
| `/Users/alex/.codex/tmp/blursor-research-hero-2026-07-25/home-1280x800.png` | Headline readable; process fully above fold; two actions visible and distinct; no clipping, overlap, or missing text observed. |
| `/Users/alex/.codex/tmp/blursor-research-hero-2026-07-25/home-390x844.png` | Editorial content precedes the process; actions remain separate and readable; mobile spacing does not recreate a standalone research-method section. |
| `/Users/alex/.codex/tmp/blursor-research-hero-2026-07-25/research-1440x900.png` | Process fully above fold and presented as an integrated column rather than a dashboard card; the `Recent digests` inventory begins immediately after the hero. |
| `/Users/alex/.codex/tmp/blursor-research-hero-2026-07-25/research-1280x800.png` | Process fully above fold; no clipping, overlap, or disappearing text observed; muted text remains readable. |
| `/Users/alex/.codex/tmp/blursor-research-hero-2026-07-25/research-390x844.png` | Editorial content stacks before the process; no horizontal overflow, clipping, or standalone-section gap observed. |

## Branch boundaries

At the pre-evidence capture, `git status --short --branch` reported `## codex/research-method-explainer...origin/main [ahead 15]` with no changed files. `git log --oneline origin/main..HEAD` reported:

```text
b4f0500 feat: integrate research process into archive hero
c55aab1 feat: integrate research process into homepage hero
799fbf1 docs: plan integrated research heroes
5542e72 docs: redesign research explainer around heroes
486fda0 docs: refresh research method verification
ce65f16 fix: preserve research method list semantics
10a5e32 docs: add research method evidence
9eeb82e docs: verify research method explainer
0fd92b5 fix: improve research method text contrast
dd1574f feat: explain the BLURSOR research method
17410da test: guard retired research volume claims
a75f18c test: strengthen research method contract
ef71233 test: define research method explainer contract
a2a25ed docs: plan research method explainer
8894fd9 docs: design research method explainer
```

No push, merge, deployment, or n8n change was performed during verification.

## Verdict

**READY FOR REVIEW.** The implementation criteria were proven by fresh automated, compiler, responsive, accessibility, interaction, and visual evidence. The sole 404/error observation is limited to Python's non-rewriting local server after following the extensionless checker link; the href and requested pathname are correct, and the corresponding `.html` source returns HTTP 200 locally.
