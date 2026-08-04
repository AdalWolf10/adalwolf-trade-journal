"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useJournalTheme } from "../useJournalTheme";

type BeHit = "Yes" | "No";
type ResultFilter = "all" | "flat" | "loss" | "win";
type DailyRatingFilter = "all" | "high" | "low" | "mid";
type BreakevenFilter = "all" | "none" | "one-plus" | "two-plus";
type ReportMode = "all" | "custom" | "month" | "year";

type TradeAttachment = {
  contentType: string;
  filename: string;
  id: string;
  size: number;
  uploadedAt: number;
  url: string;
};

type ExitTrade = {
  actualR: number;
  attachments: TradeAttachment[];
  beHit: BeHit;
  createdAt?: number;
  date: string;
  direction: string;
  exitType: string;
  firstTpR: number;
  id: string;
  instrument: string;
  maxR: number;
  notes: string;
  session: string;
  setupName: string;
  tags: string;
  updatedAt?: number;
};

type DailyJournal = {
  attachments: TradeAttachment[];
  breakevenTrades: number;
  createdAt?: number;
  date: string;
  htfBias: string;
  id: string;
  narrative: string;
  orm: string;
  priceActionRating: number;
  reviewNotes: string;
  tags: string;
  updatedAt?: number;
};

type ActiveReportRange = {
  from?: string;
  label: string;
  mode: ReportMode;
  to?: string;
  year?: string;
};

type JournalFilters = {
  beHit: "all" | BeHit;
  breakeven: BreakevenFilter;
  paRating: DailyRatingFilter;
  result: ResultFilter;
  session: string;
  setup: string;
  tag: string;
};

type TradeQualityRow = {
  average: number;
  avgMax: number;
  beRate: number;
  captureRate: number;
  journalDays?: number;
  label: string;
  profitFactor: number;
  score: number;
  total: number;
  trades: number;
  winRate: number;
  wins: number;
};

type DisciplineRow = {
  label: string;
  no: number;
  rate: number;
  total: number;
  unknown: number;
  yes: number;
};

type EmotionRow = {
  average: number;
  count: number;
  label: string;
  total: number;
  trades: number;
  winRate: number;
};

type NoteKeywordRow = {
  count: number;
  keyword: string;
};

type TradeQualityAnalysis = {
  beDays: TradeQualityRow[];
  discipline: DisciplineRow[];
  emotions: EmotionRow[];
  noteKeywords: NoteKeywordRow[];
  paRatings: TradeQualityRow[];
  sessions: TradeQualityRow[];
  setupRatings: TradeQualityRow[];
  setupSessions: TradeQualityRow[];
  setups: TradeQualityRow[];
  tags: TradeQualityRow[];
};

const appTimeZone = "America/Los_Angeles";
const appDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: appTimeZone,
  year: "numeric",
});
const monthTitleFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});
const monthTabFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});
const reportOptions: Array<{ label: string; mode: ReportMode }> = [
  { label: "All", mode: "all" },
  { label: "Selected Month", mode: "month" },
  { label: "Current Year", mode: "year" },
  { label: "Custom", mode: "custom" },
];
const defaultJournalFilters: JournalFilters = {
  beHit: "all",
  breakeven: "all",
  paRating: "all",
  result: "all",
  session: "",
  setup: "",
  tag: "",
};
const resultFilterOptions: Array<{ label: string; value: ResultFilter }> = [
  { label: "All results", value: "all" },
  { label: "Wins", value: "win" },
  { label: "Losses", value: "loss" },
  { label: "Flat", value: "flat" },
];
const paRatingFilterOptions: Array<{ label: string; value: DailyRatingFilter }> = [
  { label: "All PA ratings", value: "all" },
  { label: "8-10", value: "high" },
  { label: "5-6.5", value: "mid" },
  { label: "0-4.5", value: "low" },
];
const breakevenFilterOptions: Array<{ label: string; value: BreakevenFilter }> = [
  { label: "All BE days", value: "all" },
  { label: "0 BE trades", value: "none" },
  { label: "1+ BE trades", value: "one-plus" },
  { label: "2+ BE trades", value: "two-plus" },
];
const disciplinePrompts = [
  { label: "Valid setup", prompt: "Valid setup" },
  { label: "Followed risk", prompt: "Followed risk" },
  { label: "Entry rule", prompt: "Followed entry rule" },
  { label: "Exit rule", prompt: "Followed exit rule" },
];
const noteKeywordStopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "both",
  "could",
  "didn",
  "didnt",
  "entry",
  "from",
  "good",
  "have",
  "into",
  "just",
  "like",
  "long",
  "made",
  "more",
  "much",
  "need",
  "only",
  "price",
  "really",
  "short",
  "should",
  "setup",
  "that",
  "then",
  "there",
  "this",
  "trade",
  "trades",
  "very",
  "were",
  "what",
  "when",
  "with",
]);

function currentAppDateParts() {
  const parts = appDateFormatter.formatToParts(new Date());
  return {
    day: parts.find((part) => part.type === "day")?.value ?? "01",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    year: parts.find((part) => part.type === "year")?.value ?? "2026",
  };
}

function currentMonthKey() {
  const parts = currentAppDateParts();
  return `${parts.year}-${parts.month}`;
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthDate(month: string) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year || 2000, (index || 1) - 1, 1));
}

function shiftMonth(key: string, offset: number) {
  const [year, index] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year || Number(currentMonthKey().slice(0, 4)), (index || 1) - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  return monthTitleFormatter.format(monthDate(month));
}

function monthTabLabel(month: string) {
  return monthTabFormatter.format(monthDate(month));
}

