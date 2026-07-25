'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  discoverArticles,
  generateArchiveHtml,
} = require('../scripts/lib/research-publication');

const ROOT_DIR = path.resolve(__dirname, '..');
const HOME_PATH = path.join(ROOT_DIR, 'index.html');
const ARCHIVE_PATH = path.join(ROOT_DIR, 'research/index.html');
const RESEARCH_METHOD_CSS_PATH = path.join(ROOT_DIR, 'assets/research-method.css');
const POSITIONING_LINE = 'Research-based insights into how AI systems retrieve, cite, and recommend information.';
const PROCESS_COPY = [
  'We monitor new research papers on AI visibility, LLM ranking factors, and how generative engines find and cite sources.',
  'We filter for findings with practical implications, examine the evidence and limitations, and distill the useful parts into readable articles.',
  'We publish the findings, the evidence behind them, and what they could mean for your work.',
];
const TRUST_LINE = [
  'The pipeline helps with discovery and drafting.',
  'Publication requires editorial review.',
  'The original paper stays one click away.',
].join(' ');

function extractHero(html, headingId, surface) {
  const pattern = new RegExp(
    `<section\\b(?=[^>]*class="[^"]*\\bhero\\b[^"]*")(?=[^>]*aria-labelledby="${headingId}")[^>]*>[\\s\\S]*?<\\/section>`,
    'g',
  );
  const matches = [...html.matchAll(pattern)];
  assert.equal(matches.length, 1, `${surface} must contain one labelled hero`);
  return matches[0][0];
}

function extractProcess(hero, surface) {
  const pattern = new RegExp(
    `<div\\b[^>]*data-research-process="${surface}"[^>]*>[\\s\\S]*?<\\/div>`,
    'g',
  );
  const matches = [...hero.matchAll(pattern)];
  assert.equal(matches.length, 1, `${surface} hero must contain one research process`);
  return matches[0][0];
}

function assertProcessCopyInOrder(process, surface) {
  let cursor = -1;
  for (const paragraph of PROCESS_COPY) {
    const next = process.indexOf(paragraph);
    assert.ok(next > cursor, `${surface} must place the approved process copy in order`);
    cursor = next;
  }
  assert.equal(
    (process.match(/class="research-process__step"/g) || []).length,
    3,
    `${surface} must contain three process steps`,
  );
}

function assertResearchProcessListSemantics(process, surface) {
  assert.match(
    process,
    /<ol\b(?=[^>]*class="research-process__steps")(?=[^>]*role="list")[^>]*>/,
    `${surface} process list must explicitly retain list semantics`,
  );
}

function assertCopyDiscipline(section, surface) {
  const forbidden = [
    [/\bevery\b/i, 'every'],
    [/\balways\b/i, 'always'],
    [/\bnever\b/i, 'never'],
    [/\bnot\b[^.]{0,80}\bbut\b/i, 'not X but Y'],
    [/\bless\b[^.]{0,80}\bmore\b/i, 'less X more Y'],
    [/\brather\s+than\b/i, 'rather than'],
    [/\binstead\s+of\b/i, 'instead of'],
    [/2,800/, 'retired 2,800 volume claim'],
    [/70,000/, 'retired 70,000 volume claim'],
    [/March 2026/, 'retired March 2026 volume claim'],
  ];
  for (const [pattern, label] of forbidden) {
    assert.doesNotMatch(section, pattern, `${surface} must avoid ${label}`);
  }
}

