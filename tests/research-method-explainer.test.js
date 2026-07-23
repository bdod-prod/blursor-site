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
const STEP_LABELS = [
  'Follow the field',
  'Interrogate the paper',
  'Make it usable',
];
const TRUST_LINE = [
  'The pipeline helps with discovery and drafting.',
  'Publication requires editorial review.',
  'The original paper stays one click away.',
].join(' ');

function extractMethodSection(html, surface) {
  const pattern = new RegExp(
    `<section\\b[^>]*data-research-method="${surface}"[^>]*>[\\s\\S]*?<\\/section>`,
    'g',
  );
  const matches = [...html.matchAll(pattern)];
  assert.equal(matches.length, 1, `${surface} must contain one research-method section`);
  return matches[0][0];
}

function assertStepsInOrder(section, surface) {
  let cursor = -1;
  for (const label of STEP_LABELS) {
    const next = section.indexOf(label);
    assert.ok(next > cursor, `${surface} must place "${label}" in order`);
    cursor = next;
  }
  assert.equal(
    (section.match(/class="research-method__step"/g) || []).length,
    3,
    `${surface} must contain three process steps`,
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

test('homepage explains the paper-to-distill method and links to Research', () => {
  const html = fs.readFileSync(HOME_PATH, 'utf8');
  const section = extractMethodSection(html, 'homepage');

  assertStepsInOrder(section, 'homepage');
  assertCopyDiscipline(section, 'homepage');
  assert.match(section, /Catch up with the papers shaping AI visibility/);
  assert.match(section, new RegExp(TRUST_LINE.replace(/[.]/g, '\\.')));
  assert.match(section, /href="\/research"[^>]*>Browse the research/);
  assert.doesNotMatch(html, /Every number links to its paper/);
  assert.doesNotMatch(html, /Every digest links the paper it came from/);
  assert.doesNotMatch(html, /2,800/);
  assert.doesNotMatch(html, /70,000/);
  assert.doesNotMatch(html, /March 2026/);
});

test('Research archive explains the same method before the article inventory', () => {
  const html = fs.readFileSync(ARCHIVE_PATH, 'utf8');
  const section = extractMethodSection(html, 'archive');
  const sectionPosition = html.indexOf(section);
  const articlesPosition = html.indexOf('<section class="articles">');

  assertStepsInOrder(section, 'archive');
  assertCopyDiscipline(section, 'archive');
  assert.match(section, /From paper to practical briefing/);
  assert.match(section, new RegExp(TRUST_LINE.replace(/[.]/g, '\\.')));
  assert.ok(sectionPosition < articlesPosition, 'archive method must precede the article inventory');
});

test('research compiler preserves the archive method explainer', () => {
  const html = fs.readFileSync(ARCHIVE_PATH, 'utf8');
  const articles = discoverArticles({ rootDir: ROOT_DIR });
  const rebuilt = generateArchiveHtml(html, articles);
  const section = extractMethodSection(rebuilt, 'archive');
  const sectionPosition = rebuilt.indexOf(section);
  const articlesPosition = rebuilt.indexOf('<section class="articles">');

  assertStepsInOrder(section, 'archive');
  assertCopyDiscipline(section, 'archive');
  assert.match(section, /From paper to practical briefing/);
  assert.match(section, new RegExp(TRUST_LINE.replace(/[.]/g, '\\.')));
  assert.ok(sectionPosition < articlesPosition, 'rebuilt archive method must precede the article inventory');
});
