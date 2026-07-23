'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  compileResearch,
  discoverArticles,
  normalizeArticleHtml,
  selectRelatedArticles,
} = require('../scripts/lib/research-publication');

const REPO_ROOT = path.resolve(__dirname, '..');

function makeFixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blursor-research-'));
  fs.mkdirSync(path.join(rootDir, 'research'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'author'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'scripts/lib'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'index.html'), '<html><head></head><body></body></html>');
  fs.writeFileSync(path.join(rootDir, 'ai-crawler-checker.html'), '<html></html>');
  fs.writeFileSync(path.join(rootDir, 'author/alex-rostovtsev.html'), '<html></html>');
  fs.writeFileSync(path.join(rootDir, 'research/index.html'),
    '<html><head></head><body><span class="articles__count">0 articles</span><div class="articles__grid"></div></body></html>');
  fs.copyFileSync(
    path.join(REPO_ROOT, 'scripts/build-research-index.js'),
    path.join(rootDir, 'scripts/build-research-index.js'),
  );
  fs.copyFileSync(
    path.join(REPO_ROOT, 'scripts/lib/research-publication.js'),
    path.join(rootDir, 'scripts/lib/research-publication.js'),
  );
  return rootDir;
}

function runFixture(rootDir) {
  return spawnSync(process.execPath, ['scripts/build-research-index.js'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
}

test('CLI fails when any article candidate lacks BLURSOR-META', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(rootDir, 'research/missing.html'), '<html><body>article</body></html>');

  const result = runFixture(rootDir);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing\.html: expected exactly one BLURSOR-META comment/);
});

function validArticleHtml(metaOverrides = {}) {
  const meta = {
    slug: 'valid-article',
    title: 'A valid article',
    published_date: '2026-07-23',
    reading_time_min: 5,
    category_label: 'AI Visibility',
    summary_for_card: 'A complete publication fixture.',
    arxiv_id: '2607.12345',
    ...metaOverrides,
  };
  const canonicalUrl = `https://blursor.ai/research/${meta.slug}`;

  return `<!doctype html>
<!-- BLURSOR-META: ${JSON.stringify(meta)} -->
<html>
<head>
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="article:author" content="https://blursor.ai/author/alex-rostovtsev">
  <link rel="alternate" type="application/rss+xml" href="https://blursor.ai/research/feed.xml">
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    author: {
      '@type': 'Person',
      name: 'Alex Rostovtsev',
      url: 'https://blursor.ai/author/alex-rostovtsev',
    },
  })}</script>
</head>
<body>
  <div class="article-header__meta">
    <span class="sep">·</span>
    <a href="https://arxiv.org/abs/${meta.arxiv_id}" class="arxiv-link">arXiv</a>
  </div>
  <div class="more-articles__grid"></div>
</body>
</html>`;
}

function writeArticle(rootDir, fileName, metaOverrides = {}) {
  fs.writeFileSync(
    path.join(rootDir, 'research', fileName),
    validArticleHtml({ slug: path.basename(fileName, '.html'), ...metaOverrides }),
  );
}

function articleRecord(slug, metaOverrides = {}) {
  const meta = {
    slug,
    title: `${slug} title`,
    published_date: '2026-07-23',
    reading_time_min: 5,
    category_label: 'AI Visibility',
    summary_for_card: `${slug} summary.`,
    arxiv_id: '2607.12345',
    ...metaOverrides,
  };
  return {
    fileName: `${slug}.html`,
    filePath: `/research/${slug}.html`,
    html: validArticleHtml(meta),
    meta,
  };
}

test('normalization inserts one linked byline before the arXiv link', () => {
  const current = articleRecord('new-a');
  const articles = [
    current,
    articleRecord('new-b'),
    articleRecord('old', { published_date: '2026-07-22' }),
  ];
  const normalized = normalizeArticleHtml(current, articles);

  assert.equal((normalized.match(/class="article-byline"/g) || []).length, 1);
  assert.match(normalized, /By <a href="\/author\/alex-rostovtsev" rel="author" class="article-byline__link">Alex Rostovtsev<\/a>/);
  assert.ok(normalized.indexOf('article-byline') < normalized.indexOf('class="arxiv-link"'));
});

test('normalization replaces an existing compiler-managed byline idempotently', () => {
  const current = articleRecord('new-a');
  const articles = [
    current,
    articleRecord('new-b'),
    articleRecord('old', { published_date: '2026-07-22' }),
  ];
  const once = normalizeArticleHtml(current, articles);
  const twice = normalizeArticleHtml({ ...current, html: once }, articles);

  assert.equal(twice, once);
});

test('related selection uses newest non-self articles with slug tie-breaks', () => {
  const articles = [
    articleRecord('new-a', { published_date: '2026-07-23' }),
    articleRecord('new-b', { published_date: '2026-07-23' }),
    articleRecord('old', { published_date: '2026-07-22' }),
  ];

  assert.deepEqual(
    selectRelatedArticles(articles, 'new-a').map(article => article.meta.slug),
    ['new-b', 'old'],
  );
});

