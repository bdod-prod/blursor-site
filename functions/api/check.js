// BLURSOR — AI crawler-readability checker (v2)
// Cloudflare Pages Function:  GET /api/check?url=<target>
//
// Fetches a URL the way AI crawlers do (raw HTML, no JS), and — when a
// Cloudflare Browser Rendering token is configured — ALSO renders the page and
// diffs raw vs rendered to measure exactly how much content is client-only.
// Without a token (or if rendering fails/quota-limits), it falls back to a
// heuristic. Transparency is the point: every finding carries a plain-English
// "why" and a research source.
//
// To activate render-diff, set two Pages env vars (secrets):
//   CF_ACCOUNT_ID    - your Cloudflare account id
//   CF_BROWSER_TOKEN - API token with Browser Rendering permission

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

// Verified behavior (docs/research/ai-readiness-research-recovered-2026-06.md):
// standalone AI crawlers take raw HTML and DON'T run JS; Gemini (Google-Extended,
// via Googlebot's renderer) and Applebot DO render.
const AI_BOTS = [
  { token: "GPTBot",          label: "GPTBot",          owner: "OpenAI (training)",       rendersJS: false, ua: "Mozilla/5.0 (compatible; GPTBot/1.3; +https://openai.com/gptbot)" },
  { token: "OAI-SearchBot",   label: "OAI-SearchBot",   owner: "OpenAI (ChatGPT search)", rendersJS: false, ua: "Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)" },
  { token: "ChatGPT-User",    label: "ChatGPT-User",    owner: "OpenAI (live fetch)",     rendersJS: false, ua: "Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)" },
  { token: "ClaudeBot",       label: "ClaudeBot",       owner: "Anthropic",               rendersJS: false, ua: "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)" },
  { token: "PerplexityBot",   label: "PerplexityBot",   owner: "Perplexity",              rendersJS: false, ua: "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)" },
  { token: "CCBot",           label: "CCBot",           owner: "Common Crawl",            rendersJS: false, ua: "CCBot/2.0 (https://commoncrawl.org/faq/)" },
  { token: "Google-Extended", label: "Google-Extended", owner: "Google Gemini (renders via Googlebot)", rendersJS: true, ua: null },
  { token: "Applebot",        label: "Applebot",        owner: "Apple (search; feeds Apple Intelligence)", rendersJS: true, ua: "Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)" },
];

const PROBE_TOKENS = ["GPTBot", "ClaudeBot", "PerplexityBot"];

const SRC = {
  vercel:    { label: "Vercel AI-crawler study (2024)",         url: "https://vercel.com/blog/the-rise-of-the-ai-crawler" },
  seranking: { label: "SE Ranking, 300k-domain llms.txt study", url: "https://seranking.com/blog/llms-txt/" },
  geo:       { label: "GEO paper (Princeton et al., KDD '24)",  url: "https://arxiv.org/abs/2311.09735" },
};

const FETCH_TIMEOUT_MS = 9000;
const RENDER_TIMEOUT_MS = 22000;
const MAX_BYTES = 2_500_000;
const RENDER_CACHE_TTL = 21600; // 6h

