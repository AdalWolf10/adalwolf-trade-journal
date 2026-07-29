"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type BeHit = "Yes" | "No";

type ExitTrade = {
  id: string;
  date: string;
  beHit: BeHit;
  firstTpR: number;
  maxR: number;
  actualR: number;
  notes: string;
  createdAt?: number;
  updatedAt?: number;
};

type DraftTrade = Omit<ExitTrade, "id" | "createdAt" | "updatedAt">;

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

const sampleTrades: DraftTrade[] = [
  {
    date: "2026-07-06",
    beHit: "Yes",
    firstTpR: 1,
    maxR: 1.7,
    actualR: 0.8,
    notes: "Reached first target and 1.5R, then faded before 2R.",
  },
  {
    date: "2026-07-08",
    beHit: "No",
    firstTpR: 1,
    maxR: 0.4,
    actualR: -1,
    notes: "Never protected the trade; full stop.",
  },
  {
    date: "2026-07-10",
    beHit: "Yes",
    firstTpR: 1.1,
    maxR: 3.2,
    actualR: 2.1,
    notes: "Runner reached 3R. Good patience after first TP.",
  },
  {
    date: "2026-07-14",
    beHit: "Yes",
    firstTpR: 0.8,
    maxR: 1.1,
    actualR: 0,
    notes: "BE protected the trade, but target selection was too tight.",
  },
];

function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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

function defaultDraft(month = initialMonth): DraftTrade {
  return {
    date: `${month}-01`,
    beHit: "Yes",
    firstTpR: 1,
    maxR: 1,
    actualR: 0,
    notes: "",
  };
}

function dayName(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

function monthKey(date: string) {
  return date.slice(0, 7);
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

function toneClass(value: number) {
  if (value > 0) {
    return "positive";
  }
  if (value < 0) {
    return "negative";
  }
  return "neutral";
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

function toCsv(trades: ExitTrade[]) {
  const headers = [
    "date",
    "day",
    "beHit",
    "firstTpR",
    "maxR",
    "actualR",
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
      trade.date,
      dayName(trade.date),
      trade.beHit,
      trade.firstTpR,
      trade.maxR,
      trade.actualR,
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
  "Date",
  "Day",
  "BE Hit",
  "First TP R",
  "Max R",
  "Actual R",
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
        trade.date,
        dayName(trade.date),
        trade.beHit,
        trade.firstTpR,
        trade.maxR,
        trade.actualR,
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
  <dimension ref="A1:K${Math.max(rows.length, 1)}"/>
  <cols>
    <col min="1" max="1" width="13" customWidth="1"/>
    <col min="2" max="2" width="12" customWidth="1"/>
    <col min="3" max="10" width="14" customWidth="1"/>
    <col min="11" max="11" width="42" customWidth="1"/>
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
  const columns: Partial<Record<keyof DraftTrade, number>> = {};
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
        beHit,
        date: parseDateCell(row[columns.date as number]),
        firstTpR: parseNumberCell(row[columns.firstTpR as number]) ?? (beHit === "No" ? 1 : undefined),
        maxR: parseNumberCell(row[columns.maxR as number]) ?? (beHit === "No" ? 0 : undefined),
        notes: columns.notes === undefined ? "" : row[columns.notes],
      });
    })
    .filter((trade): trade is DraftTrade => Boolean(trade));
}

const headerAliases: Record<string, keyof DraftTrade> = {
  actual: "actualR",
  actualr: "actualR",
  actualexit: "actualR",
  actualresult: "actualR",
  be: "beHit",
  breakevenhit: "beHit",
  behit: "beHit",
  behitno: "beHit",
  behityes: "beHit",
  breakeven: "beHit",
  comment: "notes",
  comments: "notes",
  date: "date",
  entrydate: "date",
  exitr: "actualR",
  firsttarget: "firstTpR",
  firsttargetr: "firstTpR",
  firsttakeprofit: "firstTpR",
  firsttp: "firstTpR",
  firsttpr: "firstTpR",
  highestr: "maxR",
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
  takeprofit1: "firstTpR",
  target1: "firstTpR",
  tp1: "firstTpR",
  tradedate: "date",
};

