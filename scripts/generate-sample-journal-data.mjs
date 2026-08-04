import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const root = process.cwd();
const screenshotSource =
  process.argv[2] ??
  "/var/folders/jk/z2kmmtz95f1dj6k94wy5j7vc0000gn/T/codex-clipboard-9d36dcbf-1d3b-4f23-8f10-59943b48aa03.png";
const screenshotPublicPath = "sample-data/tradingview-sample.png";
const screenshotUrl = `/${screenshotPublicPath}`;
const sampleDir = join(root, "sample-data");
const publicSampleDir = join(root, "public", "sample-data");
const outputPath = join(sampleDir, "adalwolf-r-journal-6-month-sample.json");
const readmePath = join(sampleDir, "README.md");

const instruments = ["MNQ", "MES", "NQ", "ES"];
const sessions = ["Asia", "London", "NY AM", "NY PM"];
const setups = ["TI Entry", "LSI Entry", "RCC Entry", "Custom"];
const directions = ["Long", "Short"];
const exitTypes = ["Managed partial", "Runner held", "Manual exit", "Rule exit", "BE protected"];
const htfBiases = ["Bullish", "Bearish", "Balanced", "Bullish above PDH", "Bearish below PDL"];
const ormNotes = [
  "Both assets swept London high and held above VWAP.",
  "NQ led the move while ES lagged near prior day high.",
  "London range stayed intact until NY AM expansion.",
  "Asia high was taken first; continuation needed patience.",
  "Opening range broke cleanly but retest was choppy.",
];
const notePool = [
  "Waited for displacement and entered after confirmation.",
  "Entry followed the model, but management needed more patience.",
  "Good read on liquidity, clean execution into first target.",
  "Took the retest after missing the first continuation.",
  "Market got choppy near the target and I reduced risk.",
  "Strong setup, but I exited before the larger move developed.",
  "Protected at BE after first push slowed down.",
  "Plan was valid, execution was slightly late.",
];
const tagPool = [
  "patience",
  "discipline",
  "execution",
  "liquidity sweep",
  "gap fill",
  "NY AM",
  "trend day",
  "choppy PA",
  "premium entry",
  "early exit",
  "runner",
];
const issuePool = ["late entry", "early exit", "chased", "tight stop", "no issue", "hesitated"];
const takeawayPool = [
  "Best trades came after waiting for confirmation.",
  "Avoid forcing entries inside chop.",
  "Let the runner work when HTF bias and momentum agree.",
  "If BE is hit, accept the protection and do not re-enter without a fresh setup.",
  "The cleaner entries happened when both assets aligned.",
];

function makeRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

const random = makeRandom(20260803);

function pick(items) {
  return items[Math.floor(random() * items.length)];
}

function chance(value) {
  return random() < value;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function dayName(date) {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long" });
}

function monthKey(date) {
  return dateKey(date).slice(0, 7);
}

function timestamp(date, tradeIndex = 0) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 13 + tradeIndex, 30 + tradeIndex * 7);
}

function id(prefix, date, index = 0) {
  return `${prefix}-${dateKey(date).replaceAll("-", "")}-${String(index + 1).padStart(2, "0")}`;
}

function tagsFor(...extras) {
  const tags = new Set(extras.filter(Boolean));
  while (tags.size < 4) {
    tags.add(pick(tagPool));
  }
  return Array.from(tags).slice(0, 5).join(", ");
}

function attachment(date, index) {
  const fileNumber = index + 1;
  return {
    contentType: "image/png",
    filename: `${dateKey(date)}-sample-chart-${fileNumber}.png`,
    id: `sample-attachment-${dateKey(date)}-${fileNumber}`,
    size: screenshotSize,
    uploadedAt: timestamp(date, index),
    url: `${screenshotUrl}?sample=${dateKey(date)}-${fileNumber}`,
  };
}

function tradeNarrativeLine(trade, index) {
  const result = trade.actualR > 0 ? "WIN" : trade.actualR < 0 ? "LOSS" : "BE";
  const setupRating = trade.actualR > 2 ? "9/10" : trade.actualR > 0 ? "8/10" : trade.beHit === "Yes" ? "6/10" : "5/10";
  return [
    `${trade.session} Trade: ${trade.direction} (Trade #${index + 1}) ------------ (${trade.setupName || "Custom"})`,
    "Valid setup?                   Yes",
    `Followed risk?                 ${trade.actualR < -0.5 && chance(0.35) ? "No" : "Yes"}`,
    "Followed entry rule?           Yes",
    `Followed exit rule?            ${trade.actualR > 0 && chance(0.25) ? "No" : "Yes"}`,
    `Main emotion:                  ${trade.actualR > 0 ? "Calm" : "Impatient"}`,
    `Setup Rating                   ${setupRating} (${result})`,
  ].join("\n");
}