test('homepage hero leads with Research and explains the paper-to-distill process', () => {
  const html = fs.readFileSync(HOME_PATH, 'utf8');
  const hero = extractHero(html, 'home-title', 'homepage');
  const process = extractProcess(hero, 'homepage');
  const visibleHeroText = hero
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  assertProcessCopyInOrder(process, 'homepage');
  assertResearchProcessListSemantics(process, 'homepage');
  assertCopyDiscipline(process, 'homepage');
  assert.match(hero, new RegExp(POSITIONING_LINE.replace(/[.]/g, '\\.')));
  assert.match(
    visibleHeroText,
    /AI decides who gets recommended\. We study why and build tools to help you improve your AI visibility\./,
  );
  assert.match(
    visibleHeroText,
    /Research-based insights into how AI systems retrieve, cite, and recommend information\./,
  );
  assert.match(hero, /<em class="focus-word" style="--i:10">tools<\/em>/);
  assert.match(hero, /<em class="focus-word" style="--i:16">AI visibility\.<\/em>/);
  assert.doesNotMatch(visibleHeroText, /show you what it sees on your site/);
  assert.doesNotMatch(
    visibleHeroText,
    /Research-based insights and practical tools to improve your AI visibility\./,
  );
  assert.match(
    hero,
    /<a\b(?=[^>]*href="\/research")(?=[^>]*research-hero__action--primary)[^>]*>\s*Browse the research\s*<\/a>/,
  );
  assert.match(
    hero,
    /<a\b(?=[^>]*href="\/ai-crawler-checker")(?=[^>]*research-hero__action--secondary)[^>]*>\s*Try the crawler checker\s*<\/a>/,
  );
  assert.match(process, new RegExp(TRUST_LINE.replace(/[.]/g, '\\.')));
  assert.doesNotMatch(process, /Follow the field|Interrogate the paper|Make it usable/);
  assert.doesNotMatch(hero, /<form\b|slot__|>\s*Develop\s*</);
  assert.doesNotMatch(html, /data-research-method="homepage"|finding-card--cta|Fetches as/);
});

test('Research hero explains the paper-to-distill process before the inventory', () => {
  const html = fs.readFileSync(ARCHIVE_PATH, 'utf8');
  const hero = extractHero(html, 'research-title', 'archive');
  const process = extractProcess(hero, 'archive');
  const heroPosition = html.indexOf(hero);
  const articlesPosition = html.indexOf('<section class="articles">');

  assertProcessCopyInOrder(process, 'archive');
  assertResearchProcessListSemantics(process, 'archive');
  assertCopyDiscipline(process, 'archive');
  assert.match(process, new RegExp(TRUST_LINE.replace(/[.]/g, '\\.')));
  assert.doesNotMatch(process, /Follow the field|Interrogate the paper|Make it usable/);
  assert.doesNotMatch(html, /data-research-method="archive"/);
  assert.ok(heroPosition < articlesPosition, 'Research hero must precede the article inventory');
});

test('research compiler preserves the integrated Research hero', () => {
  const html = fs.readFileSync(ARCHIVE_PATH, 'utf8');
  const articles = discoverArticles({ rootDir: ROOT_DIR });
  const rebuilt = generateArchiveHtml(html, articles);
  const hero = extractHero(rebuilt, 'research-title', 'archive');
  const process = extractProcess(hero, 'archive');

  assertProcessCopyInOrder(process, 'archive');
  assertResearchProcessListSemantics(process, 'archive');
  assert.match(process, new RegExp(TRUST_LINE.replace(/[.]/g, '\\.')));
  assert.ok(
    rebuilt.indexOf(hero) < rebuilt.indexOf('<section class="articles">'),
    'rebuilt Research hero must precede the article inventory',
  );
});

test('research process muted text meets contrast requirements on the archive surface', () => {
  const css = fs.readFileSync(RESEARCH_METHOD_CSS_PATH, 'utf8');
  const color = css.match(/--research-process-muted:\s*(#[0-9a-f]{6})/i)?.[1];

  assert.ok(color, 'research process must define a shared muted color');
  for (const selector of [
    '.research-process__copy',
    '.research-process__trust',
  ]) {
    assert.match(
      css,
      new RegExp(`${selector.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*\\{[^}]*color:\\s*var\\(--research-process-muted\\)`, 's'),
      `${selector} must use the shared muted color`,
    );
  }

  const relativeLuminance = (hex) => {
    const channels = hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255);
    const linear = channels.map((channel) => (
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  };
  const contrast = (lighter, darker) => (lighter + 0.05) / (darker + 0.05);
  const foreground = relativeLuminance(color);
  const background = relativeLuminance('#f5f1ea');
  const ratio = contrast(Math.max(foreground, background), Math.min(foreground, background));

  assert.ok(ratio >= 4.5, `muted text contrast must be at least 4.5:1; received ${ratio.toFixed(2)}:1`);
});
