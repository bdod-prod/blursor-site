#!/usr/bin/env node
// Regenerate research/index.html from the set of research/*.html articles.
// Each article must contain a hidden BLURSOR-META JSON comment, e.g.:
//   <!-- BLURSOR-META: {"slug":"...","title":"...","published_date":"YYYY-MM-DD","reading_time_min":7,"category_label":"...","summary_for_card":"...","arxiv_id":"..."} -->
// Articles missing the comment are skipped (with a warning).

const fs = require('fs');
const path = require('path');

const DEPLOY_ROOT = path.resolve(__dirname, '..');
const RESEARCH_DIR = path.join(DEPLOY_ROOT, 'research');
const INDEX_PATH = path.join(RESEARCH_DIR, 'index.html');
const SITEMAP_PATH = path.join(DEPLOY_ROOT, 'sitemap.xml');

const BASE_URL = 'https://blursor.ai';
// Static routes that exist regardless of article set. Each maps a URL path to
// its on-disk source so lastmod reflects the file's real mtime.
const STATIC_ROUTES = [
  { path: '/', file: path.join(DEPLOY_ROOT, 'index.html') },
  { path: '/research', file: INDEX_PATH },
  { path: '/author/alex-rostovtsev', file: path.join(DEPLOY_ROOT, 'author', 'alex-rostovtsev.html') },
];

const META_RE = /<!--\s*BLURSOR-META:\s*({[\s\S]*?})\s*-->/;

function extractMeta(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const m = META_RE.exec(html);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    console.warn(`  warn: ${path.basename(htmlPath)} has BLURSOR-META but JSON parse failed: ${e.message}`);
    return null;
  }
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function escapeHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderCard(meta, ordinal) {
  const ord = String(ordinal).padStart(2, '0');
  return `        <a href="/research/${escapeHtml(meta.slug)}" class="article-card">
          <div class="article-card__ordinal">
            ${ord}
            <span class="article-card__rule"></span>
          </div>
          <div class="article-card__body">
            <div class="article-card__meta">
              <span class="article-card__date">${escapeHtml(fmtDate(meta.published_date))}</span>
              <span class="article-card__dot"></span>
              <span class="article-card__reading-time">${escapeHtml(String(meta.reading_time_min || ''))} min read</span>
            </div>
            <h2 class="article-card__title">${escapeHtml(meta.title)}</h2>
            <p class="article-card__summary">${escapeHtml(meta.summary_for_card || meta.subtitle || meta.meta_description || '')}</p>
            <span class="article-card__source">arXiv:${escapeHtml(meta.arxiv_id || '')}</span>
          </div>
        </a>`;
}

function isoDate(d) {
  // YYYY-MM-DD (sitemap lastmod accepts W3C date; date-only is valid)
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt)) return null;
  return dt.toISOString().slice(0, 10);
}

function fileLastmod(filePath) {
  try {
    return isoDate(fs.statSync(filePath).mtime);
  } catch (e) {
    return null;
  }
}

function buildSitemap(articles) {
  const urls = [];

  for (const r of STATIC_ROUTES) {
    urls.push({ loc: BASE_URL + r.path, lastmod: fileLastmod(r.file) });
  }

  for (const a of articles) {
    urls.push({
      loc: `${BASE_URL}/research/${a.slug}`,
      lastmod: isoDate(a.published_date),
    });
  }

  const body = urls.map(u => {
    const lm = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '';
    return `  <url>\n    <loc>${escapeHtml(u.loc)}</loc>${lm}\n  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${body}\n</urlset>\n`;

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf-8');
  console.log(`  wrote ${path.relative(DEPLOY_ROOT, SITEMAP_PATH)} with ${urls.length} URL(s)`);
}

function main() {
  // Collect article files
  const files = fs.readdirSync(RESEARCH_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .map(f => path.join(RESEARCH_DIR, f));

  const articles = [];
  for (const f of files) {
    const meta = extractMeta(f);
    if (meta && meta.slug) {
      articles.push(meta);
    } else if (!meta) {
      console.warn(`  warn: ${path.basename(f)} missing BLURSOR-META comment — skipping`);
    }
  }

  // Sort by published_date desc
  articles.sort((a, b) => {
    const da = new Date(a.published_date);
    const db = new Date(b.published_date);
    return db - da;
  });

  console.log(`  Found ${articles.length} articles with valid metadata`);

  // Read current index.html
  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`  error: ${INDEX_PATH} not found`);
    process.exit(1);
  }
  let indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');

  // Build the new cards block
  const cardsBlock = articles.map((a, i) => renderCard(a, i + 1)).join('\n\n');

  // Replace the contents of <div class="articles__grid">...</div>
  const gridOpen = '<div class="articles__grid">';
  const gridStart = indexHtml.indexOf(gridOpen);
  if (gridStart < 0) {
    console.error(`  error: '<div class="articles__grid">' not found in index.html`);
    process.exit(1);
  }
  // Find the matching closing </div> by walking forward
  let depth = 1;
  let i = gridStart + gridOpen.length;
  while (i < indexHtml.length && depth > 0) {
    const nextOpen = indexHtml.indexOf('<div', i);
    const nextClose = indexHtml.indexOf('</div>', i);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      if (depth === 0) {
        // i is at the start of this </div>
        // No, actually we need the END of the </div>
        i = nextClose;
        break;
      } else {
        i = nextClose + 6;
      }
    }
  }
  const gridEnd = i;

  const newIndexHtml =
    indexHtml.slice(0, gridStart + gridOpen.length) +
    '\n\n' + cardsBlock + '\n\n      ' +
    indexHtml.slice(gridEnd);

  // Update article count
  const total = articles.length;
  const countRegex = /<span class="articles__count">\d+ articles?<\/span>/;
  const newCount = `<span class="articles__count">${total} article${total === 1 ? '' : 's'}</span>`;
  const updatedHtml = newIndexHtml.replace(countRegex, newCount);

  fs.writeFileSync(INDEX_PATH, updatedHtml, 'utf-8');
  console.log(`  wrote ${path.relative(DEPLOY_ROOT, INDEX_PATH)} with ${total} card(s)`);

  // Regenerate sitemap.xml from the same article set + static routes.
  buildSitemap(articles);
}

main();
