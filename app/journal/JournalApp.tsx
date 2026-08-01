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

type PendingImport = {
  duplicateMatches: ImportTrade[];
  readyTrades: ImportTrade[];
  skippedById: number;
  sourceName: string;
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
  error?: string;
  ok?: boolean;
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

const reportOptions: Array<{ label: string; mode: ReportMode }> = [
  { label: "Selected Month", mode: "month" },
  { label: "Current Year", mode: "year" },
  { label: "All", mode: "all" },
  { label: "Custom", mode: "custom" },
];

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

function renderNarrativeContent(narrative: string, trades: ExitTrade[]) {
  const blocks = narrative.trim()
    ? narrative
        .trim()
        .split(/\n\s*\n/)
        .map((block) => block.split("\n").map((line) => line.trimEnd()).filter(Boolean))
        .filter((block) => block.length)
    : [];

  if (!blocks.length) {
    return <p>--</p>;
  }

  return (
    <div className="narrative-render">
      {blocks.map((block, blockIndex) => {
        const [header, ...details] = block;
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

function normalizeAttachments(value: unknown): TradeAttachment[] {
  const rawAttachments = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim()
      ? parseAttachmentJson(value) || parseAttachmentText(value)
      : [];

  if (!Array.isArray(rawAttachments)) {
    return [];
  }

  return rawAttachments
    .map((attachment): TradeAttachment | null => {
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
    })
    .filter((attachment): attachment is TradeAttachment => Boolean(attachment));
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

function filenamePart(label: string) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "trades"
  );
}

function toCsv(trades: ExitTrade[]) {
  const headers = [
    "id",
    "date",
    "day",
    "instrument",
    "direction",
    "session",
    "setupName",
    "beHit",
    "firstTpR",
    "maxR",
    "actualR",
    "tags",
    "firstTpResult",
    "onePointFiveResult",
    "twoRResult",
    "threeRResult",
    "notes",
  ];

  const escapeCell = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`;

  const rows = trades.map((trade) => {
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
      trade.tags,
      result.firstTp,
      result.onePointFive,
      result.twoR,
      result.threeR,
      trade.notes,
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCell(cell)).join(","))
    .join("\n");
}

const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const excelColumns = [
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
  "Tags",
  "First TP Result",
  "1.5R Result",
  "2R Result",
  "3R Result",
  "Notes",
] as const;

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

function toXlsxBlob(trades: ExitTrade[]) {
  const rows = [
    [...excelColumns],
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
        trade.tags,
        result.firstTp,
        result.onePointFive,
        result.twoR,
        result.threeR,
        trade.notes,
      ];
    }),
  ];
  const sheetXml = worksheetXml(rows);

  return createStoredZip({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Trades" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    "xl/worksheets/sheet1.xml": sheetXml,
  });
}

function worksheetXml(rows: Array<Array<number | string>>) {
  const body = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row
        .map((value, columnIndex) => {
          const ref = `${columnName(columnIndex + 1)}${rowNumber}`;
          if (typeof value === "number") {
            return `<c r="${ref}"><v>${value}</v></c>`;
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:L${Math.max(rows.length, 1)}"/>
  <cols>
    <col min="1" max="1" width="38" customWidth="1"/>
    <col min="2" max="2" width="13" customWidth="1"/>
    <col min="3" max="3" width="12" customWidth="1"/>
    <col min="4" max="11" width="14" customWidth="1"/>
    <col min="12" max="12" width="42" customWidth="1"/>
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

async function unzipWorkbook(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  const eocdOffset = findEndOfCentralDirectory(bytes);
  if (eocdOffset < 0) {
    throw new Error("That file does not look like an Excel workbook.");
  }

  const entryCount = readUint16(bytes, eocdOffset + 10);
  let centralOffset = readUint32(bytes, eocdOffset + 16);
  const files: Record<string, Uint8Array> = {};

  for (let entry = 0; entry < entryCount; entry += 1) {
    if (readUint32(bytes, centralOffset) !== 0x02014b50) {
      throw new Error("Could not read the Excel workbook directory.");
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
        throw new Error("That Excel file uses an unsupported compression format.");
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

  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
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

function createStoredZip(files: Record<string, string>) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  Object.entries(files).forEach(([name, body]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(body);
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

  return new Blob(chunks, { type: xlsxMime });
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

function parseJsonTrades(parsed: unknown) {
  const rawTrades = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && "trades" in parsed
      ? (parsed as { trades?: unknown[] }).trades ?? []
      : [];
  return rawTrades.map(normalizeTrade).filter((trade): trade is ImportTrade => Boolean(trade));
}

export default function Home() {
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
  const [tradeSort, setTradeSort] = useState<TradeSort>({ direction: "desc", key: "date" });
  const [attachmentPreview, setAttachmentPreview] = useState<TradeAttachment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedTextTarget, setExpandedTextTarget] = useState<TextEditorTarget | null>(null);
  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const [isDeviceLoading, setIsDeviceLoading] = useState(true);
  const [isDeviceUploading, setIsDeviceUploading] = useState(false);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [isDailyJournalEditing, setIsDailyJournalEditing] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDailyJournalLoading, setIsDailyJournalLoading] = useState(true);
  const [isDailyJournalSaving, setIsDailyJournalSaving] = useState(false);
  const [isDailyJournalAttachmentUploading, setIsDailyJournalAttachmentUploading] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [passwordDraft, setPasswordDraft] = useState<PasswordDraft>(() => emptyPasswordDraft());
  const [selectedTradeDetailId, setSelectedTradeDetailId] = useState<string | null>(null);
  const [deviceNotice, setDeviceNotice] = useState("");
  const [securityNotice, setSecurityNotice] = useState("");
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTrades();
      void loadDailyJournals();
      void loadDeviceFiles();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDailyJournals, loadDeviceFiles, loadTrades]);

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
  const reportRange = useMemo(() => {
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
      sortedTrades.filter((trade) => {
        if (reportRange.mode === "all") {
          return true;
        }
        if (reportRange.mode === "year") {
          return trade.date.startsWith(`${reportRange.year}-`);
        }

        const key = monthKey(trade.date);
        return key >= (reportRange.from ?? selectedMonth) && key <= (reportRange.to ?? selectedMonth);
      }),
    [reportRange, selectedMonth, sortedTrades],
  );

  const filteredReportTrades = useMemo(() => {
    const query = logSearch.trim().toLowerCase();
    if (!query) {
      return reportTrades;
    }

    return reportTrades.filter((trade) => searchableTradeText(trade).includes(query));
  }, [logSearch, reportTrades]);

  const sortedReportTrades = useMemo(
    () => [...filteredReportTrades].sort((left, right) => compareTradesForSort(left, right, tradeSort)),
    [filteredReportTrades, tradeSort],
  );

  const dailyJournalByDate = useMemo(
    () => new Map(dailyJournals.map((journal) => [journal.date, journal])),
    [dailyJournals],
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
        values: reportTrades.map((trade) => trade.actualR),
      },
      {
        key: "firstTp",
        label: "First TP",
        values: reportTrades.map((trade) => strategyResult(trade).firstTp),
      },
      {
        key: "onePointFive",
        label: "1.5R",
        values: reportTrades.map((trade) => strategyResult(trade).onePointFive),
      },
      {
        key: "twoR",
        label: "2R",
        values: reportTrades.map((trade) => strategyResult(trade).twoR),
      },
      {
        key: "threeR",
        label: "3R",
        values: reportTrades.map((trade) => strategyResult(trade).threeR),
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
  }, [reportTrades]);

  const stats = useMemo(() => {
    const totalActual = reportTrades.reduce((sum, trade) => sum + trade.actualR, 0);
    const totalMax = reportTrades.reduce((sum, trade) => sum + trade.maxR, 0);
    const winners = reportTrades.filter((trade) => trade.actualR > 0);
    const losers = reportTrades.filter((trade) => trade.actualR < 0);
    const wins = winners.length;
    const beHits = reportTrades.filter((trade) => trade.beHit === "Yes").length;
    const grossWin = winners.reduce((sum, trade) => sum + trade.actualR, 0);
    const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + trade.actualR, 0));
    const avgWin = winners.length ? grossWin / winners.length : 0;
    const avgLoss = losers.length ? grossLoss / losers.length : 0;
    const profitFactor = grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0;
    const avgWinLoss = avgLoss ? avgWin / avgLoss : avgWin ? Infinity : 0;
    const avgMax = reportTrades.length
      ? reportTrades.reduce((sum, trade) => sum + trade.maxR, 0) / reportTrades.length
      : 0;
    const bestMethod = strategyRows.reduce(
      (best, row) => (row.total > best.total ? row : best),
      strategyRows[0] ?? { label: "Actual", total: 0 },
    );

    const winRate = reportTrades.length ? (wins / reportTrades.length) * 100 : 0;
    const captureRate = totalMax ? (totalActual / totalMax) * 100 : 0;
    const beRate = reportTrades.length ? (beHits / reportTrades.length) * 100 : 0;
    const score = clamp(
      winRate * 0.28 +
        clamp(captureRate, 0, 100) * 0.28 +
        clamp(profitFactor === Infinity ? 100 : profitFactor * 34, 0, 100) * 0.24 +
        beRate * 0.2,
      0,
      100,
    );

    return {
      avgActual: reportTrades.length ? totalActual / reportTrades.length : 0,
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
      trades: reportTrades.length,
      winRate,
      wins,
    };
  }, [reportTrades, strategyRows]);

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

    reportTrades.forEach((trade) => {
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
  }, [reportTrades]);

  const visibleWeekdayRows = useMemo(
    () => weekdayRows.filter((row) => row.trades > 0 || !weekendLabels.has(row.label)),
    [weekdayRows],
  );

  const bestWeekday = weekdayRows.find((row) => row.trades > 0);

  const monthlyStats = useMemo(() => {
    const totalActual = monthlyTrades.reduce((sum, trade) => sum + trade.actualR, 0);
    const totalMax = monthlyTrades.reduce((sum, trade) => sum + trade.maxR, 0);
    const wins = monthlyTrades.filter((trade) => trade.actualR > 0).length;
    const methodTotals = monthlyTrades.reduce(
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
      trades: monthlyTrades.length,
      winRate: monthlyTrades.length ? (wins / monthlyTrades.length) * 100 : 0,
    };
  }, [monthlyTrades]);

  const calendarCells = useMemo(() => {
    const lead = firstWeekday(selectedMonth);
    const days = daysInMonth(selectedMonth);
    const cells: Array<{ count: number; date: string; day: number | null; hasJournal: boolean; total: number }> = [];

    for (let index = 0; index < lead; index += 1) {
      cells.push({ count: 0, date: "", day: null, hasJournal: false, total: 0 });
    }

    for (let day = 1; day <= days; day += 1) {
      const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
      const dayTrades = monthlyTrades.filter((trade) => trade.date === date);
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
  }, [dailyJournalByDate, monthlyTrades, selectedMonth]);

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
    const reportAscending = [...reportTrades].sort((a, b) => {
      const dateSort = a.date.localeCompare(b.date);
      return dateSort || (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });

    return reportAscending.reduce<number[]>(
      (points, trade) => [...points, (points.at(-1) ?? 0) + trade.actualR],
      [0],
    );
  }, [reportTrades]);

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

  const selectedMonthLabel = monthLabel(selectedMonth);

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
    setDraft({
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
    });
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
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to delete trade");
      }
      setTrades((current) => current.filter((trade) => trade.id !== id));
      if (editingId === id) {
        resetForm();
        setIsEntryOpen(false);
      }
      if (selectedTradeDetailId === id) {
        setSelectedTradeDetailId(null);
      }
      setNotice("Trade deleted.");
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
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to delete daily journal");
      }

      setDailyJournals((current) => current.filter((journal) => journal.id !== selectedDailyJournal.id));
      setDailyDraft(defaultDailyJournal(selectedDay));
      setIsDailyJournalEditing(true);
      setNotice("Daily journal deleted.");
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

  async function uploadJournalAttachment(file: File, filename: string) {
    const response = await fetch(`/api/journal-attachments?filename=${encodeURIComponent(filename)}`, {
      body: file,
      headers: {
        "content-type": file.type || "application/octet-stream",
        "x-journal-attachment-size": String(file.size),
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

  function removeDailyJournalAttachment(id: string) {
    setDailyDraft((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== id),
    }));
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

  function exportJournal(format: "csv" | "json" | "xlsx") {
    setIsDataMenuOpen(false);

    if (format === "json") {
      downloadFile(
        `${exportBaseName}.json`,
        JSON.stringify(
          {
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

    if (format === "csv") {
      downloadFile(`${exportBaseName}.csv`, toCsv(sortedReportTrades), "text/csv");
      return;
    }

    downloadBlob(`${exportBaseName}.xlsx`, toXlsxBlob(sortedReportTrades));
  }

  function downloadTemplate() {
    setIsDataMenuOpen(false);
    downloadBlob("exit-journal-template.xlsx", toXlsxBlob([]));
  }

  async function importTrades(importTrades: ImportTrade[], skippedById = 0) {
    setPendingImport(null);

    if (!importTrades.length) {
      setNotice(
        skippedById
          ? `${skippedById} existing trade${skippedById === 1 ? "" : "s"} skipped. Nothing new to import.`
          : "No new trades to import.",
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

      await loadTrades();
      setNotice(
        `${importedCount} trade${importedCount === 1 ? "" : "s"} imported.${
          skippedById
            ? ` ${skippedById} existing trade${skippedById === 1 ? "" : "s"} skipped.`
            : ""
        }`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to import trades");
    } finally {
      setIsSaving(false);
    }
  }

  async function reviewImport(importedTrades: ImportTrade[], sourceName: string) {
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
        duplicateMatches,
        readyTrades,
        skippedById,
        sourceName,
      });
      return;
    }

    await importTrades(readyTrades, skippedById);
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
        ? await parseXlsxTrades(file)
        : parseJsonTrades(JSON.parse(await file.text()));

      if (!normalized.length) {
        throw new Error("No valid trades found in that file.");
      }

      await reviewImport(normalized, file.name);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to import trades");
    } finally {
      setIsSaving(false);
      event.target.value = "";
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

  function renderAttachmentGallery(attachments: TradeAttachment[], editable = false) {
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
                    setAttachmentPreview(attachment);
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
                      onClick={() => removeDailyJournalAttachment(attachment.id)}
                    >
                      Remove
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
        </div>
        <div className="field-row compact-fields">
          <label>
            Date
            <input
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
          renderAttachmentGallery(dailyDraft.attachments, true)
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
          <a className="active" href="#dashboard-overview" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">D</span>
            <strong>Dashboard</strong>
          </a>
          <a href="#calendar" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">C</span>
            <strong>Calendar</strong>
          </a>
          <a href="#trades" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">T</span>
            <strong>Trade Log</strong>
          </a>
          <a href="#analytics" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">A</span>
            <strong>Analytics</strong>
          </a>
          <a href="/journal/device-files" onClick={() => setIsMobileNavOpen(false)}>
            <span aria-hidden="true">F</span>
            <strong>Device Files</strong>
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
              <p className="eyebrow">R Journal</p>
              <h1>Trading Dashboard</h1>
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
                  <button className="data-menu-item" type="button" role="menuitem" onClick={() => exportJournal("xlsx")}>
                    Excel
                  </button>
                  <button className="data-menu-item" type="button" role="menuitem" onClick={() => exportJournal("csv")}>
                    CSV
                  </button>
                  <button className="data-menu-item" type="button" role="menuitem" onClick={() => exportJournal("json")}>
                    JSON
                  </button>
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
                          {isLoading ? "Loading trades..." : "No trades logged for this range yet."}
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
                        {renderAttachmentGallery(selectedDailyJournal.attachments)}
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

      {attachmentPreview ? (
        <div
          className="modal-backdrop image-preview-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAttachmentPreview(null);
            }
          }}
        >
          <section
            className="entry-panel entry-modal image-preview-modal notion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attachment-preview-heading"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Preview</p>
                <h2 id="attachment-preview-heading">{attachmentPreview.filename}</h2>
              </div>
              <div className="panel-actions">
                <a className="table-action" href={attachmentPreview.url} target="_blank" rel="noreferrer">
                  Open
                </a>
                <button className="table-action" type="button" onClick={() => setAttachmentPreview(null)}>
                  Close
                </button>
              </div>
            </div>
            <img alt={attachmentPreview.filename} className="image-preview" src={attachmentPreview.url} />
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
                  void importTrades(pendingImport.readyTrades, pendingImport.skippedById)
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