function normalizeMonthRange(start: string, end: string) {
  return start <= end ? { from: start, to: end } : { from: end, to: start };
}

function dateMatchesReportRange(date: string, range: ActiveReportRange, fallbackMonth: string) {
  const month = monthKey(date);
  if (range.mode === "all") {
    return true;
  }
  if (range.mode === "year") {
    return date.startsWith(`${range.year ?? fallbackMonth.slice(0, 4)}-`);
  }
  return month >= (range.from ?? fallbackMonth) && month <= (range.to ?? fallbackMonth);
}

function dayName(date: string) {
  return weekdayFormatter.format(new Date(`${date}T00:00:00.000Z`));
}

function weekdayIndex(date: string) {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function rValue(value: number) {
  return `${value.toFixed(2)}R`;
}

function toneClass(value: number) {
  if (value > 0) {
    return "positive";
  }
  if (value < 0) {
    return "negative";
  }
  return "neutral";
}

function tagList(value: Pick<DailyJournal | ExitTrade, "tags">) {
  return value.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeAttachment(value: unknown): TradeAttachment | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const item = value as Partial<TradeAttachment>;
  const url = textValue(item.url);
  if (!url) {
    return null;
  }
  return {
    contentType: textValue(item.contentType),
    filename: textValue(item.filename) || "Attachment",
    id: textValue(item.id) || crypto.randomUUID(),
    size: Math.max(0, Math.floor(numberValue(item.size))),
    uploadedAt: Math.max(0, Math.floor(numberValue(item.uploadedAt) || Date.now())),
    url,
  };
}

function normalizeAttachments(value: unknown): TradeAttachment[] {
  const raw = Array.isArray(value) ? value : [];
  return raw.map(normalizeAttachment).filter((attachment): attachment is TradeAttachment => Boolean(attachment));
}

function normalizeTrade(value: unknown): ExitTrade | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const trade = value as Partial<ExitTrade>;
  const date = textValue(trade.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }
  return {
    actualR: numberValue(trade.actualR),
    attachments: normalizeAttachments(trade.attachments),
    beHit: trade.beHit === "No" ? "No" : "Yes",
    createdAt: numberValue(trade.createdAt) || undefined,
    date,
    direction: textValue(trade.direction),
    exitType: textValue(trade.exitType),
    firstTpR: numberValue(trade.firstTpR),
    id: textValue(trade.id) || crypto.randomUUID(),
    instrument: textValue(trade.instrument),
    maxR: numberValue(trade.maxR),
    notes: textValue(trade.notes),
    session: textValue(trade.session),
    setupName: textValue(trade.setupName),
    tags: textValue(trade.tags),
    updatedAt: numberValue(trade.updatedAt) || undefined,
  };
}

function normalizeDailyJournal(value: unknown): DailyJournal | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const journal = value as Partial<DailyJournal>;
  const date = textValue(journal.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }
  return {
    attachments: normalizeAttachments(journal.attachments),
    breakevenTrades: Math.max(0, Math.floor(numberValue(journal.breakevenTrades))),
    createdAt: numberValue(journal.createdAt) || undefined,
    date,
    htfBias: textValue(journal.htfBias),
    id: textValue(journal.id) || crypto.randomUUID(),
    narrative: textValue(journal.narrative),
    orm: textValue(journal.orm),
    priceActionRating: numberValue(journal.priceActionRating),
    reviewNotes: textValue(journal.reviewNotes),
    tags: textValue(journal.tags),
    updatedAt: numberValue(journal.updatedAt) || undefined,
  };
}

function compareTradeEntryOrder(left: ExitTrade, right: ExitTrade) {
  return (left.createdAt ?? 0) - (right.createdAt ?? 0) || left.id.localeCompare(right.id);
}

function tradeStats(trades: ExitTrade[]) {
  const winners = trades.filter((trade) => trade.actualR > 0);
  const losers = trades.filter((trade) => trade.actualR < 0);
  const grossWin = winners.reduce((sum, trade) => sum + trade.actualR, 0);
  const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + trade.actualR, 0));
  const totalMax = trades.reduce((sum, trade) => sum + trade.maxR, 0);
  const netR = trades.reduce((sum, trade) => sum + trade.actualR, 0);
  const beHits = trades.filter((trade) => trade.beHit === "Yes").length;

  return {
    avgR: trades.length ? netR / trades.length : 0,
    beRate: trades.length ? (beHits / trades.length) * 100 : 0,
    captureRate: totalMax ? (netR / totalMax) * 100 : 0,
    grossLoss,
    grossWin,
    losses: losers.length,
    netR,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0,
    totalMax,
    trades: trades.length,
    winRate: trades.length ? (winners.length / trades.length) * 100 : 0,
    wins: winners.length,
  };
}

function qualityScore(summary: ReturnType<typeof tradeStats>) {
  const expectancyScore = clamp((summary.avgR + 0.6) * 58, 0, 100);
  const captureScore = clamp(summary.captureRate, 0, 100);
  const profitScore = clamp(summary.profitFactor === Infinity ? 100 : summary.profitFactor * 36, 0, 100);
  const sampleScore = clamp(summary.trades * 9, 18, 100);
  return clamp(
    expectancyScore * 0.36 +
      summary.winRate * 0.22 +
      captureScore * 0.18 +
      profitScore * 0.16 +
      sampleScore * 0.08,
    0,
    100,
  );
}

function tradeQualityRow(label: string, trades: ExitTrade[], journalDays?: number): TradeQualityRow {
  const summary = tradeStats(trades);
  return {
    average: summary.avgR,
    avgMax: summary.trades ? summary.totalMax / summary.trades : 0,
    beRate: summary.beRate,
    captureRate: summary.captureRate,
    journalDays,
    label,
    profitFactor: summary.profitFactor,
    score: qualityScore(summary),
    total: summary.netR,
    trades: summary.trades,
    winRate: summary.winRate,
    wins: summary.wins,
  };
}

