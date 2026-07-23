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
  generateArchiveHtml,
  normalizeArticleHtml,
  selectRelatedArticles,
  verifyPublishedState,
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

test('discovery rejects a conflicting second article:author declaration', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'conflicting-meta-author.html');
  const articlePath = path.join(rootDir, 'research/conflicting-meta-author.html');
  fs.writeFileSync(articlePath, fs.readFileSync(articlePath, 'utf8').replace(
    '</head>',
    '  <meta property="article:author" content="https://example.com/author">\n</head>',
  ));

  assert.throws(
    () => discoverArticles({ rootDir }),
    /conflicting-meta-author\.html: expected exactly one article:author declaration/,
  );
});

test('discovery rejects a conflicting second JSON-LD Article author', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'conflicting-jsonld-author.html');
  const articlePath = path.join(rootDir, 'research/conflicting-jsonld-author.html');
  const conflictingArticle = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    author: {
      '@type': 'Person',
      name: 'Someone Else',
      url: 'https://example.com/author',
    },
  });
  fs.writeFileSync(articlePath, fs.readFileSync(articlePath, 'utf8').replace(
    '</head>',
    `  <script type="application/ld+json">${conflictingArticle}</script>\n</head>`,
  ));

  assert.throws(
    () => discoverArticles({ rootDir }),
    /conflicting-jsonld-author\.html: JSON-LD Article must name Alex Rostovtsev.*in every Article object/,
  );
});

test('discovery rejects a wrong header arXiv href when the exact URL exists only in JSON-LD', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'jsonld-only-arxiv.html');
  const articlePath = path.join(rootDir, 'research/jsonld-only-arxiv.html');
  let html = fs.readFileSync(articlePath, 'utf8').replace(
    'href="https://arxiv.org/abs/2607.12345" class="arxiv-link"',
    'href="https://example.com/abs/2607.12345" class="arxiv-link"',
  );
  html = html.replace(
    '"@type":"Article"',
    '"@type":"Article","sameAs":"https://arxiv.org/abs/2607.12345"',
  );
  fs.writeFileSync(articlePath, html);

  assert.throws(
    () => discoverArticles({ rootDir }),
    /jsonld-only-arxiv\.html: header \.arxiv-link href must equal https:\/\/arxiv\.org\/abs\/2607\.12345/,
  );
});

test('discovery accepts an exact arXiv anchor matching metadata', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'exact-arxiv.html');

  assert.equal(discoverArticles({ rootDir })[0].meta.slug, 'exact-arxiv');
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
    verification: { articleCount: 3, relatedLinkCount: 6 },
  });
  const normalized = fs.readFileSync(path.join(rootDir, 'research/new-a.html'), 'utf8');
  assert.equal((normalized.match(/class="article-byline"/g) || []).length, 1);
  assert.deepEqual(
    [...normalized.matchAll(/<a href="\/research\/([^"]+)" class="more-card">/g)]
      .map(match => match[1]),
    ['new-b', 'old'],
  );
});

test('compileResearch restores missing RSS discovery before post-write verification', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'new-a.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'new-b.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'old.html', { published_date: '2026-07-22' });
  const articlePath = path.join(rootDir, 'research/new-a.html');
  fs.writeFileSync(articlePath, fs.readFileSync(articlePath, 'utf8').replace(
    '  <link rel="alternate" type="application/rss+xml" href="https://blursor.ai/research/feed.xml">\n',
    '',
  ));

  compileResearch({ rootDir });

  assert.match(
    fs.readFileSync(articlePath, 'utf8'),
    /<link rel="alternate" type="application\/rss\+xml" title="BLURSOR Research RSS" href="https:\/\/blursor\.ai\/research\/feed\.xml">/,
  );
});

test('compileResearch adds a managed mobile metadata-wrap rule', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'new-a.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'new-b.html', { published_date: '2026-07-22' });
  writeArticle(rootDir, 'old.html', { published_date: '2026-07-21' });

  compileResearch({ rootDir });

  const normalized = fs.readFileSync(path.join(rootDir, 'research/new-a.html'), 'utf8');
  assert.match(
    normalized,
    /<style data-blursor-managed="article-meta-mobile">[\s\S]*@media \(max-width: 640px\)[\s\S]*\.article-header__meta \{ flex-wrap: wrap; \}[\s\S]*<\/style>/,
  );
});

function compileThreeArticleFixture(t) {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'new-a.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'new-b.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'old.html', { published_date: '2026-07-22' });
  compileResearch({ rootDir });
  return { rootDir, expectedArticles: discoverArticles({ rootDir }) };
}

