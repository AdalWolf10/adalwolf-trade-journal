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
  assert.match(source, /suppressHydrationWarning/);
  assert.match(source, /Exit Strategy Journal/);
  assert.match(source, /Net Actual R/);
  assert.match(source, /Profit Factor/);
  assert.match(source, /Journal Score/);
  assert.match(source, /Journal score breakdown/);
  assert.match(source, /Private Home/);
  assert.match(source, /Command Center/);
  assert.match(source, /home-tile-grid/);
  assert.match(source, /Copy Last/);
  assert.match(source, /quickTradeTemplates/);
  assert.match(source, /trade-template-strip/);
  assert.match(source, /tag-picker-strip/);
  assert.match(source, /duplicateTrade/);
  assert.match(source, /BE Hit\?/);
  assert.match(source, /First TP R/);
  assert.match(source, /Max R/);
  assert.match(source, /Actual R/);
  assert.match(source, /Instrument/);
  assert.match(source, /Direction/);
  assert.match(source, /Session/);
  assert.match(source, /Setup Name/);
  assert.match(source, /Tags/);
  assert.match(source, /HTF Bias/);
  assert.match(source, /Price Action Rating/);
  assert.match(source, /Breakeven Trades/);
  assert.match(source, /What I did well and could have done better/);
  assert.match(source, /Screenshots & Attachments/);
  assert.match(source, /handleDailyJournalAttachmentUpload/);
  assert.match(source, /handleDailyJournalPaste/);
  assert.match(source, /makeDailyJournalAttachmentFilename/);
  assert.match(source, /alignedNarrativeLine/);
  assert.match(source, /tradeNarrativeTemplate/);
  assert.match(source, /renderNarrativeContent/);
  assert.match(source, /isNarrativeTradeHeader/);
  assert.match(source, /narrative-text-block/);
  assert.match(source, /narrative-trade-header/);
  assert.match(source, /Add Template/);
  assert.match(source, /Refresh Template/);
  assert.match(source, /document\.addEventListener\("paste"/);
  assert.match(source, /Daily Page/);
  assert.match(source, /Trade Detail/);
  assert.match(source, /Writing Space/);
  assert.match(source, /attachment-gallery/);
  assert.match(source, /attachmentPreview/);
  assert.match(source, /openTradeDetail/);
  assert.match(source, /text-editor-modal/);
  assert.match(source, /has-journal/);
  assert.match(source, /Daily journal saved/);
  assert.doesNotMatch(source, /<em>Journal<\/em>/);
  assert.match(source, /logSearch/);
  assert.match(source, /Month navigation/);
  assert.match(source, /month-switcher/);
  assert.match(source, /This month/);
  assert.match(source, /appTimeZone = "America\/Los_Angeles"/);
  assert.match(source, /currentAppDateParts/);
  assert.match(source, /formatToParts/);
  assert.match(source, /function shiftMonth/);
  assert.match(source, /function firstWeekday/);
  assert.match(source, /function defaultDraftDate/);
  assert.match(source, /currentDateKey/);
  assert.match(source, /Month tabs/);
  assert.match(source, /month-tabs/);
  assert.match(source, /selectedMonthTabRef/);
  assert.match(source, /scrollIntoView/);
  assert.match(source, /Report Range/);
  assert.match(source, /Current Year/);
  assert.match(source, /custom-month-range/);
  assert.match(source, /Data <span/);
  assert.match(source, /data-menu-panel/);
  assert.match(source, /Export Current View/);
  assert.match(source, /AI Analysis Packet/);
  assert.match(source, /AI_REVIEW_PROMPT\.md/);
  assert.match(source, /ai-analysis\.json/);
  assert.match(source, /tradeQualityAnalysis/);
  assert.match(source, /Excel Template/);
  assert.match(source, /Import JSON or Excel/);
  assert.match(source, /parseXlsxTrades/);
  assert.match(source, /tradeFingerprint/);
  assert.match(source, /filenamePart/);
  assert.match(source, /range: reportRange/);
  assert.match(source, /Possible duplicate trades/);
  assert.match(source, /Skip duplicates/);
  assert.match(source, /Import anyway/);
  assert.match(source, /already skipped by ID/);
  assert.match(source, /"ID"/);
  assert.match(source, /"id"/);
  assert.match(source, /showDatePicker/);
  assert.match(source, /date-picker-input/);
  assert.match(source, /sort-header/);
  assert.match(source, /↕/);
  assert.match(source, /sortedReportTrades/);
  assert.match(source, /modal-backdrop/);
  assert.match(source, /entry-modal/);
  assert.match(source, /Security/);
  assert.match(source, /Change Password/);
  assert.match(source, /\/api\/auth\/password/);
  assert.match(source, /Device Files/);
  assert.match(source, /device-menu-section/);
  assert.match(source, /\/journal\/device-files/);
  assert.match(source, /\/api\/device-files/);
  assert.match(source, /TV Code/);
  assert.match(source, /Open Device Files/);
  assert.match(source, /Copy TV Base/);
  assert.match(source, /Regenerate TV Code/);
  assert.match(source, /Copy TV Link/);
  assert.match(source, /Limit Reached/);
  assert.match(source, /function fileSizeLabel/);
  assert.match(source, /Strategy Ranking/);
  assert.match(source, /strategy-ranking-list/);
  assert.match(source, /Day Analysis/);
  assert.match(source, /Weekday Edge/);
  assert.match(source, /weekdayRows/);
  assert.match(source, /visibleWeekdayRows/);
  assert.match(source, /weekendLabels/);
  assert.match(source, /weekday-list/);
  assert.doesNotMatch(source, /Exit Comparison|Strategy Totals/);
  assert.match(source, /Daily Net Cumulative R/);
  assert.match(source, /trade days/);
  assert.doesNotMatch(source, /Export JSON/);
  assert.doesNotMatch(source, /Export CSV/);
  assert.doesNotMatch(source, /Export Excel/);
  assert.doesNotMatch(source, /Add Sample/);
  assert.doesNotMatch(source, /Trade Grade|Review Grade|Review Status/);
  assert.doesNotMatch(source, /Mistakes & Lessons|Mistake Category|Lesson Learned/);
  assert.doesNotMatch(source, /buildMonthOptions/);
  assert.match(source, /\["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"\]\.map/);
  assert.doesNotMatch(source, /for \(let offset = -1; offset >= -3/);
  assert.doesNotMatch(
    source,
    /Log in to open your personal trading journal|BE first\. Targets next\. Compare the exit, not the memory|Excel format: Date/,
  );
  assert.doesNotMatch(
    source,
    /Your site is taking shape|Building your site|codex-preview|react-loading-skeleton/i,
  );
});

