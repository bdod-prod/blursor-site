// BLURSOR — AI crawler-readability + agent-readiness checker
// Cloudflare Pages Function:  GET /api/check?url=<target>
//
// Two halves, one request:
//   1. Can AI READ the page? Fetch it the way AI crawlers do (raw HTML, no JS),
//      and — when a Cloudflare Browser Rendering token is configured — ALSO
//      render it and diff raw vs rendered to measure how much is client-only.
//   2. Can an AI AGENT USE the page? While rendering, an injected probe reads the
//      live page for WebMCP tools, accessible names on buttons/forms/images, and
//      layout stability (CLS) — the signals Google's Lighthouse "Agentic
//      Browsing" category checks. Falls back to HTML heuristics if render is off.
//
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
  lighthouse:{ label: "Google Lighthouse — Agentic Browsing",   url: "https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring" },
  webmcp:    { label: "WebMCP (W3C Community Group draft)",      url: "https://github.com/webmachinelearning/webmcp" },
};

const FETCH_TIMEOUT_MS = 9000;
const RENDER_TIMEOUT_MS = 25000;
const MAX_BYTES = 2_500_000;
const RENDER_CACHE_TTL = 21600; // 6h

// Injected into the page during render (addScriptTag) to read the signals an AI
// AGENT needs — things that only exist after JS runs and can't be seen in static
// HTML: live WebMCP tools (document.modelContext), the accessible name of every
// interactive control (computed against the real DOM), and the layout shift
// (CLS) that accumulated during load. It writes one JSON <script> node back into
// the page; the server reads it out of the returned HTML (see extractInjected).
// All wrapped in try/catch so a quirky page can never break the render.
const AGENT_PROBE_JS = `(function(){
  function t(s){return (s||'').replace(/\\s+/g,' ').trim();}
  var R={v:1,webmcp:{},a11y:{},cls:null,vitals:{}};
  // --- WebMCP (current spec: document.modelContext; older drafts: navigator) ---
  try{
    var mc=(typeof document!=='undefined'&&document.modelContext)||(typeof navigator!=='undefined'&&navigator.modelContext)||null;
    R.webmcp.present=!!mc;
    if(mc){
      R.webmcp.api=(document.modelContext?'document.modelContext':'navigator.modelContext');
      var n=null;
      try{ if(typeof mc.getTools==='function'){var g=mc.getTools(); if(g&&g.length!=null)n=g.length;} }catch(e){}
      try{ if(n==null&&mc.tools&&mc.tools.length!=null)n=mc.tools.length; }catch(e){}
      R.webmcp.tools=n;
    }
  }catch(e){R.webmcp.error=1;}
  // --- Agent-centric accessibility (computed on the live DOM) ---
  try{
    function vis(el){
      try{var s=getComputedStyle(el); if(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity||'1')===0)return false;}catch(e){}
      if(el.closest&&el.closest('[aria-hidden="true"]'))return false;
      var r=el.getBoundingClientRect?el.getBoundingClientRect():null;
      if(r&&r.width===0&&r.height===0)return false;
      return true;
    }
    function name(el){
      var al=el.getAttribute&&el.getAttribute('aria-label'); if(t(al))return t(al);
      var lb=el.getAttribute&&el.getAttribute('aria-labelledby');
      if(lb){var ref=document.getElementById(lb.split(/\\s+/)[0]); if(ref&&t(ref.textContent))return t(ref.textContent);}
      var tx=t(el.textContent); if(tx)return tx;
      var ti=el.getAttribute&&el.getAttribute('title'); if(t(ti))return t(ti);
      var tag=(el.tagName||'').toLowerCase(), ty=(el.getAttribute&&el.getAttribute('type')||'').toLowerCase();
      if(tag==='input'&&(ty==='submit'||ty==='button')){var v=el.getAttribute('value'); if(t(v))return t(v);}
      if(tag==='input'&&ty==='image'){var a=el.getAttribute('alt'); if(t(a))return t(a);}
      if(el.id){try{var lf=document.querySelector('label[for="'+(window.CSS&&CSS.escape?CSS.escape(el.id):el.id)+'"]'); if(lf&&t(lf.textContent))return t(lf.textContent);}catch(e){}}
      var pl=el.closest&&el.closest('label'); if(pl&&t(pl.textContent))return t(pl.textContent);
      var ph=el.getAttribute&&el.getAttribute('placeholder'); if(t(ph))return t(ph);
      var im=el.querySelector&&el.querySelector('img[alt]'); if(im&&t(im.getAttribute('alt')))return t(im.getAttribute('alt'));
      return '';
    }
    var sel='a[href],button,[role="button"],[role="link"],[role="menuitem"],[role="tab"],[role="checkbox"],[role="switch"],input:not([type="hidden"]),select,textarea';
    var els=document.querySelectorAll(sel), total=0, unnamed=0, samples=[];
    for(var i=0;i<els.length;i++){var el=els[i]; if(!vis(el))continue; total++; if(!name(el)){unnamed++; if(samples.length<8){var h=(el.getAttribute&&(el.getAttribute('class')||el.id))||''; samples.push(((el.tagName||'').toLowerCase())+(h?('.'+String(h).split(/\\s+/)[0]):''));}}}
    R.a11y.interactive=total; R.a11y.unnamed=unnamed; R.a11y.unnamedSamples=samples;
    var fields=document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"]),select,textarea');
    var ft=0,fn=0; for(var j=0;j<fields.length;j++){var fe=fields[j]; if(!vis(fe))continue; ft++; if(!name(fe))fn++;}
    R.a11y.fields=ft; R.a11y.fieldsNoLabel=fn;
    var imgs=document.querySelectorAll('img'); var it=0,ina=0; for(var k=0;k<imgs.length;k++){var im2=imgs[k]; if(!vis(im2))continue; if(im2.getAttribute('role')==='presentation'||im2.getAttribute('aria-hidden')==='true')continue; it++; if(im2.getAttribute('alt')==null)ina++;}
    R.a11y.images=it; R.a11y.imagesNoAlt=ina;
    R.a11y.hasMain=!!document.querySelector('main,[role="main"]');
    R.a11y.landmarks=document.querySelectorAll('main,nav,header,footer,aside,[role="main"],[role="navigation"],[role="banner"],[role="contentinfo"]').length;
    R.a11y.h1=document.querySelectorAll('h1').length;
  }catch(e){R.a11y.error=1;}
  // --- write results back into the page for the server to read ---
  function write(){
    try{
      var node=document.getElementById('__blursor_agentic__')||document.createElement('script');
      node.type='application/json'; node.id='__blursor_agentic__';
      node.textContent=JSON.stringify(R).replace(/</g,'\\\\u003c');
      (document.body||document.documentElement).appendChild(node);
    }catch(e){}
  }
  // --- Layout stability (CLS). Prefer a buffered observer — it reports shifts
  // that happened before this probe was injected. Fall back to a sync read. An
  // empty result on a browser that supports the API means zero shift (good),
  // not "unknown" — so report 0, not null. ---
  try{
    var supported=!!(window.PerformanceObserver&&PerformanceObserver.supportedEntryTypes&&PerformanceObserver.supportedEntryTypes.indexOf('layout-shift')>=0);
    var got=false;
    if(supported){
      try{
        var total=0;
        var obs=new PerformanceObserver(function(list){
          list.getEntries().forEach(function(e){ if(!e.hadRecentInput) total+=e.value; });
          R.cls=Math.round(total*1000)/1000; got=true; write();
        });
        obs.observe({type:'layout-shift',buffered:true});
      }catch(e){}
    }
    if(!got){
      var ls=[]; try{ls=performance.getEntriesByType('layout-shift')||[];}catch(e){}
      if(ls.length){var c=0;for(var m=0;m<ls.length;m++){if(!ls[m].hadRecentInput)c+=ls[m].value;}R.cls=Math.round(c*1000)/1000;}
      else{R.cls=supported?0:null;}
    }
    try{var lcp=performance.getEntriesByType('largest-contentful-paint'); if(lcp&&lcp.length)R.vitals.lcp=Math.round(lcp[lcp.length-1].startTime);}catch(e){}
  }catch(e){R.cls=null;}
  write();
})();`;

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
      return json({ ok: false, error: `Couldn't reach ${target.href} — ${baseline.error || "no response"}. Double-check the address.` }, 422);
    }
    if (baseline.status === 403 || baseline.status === 429) {
      return json({ ok: false, error: `We were blocked from loading ${target.href} (HTTP ${baseline.status}) — the site may be protected against automated tools, so we can't read it the way AI would.` }, 422);
    }
    if (baseline.status >= 400) {
      return json({ ok: false, error: `That page returned an error (HTTP ${baseline.status}) — there may be no live page at ${target.href}.` }, 422);
    }
    if (baseline.contentType && !/text\/html|application\/xhtml/i.test(baseline.contentType)) {
      return json({ ok: false, error: `That link isn't a web page (it's ${baseline.contentType.split(";")[0].trim()}). Paste a normal page URL instead.` }, 415);
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

    // If there's essentially nothing to analyze — no title, no text, no headings, and no JS
    // app to explain the emptiness — and rendering didn't reveal content either, don't
    // fabricate a report. It's likely a parked domain, an empty page, or a redirect.
    const rawEmpty = rawPage.visibleTextChars < 50 && !rawPage.title && rawPage.headings.h1 + rawPage.headings.h2 === 0 && !rawPage.frameworkHint && rawPage.scriptBytes < 2000;
    const renEmpty = !renderedPage || renderedPage.visibleTextChars < 50;
    if (rawEmpty && renEmpty) {
      return json({ ok: false, error: `We reached ${target.href} but found almost no readable content — it may be a parked domain, an empty page, or a redirect. Try the specific page you want to check.` }, 422);
    }

    const llms = { present: llmsRes.ok && llmsRes.status === 200, looksValid: false };
    if (llms.present) llms.looksValid = /^\s*#\s+/.test(llmsRes.body) && /\n\s*##\s+/.test(llmsRes.body);

    const findings = buildFindings({ botAccess, rawPage, renderedPage, llms });
    const summary = findings.reduce((a, f) => ((a[f.status] = (a[f.status] || 0) + 1), a), { pass: 0, warn: 0, fail: 0 });

    // The second half: can an AI AGENT use the page (not just read it)?
    const agentic = analyzeAgentic({ injected: render.agentic, renderedHtml: render.html, rawHtml, llms });

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
      rendered: renderedPage ? { visibleTextChars: renderedPage.visibleTextChars, headings: renderedPage.headings, hasJsonLd: renderedPage.hasJsonLd, outline: renderedPage.outline } : null,
      screenshot: render.screenshot || null,
      llms,
      findings,
      agentic,
    });
  } catch (e) {
    return json({ ok: false, error: `Check failed: ${e.message}` }, 500);
  }
}