function qualityRowsFromGroups(groups: Map<string, ExitTrade[]>) {
  return [...groups.entries()]
    .map(([label, rows]) => tradeQualityRow(label, rows))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.total - left.total ||
        right.trades - left.trades ||
        left.label.localeCompare(right.label),
    );
}

function tradeQualityRows(
  trades: ExitTrade[],
  groupValue: (trade: ExitTrade) => string,
  fallback: string,
) {
  const groups = new Map<string, ExitTrade[]>();
  trades.forEach((trade) => {
    const key = groupValue(trade).trim() || fallback;
    groups.set(key, [...(groups.get(key) ?? []), trade]);
  });
  return qualityRowsFromGroups(groups);
}

function sortedTradesByDateMap(trades: ExitTrade[]) {
  const map = new Map<string, ExitTrade[]>();
  trades.forEach((trade) => {
    map.set(trade.date, [...(map.get(trade.date) ?? []), trade]);
  });
  map.forEach((rows, date) => {
    map.set(date, [...rows].sort(compareTradeEntryOrder));
  });
  return map;
}

function paRatingBucket(rating: number) {
  if (rating >= 8) {
    return "8-10";
  }
  if (rating >= 5) {
    return "5-6.5";
  }
  return "0-4.5";
}

function paRatingQualityRows(trades: ExitTrade[], journals: DailyJournal[]) {
  const tradesByDate = sortedTradesByDateMap(trades);
  const groups = new Map<string, { days: number; trades: ExitTrade[] }>(
    ["8-10", "5-6.5", "0-4.5"].map((label) => [label, { days: 0, trades: [] }]),
  );
  journals.forEach((journal) => {
    const key = paRatingBucket(journal.priceActionRating);
    const current = groups.get(key) ?? { days: 0, trades: [] };
    current.days += 1;
    current.trades.push(...(tradesByDate.get(journal.date) ?? []));
    groups.set(key, current);
  });
  return [...groups.entries()].map(([label, value]) => tradeQualityRow(label, value.trades, value.days));
}

function beDayQualityRows(trades: ExitTrade[], journals: DailyJournal[]) {
  const tradesByDate = sortedTradesByDateMap(trades);
  const groups = new Map<string, { days: number; trades: ExitTrade[] }>(
    ["0 BE", "1 BE", "2+ BE"].map((label) => [label, { days: 0, trades: [] }]),
  );
  journals.forEach((journal) => {
    const key = journal.breakevenTrades >= 2 ? "2+ BE" : journal.breakevenTrades === 1 ? "1 BE" : "0 BE";
    const current = groups.get(key) ?? { days: 0, trades: [] };
    current.days += 1;
    current.trades.push(...(tradesByDate.get(journal.date) ?? []));
    groups.set(key, current);
  });
  return [...groups.entries()].map(([label, value]) => tradeQualityRow(label, value.trades, value.days));
}

function narrativeBlocks(narrative: string) {
  return narrative.trim()
    ? narrative
        .trim()
        .split(/\n\s*\n/)
        .map((block) => block.split("\n").map((line) => line.trimEnd()).filter(Boolean))
        .filter((block) => block.length)
    : [];
}

function narrativeDetail(line: string) {
  const labels = [
    "Valid setup?",
    "Followed risk?",
    "Followed entry rule?",
    "Followed exit rule?",
    "Main emotion:",
    "Setup Rating",
  ];
  const label = labels.find((item) => line.trimStart().startsWith(item));
  if (!label) {
    return null;
  }
  return {
    label: label.replace(/:$/, ""),
    value: line.trimStart().slice(label.length).trim() || "--",
  };
}

