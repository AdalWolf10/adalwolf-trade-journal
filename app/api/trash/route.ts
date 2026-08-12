import { desc, eq, lte } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { dailyJournals, exitTrades, journalTrashItems } from "@/db/schema";
import { requireAuthenticatedRequest } from "@/lib/auth";

type AttachmentOwnerType = "daily_journal" | "trade";

type TradeAttachment = {
  contentType: string;
  filename: string;
  id: string;
  size: number;
  uploadedAt: number;
  url: string;
};

type TrashAttachmentPayload = {
  action?: unknown;
  attachmentId?: unknown;
  ownerId?: unknown;
  ownerType?: unknown;
};

const JOURNAL_ATTACHMENT_PREFIX = "journal-attachments/";
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function cleanText(value: unknown, maxLength = 800) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function toNumber(value: unknown) {
  const numberValue =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function parseAttachments(value: unknown): TradeAttachment[] {
  const rawAttachments = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim()
      ? tryParseJson(value) ?? []
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
        cleanText(item.url, 2000) ||
        cleanText(item.shortUrl, 2000) ||
        cleanText(item.sharedUrl, 2000);

      if (!url) {
        return null;
      }

      return {
        contentType: cleanText(item.contentType, 160),
        filename: cleanText(item.filename, 180) || "Attachment",
        id: cleanText(item.id, 320) || crypto.randomUUID(),
        size: Math.max(0, Math.floor(toNumber(item.size) ?? 0)),
        uploadedAt: Math.max(0, Math.floor(toNumber(item.uploadedAt) ?? Date.now())),
        url,
      };
    })
    .filter((attachment): attachment is TradeAttachment => Boolean(attachment));
}

function isJournalAttachmentKey(key: string) {
  return (
    key.startsWith(JOURNAL_ATTACHMENT_PREFIX) &&
    key.length <= 320 &&
    !key.includes("..") &&
    !/[\x00-\x1f\x7f]/.test(key)
  );
}

function collectAttachmentKeys(value: unknown, keys = new Set<string>()) {
  if (!value) {
    return keys;
  }

  if (typeof value === "string") {
    if (isJournalAttachmentKey(value)) {
      keys.add(value);
      return keys;
    }

    const parsed = value.trim().startsWith("[") || value.trim().startsWith("{") ? tryParseJson(value) : null;
    if (parsed) {
      collectAttachmentKeys(parsed, keys);
    }
    return keys;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectAttachmentKeys(item, keys));
    return keys;
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const id = objectValue.id;
    if (typeof id === "string" && isJournalAttachmentKey(id)) {
      keys.add(id);
    }

    Object.values(objectValue).forEach((item) => collectAttachmentKeys(item, keys));
  }

  return keys;
}

async function deleteAttachmentObjects(payload: unknown) {
  const keys = [...collectAttachmentKeys(payload)];
  if (!keys.length || !env.DEVICE_FILES) {
    return;
  }

  await Promise.all(keys.map((key) => env.DEVICE_FILES.delete(key)));
}

function trashPayload(row: typeof journalTrashItems.$inferSelect) {
  return tryParseJson(row.payload);
}

function trashSummary(row: typeof journalTrashItems.$inferSelect) {
  const payload = trashPayload(row);

  if (row.itemType === "attachment") {
    const attachment = payload && typeof payload === "object" ? (payload as { attachment?: unknown }).attachment : null;
    const filename =
      attachment && typeof attachment === "object"
        ? cleanText((attachment as { filename?: unknown }).filename, 180)
        : "";
    return filename || row.sourceLabel || "Journal attachment";
  }

  if (row.itemType === "daily_journal") {
    const attachments =
      payload && typeof payload === "object"
        ? parseAttachments((payload as { attachments?: unknown }).attachments)
        : [];
    return attachments.length
      ? `${attachments.length} attachment${attachments.length === 1 ? "" : "s"}`
      : "Full day review";
  }

  if (payload && typeof payload === "object") {
    const trade = payload as {
      actualR?: unknown;
      direction?: unknown;
      session?: unknown;
      setupName?: unknown;
    };
    const actualR = toNumber(trade.actualR);
    return actualR === null ? "Trade entry" : `Actual ${actualR.toFixed(2)}R`;
  }

  return row.sourceLabel || "Trade";
}

function trashResponse(row: typeof journalTrashItems.$inferSelect) {
  return {
    deletedAt: row.deletedAt,
    id: row.id,
    itemType: row.itemType,
    purgeAfter: row.purgeAfter,
    sourceDate: row.sourceDate,
    sourceId: row.sourceId,
    sourceLabel: row.sourceLabel,
    summary: trashSummary(row),
  };
}

