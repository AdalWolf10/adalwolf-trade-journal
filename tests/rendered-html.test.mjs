import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "journal.example" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the trade journal app shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Trade Journal<\/title>/i);
  assert.match(html, /Personal trading workspace/);
  assert.match(html, /New Trade/);
  assert.match(html, /Trade Log/);
  assert.match(html, /Total P\/L/);
  assert.match(html, /Opening range reclaim/);
  assert.match(html, /Export JSON/);
  assert.match(html, /Export CSV/);
  assert.doesNotMatch(
    html,
    /Your site is taking shape|Building your site|codex-preview|react-loading-skeleton/i,
  );
});

test("removes starter preview assets and keeps sharing metadata", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /trade-journal\.entries\.v1/);
  assert.match(page, /downloadFile\("trade-journal\.csv"/);
  assert.match(page, /accept="application\/json,\.json"/);
  assert.match(layout, /generateMetadata/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /twitter/);
  assert.match(layout, /\/og\.png/);
  assert.match(packageJson, /"name": "trade-journal-site"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page + layout, /_sites-preview|Starter Project|codex-preview/);

  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
});