function tamperSitemapLastmod(rootDir, loc, replacement = '2000-01-01') {
  const sitemapPath = path.join(rootDir, 'sitemap.xml');
  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  const escapedLoc = loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const entryRe = new RegExp(`(<loc>${escapedLoc}</loc>\\s*<lastmod>)[^<]+(</lastmod>)`);
  assert.match(sitemap, entryRe);
  fs.writeFileSync(sitemapPath, sitemap.replace(entryRe, `$1${replacement}$2`));
}

test('verification rejects the wrong generated research lastmod', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  tamperSitemapLastmod(rootDir, 'https://blursor.ai/research');

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /sitemap\.xml: https:\/\/blursor\.ai\/research lastmod must equal 2026-07-23, found 2000-01-01/,
  );
});

test('verification rejects the wrong article lastmod', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  tamperSitemapLastmod(rootDir, 'https://blursor.ai/research/old');

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /sitemap\.xml: https:\/\/blursor\.ai\/research\/old lastmod must equal 2026-07-22, found 2000-01-01/,
  );
});

test('verification rejects the wrong mtime-based route lastmod', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const expectedDate = fs.statSync(path.join(rootDir, 'index.html')).mtime.toISOString().slice(0, 10);
  tamperSitemapLastmod(rootDir, 'https://blursor.ai/');

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    new RegExp(`sitemap\\.xml: https://blursor\\.ai/ lastmod must equal ${expectedDate}, found 2000-01-01`),
  );
});

test('verification rejects an empty sitemap lastmod', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  tamperSitemapLastmod(rootDir, 'https://blursor.ai/research/old', '');

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /sitemap\.xml: https:\/\/blursor\.ai\/research\/old lastmod must not be empty/,
  );
});

test('verification reports a missing RSS item URL after the feed is tampered', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const feedPath = path.join(rootDir, 'research/feed.xml');
  fs.writeFileSync(feedPath, fs.readFileSync(feedPath, 'utf8').replace(
    '<link>https://blursor.ai/research/old</link>',
    '<link>https://blursor.ai/research/removed</link>',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /research\/feed\.xml: missing https:\/\/blursor\.ai\/research\/old/,
  );
});

test('verification reports a duplicate archive target', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const archivePath = path.join(rootDir, 'research/index.html');
  fs.writeFileSync(archivePath, fs.readFileSync(archivePath, 'utf8').replace(
    'href="/research/new-b" class="article-card"',
    'href="/research/new-a" class="article-card"',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /research\/index\.html: duplicate entries/,
  );
});

test('archive generation rejects a missing visible article count marker', () => {
  assert.throws(
    () => generateArchiveHtml(
      '<html><body><div class="articles__grid"></div></body></html>',
      [articleRecord('only')],
    ),
    /research\/index\.html: expected exactly one articles__count marker, found 0/,
  );
});

test('archive generation rejects duplicate visible article count markers', () => {
  assert.throws(
    () => generateArchiveHtml(
      '<html><body><span class="articles__count">0 articles</span><span class="articles__count">stale</span><div class="articles__grid"></div></body></html>',
      [articleRecord('only')],
    ),
    /research\/index\.html: expected exactly one articles__count marker, found 2/,
  );
});

test('archive generation replaces the complete visible count contents', () => {
  const generated = generateArchiveHtml(
    '<html><body><span class="articles__count"><strong>stale</strong> count</span><div class="articles__grid"></div></body></html>',
    [articleRecord('only')],
  );

  assert.match(generated, /<span class="articles__count">1 article<\/span>/);
  assert.doesNotMatch(generated, /stale/);
});

test('verification rejects a missing visible article count marker', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const archivePath = path.join(rootDir, 'research/index.html');
  fs.writeFileSync(archivePath, fs.readFileSync(archivePath, 'utf8').replace(
    '<span class="articles__count">3 articles</span>',
    '',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /research\/index\.html: expected exactly one articles__count marker, found 0/,
  );
});

test('verification rejects duplicate visible article count markers', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const archivePath = path.join(rootDir, 'research/index.html');
  fs.writeFileSync(archivePath, fs.readFileSync(archivePath, 'utf8').replace(
    '<span class="articles__count">3 articles</span>',
    '<span class="articles__count">3 articles</span><span class="articles__count">3 articles</span>',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /research\/index\.html: expected exactly one articles__count marker, found 2/,
  );
});

