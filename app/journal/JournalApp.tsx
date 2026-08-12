"use client";

/* eslint-disable @next/next/no-img-element -- Dynamic journal screenshots come from uploaded files. */

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { useJournalTheme } from "./useJournalTheme";

type BeHit = "Yes" | "No";

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
  date: string;
  direction: string;
  exitType: string;
  firstTpR: number;
  id: string;
  instrument: string;
  lessonLearned: string;
  maxR: number;
  mistakeCategory: string;
  mistakeNotes: string;
  notes: string;
  session: string;
  setupName: string;
  tags: string;
  createdAt?: number;
  updatedAt?: number;
};

type DraftTrade = Omit<ExitTrade, "id" | "createdAt" | "updatedAt">;

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

type DraftDailyJournal = Omit<DailyJournal, "id" | "createdAt" | "updatedAt">;

type ImportTrade = DraftTrade & {
  id?: string;
};

type ImportDailyJournal = DailyJournal;

type RestorableAttachment = TradeAttachment & {
  backupPath?: string;
};

type RestorableTrade = Omit<ImportTrade, "attachments"> & {
  attachments: RestorableAttachment[];
};

type RestorableDailyJournal = Omit<ImportDailyJournal, "attachments"> & {
  attachments: RestorableAttachment[];
};

type RestoreMode = "merge" | "replace";

type RestoredJournalData = {
  attachmentCount: number;
  dailyJournals: ImportDailyJournal[];
  missingAttachmentCount: number;
  trades: ImportTrade[];
};

type PendingRestore = {
  availableMonths: string[];
  availableYears: string[];
  dailyJournals: RestorableDailyJournal[];
  fileName: string;
  mode: RestoreMode;
  trades: RestorableTrade[];
  zipFiles: Record<string, Uint8Array>;
};

type PendingImport = {
  dailyJournals: ImportDailyJournal[];
  duplicateMatches: ImportTrade[];
  readyTrades: ImportTrade[];
  skippedById: number;
  sourceName: string;
};

type ImportBatchOptions = {
  dailyJournalExistingDates?: Set<string>;
  extraSkippedDailyJournals?: number;
  missingAttachments?: number;
  noticePrefix?: string;
  restoredAttachments?: number;
};

type PasswordDraft = {
  confirmPassword: string;
  currentPassword: string;
  newPassword: string;
};

type DeviceFolder = {
  id: string;
  name: string;
  sharedUrl: string;
  shortCode: string;
  shortUrl: string;
  token: string;
  tokenUpdatedAt: number;
  updatedAt: number;
};

type DeviceFile = {
  contentType: string;
  createdAt: number;
  filename: string;
  id: string;
  sharedUrl: string;
  shortUrl: string;
  size: number;
  updatedAt: number;
};

type DeviceSafety = {
  enabled: boolean;
  isNearStorageLimit: boolean;
  isStorageLimitReached: boolean;
  percentUsed: number;
  remainingBytes: number;
  storageLimitBytes: number;
  storageWarningBytes: number;
  totalSize: number;
};

type DeviceFilesResponse = {
  error?: string;
  file?: DeviceFile;
  files?: DeviceFile[];
  folder?: DeviceFolder;
  ok?: boolean;
  safety?: DeviceSafety;
};

type DailyJournalsResponse = {
  error?: string;
  journal?: DailyJournal | null;
  journals?: DailyJournal[];
};

type JournalAttachmentResponse = {
  attachment?: TradeAttachment;
  attachments?: TradeAttachment[];
  error?: string;
  ok?: boolean;
  trashItem?: JournalTrashItem;
};

type TrashResponse = {
  attachment?: TradeAttachment;
  attachments?: TradeAttachment[];
  error?: string;
  item?: JournalTrashItem;
  items?: JournalTrashItem[];
  journal?: DailyJournal;
  ok?: boolean;
  ownerId?: string;
  ownerType?: "daily_journal" | "trade";
  trade?: ExitTrade;
  trashItem?: JournalTrashItem;
};

type StrategyResult = {
  firstTp: number;
  onePointFive: number;
  twoR: number;
  threeR: number;
};

type TradeSortKey =
  | "actualR"
  | "beHit"
  | "date"
  | "day"
  | "firstTpR"
  | "firstTpResult"
  | "maxR"
  | "onePointFive"
  | "threeR"
  | "twoR";

type SortDirection = "asc" | "desc";

type TradeSort = {
  direction: SortDirection;
  key: TradeSortKey;
};

type ResultFilter = "all" | "win" | "loss" | "flat";
type DailyRatingFilter = "all" | "low" | "mid" | "high";
type BreakevenFilter = "all" | "none" | "one-plus" | "two-plus";
type JournalShellView = "dashboard" | "home" | "trash";

type JournalTrashType = "trade" | "daily_journal" | "attachment";

type JournalTrashItem = {
  deletedAt: number;
  id: string;
  itemType: JournalTrashType;
  purgeAfter: number;
  sourceDate: string;
  sourceId: string;
  sourceLabel: string;
  summary: string;
};

type TrashFilter = "all" | JournalTrashType;

type JournalFilters = {
  beHit: "all" | BeHit;
  breakeven: BreakevenFilter;
  paRating: DailyRatingFilter;
  result: ResultFilter;
  session: string;
  setup: string;
  tag: string;
};

type AttachmentPreviewState = {
  attachments: TradeAttachment[];
  index: number;
  sourceDate?: string;
  sourceLabel: string;
};

type TradeTextField = "notes";
type DailyTextField = "htfBias" | "orm" | "narrative" | "reviewNotes";

type TextEditorTarget =
  | {
      field: TradeTextField;
      label: string;
      placeholder?: string;
      scope: "trade";
    }
  | {
      field: DailyTextField;
      label: string;
      placeholder?: string;
      scope: "daily";
    };

type ReportMode = "month" | "year" | "all" | "custom";
type ActiveReportRange = {
  from?: string;
  label: string;
  mode: ReportMode;
  to?: string;
  year?: string;
};
type SheetCell = boolean | null | number | string | undefined;
type WorkbookSheet = {
  name: string;
  rows: SheetCell[][];
};
type ZipFileBody = ArrayBuffer | string | Uint8Array;
type AttachmentSource = {
  attachment: TradeAttachment;
  backupPath?: string;
  sourceId: string;
  sourceLabel: string;
  sourceType: "Daily Journal" | "Trade";
  date: string;
};
type HomeTile = {
  action: string;
  button?: () => void;
  disabled?: boolean;
  href?: string;
  label: string;
  meta: string;
  title: string;
};
type AiAnalysisContext = {
  filters: JournalFilters;
  logSearch: string;
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

const reportOptions: Array<{ label: string; mode: ReportMode }> = [
  { label: "Selected Month", mode: "month" },
  { label: "Current Year", mode: "year" },
  { label: "All", mode: "all" },
  { label: "Custom", mode: "custom" },
];
const restoreScopeOptions: Array<{ label: string; mode: ReportMode }> = [
  { label: "All", mode: "all" },
  { label: "Month", mode: "month" },
  { label: "Year", mode: "year" },
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
const builtInTradeTags = [
  "good execution",
  "early exit",
  "discipline",
  "patience",
  "trend day",
  "choppy PA",
  "liquidity sweep",
  "gap fill",
  "review",
];
const quickTradeTemplates: Array<{
  label: string;
  note: string;
  patch: Partial<DraftTrade>;
  tags: string[];
}> = [
  {
    label: "TI Long",
    note: "NY AM continuation",
    patch: { direction: "Long", firstTpR: 1, maxR: 2, session: "NY AM", setupName: "TI Entry" },
    tags: ["TI Entry", "NY AM"],
  },
  {
    label: "LSI Short",
    note: "Liquidity sweep",
    patch: { direction: "Short", firstTpR: 1, maxR: 2, session: "NY AM", setupName: "LSI Entry" },
    tags: ["LSI Entry", "liquidity sweep"],
  },
  {
    label: "RCC",
    note: "Reclaim model",
    patch: { firstTpR: 1, maxR: 2, session: "NY PM", setupName: "RCC Entry" },
    tags: ["RCC Entry", "NY PM"],
  },
  {
    label: "BE Loss",
    note: "BE not hit",
    patch: { actualR: -1, beHit: "No", firstTpR: 1, maxR: 0 },
    tags: ["risk", "review"],
  },
];
const backupReminderStorageKey = "adalwolf_last_backup_exported_at";
const backupReminderDismissedStorageKey = "adalwolf_backup_reminder_dismissed_at";
const backupReminderIntervalMs = 7 * 24 * 60 * 60 * 1000;
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

const directionOptions = ["", "Long", "Short"] as const;
const sessionOptions = ["", "Asia", "London", "NY AM", "NY PM"] as const;
const setupNameOptions = ["TI Entry", "LSI Entry", "RCC Entry", "Custom"] as const;
const priceActionRatingOptions = Array.from({ length: 21 }, (_, index) => index * 0.5).filter(
  (rating) => rating !== 7,
);
const appTimeZone = "America/Los_Angeles";
const appDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: appTimeZone,
  year: "numeric",
});
const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const weekendLabels = new Set(["Sunday", "Saturday"]);

const sortableTradeColumns: Array<{ key: TradeSortKey; label: string }> = [
  { key: "date", label: "Date" },
  { key: "day", label: "Day" },
  { key: "beHit", label: "BE" },
  { key: "firstTpR", label: "First TP" },
  { key: "maxR", label: "Max" },
  { key: "actualR", label: "Actual" },
  { key: "firstTpResult", label: "First TP" },
  { key: "onePointFive", label: "1.5R" },
  { key: "twoR", label: "2R" },
  { key: "threeR", label: "3R" },
];

const initialMonth = currentMonthKey();

function currentMonthKey(date = new Date()) {
  const { month, year } = currentAppDateParts(date);
  return `${year}-${month}`;
}

function currentDateKey(date = new Date()) {
  const { day, month, year } = currentAppDateParts(date);
  return `${year}-${month}-${day}`;
}

function currentAppDateParts(date: Date) {
  const parts = appDateFormatter.formatToParts(date).reduce<Record<string, string>>(
    (values, part) => ({ ...values, [part.type]: part.value }),
    {},
  );
  return {
    day: parts.day ?? "01",
    month: parts.month ?? "01",
    year: parts.year ?? "1970",
  };
}

function shiftMonth(key: string, offset: number) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthTabLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function defaultDraftDate(month: string) {
  const today = currentDateKey();
  return monthKey(today) === month ? today : `${month}-01`;
}

function defaultDraft(month = initialMonth): DraftTrade {
  return {
    actualR: 0,
    attachments: [],
    beHit: "Yes",
    date: defaultDraftDate(month),
    direction: "",
    exitType: "",
    firstTpR: 1,
    instrument: "",
    lessonLearned: "",
    maxR: 1,
    mistakeCategory: "",
    mistakeNotes: "",
    notes: "",
    session: "",
    setupName: "",
    tags: "",
  };
}

function defaultDailyJournal(date = currentDateKey()): DraftDailyJournal {
  return {
    attachments: [],
    breakevenTrades: 0,
    date,
    htfBias: "",
    narrative: "",
    orm: "",
    priceActionRating: 0,
    reviewNotes: "",
    tags: "",
  };
}

function draftFromTrade(trade: ExitTrade, overrides: Partial<DraftTrade> = {}): DraftTrade {
  return {
    actualR: trade.actualR,
    attachments: trade.attachments,
    beHit: trade.beHit,
    date: trade.date,
    direction: trade.direction,
    exitType: trade.exitType,
    firstTpR: trade.firstTpR,
    instrument: trade.instrument,
    lessonLearned: trade.lessonLearned,
    maxR: trade.maxR,
    mistakeCategory: trade.mistakeCategory,
    mistakeNotes: trade.mistakeNotes,
    notes: trade.notes,
    session: trade.session,
    setupName: trade.setupName,
    tags: trade.tags,
    ...overrides,
  };
}

function mergeTagText(currentValue: string, nextTags: string[]) {
  return [...new Set([...tagList({ tags: currentValue }), ...nextTags].map((tag) => tag.trim()).filter(Boolean))].join(
    ", ",
  );
}

function emptyPasswordDraft(): PasswordDraft {
  return {
    confirmPassword: "",
    currentPassword: "",
    newPassword: "",
  };
}

function dayName(date: string) {
  return new Date(Date.UTC(...dateParts(date))).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

function dateParts(date: string): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);
  return [year, month - 1, day];
}

function weekdayIndex(date: string) {
  return new Date(Date.UTC(...dateParts(date))).getUTCDay();
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function isMonthKey(value: string) {
  return /^\d{4}-\d{2}$/.test(value);
}

function normalizeMonthRange(start: string, end: string) {
  const safeStart = isMonthKey(start) ? start : initialMonth;
  const safeEnd = isMonthKey(end) ? end : safeStart;
  return safeStart <= safeEnd
    ? { from: safeStart, to: safeEnd }
    : { from: safeEnd, to: safeStart };
}

function dateMatchesReportRange(date: string, range: ActiveReportRange, fallbackMonth: string) {
  if (range.mode === "all") {
    return true;
  }

  if (range.mode === "year") {
    return date.startsWith(`${range.year}-`);
  }

  const key = monthKey(date);
  return key >= (range.from ?? fallbackMonth) && key <= (range.to ?? fallbackMonth);
}

function daysInMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function firstWeekday(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

function rValue(value: number) {
  return `${value >= 0 ? "" : "-"}${Math.abs(value).toFixed(2)}R`;
}

function signedRValue(value: number) {
  return `${value > 0 ? "+" : ""}${rValue(value)}`;
}

function percent(value: number) {
  return Number.isFinite(value) ? `${value.toFixed(0)}%` : "--";
}

function fileSizeLabel(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTimestampCell(timestamp: number | undefined) {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return "";
  }

  return new Date(timestamp).toISOString();
}

function safeExportSegment(value: string, fallback: string) {
  return (
    value
      .replace(/[^A-Za-z0-9._ -]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || fallback
  );
}

function attachmentFileLabel(attachments: TradeAttachment[]) {
  return attachments.map((attachment) => attachment.filename).join("; ");
}

function attachmentUrlLabel(attachments: TradeAttachment[]) {
  return attachments.map((attachment) => attachment.url).join("; ");
}

function fileExtension(filename: string, contentType = "") {
  const extension = filename.match(/\.([A-Za-z0-9]{1,8})$/)?.[1]?.toLowerCase();
  if (extension) {
    return `.${extension}`;
  }

  if (contentType === "image/jpeg") {
    return ".jpg";
  }

  if (contentType === "image/png") {
    return ".png";
  }

  if (contentType === "image/webp") {
    return ".webp";
  }

  return "";
}

function filenameStem(filename: string) {
  const withoutExtension = filename.replace(/\.[A-Za-z0-9]{1,8}$/, "");
  return (
    withoutExtension
      .replace(/[^A-Za-z0-9._ -]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 58) || "screenshot"
  );
}

function uniqueIdPart() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : String(Date.now());
}

function makeDailyJournalAttachmentFilename(file: File, date: string, index: number) {
  const originalName = file.name || "screenshot";
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const sequence = String(index + 1).padStart(2, "0");
  const extension = fileExtension(originalName, file.type);
  const stem = filenameStem(originalName);

  return `${date}-${stamp}-${sequence}-${uniqueIdPart()}-${stem}${extension}`;
}

function clipboardFiles(items?: DataTransferItemList | null) {
  if (!items) {
    return [];
  }

  return Array.from(items)
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
}

function formatAttachmentDate(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "Saved file";
  }

  return new Date(timestamp).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    timeZone: appTimeZone,
    year: "numeric",
  });
}

function isImageAttachment(attachment: TradeAttachment) {
  const contentType = attachment.contentType.toLowerCase();
  const attachmentPath = `${attachment.filename} ${attachment.url.split("?")[0]}`.toLowerCase();
  return (
    contentType.startsWith("image/") ||
    /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(attachmentPath)
  );
}

function compareTradeEntryOrder(left: ExitTrade, right: ExitTrade) {
  return (left.createdAt ?? 0) - (right.createdAt ?? 0) || left.id.localeCompare(right.id);
}

function alignedNarrativeLine(label: string, value: string) {
  return `${label.padEnd(30)} ${value}`;
}

function tradeNarrativeTemplate(trades: ExitTrade[]) {
  return trades
    .map((trade, index) => {
      const session = trade.session || "Session";
      const direction = trade.direction || "Direction";
      const model = trade.setupName || "Model";

      return [
        `${session} Trade: ${direction} (Trade #${index + 1}) ------------ (${model})`,
        alignedNarrativeLine("Valid setup?", "Yes"),
        alignedNarrativeLine("Followed risk?", "Yes"),
        alignedNarrativeLine("Followed entry rule?", "Yes"),
        alignedNarrativeLine("Followed exit rule?", "Yes"),
        alignedNarrativeLine("Main emotion:", "Calm"),
        alignedNarrativeLine("Setup Rating", "X/10"),
      ].join("\n");
    })
    .join("\n\n");
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

  const cleanLabel = label.replace(/:$/, "");
  const value = line.trimStart().slice(label.length).trim() || "--";
  return { label: cleanLabel, value };
}