export async function onRequestGet({ request, env }) {
  const reqUrl = new URL(request.url);
  const raw = (reqUrl.searchParams.get("url") || "").trim();

  let target;
  try {
    target = normalizeTarget(raw);
  } catch (e) {
    return json({ ok: false, error: e.message }, 400);
  }

  try {
    const origin = `${target.protocol}//${target.host}`;
    const [robotsRes, llmsRes, baseline, ...probes] = await Promise.all([
      safeFetch(`${origin}/robots.txt`, BROWSER_UA),
      safeFetch(`${origin}/llms.txt`, BROWSER_UA),
      safeFetch(target.href, BROWSER_UA),
      ...PROBE_TOKENS.map((t) => safeFetch(target.href, AI_BOTS.find((b) => b.token === t).ua)),
    ]);

    if (!baseline.ok && baseline.status === 0) {
      return json({ ok: false, error: `Couldn't reach ${target.href} (${baseline.error || "no response"}).` }, 502);
    }

    const robotsRules = robotsRes.ok ? parseRobots(robotsRes.body) : null;
    const path = target.pathname || "/";

    const probeByToken = {};
    PROBE_TOKENS.forEach((t, i) => (probeByToken[t] = probes[i]));

    const botAccess = AI_BOTS.map((bot) => {
      const robots = robotsRules === null ? "no-robots" : isAllowed(robotsRules, bot.token, path) ? "allowed" : "disallowed";
      let server = "not-probed";
      const probe = probeByToken[bot.token];
      if (probe) {
        if (!probe.ok && probe.status === 0) server = "error";
        else if (probe.status === 403 || probe.status === 429) server = "blocked";
        else if (baseline.ok && probe.ok && cloaked(baseline, probe)) server = "cloaked";
        else server = "ok";
      }
      return { token: bot.token, label: bot.label, owner: bot.owner, rendersJS: bot.rendersJS, robots, server, status: probe ? probe.status : null };
    });

    // Raw HTML = what a non-JS crawler receives.
    const rawHtml = baseline.ok ? baseline.body : (probes.find((p) => p.ok)?.body || "");
    const rawPage = analyzeHtml(rawHtml);

    // Rendered HTML (post-JS) via Cloudflare Browser Rendering, if configured.
    const render = await renderViaCloudflare(target.href, env);
    const renderedPage = render.html ? analyzeHtml(render.html) : null;

    const llms = { present: llmsRes.ok && llmsRes.status === 200, looksValid: false };
    if (llms.present) llms.looksValid = /^\s*#\s+/.test(llmsRes.body) && /\n\s*##\s+/.test(llmsRes.body);

    const findings = buildFindings({ botAccess, rawPage, renderedPage, llms });
    const summary = findings.reduce((a, f) => ((a[f.status] = (a[f.status] || 0) + 1), a), { pass: 0, warn: 0, fail: 0 });

    return json({
      ok: true,
      url: target.href,
      finalUrl: baseline.finalUrl || target.href,
      checkedAt: new Date().toISOString(),
      renderMode: renderedPage ? "rendered" : "heuristic",
      renderStatus: render.status,
      summary,
      botAccess,
      content: rawPage,
      rendered: renderedPage ? { visibleTextChars: renderedPage.visibleTextChars, headings: renderedPage.headings, hasJsonLd: renderedPage.hasJsonLd } : null,
      llms,
      findings,
    });
  } catch (e) {
    return json({ ok: false, error: `Check failed: ${e.message}` }, 500);
  }
}

// --- Browser Rendering (Cloudflare REST API) --------------------------------