// --- Browser Rendering (Cloudflare REST API) --------------------------------

async function renderViaCloudflare(url, env) {
  if (!env || !env.CF_ACCOUNT_ID || !env.CF_BROWSER_TOKEN) return { html: null, screenshot: null, agentic: null, status: "no-credentials" };

  // Edge-cache renders by URL so repeat checks don't burn the daily budget. The
  // agent probe writes its results into the HTML (a JSON <script> node), so
  // caching the HTML caches the agent signals too — we just re-extract on a hit.
  let cache = null, cacheKey = null;
  try {
    cache = caches.default;
    cacheKey = new Request("https://render-cache.blursor.ai/v4/" + encodeURIComponent(url));
    const hit = await cache.match(cacheKey);
    if (hit) {
      const t = await hit.text();
      if (t) {
        const cached = JSON.parse(t);
        const html = cached && typeof cached.html === "string" ? cached.html : null;
        const screenshot = cached && typeof cached.screenshot === "string" ? cached.screenshot : null;
        if (html) return { html, screenshot, agentic: extractInjected(html), status: "cached" };
      }
    }
  } catch { /* cache optional */ }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/browser-rendering/snapshot`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), RENDER_TIMEOUT_MS);
  try {
    // Try WITH the agent probe injected. If that specific request fails (but the
    // budget isn't exhausted), retry a plain render — so the readability half can
    // never regress just because the probe params were unhappy.
    let out = await postContent(endpoint, env, url, true, ctrl);
    if (!out.html && out.status !== "quota-exceeded") out = await postContent(endpoint, env, url, false, ctrl);
    if (!out.html) return { html: null, screenshot: null, agentic: null, status: out.status };
    if (cache && cacheKey) {
      try {
        await cache.put(cacheKey, new Response(JSON.stringify({ html: out.html, screenshot: out.screenshot || null }), {
          headers: { "Cache-Control": `public, max-age=${RENDER_CACHE_TTL}` },
        }));
      } catch {}
    }
    return { html: out.html, screenshot: out.screenshot || null, agentic: extractInjected(out.html), status: out.status };
  } catch (e) {
    return { html: null, screenshot: null, agentic: null, status: e.name === "AbortError" ? "timeout" : "error" };
  } finally {
    clearTimeout(timer);
  }
}

async function postContent(endpoint, env, url, withProbe, ctrl) {
  const body = {
    url,
    gotoOptions: { waitUntil: "networkidle0", timeout: 15000 },
    viewport: { width: 1100, height: 1400 },
    screenshotOptions: { type: "jpeg", quality: 70 },
  };
  if (withProbe) {
    // Inject the agent probe, then let late JS register WebMCP tools / layout
    // settle before the HTML is captured.
    body.addScriptTag = [{ content: AGENT_PROBE_JS }];
    body.waitForTimeout = 1000;
  }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CF_BROWSER_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  });
  if (res.status === 429) return { html: null, status: "quota-exceeded" };
  if (!res.ok) return { html: null, status: `error-${res.status}` };
  const data = await res.json().catch(() => null);
  const result = data && data.success ? data.result : null;
  const html = typeof result === "string" ? result : (result && typeof result.content === "string" ? result.content : null);
  let screenshot = null;
  try { screenshot = result && typeof result.screenshot === "string" ? result.screenshot : null; } catch {}
  return { html, screenshot, status: html ? (withProbe ? "rendered" : "rendered-noprobe") : "empty" };
}

// Read the agent-probe results the injected script wrote into the page. The JSON
// has its "<" escaped to <, so it can't contain a literal </script> to trip
// this regex (or the browser's own HTML parser).
function extractInjected(html) {
  try {
    const m = html.match(/<script[^>]+id=["']__blursor_agentic__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!m) return null;
    const parsed = JSON.parse(m[1].trim());
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
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
    return { ok: true, status: res.status, body, bytes: body.length, finalUrl: res.url, contentType: res.headers.get("content-type") || "" };
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
    outline: extractOutline(html),
  };
}

// Pull readable blocks (headings, paragraphs, lists) in document order — a
// heuristic "what the crawler actually extracts" view. Operates on script-free
// HTML so it reflects readable content, not code.
function extractOutline(html) {
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  // NB: we deliberately do NOT strip nav/footer — the point of this view is to
  // show everything the crawler actually receives, chrome included. The UI has
  // a search box for navigating long output.
  const blocks = [];
  const re = /<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m, total = 0;
  while ((m = re.exec(clean)) !== null) {
    const tag = m[1].toLowerCase();
    let text = decode(m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (!text) continue;
    if (text.length > 300) text = text.slice(0, 299) + "…";
    blocks.push({ tag, text });
    total += text.length;
    if (blocks.length >= 150 || total > 15000) { blocks.push({ tag: "more", text: "…(truncated — showing the first part)" }); break; }
  }
  return blocks;
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

// --- Agentic readiness ------------------------------------------------------
// Can an AI AGENT navigate and USE the page (not just read it)? Judged on the
// RENDERED page — agents drive a real browser — using the live probe when it
// came back, and HTML heuristics otherwise. Mirrors the signals in Google's
// Lighthouse "Agentic Browsing" category: WebMCP tools, accessible names on
// interactive controls, layout stability (CLS), and llms.txt discoverability.

function analyzeAgentic({ injected, renderedHtml, rawHtml, llms }) {
  const haveProbe = !!(injected && injected.a11y && !injected.a11y.error && typeof injected.a11y.interactive === "number");
  // measured  = live probe ran in the browser (accurate)
  // rendered-html = page rendered but the probe didn't report; read the HTML
  // heuristic = no render at all; rough read of the raw HTML
  const mode = haveProbe ? "measured" : (renderedHtml ? "rendered-html" : "heuristic");

  const a11y = haveProbe ? normalizeA11y(injected.a11y) : a11yFromHtml(renderedHtml || rawHtml || "");
  const cls = haveProbe && typeof injected.cls === "number" ? injected.cls : null;

  // WebMCP: live presence (probe) OR a source-level mention in the page code.
  const srcScan = scanWebmcpSource(rawHtml);
  const webmcp = {
    present: !!(injected && injected.webmcp && injected.webmcp.present) || srcScan.found,
    runtime: !!(injected && injected.webmcp && injected.webmcp.present),
    tools: injected && injected.webmcp && injected.webmcp.tools != null ? injected.webmcp.tools : null,
    source: srcScan.found ? srcScan.how : null,
  };

  // Static layout-shift risk (used when CLS couldn't be measured): images with
  // no set size are the classic cause of content jumping during load.
  const imgRisk = countDimensionlessImages(renderedHtml || rawHtml || "");

  const findings = buildAgenticFindings({ mode, a11y, cls, webmcp, imgRisk, llms });
  const summary = findings.reduce((acc, f) => ((acc[f.status] = (acc[f.status] || 0) + 1), acc), { pass: 0, warn: 0, fail: 0, info: 0 });

  return {
    mode,
    summary,
    findings,
    signals: { webmcp, a11y, cls, lcp: haveProbe && injected.vitals ? (injected.vitals.lcp ?? null) : null, imgRisk },
  };
}

function normalizeA11y(a) {
  return {
    interactive: a.interactive || 0,
    unnamed: a.unnamed || 0,
    unnamedSamples: a.unnamedSamples || [],
    fields: a.fields || 0,
    fieldsNoLabel: a.fieldsNoLabel || 0,
    images: a.images || 0,
    imagesNoAlt: a.imagesNoAlt || 0,
    hasMain: !!a.hasMain,
    landmarks: a.landmarks || 0,
    h1: a.h1 || 0,
    approx: false,
  };
}

function buildAgenticFindings({ mode, a11y, cls, webmcp, imgRisk, llms }) {
  const f = [];
  const ratio = a11y.interactive > 0 ? a11y.unnamed / a11y.interactive : 0;

  // 1. Accessible names on interactive controls — the core "can an agent operate this?" check
  if (a11y.interactive === 0) {
    f.push(finding("agent-labels", "No interactive elements found", "info",
      "We didn't find buttons, links, or form fields on the rendered page.",
      "Agents act by using controls. A page with nothing to operate is read-only to them — fine for an article, limiting for an app.", SRC.lighthouse));
  } else if (a11y.unnamed === 0) {
    f.push(finding("agent-labels", "Buttons and links are clearly labeled", "pass",
      `All ${a11y.interactive} interactive elements have a name an agent can read.`,
      "Agents pick what to click by each control's accessible name. Clear names mean reliable actions.", SRC.lighthouse));
  } else {
    const st = ratio > 0.25 ? "fail" : "warn";
    const eg = a11y.unnamedSamples && a11y.unnamedSamples.length ? ` (e.g. ${a11y.unnamedSamples.slice(0, 4).join(", ")})` : "";
    f.push(finding("agent-labels", "Some buttons or links have no readable label", st,
      `${a11y.unnamed} of ${a11y.interactive} interactive elements have no name an agent can read${eg}.`,
      "An icon-only button or a bare link is invisible or ambiguous to an agent — and to screen-reader users. Give each a clear label.", SRC.lighthouse));
  }

  // 2. Form fields
  if (a11y.fields > 0) {
    if (a11y.fieldsNoLabel === 0) {
      f.push(finding("agent-forms", "Form fields are labeled", "pass",
        `All ${a11y.fields} form field${a11y.fields === 1 ? "" : "s"} have a label.`,
        "To fill a form, an agent needs to know what each field is for.", SRC.lighthouse));
    } else {
      const st = a11y.fieldsNoLabel >= a11y.fields ? "fail" : "warn";
      f.push(finding("agent-forms", "Some form fields have no label", st,
        `${a11y.fieldsNoLabel} of ${a11y.fields} form fields have no label.`,
        "An unlabeled field forces an agent to guess what to type — a common point of failure.", SRC.lighthouse));
    }
  }

  // 3. Images
  if (a11y.images > 0) {
    if (a11y.imagesNoAlt === 0) {
      f.push(finding("agent-images", "Images have text descriptions", "pass",
        `All ${a11y.images} content image${a11y.images === 1 ? "" : "s"} have alt text.`,
        "Agents and blind users read images through their alt text.", SRC.lighthouse));
    } else {
      f.push(finding("agent-images", "Some images have no text description", "warn",
        `${a11y.imagesNoAlt} of ${a11y.images} content images have no alt text.`,
        "Without alt text, what an image shows is invisible to an agent.", SRC.lighthouse));
    }
  }

  // 4. Structure / landmarks
  const sIssues = [];
  if (!a11y.hasMain) sIssues.push("no main-content landmark");
  if (a11y.h1 !== 1) sIssues.push(`${a11y.h1} H1 heading${a11y.h1 === 1 ? "" : "s"} (want exactly 1)`);
  if (sIssues.length === 0) {
    f.push(finding("agent-structure", "Clear structure to navigate", "pass",
      "One H1 and a main-content landmark are present.",
      "Agents use landmarks and a single clear H1 to tell your content from the page chrome.", SRC.lighthouse));
  } else {
    f.push(finding("agent-structure", "Page structure could be clearer", "warn",
      `${cap(sIssues.join("; "))}.`,
      "Without a main landmark and one clear H1, an agent has a harder time finding the actual content.", SRC.lighthouse));
  }

  // 5. Layout stability (CLS)
  if (cls !== null && cls !== undefined) {
    if (cls <= 0.1) {
      f.push(finding("agent-stability", "Your page holds still as it loads", "pass",
        `Layout shift (CLS) is ${cls} — Google's "good" mark is 0.1 or under.`,
        "When content stays put, an agent clicks what it means to.", SRC.lighthouse));
    } else if (cls <= 0.25) {
      f.push(finding("agent-stability", "Your page shifts a little as it loads", "warn",
        `Layout shift (CLS) is ${cls} (good is 0.1 or under).`,
        "Moving content can make an agent click the wrong thing as the page settles.", SRC.lighthouse));
    } else {
      f.push(finding("agent-stability", "Your page jumps around as it loads", "fail",
        `Layout shift (CLS) is ${cls} (good is 0.1 or under).`,
        "A lot of movement during load is a recipe for mis-clicks — by agents and people alike.", SRC.lighthouse));
    }
  } else {
    const d = imgRisk > 0
      ? `We couldn't measure it on this render. ${imgRisk} image${imgRisk === 1 ? "" : "s"} have no set size — the most common cause of layout jumps.`
      : "We couldn't measure it on this render, and saw no obvious layout-shift risks in the markup.";
    f.push(finding("agent-stability", "Layout shift not measured", "info", d,
      "If content moves while loading, an agent can click the wrong thing. Worth a manual look.", SRC.lighthouse));
  }

  // 6. WebMCP — forward-looking, never counted against the page
  if (webmcp.present) {
    const how = webmcp.runtime
      ? (webmcp.tools != null ? `${webmcp.tools} tool${webmcp.tools === 1 ? "" : "s"} registered live via the WebMCP API` : "registered live via the WebMCP API (document.modelContext)")
      : `referenced in the page's code (${webmcp.source})`;
    f.push(finding("agent-webmcp", "Exposes agent actions (WebMCP)", "pass", cap(how) + ".",
      "Rare and ahead of the curve: WebMCP lets an agent call your site's actions directly, instead of guessing from the UI.", SRC.webmcp));
  } else {
    f.push(finding("agent-webmcp", "No agent actions yet (WebMCP) — that's normal", "info",
      "We found no WebMCP tools. Almost no site has them yet — the standard is brand new (Chrome-only, experimental).",
      "Forward-looking only: a site isn't behind for lacking WebMCP today. Worth knowing about for when agents start using it.", SRC.webmcp));
  }

  // 7. Discoverability — Lighthouse's agentic category checks for llms.txt
  if (llms && llms.present) {
    f.push(finding("agent-discoverability", "llms.txt is present", "info",
      "Lighthouse's agentic checks count llms.txt being present.",
      "Worth knowing it's there — though a 300k-site study found llms.txt doesn't actually drive AI citations.", SRC.seranking));
  } else {
    f.push(finding("agent-discoverability", "No llms.txt (that's fine)", "info",
      "Lighthouse counts llms.txt presence, but it's optional.",
      "Research shows llms.txt doesn't move the needle, so skipping it costs nothing.", SRC.seranking));
  }

  return f;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