function narrativeTradeFromHeader(header: string, trades: ExitTrade[], fallbackIndex: number) {
  const tradeIndex = Number(header.match(/\(Trade #(\d+)\)/)?.[1]);
  return trades[Number.isFinite(tradeIndex) && tradeIndex > 0 ? tradeIndex - 1 : fallbackIndex] ?? null;
}

function isNarrativeTradeHeader(header: string) {
  return /^.+\s+Trade:\s+.+\s+\(Trade #\d+\)\s*-{3,}\s*\(.+\)\s*$/.test(header.trim());
}

function renderNarrativeContent(narrative: string, trades: ExitTrade[]) {
  const blocks = narrativeBlocks(narrative);

  if (!blocks.length) {
    return <p>--</p>;
  }

  return (
    <div className="narrative-render">
      {blocks.map((block, blockIndex) => {
        const [header, ...details] = block;
        const isTradeBlock = isNarrativeTradeHeader(header);

        if (!isTradeBlock) {
          return (
            <div className="narrative-text-block" key={`${header}-${blockIndex}`}>
              {block.map((line, lineIndex) => (
                <p key={`${line}-${lineIndex}`}>{line}</p>
              ))}
            </div>
          );
        }

        const trade = narrativeTradeFromHeader(header, trades, blockIndex);
        const tone = trade ? toneClass(trade.actualR) : "neutral";

        return (
          <article className="narrative-trade-card" key={`${header}-${blockIndex}`}>
            <div className={`narrative-trade-header ${tone}`}>
              <strong>{header}</strong>
              {trade ? <span>{rValue(trade.actualR)}</span> : null}
            </div>
            <div className="narrative-detail-grid">
              {details.map((line, lineIndex) => {
                const parsed = narrativeDetail(line);
                return parsed ? (
                  <div className="narrative-detail-row" key={`${line}-${lineIndex}`}>
                    <span>{parsed.label}</span>
                    <strong>{parsed.value}</strong>
                  </div>
                ) : (
                  <p className="narrative-free-line" key={`${line}-${lineIndex}`}>
                    {line}
                  </p>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cssImageUrl(value: string) {
  return `url("${value.replace(/["\\\n\r\f]/g, "\\$&")}")`;
}

function attachmentPreviewBackgroundStyle(attachment: TradeAttachment, zoom: number): CSSProperties {
  return {
    backgroundImage: cssImageUrl(attachment.url),
    backgroundSize: zoom <= 1 ? "contain" : `auto ${Math.round(zoom * 100)}%`,
  };
}

function ratio(value: number) {
  if (value === Infinity) {
    return "--";
  }

  return Number.isFinite(value) ? value.toFixed(2) : "--";
}

function chartShape(values: number[], width = 340, height = 142) {
  const series = values.length ? values : [0];
  const min = Math.min(0, ...series);
  const max = Math.max(0, ...series);
  const range = max - min || 1;
  const step = series.length > 1 ? width / (series.length - 1) : width;
  const points = series.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });
  const baseY = height - ((0 - min) / range) * height;
  const pointList = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const area =
    points.length > 1
      ? `0,${baseY.toFixed(2)} ${pointList} ${width},${baseY.toFixed(2)}`
      : `0,${baseY.toFixed(2)} ${width / 2},${points[0].y.toFixed(2)} ${width},${baseY.toFixed(2)}`;

  return { area, baseY, pointList };
}

function strategyResult(trade: Pick<ExitTrade, "beHit" | "firstTpR" | "maxR">): StrategyResult {
  if (trade.beHit === "No") {
    return {
      firstTp: -1,
      onePointFive: -1,
      twoR: -1,
      threeR: -1,
    };
  }

  return {
    firstTp: trade.maxR >= trade.firstTpR ? trade.firstTpR : 0,
    onePointFive: trade.maxR >= 1.5 ? 1.5 : 0,
    twoR: trade.maxR >= 2 ? 2 : 0,
    threeR: trade.maxR >= 3 ? 3 : 0,
  };
}

function tradeSortValue(trade: ExitTrade, key: TradeSortKey) {
  const result = strategyResult(trade);
  switch (key) {
    case "actualR":
      return trade.actualR;
    case "beHit":
      return trade.beHit;
    case "date":
      return trade.date;
    case "day":
      return dayName(trade.date);
    case "firstTpR":
      return trade.firstTpR;
    case "firstTpResult":
      return result.firstTp;
    case "maxR":
      return trade.maxR;
    case "onePointFive":
      return result.onePointFive;
    case "threeR":
      return result.threeR;
    case "twoR":
      return result.twoR;
  }
}

function compareTradesForSort(left: ExitTrade, right: ExitTrade, sort: TradeSort) {
  const leftValue = tradeSortValue(left, sort.key);
  const rightValue = tradeSortValue(right, sort.key);
  const direction = sort.direction === "asc" ? 1 : -1;
  const primary =
    typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : String(leftValue).localeCompare(String(rightValue));

  return primary
    ? primary * direction
    : right.date.localeCompare(left.date) || (right.createdAt ?? 0) - (left.createdAt ?? 0);
}

function tradeFingerprint(trade: DraftTrade | ExitTrade | ImportTrade) {
  return [
    trade.date,
    trade.instrument.trim().toUpperCase(),
    trade.direction.trim(),
    trade.session.trim(),
    trade.setupName.trim(),
    trade.beHit,
    trade.firstTpR.toFixed(4),
    trade.maxR.toFixed(4),
    trade.actualR.toFixed(4),
    trade.tags.trim().toLowerCase(),
    trade.notes.trim(),
  ].join("|");
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function tagsText(value: unknown) {
  const rawTags = Array.isArray(value)
    ? value.map((item) => String(item ?? ""))
    : String(value ?? "").split(",");

  return rawTags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, tags) => tags.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) === index)
    .join(", ");
}

function tagList(trade: Pick<ExitTrade, "tags">) {
  return trade.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function tradeSheetRows(trades: ExitTrade[]): SheetCell[][] {
  return [
    [
      "ID",
      "Date",
      "Day",
      "Instrument",
      "Direction",
      "Session",
      "Setup Name",
      "BE Hit",
      "First TP R",
      "Max R",
      "Actual R",
      "Exit Type",
      "Tags",
      "Note",
      "Issue Category",
      "Issue Notes",
      "Review Takeaway",
      "First TP Result",
      "1.5R Result",
      "2R Result",
      "3R Result",
      "Attachment Count",
      "Attachment Filenames",
      "Attachment URLs",
      "Created At",
      "Updated At",
    ],
    ...trades.map((trade) => {
      const result = strategyResult(trade);
      return [
        trade.id,
        trade.date,
        dayName(trade.date),
        trade.instrument,
        trade.direction,
        trade.session,
        trade.setupName,
        trade.beHit,
        trade.firstTpR,
        trade.maxR,
        trade.actualR,
        trade.exitType,
        trade.tags,
        trade.notes,
        trade.mistakeCategory,
        trade.mistakeNotes,
        trade.lessonLearned,
        result.firstTp,
        result.onePointFive,
        result.twoR,
        result.threeR,
        trade.attachments.length,
        attachmentFileLabel(trade.attachments),
        attachmentUrlLabel(trade.attachments),
        formatTimestampCell(trade.createdAt),
        formatTimestampCell(trade.updatedAt),
      ];
    }),
  ];
}

function dailyJournalSheetRows(journals: DailyJournal[]): SheetCell[][] {
  return [
    [
      "ID",
      "Date",
      "Day",
      "HTF Bias",
      "ORM",
      "Narrative",
      "Price Action Rating",
      "Breakeven Trades",
      "Tags",
      "Review Notes",
      "Attachment Count",
      "Attachment Filenames",
      "Attachment URLs",
      "Created At",
      "Updated At",
    ],
    ...journals.map((journal) => [
      journal.id,
      journal.date,
      dayName(journal.date),
      journal.htfBias,
      journal.orm,
      journal.narrative,
      journal.priceActionRating,
      journal.breakevenTrades,
      journal.tags,
      journal.reviewNotes,
      journal.attachments.length,
      attachmentFileLabel(journal.attachments),
      attachmentUrlLabel(journal.attachments),
      formatTimestampCell(journal.createdAt),
      formatTimestampCell(journal.updatedAt),
    ]),
  ];
}

function tradeStatsForExport(trades: ExitTrade[]) {
  const winners = trades.filter((trade) => trade.actualR > 0);
  const losers = trades.filter((trade) => trade.actualR < 0);
  const grossWin = winners.reduce((sum, trade) => sum + trade.actualR, 0);
  const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + trade.actualR, 0));
  const totalMax = trades.reduce((sum, trade) => sum + trade.maxR, 0);
  const totalActual = trades.reduce((sum, trade) => sum + trade.actualR, 0);
  const beHits = trades.filter((trade) => trade.beHit === "Yes").length;

  return {
    avgR: trades.length ? totalActual / trades.length : 0,
    beRate: trades.length ? (beHits / trades.length) * 100 : 0,
    captureRate: totalMax ? (totalActual / totalMax) * 100 : 0,
    grossLoss,
    grossWin,
    losses: losers.length,
    netR: totalActual,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0,
    totalMax,
    trades: trades.length,
    winRate: trades.length ? (winners.length / trades.length) * 100 : 0,
    wins: winners.length,
  };
}

function summarySheetRows(trades: ExitTrade[], journals: DailyJournal[], range: ActiveReportRange): SheetCell[][] {
  const summary = tradeStatsForExport(trades);
  const attachments = collectAttachmentSources(trades, journals);
  return [
    ["Metric", "Value"],
    ["Report Range", range.label],
    ["Generated At", new Date().toISOString()],
    ["Trades", summary.trades],
    ["Daily Journals", journals.length],
    ["Net R", summary.netR],
    ["Win Rate", `${summary.winRate.toFixed(1)}%`],
    ["Average R", summary.avgR],
    ["Gross Win R", summary.grossWin],
    ["Gross Loss R", summary.grossLoss],
    ["Profit Factor", ratio(summary.profitFactor)],
    ["Capture Rate", `${summary.captureRate.toFixed(1)}%`],
    ["BE Hit Rate", `${summary.beRate.toFixed(1)}%`],
    ["Attachment References", attachments.length],
  ];
}

function strategySummary(trades: ExitTrade[]) {
  return [
    { key: "actual", label: "Actual", values: trades.map((trade) => trade.actualR) },
    { key: "firstTp", label: "First TP", values: trades.map((trade) => strategyResult(trade).firstTp) },
    { key: "onePointFive", label: "1.5R", values: trades.map((trade) => strategyResult(trade).onePointFive) },
    { key: "twoR", label: "2R", values: trades.map((trade) => strategyResult(trade).twoR) },
    { key: "threeR", label: "3R", values: trades.map((trade) => strategyResult(trade).threeR) },
  ].map((strategy) => {
    const total = strategy.values.reduce((sum, value) => sum + value, 0);
    const wins = strategy.values.filter((value) => value > 0).length;
    return {
      ...strategy,
      average: strategy.values.length ? total / strategy.values.length : 0,
      total,
      winRate: strategy.values.length ? (wins / strategy.values.length) * 100 : 0,
      wins,
    };
  });
}

function qualityScore(summary: ReturnType<typeof tradeStatsForExport>) {
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
  const summary = tradeStatsForExport(trades);
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
      if (!header || !isNarrativeTradeHeader(header)) {
        return;
      }

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
        const summary = tradeStatsForExport(value.trades);
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
    discipline: narrative.discipline,
    emotions: narrative.emotions,
    noteKeywords: noteKeywordRows(trades, journals),
    paRatings: paRatingQualityRows(trades, journals),
    sessions: tradeQualityRows(trades, (trade) => trade.session, "No session"),
    setupRatings: narrative.setupRatings,
    setupSessions: tradeQualityRows(
      trades,
      (trade) => `${trade.setupName || "No setup"} · ${trade.session || "No session"}`,
      "No setup · No session",
    ),
    setups: tradeQualityRows(trades, (trade) => trade.setupName, "No setup"),
    tags: tagQualityRows(trades, journals),
  };
}

function exitComparisonSheetRows(trades: ExitTrade[]): SheetCell[][] {
  const rows = strategySummary(trades);
  const actualTotal = rows.find((row) => row.key === "actual")?.total ?? 0;
  return [
    ["Rank", "Strategy", "Total R", "Delta vs Actual", "Average R", "Win Rate", "Wins", "Trades"],
    ...rows
      .map((row) => ({
        ...row,
        delta: row.total - actualTotal,
      }))
      .sort((left, right) => right.total - left.total)
      .map((row, index) => [
        index + 1,
        row.label,
        row.total,
        row.delta,
        row.average,
        `${row.winRate.toFixed(1)}%`,
        row.wins,
        trades.length,
      ]),
  ];
}

function groupedTradeSheetRows(
  trades: ExitTrade[],
  label: string,
  groupValue: (trade: ExitTrade) => string,
): SheetCell[][] {
  const groups = new Map<string, ExitTrade[]>();
  trades.forEach((trade) => {
    const key = groupValue(trade).trim() || "Unspecified";
    groups.set(key, [...(groups.get(key) ?? []), trade]);
  });

  return [
    [label, "Trades", "Net R", "Win Rate", "Average R", "Gross Win R", "Gross Loss R", "Profit Factor", "BE Hit Rate"],
    ...Array.from(groups.entries())
      .map(([key, rows]) => {
        const summary = tradeStatsForExport(rows);
        return {
          key,
          row: [
            key,
            summary.trades,
            summary.netR,
            `${summary.winRate.toFixed(1)}%`,
            summary.avgR,
            summary.grossWin,
            summary.grossLoss,
            ratio(summary.profitFactor),
            `${summary.beRate.toFixed(1)}%`,
          ],
          sortValue: summary.netR,
        };
      })
      .sort((left, right) => right.sortValue - left.sortValue || String(left.key).localeCompare(String(right.key)))
      .map((item) => item.row),
  ];
}

function weekdaySheetRows(trades: ExitTrade[]): SheetCell[][] {
  return [
    ["Weekday", "Trades", "Net R", "Win Rate", "Average R", "BE Hit Rate"],
    ...weekdayLabels.map((label, index) => {
      const rows = trades.filter((trade) => weekdayIndex(trade.date) === index);
      const summary = tradeStatsForExport(rows);
      return [
        label,
        summary.trades,
        summary.netR,
        `${summary.winRate.toFixed(1)}%`,
        summary.avgR,
        `${summary.beRate.toFixed(1)}%`,
      ];
    }),
  ];
}

function tagSheetRows(trades: ExitTrade[], journals: DailyJournal[]): SheetCell[][] {
  const tags = new Map<string, { journals: number; trades: ExitTrade[] }>();
  trades.forEach((trade) => {
    tagList(trade).forEach((tag) => {
      const current = tags.get(tag) ?? { journals: 0, trades: [] };
      current.trades.push(trade);
      tags.set(tag, current);
    });
  });
  journals.forEach((journal) => {
    tagList(journal).forEach((tag) => {
      const current = tags.get(tag) ?? { journals: 0, trades: [] };
      current.journals += 1;
      tags.set(tag, current);
    });
  });

  return [
    ["Tag", "Trade Count", "Daily Journal Count", "Net R", "Trade Win Rate"],
    ...Array.from(tags.entries())
      .map(([tag, value]) => {
        const summary = tradeStatsForExport(value.trades);
        return {
          row: [tag, value.trades.length, value.journals, summary.netR, `${summary.winRate.toFixed(1)}%`],
          sortValue: value.trades.length + value.journals,
          tag,
        };
      })
      .sort((left, right) => right.sortValue - left.sortValue || left.tag.localeCompare(right.tag))
      .map((item) => item.row),
  ];
}

function qualityRowSheetRows(label: string, rows: TradeQualityRow[]): SheetCell[][] {
  return [
    [
      label,
      "Quality Score",
      "Trades",
      "Journal Days",
      "Net R",
      "Average R",
      "Win Rate",
      "Capture Rate",
      "Profit Factor",
      "BE Hit Rate",
      "Avg Max R",
    ],
    ...rows.map((row) => [
      row.label,
      row.score,
      row.trades,
      row.journalDays ?? "",
      row.total,
      row.average,
      `${row.winRate.toFixed(1)}%`,
      `${row.captureRate.toFixed(1)}%`,
      ratio(row.profitFactor),
      `${row.beRate.toFixed(1)}%`,
      row.avgMax,
    ]),
  ];
}

function disciplineSheetRows(rows: DisciplineRow[]): SheetCell[][] {
  return [
    ["Discipline Item", "Followed Rate", "Yes", "No", "Unknown", "Total Answers"],
    ...rows.map((row) => [
      row.label,
      `${row.rate.toFixed(1)}%`,
      row.yes,
      row.no,
      row.unknown,
      row.total,
    ]),
  ];
}

function emotionSheetRows(rows: EmotionRow[]): SheetCell[][] {
  return [
    ["Emotion", "Occurrences", "Linked Trades", "Net R", "Average R", "Win Rate"],
    ...rows.map((row) => [
      row.label,
      row.count,
      row.trades,
      row.total,
      row.average,
      `${row.winRate.toFixed(1)}%`,
    ]),
  ];
}

function noteKeywordSheetRows(rows: NoteKeywordRow[]): SheetCell[][] {
  return [
    ["Keyword", "Count"],
    ...rows.map((row) => [row.keyword, row.count]),
  ];
}

function qualitySummarySheetRows(analysis: TradeQualityAnalysis): SheetCell[][] {
  const bestSetup = analysis.setups[0];
  const weakestSetup = [...analysis.setups].filter((row) => row.trades).sort((left, right) => left.score - right.score)[0];
  const bestSession = analysis.sessions[0];
  const weakestDiscipline = [...analysis.discipline]
    .filter((row) => row.total)
    .sort((left, right) => left.rate - right.rate)[0];
  const topEmotion = analysis.emotions[0];
  const topTag = analysis.tags[0];

  return [
    ["Signal", "Value", "Detail"],
    [
      "Best Setup",
      bestSetup?.label ?? "",
      bestSetup ? `${bestSetup.score.toFixed(1)} score · ${bestSetup.total.toFixed(2)}R` : "",
    ],
    [
      "Weakest Setup",
      weakestSetup?.label ?? "",
      weakestSetup ? `${weakestSetup.score.toFixed(1)} score · ${weakestSetup.total.toFixed(2)}R` : "",
    ],
    [
      "Best Session",
      bestSession?.label ?? "",
      bestSession ? `${bestSession.score.toFixed(1)} score · ${bestSession.total.toFixed(2)}R` : "",
    ],
    [
      "Lowest Discipline Follow-through",
      weakestDiscipline?.label ?? "",
      weakestDiscipline ? `${weakestDiscipline.rate.toFixed(1)}% followed` : "",
    ],
    [
      "Most Frequent Emotion",
      topEmotion?.label ?? "",
      topEmotion ? `${topEmotion.count} occurrences · ${topEmotion.total.toFixed(2)}R linked` : "",
    ],
    [
      "Strongest Tag",
      topTag?.label ?? "",
      topTag ? `${topTag.total.toFixed(2)}R · ${topTag.trades} trades` : "",
    ],
  ];
}

function collectAttachmentSources(trades: ExitTrade[], journals: DailyJournal[]) {
  const tradeSources = trades.flatMap((trade, tradeIndex) =>
    trade.attachments.map((attachment, attachmentIndex) => ({
      attachment,
      date: trade.date,
      sourceId: trade.id,
      sourceLabel: `Trade #${tradeIndex + 1}${trade.session ? ` ${trade.session}` : ""}${
        trade.setupName ? ` ${trade.setupName}` : ""
      }`,
      sourceType: "Trade" as const,
      sortIndex: attachmentIndex,
    })),
  );
  const journalSources = journals.flatMap((journal) =>
    journal.attachments.map((attachment, attachmentIndex) => ({
      attachment,
      date: journal.date,
      sourceId: journal.id,
      sourceLabel: "Daily Journal",
      sourceType: "Daily Journal" as const,
      sortIndex: attachmentIndex,
    })),
  );

  return [...tradeSources, ...journalSources].sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.sourceType.localeCompare(right.sourceType) ||
      left.sortIndex - right.sortIndex,
  );
}

function attachmentIndexSheetRows(sources: AttachmentSource[]): SheetCell[][] {
  return [
    [
      "Source Type",
      "Source ID",
      "Date",
      "Source Label",
      "Attachment ID",
      "Filename",
      "Content Type",
      "Size Bytes",
      "Uploaded At",
      "URL",
      "Backup Path",
    ],
    ...sources.map((source) => [
      source.sourceType,
      source.sourceId,
      source.date,
      source.sourceLabel,
      source.attachment.id,
      source.attachment.filename,
      source.attachment.contentType,
      source.attachment.size,
      formatTimestampCell(source.attachment.uploadedAt),
      source.attachment.url,
      source.backupPath ?? "",
    ]),
  ];
}

function monthlySummarySheetRows(trades: ExitTrade[]): SheetCell[][] {
  const months = new Map<string, ExitTrade[]>();
  trades.forEach((trade) => {
    const key = monthKey(trade.date);
    months.set(key, [...(months.get(key) ?? []), trade]);
  });

  return [
    ["Month", "Trades", "Net R", "Win Rate", "Average R", "Gross Win R", "Gross Loss R", "Profit Factor"],
    ...Array.from(months.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, rows]) => {
        const summary = tradeStatsForExport(rows);
        return [
          monthLabel(key),
          summary.trades,
          summary.netR,
          `${summary.winRate.toFixed(1)}%`,
          summary.avgR,
          summary.grossWin,
          summary.grossLoss,
          ratio(summary.profitFactor),
        ];
      }),
  ];
}

function readmeSheetRows(): SheetCell[][] {
  return [
    ["Sheet", "Purpose"],
    ["Trades", "One row per trade with every stored trade field plus calculated exit results."],
    ["Daily Journals", "One row per journal date with HTF bias, ORM, narrative, ratings, tags, and attachments."],
    ["Summary", "High-level metrics for the selected export range."],
    ["Monthly Summary", "Calculated performance grouped by month."],
    ["By Setup", "Calculated performance grouped by setup name."],
    ["By Session", "Calculated performance grouped by trading session."],
    ["By Weekday", "Calculated performance grouped by weekday."],
    ["Exit Ranking", "Ranks actual exits against alternate exit methods."],
    ["Tags", "Tag frequency and R performance."],
    ["Quality Summary", "Best and weakest trade quality signals from setup, session, tags, discipline, and emotion data."],
    ["Setup Quality", "Setup quality score, expectancy, win rate, capture rate, and BE hit rate."],
    ["Session Quality", "Session quality score, expectancy, win rate, capture rate, and BE hit rate."],
    ["Setup Session Quality", "Setup and session combinations ranked by trade quality."],
    ["PA Rating Edge", "Price-action rating buckets linked to trade results."],
    ["Discipline", "Yes/no discipline follow-through parsed from Daily Journal narrative templates."],
    ["Emotion", "Main emotion frequency parsed from Daily Journal narrative templates."],
    ["Note Keywords", "Common words from notes, journal narratives, ORM, HTF bias, and tags."],
    ["Attachments Index", "Screenshot/file references. Images are referenced, not embedded in the workbook."],
  ];
}

function completeWorkbookSheets(
  trades: ExitTrade[],
  journals: DailyJournal[],
  range: ActiveReportRange,
  attachmentSources = collectAttachmentSources(trades, journals),
): WorkbookSheet[] {
  const sortedTrades = [...trades].sort((left, right) => left.date.localeCompare(right.date) || compareTradeEntryOrder(left, right));
  const sortedJournals = [...journals].sort((left, right) => left.date.localeCompare(right.date));
  const quality = tradeQualityAnalysis(sortedTrades, sortedJournals);
  return [
    { name: "README", rows: readmeSheetRows() },
    { name: "Trades", rows: tradeSheetRows(sortedTrades) },
    { name: "Daily Journals", rows: dailyJournalSheetRows(sortedJournals) },
    { name: "Summary", rows: summarySheetRows(sortedTrades, sortedJournals, range) },
    { name: "Monthly Summary", rows: monthlySummarySheetRows(sortedTrades) },
    { name: "By Setup", rows: groupedTradeSheetRows(sortedTrades, "Setup Name", (trade) => trade.setupName) },
    { name: "By Session", rows: groupedTradeSheetRows(sortedTrades, "Session", (trade) => trade.session) },
    { name: "By Weekday", rows: weekdaySheetRows(sortedTrades) },
    { name: "Exit Ranking", rows: exitComparisonSheetRows(sortedTrades) },
    { name: "Tags", rows: tagSheetRows(sortedTrades, sortedJournals) },
    { name: "Quality Summary", rows: qualitySummarySheetRows(quality) },
    { name: "Setup Quality", rows: qualityRowSheetRows("Setup", quality.setups) },
    { name: "Session Quality", rows: qualityRowSheetRows("Session", quality.sessions) },
    { name: "Setup Session Quality", rows: qualityRowSheetRows("Setup Session", quality.setupSessions) },
    { name: "PA Rating Edge", rows: qualityRowSheetRows("PA Rating", quality.paRatings) },
    { name: "Discipline", rows: disciplineSheetRows(quality.discipline) },
    { name: "Emotion", rows: emotionSheetRows(quality.emotions) },
    { name: "Note Keywords", rows: noteKeywordSheetRows(quality.noteKeywords) },
    { name: "Attachments Index", rows: attachmentIndexSheetRows(attachmentSources) },
  ];
}

function rawAttachmentValues(value: unknown) {
  const rawAttachments = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim()
      ? parseAttachmentJson(value) || parseAttachmentText(value)
      : [];

  return Array.isArray(rawAttachments) ? rawAttachments : [];
}

function normalizeAttachment(attachment: unknown): TradeAttachment | null {
  if (!attachment || typeof attachment !== "object") {
    return null;
  }

  const item = attachment as Partial<TradeAttachment> & {
    sharedUrl?: unknown;
    shortUrl?: unknown;
  };
  const url =
    textValue(item.url) || textValue(item.shortUrl) || textValue(item.sharedUrl);

  if (!url) {
    return null;
  }

  return {
    contentType: textValue(item.contentType),
    filename: textValue(item.filename) || "Attachment",
    id: textValue(item.id) || crypto.randomUUID(),
    size: Number.isFinite(Number(item.size)) ? Math.max(0, Number(item.size)) : 0,
    uploadedAt: Number.isFinite(Number(item.uploadedAt)) ? Number(item.uploadedAt) : Date.now(),
    url,
  };
}

function normalizeAttachments(value: unknown): TradeAttachment[] {
  return rawAttachmentValues(value)
    .map(normalizeAttachment)
    .filter((attachment): attachment is TradeAttachment => Boolean(attachment));
}

function normalizeRestorableAttachments(value: unknown): RestorableAttachment[] {
  return rawAttachmentValues(value)
    .map((attachment): RestorableAttachment | null => {
      const normalizedAttachment = normalizeAttachment(attachment);
      if (!normalizedAttachment || !attachment || typeof attachment !== "object") {
        return normalizedAttachment;
      }

      const backupPath = textValue((attachment as { backupPath?: unknown }).backupPath);
      return backupPath ? { ...normalizedAttachment, backupPath } : normalizedAttachment;
    })
    .filter((attachment): attachment is RestorableAttachment => Boolean(attachment));
}

function parseAttachmentJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function parseAttachmentText(value: string) {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.*?):\s*(https?:\/\/\S+|\/\S+)$/);
      return {
        filename: match?.[1]?.trim() || "Attachment",
        id: crypto.randomUUID(),
        url: match?.[2]?.trim() || part,
      };
    });
}

function searchableTradeText(trade: ExitTrade) {
  return [
    trade.date,
    dayName(trade.date),
    trade.instrument,
    trade.direction,
    trade.session,
    trade.setupName,
    trade.beHit,
    trade.tags,
    trade.notes,
  ]
    .join(" ")
    .toLowerCase();
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

function journalFiltersActive(filters: JournalFilters) {
  return (
    filters.beHit !== "all" ||
    filters.breakeven !== "all" ||
    filters.paRating !== "all" ||
    filters.result !== "all" ||
    Boolean(filters.session || filters.setup || filters.tag)
  );
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

function readClientCookie(name: string) {
  const encodedName = `${encodeURIComponent(name)}=`;
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(encodedName))
      ?.slice(encodedName.length) ?? ""
  );
}

function writeClientCookie(name: string, value: string, maxAgeDays = 365) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${
    maxAgeDays * 24 * 60 * 60
  }; SameSite=Lax`;
}

function deleteClientCookie(name: string) {
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function filenamePart(label: string) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "trades"
  );
}

const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const zipMime = "application/zip";

function downloadFile(filename: string, body: string, type: string) {
  const blob = new Blob([body], { type });
  downloadBlob(filename, blob);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function bytesToArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function toXlsxBlob(trades: ExitTrade[]) {
  return createWorkbookXlsx([{ name: "Trades", rows: tradeSheetRows(trades) }]);
}

function toCompleteXlsxBlob(trades: ExitTrade[], journals: DailyJournal[], range: ActiveReportRange) {
  return createWorkbookXlsx(completeWorkbookSheets(trades, journals, range));
}

function createWorkbookXlsx(sheets: WorkbookSheet[]) {
  const preparedSheets = prepareWorkbookSheets(sheets);
  const worksheetOverrides = preparedSheets
    .map(
      (sheet) =>
        `  <Override PartName="/xl/worksheets/sheet${sheet.id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("\n");
  const workbookSheets = preparedSheets
    .map((sheet) => `    <sheet name="${escapeXml(sheet.name)}" sheetId="${sheet.id}" r:id="rId${sheet.id}"/>`)
    .join("\n");
  const workbookRelationships = preparedSheets
    .map(
      (sheet) =>
        `  <Relationship Id="rId${sheet.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheet.id}.xml"/>`,
    )
    .join("\n");
  const files: Record<string, ZipFileBody> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${worksheetOverrides}
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
${workbookSheets}
  </sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${workbookRelationships}
</Relationships>`,
  };

  preparedSheets.forEach((sheet) => {
    files[`xl/worksheets/sheet${sheet.id}.xml`] = worksheetXml(sheet.rows);
  });

  return createStoredZip(files, xlsxMime);
}

function prepareWorkbookSheets(sheets: WorkbookSheet[]) {
  const used = new Set<string>();
  return sheets.map((sheet, index) => {
    const base = sanitizeSheetName(sheet.name);
    let name = base;
    let suffix = 2;
    while (used.has(name.toLowerCase())) {
      const extension = ` ${suffix}`;
      name = `${base.slice(0, 31 - extension.length)}${extension}`;
      suffix += 1;
    }
    used.add(name.toLowerCase());
    return { ...sheet, id: index + 1, name };
  });
}

function sanitizeSheetName(name: string) {
  return name.replace(/[\][:*?/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Sheet";
}

function worksheetXml(rows: SheetCell[][]) {
  const maxColumns = Math.max(1, ...rows.map((row) => row.length));
  const body = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row
        .map((value, columnIndex) => {
          const ref = `${columnName(columnIndex + 1)}${rowNumber}`;
          if (typeof value === "number") {
            return `<c r="${ref}"><v>${value}</v></c>`;
          }
          const text = typeof value === "boolean" ? String(value) : String(value ?? "");
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(text)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${columnName(maxColumns)}${Math.max(rows.length, 1)}"/>
  <cols>
    <col min="1" max="${maxColumns}" width="18" customWidth="1"/>
  </cols>
  <sheetData>${body}</sheetData>
</worksheet>`;
}

async function parseXlsxTrades(file: File) {
  const files = await unzipWorkbook(await file.arrayBuffer());
  const decoder = new TextDecoder();
  const sharedStrings = parseSharedStrings(files["xl/sharedStrings.xml"], decoder);
  const sheetPath = resolveSheetPath(files, decoder);
  const sheet = files[sheetPath];
  if (!sheet) {
    throw new Error("Could not find a worksheet in that Excel file.");
  }

  const rows = parseSheetRows(decoder.decode(sheet), sharedStrings);
  if (rows.length < 2) {
    throw new Error("No trade rows found in that Excel file.");
  }

  return rowsToTrades(rows);
}