async function renderViaCloudflare(url, env) {
  if (!env || !env.CF_ACCOUNT_ID || !env.CF_BROWSER_TOKEN) return { html: null, status: "no-credentials" };

  // Edge-cache renders by URL so repeat checks don't burn the daily budget.
  let cache = null, cacheKey = null;
  try {
    cache = caches.default;
    cacheKey = new Request("https://render-cache.blursor.ai/v2/" + encodeURIComponent(url));
    const hit = await cache.match(cacheKey);
    if (hit) { const t = await hit.text(); if (t) return { html: t, status: "cached" }; }
  } catch { /* cache optional */ }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/browser-rendering/content`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), RENDER_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.CF_BROWSER_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, gotoOptions: { waitUntil: "networkidle0", timeout: 15000 } }),
      signal: ctrl.signal,
    });
    if (res.status === 429) return { html: null, status: "quota-exceeded" };
    if (!res.ok) return { html: null, status: `error-${res.status}` };
    const data = await res.json().catch(() => null);
    const html = data && data.success && typeof data.result === "string" ? data.result : null;
    if (!html) return { html: null, status: "empty" };
    if (cache && cacheKey) {
      try { await cache.put(cacheKey, new Response(html, { headers: { "Cache-Control": `public, max-age=${RENDER_CACHE_TTL}` } })); } catch {}
    }
    return { html, status: "rendered" };
  } catch (e) {
    return { html: null, status: e.name === "AbortError" ? "timeout" : "error" };
  } finally {
    clearTimeout(timer);
  }
}

// --- Helpers ----------------------------------------------------------------

function normalizeTarget(input) {
  if (!input) throw new Error("Add a ?url= parameter.");
  let u;
  try {
    u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Only http and https URLs are supported.");
  const host = u.hostname.toLowerCase();
  const blocked =
    host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|::1$|fc|fd)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) || !host.includes(".");
  if (blocked) throw new Error("That host isn't allowed (internal/private addresses are blocked).");
  return u;
}

async function safeFetch(url, ua) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": ua, Accept: "text/html,*/*" }, redirect: "follow", signal: ctrl.signal, cf: { cacheTtl: 0 } });
    const body = await readCapped(res);
    return { ok: true, status: res.status, body, bytes: body.length, finalUrl: res.url };
  } catch (e) {
    return { ok: false, status: 0, body: "", bytes: 0, error: e.name === "AbortError" ? "timeout" : e.message };
  } finally {
    clearTimeout(t);
  }
}

async function readCapped(res) {
  const reader = res.body?.getReader();
  if (!reader) return await res.text().catch(() => "");
  const dec = new TextDecoder();
  let out = "", total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    out += dec.decode(value, { stream: true });
    if (total >= MAX_BYTES) { try { await reader.cancel(); } catch {} break; }
  }
  return out;
}

function cloaked(base, probe) {
  if (probe.status !== base.status) return true;
  const a = base.bytes, b = probe.bytes;
  if (a === 0 && b === 0) return false;
  const ratio = Math.min(a, b) / Math.max(a, b || 1);
  return ratio < 0.6 && Math.abs(a - b) > 1500;
}

function parseRobots(text) {
  const groups = {};
  let current = [], expectingRules = false;
  for (let line of text.split(/\r?\n/)) {
    line = line.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === "user-agent") {
      if (expectingRules) current = [];
      const key = value.toLowerCase();
      if (!groups[key]) groups[key] = [];
      if (!current.includes(groups[key])) current.push(groups[key]);
      expectingRules = false;
    } else if (field === "allow" || field === "disallow") {
      expectingRules = true;
      for (const rules of current) rules.push({ type: field, value });
    }
  }
  return groups;
}

function isAllowed(groups, token, path) {
  const rules = groups[token.toLowerCase()] || groups["*"] || null;
  if (!rules || rules.length === 0) return true;
  let best = null, bestLen = -1;
  for (const r of rules) {
    const len = robotsMatchLen(r.value, path);
    if (len > bestLen || (len === bestLen && r.type === "allow")) { bestLen = len; best = r; }
  }
  if (!best || bestLen < 0) return true;
  return best.type === "allow";
}

function robotsMatchLen(pattern, path) {
  if (pattern === "") return -1;
  let re = "^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  if (re.endsWith("\\$")) re = re.slice(0, -2) + "$";
  try { return new RegExp(re).test(path) ? pattern.replace(/\*/g, "").length : -1; } catch { return -1; }
}

function analyzeHtml(html) {
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleM ? decode(titleM[1].trim()) : null;
  const descM = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
  const metaDescription = descM ? attr(descM[0], "content") : null;
  const canonM = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  const canonical = canonM ? attr(canonM[0], "href") : null;

  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  const h2 = (html.match(/<h2[\s>]/gi) || []).length;
  const h3 = (html.match(/<h3[\s>]/gi) || []).length;

  const jsonLdBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const jsonLdTypes = [];
  for (const block of jsonLdBlocks) {
    const inner = block.replace(/^[\s\S]*?>/, "").replace(/<\/script>$/i, "");
    for (const m of inner.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) jsonLdTypes.push(m[1]);
  }

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const visibleTextChars = stripped.length;
  const htmlBytes = html.length;
  const scriptBytes = (html.match(/<script[\s\S]*?<\/script>/gi) || []).join("").length;
  const textRatio = htmlBytes > 0 ? visibleTextChars / htmlBytes : 1;
  const frameworkHint = detectFramework(html);

  // Heuristic JS-shell flag — only used as a FALLBACK when no render is available.
  // Signal: a JS-framework page that ships almost no readable text AND has no
  // headings in the raw HTML (real content pages keep headings even when JS-heavy),
  // or a near-empty shell. NB: text-to-HTML ratio is deliberately NOT used — modern
  // SSR pages ship huge inline JS/JSON beside full content and would false-positive
  // (e.g. Vercel's blog: 14k chars of text but a 2% text ratio).
  const looksLikeJsShell =
    (frameworkHint !== null && h1 + h2 === 0 && visibleTextChars < 2500) ||
    (visibleTextChars < 500 && scriptBytes > 1000);

  return {
    title, titleLength: title ? title.length : 0,
    metaDescription, metaDescriptionLength: metaDescription ? metaDescription.length : 0,
    canonical, headings: { h1, h2, h3 }, headingOrderOk: h1 === 1,
    hasJsonLd: jsonLdBlocks.length > 0, jsonLdTypes: [...new Set(jsonLdTypes)],
    visibleTextChars, htmlBytes, scriptBytes, textRatio: Math.round(textRatio * 1000) / 1000,
    looksLikeJsShell, frameworkHint,
  };
}

function detectFramework(html) {
  if (/<div[^>]+id=["']__next["']/i.test(html) || /\/_next\/static\//i.test(html)) return "Next.js";
  if (/__NUXT__|\/_nuxt\//i.test(html)) return "Nuxt";
  if (/<div[^>]+id=["']___gatsby["']/i.test(html)) return "Gatsby";
  if (/data-sveltekit|__sveltekit/i.test(html)) return "SvelteKit";
  if (/window\.__remixContext|__remixManifest/i.test(html)) return "Remix";
  if (/ng-version=/i.test(html)) return "Angular";
  if (/<astro-island/i.test(html)) return "Astro (islands)";
  if (/<div[^>]+data-reactroot/i.test(html)) return "React";
  if (/<div[^>]+id=["']root["']/i.test(html)) return "React (root)";
  if (/<div[^>]+id=["']app["']/i.test(html)) return "Vue/SPA (app)";
  return null;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(name + '\\s*=\\s*["\']([^"\']*)["\']', "i"));
  return m ? decode(m[1].trim()) : null;
}

function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/gi, "'");
}

// --- Findings ---------------------------------------------------------------

function buildFindings({ botAccess, rawPage, renderedPage, llms }) {
  const f = [];

  const blocked = botAccess.filter((b) => b.server === "blocked");
  const cloakedBots = botAccess.filter((b) => b.server === "cloaked");
  if (blocked.length) {
    f.push(finding("server-block", "Your server blocks AI crawlers", "fail",
      `${blocked.map((b) => b.token).join(", ")} got a 403/429 — the page never reaches them.`,
      "If the server turns the bot away, nothing else matters; the content can't be read or cited.", SRC.vercel));
  } else {
    f.push(finding("server-block", "Server lets AI crawlers through", "pass",
      "No 403/429 for the bots we probed.", "Step one of being cited is simply being fetchable.", SRC.vercel));
  }
  if (cloakedBots.length) {
    f.push(finding("cloaking", "Different content served to bots", "warn",
      `${cloakedBots.map((b) => b.token).join(", ")} received a noticeably different page than a browser.`,
      "Serving bots a thinner page is risky and can misrepresent what gets cited.", SRC.vercel));
  }

  const disallowed = botAccess.filter((b) => b.robots === "disallowed");
  if (disallowed.length) {
    f.push(finding("robots", "robots.txt disallows AI crawlers", "fail",
      `Blocked by robots.txt: ${disallowed.map((b) => b.token).join(", ")}.`,
      "robots.txt is the front door. Disallowed bots won't crawl you at all.", SRC.vercel));
  } else {
    f.push(finding("robots", "robots.txt allows AI crawlers", "pass",
      "No AI-bot tokens are disallowed for this path.", "Allowing the bots is necessary to appear in AI answers.", SRC.vercel));
  }

  // The headline check: raw-vs-rendered content gap.
  f.push(contentFinding(rawPage, renderedPage, botAccess));

  // Citeability basics — judged on the RAW HTML (what most AI crawlers get).
  if (!rawPage.title) f.push(finding("title", "Missing <title>", "fail", "No title tag in the raw HTML.", "The title is the first thing models use to label and attribute your page.", SRC.geo));
  else f.push(finding("title", "Has a title", "pass", `“${truncate(rawPage.title, 80)}”`, "Gives the model a clear label for citation.", SRC.geo));

  if (!rawPage.metaDescription) f.push(finding("meta", "No meta description", "warn", "No meta description in the raw HTML.", "A clear summary helps models quote you accurately.", SRC.geo));
  else f.push(finding("meta", "Has a meta description", "pass", truncate(rawPage.metaDescription, 100), "Gives a ready-made summary to quote.", SRC.geo));

  if (rawPage.headings.h1 === 1) f.push(finding("headings", "Clean heading structure", "pass", `1 H1, ${rawPage.headings.h2} H2, ${rawPage.headings.h3} H3.`, "A clear H1→H2→H3 hierarchy is strongly associated with cited pages.", SRC.geo));
  else f.push(finding("headings", "Heading structure needs work", "warn", `${rawPage.headings.h1} H1 tags (want exactly 1), ${rawPage.headings.h2} H2 — in the raw HTML.`, "Cited pages overwhelmingly use one H1 and a clean hierarchy.", SRC.geo));

  if (rawPage.hasJsonLd) f.push(finding("schema", "Structured data present", "pass", `JSON-LD types: ${rawPage.jsonLdTypes.join(", ") || "unspecified"}.`, "Schema helps engines verify what your page is and who's behind it.", SRC.geo));
  else f.push(finding("schema", "No structured data", "warn", "No JSON-LD in the raw HTML.", "Schema isn't required, but it helps engines trust and attribute content.", SRC.geo));

  if (llms.present) {
    f.push(finding("llms", "llms.txt is present", "info", `Found at /llms.txt${llms.looksValid ? " (well-formed)" : " (check structure)"}.`,
      "Worth noting: a 300k-domain study found NO link between having llms.txt and AI citations — Google says skip it. Hygiene, not a ranking lever.", SRC.seranking));
  } else {
    f.push(finding("llms", "No llms.txt (that's fine)", "info", "Not found — and that's okay.",
      "Research shows llms.txt doesn't drive AI citations. Skipping it costs you nothing; focus on the checks above.", SRC.seranking));
  }

  return f;
}

function contentFinding(rawPage, renderedPage, botAccess) {
  const nonJs = botAccess.filter((b) => !b.rendersJS).map((b) => b.token);
  const raw = rawPage.visibleTextChars;

  if (renderedPage) {
    // Definitive: we have both raw and rendered.
    const ren = renderedPage.visibleTextChars;
    const share = ren > 0 ? raw / ren : 1;
    const clientPct = Math.max(0, Math.round((1 - share) * 100));
    const headingsOnlyAfterJs = rawPage.headings.h1 + rawPage.headings.h2 === 0 && renderedPage.headings.h1 + renderedPage.headings.h2 > 0;

    if (share >= 0.8) {
      return finding("content", "Content is in the raw HTML (render-verified)", "pass",
        `A browser renders ~${ren} chars; the raw HTML already has ~${raw}. Non-JS crawlers get essentially everything.`,
        "Confirmed by rendering the page and comparing — not a guess.", SRC.vercel);
    }
    if (share >= 0.5) {
      return finding("content", "Some content is client-rendered", "warn",
        `~${clientPct}% of your content appears only after JavaScript (browser ~${ren} chars vs raw ~${raw}).${headingsOnlyAfterJs ? " Your headings exist only after JS." : ""}`,
        `Non-JS crawlers (${nonJs.join(", ")}) miss that portion; Gemini & Applebot render and see it.`, SRC.vercel);
    }
    return finding("content", "Most content is client-rendered", "fail",
      `Only ~${100 - clientPct}% of your content is in the raw HTML — a browser sees ~${ren} chars, non-JS crawlers see ~${raw}.${headingsOnlyAfterJs ? " Even your headings only appear after JS." : ""}`,
      `${nonJs.join(", ")} get mostly navigation/boilerplate and miss the real page. Gemini & Applebot render and see it.`, SRC.vercel);
  }

  // Fallback: heuristic (no render available).
  if (rawPage.looksLikeJsShell) {
    return finding("content", "Main content likely needs JavaScript", "warn",
      `Heuristic: only ~${raw} chars of text in the raw HTML${rawPage.frameworkHint ? ` (${rawPage.frameworkHint} app)` : ""}, with a heavy script payload. Looks client-rendered.`,
      `Most AI crawlers (${nonJs.join(", ")}) don't run JS, so they'd likely get little. Add a Cloudflare Browser Rendering token to measure this exactly.`, SRC.vercel);
  }
  return finding("content", "Content is in the raw HTML", "pass",
    `~${raw} chars of text present without running JavaScript.`,
    "Non-JS crawlers (GPTBot, ClaudeBot, PerplexityBot, CCBot) can read it as-is. (Heuristic — enable render-diff for an exact measure.)", SRC.vercel);
}

function finding(id, label, status, detail, why, source) {
  return { id, label, status, detail, why, source };
}

function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" },
  });
}