test('normalization writes two unique canonical related cards and is idempotent', () => {
  const current = articleRecord('new-a', { published_date: '2026-07-23' });
  const articles = [
    current,
    articleRecord('new-b', { published_date: '2026-07-23' }),
    articleRecord('old', { published_date: '2026-07-22' }),
  ];
  const once = normalizeArticleHtml(current, articles);
  const targets = [...once.matchAll(/<a href="\/research\/([^"]+)" class="more-card">/g)]
    .map(match => match[1]);

  assert.deepEqual(targets, ['new-b', 'old']);
  assert.equal(new Set(targets).size, 2);
  assert.ok(!targets.includes(current.meta.slug));
  assert.doesNotMatch(once, /rag-ranking-signal-amplification|brand-mention-llm-recommendation/);
  assert.equal(normalizeArticleHtml({ ...current, html: once }, articles), once);
});

test('discovery reports all invalid candidates before writing', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'bad-author.html');
  const badAuthorPath = path.join(rootDir, 'research/bad-author.html');
  fs.writeFileSync(badAuthorPath, fs.readFileSync(badAuthorPath, 'utf8').replace(
    'https://blursor.ai/author/alex-rostovtsev',
    'https://example.com/author',
  ));
  writeArticle(rootDir, 'duplicate.html', { slug: 'shared-slug' });
  writeArticle(rootDir, 'other.html', { slug: 'shared-slug' });
  writeArticle(rootDir, 'noindex.html');
  fs.appendFileSync(path.join(rootDir, 'research/noindex.html'), '<meta name="robots" content="noindex">');
  writeArticle(rootDir, 'bad-arxiv.html');
  const badArxivPath = path.join(rootDir, 'research/bad-arxiv.html');
  fs.writeFileSync(badArxivPath, fs.readFileSync(badArxivPath, 'utf8').replace('https://arxiv.org/abs/', 'https://example.com/abs/'));

  assert.throws(
    () => discoverArticles({ rootDir }),
    error => {
      assert.equal(error.name, 'PublicationValidationError');
      assert.match(error.message, /bad-author\.html: article:author/);
      assert.match(error.message, /duplicate\.html: duplicate slug/);
      assert.match(error.message, /noindex\.html: noindex/);
      assert.match(error.message, /bad-arxiv\.html: arXiv/);
      return true;
    },
  );
});

test('discovery orders equal dates by slug and otherwise newest first', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'new-b.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'old.html', { published_date: '2026-07-22' });
  writeArticle(rootDir, 'new-a.html', { published_date: '2026-07-23' });

  assert.deepEqual(
    discoverArticles({ rootDir }).map(article => article.meta.slug),
    ['new-a', 'new-b', 'old'],
  );
});

test('compileResearch writes normalized articles and reports the validated count and slugs', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'new-a.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'new-b.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'old.html', { published_date: '2026-07-22' });

  assert.deepEqual(compileResearch({ rootDir }), {
    articleCount: 3,
    writtenArticleCount: 3,
    articleSlugs: ['new-a', 'new-b', 'old'],
  });
  const normalized = fs.readFileSync(path.join(rootDir, 'research/new-a.html'), 'utf8');
  assert.equal((normalized.match(/class="article-byline"/g) || []).length, 1);
  assert.deepEqual(
    [...normalized.matchAll(/<a href="\/research\/([^"]+)" class="more-card">/g)]
      .map(match => match[1]),
    ['new-b', 'old'],
  );
});

test('compileResearch does not write any article until all normalizations succeed', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'new-a.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'new-b.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'old.html', { published_date: '2026-07-22' });
  const newAPath = path.join(rootDir, 'research/new-a.html');
  const before = fs.readFileSync(newAPath, 'utf8');
  const oldPath = path.join(rootDir, 'research/old.html');
  fs.writeFileSync(oldPath, fs.readFileSync(oldPath, 'utf8').replace(
    'class="arxiv-link"',
    'class="broken-link"',
  ));

  assert.throws(
    () => compileResearch({ rootDir }),
    /old\.html: ambiguous byline insertion point/,
  );
  assert.equal(fs.readFileSync(newAPath, 'utf8'), before);
});

test('discovery requires the canonical RSS feed URL', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'wrong-feed.html');
  const articlePath = path.join(rootDir, 'research/wrong-feed.html');
  fs.writeFileSync(articlePath, fs.readFileSync(articlePath, 'utf8').replace(
    'https://blursor.ai/research/feed.xml',
    'https://example.com/research/feed.xml',
  ));

  assert.throws(
    () => discoverArticles({ rootDir }),
    /wrong-feed\.html: expected RSS discovery link/,
  );
});

test('discovery aggregates duplicate declared canonical URLs', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'alpha.html');
  writeArticle(rootDir, 'beta.html');
  const betaPath = path.join(rootDir, 'research/beta.html');
  fs.writeFileSync(betaPath, fs.readFileSync(betaPath, 'utf8').replace(
    'https://blursor.ai/research/beta',
    'https://blursor.ai/research/alpha',
  ));

  assert.throws(
    () => discoverArticles({ rootDir }),
    error => {
      assert.match(error.message, /beta\.html: canonical must match its self URL/);
      assert.match(error.message, /alpha\.html: duplicate canonical https:\/\/blursor\.ai\/research\/alpha/);
      assert.match(error.message, /beta\.html: duplicate canonical https:\/\/blursor\.ai\/research\/alpha/);
      return true;
    },
  );
});

test('discovery rejects noindex directives for named crawler meta tags', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'googlebot-noindex.html');
  fs.appendFileSync(
    path.join(rootDir, 'research/googlebot-noindex.html'),
    '<meta name="googlebot" content="noindex">',
  );

  assert.throws(
    () => discoverArticles({ rootDir }),
    /googlebot-noindex\.html: noindex is not allowed/,
  );
});
