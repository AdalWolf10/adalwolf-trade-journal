import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { exitTrades, journalTrashItems } from "@/db/schema";
import { requireAuthenticatedRequest } from "@/lib/auth";

type TradePayload = {
  actualR?: unknown;
  attachments?: unknown;
  id?: unknown;
  date?: unknown;
  beHit?: unknown;
  direction?: unknown;
  exitType?: unknown;
  firstTpR?: unknown;
  instrument?: unknown;
  lessonLearned?: unknown;
  maxR?: unknown;
  mistakeCategory?: unknown;
  mistakeNotes?: unknown;
  notes?: unknown;
  session?: unknown;
  setupName?: unknown;
  tags?: unknown;
};

type TradeAttachment = {
  contentType: string;
  filename: string;
  id: string;
  size: number;
  url: string;
  uploadedAt: number;
};

type BeHit = "Yes" | "No";

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

function parseAttachments(value: unknown): TradeAttachment[] {
  const rawAttachments = Array.isArray(value)
    ? value
    : typeof value === "string" && value.trim()
      ? tryParseJson(value) || parseAttachmentText(value)
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
        id: cleanText(item.id, 120) || crypto.randomUUID(),
        size: Math.max(0, Math.floor(toNumber(item.size) ?? 0)),
        uploadedAt: Math.max(0, Math.floor(toNumber(item.uploadedAt) ?? Date.now())),
        url,
      };
    })
    .filter((attachment): attachment is TradeAttachment => Boolean(attachment))
    .slice(0, 20);
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

function tradeResponse(trade: typeof exitTrades.$inferSelect) {
  return {
    ...trade,
    attachments: parseAttachments(trade.attachments),
  };
}

async function moveTradeToTrash(db: ReturnType<typeof getDb>, trade: typeof exitTrades.$inferSelect) {
  const now = Date.now();
  const label = [trade.session, trade.direction, trade.setupName]
    .filter(Boolean)
    .join(" · ");

  const [trashItem] = await db
    .insert(journalTrashItems)
    .values({
      deletedAt: now,
      id: crypto.randomUUID(),
      itemType: "trade",
      payload: JSON.stringify(trade),
      purgeAfter: now + TRASH_RETENTION_MS,
      sourceDate: trade.date,
      sourceId: trade.id,
      sourceLabel: label || "Trade",
    })
    .returning();

  return trashItem;
}

function parsePayload(payload: TradePayload) {
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const date = typeof payload.date === "string" ? payload.date : "";
  const beHit: BeHit | "" = payload.beHit === "No" ? "No" : payload.beHit === "Yes" ? "Yes" : "";
  const firstTpR = toNumber(payload.firstTpR);
  const rawMaxR = toNumber(payload.maxR);
  const maxR = beHit === "No" && rawMaxR === null ? 0 : rawMaxR;
  const actualR = beHit === "No" ? -1 : toNumber(payload.actualR);
  const attachments = parseAttachments(payload.attachments);
  const notes = cleanText(payload.notes, 12000);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "date is required" };
  }

  if (id && !/^[A-Za-z0-9_-]{8,100}$/.test(id)) {
    return { error: "id format is not valid" };
  }

  if (!beHit) {
    return { error: "BE Hit must be Yes or No" };
  }

  if (firstTpR === null || firstTpR <= 0) {
    return { error: "First TP R must be greater than 0" };
  }

  if (maxR === null || maxR < 0) {
    return { error: "Max R must be 0 or greater" };
  }

  if (actualR === null) {
    return { error: "Actual R is required" };
  }

  return {
    id: id || undefined,
    trade: {
      actualR,
      attachments: JSON.stringify(attachments),
      beHit,
      date,
      direction: cleanText(payload.direction, 40),
      exitType: cleanText(payload.exitType, 80),
      firstTpR,
      instrument: cleanText(payload.instrument, 24).toUpperCase(),
      lessonLearned: cleanText(payload.lessonLearned, 4000),
      maxR,
      mistakeCategory: cleanText(payload.mistakeCategory, 100),
      mistakeNotes: cleanText(payload.mistakeNotes, 4000),
      notes,
      session: cleanText(payload.session, 80),
      setupName: cleanText(payload.setupName, 120),
      tags: cleanTags(payload.tags),
    },
  };
}

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("no such table") || combined.includes("exit_trades")) {
    return "The trade journal database is not ready yet. Deploy the generated migration with the site.";
  }

  if (combined.includes("journal_trash_items")) {
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
    const trades = await db
      .select()
      .from(exitTrades)
      .orderBy(desc(exitTrades.date), desc(exitTrades.createdAt))
      .limit(1500);

    return Response.json({ trades: trades.map(tradeResponse) });
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
    const parsed = parsePayload((await request.json()) as TradePayload);
    if ("error" in parsed) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const now = Date.now();
    const db = getDb();
    const id = parsed.id ?? makeId();

    if (parsed.id) {
      const [existingTrade] = await db
        .select({ id: exitTrades.id })
        .from(exitTrades)
        .where(eq(exitTrades.id, parsed.id))
        .limit(1);

      if (existingTrade) {
        return Response.json({ error: "trade already exists" }, { status: 409 });
      }
    }

    const [trade] = await db
      .insert(exitTrades)
      .values({
        id,
        ...parsed.trade,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return Response.json({ trade: tradeResponse(trade) }, { status: 201 });
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

    const parsed = parsePayload((await request.json()) as TradePayload);
    if ("error" in parsed) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const db = getDb();
    const [trade] = await db
      .update(exitTrades)
      .set({ ...parsed.trade, updatedAt: Date.now() })
      .where(eq(exitTrades.id, id))
      .returning();

    if (!trade) {
      return Response.json({ error: "trade not found" }, { status: 404 });
    }

    return Response.json({ trade: tradeResponse(trade) });
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
    const [trade] = await db.select().from(exitTrades).where(eq(exitTrades.id, id)).limit(1);

    if (!trade) {
      return Response.json({ error: "trade not found" }, { status: 404 });
    }

    const trashItem = await moveTradeToTrash(db, trade);
    await db.delete(exitTrades).where(eq(exitTrades.id, id));

    return Response.json({ ok: true, trashItem });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