async function unzipWorkbook(buffer: ArrayBuffer, fileDescription = "an Excel workbook") {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  const eocdOffset = findEndOfCentralDirectory(bytes);
  if (eocdOffset < 0) {
    throw new Error(`That file does not look like ${fileDescription}.`);
  }

  const entryCount = readUint16(bytes, eocdOffset + 10);
  let centralOffset = readUint32(bytes, eocdOffset + 16);
  const files: Record<string, Uint8Array> = {};

  for (let entry = 0; entry < entryCount; entry += 1) {
    if (readUint32(bytes, centralOffset) !== 0x02014b50) {
      throw new Error(`Could not read ${fileDescription} directory.`);
    }

    const method = readUint16(bytes, centralOffset + 10);
    const compressedSize = readUint32(bytes, centralOffset + 20);
    const nameLength = readUint16(bytes, centralOffset + 28);
    const extraLength = readUint16(bytes, centralOffset + 30);
    const commentLength = readUint16(bytes, centralOffset + 32);
    const localHeaderOffset = readUint32(bytes, centralOffset + 42);
    const name = decoder.decode(bytes.slice(centralOffset + 46, centralOffset + 46 + nameLength));
    const localNameLength = readUint16(bytes, localHeaderOffset + 26);
    const localExtraLength = readUint16(bytes, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

    if (!name.endsWith("/")) {
      if (method === 0) {
        files[name] = compressedData;
      } else if (method === 8) {
        files[name] = await inflateDeflateRaw(compressedData);
      } else {
        throw new Error(`That file uses an unsupported compression format.`);
      }
    }

    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

async function inflateDeflateRaw(data: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot import compressed Excel files yet. Try exporting from this journal first.");
  }

  const stream = new Blob([bytesToArrayBuffer(data)]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function parseSharedStrings(file: Uint8Array | undefined, decoder: TextDecoder) {
  if (!file) {
    return [];
  }

  const document = parseXml(decoder.decode(file));
  return Array.from(document.getElementsByTagName("si")).map((item) =>
    Array.from(item.getElementsByTagName("t"))
      .map((text) => text.textContent ?? "")
      .join(""),
  );
}

function resolveSheetPath(files: Record<string, Uint8Array>, decoder: TextDecoder) {
  if (files["xl/worksheets/sheet1.xml"]) {
    return "xl/worksheets/sheet1.xml";
  }

  const workbook = files["xl/workbook.xml"];
  const rels = files["xl/_rels/workbook.xml.rels"];
  if (!workbook || !rels) {
    return "xl/worksheets/sheet1.xml";
  }

  const sheet = parseXml(decoder.decode(workbook)).getElementsByTagName("sheet")[0];
  const relationshipId = sheet?.getAttribute("r:id");
  const relationship = Array.from(parseXml(decoder.decode(rels)).getElementsByTagName("Relationship")).find(
    (item) => item.getAttribute("Id") === relationshipId,
  );
  const target = relationship?.getAttribute("Target") ?? "worksheets/sheet1.xml";
  return target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^xl\//, "")}`;
}

function parseSheetRows(xml: string, sharedStrings: string[]) {
  const document = parseXml(xml);
  return Array.from(document.getElementsByTagName("row"))
    .map((row) => {
      const values: string[] = [];
      Array.from(row.getElementsByTagName("c")).forEach((cell) => {
        const ref = cell.getAttribute("r") ?? "";
        const column = columnIndex(ref);
        if (column >= 0) {
          values[column] = readCellValue(cell, sharedStrings);
        }
      });
      return values;
    })
    .filter((row) => row.some((cell) => String(cell ?? "").trim()));
}

function readCellValue(cell: Element, sharedStrings: string[]) {
  const type = cell.getAttribute("t");
  if (type === "inlineStr") {
    return Array.from(cell.getElementsByTagName("t"))
      .map((text) => text.textContent ?? "")
      .join("");
  }

  const value = cell.getElementsByTagName("v")[0]?.textContent ?? "";
  if (type === "s") {
    return sharedStrings[Number(value)] ?? "";
  }
  return value;
}

function rowsToTrades(rows: string[][]) {
  const headerIndex = rows.findIndex((row) => headerScore(row) >= 5);
  if (headerIndex < 0) {
    throw new Error("Excel needs columns for Date, BE Hit, First TP R, Max R, and Actual R.");
  }

  const headers = rows[headerIndex] ?? [];
  const columns: Partial<Record<keyof ImportTrade, number>> = {};
  headers.forEach((header, index) => {
    const key = headerAliases[normalizeHeader(header)];
    if (key && columns[key] === undefined) {
      columns[key] = index;
    }
  });

  if (
    columns.date === undefined ||
    columns.beHit === undefined ||
    columns.firstTpR === undefined ||
    columns.maxR === undefined ||
    columns.actualR === undefined
  ) {
    throw new Error("Excel needs Date, BE Hit, First TP R, Max R, and Actual R columns.");
  }

  return rows
    .slice(headerIndex + 1)
    .map((row) => {
      const beHit = parseBeHit(row[columns.beHit as number]);
      return normalizeTrade({
        actualR: beHit === "No" ? -1 : parseNumberCell(row[columns.actualR as number]),
        attachments: columns.attachments === undefined ? [] : row[columns.attachments],
        beHit,
        date: parseDateCell(row[columns.date as number]),
        direction: columns.direction === undefined ? "" : row[columns.direction],
        exitType: columns.exitType === undefined ? "" : row[columns.exitType],
        firstTpR: parseNumberCell(row[columns.firstTpR as number]) ?? (beHit === "No" ? 1 : undefined),
        id: columns.id === undefined ? undefined : row[columns.id],
        instrument: columns.instrument === undefined ? "" : row[columns.instrument],
        lessonLearned: columns.lessonLearned === undefined ? "" : row[columns.lessonLearned],
        maxR: parseNumberCell(row[columns.maxR as number]) ?? (beHit === "No" ? 0 : undefined),
        mistakeCategory: columns.mistakeCategory === undefined ? "" : row[columns.mistakeCategory],
        mistakeNotes: columns.mistakeNotes === undefined ? "" : row[columns.mistakeNotes],
        notes: columns.notes === undefined ? "" : row[columns.notes],
        session: columns.session === undefined ? "" : row[columns.session],
        setupName: columns.setupName === undefined ? "" : row[columns.setupName],
        tags: columns.tags === undefined ? "" : row[columns.tags],
      });
    })
    .filter((trade): trade is ImportTrade => Boolean(trade));
}

const headerAliases: Record<string, keyof ImportTrade> = {
  actual: "actualR",
  actualr: "actualR",
  actualexit: "actualR",
  actualresult: "actualR",
  attachment: "attachments",
  attachments: "attachments",
  be: "beHit",
  breakevenhit: "beHit",
  behit: "beHit",
  behitno: "beHit",
  behityes: "beHit",
  breakeven: "beHit",
  comment: "notes",
  comments: "notes",
  date: "date",
  detailedjournal: "notes",
  detailednote: "notes",
  detailednotes: "notes",
  direction: "direction",
  entrydate: "date",
  exitr: "actualR",
  exittype: "exitType",
  firsttarget: "firstTpR",
  firsttargetr: "firstTpR",
  firsttakeprofit: "firstTpR",
  firsttp: "firstTpR",
  firsttpr: "firstTpR",
  highestr: "maxR",
  id: "id",
  importid: "id",
  instrument: "instrument",
  lesson: "lessonLearned",
  lessonlearned: "lessonLearned",
  lessons: "lessonLearned",
  journalid: "id",
  mistake: "mistakeNotes",
  mistakecategory: "mistakeCategory",
  mistakenotes: "mistakeNotes",
  mistakes: "mistakeNotes",
  maxfavorabler: "maxR",
  maxmove: "maxR",
  maxr: "maxR",
  maximumr: "maxR",
  mfe: "maxR",
  netr: "actualR",
  note: "notes",
  notes: "notes",
  plr: "actualR",
  pnl: "actualR",
  pnlr: "actualR",
  r: "actualR",
  realizedr: "actualR",
  resultr: "actualR",
  review: "notes",
  session: "session",
  setup: "setupName",
  setupname: "setupName",
  tag: "tags",
  tags: "tags",
  takeprofit1: "firstTpR",
  target1: "firstTpR",
  tp1: "firstTpR",
  tradeid: "id",
  tradedate: "date",
};

function headerScore(row: string[]) {
  const found = new Set<keyof ImportTrade>();
  row.forEach((header) => {
    const key = headerAliases[normalizeHeader(header)];
    if (key) {
      found.add(key);
    }
  });
  return ["date", "beHit", "firstTpR", "maxR", "actualR"].filter((key) =>
    found.has(key as keyof ImportTrade),
  ).length;
}

function parseDateCell(value: string | undefined) {
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const serial = Number(text);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    return formatDate(new Date(Date.UTC(1899, 11, 30) + serial * 86400000));
  }

  const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashDate) {
    const year = Number(slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3]);
    return `${year}-${slashDate[1].padStart(2, "0")}-${slashDate[2].padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : formatDate(parsed);
}

function parseBeHit(value: string | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["yes", "y", "true", "1"].includes(normalized)) {
    return "Yes";
  }
  if (["no", "n", "false", "0"].includes(normalized)) {
    return "No";
  }
  return value;
}

function parseNumberCell(value: string | undefined) {
  const cleaned = String(value ?? "").replace(/[,$Rr\s]/g, "");
  if (!cleaned) {
    return undefined;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeHeader(value: string | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function formatDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

function parseXml(xml: string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.getElementsByTagName("parsererror").length) {
    throw new Error("Could not read the Excel XML content.");
  }
  return document;
}

function columnName(index: number) {
  let name = "";
  let value = index;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function columnIndex(ref: string) {
  const match = ref.match(/[A-Z]+/i);
  if (!match) {
    return -1;
  }

  return match[0]
    .toUpperCase()
    .split("")
    .reduce((sum, character) => sum * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function createStoredZip(files: Record<string, ZipFileBody>, type = zipMime) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  Object.entries(files).forEach(([name, body]) => {
    const nameBytes = encoder.encode(name);
    const data = zipFileBytes(body, encoder);
    const checksum = crc32(data);
    const localHeader = zipLocalHeader(nameBytes, data.length, checksum);
    const centralHeader = zipCentralHeader(nameBytes, data.length, checksum, offset);
    chunks.push(localHeader, data);
    centralDirectory.push(centralHeader);
    offset += localHeader.length + data.length;
  });

  const centralStart = offset;
  centralDirectory.forEach((chunk) => {
    chunks.push(chunk);
    offset += chunk.length;
  });
  chunks.push(zipEndRecord(centralDirectory.length, offset - centralStart, centralStart));

  return new Blob(chunks.map(bytesToArrayBuffer), { type });
}

function zipFileBytes(body: ZipFileBody, encoder: TextEncoder) {
  if (typeof body === "string") {
    return encoder.encode(body);
  }

  return body instanceof Uint8Array ? body : new Uint8Array(body);
}

function assignBackupPaths(sources: AttachmentSource[]) {
  const usedPaths = new Set<string>();
  return sources.map((source, index) => {
    const folder = source.sourceType === "Trade" ? "trades" : "daily-journals";
    const extension = fileExtension(source.attachment.filename, source.attachment.contentType);
    const fallback = `attachment-${String(index + 1).padStart(3, "0")}${extension}`;
    const safeName = safeExportSegment(source.attachment.filename, fallback);
    const filename = extension && !safeName.toLowerCase().endsWith(extension) ? `${safeName}${extension}` : safeName;
    const path = uniqueZipPath(
      `attachments/${folder}/${source.date || "undated"}/${String(index + 1).padStart(3, "0")}-${filename}`,
      usedPaths,
    );
    return { ...source, backupPath: path };
  });
}

function uniqueZipPath(path: string, usedPaths: Set<string>) {
  if (!usedPaths.has(path)) {
    usedPaths.add(path);
    return path;
  }

  const slashIndex = path.lastIndexOf("/");
  const dotIndex = path.lastIndexOf(".");
  const hasExtension = dotIndex > slashIndex;
  const base = hasExtension ? path.slice(0, dotIndex) : path;
  const extension = hasExtension ? path.slice(dotIndex) : "";
  let copy = 2;
  let candidate = `${base}-${copy}${extension}`;
  while (usedPaths.has(candidate)) {
    copy += 1;
    candidate = `${base}-${copy}${extension}`;
  }
  usedPaths.add(candidate);
  return candidate;
}

function attachmentSourceKey(sourceType: AttachmentSource["sourceType"], sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

function attachmentsBySource(sources: AttachmentSource[]) {
  const map = new Map<string, AttachmentSource[]>();
  sources.forEach((source) => {
    const key = attachmentSourceKey(source.sourceType, source.sourceId);
    map.set(key, [...(map.get(key) ?? []), source]);
  });
  return map;
}

function backupAttachment(source: AttachmentSource) {
  return {
    ...source.attachment,
    backupPath: source.backupPath ?? "",
  };
}

function backupTradeRecord(trade: ExitTrade, sourceMap: Map<string, AttachmentSource[]>) {
  return {
    ...trade,
    attachments: (sourceMap.get(attachmentSourceKey("Trade", trade.id)) ?? []).map(backupAttachment),
  };
}

function backupDailyJournalRecord(journal: DailyJournal, sourceMap: Map<string, AttachmentSource[]>) {
  return {
    ...journal,
    attachments: (sourceMap.get(attachmentSourceKey("Daily Journal", journal.id)) ?? []).map(backupAttachment),
  };
}

function backupReadmeMarkdown(exportedAt: string, attachmentCount: number, skippedCount: number) {
  return [
    "# Adalwolf Trade Journal Backup",
    "",
    `Exported at: ${exportedAt}`,
    "",
    "This ZIP is a safety backup for the trading journal.",
    "",
    "Contents:",
    "- `backup.json`: all trades, daily journals, attachment metadata, and backup paths.",
    "- `ai-analysis.md`: plain-English analysis packet for ChatGPT, Codex, Claude, or another AI reviewer.",
    "- `complete-journal-export.xlsx`: spreadsheet workbook with raw data and calculated analysis sheets.",
    "- `attachments/`: downloaded screenshot and journal attachment files.",
    "",
    "Not included:",
    "- Login credentials and password hashes.",
    "- Public Device Files, because those are convenience files rather than private journal records.",
    "",
    `Attachments included: ${attachmentCount}`,
    `Attachment download warnings: ${skippedCount}`,
  ].join("\n");
}

function aiAnalysisMarkdown(
  trades: ExitTrade[],
  journals: DailyJournal[],
  range: ActiveReportRange,
  sources: AttachmentSource[],
  context?: AiAnalysisContext,
) {
  const summary = tradeStatsForExport(trades);
  const quality = tradeQualityAnalysis(trades, journals);
  const activeFilters = context
    ? [
        context.filters.session ? `Session=${context.filters.session}` : "",
        context.filters.setup ? `Setup=${context.filters.setup}` : "",
        context.filters.tag ? `Tag=${context.filters.tag}` : "",
        context.filters.result !== "all" ? `Result=${context.filters.result}` : "",
        context.filters.beHit !== "all" ? `BE=${context.filters.beHit}` : "",
        context.filters.paRating !== "all" ? `PA=${context.filters.paRating}` : "",
        context.filters.breakeven !== "all" ? `BE trades=${context.filters.breakeven}` : "",
        context.logSearch.trim() ? `Search=${context.logSearch.trim()}` : "",
      ].filter(Boolean)
    : [];

  return [
    "# AI Trading Journal Analysis Packet",
    "",
    "Use this packet to analyze execution, discipline, exits, setup quality, and journal patterns.",
    "",
    "## Context",
    "- Journal type: R-based futures trading journal",
    "- Main goal: improve patience, discipline, execution, and exit quality",
    `- Export range: ${range.label}`,
    `- Active filters: ${activeFilters.length ? activeFilters.join(", ") : "None"}`,
    "",
    "## Summary",
    `- Trades: ${summary.trades}`,
    `- Daily journals: ${journals.length}`,
    `- Net R: ${summary.netR.toFixed(2)}R`,
    `- Win rate: ${summary.winRate.toFixed(1)}%`,
    `- Average R: ${summary.avgR.toFixed(2)}R`,
    `- Profit factor: ${ratio(summary.profitFactor)}`,
    `- Attachments/screenshots referenced: ${sources.length}`,
    "",
    "## Setup Quality",
    qualityRowsMarkdown(quality.setups),
    "",
    "## Session Quality",
    qualityRowsMarkdown(quality.sessions),
    "",
    "## Discipline Follow-through",
    quality.discipline.length
      ? quality.discipline
          .map((row) => `- ${row.label}: ${row.rate.toFixed(1)}% followed (${row.yes} yes, ${row.no} no)`)
          .join("\n")
      : "- No discipline data found in Daily Journal narratives.",
    "",
    "## Emotion Pattern",
    quality.emotions.length
      ? quality.emotions
          .slice(0, 6)
          .map((row) => `- ${row.label}: ${row.count} occurrences, ${row.total.toFixed(2)}R linked`)
          .join("\n")
      : "- No emotion data found in Daily Journal narratives.",
    "",
    "## Notes & Tags",
    quality.tags.length
      ? quality.tags
          .slice(0, 8)
          .map((row) => `- #${row.label}: ${row.total.toFixed(2)}R over ${row.trades} trades`)
          .join("\n")
      : "- No tag data available.",
    quality.noteKeywords.length
      ? `Common note words: ${quality.noteKeywords
          .slice(0, 12)
          .map((row) => `${row.keyword} (${row.count})`)
          .join(", ")}`
      : "Common note words: none found.",
    "",
    "## Suggested AI Review Questions",
    "- What patterns do you see in my losing trades?",
    "- Which setup and session combination has the best expectancy?",
    "- Where am I exiting too early or leaving too much R behind?",
    "- What behavior should I focus on next month?",
    "- What do my daily narratives suggest about psychology and execution?",
    "",
    "## Screenshot Notes",
    "Screenshots are included in the ZIP `attachments/` folder when they could be downloaded. See the JSON file or the workbook `Attachments Index` sheet for exact file mapping.",
  ].join("\n");
}

function qualityRowsMarkdown(rows: TradeQualityRow[]) {
  return rows.length
    ? rows
        .slice(0, 6)
        .map(
          (row) =>
            `- ${row.label}: ${row.score.toFixed(1)} quality, ${row.total.toFixed(2)}R, ${row.trades} trades, ${row.winRate.toFixed(1)}% win`,
        )
        .join("\n")
    : "- No data available.";
}

function aiReviewPromptMarkdown(range: ActiveReportRange) {
  return [
    "# AI Review Prompt",
    "",
    "You are reviewing my R-based trading journal. Use the JSON, workbook, markdown summary, and screenshots in this ZIP.",
    "",
    `Focus range: ${range.label}`,
    "",
    "Please analyze:",
    "- Best and worst setup quality.",
    "- Best and worst session quality.",
    "- Whether my actual exits are weaker than fixed exit alternatives.",
    "- Discipline problems from Valid setup, risk, entry rule, and exit rule answers.",
    "- Emotion patterns and whether certain emotions correlate with bad trades.",
    "- Price action rating versus outcome.",
    "- Repeated tags, note keywords, and narrative themes.",
    "- Screenshots that look especially important based on the trade and journal context.",
    "",
    "Give me a direct trader-style review with priorities, not generic motivation.",
  ].join("\n");
}

function screenshotIndexMarkdown(sources: AttachmentSource[]) {
  return [
    "# Screenshot Index",
    "",
    "| Date | Source | Filename | ZIP Path | Original URL |",
    "| --- | --- | --- | --- | --- |",
    ...sources.map((source) =>
      [
        source.date,
        `${source.sourceType}: ${source.sourceLabel}`,
        source.attachment.filename,
        source.backupPath ?? "",
        source.attachment.url,
      ]
        .map((value) => String(value).replace(/\|/g, "\\|"))
        .join(" | "),
    ).map((row) => `| ${row} |`),
  ].join("\n");
}

function serializableQualityRows(rows: TradeQualityRow[]) {
  return rows.map((row) => ({
    ...row,
    profitFactor: row.profitFactor === Infinity ? "Infinity" : row.profitFactor,
  }));
}

function serializableTradeStats(summary: ReturnType<typeof tradeStatsForExport>) {
  return {
    ...summary,
    profitFactor: summary.profitFactor === Infinity ? "Infinity" : summary.profitFactor,
  };
}

function aiAnalysisData(
  trades: ExitTrade[],
  journals: DailyJournal[],
  range: ActiveReportRange,
  sources: AttachmentSource[],
  context?: AiAnalysisContext,
) {
  const quality = tradeQualityAnalysis(trades, journals);
  return {
    app: "Adalwolf Trade Journal",
    exportedAt: new Date().toISOString(),
    format: "adalwolf-ai-analysis-packet",
    purpose: "Read-only AI review of trade execution, exits, setup quality, psychology, notes, tags, and screenshots.",
    range,
    context: context
      ? {
          filters: context.filters,
          logSearch: context.logSearch,
        }
      : undefined,
    summary: serializableTradeStats(tradeStatsForExport(trades)),
    quality: {
      discipline: quality.discipline,
      emotions: quality.emotions,
      noteKeywords: quality.noteKeywords,
      paRatings: serializableQualityRows(quality.paRatings),
      sessions: serializableQualityRows(quality.sessions),
      setupRatings: serializableQualityRows(quality.setupRatings),
      setupSessions: serializableQualityRows(quality.setupSessions),
      setups: serializableQualityRows(quality.setups),
      tags: serializableQualityRows(quality.tags),
    },
    data: {
      dailyJournals: journals,
      trades,
    },
    screenshotIndex: sources.map((source) => ({
      backupPath: source.backupPath,
      contentType: source.attachment.contentType,
      date: source.date,
      filename: source.attachment.filename,
      id: source.attachment.id,
      size: source.attachment.size,
      sourceId: source.sourceId,
      sourceLabel: source.sourceLabel,
      sourceType: source.sourceType,
      uploadedAt: source.attachment.uploadedAt,
      url: source.attachment.url,
    })),
  };
}

async function createAiAnalysisZip(
  trades: ExitTrade[],
  journals: DailyJournal[],
  range: ActiveReportRange,
  context?: AiAnalysisContext,
) {
  const sources = assignBackupPaths(collectAttachmentSources(trades, journals));
  const skippedAttachments: Array<{
    error: string;
    filename: string;
    sourceId: string;
    sourceType: AttachmentSource["sourceType"];
    url: string;
  }> = [];
  const files: Record<string, ZipFileBody> = {};

  for (const source of sources) {
    try {
      const response = await fetch(source.attachment.url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      files[source.backupPath as string] = await response.arrayBuffer();
    } catch (error) {
      skippedAttachments.push({
        error: error instanceof Error ? error.message : "Unable to download attachment",
        filename: source.attachment.filename,
        sourceId: source.sourceId,
        sourceType: source.sourceType,
        url: source.attachment.url,
      });
    }
  }

  files["AI_REVIEW_PROMPT.md"] = aiReviewPromptMarkdown(range);
  files["ai-analysis.md"] = aiAnalysisMarkdown(trades, journals, range, sources, context);
  files["ai-analysis.json"] = JSON.stringify(aiAnalysisData(trades, journals, range, sources, context), null, 2);
  files["ai-analysis-workbook.xlsx"] = await createWorkbookXlsx(
    completeWorkbookSheets(trades, journals, range, sources),
  ).arrayBuffer();
  files["screenshot-index.md"] = screenshotIndexMarkdown(sources);

  if (skippedAttachments.length) {
    files["attachment-download-warnings.json"] = JSON.stringify(skippedAttachments, null, 2);
  }

  return {
    attachmentCount: sources.length - skippedAttachments.length,
    blob: createStoredZip(files, zipMime),
    skippedCount: skippedAttachments.length,
  };
}

async function createFullBackupZip(trades: ExitTrade[], journals: DailyJournal[]) {
  const exportedAt = new Date().toISOString();
  const range: ActiveReportRange = { label: "All data", mode: "all" };
  const sources = assignBackupPaths(collectAttachmentSources(trades, journals));
  const sourceMap = attachmentsBySource(sources);
  const skippedAttachments: Array<{
    error: string;
    filename: string;
    sourceId: string;
    sourceType: AttachmentSource["sourceType"];
    url: string;
  }> = [];
  const files: Record<string, ZipFileBody> = {};

  for (const source of sources) {
    try {
      const response = await fetch(source.attachment.url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      files[source.backupPath as string] = await response.arrayBuffer();
    } catch (error) {
      skippedAttachments.push({
        error: error instanceof Error ? error.message : "Unable to download attachment",
        filename: source.attachment.filename,
        sourceId: source.sourceId,
        sourceType: source.sourceType,
        url: source.attachment.url,
      });
    }
  }

  const backup = {
    app: "Adalwolf Trade Journal",
    exportedAt,
    format: "adalwolf-journal-backup",
    includes: {
      attachmentFiles: sources.length - skippedAttachments.length,
      authSettings: false,
      deviceFiles: false,
      screenshots: true,
    },
    skippedAttachments,
    version: "1.1",
    data: {
      dailyJournals: journals.map((journal) => backupDailyJournalRecord(journal, sourceMap)),
      trades: trades.map((trade) => backupTradeRecord(trade, sourceMap)),
    },
    attachmentIndex: sources.map((source) => ({
      backupPath: source.backupPath,
      contentType: source.attachment.contentType,
      date: source.date,
      filename: source.attachment.filename,
      id: source.attachment.id,
      size: source.attachment.size,
      sourceId: source.sourceId,
      sourceLabel: source.sourceLabel,
      sourceType: source.sourceType,
      uploadedAt: source.attachment.uploadedAt,
      url: source.attachment.url,
    })),
  };

  files["backup.json"] = JSON.stringify(backup, null, 2);
  files["README.md"] = backupReadmeMarkdown(exportedAt, sources.length - skippedAttachments.length, skippedAttachments.length);
  files["ai-analysis.md"] = aiAnalysisMarkdown(trades, journals, range, sources);
  files["complete-journal-export.xlsx"] = await createWorkbookXlsx(
    completeWorkbookSheets(trades, journals, range, sources),
  ).arrayBuffer();

  if (skippedAttachments.length) {
    files["attachment-download-warnings.json"] = JSON.stringify(skippedAttachments, null, 2);
  }

  return {
    attachmentCount: sources.length - skippedAttachments.length,
    blob: createStoredZip(files, zipMime),
    skippedCount: skippedAttachments.length,
  };
}

function zipLocalHeader(nameBytes: Uint8Array, size: number, checksum: number) {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  const time = zipTime();
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, time.time, true);
  view.setUint16(12, time.date, true);
  view.setUint32(14, checksum, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameBytes.length, true);
  header.set(nameBytes, 30);
  return header;
}

function zipCentralHeader(nameBytes: Uint8Array, size: number, checksum: number, offset: number) {
  const header = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(header.buffer);
  const time = zipTime();
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, time.time, true);
  view.setUint16(14, time.date, true);
  view.setUint32(16, checksum, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint32(42, offset, true);
  header.set(nameBytes, 46);
  return header;
}

function zipEndRecord(entryCount: number, centralSize: number, centralOffset: number) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return header;
}

function zipTime() {
  const now = new Date();
  return {
    date: ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate(),
    time: (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2),
  };
}

let crcTable: Uint32Array | null = null;

function crc32(data: Uint8Array) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      crcTable[index] = value >>> 0;
    }
  }

  let crc = 0xffffffff;
  data.forEach((byte) => {
    crc = (crc >>> 8) ^ (crcTable as Uint32Array)[(crc ^ byte) & 0xff];
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (readUint32(bytes, index) === 0x06054b50) {
      return index;
    }
  }
  return -1;
}

function readUint16(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}

function readUint32(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    switch (character) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}

function normalizeTrade(value: unknown): ImportTrade | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const trade = value as Partial<ExitTrade>;
  const beHit = trade.beHit === "No" ? "No" : trade.beHit === "Yes" ? "Yes" : "";
  const firstTpRValue = Number(trade.firstTpR);
  const maxRValue = Number(trade.maxR);
  const actualRValue = Number(trade.actualR);
  const firstTpR = Number.isFinite(firstTpRValue) && firstTpRValue > 0 ? firstTpRValue : beHit === "No" ? 1 : firstTpRValue;
  const maxR = Number.isFinite(maxRValue) && maxRValue >= 0 ? maxRValue : beHit === "No" ? 0 : maxRValue;
  const actualR = beHit === "No" ? -1 : actualRValue;

  if (
    typeof trade.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(trade.date) ||
    !beHit ||
    !Number.isFinite(firstTpR) ||
    firstTpR <= 0 ||
    !Number.isFinite(maxR) ||
    maxR < 0 ||
    !Number.isFinite(actualR)
  ) {
    return null;
  }

  return {
    actualR,
    attachments: normalizeAttachments(trade.attachments),
    beHit,
    date: trade.date,
    direction: textValue(trade.direction),
    exitType: textValue(trade.exitType),
    firstTpR,
    ...(typeof trade.id === "string" && trade.id.trim() ? { id: trade.id.trim() } : {}),
    instrument: textValue(trade.instrument).toUpperCase(),
    lessonLearned: textValue(trade.lessonLearned),
    maxR,
    mistakeCategory: textValue(trade.mistakeCategory),
    mistakeNotes: textValue(trade.mistakeNotes),
    notes: textValue(trade.notes),
    session: textValue(trade.session),
    setupName: textValue(trade.setupName),
    tags: tagsText(trade.tags),
  };
}

function normalizeStoredTrade(value: unknown): ExitTrade | null {
  const trade = normalizeTrade(value);
  if (!trade || !trade.id) {
    return null;
  }

  const rawTrade = value as Partial<ExitTrade>;
  const createdAt = Number(rawTrade.createdAt);
  const updatedAt = Number(rawTrade.updatedAt);

  return {
    ...trade,
    createdAt: Number.isFinite(createdAt) ? createdAt : undefined,
    id: trade.id,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : undefined,
  };
}