function headerScore(row: string[]) {
  const found = new Set<keyof DraftTrade>();
  row.forEach((header) => {
    const key = headerAliases[normalizeHeader(header)];
    if (key) {
      found.add(key);
    }
  });
  return ["date", "beHit", "firstTpR", "maxR", "actualR"].filter((key) =>
    found.has(key as keyof DraftTrade),
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

function normalizeTrade(value: unknown): DraftTrade | null {
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
    date: trade.date,
    beHit,
    firstTpR,
    maxR,
    actualR,
    notes: typeof trade.notes === "string" ? trade.notes : "",
  };
}

function parseJsonTrades(parsed: unknown) {
  const rawTrades = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && "trades" in parsed
      ? (parsed as { trades?: unknown[] }).trades ?? []
      : [];
  return rawTrades.map(normalizeTrade).filter((trade): trade is DraftTrade => Boolean(trade));
}

export default function Home() {
  const [trades, setTrades] = useState<ExitTrade[]>([]);
  const [draft, setDraft] = useState<DraftTrade>(() => defaultDraft());
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [tradeSort, setTradeSort] = useState<TradeSort>({ direction: "desc", key: "date" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

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
      setTrades(data.trades ?? []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load trades");
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTrades();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadTrades]);

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

  const sortedMonthlyTrades = useMemo(
    () => [...monthlyTrades].sort((left, right) => compareTradesForSort(left, right, tradeSort)),
    [monthlyTrades, tradeSort],
  );

  const monthTabs = useMemo(() => {
    const keys = new Set<string>();
    const orderedKeys: string[] = [];
    const rememberMonth = (key: string) => {
      keys.add(key);
      if (!orderedKeys.includes(key)) {
        orderedKeys.push(key);
      }
    };

    rememberMonth(selectedMonth);
    for (let offset = 1; offset <= 3; offset += 1) {
      rememberMonth(shiftMonth(selectedMonth, offset));
    }
    for (let offset = -1; offset >= -3; offset -= 1) {
      rememberMonth(shiftMonth(selectedMonth, offset));
    }
    rememberMonth(currentMonthKey());
    trades.forEach((trade) => keys.add(monthKey(trade.date)));

    const remainingKeys = [...keys].filter((key) => !orderedKeys.includes(key)).sort();
    return [...orderedKeys, ...remainingKeys].map((key) => ({
      count: trades.filter((trade) => monthKey(trade.date) === key).length,
      key,
      label: monthTabLabel(key),
    }));
  }, [selectedMonth, trades]);

  const strategyRows = useMemo(() => {
    const strategies = [
      {
        key: "actual",
        label: "Actual",
        values: trades.map((trade) => trade.actualR),
      },
      {
        key: "firstTp",
        label: "First TP",
        values: trades.map((trade) => strategyResult(trade).firstTp),
      },
      {
        key: "onePointFive",
        label: "1.5R",
        values: trades.map((trade) => strategyResult(trade).onePointFive),
      },
      {
        key: "twoR",
        label: "2R",
        values: trades.map((trade) => strategyResult(trade).twoR),
      },
      {
        key: "threeR",
        label: "3R",
        values: trades.map((trade) => strategyResult(trade).threeR),
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
  }, [trades]);

  const stats = useMemo(() => {
    const totalActual = trades.reduce((sum, trade) => sum + trade.actualR, 0);
    const totalMax = trades.reduce((sum, trade) => sum + trade.maxR, 0);
    const winners = trades.filter((trade) => trade.actualR > 0);
    const losers = trades.filter((trade) => trade.actualR < 0);
    const wins = winners.length;
    const beHits = trades.filter((trade) => trade.beHit === "Yes").length;
    const grossWin = winners.reduce((sum, trade) => sum + trade.actualR, 0);
    const grossLoss = Math.abs(losers.reduce((sum, trade) => sum + trade.actualR, 0));
    const avgWin = winners.length ? grossWin / winners.length : 0;
    const avgLoss = losers.length ? grossLoss / losers.length : 0;
    const profitFactor = grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0;
    const avgWinLoss = avgLoss ? avgWin / avgLoss : avgWin ? Infinity : 0;
    const avgMax = trades.length
      ? trades.reduce((sum, trade) => sum + trade.maxR, 0) / trades.length
      : 0;
    const bestMethod = strategyRows.reduce(
      (best, row) => (row.total > best.total ? row : best),
      strategyRows[0] ?? { label: "Actual", total: 0 },
    );

    const winRate = trades.length ? (wins / trades.length) * 100 : 0;
    const captureRate = totalMax ? (totalActual / totalMax) * 100 : 0;
    const beRate = trades.length ? (beHits / trades.length) * 100 : 0;
    const score = clamp(
      winRate * 0.28 +
        clamp(captureRate, 0, 100) * 0.28 +
        clamp(profitFactor === Infinity ? 100 : profitFactor * 34, 0, 100) * 0.24 +
        beRate * 0.2,
      0,
      100,
    );

    return {
      avgActual: trades.length ? totalActual / trades.length : 0,
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
      trades: trades.length,
      winRate,
      wins,
    };
  }, [strategyRows, trades]);

  const exitComparisonRows = useMemo(() => {
    const actualTotal = strategyRows.find((row) => row.key === "actual")?.total ?? 0;
    return strategyRows.map((row) => ({
      ...row,
      delta: row.total - actualTotal,
    }));
  }, [strategyRows]);

  const bestExitAlternative = useMemo(
    () => {
      const alternatives = exitComparisonRows.filter((row) => row.key !== "actual");
      return alternatives.reduce(
        (best, row) => (row.total > best.total ? row : best),
        alternatives[0] ?? {
          average: 0,
          delta: 0,
          key: "firstTp",
          label: "First TP",
          total: 0,
          values: [],
          winRate: 0,
        },
      );
    },
    [exitComparisonRows],
  );

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
    const cells: Array<{ day: number | null; date: string; total: number; count: number }> = [];

    for (let index = 0; index < lead; index += 1) {
      cells.push({ day: null, date: "", total: 0, count: 0 });
    }

    for (let day = 1; day <= days; day += 1) {
      const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
      const dayTrades = monthlyTrades.filter((trade) => trade.date === date);
      cells.push({
        day,
        date,
        total: dayTrades.reduce((sum, trade) => sum + trade.actualR, 0),
        count: dayTrades.length,
      });
    }

    while (cells.length < 42 || cells.length % 7 !== 0) {
      cells.push({ day: null, date: "", total: 0, count: 0 });
    }

    return cells;
  }, [monthlyTrades, selectedMonth]);

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
    const monthAscending = [...monthlyTrades].sort((a, b) => {
      const dateSort = a.date.localeCompare(b.date);
      return dateSort || (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });

    return monthAscending.reduce<number[]>(
      (points, trade) => [...points, (points.at(-1) ?? 0) + trade.actualR],
      [0],
    );
  }, [monthlyTrades]);

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

  const maxStrategyTotal = Math.max(1, ...strategyRows.map((item) => Math.abs(item.total)));
  const selectedMonthLabel = monthLabel(selectedMonth);

  function goToMonth(key: string) {
    setSelectedMonth(key);
    if (!editingId) {
      setDraft((current) => ({ ...current, date: `${key}-01` }));
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

  function resetForm(month = selectedMonth) {
    setDraft(defaultDraft(month));
    setEditingId(null);
  }

  function openNewTrade() {
    resetForm();
    setIsEntryOpen(true);
  }

  function closeEntryDialog() {
    resetForm();
    setIsEntryOpen(false);
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

      setTrades((current) =>
        editingId
          ? current.map((trade) => (trade.id === data.trade?.id ? data.trade : trade))
          : [data.trade as ExitTrade, ...current],
      );
      setSelectedMonth(monthKey(data.trade.date));
      resetForm(monthKey(data.trade.date));
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
      date: trade.date,
      beHit: trade.beHit,
      firstTpR: trade.firstTpR,
      maxR: trade.maxR,
      actualR: trade.actualR,
      notes: trade.notes,
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
      setNotice("Trade deleted.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to delete trade");
    }
  }

  async function addSampleTrades() {
    setIsSaving(true);
    setNotice("");
    try {
      const saved: ExitTrade[] = [];
      for (const trade of sampleTrades) {
        const response = await fetch("/api/trades", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(trade),
        });
        if (handleUnauthorized(response)) {
          return;
        }
        const data = (await response.json()) as { trade?: ExitTrade; error?: string };
        if (!response.ok || !data.trade) {
          throw new Error(data.error ?? "Unable to add sample trades");
        }
        saved.push(data.trade);
      }
      setTrades((current) => [...saved, ...current]);
      setSelectedMonth("2026-07");
      setNotice("Sample trades added.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to add sample trades");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsSaving(true);
    setNotice("");
    try {
      const normalized = file.name.toLowerCase().endsWith(".xlsx")
        ? await parseXlsxTrades(file)
        : parseJsonTrades(JSON.parse(await file.text()));

      if (!normalized.length) {
        throw new Error("No valid trades found in that file.");
      }

      for (const trade of normalized) {
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
      }

      await loadTrades();
      setNotice(`${normalized.length} trades imported.`);
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

  const formStrategy = strategyResult(draft);
  const entryForm = (
    <form className="trade-form" onSubmit={saveTrade}>
      <div className="field-row">
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
          BE Hit?
          <select
            value={draft.beHit}
            onChange={(event) => updateDraft("beHit", event.target.value as BeHit)}
          >
            <option>Yes</option>
            <option>No</option>
          </select>
        </label>
      </div>

      <div className="field-row">
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
        Notes
        <textarea
          rows={4}
          value={draft.notes}
          onChange={(event) => updateDraft("notes", event.target.value)}
        />
      </label>

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

  return (
    <main className="journal-shell">
      <header className="topbar" aria-label="Exit strategy journal header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Exit Strategy Journal</h1>
        </div>
        <div className="topbar-actions">
          <button
            className="utility-button"
            type="button"
            onClick={() =>
              downloadFile(
                "exit-strategy-journal.json",
                JSON.stringify({ trades: sortedTrades }, null, 2),
                "application/json",
              )
            }
          >
            Export JSON
          </button>
          <button
            className="utility-button"
            type="button"
            onClick={() => downloadFile("exit-strategy-journal.csv", toCsv(sortedTrades), "text/csv")}
          >
            Export CSV
          </button>
          <button
            className="utility-button"
            type="button"
            onClick={() => downloadBlob("exit-strategy-journal.xlsx", toXlsxBlob(sortedTrades))}
          >
            Export Excel
          </button>
          <button
            className="utility-button"
            type="button"
            onClick={() => downloadBlob("exit-journal-template.xlsx", toXlsxBlob([]))}
          >
            Excel Template
          </button>
          <label className="utility-button file-button">
            Import
            <input accept="application/json,.json,.xlsx" type="file" onChange={handleImport} />
          </label>
          <button className="primary-button compact" type="button" onClick={openNewTrade}>
            New Trade
          </button>
          <button className="utility-button" type="button" onClick={() => void logout()}>
            Logout
          </button>
        </div>
      </header>

      <section className="metric-grid" aria-label="Journal statistics">
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

      <section className="month-switcher" aria-label="Month navigation">
        <button className="nav-icon" type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}>
          &lt;
        </button>
        <nav className="month-tabs" aria-label="Month tabs">
          {monthTabs.map((month) => (
            <button
              className={selectedMonth === month.key ? "active" : ""}
              key={month.key}
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

      {notice ? <p className="notice dashboard-notice">{notice}</p> : null}

      <section className="dashboard-grid" aria-label="Monthly dashboard">
        <article className="review-panel calendar-panel calendar-dominant">
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
                <div
                  className={`calendar-cell ${cell.day ? toneClass(cell.total) : "blank"}`}
                  key={`${cell.date}-${index}`}
                >
                  {cell.day ? (
                    <>
                      <span>{cell.day}</span>
                      <strong>{cell.count ? rValue(cell.total) : ""}</strong>
                      <small>{cell.count ? `${cell.count} trades` : ""}</small>
                    </>
                  ) : null}
                </div>
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
          <section className="log-panel" aria-labelledby="log-heading">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Trade Log</p>
                <h2 id="log-heading">{selectedMonthLabel}</h2>
              </div>
              <div className="panel-actions">
                <button className="utility-button" type="button" onClick={() => void loadTrades()}>
                  Refresh
                </button>
                <button
                  className="utility-button"
                  disabled={isSaving}
                  type="button"
                  onClick={() => void addSampleTrades()}
                >
                  Add Sample
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
                    <th>Notes</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMonthlyTrades.map((trade) => {
                    const result = strategyResult(trade);
                    return (
                      <tr key={trade.id}>
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
                        <td className="notes-cell">{trade.notes || "No note"}</td>
                        <td>
                          <div className="table-actions">
                            <button className="table-action" type="button" onClick={() => editTrade(trade)}>
                              Edit
                            </button>
                            <button
                              className="table-action danger"
                              type="button"
                              onClick={() => void deleteTrade(trade.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!sortedMonthlyTrades.length ? (
                    <tr>
                      <td className="empty-row" colSpan={12}>
                        {isLoading ? "Loading trades..." : "No trades logged for this month yet."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <aside className="analytics-rail">
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

          <article className="review-panel exit-comparison-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Comparison</p>
                <h2>Exit Comparison</h2>
              </div>
              <span className="status-pill">{bestExitAlternative.label}</span>
            </div>
            <p className="comparison-summary">
              Best alternate is {bestExitAlternative.label} at {rValue(bestExitAlternative.total)}
              {" "}({signedRValue(bestExitAlternative.delta)} vs actual).
            </p>
            <div className="comparison-list">
              {exitComparisonRows.map((row) => (
                <div className={`comparison-row ${row.key === "actual" ? "actual" : ""}`} key={row.key}>
                  <span>{row.label}</span>
                  <strong className={toneClass(row.total)}>{rValue(row.total)}</strong>
                  <small>
                    {row.key === "actual" ? "Your logged exits" : `${signedRValue(row.delta)} vs actual`}
                  </small>
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

          <article className="review-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Comparison</p>
                <h2>Strategy Totals</h2>
              </div>
            </div>
            <div className="strategy-list compact-strategy">
              {strategyRows.map((row) => (
                <div className="strategy-row" key={row.key}>
                  <div>
                    <strong>{row.label}</strong>
                    <span>{percent(row.winRate)} win</span>
                  </div>
                  <div className="bar-track">
                    <span
                      className={row.total >= 0 ? "bar-positive" : "bar-negative"}
                      style={{ width: `${Math.max(5, (Math.abs(row.total) / maxStrategyTotal) * 100)}%` }}
                    />
                  </div>
                  <strong className={toneClass(row.total)}>{rValue(row.total)}</strong>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      {isEntryOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEntryDialog();
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
    </main>
  );
}