// Source-level WebMCP backstop: catch pages that reference the API even if the
// runtime probe didn't observe a registered tool in time.
function scanWebmcpSource(rawHtml) {
  // Scan the RAW HTML only. The rendered HTML contains our own injected probe
  // (which references modelContext), which would otherwise self-trigger this.
  const hay = rawHtml || "";
  if (/\bmodelContext\b/.test(hay)) return { found: true, how: "modelContext in page code" };
  if (/\bregisterTool\s*\(/.test(hay)) return { found: true, how: "registerTool() in page code" };
  return { found: false, how: null };
}

function countDimensionlessImages(html) {
  if (!html) return 0;
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  let n = 0;
  for (const tag of imgs) {
    if (/aria-hidden=["']true["']/i.test(tag)) continue;
    const hasW = /\swidth\s*=/i.test(tag) || /style=["'][^"']*\bwidth\s*:/i.test(tag) || /\baspect-ratio\s*:/i.test(tag);
    const hasH = /\sheight\s*=/i.test(tag) || /style=["'][^"']*\bheight\s*:/i.test(tag) || /\baspect-ratio\s*:/i.test(tag);
    if (!(hasW && hasH)) n++;
  }
  return n;
}

// Fallback accessible-name read straight from HTML, used when the live probe
// didn't run. Cruder than the in-page probe (it can't resolve label[for] or
// computed visibility), so results carry approx:true and the UI says so.
function a11yFromHtml(html) {
  const res = { interactive: 0, unnamed: 0, unnamedSamples: [], fields: 0, fieldsNoLabel: 0, images: 0, imagesNoAlt: 0, hasMain: false, landmarks: 0, h1: 0, approx: true };
  if (!html) return res;
  res.hasMain = /<main[\s>]/i.test(html) || /role=["']main["']/i.test(html);
  res.landmarks = (html.match(/<(main|nav|header|footer|aside)[\s>]/gi) || []).length + (html.match(/role=["'](main|navigation|banner|contentinfo)["']/gi) || []).length;
  res.h1 = (html.match(/<h1[\s>]/gi) || []).length;

  const named = (attrs, inner) =>
    /aria-label\s*=\s*["'][^"']+["']/i.test(attrs) ||
    /title\s*=\s*["'][^"']+["']/i.test(attrs) ||
    (inner != null && inner.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim().length > 0) ||
    (inner != null && /<img[^>]+alt\s*=\s*["'][^"']+["']/i.test(inner));

  const note = (label) => { res.unnamed++; if (res.unnamedSamples.length < 8) res.unnamedSamples.push(label); };

  let m, guard = 0;
  const linkRe = /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  while ((m = linkRe.exec(html)) !== null && guard++ < 5000) {
    const tag = m[1].toLowerCase(), attrs = m[2], inner = m[3];
    if (tag === "a" && !/\shref\s*=/i.test(attrs)) continue; // anchors without href aren't controls
    res.interactive++;
    if (!named(attrs, inner)) note(tag);
  }

  guard = 0;
  const inputRe = /<input\b([^>]*)>/gi;
  while ((m = inputRe.exec(html)) !== null && guard++ < 5000) {
    const attrs = m[1];
    const type = ((attrs.match(/type\s*=\s*["']([^"']+)["']/i) || [])[1] || "text").toLowerCase();
    if (type === "hidden") continue;
    if (type === "submit" || type === "button" || type === "image" || type === "reset") {
      res.interactive++;
      const ok = /value\s*=\s*["'][^"']+["']/i.test(attrs) || /aria-label\s*=\s*["'][^"']+["']/i.test(attrs) || /alt\s*=\s*["'][^"']+["']/i.test(attrs);
      if (!ok) note("input." + type);
      continue;
    }
    res.interactive++; res.fields++;
    const ok = /aria-label\s*=\s*["'][^"']+["']/i.test(attrs) || /title\s*=\s*["'][^"']+["']/i.test(attrs) || /placeholder\s*=\s*["'][^"']+["']/i.test(attrs) || /aria-labelledby\s*=/i.test(attrs);
    if (!ok) { res.fieldsNoLabel++; note("input." + type); }
  }

  guard = 0;
  const fieldRe = /<(select|textarea)\b([^>]*)>/gi;
  while ((m = fieldRe.exec(html)) !== null && guard++ < 5000) {
    const attrs = m[2];
    res.interactive++; res.fields++;
    const ok = /aria-label\s*=\s*["'][^"']+["']/i.test(attrs) || /title\s*=\s*["'][^"']+["']/i.test(attrs) || /aria-labelledby\s*=/i.test(attrs);
    if (!ok) { res.fieldsNoLabel++; note(m[1].toLowerCase()); }
  }

  guard = 0;
  const imgRe = /<img\b([^>]*)>/gi;
  while ((m = imgRe.exec(html)) !== null && guard++ < 5000) {
    const attrs = m[1];
    if (/role=["']presentation["']/i.test(attrs) || /aria-hidden=["']true["']/i.test(attrs)) continue;
    res.images++;
    if (!/\salt\s*=/i.test(attrs)) res.imagesNoAlt++;
  }

  return res;
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
