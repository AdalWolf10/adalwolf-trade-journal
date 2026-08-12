import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyJournals, journalTrashItems } from "@/db/schema";
import { requireAuthenticatedRequest } from "@/lib/auth";

type JournalPayload = {
  attachments?: unknown;
  breakevenTrades?: unknown;
  date?: unknown;
  htfBias?: unknown;
  id?: unknown;
  narrative?: unknown;
  orm?: unknown;
  priceActionRating?: unknown;
  reviewNotes?: unknown;
  tags?: unknown;
};

type JournalAttachment = {
  contentType: string;
  filename: string;
  id: string;
  size: number;
  uploadedAt: number;
  url: string;
};

const allowedPriceActionRatings = new Set(
  Array.from({ length: 21 }, (_, index) => index * 0.5).filter((rating) => rating !== 7),
);
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function makeId() {
  return crypto.randomUUID();
}

function toNumber(value: unknown) {
  const numberValue =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function cleanText(value: unknown, maxLength = 800) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanTags(value: unknown) {
  const rawTags = Array.isArray(value)
    ? value.map((item) => String(item ?? ""))
    : String(value ?? "").split(",");

  return rawTags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, tags) => tags.findIndex((item) => item.toLowerCase() === tag.toLowerCase()) === index)
    .join(", ")
    .slice(0, 600);
}

function parseAttachments(value: unknown): JournalAttachment[] {
  const rawAttachments = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim()
      ? tryParseJson(value) || parseAttachmentText(value)
      : [];

  if (!Array.isArray(rawAttachments)) {
    return [];
  }

  return rawAttachments
    .map((attachment): JournalAttachment | null => {
      if (!attachment || typeof attachment !== "object") {
        return null;
      }

      const item = attachment as Partial<JournalAttachment> & {
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
        id: cleanText(item.id, 120) || crypto.randomUUID(),
        size: Math.max(0, Math.floor(toNumber(item.size) ?? 0)),
        uploadedAt: Math.max(0, Math.floor(toNumber(item.uploadedAt) ?? Date.now())),
        url,
      };
    })
    .filter((attachment): attachment is JournalAttachment => Boolean(attachment));
}

function tryParseJson(value: string) {
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

function journalResponse(journal: typeof dailyJournals.$inferSelect) {
  return {
    ...journal,
    attachments: parseAttachments(journal.attachments),
  };
}

async function moveDailyJournalToTrash(
  db: ReturnType<typeof getDb>,
  journal: typeof dailyJournals.$inferSelect,
) {
  const now = Date.now();
  const [trashItem] = await db
    .insert(journalTrashItems)
    .values({
      deletedAt: now,
      id: crypto.randomUUID(),
      itemType: "daily_journal",
      payload: JSON.stringify(journal),
      purgeAfter: now + TRASH_RETENTION_MS,
      sourceDate: journal.date,
      sourceId: journal.id,
      sourceLabel: "Daily Journal",
    })
    .returning();

  return trashItem;
}

function parsePayload(payload: JournalPayload) {
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const date = typeof payload.date === "string" ? payload.date : "";
  const priceActionRating = toNumber(payload.priceActionRating);
  const breakevenTrades = toNumber(payload.breakevenTrades);
  const attachments = parseAttachments(payload.attachments);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "date is required" };
  }

  if (id && !/^[A-Za-z0-9_-]{8,100}$/.test(id)) {
    return { error: "id format is not valid" };
  }

  if (priceActionRating === null || !allowedPriceActionRatings.has(priceActionRating)) {
    return { error: "Price Action Rating must be 0 to 10 in 0.5 steps, excluding 7." };
  }

  if (breakevenTrades === null || breakevenTrades < 0) {
    return { error: "Breakeven trades must be 0 or greater" };
  }

  return {
    id: id || undefined,
    journal: {
      attachments: JSON.stringify(attachments),
      breakevenTrades: Math.floor(breakevenTrades),
      date,
      htfBias: cleanText(payload.htfBias, 500),
      narrative: cleanText(payload.narrative, 12000),
      orm: cleanText(payload.orm, 1000),
      priceActionRating,
      reviewNotes: cleanText(payload.reviewNotes, 12000),
      tags: cleanTags(payload.tags),
    },
  };
}

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("no such table") || combined.includes("daily_journals")) {
    return "The daily journal database is not ready yet. Deploy the generated migration with the site.";
  }

  if (combined.includes("journal_trash_items")) {
    return "The Recently Deleted database is not ready yet. Deploy the generated migration with the site.";
  }

  if (combined.includes("UNIQUE constraint failed")) {
    return "Daily journal already exists for this date.";
  }

  return message;
}

export async function GET(request: Request) {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const db = getDb();

    if (date) {
      const [journal] = await db
        .select()
        .from(dailyJournals)
        .where(eq(dailyJournals.date, date))
        .limit(1);
      return Response.json({ journal: journal ? journalResponse(journal) : null });
    }

    const journals = await db
      .select()
      .from(dailyJournals)
      .orderBy(desc(dailyJournals.date), desc(dailyJournals.updatedAt))
      .limit(1500);

    return Response.json({ journals: journals.map(journalResponse) });
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
    const parsed = parsePayload((await request.json()) as JournalPayload);
    if ("error" in parsed) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const now = Date.now();
    const db = getDb();
    const [journal] = await db
      .insert(dailyJournals)
      .values({
        id: parsed.id ?? makeId(),
        ...parsed.journal,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return Response.json({ journal: journalResponse(journal) }, { status: 201 });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const parsed = parsePayload((await request.json()) as JournalPayload);
    if ("error" in parsed) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const db = getDb();
    const [journal] = await db
      .update(dailyJournals)
      .set({ ...parsed.journal, updatedAt: Date.now() })
      .where(eq(dailyJournals.id, id))
      .returning();

    if (!journal) {
      return Response.json({ error: "daily journal not found" }, { status: 404 });
    }

    return Response.json({ journal: journalResponse(journal) });
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
    const id = url.searchParams.get("id");
    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const db = getDb();
    const [journal] = await db.select().from(dailyJournals).where(eq(dailyJournals.id, id)).limit(1);

    if (!journal) {
      return Response.json({ error: "daily journal not found" }, { status: 404 });
    }

    const trashItem = await moveDailyJournalToTrash(db, journal);
    await db.delete(dailyJournals).where(eq(dailyJournals.id, id));

    return Response.json({ ok: true, trashItem });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