test('verification rejects a stale visible article count', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const archivePath = path.join(rootDir, 'research/index.html');
  fs.writeFileSync(archivePath, fs.readFileSync(archivePath, 'utf8').replace(
    '<span class="articles__count">3 articles</span>',
    '<span class="articles__count">2 articles</span>',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /research\/index\.html: articles__count must equal "3 articles", found "2 articles"/,
  );
});

test('verification accepts the valid generated visible article count', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);

  assert.equal(
    verifyPublishedState({ rootDir, expectedArticles }).articleCount,
    3,
  );
});

test('verification reports a self-related target', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const articlePath = path.join(rootDir, 'research/new-a.html');
  fs.writeFileSync(articlePath, fs.readFileSync(articlePath, 'utf8').replace(
    'href="/research/new-b" class="more-card"',
    'href="/research/new-a" class="more-card"',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /research\/new-a\.html: self-related target \/research\/new-a/,
  );
});

test('verification reports a noncanonical related target', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const articlePath = path.join(rootDir, 'research/new-a.html');
  fs.writeFileSync(articlePath, fs.readFileSync(articlePath, 'utf8').replace(
    'href="/research/new-b" class="more-card"',
    'href="https://blursor.ai/research/new-b" class="more-card"',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /research\/new-a\.html: noncanonical related target https:\/\/blursor\.ai\/research\/new-b/,
  );
});

test('verification requires the deterministic related-card targets', t => {
  const { rootDir } = compileThreeArticleFixture(t);
  writeArticle(rootDir, 'older.html', { published_date: '2026-07-21' });
  compileResearch({ rootDir });
  const fourArticleSet = discoverArticles({ rootDir });
  const articlePath = path.join(rootDir, 'research/new-a.html');
  fs.writeFileSync(articlePath, fs.readFileSync(articlePath, 'utf8').replace(
    'href="/research/old" class="more-card"',
    'href="/research/older" class="more-card"',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles: fourArticleSet }),
    /research\/new-a\.html: related targets: missing old/,
  );
});

test('verification reports a missing linked byline', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const articlePath = path.join(rootDir, 'research/new-a.html');
  fs.writeFileSync(articlePath, fs.readFileSync(articlePath, 'utf8').replace(
    /<span class="article-byline">[\s\S]*?<\/span>\n\s*/,
    '',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /research\/new-a\.html: expected one exact linked byline/,
  );
});

test('verification reports appended visible text in a linked byline', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const articlePath = path.join(rootDir, 'research/new-a.html');
  fs.writeFileSync(articlePath, fs.readFileSync(articlePath, 'utf8').replace(
    '</a></span>',
    '</a> with Example Sponsor</span>',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /research\/new-a\.html: expected one exact linked byline/,
  );
});

test('verification reports missing RSS discovery', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const homePath = path.join(rootDir, 'index.html');
  fs.writeFileSync(homePath, fs.readFileSync(homePath, 'utf8').replace(
    '<link rel="alternate" type="application/rss+xml" title="BLURSOR Research RSS" href="https://blursor.ai/research/feed.xml">',
    '',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /index\.html: missing RSS discovery/,
  );
});

test('verification reports missing managed mobile metadata wrapping', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const articlePath = path.join(rootDir, 'research/new-a.html');
  fs.writeFileSync(articlePath, fs.readFileSync(articlePath, 'utf8').replace(
    /\n  <style data-blursor-managed="article-meta-mobile">[\s\S]*?<\/style>/,
    '',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /research\/new-a\.html: expected one managed mobile metadata-wrap style/,
  );
});

test('verification reports an altered JSON-LD author URL', t => {
  const { rootDir, expectedArticles } = compileThreeArticleFixture(t);
  const articlePath = path.join(rootDir, 'research/new-a.html');
  fs.writeFileSync(articlePath, fs.readFileSync(articlePath, 'utf8').replace(
    '"url":"https://blursor.ai/author/alex-rostovtsev"',
    '"url":"https://example.com/author"',
  ));

  assert.throws(
    () => verifyPublishedState({ rootDir, expectedArticles }),
    /new-a\.html: JSON-LD Article must name Alex Rostovtsev/,
  );
});

function snapshotGeneratedTree(rootDir) {
  const files = [
    'index.html',
    ...fs.readdirSync(path.join(rootDir, 'research'))
      .filter(file => file.endsWith('.html') && file !== 'index.html')
      .sort()
      .map(file => path.join('research', file)),
    'research/index.html',
    'research/feed.xml',
    'sitemap.xml',
  ];
  return Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(rootDir, file), 'utf8')]));
}

