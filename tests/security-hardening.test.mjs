import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { safeDeviceFileContentDisposition } from "../lib/device-file-security.ts";

test("serves passive media inline and downloads active document types", () => {
  assert.equal(
    safeDeviceFileContentDisposition("chart.png", "image/png"),
    'inline; filename="chart.png"',
  );
  assert.equal(
    safeDeviceFileContentDisposition("review.pdf", "application/pdf"),
    'inline; filename="review.pdf"',
  );
  assert.equal(
    safeDeviceFileContentDisposition("notes.txt", "text/plain; charset=utf-8"),
    'inline; filename="notes.txt"',
  );
  assert.equal(
    safeDeviceFileContentDisposition("page.html", "text/html; charset=utf-8"),
    'attachment; filename="page.html"',
  );
  assert.equal(
    safeDeviceFileContentDisposition("vector.svg", "image/svg+xml"),
    'attachment; filename="vector.svg"',
  );
  assert.equal(
    safeDeviceFileContentDisposition("payload.js", "application/javascript"),
    'attachment; filename="payload.js"',
  );
});

test("sanitizes filenames used in response headers", () => {
  assert.equal(
    safeDeviceFileContentDisposition('bad"name\r\n.html', "text/html"),
    'attachment; filename="bad_name__.html"',
  );
});

test("configures automated dependency and code security checks", async () => {
  const [dependabot, codeql, securityChecks, policy] = await Promise.all([
    readFile(new URL("../.github/dependabot.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/codeql.yml", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/security-checks.yml", import.meta.url), "utf8"),
    readFile(new URL("../SECURITY.md", import.meta.url), "utf8"),
  ]);

  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(dependabot, /interval: weekly/);
  assert.match(codeql, /github\/codeql-action\/analyze@v4/);
  assert.match(securityChecks, /npm audit --omit=dev --audit-level=high/);
  assert.match(securityChecks, /npm test/);
  assert.match(policy, /Report a vulnerability/);
});
