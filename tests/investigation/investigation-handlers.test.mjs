import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getInvestigationDossierPageResponse,
  getInvestigationDossierResponse,
} from "../../functions/lib/investigation/investigation-handlers.mjs";

const DEMO_ID = "kamran-synthetic";
const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
const request = new Request(`https://blursor.test/api/investigations/${DEMO_ID}`);
const jsonRoute = new URL("../../functions/api/investigations/[id].js", import.meta.url);
const pageRoute = new URL("../../functions/i/[id].js", import.meta.url);

function assertPrivate(response) {
  for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
    assert.equal(response.headers.get(name), value);
  }
}

test("demo JSON is indistinguishable from missing when disabled", async () => {
  const disabled = await getInvestigationDossierResponse({
    request,
    params: { id: DEMO_ID },
    env: {},
  });
  const unknown = await getInvestigationDossierResponse({
    request,
    params: { id: "unknown-investigation" },
    env: { INVESTIGATION_DEMO_ENABLED: "true" },
  });

  assert.equal(disabled.status, 404);
  assert.equal(unknown.status, 404);
  assert.deepEqual(await disabled.json(), { ok: false, error: "Investigation not found." });
  assert.deepEqual(await unknown.json(), { ok: false, error: "Investigation not found." });
  assertPrivate(disabled);
  assertPrivate(unknown);
});

test("demo gate accepts only the exact string true", async () => {
  for (const value of [true, "TRUE", " true ", "1"]) {
    const response = await getInvestigationDossierResponse({
      request,
      params: { id: DEMO_ID },
      env: { INVESTIGATION_DEMO_ENABLED: value },
    });
    assert.equal(response.status, 404);
    assertPrivate(response);
  }
});

test("enabled demo returns only the private synthetic dossier", async () => {
  const response = await getInvestigationDossierResponse({
    request,
    params: { id: DEMO_ID },
    env: { INVESTIGATION_DEMO_ENABLED: "true" },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/json; charset=utf-8");
  assertPrivate(response);
  assert.deepEqual(Object.keys(body).sort(), ["dossier", "ok"]);
  assert.equal(body.ok, true);
  assert.equal(body.observations, undefined);
  assert.equal(body.dossier.header.exampleOnly, true);
  assert.equal(body.dossier.header.question, "Why is the brand absent from this US prompt cohort?");
});

test("JSON handler owns non-GET methods with the same private 404", async () => {
  const hidden = await getInvestigationDossierResponse({
    request: new Request(`https://blursor.test/api/investigations/${DEMO_ID}`),
    params: { id: DEMO_ID },
    env: {},
  });
  const expectedBody = await hidden.text();

  for (const method of ["POST", "HEAD", "OPTIONS"]) {
    const response = await getInvestigationDossierResponse({
      request: new Request(`https://blursor.test/api/investigations/${DEMO_ID}`, { method }),
      params: { id: DEMO_ID },
      env: { INVESTIGATION_DEMO_ENABLED: "true" },
    });
    assert.equal(response.status, 404, method);
    assert.equal(await response.text(), expectedBody, method);
    assertPrivate(response);
  }
});

test("private page makes disabled and unknown demo IDs indistinguishable", async () => {
  let assetCalls = 0;
  const env = {
    INVESTIGATION_DEMO_ENABLED: "true",
    ASSETS: { fetch: async () => { assetCalls += 1; } },
  };
  const disabled = await getInvestigationDossierPageResponse({
    request: new Request(`https://blursor.test/i/${DEMO_ID}`),
    params: { id: DEMO_ID },
    env: { ASSETS: env.ASSETS },
  });
  const unknown = await getInvestigationDossierPageResponse({
    request: new Request("https://blursor.test/i/unknown-investigation"),
    params: { id: "unknown-investigation" },
    env,
  });

  assert.equal(disabled.status, 404);
  assert.equal(unknown.status, 404);
  assert.equal(await disabled.text(), "Investigation not found.");
  assert.equal(await unknown.text(), "Investigation not found.");
  assert.equal(assetCalls, 0);
  assertPrivate(disabled);
  assertPrivate(unknown);
});

test("page handler owns non-GET methods with the same private 404", async () => {
  let assetCalls = 0;
  const env = {
    INVESTIGATION_DEMO_ENABLED: "true",
    ASSETS: { fetch: async () => { assetCalls += 1; } },
  };
  const hidden = await getInvestigationDossierPageResponse({
    request: new Request(`https://blursor.test/i/${DEMO_ID}`),
    params: { id: DEMO_ID },
    env: { ASSETS: env.ASSETS },
  });
  const expectedBody = await hidden.text();

  for (const method of ["POST", "HEAD", "OPTIONS"]) {
    const response = await getInvestigationDossierPageResponse({
      request: new Request(`https://blursor.test/i/${DEMO_ID}`, { method }),
      params: { id: DEMO_ID },
      env,
    });
    assert.equal(response.status, 404, method);
    assert.equal(await response.text(), expectedBody, method);
    assertPrivate(response);
  }
  assert.equal(assetCalls, 0);
});

test("private page serves the dossier shell only when enabled", async () => {
  let requestedUrl;
  let requestedMethod;
  const asset = new Response("<html>dossier shell</html>", {
    headers: { "Content-Type": "text/html; charset=utf-8", ETag: '"dossier-shell"' },
  });
  const response = await getInvestigationDossierPageResponse({
    request: new Request(`https://blursor.test/i/${DEMO_ID}`),
    params: { id: DEMO_ID },
    env: {
      INVESTIGATION_DEMO_ENABLED: "true",
      ASSETS: {
        fetch: async (assetRequest) => {
          requestedUrl = assetRequest.url;
          requestedMethod = assetRequest.method;
          return asset.clone();
        },
      },
    },
  });

  assert.equal(requestedUrl, "https://blursor.test/investigation-dossier");
  assert.equal(requestedMethod, "GET");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("ETag"), '"dossier-shell"');
  assertPrivate(response);
  assert.equal(await response.text(), "<html>dossier shell</html>");
});

test("enabled page returns a private generic error when assets are unavailable", async () => {
  const response = await getInvestigationDossierPageResponse({
    request: new Request(`https://blursor.test/i/${DEMO_ID}`),
    params: { id: DEMO_ID },
    env: { INVESTIGATION_DEMO_ENABLED: "true" },
  });

  assert.equal(response.status, 500);
  assert.equal(await response.text(), "Investigation page is temporarily unavailable.");
  assertPrivate(response);
});

test("enabled page keeps asset-fetch failures private and generic", async () => {
  const response = await getInvestigationDossierPageResponse({
    request: new Request(`https://blursor.test/i/${DEMO_ID}`),
    params: { id: DEMO_ID },
    env: {
      INVESTIGATION_DEMO_ENABLED: "true",
      ASSETS: { fetch: async () => { throw new Error("secret asset failure"); } },
    },
  });

  assert.equal(response.status, 500);
  assert.equal(await response.text(), "Investigation page is temporarily unavailable.");
  assertPrivate(response);
});

test("Cloudflare routes export catch-all request handlers", async () => {
  const [jsonSource, pageSource] = await Promise.all([
    readFile(jsonRoute, "utf8"),
    readFile(pageRoute, "utf8"),
  ]);

  for (const source of [jsonSource, pageSource]) {
    assert.match(source, /export function onRequest\(context\)/);
    assert.doesNotMatch(source, /onRequestGet/);
  }
  assert.match(jsonSource, /return getInvestigationDossierResponse\(context\)/);
  assert.match(pageSource, /return getInvestigationDossierPageResponse\(context\)/);
});