function tradeForDate(date, index) {
  const beHit = chance(0.72) ? "Yes" : "No";
  const firstTpR = Number((1 + random() * 1.2).toFixed(2));
  const maxR = beHit === "No" ? 0 : Number((0.4 + random() * 5.4).toFixed(2));
  const actualR =
    beHit === "No"
      ? -1
      : maxR < 1
        ? Number((random() * 0.4).toFixed(2))
        : Number((Math.min(maxR, firstTpR + random() * 2.4) * (chance(0.16) ? -0.4 : 1)).toFixed(2));
  const session = pick(sessions);
  const setupName = pick(setups);
  const instrument = pick(instruments);
  const direction = pick(directions);
  const issue = actualR < 0 ? pick(issuePool.filter((item) => item !== "no issue")) : chance(0.78) ? "no issue" : pick(issuePool);
  const createdAt = timestamp(date, index);

  return {
    actualR,
    attachments: [],
    beHit,
    createdAt,
    date: dateKey(date),
    direction,
    exitType: pick(exitTypes),
    firstTpR,
    id: id("sample-trade", date, index),
    instrument,
    lessonLearned: pick(takeawayPool),
    maxR,
    mistakeCategory: issue,
    mistakeNotes: issue === "no issue" ? "" : `Sample issue to review: ${issue}.`,
    notes: pick(notePool),
    session,
    setupName,
    tags: tagsFor(session, setupName, actualR < 0 ? "review" : "good execution"),
    updatedAt: createdAt,
  };
}

function journalForDate(date, dayTrades) {
  const attachmentCount = 1 + Math.floor(random() * 5);
  const createdAt = timestamp(date, 6);
  const winners = dayTrades.filter((trade) => trade.actualR > 0).length;
  const netR = dayTrades.reduce((sum, trade) => sum + trade.actualR, 0);
  const ratingOptions = [4.5, 5, 5.5, 6, 6.5, 7.5, 8, 8.5, 9, 9.5];
  const narrative = [
    `-HTF Bias: ${pick(htfBiases)}`,
    "",
    `-ORM: ${pick(ormNotes)}`,
    "",
    "-The Narrative:",
    "",
    dayTrades.map(tradeNarrativeLine).join("\n\n"),
    "",
    "What I did well and could have done better:",
    `Sample ${dayName(date)} review: ${dayTrades.length} trade${dayTrades.length === 1 ? "" : "s"}, ${netR.toFixed(2)}R net, ${winners}/${dayTrades.length} winners. Main focus was patience around continuation and protecting capital after BE.`,
  ].join("\n");

  return {
    attachments: Array.from({ length: attachmentCount }, (_, index) => attachment(date, index)),
    breakevenTrades: dayTrades.filter((trade) => trade.beHit === "Yes" && trade.actualR <= 0.25).length,
    createdAt,
    date: dateKey(date),
    htfBias: pick(htfBiases),
    id: id("sample-journal", date),
    narrative,
    orm: pick(ormNotes),
    priceActionRating: pick(ratingOptions),
    reviewNotes: `Sample daily review for ${dateKey(date)}. Focus: ${pick(["wait for confirmation", "hold winners", "avoid chop", "protect BE", "follow the model"])}.`,
    tags: tagsFor(dayName(date), netR >= 0 ? "green day" : "red day", "sample journal"),
    updatedAt: createdAt,
  };
}

await mkdir(sampleDir, { recursive: true });
await mkdir(publicSampleDir, { recursive: true });
await copyFile(screenshotSource, join(publicSampleDir, basename(screenshotPublicPath)));
const screenshotSize = (await readFile(join(publicSampleDir, basename(screenshotPublicPath)))).byteLength;

const start = new Date(Date.UTC(2026, 1, 1));
const end = new Date(Date.UTC(2026, 6, 31));
const trades = [];
const dailyJournals = [];
const monthlyDayCounts = new Map();

for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6 || !chance(0.68)) {
    continue;
  }

  const key = monthKey(date);
  monthlyDayCounts.set(key, (monthlyDayCounts.get(key) ?? 0) + 1);
  const tradeCount = 1 + Math.floor(random() * (chance(0.24) ? 3 : 2));
  const dayTrades = Array.from({ length: tradeCount }, (_, index) => tradeForDate(new Date(date), index));
  trades.push(...dayTrades);
  dailyJournals.push(journalForDate(new Date(date), dayTrades));
}

const sample = {
  exportedAt: "2026-08-03T12:00:00.000Z",
  notes:
    "Six-month generated sample for local website testing. JSON import supports trades and dailyJournals. Screenshot URLs point to public/sample-data/tradingview-sample.png.",
  range: {
    from: "2026-02",
    label: "Feb 2026 - Jul 2026 Sample",
    mode: "custom",
    to: "2026-07",
  },
  screenshotAsset: screenshotUrl,
  monthlyDayCounts: Object.fromEntries(monthlyDayCounts),
  trades,
  dailyJournals,
};

await writeFile(outputPath, `${JSON.stringify(sample, null, 2)}\n`);
await writeFile(
  readmePath,
  [
    "# Sample Journal Data",
    "",
    "Files:",
    "- `adalwolf-r-journal-6-month-sample.json`: import this from the website Data menu.",
    "- `../public/sample-data/tradingview-sample.png`: screenshot used by the daily journal attachments.",
    "",
    "The JSON includes six months of sample trades and daily journals from February 2026 through July 2026.",
    "Daily journal entries include 1-5 references to the same sample screenshot so the attachment gallery can be tested.",
    "",
    "Import behavior:",
    "- Trades use the normal duplicate review flow.",
    "- Daily journals are added only when that date does not already exist.",
    "- Existing daily journals are skipped, not overwritten.",
    "",
  ].join("\n"),
);

console.log(`Wrote ${outputPath}`);
console.log(`Trades: ${trades.length}`);
console.log(`Daily journals: ${dailyJournals.length}`);
console.log(`Screenshot: /public/${screenshotPublicPath}`);
