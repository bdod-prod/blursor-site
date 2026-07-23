import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const CHECKER = new URL("../ai-crawler-checker.html", import.meta.url);

test("the active checker loads UUID report paths without rerunning a check", async () => {
  const html = await readFile(CHECKER, "utf8");

  assert.match(html, /var reportMatch = window\.location\.pathname\.match\(\/\^\\\/r\\\//);
  assert.match(html, /function fetchStoredReport\(id\)/);
  assert.match(html, /fetch\('\/api\/reports\/' \+ encodeURIComponent\(id\)\)/);
  assert.match(html, /function loadStoredReport\(id\)/);
  assert.match(html, /loadStoredReport\(reportMatch\[1\]\)/);
  assert.match(html, /renderReport\(res\.body\)/);
});

test("fresh checks prefer the stored report URL and retain a query fallback", async () => {
  const html = await readFile(CHECKER, "utf8");

  assert.match(html, /replaceShareUrl\(url, null, res\.body\.report\)/);
  assert.match(html, /function replaceShareUrl\(url, vs, report\)/);
  assert.match(html, /report && report\.url \? report\.url : '\?url='/);
  assert.match(html, /if \(vs\) next = '\?url=' \+ encodeURIComponent\(url\)/);
});

test("single reports offer an explicit re-run that creates a new snapshot", async () => {
  const html = await readFile(CHECKER, "utf8");

  assert.match(html, /function renderShare\(data\)/);
  assert.match(html, /renderShare\(data\)/);
  assert.match(html, /'Re-run this page'/);
  assert.match(html, /run\(data\.url\)/);
});

test("the checker discloses snapshot storage before a visitor submits a URL", async () => {
  const html = await readFile(CHECKER, "utf8");

  assert.match(html, /Successful checks are saved as unlisted report links and include extracted page text\./);
  assert.match(html, /Don’t paste private or tokenized URLs\./);
});