function narrativeTradeFromHeader(header: string, trades: ExitTrade[], fallbackIndex: number) {
  const tradeIndex = Number(header.match(/\(Trade #(\d+)\)/)?.[1]);
  return trades[Number.isFinite(tradeIndex) && tradeIndex > 0 ? tradeIndex - 1 : fallbackIndex] ?? null;
}

function normalizeNarrativeAnswer(value: string) {
  const normalized = value.trim().toLowerCase();
  if (/^(yes|y|true|followed|valid)\b/.test(normalized)) {
    return "yes";
  }
  if (/^(no|n|false|missed|broke|invalid)\b/.test(normalized)) {
    return "no";
  }
  return "unknown";
}

function parseSetupRating(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/);
  if (!match) {
    return null;
  }
  const rating = Number(match[1]);
  return Number.isFinite(rating) ? clamp(rating, 0, 10) : null;
}

function setupRatingBucket(rating: number) {
  if (rating >= 8) {
    return "8-10 premium";
  }
  if (rating >= 5) {
    return "5-6.5 workable";
  }
  return "0-4.5 low quality";
}

function narrativeQualityAnalysis(trades: ExitTrade[], journals: DailyJournal[]) {
  const tradesByDate = sortedTradesByDateMap(trades);
  const discipline = new Map(
    disciplinePrompts.map((item) => [
      item.label,
      {
        label: item.label,
        no: 0,
        total: 0,
        unknown: 0,
        yes: 0,
      },
    ]),
  );
  const emotions = new Map<string, { count: number; trades: ExitTrade[] }>();
  const setupRatings = new Map<string, ExitTrade[]>();

  journals.forEach((journal) => {
    const dayTrades = tradesByDate.get(journal.date) ?? [];
    narrativeBlocks(journal.narrative).forEach((block, blockIndex) => {
      const [header, ...details] = block;
      const trade = narrativeTradeFromHeader(header ?? "", dayTrades, blockIndex);

      details.forEach((line) => {
        const parsed = narrativeDetail(line);
        if (!parsed) {
          return;
        }

        const prompt = disciplinePrompts.find((item) => item.label === parsed.label);
        if (prompt) {
          const current = discipline.get(prompt.label);
          const answer = normalizeNarrativeAnswer(parsed.value);
          if (current) {
            current.total += 1;
            if (answer === "yes") {
              current.yes += 1;
            } else if (answer === "no") {
              current.no += 1;
            } else {
              current.unknown += 1;
            }
          }
        }

        if (parsed.label === "Main emotion") {
          const emotion = parsed.value.trim() || "Unspecified";
          const current = emotions.get(emotion) ?? { count: 0, trades: [] };
          current.count += 1;
          if (trade) {
            current.trades.push(trade);
          }
          emotions.set(emotion, current);
        }

        if (parsed.label === "Setup Rating") {
          const rating = parseSetupRating(parsed.value);
          if (rating !== null) {
            const bucket = setupRatingBucket(rating);
            setupRatings.set(bucket, [...(setupRatings.get(bucket) ?? []), ...(trade ? [trade] : [])]);
          }
        }
      });
    });
  });

  return {
    discipline: [...discipline.values()].map((row) => ({
      ...row,
      rate: row.yes + row.no ? (row.yes / (row.yes + row.no)) * 100 : 0,
    })),
    emotions: [...emotions.entries()]
      .map(([label, value]) => {
        const summary = tradeStats(value.trades);
        return {
          average: summary.avgR,
          count: value.count,
          label,
          total: summary.netR,
          trades: summary.trades,
          winRate: summary.winRate,
        };
      })
      .sort((left, right) => right.count - left.count || right.total - left.total || left.label.localeCompare(right.label)),
    setupRatings: qualityRowsFromGroups(setupRatings),
  };
}

function tagQualityRows(trades: ExitTrade[], journals: DailyJournal[]) {
  const groups = new Map<string, { journalDays: number; trades: ExitTrade[] }>();
  trades.forEach((trade) => {
    tagList(trade).forEach((tag) => {
      const current = groups.get(tag) ?? { journalDays: 0, trades: [] };
      current.trades.push(trade);
      groups.set(tag, current);
    });
  });
  journals.forEach((journal) => {
    tagList(journal).forEach((tag) => {
      const current = groups.get(tag) ?? { journalDays: 0, trades: [] };
      current.journalDays += 1;
      groups.set(tag, current);
    });
  });

  return [...groups.entries()]
    .map(([label, value]) => tradeQualityRow(label, value.trades, value.journalDays))
    .sort(
      (left, right) =>
        right.total - left.total ||
        right.score - left.score ||
        (right.trades + (right.journalDays ?? 0)) - (left.trades + (left.journalDays ?? 0)) ||
        left.label.localeCompare(right.label),
    );
}

function noteKeywordRows(trades: ExitTrade[], journals: DailyJournal[]) {
  const counts = new Map<string, number>();
  const text = [
    ...trades.flatMap((trade) => [trade.notes, trade.tags, trade.exitType]),
    ...journals.flatMap((journal) => [
      journal.htfBias,
      journal.orm,
      journal.narrative,
      journal.reviewNotes,
      journal.tags,
    ]),
  ].join(" ");

  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^-+|-+$/g, ""))
    .filter((word) => word.length >= 4 && !noteKeywordStopWords.has(word))
    .forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));

  return [...counts.entries()]
    .map(([keyword, count]) => ({ count, keyword }))
    .sort((left, right) => right.count - left.count || left.keyword.localeCompare(right.keyword))
    .slice(0, 16);
}

function tradeQualityAnalysis(trades: ExitTrade[], journals: DailyJournal[]): TradeQualityAnalysis {
  const narrative = narrativeQualityAnalysis(trades, journals);
  return {
    beDays: beDayQualityRows(trades, journals),
    discipline: narrative.discipline,
    emotions: narrative.emotions,
    noteKeywords: noteKeywordRows(trades, journals),
    paRatings: paRatingQualityRows(trades, journals),
    sessions: tradeQualityRows(trades, (trade) => trade.session, "No session"),
    setupRatings: narrative.setupRatings,
    setupSessions: tradeQualityRows(
      trades,
      (trade) => `${trade.setupName || "No setup"} - ${trade.session || "No session"}`,
      "No setup - No session",
    ),
    setups: tradeQualityRows(trades, (trade) => trade.setupName, "No setup"),
    tags: tagQualityRows(trades, journals),
  };
}

function resultMatchesFilter(actualR: number, filter: ResultFilter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "win") {
    return actualR > 0;
  }
  if (filter === "loss") {
    return actualR < 0;
  }
  return actualR === 0;
}

function paRatingMatchesFilter(rating: number, filter: DailyRatingFilter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "high") {
    return rating >= 8;
  }
  if (filter === "mid") {
    return rating >= 5 && rating < 8;
  }
  return rating >= 0 && rating < 5;
}

function breakevenMatchesFilter(count: number, filter: BreakevenFilter) {
  if (filter === "all") {
    return true;
  }
  if (filter === "none") {
    return count === 0;
  }
  if (filter === "one-plus") {
    return count >= 1;
  }
  return count >= 2;
}

