const reportId = "7a386ed9-2ea5-4ac1-bc4e-7b4f1d9b0f2a";
const storedRows = [];
let fetchCalls = 0;
const mode = process.argv[2] || "capture";

const html = `<!doctype html>
<html>
<head>
  <title>Fixture Page</title>
  <meta name="description" content="Fixture description">
</head>
<body>
  <main>
    <h1>Fixture Page</h1>
    <p>This public fixture has enough readable text for the real BLURSOR handler to analyze without treating the page as empty.</p>
  </main>
</body>
</html>`;

globalThis.fetch = async (input, init = {}) => {
  fetchCalls += 1;
  const url = String(input);
  if (url.startsWith("https://project.supabase.co/rest/v1/check_reports")) {
    storedRows.push(JSON.parse(init.body));
    return new Response(JSON.stringify([{ id: reportId }]), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (url.endsWith("/robots.txt")) {
    return new Response("User-agent: *\nAllow: /\n", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  if (url.endsWith("/llms.txt")) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};

const { onRequestGet } = await import("../../functions/api/check.js");
const checkedUrl = mode === "userinfo"
  ? "https://user:password@example.com/page"
  : "https://example.com/page?token=secret";
const response = await onRequestGet({
  request: new Request(`https://blursor.ai/api/check?url=${encodeURIComponent(checkedUrl)}`),
  env: {
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_test",
  },
});
const body = await response.json();
const row = storedRows[0];

if (mode === "userinfo") {
  process.stdout.write(JSON.stringify({
    ok: body.ok,
    status: response.status,
    error: body.error,
    fetchCalls,
    storedRows: storedRows.length,
  }));
  process.exit(0);
}

process.stdout.write(JSON.stringify({
  ok: body.ok,
  status: response.status,
  cacheControl: response.headers.get("Cache-Control"),
  httpStatus: body.httpStatus,
  renderDelta: body.renderDelta,
  capture: body.capture,
  report: body.report,
  fetchCalls,
  storedRows: storedRows.length,
  storedTarget: row && row.target_url,
  storedFinal: row && row.final_url,
  storedScreenshot: Boolean(row && Object.hasOwn(row.result, "screenshot")),
  storedBotCount: row && row.result.botAccess.length,
}));