test('a second compiler run produces byte-identical output', t => {
  const { rootDir } = compileThreeArticleFixture(t);
  const before = snapshotGeneratedTree(rootDir);
  compileResearch({ rootDir });
  assert.deepEqual(snapshotGeneratedTree(rootDir), before);
});

test('a backdated archive mtime does not change second-run output', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'new-a.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'new-b.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'old.html', { published_date: '2026-07-22' });
  fs.utimesSync(path.join(rootDir, 'research/index.html'), new Date('2001-01-01T00:00:00Z'), new Date('2001-01-01T00:00:00Z'));

  compileResearch({ rootDir });
  const before = snapshotGeneratedTree(rootDir);
  compileResearch({ rootDir });
  assert.deepEqual(snapshotGeneratedTree(rootDir), before);
});

test('compiler repairs a backdated homepage RSS omission in one idempotent run', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'new-a.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'new-b.html', { published_date: '2026-07-22' });
  writeArticle(rootDir, 'old.html', { published_date: '2026-07-21' });
  const homePath = path.join(rootDir, 'index.html');
  const backdated = new Date('2001-01-01T00:00:00Z');
  fs.utimesSync(homePath, backdated, backdated);

  compileResearch({ rootDir });

  const homepageDate = fs.statSync(homePath).mtime.toISOString().slice(0, 10);
  const sitemap = fs.readFileSync(path.join(rootDir, 'sitemap.xml'), 'utf8');
  assert.match(
    sitemap,
    new RegExp(`<loc>https://blursor\\.ai/</loc>\\s*<lastmod>${homepageDate}</lastmod>`),
  );
  const before = snapshotGeneratedTree(rootDir);
  compileResearch({ rootDir });
  assert.deepEqual(snapshotGeneratedTree(rootDir), before);
});

test('compiler makes article, archive, feed, and sitemap inventories agree', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'new-a.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'new-b.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'old.html', { published_date: '2026-07-22' });

  const result = compileResearch({ rootDir });
  const expectedSlugs = ['new-a', 'new-b', 'old'];
  assert.equal(result.articleCount, 3);
  assert.deepEqual(result.articleSlugs, expectedSlugs);
  assert.equal(result.verification.articleCount, 3);
  assert.equal(result.verification.relatedLinkCount, 6);

  const archive = fs.readFileSync(path.join(rootDir, 'research/index.html'), 'utf8');
  const feed = fs.readFileSync(path.join(rootDir, 'research/feed.xml'), 'utf8');
  const sitemap = fs.readFileSync(path.join(rootDir, 'sitemap.xml'), 'utf8');
  for (const slug of expectedSlugs) {
    assert.match(archive, new RegExp(`href="/research/${slug}" class="article-card"`));
    assert.match(feed, new RegExp(`<link>https://blursor.ai/research/${slug}</link>`));
    assert.match(sitemap, new RegExp(`<loc>https://blursor.ai/research/${slug}</loc>`));
  }
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
    /old\.html: header \.arxiv-link href must equal https:\/\/arxiv\.org\/abs\/2607\.12345/,
  );
  assert.equal(fs.readFileSync(newAPath, 'utf8'), before);
});

test('compileResearch adds the canonical RSS feed URL alongside an unrelated feed', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'wrong-feed.html');
  writeArticle(rootDir, 'new-b.html', { published_date: '2026-07-22' });
  writeArticle(rootDir, 'old.html', { published_date: '2026-07-21' });
  const articlePath = path.join(rootDir, 'research/wrong-feed.html');
  fs.writeFileSync(articlePath, fs.readFileSync(articlePath, 'utf8').replace(
    'https://blursor.ai/research/feed.xml',
    'https://example.com/research/feed.xml',
  ));

  compileResearch({ rootDir });

  assert.match(
    fs.readFileSync(articlePath, 'utf8'),
    /<link rel="alternate" type="application\/rss\+xml" title="BLURSOR Research RSS" href="https:\/\/blursor\.ai\/research\/feed\.xml">/,
  );
});

test('CLI reports that compilation and verification both completed', t => {
  const rootDir = makeFixture();
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  writeArticle(rootDir, 'new-a.html', { published_date: '2026-07-23' });
  writeArticle(rootDir, 'new-b.html', { published_date: '2026-07-22' });
  writeArticle(rootDir, 'old.html', { published_date: '2026-07-21' });

  const result = runFixture(rootDir);

  assert.equal(result.status, 0);
  assert.equal(result.stdout, 'Compiled and verified 3 research article(s)\n');
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