function objectPayload(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function textField(payload: Record<string, unknown>, key: string, maxLength = 800) {
  return cleanText(payload[key], maxLength);
}

function numberField(payload: Record<string, unknown>, key: string, fallback = 0) {
  return toNumber(payload[key]) ?? fallback;
}

function timeField(payload: Record<string, unknown>, key: string, fallback = Date.now()) {
  return Math.max(0, Math.floor(toNumber(payload[key]) ?? fallback));
}

function restoreTradePayload(payload: unknown): typeof exitTrades.$inferInsert | null {
  const trade = objectPayload(payload);
  if (!trade) {
    return null;
  }

  const id = textField(trade, "id", 120);
  const date = textField(trade, "date", 40);
  const beHit = trade.beHit === "No" ? "No" : trade.beHit === "Yes" ? "Yes" : "";

  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !beHit) {
    return null;
  }

  return {
    actualR: numberField(trade, "actualR"),
    attachments: JSON.stringify(parseAttachments(trade.attachments)),
    beHit,
    createdAt: timeField(trade, "createdAt"),
    date,
    direction: textField(trade, "direction", 40),
    exitType: textField(trade, "exitType", 80),
    firstTpR: numberField(trade, "firstTpR", 1),
    id,
    instrument: textField(trade, "instrument", 24).toUpperCase(),
    lessonLearned: textField(trade, "lessonLearned", 4000),
    maxR: numberField(trade, "maxR"),
    mistakeCategory: textField(trade, "mistakeCategory", 100),
    mistakeNotes: textField(trade, "mistakeNotes", 4000),
    notes: textField(trade, "notes", 12000),
    session: textField(trade, "session", 80),
    setupName: textField(trade, "setupName", 120),
    tags: textField(trade, "tags", 600),
    updatedAt: timeField(trade, "updatedAt"),
  };
}

function restoreDailyJournalPayload(payload: unknown): typeof dailyJournals.$inferInsert | null {
  const journal = objectPayload(payload);
  if (!journal) {
    return null;
  }

  const id = textField(journal, "id", 120);
  const date = textField(journal, "date", 40);

  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  return {
    attachments: JSON.stringify(parseAttachments(journal.attachments)),
    breakevenTrades: Math.max(0, Math.floor(numberField(journal, "breakevenTrades"))),
    createdAt: timeField(journal, "createdAt"),
    date,
    htfBias: textField(journal, "htfBias", 500),
    id,
    narrative: textField(journal, "narrative", 12000),
    orm: textField(journal, "orm", 1000),
    priceActionRating: numberField(journal, "priceActionRating"),
    reviewNotes: textField(journal, "reviewNotes", 12000),
    tags: textField(journal, "tags", 600),
    updatedAt: timeField(journal, "updatedAt"),
  };
}

async function purgeExpiredTrashItems(db: ReturnType<typeof getDb>) {
  const expiredItems = await db
    .select()
    .from(journalTrashItems)
    .where(lte(journalTrashItems.purgeAfter, Date.now()))
    .limit(100);

  for (const item of expiredItems) {
    await deleteAttachmentObjects(trashPayload(item));
    await db.delete(journalTrashItems).where(eq(journalTrashItems.id, item.id));
  }
}

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("no such table") || combined.includes("journal_trash_items")) {
    return "The Recently Deleted database is not ready yet. Deploy the generated migration with the site.";
  }

  return message;
}