test("keeps expanded writing editor theme-safe", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const expandedRules = [...css.matchAll(/\.expanded-textarea\s*\{(?<body>[^}]+)\}/g)]
    .map((match) => match.groups?.body ?? "")
    .join("\n");
  const deviceLinkRules = [
    ...css.matchAll(/\.(?:device-menu-link|device-menu-file-link|device-page-code code|device-file-table code)\s*\{(?<body>[^}]+)\}/g),
  ]
    .map((match) => match.groups?.body ?? "")
    .join("\n");
  const formulaPreviewRules = [...css.matchAll(/\.formula-preview span\s*\{(?<body>[^}]+)\}/g)]
    .map((match) => match.groups?.body ?? "")
    .join("\n");

  assert.match(expandedRules, /background:\s*var\(--input-bg\)/);
  assert.match(expandedRules, /color:\s*var\(--foreground\)/);
  assert.match(expandedRules, /border-color:\s*var\(--line-strong\)/);
  assert.doesNotMatch(expandedRules, /color:\s*#f2f4f9/i);
  assert.doesNotMatch(expandedRules, /background:\s*#0c0e12/i);
  assert.match(deviceLinkRules, /color:\s*var\(--muted-strong\)/);
  assert.doesNotMatch(deviceLinkRules, /color:\s*#cbd4e6/i);
  assert.match(formulaPreviewRules, /color:\s*var\(--muted-strong\)/);
});

test("wires the hosted exit journal data model", async () => {
  const [
    journal,
    pageRoute,
    homeRoute,
    auth,
    login,
    passwordRoute,
    logout,
    layout,
    packageJson,
    schema,
    route,
    dailyRoute,
    deviceRoute,
    journalAttachmentRoute,
    trashRoute,
    devicePage,
    deviceClient,
    trashPage,
    qualityPage,
    qualityClient,
    deviceHelpers,
    worker,
    wrangler,
    hosting,
    tradeMigration,
    authMigration,
    deviceMigration,
    shortCodeMigration,
    r2Migration,
    richTradeMigration,
    dailyJournalMigration,
    trashMigration,
  ] =
    await Promise.all([
      readFile(new URL("../app/journal/JournalApp.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/journal/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/journal/home/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../lib/auth.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/auth/password/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/trades/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/daily-journals/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/device-files/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/journal-attachments/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/api/trash/route.ts", import.meta.url), "utf8"),
      readFile(new URL("../app/journal/device-files/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/journal/device-files/DeviceFilesClient.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/journal/trash/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/journal/quality/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/journal/quality/QualityPageClient.tsx", import.meta.url), "utf8"),
      readFile(new URL("../lib/device-files.ts", import.meta.url), "utf8"),
      readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
      readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
      readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
      readFile(new URL("../drizzle/0000_colossal_ironclad.sql", import.meta.url), "utf8"),
      readFile(new URL("../drizzle/0001_swift_kate_bishop.sql", import.meta.url), "utf8"),
      readFile(new URL("../drizzle/0002_overjoyed_peter_parker.sql", import.meta.url), "utf8"),
      readFile(new URL("../drizzle/0003_fantastic_green_goblin.sql", import.meta.url), "utf8"),
      readFile(new URL("../drizzle/0004_wandering_maria_hill.sql", import.meta.url), "utf8"),
      readFile(new URL("../drizzle/0005_wide_human_cannonball.sql", import.meta.url), "utf8"),
      readFile(new URL("../drizzle/0006_ordinary_mister_sinister.sql", import.meta.url), "utf8"),
      readFile(new URL("../drizzle/0007_blue_susan_delgado.sql", import.meta.url), "utf8"),
    ]);

  assert.match(journal, /fetch\("\/api\/trades"/);
  assert.match(journal, /fetch\("\/api\/daily-journals"/);
  assert.match(journal, /fetch\("\/api\/device-files"/);
  assert.match(journal, /fetch\("\/api\/trash"/);
  assert.match(journal, /handleDeviceUpload/);
  assert.match(journal, /rotateDeviceShortCode/);
  assert.match(journal, /Regenerate the TV code/);
  assert.match(journal, /action: "rotate-short-code"/);
  assert.match(journal, /device-menu-section/);
  assert.match(journal, /Open Device Files/);
  assert.match(journal, /\/journal\/device-files/);
  assert.match(journal, /\/journal\/quality/);
  assert.match(journal, /\/journal\/trash/);
  assert.match(journal, /\/journal\/home/);
  assert.match(journal, /initialView = "dashboard"/);
  assert.match(journal, /JournalShellView = "dashboard" \| "home" \| "trash"/);
  assert.match(journal, /homeTiles/);
  assert.match(journal, /Recently Deleted/);
  assert.match(journal, /restoreTrashItem/);
  assert.match(journal, /deleteTrashItemForever/);
  assert.match(journal, /trash-attachment/);
  assert.match(journal, /cinematic-preview-modal/);
  assert.match(journal, /cinematic-image-frame/);
  assert.match(journal, /attachmentPreviewImageStyle/);
  assert.match(journal, /cinematic-preview-image/);
  assert.match(journal, /copyLastTradeSetup/);
  assert.match(journal, /toggleDraftTag/);
  assert.match(journal, /body: file/);
  assert.match(journal, /"x-device-file-size"/);
  assert.match(journal, /type DeviceSafety/);
  assert.match(journal, /type TradeAttachment/);
  assert.match(journal, /type DailyJournal/);
  assert.match(journal, /defaultDailyJournal/);
  assert.match(journal, /openDayDetail/);
  assert.match(journal, /hideEntryDialog/);
  assert.match(journal, /Screenshots & Attachments/);
  assert.match(journal, /Price Action Rating/);
  assert.match(journal, /Breakeven Trades/);
  assert.match(journal, /priceActionRatingOptions/);
  assert.match(journal, /rating\) => rating !== 7/);
  assert.match(journal, /sessionOptions = \["", "Asia", "London", "NY AM", "NY PM"\]/);
  assert.match(journal, /setupNameOptions = \["TI Entry", "LSI Entry", "RCC Entry", "Custom"\]/);
  assert.match(journal, /uploadJournalAttachment/);
  assert.match(journal, /\/api\/journal-attachments/);
  assert.match(journal, /handleDailyJournalPaste/);
  assert.match(journal, /makeDailyJournalAttachmentFilename/);
  assert.match(journal, /clipboardFiles/);
  assert.match(journal, /alignedNarrativeLine/);
  assert.match(journal, /tradeNarrativeTemplate/);
  assert.match(journal, /renderNarrativeContent/);
  assert.match(journal, /isNarrativeTradeHeader/);
  assert.match(journal, /Trade #\$\{index \+ 1\}/);
  assert.match(journal, /narrativeTradeFromHeader/);
  assert.match(journal, /applyNarrativeTemplate/);
  assert.match(journal, /document\.addEventListener\("paste"/);
  assert.doesNotMatch(journal, /handleTradeAttachmentUpload|attachmentExportValue/);
  assert.match(journal, /searchableTradeText/);
  assert.match(journal, /filteredReportTrades/);
  assert.match(journal, /normalizeStoredTrade/);
  assert.match(journal, /parseAttachmentText/);
  assert.match(journal, /setDeviceSafety/);
  assert.match(journal, /canUploadDeviceFile/);
  assert.match(journal, /deviceStorageLabel/);
  assert.doesNotMatch(journal, /device-files-panel|Shared Folder/);
  assert.doesNotMatch(journal, /deviceFileToAttachment/);
  assert.match(devicePage, /isAuthenticated/);
  assert.match(devicePage, /redirect\("\/"\)/);
  assert.match(devicePage, /DeviceFilesClient/);
  assert.match(trashPage, /isAuthenticated/);
  assert.match(trashPage, /redirect\("\/"\)/);
  assert.match(trashPage, /initialView="trash"/);
  assert.match(trashPage, /title: "Recently Deleted"/);
  assert.match(deviceClient, /Drop files here/);
  assert.match(deviceClient, /Storage Safety/);
  assert.match(deviceClient, /Pause Device Files/);
  assert.match(deviceClient, /Enable Device Files/);
  assert.match(deviceClient, /device-safety-panel/);
  assert.match(deviceClient, /device-storage-meter/);
  assert.match(deviceClient, /multiple type="file"/);
  assert.match(qualityPage, /isAuthenticated/);
  assert.match(qualityPage, /redirect\("\/"\)/);
  assert.match(qualityPage, /QualityPageClient/);
  assert.match(qualityClient, /Trade Quality/);
  assert.match(qualityClient, /quality-month-switcher/);
  assert.match(qualityClient, /selectedMonthTabRef/);
  assert.match(qualityClient, /This month/);
  assert.match(qualityClient, /quality-standalone-grid/);
  assert.match(qualityClient, /quality-arranged-grid/);
  assert.match(qualityClient, /Setup Quality/);
  assert.match(qualityClient, /Setup Analysis/);
  assert.match(qualityClient, /Tag Analysis/);
  assert.match(qualityClient, /PA Rating Edge/);
  assert.match(qualityClient, /BE Day Outcome/);
  assert.match(qualityClient, /Discipline Pattern/);
  assert.match(qualityClient, /\/api\/trades/);
  assert.match(qualityClient, /\/api\/daily-journals/);
  assert.doesNotMatch(journal, /quality-dashboard-panel/);
  assert.doesNotMatch(journal, /<p className="eyebrow">Setup Analysis<\/p>/);
  assert.doesNotMatch(journal, /<p className="eyebrow">Tag Analysis<\/p>/);
  assert.doesNotMatch(journal, /<h2>PA Rating Edge<\/h2>/);
  assert.doesNotMatch(journal, /<h2>BE Day Outcome<\/h2>/);
  assert.match(deviceClient, /onDrop/);
  assert.match(deviceClient, /body: file/);
  assert.match(deviceClient, /action: "set-enabled"/);
  assert.match(deviceClient, /disabled=\{!canUpload\}/);
  assert.match(deviceClient, /Copy TV Base/);
  assert.match(deviceClient, /Regenerate TV Code/);
  assert.match(deviceClient, /href=\{file\.shortUrl\}/);
  assert.match(journal, /function strategyResult/);
  assert.match(journal, /beHit === "No"/);
  assert.match(journal, /actualR: beHit === "No" \? -1/);
  assert.match(journal, /onePointFive: trade\.maxR >= 1\.5 \? 1\.5 : 0/);
  assert.doesNotMatch(journal, /radar/);
  assert.doesNotMatch(journal, /localStorage|sessionStorage/);
  assert.match(pageRoute, /isAuthenticated/);
  assert.match(pageRoute, /redirect\("\/"\)/);
  assert.match(homeRoute, /isAuthenticated/);
  assert.match(homeRoute, /redirect\("\/"\)/);
  assert.match(homeRoute, /initialView="home"/);
  assert.match(homeRoute, /title: "Private Home"/);
  assert.match(auth, /JOURNAL_USERNAME/);
  assert.match(auth, /SESSION_SECRET/);
  assert.match(auth, /JOURNAL_PASSWORD_HASH/);
  assert.match(auth, /PBKDF2/);
  assert.match(auth, /LOGIN_MAX_FAILURES/);
  assert.match(login, /Set-Cookie/);
  assert.match(login, /checkLoginThrottle/);
  assert.match(login, /recordFailedLogin/);
  assert.match(passwordRoute, /updateStoredPassword/);
  assert.match(passwordRoute, /validateCurrentPassword/);
  assert.match(logout, /makeExpiredSessionCookie/);
  assert.match(route, /requireAuthenticatedRequest/);
  assert.match(route, /actualR = beHit === "No" \? -1/);
  assert.match(pageRoute, /title: "Dashboard"/);
  assert.match(route, /parsed\.id/);
  assert.match(route, /trade already exists/);
  assert.match(route, /tradeResponse/);
  assert.match(route, /parseAttachments/);
  assert.match(route, /cleanTags/);
  assert.match(route, /JSON\.stringify\(attachments\)/);
  assert.match(dailyRoute, /requireAuthenticatedRequest/);
  assert.match(dailyRoute, /dailyJournals/);
  assert.match(dailyRoute, /allowedPriceActionRatings/);
  assert.match(dailyRoute, /rating\) => rating !== 7/);
  assert.match(dailyRoute, /breakevenTrades/);
  assert.match(dailyRoute, /journalResponse/);
  assert.match(dailyRoute, /export async function GET/);
  assert.match(dailyRoute, /export async function POST/);
  assert.match(dailyRoute, /export async function PUT/);
  assert.match(dailyRoute, /export async function DELETE/);
  assert.doesNotMatch(dailyRoute, /slice\(0, 40\)/);
  assert.match(journalAttachmentRoute, /requireAuthenticatedRequest/);
  assert.match(journalAttachmentRoute, /JOURNAL_ATTACHMENT_PREFIX = "journal-attachments\/"/);
  assert.match(journalAttachmentRoute, /\/api\/journal-attachments\?key=/);
  assert.match(journalAttachmentRoute, /private, no-store, max-age=0, must-revalidate/);
  assert.match(journalAttachmentRoute, /export async function POST/);
  assert.match(journalAttachmentRoute, /export async function GET/);
  assert.match(journalAttachmentRoute, /export async function DELETE/);
  assert.match(trashRoute, /requireAuthenticatedRequest/);
  assert.match(trashRoute, /journalTrashItems/);
  assert.match(trashRoute, /TRASH_RETENTION_MS = 30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(trashRoute, /trash-attachment/);
  assert.match(trashRoute, /deleteAttachmentObjects/);
  assert.match(trashRoute, /export async function GET/);
  assert.match(trashRoute, /export async function POST/);
  assert.match(trashRoute, /export async function PATCH/);
  assert.match(trashRoute, /export async function DELETE/);
  assert.match(layout, /Welcome/);
  assert.match(layout, /force-dynamic/);
  assert.match(layout, /revalidate = 0/);
  assert.match(worker, /withNoStoreForHtml/);
  assert.match(worker, /private, no-store, max-age=0, must-revalidate/);
  assert.doesNotMatch(layout, /Exit Strategy Journal/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /twitter/);
  assert.match(layout, /\/og\.png/);
  assert.match(packageJson, /"name": "trade-journal-site"/);
  assert.match(schema, /exitTrades/);
  assert.match(schema, /authSettings/);
  assert.match(schema, /authAttempts/);
  assert.match(schema, /dailyJournals/);
  assert.match(schema, /journalTrashItems/);
  assert.match(schema, /sqliteTable\("exit_trades"/);
  assert.match(schema, /sqliteTable\(\n  "daily_journals"/);
  assert.match(schema, /instrument: text\("instrument"\)/);
  assert.match(schema, /setupName: text\("setup_name"\)/);
  assert.match(schema, /mistakeCategory: text\("mistake_category"\)/);
  assert.match(schema, /attachments: text\("attachments"\)/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /export async function PUT/);
  assert.match(route, /export async function DELETE/);
  assert.match(schema, /deviceFolders/);
  assert.match(schema, /deviceFiles/);
  assert.match(schema, /shortCode: text\("short_code"\)/);
  assert.match(schema, /objectKey: text\("object_key"\)/);
  assert.match(deviceRoute, /requireAuthenticatedRequest/);
  assert.match(deviceRoute, /journalAttachmentIds/);
  assert.match(deviceRoute, /journalTrashItems/);
  assert.match(deviceRoute, /collectJournalAttachmentIds/);
  assert.match(deviceRoute, /hiddenAttachmentIds/);
  assert.match(deviceRoute, /parseDeviceFileUpload/);
  assert.match(deviceRoute, /parseDeviceFileUpload\(request\)/);
  assert.match(deviceRoute, /getDeviceSafetyStatus/);
  assert.match(deviceRoute, /setDeviceFilesEnabled/);
  assert.match(deviceRoute, /set-enabled/);
  assert.match(deviceRoute, /storage safety limit/);
  assert.match(deviceRoute, /rotate-short-code/);
  assert.match(deviceRoute, /rotate-token/);
  assert.match(deviceRoute, /export async function PATCH/);
  assert.match(deviceHelpers, /DEFAULT_STORAGE_LIMIT_BYTES = Math\.floor\(9\.8 \* 1024 \* 1024 \* 1024\)/);
  assert.match(deviceHelpers, /DEVICE_FILES_ENABLED_KEY = "device_files_enabled"/);
  assert.match(deviceHelpers, /getDeviceSafetyStatus/);
  assert.match(deviceHelpers, /setDeviceFilesEnabled/);
  assert.match(deviceHelpers, /assertWithinStorageLimit/);
  assert.match(deviceHelpers, /DEVICE_FILES_STORAGE_LIMIT_BYTES/);
  assert.match(deviceHelpers, /getDeviceStorageBytes/);
  assert.match(deviceHelpers, /DEVICE_FILES/);
  assert.match(deviceHelpers, /SHORT_CODE_LENGTH = 6/);
  assert.match(deviceHelpers, /makeShortCode/);
  assert.match(deviceHelpers, /rotateDeviceShortCode/);
  assert.match(deviceHelpers, /crypto\.getRandomValues/);
  assert.match(deviceHelpers, /getDeviceFilesBucket/);
  assert.match(deviceHelpers, /put\(objectKey, upload\.body/);
  assert.match(deviceHelpers, /application\/octet-stream/);
  assert.match(deviceHelpers, /objectKey/);
  assert.match(deviceHelpers, /sharedOrigin/);
  assert.doesNotMatch(deviceHelpers, /MAX_DEVICE_FILE_BYTES|Device files must be 512 KB|JSON and other text/);
  assert.match(worker, /serveDeviceFile/);
  assert.match(worker, /parseDeviceFilePath/);
  assert.match(worker, /areDeviceFilesEnabled/);
  assert.match(worker, /device_files_enabled/);
  assert.match(worker, /Device files are paused/);
  assert.match(worker, /DEVICE_FILES: R2Bucket/);
  assert.match(worker, /parseDeviceRange/);
  assert.match(worker, /Accept-Ranges/);
  assert.match(worker, /Content-Range/);
  assert.match(worker, /env\.DEVICE_FILES\.get/);
  assert.match(worker, /env\.DEVICE_FILES\.head/);
  assert.match(worker, /url\.pathname\.startsWith\("\/d\/"\)/);
  assert.match(worker, /url\.pathname\.startsWith\("\/t\/"\)/);
  assert.match(worker, /device_folders\.token/);
  assert.match(worker, /device_folders\.short_code/);
  assert.match(worker, /Content-Disposition/);
  assert.match(wrangler, /"r2_buckets"/);
  assert.match(wrangler, /"DEVICE_FILES_STORAGE_LIMIT_BYTES": "10522669875"/);
  assert.match(wrangler, /"binding": "DEVICE_FILES"/);
  assert.match(wrangler, /"bucket_name": "adalwolf-device-files"/);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(hosting, /"r2": "DEVICE_FILES"/);
  assert.match(tradeMigration, /CREATE TABLE `exit_trades`/);
  assert.match(authMigration, /CREATE TABLE `auth_settings`/);
  assert.match(authMigration, /CREATE TABLE `auth_attempts`/);
  assert.match(deviceMigration, /CREATE TABLE `device_folders`/);
  assert.match(deviceMigration, /CREATE TABLE `device_files`/);
  assert.match(deviceMigration, /device_folders_token_unique/);
  assert.match(deviceMigration, /device_files_folder_filename_unique/);
  assert.match(shortCodeMigration, /ALTER TABLE `device_folders` ADD `short_code` text/);
  assert.match(shortCodeMigration, /device_folders_short_code_unique/);
  assert.match(r2Migration, /ALTER TABLE `device_files` ADD `object_key` text/);
  assert.match(richTradeMigration, /ALTER TABLE `exit_trades` ADD `instrument` text/);
  assert.match(richTradeMigration, /ALTER TABLE `exit_trades` ADD `setup_name` text/);
  assert.match(richTradeMigration, /ALTER TABLE `exit_trades` ADD `lesson_learned` text/);
  assert.match(richTradeMigration, /ALTER TABLE `exit_trades` ADD `attachments` text DEFAULT '\[\]' NOT NULL/);
  assert.match(dailyJournalMigration, /CREATE TABLE `daily_journals`/);
  assert.match(dailyJournalMigration, /`price_action_rating` real DEFAULT 0 NOT NULL/);
  assert.match(dailyJournalMigration, /`breakeven_trades` integer DEFAULT 0 NOT NULL/);
  assert.match(dailyJournalMigration, /daily_journals_date_unique/);
  assert.match(trashMigration, /CREATE TABLE `journal_trash_items`/);
  assert.match(trashMigration, /`item_type` text NOT NULL/);
  assert.match(trashMigration, /`purge_after` integer NOT NULL/);
  assert.doesNotMatch(deviceHelpers + worker, /Math\.random/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(journal + layout, /_sites-preview|Starter Project|codex-preview/);

  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
});

test("revokes sessions on logout and blocks cross-site logout", async () => {
  const [auth, logout, schema, revocationMigration, journalMigrations] = await Promise.all([
    readFile(new URL("../lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/logout/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0008_serious_phantom_reporter.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"),
  ]);

  // Every issued session carries a random id so a single device can be revoked.
  assert.match(auth, /jti: string/);
  assert.match(auth, /jti: makeSessionId\(\)/);
  assert.match(auth, /crypto\.getRandomValues/);

  // Verification rejects unidentifiable and revoked sessions.
  assert.match(auth, /if \(!payload\.sub \|\| !payload\.jti/);
  assert.match(auth, /await isSessionRevoked\(payload\.jti\)/);
  assert.match(auth, /export async function revokeSessionToken/);
  assert.match(auth, /sessionRevocations/);
  assert.match(auth, /purgeExpiredRevocations/);
  assert.match(auth, /export function readSessionToken/);
  assert.match(auth, /export function isSameOriginRequest/);

  // An unreadable revocation list must not hand out access.
  assert.match(auth, /Fail closed: an unreadable revocation list must not grant access\./);
  assert.match(auth, /session_revocations/);

  // The logout route enforces same-origin, requires a session, and revokes it.
  assert.match(logout, /isSameOriginRequest\(request\)/);
  assert.match(logout, /status: 403/);
  assert.match(logout, /readSessionToken\(request\)/);
  assert.match(logout, /status: 401/);
  assert.match(logout, /await revokeSessionToken\(token\)/);
  assert.match(logout, /makeExpiredSessionCookie/);

  assert.match(schema, /sessionRevocations/);
  assert.match(schema, /sqliteTable\("session_revocations"/);
  assert.match(schema, /jti: text\("jti"\)\.primaryKey\(\)/);
  assert.match(schema, /expiresAt: integer\("expires_at"\)/);
  assert.match(revocationMigration, /CREATE TABLE `session_revocations`/);
  assert.match(revocationMigration, /`expires_at` integer NOT NULL/);
  assert.match(journalMigrations, /0008_serious_phantom_reporter/);
});

test("serves shared device files without an inline HTML foothold", async () => {
  const worker = await readFile(new URL("../worker/index.ts", import.meta.url), "utf8");

  // Only media that cannot execute script stays inline; everything else downloads.
  assert.match(worker, /function deviceContentDisposition/);
  assert.match(worker, /function isInlineSafeContentType/);
  assert.match(worker, /NEVER_INLINE_TYPES = \["image\/svg\+xml"\]/);
  assert.match(worker, /INLINE_SAFE_PREFIXES = \["audio\/", "image\/", "video\/"\]/);
  assert.match(worker, /INLINE_SAFE_TYPES = \["text\/plain"\]/);
  assert.match(worker, /attachment/);
  assert.doesNotMatch(worker, /`inline; filename=/);

  // A locked-down CSP neutralizes anything that still renders as a document.
  assert.match(worker, /DEVICE_FILE_CSP/);
  assert.match(worker, /default-src 'none'/);
  assert.match(worker, /sandbox/);
  assert.match(worker, /frame-ancestors 'none'/);
  assert.match(worker, /headers\.set\("Content-Security-Policy", DEVICE_FILE_CSP\)/);
  assert.match(worker, /X-Content-Type-Options/);
});
