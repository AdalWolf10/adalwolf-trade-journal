import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

test("defines the exit strategy journal shell", async () => {
  const [home, journal, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/journal/JournalApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  const source = home + journal + layout;

  assert.match(source, /Welcome/);
  assert.match(source, /Please login to continue/);
  assert.match(source, /Exit Strategy Journal/);
  assert.match(source, /Net Actual R/);
  assert.match(source, /Profit Factor/);
  assert.match(source, /Journal Score/);
  assert.match(source, /Journal score breakdown/);
  assert.match(source, /BE Hit\?/);
  assert.match(source, /First TP R/);
  assert.match(source, /Max R/);
  assert.match(source, /Actual R/);
  assert.match(source, /Month navigation/);
  assert.match(source, /month-switcher/);
  assert.match(source, /This month/);
  assert.match(source, /function shiftMonth/);
  assert.match(source, /Month tabs/);
  assert.match(source, /month-tabs/);
  assert.match(source, /Report Range/);
  assert.match(source, /Current Year/);
  assert.match(source, /custom-month-range/);
  assert.match(source, /Export Excel/);
  assert.match(source, /Excel Template/);
  assert.match(source, /parseXlsxTrades/);
  assert.match(source, /showDatePicker/);
  assert.match(source, /date-picker-input/);
  assert.match(source, /sort-header/);
  assert.match(source, /↕/);
  assert.match(source, /sortedReportTrades/);
  assert.match(source, /modal-backdrop/);
  assert.match(source, /entry-modal/);
  assert.match(source, /Strategy Ranking/);
  assert.match(source, /strategy-ranking-list/);
  assert.doesNotMatch(source, /Exit Comparison|Strategy Totals/);
  assert.match(source, /Daily Net Cumulative R/);
  assert.match(source, /trade days/);
  assert.match(source, /Export JSON/);
  assert.match(source, /Export CSV/);
  assert.doesNotMatch(source, /Add Sample/);
  assert.doesNotMatch(source, /buildMonthOptions/);
  assert.doesNotMatch(
    source,
    /Log in to open your personal trading journal|BE first\. Targets next\. Compare the exit, not the memory|Excel format: Date/,
  );
  assert.doesNotMatch(
    source,
    /Your site is taking shape|Building your site|codex-preview|react-loading-skeleton/i,
  );
});

test("wires the hosted exit journal data model", async () => {
  const [journal, pageRoute, auth, login, logout, layout, packageJson, schema, route, hosting, migration] =
    await Promise.all([
      readFile(new URL("../app/journal/JournalApp.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/journal/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../lib/auth.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/trades/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
      readFile(new URL("../drizzle/0000_colossal_ironclad.sql", import.meta.url), "utf8"),
    ]);

  assert.match(journal, /fetch\("\/api\/trades"/);
  assert.match(journal, /function strategyResult/);
  assert.match(journal, /beHit === "No"/);
  assert.match(journal, /actualR: beHit === "No" \? -1/);
  assert.match(journal, /onePointFive: trade\.maxR >= 1\.5 \? 1\.5 : 0/);
  assert.doesNotMatch(journal, /radar/);
  assert.doesNotMatch(journal, /localStorage|sessionStorage/);
  assert.match(pageRoute, /isAuthenticated/);
  assert.match(pageRoute, /redirect\("\/"\)/);
  assert.match(auth, /JOURNAL_USERNAME/);
  assert.match(auth, /SESSION_SECRET/);
  assert.match(login, /Set-Cookie/);
  assert.match(logout, /makeExpiredSessionCookie/);
  assert.match(route, /requireAuthenticatedRequest/);
  assert.match(route, /actualR = beHit === "No" \? -1/);
  assert.match(layout, /Exit Strategy Journal/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /twitter/);
  assert.match(layout, /\/og\.png/);
  assert.match(packageJson, /"name": "trade-journal-site"/);
  assert.match(schema, /exitTrades/);
  assert.match(schema, /sqliteTable\("exit_trades"/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /export async function PUT/);
  assert.match(route, /export async function DELETE/);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(migration, /CREATE TABLE `exit_trades`/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(journal + layout, /_sites-preview|Starter Project|codex-preview/);

  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
});