function tradeMatchesFilters(
  trade: ExitTrade,
  filters: JournalFilters,
  dailyJournalByDate: Map<string, DailyJournal>,
) {
  if (filters.session && trade.session !== filters.session) {
    return false;
  }
  if (filters.setup && trade.setupName !== filters.setup) {
    return false;
  }
  if (filters.beHit !== "all" && trade.beHit !== filters.beHit) {
    return false;
  }
  if (!resultMatchesFilter(trade.actualR, filters.result)) {
    return false;
  }

  const journal = dailyJournalByDate.get(trade.date);
  if (filters.tag) {
    const normalizedTag = filters.tag.toLowerCase();
    const tradeHasTag = tagList(trade).some((tag) => tag.toLowerCase() === normalizedTag);
    const journalHasTag = journal ? tagList(journal).some((tag) => tag.toLowerCase() === normalizedTag) : false;
    if (!tradeHasTag && !journalHasTag) {
      return false;
    }
  }

  if (filters.paRating !== "all" || filters.breakeven !== "all") {
    if (!journal) {
      return false;
    }
    if (!paRatingMatchesFilter(journal.priceActionRating, filters.paRating)) {
      return false;
    }
    if (!breakevenMatchesFilter(journal.breakevenTrades, filters.breakeven)) {
      return false;
    }
  }

  return true;
}

function dailyJournalMatchesFilters(journal: DailyJournal, filters: JournalFilters) {
  if (!paRatingMatchesFilter(journal.priceActionRating, filters.paRating)) {
    return false;
  }
  if (!breakevenMatchesFilter(journal.breakevenTrades, filters.breakeven)) {
    return false;
  }
  if (filters.tag && !tagList(journal).some((tag) => tag.toLowerCase() === filters.tag.toLowerCase())) {
    return false;
  }
  return true;
}

function journalFiltersActive(filters: JournalFilters) {
  return (
    filters.beHit !== "all" ||
    filters.breakeven !== "all" ||
    filters.paRating !== "all" ||
    filters.result !== "all" ||
    Boolean(filters.session || filters.setup || filters.tag)
  );
}

function renderQualityRows(rows: TradeQualityRow[], emptyText: string, limit = 10) {
  return (
    <div className="quality-row-list">
      {rows.slice(0, limit).map((row, index) => (
        <div className="quality-row" key={row.label}>
          <span className="rank-badge">#{index + 1}</span>
          <div>
            <strong>{row.label}</strong>
            <small>
              {row.trades} trades
              {typeof row.journalDays === "number" ? ` · ${row.journalDays} days` : ""} · avg{" "}
              {rValue(row.average)} · {percent(row.winRate)} win
            </small>
            <div className="quality-track">
              <span style={{ width: `${row.score}%` }} />
            </div>
          </div>
          <div className="quality-row-metrics">
            <strong className={toneClass(row.total)}>{rValue(row.total)}</strong>
            <small>{row.score.toFixed(1)} quality</small>
          </div>
        </div>
      ))}
      {!rows.length ? <p className="empty-panel-note">{emptyText}</p> : null}
    </div>
  );
}