function normalizeDailyJournal(value: unknown): DailyJournal | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const journal = value as Partial<DailyJournal>;
  const priceActionRating = Number(journal.priceActionRating);
  const breakevenTrades = Number(journal.breakevenTrades);
  const createdAt = Number(journal.createdAt);
  const updatedAt = Number(journal.updatedAt);

  if (
    typeof journal.id !== "string" ||
    !journal.id.trim() ||
    typeof journal.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(journal.date)
  ) {
    return null;
  }

  return {
    attachments: normalizeAttachments(journal.attachments),
    breakevenTrades: Number.isFinite(breakevenTrades) ? Math.max(0, Math.floor(breakevenTrades)) : 0,
    createdAt: Number.isFinite(createdAt) ? createdAt : undefined,
    date: journal.date,
    htfBias: textValue(journal.htfBias),
    id: journal.id.trim(),
    narrative: textValue(journal.narrative),
    orm: textValue(journal.orm),
    priceActionRating: Number.isFinite(priceActionRating) ? priceActionRating : 0,
    reviewNotes: textValue(journal.reviewNotes),
    tags: tagsText(journal.tags),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : undefined,
  };
}

function draftFromDailyJournal(journal: DailyJournal): DraftDailyJournal {
  return {
    attachments: journal.attachments,
    breakevenTrades: journal.breakevenTrades,
    date: journal.date,
    htfBias: journal.htfBias,
    narrative: journal.narrative,
    orm: journal.orm,
    priceActionRating: journal.priceActionRating,
    reviewNotes: journal.reviewNotes,
    tags: journal.tags,
  };
}

function jsonTradeValues(parsed: unknown) {
  return Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && "trades" in parsed
      ? (parsed as { trades?: unknown[] }).trades ?? []
      : parsed && typeof parsed === "object" && "data" in parsed
        ? ((parsed as { data?: { trades?: unknown[] } }).data?.trades ?? [])
      : [];
}

function jsonDailyJournalValues(parsed: unknown) {
  return parsed && typeof parsed === "object" && "dailyJournals" in parsed
    ? (parsed as { dailyJournals?: unknown[] }).dailyJournals ?? []
    : parsed && typeof parsed === "object" && "journals" in parsed
      ? (parsed as { journals?: unknown[] }).journals ?? []
      : parsed && typeof parsed === "object" && "data" in parsed
        ? ((parsed as { data?: { dailyJournals?: unknown[] } }).data?.dailyJournals ?? [])
        : [];
}

function parseJsonTrades(parsed: unknown) {
  const rawTrades = jsonTradeValues(parsed);
  return rawTrades.map(normalizeTrade).filter((trade): trade is ImportTrade => Boolean(trade));
}

function parseJsonDailyJournals(parsed: unknown) {
  const rawJournals = jsonDailyJournalValues(parsed);

  return rawJournals.map(normalizeDailyJournal).filter((journal): journal is ImportDailyJournal => Boolean(journal));
}

function parseJsonImport(parsed: unknown) {
  return {
    dailyJournals: parseJsonDailyJournals(parsed),
    trades: parseJsonTrades(parsed),
  };
}

function normalizeRestorableTrade(value: unknown): RestorableTrade | null {
  const trade = normalizeTrade(value);
  if (!trade || !value || typeof value !== "object") {
    return null;
  }

  return {
    ...trade,
    attachments: normalizeRestorableAttachments((value as { attachments?: unknown }).attachments),
  };
}

function normalizeRestorableDailyJournal(value: unknown): RestorableDailyJournal | null {
  const journal = normalizeDailyJournal(value);
  if (!journal || !value || typeof value !== "object") {
    return null;
  }

  return {
    ...journal,
    attachments: normalizeRestorableAttachments((value as { attachments?: unknown }).attachments),
  };
}

function parseRestorableJsonImport(parsed: unknown) {
  return {
    dailyJournals: jsonDailyJournalValues(parsed)
      .map(normalizeRestorableDailyJournal)
      .filter((journal): journal is RestorableDailyJournal => Boolean(journal)),
    trades: jsonTradeValues(parsed)
      .map(normalizeRestorableTrade)
      .filter((trade): trade is RestorableTrade => Boolean(trade)),
  };
}

function backupJsonEntry(files: Record<string, Uint8Array>) {
  return (
    files["backup.json"] ??
    Object.entries(files).find(([name]) => name.toLowerCase().endsWith("/backup.json"))?.[1]
  );
}

function plainAttachment(attachment: RestorableAttachment): TradeAttachment {
  return {
    contentType: attachment.contentType,
    filename: attachment.filename,
    id: attachment.id,
    size: attachment.size,
    uploadedAt: attachment.uploadedAt,
    url: attachment.url,
  };
}

function restoredAttachmentFilename(attachment: RestorableAttachment) {
  const fallbackExtension = fileExtension(attachment.filename, attachment.contentType);
  const filename = safeExportSegment(attachment.filename, `restored-attachment${fallbackExtension}`);
  return fallbackExtension && !filename.toLowerCase().endsWith(fallbackExtension)
    ? `${filename}${fallbackExtension}`
    : filename;
}