export async function GET(request: Request) {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const db = getDb();
    await purgeExpiredTrashItems(db);
    const items = await db
      .select()
      .from(journalTrashItems)
      .orderBy(desc(journalTrashItems.deletedAt))
      .limit(500);

    return Response.json({ items: items.map(trashResponse) });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = (await request.json()) as TrashAttachmentPayload;
    if (payload.action !== "trash-attachment") {
      return Response.json({ error: "Unknown trash action." }, { status: 400 });
    }

    const ownerType =
      payload.ownerType === "trade" || payload.ownerType === "daily_journal"
        ? payload.ownerType
        : "";
    const ownerId = cleanText(payload.ownerId, 120);
    const attachmentId = cleanText(payload.attachmentId, 320);

    if (!ownerType || !ownerId || !attachmentId) {
      return Response.json({ error: "ownerType, ownerId, and attachmentId are required." }, { status: 400 });
    }

    const db = getDb();
    const owner =
      ownerType === "trade"
        ? (await db.select().from(exitTrades).where(eq(exitTrades.id, ownerId)).limit(1))[0]
        : (await db.select().from(dailyJournals).where(eq(dailyJournals.id, ownerId)).limit(1))[0];

    if (!owner) {
      return Response.json({ error: "Attachment owner not found." }, { status: 404 });
    }

    const attachments = parseAttachments(owner.attachments);
    const attachment = attachments.find((item) => item.id === attachmentId);
    if (!attachment) {
      return Response.json({ error: "Attachment not found." }, { status: 404 });
    }

    const now = Date.now();
    const sourceLabel =
      ownerType === "trade"
        ? [owner.session, owner.direction, owner.setupName].filter(Boolean).join(" · ") || "Trade attachment"
        : `Daily Journal · ${owner.date}`;
    const [trashItem] = await db
      .insert(journalTrashItems)
      .values({
        deletedAt: now,
        id: crypto.randomUUID(),
        itemType: "attachment",
        payload: JSON.stringify({ attachment, ownerId, ownerType }),
        purgeAfter: now + TRASH_RETENTION_MS,
        sourceDate: owner.date,
        sourceId: ownerId,
        sourceLabel: `${attachment.filename} · ${sourceLabel}`,
      })
      .returning();
    const nextAttachments = attachments.filter((item) => item.id !== attachmentId);

    if (ownerType === "trade") {
      await db
        .update(exitTrades)
        .set({ attachments: JSON.stringify(nextAttachments), updatedAt: now })
        .where(eq(exitTrades.id, ownerId));
    } else {
      await db
        .update(dailyJournals)
        .set({ attachments: JSON.stringify(nextAttachments), updatedAt: now })
        .where(eq(dailyJournals.id, ownerId));
    }

    return Response.json({ attachments: nextAttachments, trashItem: trashResponse(trashItem) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? "";
    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const db = getDb();
    const [trashItem] = await db.select().from(journalTrashItems).where(eq(journalTrashItems.id, id)).limit(1);
    if (!trashItem) {
      return Response.json({ error: "Trash item not found." }, { status: 404 });
    }

    const payload = trashPayload(trashItem);

    if (trashItem.itemType === "trade") {
      const trade = restoreTradePayload(payload);
      if (!trade) {
        return Response.json({ error: "Trade backup is not restorable." }, { status: 400 });
      }

      const [existing] = await db.select({ id: exitTrades.id }).from(exitTrades).where(eq(exitTrades.id, trade.id)).limit(1);
      if (existing) {
        return Response.json({ error: "A trade with this ID already exists." }, { status: 409 });
      }

      const [restoredTrade] = await db.insert(exitTrades).values(trade).returning();
      await db.delete(journalTrashItems).where(eq(journalTrashItems.id, id));
      return Response.json({ ok: true, trade: { ...restoredTrade, attachments: parseAttachments(restoredTrade.attachments) } });
    }

    if (trashItem.itemType === "daily_journal") {
      const journal = restoreDailyJournalPayload(payload);
      if (!journal) {
        return Response.json({ error: "Daily journal backup is not restorable." }, { status: 400 });
      }

      const [existing] = await db
        .select({ id: dailyJournals.id })
        .from(dailyJournals)
        .where(eq(dailyJournals.date, journal.date))
        .limit(1);
      if (existing) {
        return Response.json({ error: "A daily journal already exists for this date." }, { status: 409 });
      }

      const [restoredJournal] = await db.insert(dailyJournals).values(journal).returning();
      await db.delete(journalTrashItems).where(eq(journalTrashItems.id, id));
      return Response.json({
        journal: { ...restoredJournal, attachments: parseAttachments(restoredJournal.attachments) },
        ok: true,
      });
    }

    const attachmentPayload = objectPayload(payload);
    const ownerType = attachmentPayload?.ownerType as AttachmentOwnerType | undefined;
    const ownerId = cleanText(attachmentPayload?.ownerId, 120);
    const [attachment] = parseAttachments([attachmentPayload?.attachment]);
    if ((ownerType !== "trade" && ownerType !== "daily_journal") || !ownerId || !attachment) {
      return Response.json({ error: "Attachment backup is not restorable." }, { status: 400 });
    }

    const owner =
      ownerType === "trade"
        ? (await db.select().from(exitTrades).where(eq(exitTrades.id, ownerId)).limit(1))[0]
        : (await db.select().from(dailyJournals).where(eq(dailyJournals.id, ownerId)).limit(1))[0];

    if (!owner) {
      return Response.json({ error: "Restore the original trade or daily journal first." }, { status: 409 });
    }

    const attachments = parseAttachments(owner.attachments);
    const nextAttachments = attachments.some((item) => item.id === attachment.id)
      ? attachments
      : [...attachments, attachment];

    if (ownerType === "trade") {
      await db
        .update(exitTrades)
        .set({ attachments: JSON.stringify(nextAttachments), updatedAt: Date.now() })
        .where(eq(exitTrades.id, ownerId));
    } else {
      await db
        .update(dailyJournals)
        .set({ attachments: JSON.stringify(nextAttachments), updatedAt: Date.now() })
        .where(eq(dailyJournals.id, ownerId));
    }

    await db.delete(journalTrashItems).where(eq(journalTrashItems.id, id));
    return Response.json({ attachment, ok: true, ownerId, ownerType });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") ?? "";
    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const db = getDb();
    const [trashItem] = await db.select().from(journalTrashItems).where(eq(journalTrashItems.id, id)).limit(1);
    if (!trashItem) {
      return Response.json({ error: "Trash item not found." }, { status: 404 });
    }

    await deleteAttachmentObjects(trashPayload(trashItem));
    await db.delete(journalTrashItems).where(eq(journalTrashItems.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