function renderDisciplineRows(rows: DisciplineRow[]) {
  return (
    <div className="quality-row-list">
      {rows.map((row) => (
        <div className="quality-row compact" key={row.label}>
          <div>
            <strong>{row.label}</strong>
            <small>{row.total ? `${row.yes} yes · ${row.no} no · ${row.unknown} unknown` : "No answers found"}</small>
            <div className="quality-track">
              <span style={{ width: `${row.total ? row.rate : 0}%` }} />
            </div>
          </div>
          <div className="quality-row-metrics">
            <strong>{row.total ? percent(row.rate) : "--"}</strong>
            <small>followed</small>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function QualityPageClient() {
  const [dailyJournals, setDailyJournals] = useState<DailyJournal[]>([]);
  const [filters, setFilters] = useState<JournalFilters>(() => defaultJournalFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [reportMode, setReportMode] = useState<ReportMode>("all");
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [customStartMonth, setCustomStartMonth] = useState(currentMonthKey());
  const [customEndMonth, setCustomEndMonth] = useState(currentMonthKey());
  const [trades, setTrades] = useState<ExitTrade[]>([]);
  const { theme, toggleTheme } = useJournalTheme();
  const selectedMonthTabRef = useRef<HTMLButtonElement | null>(null);

  const handleUnauthorized = useCallback((response: Response) => {
    if (response.status === 401) {
      window.location.href = "/";
      return true;
    }
    return false;
  }, []);

  const loadQualityData = useCallback(async () => {
    setIsLoading(true);
    setNotice("");
    try {
      const [tradeResponse, journalResponse] = await Promise.all([
        fetch("/api/trades", { cache: "no-store" }),
        fetch("/api/daily-journals", { cache: "no-store" }),
      ]);
      if (handleUnauthorized(tradeResponse) || handleUnauthorized(journalResponse)) {
        return;
      }

      const tradeData = (await tradeResponse.json()) as { error?: string; trades?: unknown[] };
      const journalData = (await journalResponse.json()) as { error?: string; journals?: unknown[] };
      if (!tradeResponse.ok) {
        throw new Error(tradeData.error ?? "Unable to load trades");
      }
      if (!journalResponse.ok) {
        throw new Error(journalData.error ?? "Unable to load daily journals");
      }

      const nextTrades = (tradeData.trades ?? [])
        .map(normalizeTrade)
        .filter((trade): trade is ExitTrade => Boolean(trade));
      const nextJournals = (journalData.journals ?? [])
        .map(normalizeDailyJournal)
        .filter((journal): journal is DailyJournal => Boolean(journal));
      const monthKeys = [...nextTrades.map((trade) => monthKey(trade.date)), ...nextJournals.map((journal) => monthKey(journal.date))]
        .filter(Boolean)
        .sort();
      const latestMonth = monthKeys.at(-1) ?? currentMonthKey();

      setTrades(nextTrades);
      setDailyJournals(nextJournals);
      setSelectedMonth((current) => current || latestMonth);
      setCustomStartMonth((current) => current || latestMonth);
      setCustomEndMonth((current) => current || latestMonth);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load quality dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadQualityData();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadQualityData]);

  const sortedTrades = useMemo(
    () =>
      [...trades].sort((left, right) => {
        const dateSort = right.date.localeCompare(left.date);
        return dateSort || (right.createdAt ?? 0) - (left.createdAt ?? 0);
      }),
    [trades],
  );

  const monthTabs = useMemo(() => {
    const tradeCounts = new Map<string, number>();
    const keys = new Set<string>();

    for (let offset = -6; offset <= 6; offset += 1) {
      keys.add(shiftMonth(selectedMonth, offset));
    }

    trades.forEach((trade) => {
      const key = monthKey(trade.date);
      keys.add(key);
      tradeCounts.set(key, (tradeCounts.get(key) ?? 0) + 1);
    });
    dailyJournals.forEach((journal) => keys.add(monthKey(journal.date)));
    keys.add(currentMonthKey());

    const sortedKeys = [...keys].sort();
    const selectedIndex = sortedKeys.indexOf(selectedMonth);
    const orderedKeys =
      selectedIndex >= 0
        ? [...sortedKeys.slice(selectedIndex), ...sortedKeys.slice(0, selectedIndex)]
        : sortedKeys;

    return orderedKeys.map((key) => ({
      count: tradeCounts.get(key) ?? 0,
      key,
      label: monthTabLabel(key),
    }));
  }, [dailyJournals, selectedMonth, trades]);

  useEffect(() => {
    selectedMonthTabRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }, [monthTabs, selectedMonth]);

  const currentReportYear = currentMonthKey().slice(0, 4);
  const reportRange = useMemo<ActiveReportRange>(() => {
    if (reportMode === "all") {
      return { label: "All trades", mode: reportMode };
    }
    if (reportMode === "year") {
      return { label: `Current Year (${currentReportYear})`, mode: reportMode, year: currentReportYear };
    }
    const range = reportMode === "custom" ? normalizeMonthRange(customStartMonth, customEndMonth) : { from: selectedMonth, to: selectedMonth };
    return {
      ...range,
      label:
        range.from === range.to
          ? monthLabel(range.from)
          : `${monthTabLabel(range.from)} - ${monthTabLabel(range.to)}`,
      mode: reportMode,
    };
  }, [currentReportYear, customEndMonth, customStartMonth, reportMode, selectedMonth]);

  const reportTrades = useMemo(
    () => sortedTrades.filter((trade) => dateMatchesReportRange(trade.date, reportRange, selectedMonth)),
    [reportRange, selectedMonth, sortedTrades],
  );
  const reportDailyJournals = useMemo(
    () =>
      dailyJournals
        .filter((journal) => dateMatchesReportRange(journal.date, reportRange, selectedMonth))
        .sort((left, right) => left.date.localeCompare(right.date)),
    [dailyJournals, reportRange, selectedMonth],
  );
  const dailyJournalByDate = useMemo(
    () => new Map(dailyJournals.map((journal) => [journal.date, journal])),
    [dailyJournals],
  );
  const filterOptions = useMemo(() => {
    const sessions = new Set<string>();
    const setups = new Set<string>();
    const tags = new Set<string>();
    reportTrades.forEach((trade) => {
      if (trade.session) {
        sessions.add(trade.session);
      }
      if (trade.setupName) {
        setups.add(trade.setupName);
      }
      tagList(trade).forEach((tag) => tags.add(tag));
    });
    reportDailyJournals.forEach((journal) => tagList(journal).forEach((tag) => tags.add(tag)));
    return {
      sessions: [...sessions].sort((left, right) => left.localeCompare(right)),
      setups: [...setups].sort((left, right) => left.localeCompare(right)),
      tags: [...tags].sort((left, right) => left.localeCompare(right)),
    };
  }, [reportDailyJournals, reportTrades]);
  const filteredReportTrades = useMemo(
    () => reportTrades.filter((trade) => tradeMatchesFilters(trade, filters, dailyJournalByDate)),
    [dailyJournalByDate, filters, reportTrades],
  );
  const filteredTradeDates = useMemo(
    () => new Set(filteredReportTrades.map((trade) => trade.date)),
    [filteredReportTrades],
  );
  const filteredReportDailyJournals = useMemo(
    () =>
      reportDailyJournals.filter((journal) => {
        if (!dailyJournalMatchesFilters(journal, filters)) {
          return false;
        }
        return filteredTradeDates.has(journal.date) || (!filters.session && !filters.setup && filters.result === "all" && filters.beHit === "all");
      }),
    [filteredTradeDates, filters, reportDailyJournals],
  );
  const quality = useMemo(
    () => tradeQualityAnalysis(filteredReportTrades, filteredReportDailyJournals),
    [filteredReportDailyJournals, filteredReportTrades],
  );
  const summary = useMemo(() => tradeStats(filteredReportTrades), [filteredReportTrades]);
  const currentViewQuality = tradeQualityRow("Current View", filteredReportTrades).score;
  const bestSetup = quality.setups[0];
  const weakestSetup = [...quality.setups].filter((row) => row.trades).sort((left, right) => left.score - right.score)[0];
  const weakestDiscipline = [...quality.discipline].filter((row) => row.total).sort((left, right) => left.rate - right.rate)[0];
  const activeFilterCount = [
    filters.session,
    filters.setup,
    filters.tag,
    filters.result !== "all" ? filters.result : "",
    filters.beHit !== "all" ? filters.beHit : "",
    filters.paRating !== "all" ? filters.paRating : "",
    filters.breakeven !== "all" ? filters.breakeven : "",
  ].filter(Boolean).length;

  function updateFilter<Key extends keyof JournalFilters>(key: Key, value: JournalFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters(defaultJournalFilters);
  }

  function goToMonth(key: string) {
    setSelectedMonth(key);
    setReportMode("month");
  }

  function moveMonth(offset: number) {
    goToMonth(shiftMonth(selectedMonth, offset));
  }

  return (
    <main className="device-page-shell quality-page-shell" data-theme={theme}>
      <header className="device-page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Trade Quality</h1>
        </div>
        <div className="device-page-header-actions">
          <button className="utility-button" type="button" aria-label="Toggle color theme" onClick={toggleTheme}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <a className="utility-button" href="/journal">
            Journal
          </a>
          <button className="utility-button" type="button" onClick={() => void loadQualityData()}>
            Refresh
          </button>
        </div>
      </header>

      <section className="month-switcher quality-month-switcher" aria-label="Month navigation">
        <button className="nav-icon" type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}>
          &lt;
        </button>
        <nav className="month-tabs" aria-label="Month tabs">
          {monthTabs.map((month) => (
            <button
              className={selectedMonth === month.key ? "active" : ""}
              key={month.key}
              ref={selectedMonth === month.key ? selectedMonthTabRef : null}
              type="button"
              onClick={() => goToMonth(month.key)}
            >
              <span>{month.label}</span>
              <small>{month.count} trades</small>
            </button>
          ))}
        </nav>
        <button className="nav-icon" type="button" aria-label="Next month" onClick={() => moveMonth(1)}>
          &gt;
        </button>
        <button className="utility-button" type="button" onClick={() => goToMonth(currentMonthKey())}>
          This month
        </button>
      </section>

      <section className="quality-page-toolbar" aria-label="Trade quality range">
        <div>
          <p className="eyebrow">Report Range</p>
          <h2>{reportRange.label}</h2>
        </div>
        <div className="report-controls" role="group" aria-label="Choose quality range">
          {reportOptions.map((option) => (
            <button
              className={reportMode === option.mode ? "active" : ""}
              key={option.mode}
              type="button"
              onClick={() => setReportMode(option.mode)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {reportMode === "custom" ? (
          <div className="custom-month-range">
            <label>
              From
              <input type="month" value={customStartMonth} onChange={(event) => setCustomStartMonth(event.target.value)} />
            </label>
            <label>
              To
              <input type="month" value={customEndMonth} onChange={(event) => setCustomEndMonth(event.target.value)} />
            </label>
          </div>
        ) : null}
      </section>

      <section className="journal-filter-panel quality-filter-panel" aria-label="Trade quality filters">
        <div className="filter-panel-heading">
          <div>
            <p className="eyebrow">Filters</p>
            <h2>{activeFilterCount ? `${activeFilterCount} active` : "All trades"}</h2>
          </div>
          <div className="filter-panel-summary">
            <span>
              Showing <strong>{filteredReportTrades.length}</strong> of {reportTrades.length}
            </span>
            <button className="table-action" disabled={!journalFiltersActive(filters)} type="button" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>
        <div className="filter-grid">
          <label>
            Session
            <select value={filters.session} onChange={(event) => updateFilter("session", event.target.value)}>
              <option value="">All sessions</option>
              {filterOptions.sessions.map((session) => (
                <option key={session} value={session}>
                  {session}
                </option>
              ))}
            </select>
          </label>
          <label>
            Setup
            <select value={filters.setup} onChange={(event) => updateFilter("setup", event.target.value)}>
              <option value="">All setups</option>
              {filterOptions.setups.map((setup) => (
                <option key={setup} value={setup}>
                  {setup}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tag
            <select value={filters.tag} onChange={(event) => updateFilter("tag", event.target.value)}>
              <option value="">All tags</option>
              {filterOptions.tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <label>
            Result
            <select value={filters.result} onChange={(event) => updateFilter("result", event.target.value as ResultFilter)}>
              {resultFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            BE Hit
            <select value={filters.beHit} onChange={(event) => updateFilter("beHit", event.target.value as JournalFilters["beHit"])}>
              <option value="all">All BE</option>
              <option value="Yes">BE Yes</option>
              <option value="No">BE No</option>
            </select>
          </label>
          <label>
            PA Rating
            <select value={filters.paRating} onChange={(event) => updateFilter("paRating", event.target.value as DailyRatingFilter)}>
              {paRatingFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            BE Trades
            <select value={filters.breakeven} onChange={(event) => updateFilter("breakeven", event.target.value as BreakevenFilter)}>
              {breakevenFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {notice ? <p className="notice dashboard-notice">{notice}</p> : null}

      <section className="metric-grid quality-page-metrics" aria-label="Trade quality summary">
        <article className="metric-card primary-metric">
          <span>Quality Score</span>
          <strong>{currentViewQuality.toFixed(1)}</strong>
          <small>{isLoading ? "Loading" : `${filteredReportTrades.length} filtered trades`}</small>
        </article>
        <article className="metric-card">
          <span>Net Actual R</span>
          <strong className={toneClass(summary.netR)}>{rValue(summary.netR)}</strong>
          <small>Avg {rValue(summary.avgR)}</small>
        </article>
        <article className="metric-card">
          <span>Win Rate</span>
          <strong>{percent(summary.winRate)}</strong>
          <small>
            {summary.wins} wins / {summary.losses} losses
          </small>
        </article>
        <article className="metric-card">
          <span>Capture Rate</span>
          <strong className={toneClass(summary.captureRate)}>{percent(summary.captureRate)}</strong>
          <small>Max {rValue(summary.totalMax)}</small>
        </article>
        <article className="metric-card">
          <span>Best Setup</span>
          <strong>{bestSetup?.label ?? "--"}</strong>
          <small>{bestSetup ? `${bestSetup.score.toFixed(1)} quality` : "No setup data"}</small>
        </article>
        <article className="metric-card">
          <span>Watch Setup</span>
          <strong>{weakestSetup?.label ?? "--"}</strong>
          <small>{weakestSetup ? `${weakestSetup.score.toFixed(1)} quality` : "No setup data"}</small>
        </article>
      </section>

      <section className="quality-standalone-grid quality-arranged-grid" aria-label="Trade quality details">
        <div className="quality-wide-stack">
          <article className="quality-card quality-card-wide">
            <div className="quality-card-heading">
              <p className="eyebrow">Setup</p>
              <h3>Setup Quality</h3>
            </div>
            {renderQualityRows(quality.setups, "No setup quality data yet.")}
          </article>

          <article className="quality-card quality-card-wide">
            <div className="quality-card-heading">
              <p className="eyebrow">Setup Analysis</p>
              <h3>Setup x Session</h3>
            </div>
            {renderQualityRows(quality.setupSessions, "No setup/session combinations yet.", 5)}
          </article>
        </div>

        <div className="quality-side-stack">
          <article className="quality-card">
            <div className="quality-card-heading">
              <p className="eyebrow">Session</p>
              <h3>Session Quality</h3>
            </div>
            {renderQualityRows(quality.sessions, "No session quality data yet.", 6)}
          </article>

          <article className="quality-card">
            <div className="quality-card-heading">
              <p className="eyebrow">Daily Review</p>
              <h3>BE Day Outcome</h3>
            </div>
            {renderQualityRows(quality.beDays, "No breakeven day data yet.", 3)}
          </article>
        </div>

        <div className="quality-three-stack">
          <article className="quality-card">
            <div className="quality-card-heading">
              <p className="eyebrow">Psychology</p>
              <h3>Discipline Pattern</h3>
            </div>
            {renderDisciplineRows(quality.discipline)}
            {weakestDiscipline ? (
              <p className="quality-card-note">
                Lowest follow-through: {weakestDiscipline.label} at {percent(weakestDiscipline.rate)}.
              </p>
            ) : null}
          </article>

          <article className="quality-card">
            <div className="quality-card-heading">
              <p className="eyebrow">Emotion</p>
              <h3>Main Emotion</h3>
            </div>
            <div className="quality-row-list">
              {quality.emotions.slice(0, 8).map((row) => (
                <div className="quality-row compact" key={row.label}>
                  <div>
                    <strong>{row.label}</strong>
                    <small>
                      {row.count} entries · {row.trades} linked trades · {percent(row.winRate)} win
                    </small>
                  </div>
                  <div className="quality-row-metrics">
                    <strong className={toneClass(row.total)}>{row.trades ? rValue(row.total) : "--"}</strong>
                    <small>avg {row.trades ? rValue(row.average) : "--"}</small>
                  </div>
                </div>
              ))}
              {!quality.emotions.length ? <p className="empty-panel-note">No emotion data in narratives yet.</p> : null}
            </div>
          </article>

          <article className="quality-card">
            <div className="quality-card-heading">
              <p className="eyebrow">Daily Review</p>
              <h3>PA Rating Edge</h3>
            </div>
            {renderQualityRows(quality.paRatings, "No PA rating data yet.", 3)}
          </article>
        </div>

        <div className="quality-wide-stack">
          <article className="quality-card quality-card-wide">
            <div className="quality-card-heading">
              <p className="eyebrow">Tag Analysis</p>
              <h3>Tag Signals & Keywords</h3>
            </div>
            <div className="quality-tag-cloud">
              {quality.tags.slice(0, 14).map((row) => (
                <span className={toneClass(row.total)} key={row.label}>
                  #{row.label} <strong>{row.trades ? rValue(row.total) : `${row.journalDays ?? 0}d`}</strong>
                </span>
              ))}
              {!quality.tags.length ? <p className="empty-panel-note">No tags in this view.</p> : null}
            </div>
            {quality.noteKeywords.length ? (
              <div className="quality-keyword-list">
                {quality.noteKeywords.map((row: NoteKeywordRow) => (
                  <span key={row.keyword}>
                    {row.keyword} <strong>{row.count}</strong>
                  </span>
                ))}
              </div>
            ) : null}
          </article>

          <article className="quality-card quality-card-wide">
            <div className="quality-card-heading">
              <p className="eyebrow">Weekday</p>
              <h3>Day Quality</h3>
            </div>
            <div className="quality-weekday-grid">
              {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                const rows = filteredReportTrades.filter((trade) => weekdayIndex(trade.date) === dayIndex);
                const row = tradeQualityRow(dayName(`2026-08-${String(dayIndex + 2).padStart(2, "0")}`), rows);
                return (
                  <div className="quality-weekday-card" key={dayIndex}>
                    <span>{row.label}</span>
                    <strong className={toneClass(row.total)}>{row.trades ? rValue(row.total) : "--"}</strong>
                    <small>
                      {row.trades} trades · {row.trades ? `${percent(row.winRate)} win` : "No trades"}
                    </small>
                  </div>
                );
              })}
            </div>
          </article>
        </div>

        <div className="quality-side-stack">
          <article className="quality-card">
            <div className="quality-card-heading">
              <p className="eyebrow">Daily Review</p>
              <h3>Setup Rating Edge</h3>
            </div>
            {renderQualityRows(quality.setupRatings, "No setup rating data in narratives yet.", 6)}
          </article>
        </div>
      </section>
    </main>
  );
}