function restoreDataMonths(trades: RestorableTrade[], journals: RestorableDailyJournal[]) {
  return Array.from(
    new Set(
      [...trades.map((trade) => monthKey(trade.date)), ...journals.map((journal) => monthKey(journal.date))].filter(
        Boolean,
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function restoreDataYears(months: string[]) {
  return Array.from(new Set(months.map((month) => month.slice(0, 4)))).sort((left, right) => left.localeCompare(right));
}

function restoreRangeLabel(range: ActiveReportRange) {
  if (range.mode === "all") {
    return "All backup data";
  }

  if (range.mode === "year") {
    return `Year ${range.year}`;
  }

  if (range.from && range.to && range.from !== range.to) {
    return `${monthTabLabel(range.from)} - ${monthTabLabel(range.to)}`;
  }

  return monthLabel(range.from ?? range.to ?? initialMonth);
}

function restoreRangeFromSelection(
  mode: ReportMode,
  month: string,
  year: string,
  startMonth: string,
  endMonth: string,
): ActiveReportRange {
  if (mode === "all") {
    return { label: "All backup data", mode };
  }

  if (mode === "year") {
    return { label: `Year ${year}`, mode, year };
  }

  const range = mode === "custom" ? normalizeMonthRange(startMonth, endMonth) : { from: month, to: month };
  return { ...range, label: restoreRangeLabel({ ...range, mode }), mode };
}

function restorableAttachmentCount(trades: RestorableTrade[], journals: RestorableDailyJournal[]) {
  return (
    trades.reduce((sum, trade) => sum + trade.attachments.length, 0) +
    journals.reduce((sum, journal) => sum + journal.attachments.length, 0)
  );
}

function scopedRestoreData(pendingRestore: PendingRestore, range: ActiveReportRange, fallbackMonth: string) {
  const trades = pendingRestore.trades.filter((trade) => dateMatchesReportRange(trade.date, range, fallbackMonth));
  const dailyJournals = pendingRestore.dailyJournals.filter((journal) =>
    dateMatchesReportRange(journal.date, range, fallbackMonth),
  );

  return {
    attachmentReferences: restorableAttachmentCount(trades, dailyJournals),
    dailyJournals,
    trades,
  };
}

export default function Home({ initialView = "dashboard" }: { initialView?: JournalShellView }) {
  const [trades, setTrades] = useState<ExitTrade[]>([]);
  const [draft, setDraft] = useState<DraftTrade>(() => defaultDraft());
  const [dailyJournals, setDailyJournals] = useState<DailyJournal[]>([]);
  const [dailyDraft, setDailyDraft] = useState<DraftDailyJournal>(() => defaultDailyJournal());
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(currentDateKey());
  const { theme, toggleTheme } = useJournalTheme();
  const [reportMode, setReportMode] = useState<ReportMode>("month");
  const [customStartMonth, setCustomStartMonth] = useState(initialMonth);
  const [customEndMonth, setCustomEndMonth] = useState(initialMonth);
  const [deviceFiles, setDeviceFiles] = useState<DeviceFile[]>([]);
  const [deviceFolder, setDeviceFolder] = useState<DeviceFolder | null>(null);
  const [deviceSafety, setDeviceSafety] = useState<DeviceSafety | null>(null);
  const [trashFilter, setTrashFilter] = useState<TrashFilter>("all");
  const [trashItems, setTrashItems] = useState<JournalTrashItem[]>([]);
  const [tradeSort, setTradeSort] = useState<TradeSort>({ direction: "desc", key: "date" });
  const [attachmentPreview, setAttachmentPreview] = useState<AttachmentPreviewState | null>(null);
  const [attachmentZoom, setAttachmentZoom] = useState(1);
  const [filters, setFilters] = useState<JournalFilters>(() => defaultJournalFilters);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [backupReminderDismissedAt, setBackupReminderDismissedAt] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedTextTarget, setExpandedTextTarget] = useState<TextEditorTarget | null>(null);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const [isDeviceLoading, setIsDeviceLoading] = useState(true);
  const [isDeviceUploading, setIsDeviceUploading] = useState(false);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [isDailyJournalEditing, setIsDailyJournalEditing] = useState(false);
  const [isBackupReminderReady, setIsBackupReminderReady] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDailyJournalLoading, setIsDailyJournalLoading] = useState(true);
  const [isDailyJournalSaving, setIsDailyJournalSaving] = useState(false);
  const [isDailyJournalAttachmentUploading, setIsDailyJournalAttachmentUploading] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTrashLoading, setIsTrashLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft>(() => emptyPasswordDraft());
  const [restoreEndMonth, setRestoreEndMonth] = useState(initialMonth);
  const [restoreMonth, setRestoreMonth] = useState(initialMonth);
  const [restoreScopeMode, setRestoreScopeMode] = useState<ReportMode>("all");
  const [restoreStartMonth, setRestoreStartMonth] = useState(initialMonth);
  const [restoreYear, setRestoreYear] = useState(initialMonth.slice(0, 4));
  const [selectedTradeDetailId, setSelectedTradeDetailId] = useState<string | null>(null);
  const [deviceNotice, setDeviceNotice] = useState("");
  const [securityNotice, setSecurityNotice] = useState("");
  const [trashNotice, setTrashNotice] = useState("");
  const dataMenuRef = useRef<HTMLDivElement | null>(null);
  const dailyJournalPasteHandlerRef = useRef<((event: globalThis.ClipboardEvent) => void) | null>(null);
  const selectedMonthTabRef = useRef<HTMLButtonElement | null>(null);

  const handleUnauthorized = useCallback((response: Response) => {
    if (response.status === 401) {
      window.location.href = "/";
      return true;
    }
    return false;
  }, []);

  const loadTrades = useCallback(async () => {
    setIsLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/trades", { cache: "no-store" });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as { trades?: ExitTrade[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load trades");
      }
      setTrades((data.trades ?? []).map(normalizeStoredTrade).filter((trade): trade is ExitTrade => Boolean(trade)));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load trades");
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  const loadDailyJournals = useCallback(async () => {
    setIsDailyJournalLoading(true);
    try {
      const response = await fetch("/api/daily-journals", { cache: "no-store" });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as DailyJournalsResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load daily journals");
      }
      setDailyJournals(
        (data.journals ?? [])
          .map(normalizeDailyJournal)
          .filter((journal): journal is DailyJournal => Boolean(journal)),
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load daily journals");
    } finally {
      setIsDailyJournalLoading(false);
    }
  }, [handleUnauthorized]);

  const loadDeviceFiles = useCallback(async () => {
    setIsDeviceLoading(true);
    try {
      const response = await fetch("/api/device-files", { cache: "no-store" });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as DeviceFilesResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load device files");
      }

      setDeviceFolder(data.folder ?? null);
      setDeviceFiles(data.files ?? []);
      setDeviceSafety(data.safety ?? null);
    } catch (error) {
      setDeviceNotice(error instanceof Error ? error.message : "Unable to load device files");
    } finally {
      setIsDeviceLoading(false);
    }
  }, [handleUnauthorized]);

  const loadTrash = useCallback(async () => {
    setIsTrashLoading(true);
    try {
      const response = await fetch("/api/trash", { cache: "no-store" });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as TrashResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load Recently Deleted");
      }
      setTrashItems(data.items ?? []);
    } catch (error) {
      setTrashNotice(error instanceof Error ? error.message : "Unable to load Recently Deleted");
    } finally {
      setIsTrashLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTrades();
      void loadDailyJournals();
      void loadDeviceFiles();
      void loadTrash();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDailyJournals, loadDeviceFiles, loadTrades, loadTrash]);

  useEffect(() => {
    const storedBackupAt = Number(decodeURIComponent(readClientCookie(backupReminderStorageKey)));
    const storedDismissedAt = Number(decodeURIComponent(readClientCookie(backupReminderDismissedStorageKey)));
    setLastBackupAt(Number.isFinite(storedBackupAt) && storedBackupAt > 0 ? storedBackupAt : null);
    setBackupReminderDismissedAt(
      Number.isFinite(storedDismissedAt) && storedDismissedAt > 0 ? storedDismissedAt : null,
    );
    setIsBackupReminderReady(true);
  }, []);

  useEffect(() => {
    if (!isDataMenuOpen) {
      return undefined;
    }

    function closeMenu(event: MouseEvent) {
      if (!dataMenuRef.current?.contains(event.target as Node)) {
        setIsDataMenuOpen(false);
      }
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDataMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isDataMenuOpen]);

  const sortedTrades = useMemo(
    () =>
      [...trades].sort((a, b) => {
        const dateSort = b.date.localeCompare(a.date);
        return dateSort || (b.createdAt ?? 0) - (a.createdAt ?? 0);
      }),
    [trades],
  );

  const monthlyTrades = useMemo(
    () => sortedTrades.filter((trade) => monthKey(trade.date) === selectedMonth),
    [selectedMonth, sortedTrades],
  );

  const currentReportYear = currentMonthKey().slice(0, 4);
  const reportRange = useMemo<ActiveReportRange>(() => {
    if (reportMode === "all") {
      return {
        label: "All trades",
        mode: reportMode,
      };
    }

    if (reportMode === "year") {
      return {
        label: `Current Year (${currentReportYear})`,
        mode: reportMode,
        year: currentReportYear,
      };
    }

    const range =
      reportMode === "custom"
        ? normalizeMonthRange(customStartMonth, customEndMonth)
        : { from: selectedMonth, to: selectedMonth };

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
    () =>
      sortedTrades.filter((trade) => dateMatchesReportRange(trade.date, reportRange, selectedMonth)),
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
  const filteredMonthlyTrades = useMemo(
    () => monthlyTrades.filter((trade) => tradeMatchesFilters(trade, filters, dailyJournalByDate)),
    [dailyJournalByDate, filters, monthlyTrades],
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
  const pendingRestoreRange = useMemo(
    () =>
      pendingRestore
        ? restoreRangeFromSelection(restoreScopeMode, restoreMonth, restoreYear, restoreStartMonth, restoreEndMonth)
        : null,
    [pendingRestore, restoreEndMonth, restoreMonth, restoreScopeMode, restoreStartMonth, restoreYear],
  );
  const pendingRestoreScoped = useMemo(
    () =>
      pendingRestore && pendingRestoreRange
        ? scopedRestoreData(pendingRestore, pendingRestoreRange, restoreMonth)
        : null,
    [pendingRestore, pendingRestoreRange, restoreMonth],
  );

  const filteredReportTrades = useMemo(() => {
    return reportTrades.filter((trade) => tradeMatchesFilters(trade, filters, dailyJournalByDate));
  }, [dailyJournalByDate, filters, reportTrades]);

  const sortedReportTrades = useMemo(
    () => {
      const query = logSearch.trim().toLowerCase();
      const searchedTrades = query
        ? filteredReportTrades.filter((trade) => searchableTradeText(trade).includes(query))
        : filteredReportTrades;
      return [...searchedTrades].sort((left, right) => compareTradesForSort(left, right, tradeSort));
    },
    [filteredReportTrades, logSearch, tradeSort],
  );

  const filteredTradeDates = useMemo(
    () => new Set(filteredReportTrades.map((trade) => trade.date)),
    [filteredReportTrades],
  );
  const filteredReportDailyJournals = useMemo(
    () =>
      reportDailyJournals.filter((journal) => {
        const matchesJournalFilters = dailyJournalMatchesFilters(journal, filters);
        if (!matchesJournalFilters) {
          return false;
        }

        return filteredTradeDates.has(journal.date) || (!filters.session && !filters.setup && filters.result === "all" && filters.beHit === "all");
      }),
    [filteredTradeDates, filters, reportDailyJournals],
  );
  const activeFilterCount = useMemo(
    () =>
      [
        filters.session,
        filters.setup,
        filters.tag,
        filters.result !== "all" ? filters.result : "",
        filters.beHit !== "all" ? filters.beHit : "",
        filters.paRating !== "all" ? filters.paRating : "",
        filters.breakeven !== "all" ? filters.breakeven : "",
      ].filter(Boolean).length,
    [filters],
  );
  const selectedDayTrades = useMemo(
    () => sortedTrades.filter((trade) => trade.date === selectedDay).sort(compareTradeEntryOrder),
    [selectedDay, sortedTrades],
  );
  const selectedDailyJournal = dailyJournalByDate.get(selectedDay) ?? null;
  const selectedNarrativeTemplate = useMemo(
    () => tradeNarrativeTemplate(selectedDayTrades),
    [selectedDayTrades],
  );
  const selectedTradeDetail = useMemo(
    () => trades.find((trade) => trade.id === selectedTradeDetailId) ?? null,
    [selectedTradeDetailId, trades],
  );
  const selectedTradeStrategy = selectedTradeDetail ? strategyResult(selectedTradeDetail) : null;
  const selectedDayStats = useMemo(() => {
    const total = selectedDayTrades.reduce((sum, trade) => sum + trade.actualR, 0);
    const wins = selectedDayTrades.filter((trade) => trade.actualR > 0).length;
    return {
      total,
      winRate: selectedDayTrades.length ? (wins / selectedDayTrades.length) * 100 : 0,
    };
  }, [selectedDayTrades]);

  const exportBaseName = useMemo(
    () => `exit-journal-${filenamePart(reportRange.label)}`,
    [reportRange.label],
  );
  const isDevicePaused = deviceSafety ? !deviceSafety.enabled : false;
  const isDeviceLimitReached = deviceSafety?.isStorageLimitReached ?? false;
  const canUploadDeviceFile = !isDeviceUploading && !isDevicePaused && !isDeviceLimitReached;
  const deviceStorageLabel = deviceSafety
    ? `${fileSizeLabel(deviceSafety.totalSize)} of ${fileSizeLabel(deviceSafety.storageLimitBytes)} used`
    : "";

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
  }, [selectedMonth, trades]);

  useEffect(() => {
    selectedMonthTabRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }, [monthTabs, selectedMonth]);

  const strategyRows = useMemo(() => {
    const strategies = [
      {
        key: "actual",
        label: "Actual",
        values: filteredReportTrades.map((trade) => trade.actualR),
      },
      {
        key: "firstTp",
        label: "First TP",
        values: filteredReportTrades.map((trade) => strategyResult(trade).firstTp),
      },
      {
        key: "onePointFive",
        label: "1.5R",
        values: filteredReportTrades.map((trade) => strategyResult(trade).onePointFive),
      },
      {
        key: "twoR",
        label: "2R",
        values: filteredReportTrades.map((trade) => strategyResult(trade).twoR),
      },
      {
        key: "threeR",
        label: "3R",
        values: filteredReportTrades.map((trade) => strategyResult(trade).threeR),
      },
    ];

    return strategies.map((strategy) => {
      const total = strategy.values.reduce((sum, value) => sum + value, 0);
      const wins = strategy.values.filter((value) => value > 0).length;
      return {
        ...strategy,
        average: strategy.values.length ? total / strategy.values.length : 0,
        total,
        winRate: strategy.values.length ? (wins / strategy.values.length) * 100 : 0,
      };
    });
  }, [filteredReportTrades]);

  const stats = useMemo(() => {
    const totalActual = filteredReportTrades.reduce((sum, trade) => sum + trade.actualR, 0);
    const totalMax = filteredReportTrades.reduce((sum, trade) => sum + trade.maxR, 0);
    const winners = filteredReportTrades.filter((trade) => trade.actualR > 0);
    const losers = filteredReportTrades.filter((trade) => trade.actualR < 0);
    const wins = winners.length;
    const beHits = filteredReportTrades.filter((trade) => trade.beHit === "Yes").length;
    const grossWin = winners.reduce((sum, trade) => sum + trade.actualR, 0);
    const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + trade.actualR, 0));
    const avgWin = winners.length ? grossWin / winners.length : 0;
    const avgLoss = losers.length ? grossLoss / losers.length : 0;
    const profitFactor = grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0;
    const avgWinLoss = avgLoss ? avgWin / avgLoss : avgWin ? Infinity : 0;
    const avgMax = filteredReportTrades.length
      ? filteredReportTrades.reduce((sum, trade) => sum + trade.maxR, 0) / filteredReportTrades.length
      : 0;
    const bestMethod = strategyRows.reduce(
      (best, row) => (row.total > best.total ? row : best),
      strategyRows[0] ?? { label: "Actual", total: 0 },
    );

    const winRate = filteredReportTrades.length ? (wins / filteredReportTrades.length) * 100 : 0;
    const captureRate = totalMax ? (totalActual / totalMax) * 100 : 0;
    const beRate = filteredReportTrades.length ? (beHits / filteredReportTrades.length) * 100 : 0;
    const score = clamp(
      winRate * 0.28 +
        clamp(captureRate, 0, 100) * 0.28 +
        clamp(profitFactor === Infinity ? 100 : profitFactor * 34, 0, 100) * 0.24 +
        beRate * 0.2,
      0,
      100,
    );

    return {
      avgActual: filteredReportTrades.length ? totalActual / filteredReportTrades.length : 0,
      avgMax,
      avgWinLoss,
      beRate,
      bestMethod,
      captureRate,
      grossLoss,
      grossWin,
      losses: losers.length,
      profitFactor,
      score,
      totalActual,
      trades: filteredReportTrades.length,
      winRate,
      wins,
    };
  }, [filteredReportTrades, strategyRows]);

  const exitComparisonRows = useMemo(() => {
    const actualTotal = strategyRows.find((row) => row.key === "actual")?.total ?? 0;
    return strategyRows.map((row) => ({
      ...row,
      delta: row.total - actualTotal,
    })).sort((left, right) => right.total - left.total);
  }, [strategyRows]);

  const weekdayRows = useMemo(() => {
    const rows = weekdayLabels.map((label) => ({
      average: 0,
      label,
      total: 0,
      trades: 0,
      winRate: 0,
      wins: 0,
    }));

    filteredReportTrades.forEach((trade) => {
      const row = rows[weekdayIndex(trade.date)];
      row.total += trade.actualR;
      row.trades += 1;
      row.wins += trade.actualR > 0 ? 1 : 0;
    });

    return rows
      .map((row) => ({
        ...row,
        average: row.trades ? row.total / row.trades : 0,
        winRate: row.trades ? (row.wins / row.trades) * 100 : 0,
      }))
      .sort(
        (left, right) =>
          right.total - left.total ||
          right.average - left.average ||
          right.winRate - left.winRate ||
          weekdayLabels.indexOf(left.label) - weekdayLabels.indexOf(right.label),
      );
  }, [filteredReportTrades]);

  const visibleWeekdayRows = useMemo(
    () => weekdayRows.filter((row) => row.trades > 0 || !weekendLabels.has(row.label)),
    [weekdayRows],
  );

  const bestWeekday = weekdayRows.find((row) => row.trades > 0);

  const monthlyStats = useMemo(() => {
    const totalActual = filteredMonthlyTrades.reduce((sum, trade) => sum + trade.actualR, 0);
    const totalMax = filteredMonthlyTrades.reduce((sum, trade) => sum + trade.maxR, 0);
    const wins = filteredMonthlyTrades.filter((trade) => trade.actualR > 0).length;
    const methodTotals = filteredMonthlyTrades.reduce(
      (totals, trade) => {
        const result = strategyResult(trade);
        totals.firstTp += result.firstTp;
        totals.onePointFive += result.onePointFive;
        totals.twoR += result.twoR;
        totals.threeR += result.threeR;
        return totals;
      },
      { firstTp: 0, onePointFive: 0, twoR: 0, threeR: 0 },
    );
    const best = [
      { label: "Actual", value: totalActual },
      { label: "First TP", value: methodTotals.firstTp },
      { label: "1.5R", value: methodTotals.onePointFive },
      { label: "2R", value: methodTotals.twoR },
      { label: "3R", value: methodTotals.threeR },
    ].reduce((top, item) => (item.value > top.value ? item : top));

    return {
      best,
      captureRate: totalMax ? (totalActual / totalMax) * 100 : 0,
      totalActual,
      trades: filteredMonthlyTrades.length,
      winRate: filteredMonthlyTrades.length ? (wins / filteredMonthlyTrades.length) * 100 : 0,
    };
  }, [filteredMonthlyTrades]);

  const calendarCells = useMemo(() => {
    const lead = firstWeekday(selectedMonth);
    const days = daysInMonth(selectedMonth);
    const cells: Array<{ count: number; date: string; day: number | null; hasJournal: boolean; total: number }> = [];

    for (let index = 0; index < lead; index += 1) {
      cells.push({ count: 0, date: "", day: null, hasJournal: false, total: 0 });
    }

    for (let day = 1; day <= days; day += 1) {
      const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
      const dayTrades = filteredMonthlyTrades.filter((trade) => trade.date === date);
      cells.push({
        count: dayTrades.length,
        date,
        day,
        hasJournal: dailyJournalByDate.has(date),
        total: dayTrades.reduce((sum, trade) => sum + trade.actualR, 0),
      });
    }

    while (cells.length < 42 || cells.length % 7 !== 0) {
      cells.push({ count: 0, date: "", day: null, hasJournal: false, total: 0 });
    }

    return cells;
  }, [dailyJournalByDate, filteredMonthlyTrades, selectedMonth]);

  const weeklyRows = useMemo(
    () =>
      Array.from({ length: calendarCells.length / 7 }, (_, week) => {
        const weekCells = calendarCells.slice(week * 7, week * 7 + 7);
        const activeDays = weekCells.filter((cell) => cell.count > 0);
        return {
          label: `Week ${week + 1}`,
          total: activeDays.reduce((sum, cell) => sum + cell.total, 0),
          tradeDays: activeDays.length,
        };
      }),
    [calendarCells],
  );

  const cumulativeSeries = useMemo(() => {
    const reportAscending = [...filteredReportTrades].sort((a, b) => {
      const dateSort = a.date.localeCompare(b.date);
      return dateSort || (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });

    return reportAscending.reduce<number[]>(
      (points, trade) => [...points, (points.at(-1) ?? 0) + trade.actualR],
      [0],
    );
  }, [filteredReportTrades]);

  const cumulativeChart = useMemo(() => chartShape(cumulativeSeries), [cumulativeSeries]);

  const scoreBreakdownRows = useMemo(
    () => [
      { label: "Win rate", score: clamp(stats.winRate, 0, 100), value: percent(stats.winRate) },
      { label: "Capture rate", score: clamp(stats.captureRate, 0, 100), value: percent(stats.captureRate) },
      {
        label: "Profit factor",
        score: clamp(stats.profitFactor === Infinity ? 100 : stats.profitFactor * 34, 0, 100),
        value: ratio(stats.profitFactor),
      },
      { label: "BE protection", score: clamp(stats.beRate, 0, 100), value: percent(stats.beRate) },
    ],
    [stats.beRate, stats.captureRate, stats.profitFactor, stats.winRate],
  );

  const backupReminderDue =
    isBackupReminderReady &&
    (trades.length > 0 || dailyJournals.length > 0) &&
    (lastBackupAt === null || Date.now() - lastBackupAt > backupReminderIntervalMs) &&
    (backupReminderDismissedAt === null || Date.now() - backupReminderDismissedAt > 24 * 60 * 60 * 1000);
  const lastBackupLabel = lastBackupAt
    ? new Date(lastBackupAt).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        timeZone: appTimeZone,
        year: "numeric",
      })
    : "Never";
  const selectedMonthLabel = monthLabel(selectedMonth);
  const isHomeView = initialView === "home";
  const isTrashView = initialView === "trash";
  const filteredTrashItems = useMemo(
    () =>
      trashFilter === "all"
        ? trashItems
        : trashItems.filter((item) => item.itemType === trashFilter),
    [trashFilter, trashItems],
  );
  const trashCounts = useMemo(
    () => ({
      attachment: trashItems.filter((item) => item.itemType === "attachment").length,
      daily_journal: trashItems.filter((item) => item.itemType === "daily_journal").length,
      trade: trashItems.filter((item) => item.itemType === "trade").length,
    }),
    [trashItems],
  );
  const latestTrade = sortedTrades[0] ?? null;
  const latestTradeLabel = latestTrade
    ? `${latestTrade.date} · ${[latestTrade.session, latestTrade.direction, latestTrade.setupName]
        .filter(Boolean)
        .join(" · ")}`
    : "No trades yet";
  const recentTradeTags = useMemo(() => {
    const counts = new Map<string, number>();

    trades.forEach((trade) => {
      tagList(trade).forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });
    dailyJournals.forEach((journal) => {
      tagList(journal).forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });

    const rankedTags = [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([tag]) => tag);

    return [...new Set([...builtInTradeTags, ...rankedTags])].slice(0, 16);
  }, [dailyJournals, trades]);
  const homeTiles: HomeTile[] = [
    {
      action: "Open",
      href: "/journal",
      label: "R Journal",
      meta: `${stats.trades} trades · ${rValue(stats.totalActual)}`,
      title: "Execution Journal",
    },
    {
      action: "Soon",
      disabled: true,
      label: "Money Journal",
      meta: "Broker imports",
      title: "Money Journal",
    },
    {
      action: "Open",
      href: "/journal/quality",
      label: "Quality",
      meta: `${stats.score.toFixed(1)} score`,
      title: "Trade Quality",
    },
    {
      action: "Open",
      href: "/journal/device-files",
      label: "Files",
      meta: deviceStorageLabel || `${deviceFiles.length} files`,
      title: "Device Files",
    },
    {
      action: "Open",
      href: "/journal/trash",
      label: "Trash",
      meta: `${trashItems.length} item${trashItems.length === 1 ? "" : "s"}`,
      title: "Recently Deleted",
    },
    {
      action: isSaving ? "Exporting" : "Export",
      button: () => void exportJournal("backup"),
      label: "Backup",
      meta: `Last: ${lastBackupLabel}`,
      title: "Safety ZIP",
    },
    {
      action: "Open",
      button: openSecurityDialog,
      label: "Security",
      meta: "Password",
      title: "Settings",
    },
  ];

  function goToMonth(key: string) {
    setSelectedMonth(key);
    if (!editingId) {
      setDraft((current) => ({ ...current, date: defaultDraftDate(key) }));
    }
  }

  function moveMonth(offset: number) {
    goToMonth(shiftMonth(selectedMonth, offset));
  }

  function toggleTradeSort(key: TradeSortKey) {
    setTradeSort((current) => ({
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
      key,
    }));
  }

  function sortIndicator(key: TradeSortKey) {
    if (tradeSort.key !== key) {
      return "↕";
    }
    return tradeSort.direction === "asc" ? "↑" : "↓";
  }

  function updateFilter<K extends keyof JournalFilters>(field: K, value: JournalFilters[K]) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function clearFilters() {
    setFilters(defaultJournalFilters);
    setLogSearch("");
  }

  function markBackupExported() {
    const timestamp = Date.now();
    writeClientCookie(backupReminderStorageKey, String(timestamp));
    deleteClientCookie(backupReminderDismissedStorageKey);
    setLastBackupAt(timestamp);
    setBackupReminderDismissedAt(null);
  }

  function dismissBackupReminder() {
    const timestamp = Date.now();
    writeClientCookie(backupReminderDismissedStorageKey, String(timestamp), 1);
    setBackupReminderDismissedAt(timestamp);
  }

  function showDatePicker(input: HTMLInputElement) {
    try {
      input.showPicker?.();
    } catch {
      input.focus();
    }
  }

  function updateDraft<K extends keyof DraftTrade>(field: K, value: DraftTrade[K]) {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      return field === "beHit" && value === "No" ? { ...next, actualR: -1 } : next;
    });
  }

  function applyTradeTemplate(template: (typeof quickTradeTemplates)[number]) {
    setDraft((current) => {
      const next = {
        ...current,
        ...template.patch,
        tags: mergeTagText(current.tags, template.tags),
      };
      return next.beHit === "No" ? { ...next, actualR: -1 } : next;
    });
  }

  function toggleDraftTag(tag: string) {
    setDraft((current) => {
      const currentTags = tagList(current);
      const hasTag = currentTags.some((item) => item.toLowerCase() === tag.toLowerCase());
      const nextTags = hasTag
        ? currentTags.filter((item) => item.toLowerCase() !== tag.toLowerCase())
        : [...currentTags, tag];
      return { ...current, tags: nextTags.join(", ") };
    });
  }

  function copyLastTradeSetup() {
    if (!latestTrade) {
      setNotice("No previous trade to copy yet.");
      return;
    }

    setDraft((current) =>
      draftFromTrade(latestTrade, {
        actualR: 0,
        attachments: [],
        beHit: "Yes",
        date: current.date,
        notes: "",
      }),
    );
  }

  function updateDailyDraft<K extends keyof DraftDailyJournal>(
    field: K,
    value: DraftDailyJournal[K],
  ) {
    setDailyDraft((current) => ({ ...current, [field]: value }));
  }

  function dailyJournalDraftForDate(
    date: string,
    journal: DailyJournal | null,
    dayTrades = sortedTrades.filter((trade) => trade.date === date).sort(compareTradeEntryOrder),
  ) {
    const baseDraft = journal ? draftFromDailyJournal(journal) : defaultDailyJournal(date);
    const template = tradeNarrativeTemplate(dayTrades);

    return baseDraft.narrative.trim() || !template
      ? baseDraft
      : { ...baseDraft, narrative: template };
  }

  function applyNarrativeTemplate() {
    if (!selectedNarrativeTemplate) {
      setNotice("Add trades for this date first, then create the Narrative template.");
      return;
    }

    if (
      dailyDraft.narrative.trim() &&
      dailyDraft.narrative.trim() !== selectedNarrativeTemplate.trim() &&
      !window.confirm("Replace the current Narrative with the trade template?")
    ) {
      return;
    }

    updateDailyDraft("narrative", selectedNarrativeTemplate);
  }

  function resetForm(month = selectedMonth) {
    setDraft(defaultDraft(month));
    setEditingId(null);
  }

  function openNewTrade() {
    if (editingId) {
      resetForm();
    }
    setIsEntryOpen(true);
  }

  function duplicateTrade(trade: ExitTrade) {
    setEditingId(null);
    setDraft(draftFromTrade(trade, { attachments: [] }));
    setSelectedMonth(monthKey(trade.date));
    setSelectedTradeDetailId(null);
    setIsEntryOpen(true);
    setNotice("Trade copied as a new draft.");
  }

  function closeEntryDialog() {
    resetForm();
    setIsEntryOpen(false);
  }

  function hideEntryDialog() {
    setIsEntryOpen(false);
  }

  function openDayDetail(date: string) {
    if (!date) {
      return;
    }

    const journal = dailyJournalByDate.get(date);
    setSelectedDay(date);
    setDailyDraft(dailyJournalDraftForDate(date, journal ?? null));
    setIsDailyJournalEditing(!journal);
    setIsDayDetailOpen(true);
  }

  function closeDayDetail() {
    setIsDayDetailOpen(false);
    setIsDailyJournalEditing(false);
  }

  function openTradeDetail(id: string) {
    setSelectedTradeDetailId(id);
  }

  function closeTradeDetail() {
    setSelectedTradeDetailId(null);
  }

  function openTradeDetailFromKeyboard(event: ReactKeyboardEvent<HTMLElement>, id: string) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openTradeDetail(id);
  }

  function openExpandedTextEditor(target: TextEditorTarget) {
    setExpandedTextTarget(target);
  }

  function closeExpandedTextEditor() {
    setExpandedTextTarget(null);
  }

  function updateExpandedText(value: string) {
    if (!expandedTextTarget) {
      return;
    }

    if (expandedTextTarget.scope === "trade") {
      updateDraft(expandedTextTarget.field, value);
      return;
    }

    updateDailyDraft(expandedTextTarget.field, value);
  }

  function startDailyJournalEdit() {
    setDailyDraft(dailyJournalDraftForDate(selectedDay, selectedDailyJournal, selectedDayTrades));
    setIsDailyJournalEditing(true);
  }

  function openNewTradeForDay(date = selectedDay) {
    setEditingId(null);
    setDraft({ ...defaultDraft(monthKey(date)), date });
    setIsEntryOpen(true);
  }

  function openSecurityDialog() {
    setPasswordDraft(emptyPasswordDraft());
    setSecurityNotice("");
    setIsSecurityOpen(true);
  }

  function closeSecurityDialog() {
    if (isPasswordSaving) {
      return;
    }

    setPasswordDraft(emptyPasswordDraft());
    setSecurityNotice("");
    setIsSecurityOpen(false);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSecurityNotice("");

    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setSecurityNotice("New passwords do not match.");
      return;
    }

    setIsPasswordSaving(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordDraft.currentPassword,
          newPassword: passwordDraft.newPassword,
        }),
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update password.");
      }

      setPasswordDraft(emptyPasswordDraft());
      setSecurityNotice("");
      setIsSecurityOpen(false);
      setNotice("Password updated.");
    } catch (error) {
      setSecurityNotice(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setIsPasswordSaving(false);
    }
  }

  async function saveTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice("");

    try {
      const endpoint = editingId ? `/api/trades?id=${encodeURIComponent(editingId)}` : "/api/trades";
      const response = await fetch(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as { trade?: ExitTrade; error?: string };
      if (!response.ok || !data.trade) {
        throw new Error(data.error ?? "Unable to save trade");
      }
      const savedTrade = normalizeStoredTrade(data.trade);
      if (!savedTrade) {
        throw new Error("Saved trade could not be read.");
      }

      setTrades((current) =>
        editingId
          ? current.map((trade) => (trade.id === savedTrade.id ? savedTrade : trade))
          : [savedTrade, ...current],
      );
      setSelectedMonth(monthKey(savedTrade.date));
      resetForm(monthKey(savedTrade.date));
      setIsEntryOpen(false);
      setNotice(editingId ? "Trade updated." : "Trade added.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save trade");
    } finally {
      setIsSaving(false);
    }
  }

  function editTrade(trade: ExitTrade) {
    setEditingId(trade.id);
    setDraft(draftFromTrade(trade));
    setSelectedMonth(monthKey(trade.date));
    setIsEntryOpen(true);
  }

  async function deleteTrade(id: string) {
    setNotice("");
    try {
      const response = await fetch(`/api/trades?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as TrashResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to delete trade");
      }
      setTrades((current) => current.filter((trade) => trade.id !== id));
      if (data.trashItem) {
        setTrashItems((current) => [data.trashItem as JournalTrashItem, ...current]);
      } else {
        void loadTrash();
      }
      if (editingId === id) {
        resetForm();
        setIsEntryOpen(false);
      }
      if (selectedTradeDetailId === id) {
        setSelectedTradeDetailId(null);
      }
      setNotice("Trade moved to Recently Deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to delete trade");
    }
  }

  async function saveDailyJournal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsDailyJournalSaving(true);
    setNotice("");

    try {
      const existingJournal = dailyJournalByDate.get(dailyDraft.date);
      const endpoint = existingJournal
        ? `/api/daily-journals?id=${encodeURIComponent(existingJournal.id)}`
        : "/api/daily-journals";
      const response = await fetch(endpoint, {
        method: existingJournal ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(dailyDraft),
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as DailyJournalsResponse;
      const savedJournal = normalizeDailyJournal(data.journal);
      if (!response.ok || !savedJournal) {
        throw new Error(data.error ?? "Unable to save daily journal");
      }

      setDailyJournals((current) => [
        savedJournal,
        ...current.filter((journal) => journal.id !== savedJournal.id && journal.date !== savedJournal.date),
      ]);
      setSelectedDay(savedJournal.date);
      setDailyDraft(draftFromDailyJournal(savedJournal));
      setIsDailyJournalEditing(false);
      setNotice("Daily journal saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save daily journal");
    } finally {
      setIsDailyJournalSaving(false);
    }
  }

  async function deleteDailyJournal() {
    if (!selectedDailyJournal) {
      return;
    }

    if (!window.confirm(`Delete the Daily Journal for ${selectedDailyJournal.date}?`)) {
      return;
    }

    setIsDailyJournalSaving(true);
    setNotice("");
    try {
      const response = await fetch(`/api/daily-journals?id=${encodeURIComponent(selectedDailyJournal.id)}`, {
        method: "DELETE",
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as TrashResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to delete daily journal");
      }

      setDailyJournals((current) => current.filter((journal) => journal.id !== selectedDailyJournal.id));
      if (data.trashItem) {
        setTrashItems((current) => [data.trashItem as JournalTrashItem, ...current]);
      } else {
        void loadTrash();
      }
      setDailyDraft(defaultDailyJournal(selectedDay));
      setIsDailyJournalEditing(true);
      setNotice("Daily journal moved to Recently Deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to delete daily journal");
    } finally {
      setIsDailyJournalSaving(false);
    }
  }

  async function copyDeviceLink(link: string, label = "Link") {
    try {
      await navigator.clipboard.writeText(link);
      setDeviceNotice(`${label} copied.`);
    } catch {
      setDeviceNotice("Copy failed.");
    }
  }

  async function uploadDeviceFile(file: File, filename = file.name) {
    const response = await fetch(`/api/device-files?filename=${encodeURIComponent(filename)}`, {
      body: file,
      headers: {
        "content-type": file.type || "application/octet-stream",
        "x-device-file-size": String(file.size),
      },
      method: "POST",
    });
    if (handleUnauthorized(response)) {
      throw new Error("Login required.");
    }
    const data = (await response.json()) as DeviceFilesResponse;
    if (!response.ok || !data.file) {
      throw new Error(data.error ?? "Unable to upload device file");
    }

    setDeviceFolder(data.folder ?? deviceFolder);
    setDeviceFiles((current) =>
      data.files ?? [data.file as DeviceFile, ...current.filter((item) => item.id !== data.file?.id)],
    );
    setDeviceSafety(data.safety ?? deviceSafety);

    return data.file;
  }

  async function uploadJournalAttachmentBody(body: BodyInit, filename: string, contentType: string, size: number) {
    const response = await fetch(`/api/journal-attachments?filename=${encodeURIComponent(filename)}`, {
      body,
      headers: {
        "content-type": contentType || "application/octet-stream",
        "x-journal-attachment-size": String(size),
      },
      method: "POST",
    });
    if (handleUnauthorized(response)) {
      throw new Error("Login required.");
    }
    const data = (await response.json()) as JournalAttachmentResponse;
    if (!response.ok || !data.attachment) {
      throw new Error(data.error ?? "Unable to upload journal attachment");
    }

    return data.attachment;
  }

  async function uploadJournalAttachment(file: File, filename: string) {
    return uploadJournalAttachmentBody(file, filename, file.type || "application/octet-stream", file.size);
  }

  async function restoreAttachmentFiles(
    restoreTrades: RestorableTrade[],
    restoreJournals: RestorableDailyJournal[],
    zipFiles: Record<string, Uint8Array>,
  ): Promise<RestoredJournalData> {
    const uploadedByPath = new Map<string, TradeAttachment>();
    let attachmentCount = 0;
    let missingAttachmentCount = 0;

    async function restoreAttachment(attachment: RestorableAttachment) {
      if (!attachment.backupPath) {
        return plainAttachment(attachment);
      }

      const cachedAttachment = uploadedByPath.get(attachment.backupPath);
      if (cachedAttachment) {
        return cachedAttachment;
      }

      const fileBytes = zipFiles[attachment.backupPath];
      if (!fileBytes) {
        missingAttachmentCount += 1;
        return plainAttachment(attachment);
      }

      const contentType = attachment.contentType || "application/octet-stream";
      const restoredAttachment = await uploadJournalAttachmentBody(
        new Blob([bytesToArrayBuffer(fileBytes)], { type: contentType }),
        restoredAttachmentFilename(attachment),
        contentType,
        fileBytes.byteLength,
      );
      uploadedByPath.set(attachment.backupPath, restoredAttachment);
      attachmentCount += 1;
      return restoredAttachment;
    }

    const restoredTrades: ImportTrade[] = [];
    for (const trade of restoreTrades) {
      const attachments: TradeAttachment[] = [];
      for (const attachment of trade.attachments) {
        attachments.push(await restoreAttachment(attachment));
      }

      restoredTrades.push({ ...trade, attachments });
    }

    const restoredJournals: ImportDailyJournal[] = [];
    for (const journal of restoreJournals) {
      const attachments: TradeAttachment[] = [];
      for (const attachment of journal.attachments) {
        attachments.push(await restoreAttachment(attachment));
      }

      restoredJournals.push({ ...journal, attachments });
    }

    return {
      attachmentCount,
      dailyJournals: restoredJournals,
      missingAttachmentCount,
      trades: restoredTrades,
    };
  }

  function mergeableBackupData(restoreTrades: RestorableTrade[], restoreJournals: RestorableDailyJournal[]) {
    const existingIds = new Set(trades.map((trade) => trade.id));
    const existingFingerprints = new Set(trades.map((trade) => tradeFingerprint(trade)));
    const existingJournalDates = new Set(dailyJournals.map((journal) => journal.date));
    const seenIds = new Set<string>();
    const seenFingerprints = new Set<string>();
    const seenJournalDates = new Set<string>();
    const readyTrades: RestorableTrade[] = [];
    const readyJournals: RestorableDailyJournal[] = [];
    let skippedTrades = 0;
    let skippedJournals = 0;

    restoreTrades.forEach((trade) => {
      const fingerprint = tradeFingerprint(trade);
      if (
        (trade.id && (existingIds.has(trade.id) || seenIds.has(trade.id))) ||
        existingFingerprints.has(fingerprint) ||
        seenFingerprints.has(fingerprint)
      ) {
        skippedTrades += 1;
        return;
      }

      if (trade.id) {
        seenIds.add(trade.id);
      }
      seenFingerprints.add(fingerprint);
      readyTrades.push(trade);
    });

    restoreJournals.forEach((journal) => {
      if (existingJournalDates.has(journal.date) || seenJournalDates.has(journal.date)) {
        skippedJournals += 1;
        return;
      }

      seenJournalDates.add(journal.date);
      readyJournals.push(journal);
    });

    return { readyJournals, readyTrades, skippedJournals, skippedTrades };
  }

  async function deleteJournalRecord(endpoint: string, id: string, fallbackMessage: string) {
    const response = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (handleUnauthorized(response)) {
      throw new Error("Login required.");
    }
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? fallbackMessage);
    }
  }

  async function clearCurrentJournalData(range: ActiveReportRange, fallbackMonth: string) {
    const tradesToDelete = trades.filter((trade) => dateMatchesReportRange(trade.date, range, fallbackMonth));
    const journalsToDelete = dailyJournals.filter((journal) =>
      dateMatchesReportRange(journal.date, range, fallbackMonth),
    );

    for (const trade of tradesToDelete) {
      await deleteJournalRecord("/api/trades", trade.id, "Unable to clear existing trades");
    }

    for (const journal of journalsToDelete) {
      await deleteJournalRecord("/api/daily-journals", journal.id, "Unable to clear existing daily journals");
    }

    setTrades((current) => current.filter((trade) => !dateMatchesReportRange(trade.date, range, fallbackMonth)));
    setDailyJournals((current) =>
      current.filter((journal) => !dateMatchesReportRange(journal.date, range, fallbackMonth)),
    );
  }

  async function handleDeviceUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (deviceSafety && (!deviceSafety.enabled || deviceSafety.isStorageLimitReached)) {
      setDeviceNotice(
        deviceSafety.enabled
          ? "Device Files storage limit reached."
          : "Device Files are paused.",
      );
      event.target.value = "";
      return;
    }

    setIsDeviceUploading(true);
    setDeviceNotice("");
    try {
      const uploadedFile = await uploadDeviceFile(file);
      setDeviceNotice(`${uploadedFile.filename} ready.`);
    } catch (error) {
      setDeviceNotice(error instanceof Error ? error.message : "Unable to upload device file");
    } finally {
      setIsDeviceUploading(false);
      event.target.value = "";
    }
  }

  async function attachFilesToDailyJournal(files: File[]) {
    if (!files.length) {
      return;
    }
    setIsDailyJournalAttachmentUploading(true);
    setNotice("");
    try {
      const uploadedAttachments: TradeAttachment[] = [];
      for (const [index, file] of files.entries()) {
        const uploadedAttachment = await uploadJournalAttachment(
          file,
          makeDailyJournalAttachmentFilename(file, dailyDraft.date || selectedDay, index),
        );
        uploadedAttachments.push(uploadedAttachment);
      }

      setDailyDraft((current) => {
        const currentIds = new Set(current.attachments.map((attachment) => attachment.id));
        return {
          ...current,
          attachments: [
            ...current.attachments,
            ...uploadedAttachments.filter((attachment) => !currentIds.has(attachment.id)),
          ],
        };
      });
      setNotice(
        `${uploadedAttachments.length} attachment${uploadedAttachments.length === 1 ? "" : "s"} added to Daily Journal.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to attach file");
    } finally {
      setIsDailyJournalAttachmentUploading(false);
    }
  }

  async function handleDailyJournalAttachmentUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    try {
      await attachFilesToDailyJournal(files);
    } finally {
      event.target.value = "";
    }
  }

  function handleDailyJournalPaste(event: globalThis.ClipboardEvent) {
    const files = clipboardFiles(event.clipboardData?.items);
    if (!files.length) {
      return;
    }

    event.preventDefault();
    void attachFilesToDailyJournal(files);
  }

  dailyJournalPasteHandlerRef.current = handleDailyJournalPaste;

  useEffect(() => {
    if (
      !isDayDetailOpen ||
      !isDailyJournalEditing ||
      isEntryOpen ||
      selectedTradeDetailId ||
      expandedTextTarget ||
      attachmentPreview
    ) {
      return undefined;
    }

    function pasteListener(event: globalThis.ClipboardEvent) {
      dailyJournalPasteHandlerRef.current?.(event);
    }

    document.addEventListener("paste", pasteListener);
    return () => document.removeEventListener("paste", pasteListener);
  }, [
    attachmentPreview,
    expandedTextTarget,
    isDayDetailOpen,
    isDailyJournalEditing,
    isEntryOpen,
    selectedTradeDetailId,
  ]);

  useEffect(() => {
    if (!attachmentPreview) {
      return undefined;
    }

    function handlePreviewKeys(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setAttachmentPreview(null);
        setAttachmentZoom(1);
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setAttachmentPreview((current) => {
          if (!current?.attachments.length) {
            return current;
          }

          const offset = event.key === "ArrowLeft" ? -1 : 1;
          const index = (current.index + offset + current.attachments.length) % current.attachments.length;
          return { ...current, index };
        });
        setAttachmentZoom(1);
        return;
      }

      if (event.key === "+" || event.key === "=") {
        setAttachmentZoom((current) => clamp(current + 0.25, 1, 2.5));
      } else if (event.key === "-") {
        setAttachmentZoom((current) => clamp(current - 0.25, 1, 2.5));
      }
    }

    document.addEventListener("keydown", handlePreviewKeys);
    return () => document.removeEventListener("keydown", handlePreviewKeys);
  }, [attachmentPreview]);

  async function removeDailyJournalAttachment(id: string) {
    const savedJournal = dailyJournalByDate.get(dailyDraft.date);

    if (!savedJournal) {
      setDailyDraft((current) => ({
        ...current,
        attachments: current.attachments.filter((attachment) => attachment.id !== id),
      }));
      return;
    }

    setNotice("");
    try {
      const response = await fetch("/api/trash", {
        body: JSON.stringify({
          action: "trash-attachment",
          attachmentId: id,
          ownerId: savedJournal.id,
          ownerType: "daily_journal",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as TrashResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to remove attachment");
      }

      const attachments = data.attachments ?? dailyDraft.attachments.filter((attachment) => attachment.id !== id);
      setDailyDraft((current) => ({ ...current, attachments }));
      setDailyJournals((current) =>
        current.map((journal) =>
          journal.id === savedJournal.id ? { ...journal, attachments, updatedAt: Date.now() } : journal,
        ),
      );
      if (data.trashItem) {
        setTrashItems((current) => [data.trashItem as JournalTrashItem, ...current]);
      } else {
        void loadTrash();
      }
      setNotice("Attachment moved to Recently Deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to remove attachment");
    }
  }

  async function restoreTrashItem(id: string) {
    setTrashNotice("");
    try {
      const response = await fetch(`/api/trash?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as TrashResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to restore item");
      }

      setTrashItems((current) => current.filter((item) => item.id !== id));
      if (data.trade) {
        const trade = normalizeStoredTrade(data.trade);
        if (trade) {
          setTrades((current) => [trade, ...current.filter((item) => item.id !== trade.id)]);
        } else {
          void loadTrades();
        }
      } else if (data.journal) {
        const journal = normalizeDailyJournal(data.journal);
        if (journal) {
          setDailyJournals((current) => [journal, ...current.filter((item) => item.id !== journal.id)]);
        } else {
          void loadDailyJournals();
        }
      } else if (data.attachment) {
        void loadDailyJournals();
        void loadTrades();
      }
      void loadDeviceFiles();
      setTrashNotice("Item restored.");
    } catch (error) {
      setTrashNotice(error instanceof Error ? error.message : "Unable to restore item");
    }
  }

  async function deleteTrashItemForever(id: string) {
    const item = trashItems.find((trashItem) => trashItem.id === id);
    if (!window.confirm(`Delete ${item?.sourceLabel || "this item"} forever? This cannot be undone.`)) {
      return;
    }

    setTrashNotice("");
    try {
      const response = await fetch(`/api/trash?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as TrashResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to delete forever");
      }

      setTrashItems((current) => current.filter((trashItem) => trashItem.id !== id));
      void loadDeviceFiles();
      setTrashNotice("Item permanently deleted.");
    } catch (error) {
      setTrashNotice(error instanceof Error ? error.message : "Unable to delete forever");
    }
  }

  async function deleteDeviceFile(id: string) {
    const file = deviceFiles.find((item) => item.id === id);
    setDeviceNotice("");
    try {
      const response = await fetch(`/api/device-files?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as DeviceFilesResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to delete device file");
      }

      setDeviceFolder(data.folder ?? deviceFolder);
      setDeviceFiles(data.files ?? deviceFiles.filter((item) => item.id !== id));
      setDeviceSafety(data.safety ?? deviceSafety);
      setDeviceNotice(`${file?.filename ?? "Device file"} removed.`);
    } catch (error) {
      setDeviceNotice(error instanceof Error ? error.message : "Unable to delete device file");
    }
  }

  async function rotateDeviceShortCode() {
    if (!window.confirm("Regenerate the TV code? Existing short TV links will stop working.")) {
      return;
    }

    setDeviceNotice("");
    try {
      const response = await fetch("/api/device-files", {
        body: JSON.stringify({ action: "rotate-short-code" }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (handleUnauthorized(response)) {
        return;
      }
      const data = (await response.json()) as DeviceFilesResponse;
      if (!response.ok || !data.folder) {
        throw new Error(data.error ?? "Unable to regenerate link");
      }

      setDeviceFolder(data.folder);
      setDeviceFiles(data.files ?? []);
      setDeviceSafety(data.safety ?? deviceSafety);
      setDeviceNotice("TV code regenerated.");
    } catch (error) {
      setDeviceNotice(error instanceof Error ? error.message : "Unable to regenerate TV code");
    }
  }

  async function exportJournal(format: "ai" | "backup" | "json" | "xlsx") {
    setIsDataMenuOpen(false);

    if (format === "backup") {
      setIsSaving(true);
      setNotice("Preparing full backup...");
      try {
        const backup = await createFullBackupZip(trades, dailyJournals);
        downloadBlob(`exit-journal-full-backup-${currentDateKey()}.zip`, backup.blob);
        markBackupExported();
        setNotice(
          `Full backup exported with ${backup.attachmentCount} attachment${
            backup.attachmentCount === 1 ? "" : "s"
          }.${backup.skippedCount ? ` ${backup.skippedCount} attachment warning${backup.skippedCount === 1 ? "" : "s"}.` : ""}`,
        );
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Unable to export full backup");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (format === "ai") {
      setIsSaving(true);
      setNotice("Preparing AI analysis packet...");
      try {
        const packet = await createAiAnalysisZip(sortedReportTrades, filteredReportDailyJournals, reportRange, {
          filters,
          logSearch,
        });
        downloadBlob(`${exportBaseName}-ai-analysis.zip`, packet.blob);
        setNotice(
          `AI analysis packet exported with ${packet.attachmentCount} screenshot${
            packet.attachmentCount === 1 ? "" : "s"
          }.${packet.skippedCount ? ` ${packet.skippedCount} screenshot warning${packet.skippedCount === 1 ? "" : "s"}.` : ""}`,
        );
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Unable to export AI analysis packet");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (format === "json") {
      downloadFile(
        `${exportBaseName}.json`,
        JSON.stringify(
          {
            dailyJournals: filteredReportDailyJournals,
            exportedAt: new Date().toISOString(),
            range: reportRange,
            trades: sortedReportTrades,
          },
          null,
          2,
        ),
        "application/json",
      );
      return;
    }

    downloadBlob(`${exportBaseName}-workbook.xlsx`, toCompleteXlsxBlob(sortedReportTrades, filteredReportDailyJournals, reportRange));
  }

  function downloadTemplate() {
    setIsDataMenuOpen(false);
    downloadBlob("exit-journal-template.xlsx", toXlsxBlob([]));
  }

  async function importDailyJournals(importJournals: ImportDailyJournal[], existingDateOverride?: Set<string>) {
    if (!importJournals.length) {
      return { imported: 0, skipped: 0 };
    }

    let imported = 0;
    let skipped = 0;
    const existingDates = existingDateOverride ?? new Set(dailyJournals.map((journal) => journal.date));

    for (const journal of importJournals) {
      if (existingDates.has(journal.date)) {
        skipped += 1;
        continue;
      }

      const response = await fetch("/api/daily-journals", {
        body: JSON.stringify(journal),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (handleUnauthorized(response)) {
        return { imported, skipped };
      }
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Unable to import daily journals");
      }

      existingDates.add(journal.date);
      imported += 1;
    }

    if (imported) {
      await loadDailyJournals();
    }

    return { imported, skipped };
  }

  async function importTrades(
    importTrades: ImportTrade[],
    skippedById = 0,
    importJournals: ImportDailyJournal[] = [],
    options: ImportBatchOptions = {},
  ) {
    setPendingImport(null);

    if (!importTrades.length && !importJournals.length) {
      setNotice(
        [
          options.noticePrefix ?? "",
          skippedById ? `${skippedById} existing trade${skippedById === 1 ? "" : "s"} skipped.` : "",
          options.extraSkippedDailyJournals
            ? `${options.extraSkippedDailyJournals} existing daily journal${
                options.extraSkippedDailyJournals === 1 ? "" : "s"
              } skipped.`
            : "",
          typeof options.restoredAttachments === "number"
            ? `${options.restoredAttachments} attachment${options.restoredAttachments === 1 ? "" : "s"} restored.`
            : "",
          options.missingAttachments
            ? `${options.missingAttachments} attachment file${options.missingAttachments === 1 ? "" : "s"} missing from ZIP.`
            : "",
          skippedById || options.extraSkippedDailyJournals ? "Nothing new to import." : "No new trades to import.",
        ]
          .filter(Boolean)
          .join(" "),
      );
      return;
    }

    setIsSaving(true);
    setNotice("");
    try {
      let importedCount = 0;
      for (const trade of importTrades) {
        const response = await fetch("/api/trades", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(trade),
        });
        if (handleUnauthorized(response)) {
          return;
        }
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Unable to import trades");
        }
        importedCount += 1;
      }

      const journalCounts = await importDailyJournals(importJournals, options.dailyJournalExistingDates);
      if (importedCount) {
        await loadTrades();
      }
      setNotice(
        [
          options.noticePrefix ?? "",
          `${importedCount} trade${importedCount === 1 ? "" : "s"} imported.`,
          `${journalCounts.imported} daily journal${journalCounts.imported === 1 ? "" : "s"} imported.`,
          skippedById ? `${skippedById} existing trade${skippedById === 1 ? "" : "s"} skipped.` : "",
          journalCounts.skipped || options.extraSkippedDailyJournals
            ? `${journalCounts.skipped + (options.extraSkippedDailyJournals ?? 0)} existing daily journal${
                journalCounts.skipped + (options.extraSkippedDailyJournals ?? 0) === 1 ? "" : "s"
              } skipped.`
            : "",
          typeof options.restoredAttachments === "number"
            ? `${options.restoredAttachments} attachment${options.restoredAttachments === 1 ? "" : "s"} restored.`
            : "",
          options.missingAttachments
            ? `${options.missingAttachments} attachment file${options.missingAttachments === 1 ? "" : "s"} missing from ZIP.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to import trades");
    } finally {
      setIsSaving(false);
    }
  }

  async function reviewImport(importedTrades: ImportTrade[], sourceName: string, importJournals: ImportDailyJournal[] = []) {
    const existingIds = new Set(trades.map((trade) => trade.id));
    const existingFingerprints = new Set(trades.map((trade) => tradeFingerprint(trade)));
    const readyTrades: ImportTrade[] = [];
    const duplicateMatches: ImportTrade[] = [];
    let skippedById = 0;

    importedTrades.forEach((trade) => {
      if (trade.id && existingIds.has(trade.id)) {
        skippedById += 1;
        return;
      }

      if (existingFingerprints.has(tradeFingerprint(trade))) {
        duplicateMatches.push(trade);
        return;
      }

      readyTrades.push(trade);
    });

    if (duplicateMatches.length) {
      setPendingImport({
        dailyJournals: importJournals,
        duplicateMatches,
        readyTrades,
        skippedById,
        sourceName,
      });
      return;
    }

    await importTrades(readyTrades, skippedById, importJournals);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsDataMenuOpen(false);
    setIsSaving(true);
    setNotice("");
    try {
      const normalized = file.name.toLowerCase().endsWith(".xlsx")
        ? { dailyJournals: [], trades: await parseXlsxTrades(file) }
        : parseJsonImport(JSON.parse(await file.text()));

      if (!normalized.trades.length && !normalized.dailyJournals.length) {
        throw new Error("No valid trades or daily journals found in that file.");
      }

      await reviewImport(normalized.trades, file.name, normalized.dailyJournals);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to import trades");
    } finally {
      setIsSaving(false);
      event.target.value = "";
    }
  }

  async function handleRestoreBackup(event: ChangeEvent<HTMLInputElement>, mode: RestoreMode) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsDataMenuOpen(false);
    setIsSaving(true);
    setNotice("Reading backup...");

    try {
      const zipFiles = await unzipWorkbook(await file.arrayBuffer(), "a backup ZIP");
      const backupJson = backupJsonEntry(zipFiles);
      if (!backupJson) {
        throw new Error("No backup.json found in that ZIP.");
      }

      const parsedBackup = JSON.parse(new TextDecoder().decode(backupJson)) as unknown;
      const restorable = parseRestorableJsonImport(parsedBackup);
      if (!restorable.trades.length && !restorable.dailyJournals.length) {
        throw new Error("No valid trades or daily journals found in that backup.");
      }

      const availableMonths = restoreDataMonths(restorable.trades, restorable.dailyJournals);
      const availableYears = restoreDataYears(availableMonths);
      const firstMonth = availableMonths[0] ?? selectedMonth;
      const lastMonth = availableMonths.at(-1) ?? selectedMonth;
      setRestoreScopeMode("all");
      setRestoreMonth(lastMonth);
      setRestoreStartMonth(firstMonth);
      setRestoreEndMonth(lastMonth);
      setRestoreYear(lastMonth.slice(0, 4));
      setPendingRestore({
        availableMonths,
        availableYears,
        dailyJournals: restorable.dailyJournals,
        fileName: file.name,
        mode,
        trades: restorable.trades,
        zipFiles,
      });
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to read backup");
    } finally {
      setIsSaving(false);
      event.target.value = "";
    }
  }

  async function confirmRestoreBackup() {
    if (!pendingRestore || !pendingRestoreRange || !pendingRestoreScoped) {
      return;
    }

    if (!pendingRestoreScoped.trades.length && !pendingRestoreScoped.dailyJournals.length) {
      setNotice(`No backup data found for ${pendingRestoreRange.label}.`);
      return;
    }

    if (
      pendingRestore.mode === "replace" &&
      !window.confirm(
        `Replace ${pendingRestoreRange.label}? This deletes existing local trades and daily journals in that range before restoring.`,
      )
    ) {
      return;
    }

    setIsSaving(true);
    setNotice(pendingRestore.mode === "replace" ? "Restoring selected range..." : "Merging selected range...");
    try {
      const selectedData =
        pendingRestore.mode === "merge"
          ? mergeableBackupData(pendingRestoreScoped.trades, pendingRestoreScoped.dailyJournals)
          : {
              readyJournals: pendingRestoreScoped.dailyJournals,
              readyTrades: pendingRestoreScoped.trades,
              skippedJournals: 0,
              skippedTrades: 0,
            };
      const restored = await restoreAttachmentFiles(selectedData.readyTrades, selectedData.readyJournals, pendingRestore.zipFiles);

      if (pendingRestore.mode === "replace") {
        await clearCurrentJournalData(pendingRestoreRange, restoreMonth);
      }

      await importTrades(restored.trades, selectedData.skippedTrades, restored.dailyJournals, {
        dailyJournalExistingDates: pendingRestore.mode === "replace" ? new Set() : undefined,
        extraSkippedDailyJournals: selectedData.skippedJournals,
        missingAttachments: restored.missingAttachmentCount,
        noticePrefix:
          pendingRestore.mode === "replace"
            ? `Backup restored for ${pendingRestoreRange.label}.`
            : `Backup merged for ${pendingRestoreRange.label}.`,
        restoredAttachments: restored.attachmentCount,
      });
      setPendingRestore(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to restore backup");
    } finally {
      setIsSaving(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const expandedTextValue = expandedTextTarget
    ? expandedTextTarget.scope === "trade"
      ? draft[expandedTextTarget.field]
      : dailyDraft[expandedTextTarget.field]
    : "";

  function openAttachmentPreview(
    attachments: TradeAttachment[],
    index: number,
    sourceLabel = "Attachment",
    sourceDate?: string,
  ) {
    setAttachmentPreview({ attachments, index, sourceDate, sourceLabel });
    setAttachmentZoom(1);
  }

  function moveAttachmentPreview(offset: number) {
    setAttachmentPreview((current) => {
      if (!current?.attachments.length) {
        return current;
      }

      const nextIndex = (current.index + offset + current.attachments.length) % current.attachments.length;
      return { ...current, index: nextIndex };
    });
    setAttachmentZoom(1);
  }

  function openPreviewSourceDay() {
    if (!attachmentPreview?.sourceDate) {
      return;
    }

    setSelectedDay(attachmentPreview.sourceDate);
    setSelectedMonth(monthKey(attachmentPreview.sourceDate));
    setIsDayDetailOpen(true);
    setAttachmentPreview(null);
  }

  function closeAttachmentPreview() {
    setAttachmentPreview(null);
    setAttachmentZoom(1);
  }

  function trashTypeLabel(type: JournalTrashType) {
    if (type === "daily_journal") {
      return "Daily Journal";
    }
    return type === "attachment" ? "Screenshot" : "Trade";
  }

  function trashPurgeLabel(purgeAfter: number) {
    const remainingDays = Math.max(0, Math.ceil((purgeAfter - Date.now()) / (24 * 60 * 60 * 1000)));
    return remainingDays <= 1 ? "Expires in 1 day" : `Expires in ${remainingDays} days`;
  }

  function trashDeletedLabel(deletedAt: number) {
    if (!deletedAt) {
      return "Deleted recently";
    }
    return `Deleted ${new Date(deletedAt).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  }

  function renderAttachmentGallery(
    attachments: TradeAttachment[],
    editable = false,
    sourceLabel = "Attachment",
    sourceDate?: string,
  ) {
    return (
      <div className="attachment-gallery">
        {attachments.map((attachment) => {
          const isImage = isImageAttachment(attachment);
          const meta = [
            attachment.size ? fileSizeLabel(attachment.size) : "",
            formatAttachmentDate(attachment.uploadedAt),
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <article className={`attachment-tile ${isImage ? "image" : "file"}`} key={attachment.id}>
              <button
                className="attachment-preview-button"
                type="button"
                aria-label={`${isImage ? "Preview" : "Open"} ${attachment.filename}`}
                onClick={() => {
                  if (isImage) {
                    const imageAttachments = attachments.filter(isImageAttachment);
                    const imageIndex = imageAttachments.findIndex((item) => item.id === attachment.id);
                    openAttachmentPreview(imageAttachments, Math.max(0, imageIndex), sourceLabel, sourceDate);
                    return;
                  }

                  window.open(attachment.url, "_blank", "noopener,noreferrer");
                }}
              >
                {isImage ? (
                  <img alt={attachment.filename} loading="lazy" src={attachment.url} />
                ) : (
                  <span className="file-type-pill">
                    {attachment.filename.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}
                  </span>
                )}
              </button>
              <div className="attachment-tile-body">
                <strong title={attachment.filename}>{attachment.filename}</strong>
                <small>{meta || "Linked file"}</small>
                <div className="attachment-tile-actions">
                  <a className="table-action" href={attachment.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                  {editable ? (
                    <button
                      className="table-action danger"
                      type="button"
                      onClick={() => void removeDailyJournalAttachment(attachment.id)}
                    >
                      {dailyJournalByDate.has(dailyDraft.date) ? "Trash" : "Remove"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  const formStrategy = strategyResult(draft);
  const entryForm = (
    <form className="trade-form" onSubmit={saveTrade}>
      <section className="form-section">
        <div className="form-section-heading">
          <span>Core</span>
          <div className="entry-form-actions">
            <button className="table-action" disabled={!latestTrade || Boolean(editingId)} type="button" onClick={copyLastTradeSetup}>
              Copy Last
            </button>
          </div>
        </div>
        {!editingId ? (
          <div className="trade-template-strip" aria-label="Quick trade templates">
            {quickTradeTemplates.map((template) => (
              <button
                className="template-chip"
                key={template.label}
                type="button"
                onClick={() => applyTradeTemplate(template)}
              >
                <strong>{template.label}</strong>
                <small>{template.note}</small>
              </button>
            ))}
          </div>
        ) : null}
        <div className="field-row compact-fields">
          <label>
            Date
            <input
              autoFocus={!editingId}
              className="date-picker-input"
              type="date"
              value={draft.date}
              onClick={(event) => showDatePicker(event.currentTarget)}
              onChange={(event) => updateDraft("date", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  showDatePicker(event.currentTarget);
                }
              }}
            />
          </label>
          <label>
            Instrument
            <input
              list="instrument-options"
              placeholder="ES, MES, NQ, MNQ"
              value={draft.instrument}
              onChange={(event) => updateDraft("instrument", event.target.value.toUpperCase())}
            />
            <datalist id="instrument-options">
              <option value="ES" />
              <option value="MES" />
              <option value="NQ" />
              <option value="MNQ" />
            </datalist>
          </label>
          <label>
            Direction
            <select
              value={draft.direction}
              onChange={(event) => updateDraft("direction", event.target.value)}
            >
              {directionOptions.map((option) => (
                <option key={option || "blank"} value={option}>
                  {option || "--"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Session
            <select
              value={draft.session}
              onChange={(event) => updateDraft("session", event.target.value)}
            >
              {sessionOptions.map((option) => (
                <option key={option || "blank"} value={option}>
                  {option || "--"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label>
            Setup Name
            <input
              list="setup-name-options"
              placeholder="Opening drive, pullback, trap..."
              value={draft.setupName}
              onChange={(event) => updateDraft("setupName", event.target.value)}
            />
            <datalist id="setup-name-options">
              {setupNameOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="field-row compact-fields">
          <label>
            BE Hit?
            <select
              value={draft.beHit}
              onChange={(event) => updateDraft("beHit", event.target.value as BeHit)}
            >
              <option>Yes</option>
              <option>No</option>
            </select>
          </label>
          <label>
            First TP R
            <input
              min="0.1"
              step="0.1"
              type="number"
              value={draft.firstTpR}
              onChange={(event) => updateDraft("firstTpR", Number(event.target.value))}
            />
          </label>
          <label>
            Max R
            <input
              min="0"
              step="0.1"
              type="number"
              value={draft.maxR}
              onChange={(event) => updateDraft("maxR", Number(event.target.value))}
            />
          </label>
          <label>
            Actual R
            <input
              disabled={draft.beHit === "No"}
              step="0.1"
              type="number"
              value={draft.actualR}
              onChange={(event) => updateDraft("actualR", Number(event.target.value))}
            />
          </label>
        </div>

        <label>
          Tags
          <input
            placeholder="trend, liquidity, A+ setup"
            value={draft.tags}
            onChange={(event) => updateDraft("tags", event.target.value)}
          />
          <div className="tag-picker-strip" aria-label="Quick trade tags">
            {recentTradeTags.map((tag) => {
              const isActive = tagList(draft).some((item) => item.toLowerCase() === tag.toLowerCase());
              return (
                <button
                  className={`tag-picker-chip ${isActive ? "active" : ""}`}
                  key={tag}
                  type="button"
                  onClick={() => toggleDraftTag(tag)}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </label>
      </section>

      <section className="form-section">
        <div className="form-section-heading">
          <span>Note</span>
        </div>
        <div className="field-with-tool">
          <div className="field-label-row">
            <span>Note</span>
            <button
              className="field-tool-button"
              type="button"
              onClick={() =>
                openExpandedTextEditor({
                  field: "notes",
                  label: "Trade Note",
                  placeholder: "Quick trade note...",
                  scope: "trade",
                })
              }
            >
              Expand
            </button>
          </div>
          <textarea
            aria-label="Note"
            rows={4}
            placeholder="Quick trade note..."
            value={draft.notes}
            onChange={(event) => updateDraft("notes", event.target.value)}
          />
        </div>
      </section>

      <div className="formula-preview" aria-label="Strategy result preview">
        <span>First TP {rValue(formStrategy.firstTp)}</span>
        <span>1.5R {rValue(formStrategy.onePointFive)}</span>
        <span>2R {rValue(formStrategy.twoR)}</span>
        <span>3R {rValue(formStrategy.threeR)}</span>
      </div>

      <button className="primary-button" disabled={isSaving} type="submit">
        {isSaving ? "Saving..." : editingId ? "Save Trade" : "Add Trade"}
      </button>
      <button className="utility-button" type="button" onClick={closeEntryDialog}>
        Cancel
      </button>
    </form>
  );

  const dailyJournalForm = (
    <form className="trade-form daily-journal-form" onSubmit={saveDailyJournal}>
      <section className="form-section">
        <div className="form-section-heading">
          <span>Daily Journal</span>
        </div>
        <div className="field-row compact-fields">
          <label>
            Date
            <input type="date" value={dailyDraft.date} disabled />
          </label>
          <label>
            Price Action Rating
            <select
              value={dailyDraft.priceActionRating}
              onChange={(event) => updateDailyDraft("priceActionRating", Number(event.target.value))}
            >
              {priceActionRatingOptions.map((rating) => (
                <option key={rating} value={rating}>
                  {rating}
                </option>
              ))}
            </select>
          </label>
          <label>
            Breakeven Trades
            <input
              min="0"
              step="1"
              type="number"
              value={dailyDraft.breakevenTrades}
              onChange={(event) => updateDailyDraft("breakevenTrades", Number(event.target.value))}
            />
          </label>
          <label>
            Tags
            <input
              placeholder="choppy, clean PA, news..."
              value={dailyDraft.tags}
              onChange={(event) => updateDailyDraft("tags", event.target.value)}
            />
          </label>
        </div>
        <div className="field-with-tool">
          <div className="field-label-row">
            <span>HTF Bias</span>
            <button
              className="field-tool-button"
              type="button"
              onClick={() =>
                openExpandedTextEditor({
                  field: "htfBias",
                  label: "HTF Bias",
                  placeholder: "Bullish, bearish, range...",
                  scope: "daily",
                })
              }
            >
              Expand
            </button>
          </div>
          <input
            aria-label="HTF Bias"
            placeholder="Bullish, bearish, range..."
            value={dailyDraft.htfBias}
            onChange={(event) => updateDailyDraft("htfBias", event.target.value)}
          />
        </div>
        <div className="field-with-tool">
          <div className="field-label-row">
            <span>ORM</span>
            <button
              className="field-tool-button"
              type="button"
              onClick={() =>
                openExpandedTextEditor({
                  field: "orm",
                  label: "ORM",
                  placeholder: "Opening range / market structure notes...",
                  scope: "daily",
                })
              }
            >
              Expand
            </button>
          </div>
          <textarea
            aria-label="ORM"
            rows={3}
            placeholder="Opening range / market structure notes..."
            value={dailyDraft.orm}
            onChange={(event) => updateDailyDraft("orm", event.target.value)}
          />
        </div>
        <div className="field-with-tool">
          <div className="field-label-row">
            <span>Narrative</span>
            <div className="field-tool-group">
              <button
                className="field-tool-button"
                disabled={!selectedNarrativeTemplate}
                type="button"
                onClick={applyNarrativeTemplate}
              >
                {dailyDraft.narrative.trim() ? "Refresh Template" : "Add Template"}
              </button>
              <button
                className="field-tool-button"
                type="button"
                onClick={() =>
                  openExpandedTextEditor({
                    field: "narrative",
                    label: "Narrative",
                    placeholder: "Asia Trade 1, London Trade 2, NY AM Trade 3...",
                    scope: "daily",
                  })
                }
              >
                Expand
              </button>
            </div>
          </div>
          <textarea
            aria-label="Narrative"
            className="journal-mono-textarea"
            rows={5}
            placeholder="Asia Trade 1, London Trade 2, NY AM Trade 3..."
            value={dailyDraft.narrative}
            onChange={(event) => updateDailyDraft("narrative", event.target.value)}
          />
        </div>
        <div className="field-with-tool">
          <div className="field-label-row">
            <span>What I did well and could have done better</span>
            <button
              className="field-tool-button"
              type="button"
              onClick={() =>
                openExpandedTextEditor({
                  field: "reviewNotes",
                  label: "What I did well and could have done better",
                  scope: "daily",
                })
              }
            >
              Expand
            </button>
          </div>
          <textarea
            aria-label="What I did well and could have done better"
            rows={4}
            value={dailyDraft.reviewNotes}
            onChange={(event) => updateDailyDraft("reviewNotes", event.target.value)}
          />
        </div>
      </section>

      <section
        className="form-section attachment-section paste-target"
        tabIndex={0}
      >
        <div className="form-section-heading">
          <span>Screenshots & Attachments</span>
          <label className="attachment-upload-button">
            {isDailyJournalAttachmentUploading ? "Uploading..." : "Upload"}
            <input
              disabled={isDailyJournalAttachmentUploading}
              multiple
              type="file"
              onChange={handleDailyJournalAttachmentUpload}
            />
          </label>
        </div>
        <div className="attachment-drop-copy">
          <strong>{dailyDraft.attachments.length} attached</strong>
          <small>Paste screenshots here or upload files.</small>
        </div>
        {dailyDraft.attachments.length ? (
          renderAttachmentGallery(dailyDraft.attachments, true, "Daily Journal Draft", dailyDraft.date || selectedDay)
        ) : (
          <p className="attachment-empty">No screenshots yet.</p>
        )}
      </section>

      <div className="form-actions">
        <button className="primary-button" disabled={isDailyJournalSaving} type="submit">
          {isDailyJournalSaving ? "Saving..." : selectedDailyJournal ? "Save Daily Journal" : "Add Daily Journal"}
        </button>
        {selectedDailyJournal ? (
          <button
            className="utility-button"
            disabled={isDailyJournalSaving}
            type="button"
            onClick={() => {
              setDailyDraft(draftFromDailyJournal(selectedDailyJournal));
              setIsDailyJournalEditing(false);
            }}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
  const restoreTotalAttachments = pendingRestore
    ? restorableAttachmentCount(pendingRestore.trades, pendingRestore.dailyJournals)
    : 0;
  const restoreActionLabel =
    pendingRestore?.mode === "replace"
      ? isSaving
        ? "Restoring..."
        : "Replace Selected Range"
      : isSaving
        ? "Merging..."
        : "Merge Selected Range";
  const previewAttachment = attachmentPreview?.attachments[attachmentPreview.index] ?? null;
  const previewAttachmentMeta = previewAttachment
    ? [
        `${(attachmentPreview?.index ?? 0) + 1} of ${attachmentPreview?.attachments.length ?? 1}`,
        attachmentPreview?.sourceLabel ?? "Attachment",
        previewAttachment.size ? fileSizeLabel(previewAttachment.size) : "",
        formatAttachmentDate(previewAttachment.uploadedAt),
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const previewImageStyle = previewAttachment
    ? attachmentPreviewBackgroundStyle(previewAttachment, attachmentZoom)
    : undefined;

  return (
    <main className={`journal-shell ${isNavCollapsed ? "nav-collapsed" : ""}`} data-theme={theme}>
      <button
        className={`mobile-nav-scrim ${isMobileNavOpen ? "show" : ""}`}
        type="button"
        aria-label="Close navigation"
        onClick={() => setIsMobileNavOpen(false)}
      />

      <aside className={`app-sidebar ${isMobileNavOpen ? "mobile-open" : ""}`} aria-label="Journal navigation">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            AW
          </span>
          <div className="sidebar-brand-copy">
            <strong>Adalwolf</strong>
            <small>Exit Strategy Journal</small>
          </div>
        </div>

        <button
          className="sidebar-new-trade"
          type="button"
          onClick={() => {
            openNewTrade();
            setIsMobileNavOpen(false);
          }}
        >
          <span aria-hidden="true">+</span>
          <strong>New Trade</strong>
        </button>

        <nav className="sidebar-nav" aria-label="Primary sections">
          <a className={isHomeView ? "active" : ""} href="/journal/home" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">H</span>
            <strong>Home</strong>
          </a>
          <a className={!isHomeView && !isTrashView ? "active" : ""} href="/journal#dashboard-overview" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">D</span>
            <strong>Dashboard</strong>
          </a>
          <a href="/journal#calendar" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">C</span>
            <strong>Calendar</strong>
          </a>
          <a href="/journal#trades" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">T</span>
            <strong>Trade Log</strong>
          </a>
          <a href="/journal#analytics" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">A</span>
            <strong>Analytics</strong>
          </a>
          <a href="/journal/quality" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">Q</span>
            <strong>Quality</strong>
          </a>
          <a href="/journal/device-files" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">F</span>
            <strong>Device Files</strong>
          </a>
          <a className={isTrashView ? "active" : ""} href="/journal/trash" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">R</span>
            <strong>Trash</strong>
          </a>
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-nav-button"
            type="button"
            onClick={() => {
              openSecurityDialog();
              setIsMobileNavOpen(false);
            }}
          >
            <span aria-hidden="true">S</span>
            <strong>Security</strong>
          </button>
          <button className="sidebar-nav-button" type="button" onClick={() => void logout()}>
            <span aria-hidden="true">L</span>
            <strong>Logout</strong>
          </button>
          <button
            className="sidebar-collapse-button"
            type="button"
            aria-label={isNavCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setIsNavCollapsed((current) => !current)}
          >
            {isNavCollapsed ? ">" : "<"}
          </button>
        </div>
      </aside>

      <div className="journal-workspace">
        <header className="topbar" aria-label="Trading journal header">
          <div className="topbar-title-group">
            <button
              className="mobile-menu-button"
              type="button"
              aria-label="Open navigation"
              onClick={() => setIsMobileNavOpen(true)}
            >
              Menu
            </button>
            <div>
              <p className="eyebrow">{isHomeView ? "Private Dashboard" : isTrashView ? "Safety" : "R Journal"}</p>
              <h1>{isHomeView ? "Private Home" : isTrashView ? "Recently Deleted" : "Trading Dashboard"}</h1>
              <p className="dashboard-motto">{'"PATIENCE | DISCIPLINE | EXECUTION"'}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className="utility-button compact"
              type="button"
              aria-label="Toggle color theme"
              onClick={toggleTheme}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button className="primary-button compact" type="button" onClick={openNewTrade}>
            New Trade
          </button>
          <div className="data-menu" ref={dataMenuRef}>
            <button
              className="utility-button data-menu-trigger"
              type="button"
              aria-expanded={isDataMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsDataMenuOpen((current) => !current)}
            >
              Data <span aria-hidden="true">▾</span>
            </button>
            {isDataMenuOpen ? (
              <div className="data-menu-panel" role="menu" aria-label="Import and export data">
                <div className="data-menu-section">
                  <span className="data-menu-label">Import</span>
                  <label className="data-menu-item file-button" role="menuitem">
                    Import JSON or Excel
                    <input accept="application/json,.json,.xlsx" type="file" onChange={handleImport} />
                  </label>
                  <button className="data-menu-item" type="button" role="menuitem" onClick={downloadTemplate}>
                    Excel Template
                  </button>
                </div>
                <div className="data-menu-section">
                  <span className="data-menu-label">Export Current View</span>
                  <small className="data-menu-note">{reportRange.label}</small>
                  <button className="data-menu-item" type="button" role="menuitem" onClick={() => void exportJournal("xlsx")}>
                    Excel Workbook
                  </button>
                  <button
                    className="data-menu-item"
                    disabled={isSaving}
                    type="button"
                    role="menuitem"
                    onClick={() => void exportJournal("ai")}
                  >
                    AI Analysis Packet
                  </button>
                  <button className="data-menu-item" type="button" role="menuitem" onClick={() => void exportJournal("json")}>
                    JSON
                  </button>
                </div>
                <div className="data-menu-section">
                  <span className="data-menu-label">Backup</span>
                  <small className="data-menu-note">All trades, daily journals, and screenshots</small>
                  <button
                    className="data-menu-item"
                    disabled={isSaving}
                    type="button"
                    role="menuitem"
                    onClick={() => void exportJournal("backup")}
                  >
                    Full Backup ZIP
                  </button>
                  <label className="data-menu-item file-button" role="menuitem">
                    Restore ZIP (merge)
                    <input
                      accept="application/zip,.zip"
                      disabled={isSaving}
                      type="file"
                      onChange={(event) => void handleRestoreBackup(event, "merge")}
                    />
                  </label>
                  <label className="data-menu-item file-button" role="menuitem">
                    Restore ZIP (replace)
                    <input
                      accept="application/zip,.zip"
                      disabled={isSaving}
                      type="file"
                      onChange={(event) => void handleRestoreBackup(event, "replace")}
                    />
                  </label>
                </div>
                <div className="data-menu-section device-menu-section">
                  <span className="data-menu-label">Device Files</span>
                  <small className="data-menu-note">
                    {isDeviceLoading
                      ? "Loading"
                      : `${isDevicePaused ? "Paused · " : ""}TV Code ${deviceFolder?.shortCode ?? "------"} · ${deviceFiles.length} file${
                          deviceFiles.length === 1 ? "" : "s"
                        }`}
                  </small>
                  {deviceStorageLabel ? (
                    <small className="data-menu-note">
                      {deviceStorageLabel}
                      {isDeviceLimitReached ? " · Limit reached" : ""}
                    </small>
                  ) : null}
                  <div className="device-menu-actions">
                    <a className="data-menu-item device-menu-open" href="/journal/device-files" role="menuitem">
                      Open Device Files
                    </a>
                    <label className="data-menu-item file-button device-menu-upload" role="menuitem">
                      {isDeviceUploading
                        ? "Uploading..."
                        : isDevicePaused
                          ? "Paused"
                          : isDeviceLimitReached
                            ? "Limit Reached"
                            : "Upload"}
                      <input
                        disabled={!canUploadDeviceFile}
                        type="file"
                        onChange={handleDeviceUpload}
                      />
                    </label>
                    <button
                      className="data-menu-item"
                      disabled={!deviceFolder}
                      type="button"
                      role="menuitem"
                      onClick={() => deviceFolder && void copyDeviceLink(deviceFolder.shortUrl, "TV base link")}
                    >
                      Copy TV Base
                    </button>
                    <button
                      className="data-menu-item"
                      disabled={!deviceFolder}
                      type="button"
                      role="menuitem"
                      onClick={() => void rotateDeviceShortCode()}
                    >
                      Regenerate TV Code
                    </button>
                  </div>

                  {deviceFolder ? <code className="device-menu-link">{deviceFolder.shortUrl}</code> : null}

                  <div className="device-menu-file-list">
                    {deviceFiles.map((file) => (
                      <div className="device-menu-file-row" key={file.id}>
                        <div>
                          <strong>{file.filename}</strong>
                          <small>
                            {fileSizeLabel(file.size)} · {new Date(file.updatedAt).toLocaleDateString()}
                          </small>
                          <code className="device-menu-file-link">{file.shortUrl}</code>
                        </div>
                        <div className="device-menu-file-actions">
                          <button
                            className="table-action"
                            type="button"
                            onClick={() => void copyDeviceLink(file.shortUrl, "TV file link")}
                          >
                            Copy TV Link
                          </button>
                          <button
                            className="table-action danger"
                            type="button"
                            onClick={() => void deleteDeviceFile(file.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {!deviceFiles.length ? (
                      <p className="device-menu-empty">
                        {isDeviceLoading ? "Loading files..." : "No device files yet."}
                      </p>
                    ) : null}
                  </div>

                  {deviceNotice ? <p className="data-menu-note device-menu-notice">{deviceNotice}</p> : null}
                </div>
              </div>
            ) : null}
          </div>
          </div>
        </header>

      {isHomeView ? (
        <section className="private-home-page" aria-label="Private journal home">
          <section className="private-home-hero">
            <div className="private-home-copy">
              <p className="eyebrow">Command Center</p>
              <h2>Welcome back, Adalwolf.</h2>
              <p className="home-lede">Clean review, fast logging, safe backups.</p>
              <div className="home-hero-actions">
                <button className="primary-button compact" type="button" onClick={openNewTrade}>
                  New Trade
                </button>
                <a className="utility-button compact" href="/journal">
                  Open R Journal
                </a>
                <button className="utility-button compact" disabled={isSaving} type="button" onClick={() => void exportJournal("backup")}>
                  Backup Now
                </button>
              </div>
            </div>
            <div className="home-focus-card">
              <span>Current View</span>
              <strong className={toneClass(stats.totalActual)}>{rValue(stats.totalActual)}</strong>
              <small>
                {stats.trades} trades · {percent(stats.winRate)} win · {stats.score.toFixed(1)} score
              </small>
              <div className="home-focus-track" aria-hidden="true">
                <span style={{ width: `${clamp(stats.score, 4, 100)}%` }} />
              </div>
            </div>
          </section>

          <section className="home-stat-grid" aria-label="Journal snapshot">
            <article>
              <span>Trades</span>
              <strong>{stats.trades}</strong>
              <small>{reportRange.label}</small>
            </article>
            <article>
              <span>Win Rate</span>
              <strong>{percent(stats.winRate)}</strong>
              <small>{stats.wins} wins</small>
            </article>
            <article>
              <span>Capture</span>
              <strong className={toneClass(stats.captureRate)}>{percent(stats.captureRate)}</strong>
              <small>Avg Max {rValue(stats.avgMax)}</small>
            </article>
            <article>
              <span>Backup</span>
              <strong>{lastBackupLabel}</strong>
              <small>{backupReminderDue ? "Due now" : "Ready"}</small>
            </article>
          </section>

          <section className="home-tile-grid" aria-label="Private pages">
            {homeTiles.map((tile) => {
              const content = (
                <>
                  <span>{tile.label}</span>
                  <strong>{tile.title}</strong>
                  <small>{tile.meta}</small>
                  <em>{tile.action}</em>
                </>
              );

              return tile.href ? (
                <a className={`home-tile ${tile.disabled ? "disabled" : ""}`} href={tile.href} key={tile.label}>
                  {content}
                </a>
              ) : (
                <button
                  className={`home-tile ${tile.disabled ? "disabled" : ""}`}
                  disabled={tile.disabled || (tile.label === "Backup" && isSaving)}
                  key={tile.label}
                  type="button"
                  onClick={tile.button}
                >
                  {content}
                </button>
              );
            })}
          </section>

          <section className="home-lower-grid" aria-label="Recent journal activity">
            <article className="home-panel">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Recent</p>
                  <h2>Latest Trades</h2>
                </div>
                <span className="status-pill">{latestTrade ? rValue(latestTrade.actualR) : "--"}</span>
              </div>
              <div className="home-recent-list">
                {sortedTrades.slice(0, 5).map((trade) => (
                  <button className="home-recent-row" key={trade.id} type="button" onClick={() => openTradeDetail(trade.id)}>
                    <span>{trade.date}</span>
                    <strong>
                      {[trade.session, trade.direction, trade.setupName].filter(Boolean).join(" · ") || "Trade"}
                    </strong>
                    <em className={toneClass(trade.actualR)}>{rValue(trade.actualR)}</em>
                  </button>
                ))}
                {!sortedTrades.length ? <p className="empty-panel-note">No trades logged yet.</p> : null}
              </div>
            </article>

            <article className="home-panel home-today-panel">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Today</p>
                  <h2>{currentDateKey()}</h2>
                </div>
                <span className="status-pill">{latestTradeLabel}</span>
              </div>
              <div className="home-action-stack">
                <button className="secondary-button" type="button" onClick={() => openNewTradeForDay(currentDateKey())}>
                  Log Today
                </button>
                <button className="secondary-button" type="button" onClick={() => openDayDetail(currentDateKey())}>
                  Daily Page
                </button>
                <a className="secondary-button" href="/journal/quality">
                  Quality Review
                </a>
              </div>
            </article>
          </section>
        </section>
      ) : isTrashView ? (
        <section className="trash-page" aria-label="Recently deleted journal items">
          <section className="trash-hero">
            <div>
              <p className="eyebrow">Recoverable for 30 days</p>
              <h2>Recently Deleted</h2>
              <p>Trades, daily journals, and journal screenshots stay here before they are removed forever.</p>
            </div>
            <button className="utility-button compact" disabled={isTrashLoading} type="button" onClick={() => void loadTrash()}>
              Refresh
            </button>
          </section>

          <section className="trash-stat-grid" aria-label="Trash summary">
            <article>
              <span>Total</span>
              <strong>{trashItems.length}</strong>
              <small>{isTrashLoading ? "Checking..." : "Recoverable items"}</small>
            </article>
            <article>
              <span>Trades</span>
              <strong>{trashCounts.trade}</strong>
              <small>Exit entries</small>
            </article>
            <article>
              <span>Daily Journals</span>
              <strong>{trashCounts.daily_journal}</strong>
              <small>Full day reviews</small>
            </article>
            <article>
              <span>Screenshots</span>
              <strong>{trashCounts.attachment}</strong>
              <small>Private journal files</small>
            </article>
          </section>

          <section className="trash-toolbar" aria-label="Trash filters">
            {([
              ["all", "All"],
              ["trade", "Trades"],
              ["daily_journal", "Daily Journals"],
              ["attachment", "Screenshots"],
            ] as const).map(([value, label]) => (
              <button
                className={trashFilter === value ? "active" : ""}
                key={value}
                type="button"
                onClick={() => setTrashFilter(value)}
              >
                {label}
              </button>
            ))}
          </section>

          {trashNotice ? <p className="notice trash-notice">{trashNotice}</p> : null}

          <section className="trash-list-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Journal Trash</p>
                <h2>{filteredTrashItems.length} item{filteredTrashItems.length === 1 ? "" : "s"}</h2>
              </div>
              <span className="status-pill">30 days</span>
            </div>

            <div className="trash-list">
              {filteredTrashItems.map((item) => (
                <article className="trash-row" key={item.id}>
                  <div className="trash-row-main">
                    <span className={`trash-type-pill ${item.itemType}`}>{trashTypeLabel(item.itemType)}</span>
                    <div>
                      <strong>{item.sourceLabel || item.summary || trashTypeLabel(item.itemType)}</strong>
                      <small>{[item.sourceDate, item.summary].filter(Boolean).join(" · ")}</small>
                    </div>
                  </div>
                  <div className="trash-row-meta">
                    <span>{trashDeletedLabel(item.deletedAt)}</span>
                    <span>{trashPurgeLabel(item.purgeAfter)}</span>
                  </div>
                  <div className="trash-row-actions">
                    {item.sourceDate ? (
                      <button className="table-action" type="button" onClick={() => openDayDetail(item.sourceDate)}>
                        Day
                      </button>
                    ) : null}
                    <button className="table-action" type="button" onClick={() => void restoreTrashItem(item.id)}>
                      Restore
                    </button>
                    <button className="table-action danger" type="button" onClick={() => void deleteTrashItemForever(item.id)}>
                      Delete Forever
                    </button>
                  </div>
                </article>
              ))}
              {!filteredTrashItems.length ? (
                <p className="empty-panel-note">{isTrashLoading ? "Loading Recently Deleted..." : "Trash is empty."}</p>
              ) : null}
            </div>
          </section>
        </section>
      ) : (
        <>
      <section className="month-switcher" aria-label="Month navigation">
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

      <section className="report-range-panel" id="dashboard-overview" aria-label="Report range">
        <div className="report-range-title">
          <p className="eyebrow">Report Range</p>
          <h2>{reportRange.label}</h2>
        </div>
        <div className="report-controls" role="group" aria-label="Choose report range">
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
              <input
                type="month"
                value={customStartMonth}
                onChange={(event) => setCustomStartMonth(event.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="month"
                value={customEndMonth}
                onChange={(event) => setCustomEndMonth(event.target.value)}
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="journal-filter-panel" aria-label="Journal filters">
        <div className="filter-panel-heading">
          <div>
            <p className="eyebrow">Journal Filters</p>
            <h2>{activeFilterCount ? `${activeFilterCount} active` : "All trades"}</h2>
          </div>
          <div className="filter-panel-summary">
            <span>
              Showing <strong>{filteredReportTrades.length}</strong> of {reportTrades.length}
            </span>
            <button
              className="table-action"
              disabled={!journalFiltersActive(filters) && !logSearch}
              type="button"
              onClick={clearFilters}
            >
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
            <select
              value={filters.result}
              onChange={(event) => updateFilter("result", event.target.value as ResultFilter)}
            >
              {resultFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            BE Hit
            <select
              value={filters.beHit}
              onChange={(event) => updateFilter("beHit", event.target.value as JournalFilters["beHit"])}
            >
              <option value="all">All BE</option>
              <option value="Yes">BE Yes</option>
              <option value="No">BE No</option>
            </select>
          </label>
          <label>
            PA Rating
            <select
              value={filters.paRating}
              onChange={(event) => updateFilter("paRating", event.target.value as DailyRatingFilter)}
            >
              {paRatingFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            BE Trades
            <select
              value={filters.breakeven}
              onChange={(event) => updateFilter("breakeven", event.target.value as BreakevenFilter)}
            >
              {breakevenFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="metric-grid" aria-label={`Journal statistics for ${reportRange.label}`}>
        <article className="metric-card primary-metric">
          <span>Net Actual R</span>
          <strong className={toneClass(stats.totalActual)}>{rValue(stats.totalActual)}</strong>
          <small>{stats.trades} logged trades</small>
        </article>
        <article className="metric-card visual-metric">
          <div>
            <span>Profit Factor</span>
            <strong>{ratio(stats.profitFactor)}</strong>
          </div>
          <div
            className="mini-ring"
            style={{
              background: `conic-gradient(var(--green) ${clamp(stats.profitFactor === Infinity ? 360 : stats.profitFactor * 90, 0, 360)}deg, var(--red) 0deg)`,
            }}
          >
            <span>{ratio(stats.profitFactor)}</span>
          </div>
        </article>
        <article className="metric-card visual-metric">
          <div>
            <span>Trade Win %</span>
            <strong>{percent(stats.winRate)}</strong>
          </div>
          <div
            className="mini-ring"
            style={{
              background: `conic-gradient(var(--green) ${stats.winRate * 3.6}deg, var(--red) 0deg)`,
            }}
          >
            <span>{stats.wins}/{stats.losses}</span>
          </div>
        </article>
        <article className="metric-card spread-metric">
          <span>Avg Win/Loss</span>
          <strong>{ratio(stats.avgWinLoss)}</strong>
          <div className="spread-bar">
            <span style={{ width: `${clamp(stats.avgWinLoss * 24, 8, 92)}%` }} />
          </div>
          <small>
            +{rValue(stats.grossWin)} / -{rValue(stats.grossLoss)}
          </small>
        </article>
        <article className="metric-card">
          <span>Capture Rate</span>
          <strong className={toneClass(stats.captureRate)}>{percent(stats.captureRate)}</strong>
          <small>Avg Max {rValue(stats.avgMax)}</small>
        </article>
        <article className="metric-card score-metric">
          <span>Journal Score</span>
          <strong>{stats.score.toFixed(1)}</strong>
          <small>0-100</small>
        </article>
      </section>

      {notice ? <p className="notice dashboard-notice">{notice}</p> : null}
      {backupReminderDue ? (
        <section className="backup-reminder-panel" aria-label="Backup reminder">
          <div>
            <p className="eyebrow">Backup Reminder</p>
            <h2>Export a safety ZIP</h2>
            <small>Last backup: {lastBackupLabel}</small>
          </div>
          <div className="backup-reminder-actions">
            <button className="primary-button compact" disabled={isSaving} type="button" onClick={() => void exportJournal("backup")}>
              Export Backup
            </button>
            <button className="table-action" type="button" onClick={dismissBackupReminder}>
              Dismiss
            </button>
          </div>
        </section>
      ) : null}

      <section className="dashboard-grid" aria-label="Monthly dashboard">
        <section className="dashboard-main-column">
          <article className="review-panel calendar-panel calendar-dominant" id="calendar">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Calendar</p>
                <h2>{selectedMonthLabel} Actual R</h2>
              </div>
              <div className="month-summary">
                <span>
                  Actual <strong className={toneClass(monthlyStats.totalActual)}>{rValue(monthlyStats.totalActual)}</strong>
                </span>
                <span>
                  Win <strong>{percent(monthlyStats.winRate)}</strong>
                </span>
                <span>
                  Best <strong>{monthlyStats.best.label}</strong>
                </span>
              </div>
            </div>
            <div className="calendar-layout">
              <div className="calendar-grid">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <strong className="calendar-head" key={day}>
                    {day}
                  </strong>
                ))}
                {calendarCells.map((cell, index) => (
                  <button
                    className={`calendar-cell ${
                      cell.day ? (cell.count ? toneClass(cell.total) : "no-trade") : "blank"
                    } ${cell.hasJournal ? "has-journal" : ""}`}
                    disabled={!cell.day}
                    key={`${cell.date}-${index}`}
                    title={cell.hasJournal ? "Daily journal saved" : undefined}
                    type="button"
                    onClick={() => cell.day && openDayDetail(cell.date)}
                  >
                    {cell.day ? (
                      <>
                        <span>{cell.day}</span>
                        <strong>{cell.count ? rValue(cell.total) : ""}</strong>
                        <small>{cell.count ? `${cell.count} trades` : ""}</small>
                      </>
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="weekly-list">
                {weeklyRows.map((week) => (
                  <div className="weekly-row" key={week.label}>
                    <span>{week.label}</span>
                    <strong className={toneClass(week.total)}>
                      {week.tradeDays ? rValue(week.total) : "--"}
                    </strong>
                    <small>{week.tradeDays ? `${week.tradeDays} trade days` : "No trades"}</small>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <section className="operations-grid" aria-label="Trade operations">
            <section className="log-panel" id="trades" aria-labelledby="log-heading">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Trade Log</p>
                  <h2 id="log-heading">{reportRange.label}</h2>
                </div>
                <div className="panel-actions">
                  <input
                    aria-label="Search trade log"
                    className="log-search-input"
                    placeholder="Search setup, tags, notes..."
                    value={logSearch}
                    onChange={(event) => setLogSearch(event.target.value)}
                  />
                  <button className="utility-button" type="button" onClick={() => void loadTrades()}>
                    Refresh
                  </button>
                </div>
              </div>

              <div className="trade-table-wrap">
                <table className="trade-table">
                  <thead>
                    <tr>
                      {sortableTradeColumns.map((column) => (
                        <th key={column.key}>
                          <button
                            className={`sort-header ${tradeSort.key === column.key ? "active" : ""}`}
                            type="button"
                            onClick={() => toggleTradeSort(column.key)}
                          >
                            {column.label}
                            <span>{sortIndicator(column.key)}</span>
                          </button>
                        </th>
                      ))}
                      <th>Details</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReportTrades.map((trade) => {
                      const result = strategyResult(trade);
                      const tradeTags = tagList(trade);
                      return (
                        <tr
                          className="trade-row-clickable"
                          key={trade.id}
                          onClick={() => openTradeDetail(trade.id)}
                        >
                          <td>{trade.date}</td>
                          <td>{dayName(trade.date)}</td>
                          <td>
                            <span className={trade.beHit === "Yes" ? "be-pill yes" : "be-pill no"}>
                              {trade.beHit}
                            </span>
                          </td>
                          <td>{rValue(trade.firstTpR)}</td>
                          <td>{rValue(trade.maxR)}</td>
                          <td className={toneClass(trade.actualR)}>{rValue(trade.actualR)}</td>
                          <td className={toneClass(result.firstTp)}>{rValue(result.firstTp)}</td>
                          <td className={toneClass(result.onePointFive)}>
                            {rValue(result.onePointFive)}
                          </td>
                          <td className={toneClass(result.twoR)}>{rValue(result.twoR)}</td>
                          <td className={toneClass(result.threeR)}>{rValue(result.threeR)}</td>
                          <td className="details-cell">
                            <div className="trade-detail-stack">
                              <strong>
                                {[trade.instrument, trade.direction, trade.session].filter(Boolean).join(" · ") ||
                                  "No core details"}
                              </strong>
                              <small>{trade.setupName || "No setup"}</small>
                              {tradeTags.length ? (
                                <div className="tag-list">
                                  {tradeTags.slice(0, 4).map((tag) => (
                                    <span className="tag-chip" key={tag}>
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {trade.notes ? <small className="detail-snippet">{trade.notes}</small> : null}
                            </div>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="table-action"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  editTrade(trade);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="table-action"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  duplicateTrade(trade);
                                }}
                              >
                                Copy
                              </button>
                              <button
                                className="table-action danger"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void deleteTrade(trade.id);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!sortedReportTrades.length ? (
                      <tr>
                        <td className="empty-row" colSpan={12}>
                          {isLoading
                            ? "Loading trades..."
                            : reportTrades.length && !filteredReportTrades.length
                              ? "No trades match the filters."
                              : filteredReportTrades.length && logSearch
                                ? "No trades match the search."
                                : "No trades logged for this range yet."}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </section>

        <aside className="analytics-rail" id="analytics">
          <article className="review-panel score-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Score</p>
                <h2>Journal Score</h2>
              </div>
              <span className="status-pill">{stats.score.toFixed(1)}</span>
            </div>
            <div className="score-hero">
              <strong>{stats.score.toFixed(1)}</strong>
              <span>out of 100</span>
            </div>
            <div className="score-breakdown" aria-label="Journal score breakdown">
              {scoreBreakdownRows.map((item) => (
                <div className="score-breakdown-row" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <div className="score-track">
                    <span style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
              <div className="score-breakdown-row">
                <span>Leading exit</span>
                <strong>{stats.bestMethod.label}</strong>
              </div>
            </div>
          </article>

          <article className="review-panel strategy-ranking-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Ranking</p>
                <h2>Strategy Ranking</h2>
              </div>
              <span className="status-pill">{exitComparisonRows[0]?.label ?? "--"}</span>
            </div>
            <div className="strategy-ranking-list">
              {exitComparisonRows.map((row, index) => (
                <div className={`ranking-row ${row.key === "actual" ? "actual" : ""}`} key={row.key}>
                  <span className="rank-badge">#{index + 1}</span>
                  <div>
                    <strong>{row.label}</strong>
                    <small>{row.key === "actual" ? "Your logged exits" : `${signedRValue(row.delta)} vs actual`}</small>
                  </div>
                  <div className="ranking-result">
                    <strong className={toneClass(row.total)}>{rValue(row.total)}</strong>
                    <small>{percent(row.winRate)} win</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="review-panel weekday-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Day Analysis</p>
                <h2>Weekday Edge</h2>
              </div>
              <span className="status-pill">{bestWeekday?.label ?? "--"}</span>
            </div>
            <div className="weekday-list">
              {visibleWeekdayRows.map((row, index) => (
                <div className={`weekday-row ${index === 0 && row.trades ? "best" : ""}`} key={row.label}>
                  <span className="rank-badge">#{index + 1}</span>
                  <div>
                    <strong>{row.label}</strong>
                    <small>
                      {row.trades ? `${row.trades} trades · avg ${rValue(row.average)}` : "No trades"}
                    </small>
                  </div>
                  <div className="weekday-result">
                    <strong className={toneClass(row.total)}>
                      {row.trades ? rValue(row.total) : "--"}
                    </strong>
                    <small>{row.trades ? `${percent(row.winRate)} win` : "--"}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="review-panel curve-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Curve</p>
                <h2>Daily Net Cumulative R</h2>
              </div>
            </div>
            <svg className="curve-chart" role="img" viewBox="0 0 340 142">
              <line className="curve-zero" x1="0" x2="340" y1={cumulativeChart.baseY} y2={cumulativeChart.baseY} />
              <polygon className="curve-area" points={cumulativeChart.area} />
              <polyline className="curve-line" points={cumulativeChart.pointList} />
            </svg>
          </article>

        </aside>
      </section>
      </>
      )}

      {isDayDetailOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDayDetail();
            }
          }}
        >
          <section
            className="entry-panel entry-modal day-detail-modal notion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="day-detail-heading"
          >
            <div className="day-page-header">
              <div>
                <p className="eyebrow">Daily Page</p>
                <h2 id="day-detail-heading">{selectedDay}</h2>
                <div className="daily-journal-meta day-stat-strip">
                  <span>{selectedDayTrades.length} trade{selectedDayTrades.length === 1 ? "" : "s"}</span>
                  <span className={toneClass(selectedDayStats.total)}>Net {rValue(selectedDayStats.total)}</span>
                  <span>{selectedDayTrades.length ? `${percent(selectedDayStats.winRate)} win` : "No win rate"}</span>
                  {selectedDailyJournal ? <span>{selectedDailyJournal.attachments.length} file{selectedDailyJournal.attachments.length === 1 ? "" : "s"}</span> : null}
                </div>
              </div>
              <div className="panel-actions">
                <button className="utility-button compact" type="button" onClick={() => openNewTradeForDay()}>
                  New Trade
                </button>
                <button className="table-action" type="button" onClick={closeDayDetail}>
                  Close
                </button>
              </div>
            </div>

            <section className="day-detail-grid notion-day-grid">
              <article className="day-detail-section trade-stack-section">
                <div className="section-title-row">
                  <div>
                    <p className="eyebrow">Trades</p>
                    <h3>Session Entries</h3>
                  </div>
                </div>
                <div className="day-trade-list">
                  {selectedDayTrades.map((trade, index) => {
                    const tradeTags = tagList(trade);
                    return (
                      <article
                        className="day-trade-row trade-card-button"
                        key={trade.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Open trade ${index + 1} details`}
                        onClick={() => openTradeDetail(trade.id)}
                        onKeyDown={(event) => openTradeDetailFromKeyboard(event, trade.id)}
                      >
                        <span className="rank-badge">#{index + 1}</span>
                        <div>
                          <strong>
                            {[trade.session, trade.direction, trade.setupName].filter(Boolean).join(" · ") ||
                              "Trade"}
                          </strong>
                          <small>
                            BE {trade.beHit} · Actual {rValue(trade.actualR)} · Max {rValue(trade.maxR)}
                          </small>
                          {trade.notes ? <small className="detail-snippet">{trade.notes}</small> : null}
                          {tradeTags.length ? (
                            <div className="tag-list">
                              {tradeTags.map((tag) => (
                                <span className="tag-chip" key={tag}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="day-trade-actions">
                          <button
                            className="table-action"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              editTrade(trade);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="table-action"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              duplicateTrade(trade);
                            }}
                          >
                            Copy
                          </button>
                          <button
                            className="table-action danger"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void deleteTrade(trade.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                  {!selectedDayTrades.length ? (
                    <p className="day-empty">No trades logged for this date.</p>
                  ) : null}
                </div>
              </article>

              <article className="day-detail-section journal-workspace-section">
                <div className="section-title-row">
                  <div>
                    <p className="eyebrow">Daily Journal</p>
                    <h3>
                      {isDailyJournalLoading
                        ? "Loading..."
                        : selectedDailyJournal
                          ? "Review saved"
                          : "No journal yet"}
                    </h3>
                  </div>
                  <div className="panel-actions">
                    {selectedDailyJournal && !isDailyJournalEditing ? (
                      <>
                        <button className="table-action" type="button" onClick={startDailyJournalEdit}>
                          Edit
                        </button>
                        <button
                          className="table-action danger"
                          disabled={isDailyJournalSaving}
                          type="button"
                          onClick={() => void deleteDailyJournal()}
                        >
                          Delete
                        </button>
                      </>
                    ) : null}
                    {!selectedDailyJournal && !isDailyJournalEditing ? (
                      <button className="table-action" type="button" onClick={startDailyJournalEdit}>
                        Add Daily Journal
                      </button>
                    ) : null}
                  </div>
                </div>

                {isDailyJournalEditing ? (
                  dailyJournalForm
                ) : selectedDailyJournal ? (
                  <div className="daily-journal-view notion-journal-view">
                    <div className="journal-property-strip">
                      <span>PA Rating {selectedDailyJournal.priceActionRating}</span>
                      <span>{selectedDailyJournal.breakevenTrades} BE trade{selectedDailyJournal.breakevenTrades === 1 ? "" : "s"}</span>
                      {tagList(selectedDailyJournal).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <section className="notion-block">
                      <span>HTF Bias</span>
                      <p>{selectedDailyJournal.htfBias || "--"}</p>
                    </section>
                    <section className="notion-block">
                      <span>ORM</span>
                      <p>{selectedDailyJournal.orm || "--"}</p>
                    </section>
                    <section className="notion-block narrative-block">
                      <span>Narrative</span>
                      {renderNarrativeContent(selectedDailyJournal.narrative, selectedDayTrades)}
                    </section>
                    <section className="notion-block">
                      <span>What I did well and could have done better</span>
                      <p>{selectedDailyJournal.reviewNotes || "--"}</p>
                    </section>
                    {selectedDailyJournal.attachments.length ? (
                      <section className="notion-block media-block">
                        <span>Screenshots & Attachments</span>
                        {renderAttachmentGallery(selectedDailyJournal.attachments, false, "Daily Journal", selectedDailyJournal.date)}
                      </section>
                    ) : null}
                  </div>
                ) : (
                  <div className="journal-empty-card">
                    <p>Add the day review, screenshots, price action rating, and breakeven count here.</p>
                    <button className="primary-button compact" type="button" onClick={startDailyJournalEdit}>
                      Create Daily Journal
                    </button>
                  </div>
                )}
              </article>
            </section>
          </section>
        </div>
      ) : null}

      {selectedTradeDetail && selectedTradeStrategy ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTradeDetail();
            }
          }}
        >
          <section
            className="entry-panel entry-modal trade-detail-modal notion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-detail-heading"
          >
            <div className="day-page-header">
              <div>
                <p className="eyebrow">Trade Detail</p>
                <h2 id="trade-detail-heading">
                  {[selectedTradeDetail.session, selectedTradeDetail.direction, selectedTradeDetail.setupName]
                    .filter(Boolean)
                    .join(" · ") || "Trade"}
                </h2>
                <div className="daily-journal-meta day-stat-strip">
                  <span>{selectedTradeDetail.date}</span>
                  <span>{dayName(selectedTradeDetail.date)}</span>
                  <span className={toneClass(selectedTradeDetail.actualR)}>
                    Actual {rValue(selectedTradeDetail.actualR)}
                  </span>
                </div>
              </div>
              <div className="panel-actions">
                <button
                  className="utility-button compact"
                  type="button"
                  onClick={() => {
                    editTrade(selectedTradeDetail);
                    closeTradeDetail();
                  }}
                >
                  Edit
                </button>
                <button
                  className="utility-button compact"
                  type="button"
                  onClick={() => duplicateTrade(selectedTradeDetail)}
                >
                  Copy
                </button>
                <button
                  className="table-action danger"
                  type="button"
                  onClick={() => void deleteTrade(selectedTradeDetail.id)}
                >
                  Delete
                </button>
                <button className="table-action" type="button" onClick={closeTradeDetail}>
                  Close
                </button>
              </div>
            </div>

            <div className="trade-detail-page">
              <section className="trade-property-grid" aria-label="Trade properties">
                <div>
                  <span>Date</span>
                  <strong>{selectedTradeDetail.date}</strong>
                </div>
                <div>
                  <span>Instrument</span>
                  <strong>{selectedTradeDetail.instrument || "--"}</strong>
                </div>
                <div>
                  <span>Direction</span>
                  <strong>{selectedTradeDetail.direction || "--"}</strong>
                </div>
                <div>
                  <span>Session</span>
                  <strong>{selectedTradeDetail.session || "--"}</strong>
                </div>
                <div>
                  <span>Setup</span>
                  <strong>{selectedTradeDetail.setupName || "--"}</strong>
                </div>
                <div>
                  <span>BE Hit</span>
                  <strong>{selectedTradeDetail.beHit}</strong>
                </div>
              </section>

              <section className="trade-result-strip" aria-label="Trade results">
                <div>
                  <span>First TP</span>
                  <strong>{rValue(selectedTradeDetail.firstTpR)}</strong>
                  <small>Result {rValue(selectedTradeStrategy.firstTp)}</small>
                </div>
                <div>
                  <span>Max R</span>
                  <strong>{rValue(selectedTradeDetail.maxR)}</strong>
                  <small>Reached high</small>
                </div>
                <div>
                  <span>Actual</span>
                  <strong className={toneClass(selectedTradeDetail.actualR)}>
                    {rValue(selectedTradeDetail.actualR)}
                  </strong>
                  <small>Your exit</small>
                </div>
                <div>
                  <span>2R</span>
                  <strong className={toneClass(selectedTradeStrategy.twoR)}>
                    {rValue(selectedTradeStrategy.twoR)}
                  </strong>
                  <small>Alternate exit</small>
                </div>
              </section>

              {tagList(selectedTradeDetail).length ? (
                <div className="tag-list trade-detail-tags">
                  {tagList(selectedTradeDetail).map((tag) => (
                    <span className="tag-chip" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <section className="notion-block trade-note-block">
                <span>Note</span>
                <p>{selectedTradeDetail.notes || "No note saved for this trade."}</p>
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {expandedTextTarget ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeExpandedTextEditor();
            }
          }}
        >
          <section
            className="entry-panel entry-modal text-editor-modal notion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="text-editor-heading"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Writing Space</p>
                <h2 id="text-editor-heading">{expandedTextTarget.label}</h2>
              </div>
              <div className="panel-actions">
                <button className="table-action" type="button" onClick={closeExpandedTextEditor}>
                  Done
                </button>
              </div>
            </div>
            <textarea
              autoFocus
              className={`expanded-textarea ${
                expandedTextTarget.scope === "daily" && expandedTextTarget.field === "narrative"
                  ? "journal-mono-textarea"
                  : ""
              }`}
              value={expandedTextValue}
              placeholder={expandedTextTarget.placeholder}
              onChange={(event) => updateExpandedText(event.target.value)}
            />
          </section>
        </div>
      ) : null}

      {attachmentPreview && previewAttachment ? (
        <div
          className="modal-backdrop image-preview-backdrop cinematic-preview-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAttachmentPreview();
            }
          }}
        >
          <section
            className="image-preview-modal cinematic-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attachment-preview-heading"
          >
            <div className="cinematic-preview-topbar">
              <div>
                <p className="eyebrow">Screenshot Viewer</p>
                <h2 id="attachment-preview-heading">{previewAttachment.filename}</h2>
                <small className="preview-caption">{previewAttachmentMeta}</small>
              </div>
              <div className="cinematic-preview-actions">
                <button
                  className="cinematic-icon-button"
                  aria-label="Previous screenshot"
                  disabled={attachmentPreview.attachments.length <= 1}
                  type="button"
                  onClick={() => moveAttachmentPreview(-1)}
                >
                  &lt;
                </button>
                <button
                  className="cinematic-icon-button"
                  aria-label="Next screenshot"
                  disabled={attachmentPreview.attachments.length <= 1}
                  type="button"
                  onClick={() => moveAttachmentPreview(1)}
                >
                  &gt;
                </button>
                <button
                  className="cinematic-icon-button"
                  aria-label="Zoom out"
                  type="button"
                  onClick={() => setAttachmentZoom((current) => clamp(current - 0.25, 1, 2.5))}
                >
                  -
                </button>
                <button className="cinematic-zoom-button" type="button" onClick={() => setAttachmentZoom(1)}>
                  {attachmentZoom === 1 ? "Fit" : `${Math.round(attachmentZoom * 100)}%`}
                </button>
                <button
                  className="cinematic-icon-button"
                  aria-label="Zoom in"
                  type="button"
                  onClick={() => setAttachmentZoom((current) => clamp(current + 0.25, 1, 2.5))}
                >
                  +
                </button>
                {attachmentPreview.sourceDate ? (
                  <button className="cinematic-text-button" type="button" onClick={openPreviewSourceDay}>
                    Day
                  </button>
                ) : null}
                <a className="cinematic-text-button" href={previewAttachment.url} target="_blank" rel="noreferrer">
                  Open
                </a>
                <button className="cinematic-icon-button" aria-label="Close screenshot viewer" type="button" onClick={closeAttachmentPreview}>
                  X
                </button>
              </div>
            </div>
            <div className="image-preview-stage cinematic-preview-stage">
              {attachmentPreview.attachments.length > 1 ? (
                <button
                  className="cinematic-side-button left"
                  aria-label="Previous screenshot"
                  type="button"
                  onClick={() => moveAttachmentPreview(-1)}
                >
                  &lt;
                </button>
              ) : null}
              <div
                aria-label={previewAttachment.filename}
                className="cinematic-image-frame"
                role="img"
                style={previewImageStyle}
              />
              {attachmentPreview.attachments.length > 1 ? (
                <button
                  className="cinematic-side-button right"
                  aria-label="Next screenshot"
                  type="button"
                  onClick={() => moveAttachmentPreview(1)}
                >
                  &gt;
                </button>
              ) : null}
            </div>
            {attachmentPreview.attachments.length > 1 ? (
              <div className="cinematic-thumbnail-strip" aria-label="Screenshot thumbnails">
                {attachmentPreview.attachments.map((attachment, index) => (
                  <button
                    className={index === attachmentPreview.index ? "active" : ""}
                    key={attachment.id}
                    type="button"
                    aria-label={`Open screenshot ${index + 1}`}
                    onClick={() => {
                      setAttachmentPreview((current) => (current ? { ...current, index } : current));
                      setAttachmentZoom(1);
                    }}
                  >
                    <img alt="" src={attachment.url} />
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {isEntryOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              hideEntryDialog();
            }
          }}
        >
          <section
            className="entry-panel entry-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-heading"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Entry</p>
                <h2 id="entry-heading">{editingId ? "Edit Trade" : "New Trade"}</h2>
              </div>
              <div className="panel-actions">
                <span className="status-pill">{selectedMonth}</span>
                <button className="table-action" type="button" onClick={closeEntryDialog}>
                  Close
                </button>
              </div>
            </div>

            {entryForm}

            <div className="rule-note">
              <strong>BE gate:</strong> No means every planned strategy is -1R. Yes means
              Max R decides which targets were reached; missed targets count 0R.
            </div>
          </section>
        </div>
      ) : null}

      {pendingRestore && pendingRestoreRange && pendingRestoreScoped ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setPendingRestore(null);
            }
          }}
        >
          <section
            className="entry-panel entry-modal import-review-modal restore-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-preview-heading"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Backup Restore</p>
                <h2 id="restore-preview-heading">Choose restore range</h2>
                <small className="restore-file-name">{pendingRestore.fileName}</small>
              </div>
              <div className="panel-actions">
                <button
                  className="table-action"
                  disabled={isSaving}
                  type="button"
                  onClick={() => setPendingRestore(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <p className="import-review-copy">
              {pendingRestore.mode === "replace"
                ? "Replace clears existing local records only inside the selected range, then restores that range from the ZIP."
                : "Merge imports missing records inside the selected range and skips matching trades or existing daily journal dates."}
            </p>

            <div className="restore-backup-meta">
              <span>{pendingRestore.trades.length} trades in backup</span>
              <span>{pendingRestore.dailyJournals.length} daily journals in backup</span>
              <span>{restoreTotalAttachments} attachment references</span>
            </div>

            <div className="restore-range-controls">
              <div className="report-controls restore-scope-controls" role="group" aria-label="Choose restore scope">
                {restoreScopeOptions.map((option) => (
                  <button
                    className={restoreScopeMode === option.mode ? "active" : ""}
                    disabled={isSaving}
                    key={option.mode}
                    type="button"
                    onClick={() => setRestoreScopeMode(option.mode)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {restoreScopeMode === "month" ? (
                <label className="restore-picker">
                  Month
                  <select
                    disabled={isSaving}
                    value={restoreMonth}
                    onChange={(event) => setRestoreMonth(event.target.value)}
                  >
                    {pendingRestore.availableMonths.map((month) => (
                      <option key={month} value={month}>
                        {monthLabel(month)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {restoreScopeMode === "year" ? (
                <label className="restore-picker">
                  Year
                  <select
                    disabled={isSaving}
                    value={restoreYear}
                    onChange={(event) => setRestoreYear(event.target.value)}
                  >
                    {pendingRestore.availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {restoreScopeMode === "custom" ? (
                <div className="custom-month-range restore-custom-range">
                  <label>
                    From
                    <input
                      disabled={isSaving}
                      max={pendingRestore.availableMonths.at(-1)}
                      min={pendingRestore.availableMonths[0]}
                      type="month"
                      value={restoreStartMonth}
                      onChange={(event) => setRestoreStartMonth(event.target.value)}
                    />
                  </label>
                  <label>
                    To
                    <input
                      disabled={isSaving}
                      max={pendingRestore.availableMonths.at(-1)}
                      min={pendingRestore.availableMonths[0]}
                      type="month"
                      value={restoreEndMonth}
                      onChange={(event) => setRestoreEndMonth(event.target.value)}
                    />
                  </label>
                </div>
              ) : null}
            </div>

            <div className="import-review-stats restore-preview-stats">
              <div>
                <strong>{pendingRestoreScoped.trades.length}</strong>
                <span>selected trades</span>
              </div>
              <div>
                <strong>{pendingRestoreScoped.dailyJournals.length}</strong>
                <span>selected daily journals</span>
              </div>
              <div>
                <strong>{pendingRestoreScoped.attachmentReferences}</strong>
                <span>selected attachments</span>
              </div>
            </div>

            <p className="data-menu-note restore-selected-range">
              Selected range: {pendingRestoreRange.label}
            </p>

            <div className="import-review-actions">
              <button
                className="utility-button"
                disabled={isSaving}
                type="button"
                onClick={() => setPendingRestore(null)}
              >
                Cancel
              </button>
              <button
                className="primary-button compact"
                disabled={isSaving || (!pendingRestoreScoped.trades.length && !pendingRestoreScoped.dailyJournals.length)}
                type="button"
                onClick={() => void confirmRestoreBackup()}
              >
                {restoreActionLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {pendingImport ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) {
              setPendingImport(null);
            }
          }}
        >
          <section
            className="entry-panel entry-modal import-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-review-heading"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Import Review</p>
                <h2 id="import-review-heading">Possible duplicate trades</h2>
              </div>
              <div className="panel-actions">
                <button
                  className="table-action"
                  disabled={isSaving}
                  type="button"
                  onClick={() => setPendingImport(null)}
                >
                  Close
                </button>
              </div>
            </div>

            <p className="import-review-copy">
              {pendingImport.duplicateMatches.length} row
              {pendingImport.duplicateMatches.length === 1 ? "" : "s"} from {pendingImport.sourceName} look
              identical to trades already in the website.
              {pendingImport.dailyJournals.length
                ? ` ${pendingImport.dailyJournals.length} daily journal${
                    pendingImport.dailyJournals.length === 1 ? "" : "s"
                  } will be imported if the date is empty.`
                : ""}
            </p>

            <div className="import-review-stats">
              <div>
                <strong>{pendingImport.readyTrades.length}</strong>
                <span>new trades ready</span>
              </div>
              <div>
                <strong>{pendingImport.duplicateMatches.length}</strong>
                <span>possible matches</span>
              </div>
              <div>
                <strong>{pendingImport.skippedById}</strong>
                <span>already skipped by ID</span>
              </div>
            </div>

            <div className="duplicate-preview" aria-label="Rows that look identical">
              {pendingImport.duplicateMatches.slice(0, 4).map((trade, index) => (
                <div className="duplicate-preview-row" key={`${trade.date}-${index}`}>
                  <strong>{trade.date}</strong>
                  <span>{trade.beHit} BE</span>
                  <span>Actual {rValue(trade.actualR)}</span>
                  <small>{trade.notes || "No note"}</small>
                </div>
              ))}
              {pendingImport.duplicateMatches.length > 4 ? (
                <p className="data-menu-note">
                  {pendingImport.duplicateMatches.length - 4} more matching row
                  {pendingImport.duplicateMatches.length - 4 === 1 ? "" : "s"} hidden.
                </p>
              ) : null}
            </div>

            <div className="import-review-actions">
              <button
                className="utility-button"
                disabled={isSaving}
                type="button"
                onClick={() => setPendingImport(null)}
              >
                Cancel
              </button>
              <button
                className="utility-button"
                disabled={isSaving}
                type="button"
                onClick={() =>
                  void importTrades(pendingImport.readyTrades, pendingImport.skippedById, pendingImport.dailyJournals)
                }
              >
                Skip duplicates
              </button>
              <button
                className="primary-button compact"
                disabled={isSaving}
                type="button"
                onClick={() =>
                  void importTrades(
                    [...pendingImport.readyTrades, ...pendingImport.duplicateMatches],
                    pendingImport.skippedById,
                    pendingImport.dailyJournals,
                  )
                }
              >
                {isSaving ? "Importing..." : "Import anyway"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isSecurityOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeSecurityDialog();
            }
          }}
        >
          <section
            className="entry-panel entry-modal security-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="security-heading"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Security</p>
                <h2 id="security-heading">Change Password</h2>
              </div>
              <div className="panel-actions">
                <button className="table-action" type="button" onClick={closeSecurityDialog}>
                  Close
                </button>
              </div>
            </div>

            <form className="trade-form" onSubmit={changePassword}>
              <label>
                Current Password
                <input
                  autoComplete="current-password"
                  type="password"
                  value={passwordDraft.currentPassword}
                  onChange={(event) =>
                    setPasswordDraft((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="field-row">
                <label>
                  New Password
                  <input
                    autoComplete="new-password"
                    type="password"
                    value={passwordDraft.newPassword}
                    onChange={(event) =>
                      setPasswordDraft((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Confirm Password
                  <input
                    autoComplete="new-password"
                    type="password"
                    value={passwordDraft.confirmPassword}
                    onChange={(event) =>
                      setPasswordDraft((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <button className="primary-button" disabled={isPasswordSaving} type="submit">
                {isPasswordSaving ? "Updating..." : "Update Password"}
              </button>
              <button
                className="utility-button"
                disabled={isPasswordSaving}
                type="button"
                onClick={closeSecurityDialog}
              >
                Cancel
              </button>
              {securityNotice ? <p className="notice">{securityNotice}</p> : null}
            </form>

            <div className="rule-note">Use 12+ characters with a mix of letters, numbers, and symbols.</div>
          </section>
        </div>
      ) : null}
      </div>
    </main>
  );
}
