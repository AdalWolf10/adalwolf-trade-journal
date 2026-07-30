import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { exitTrades } from "@/db/schema";
import { requireAuthenticatedRequest } from "@/lib/auth";

type TradePayload = {
  id?: unknown;
  date?: unknown;
  beHit?: unknown;
  firstTpR?: unknown;
  maxR?: unknown;
  actualR?: unknown;
  notes?: unknown;
};

function makeId() {
  return crypto.randomUUID();
}

function toNumber(value: unknown) {
  const numberValue =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : null;
}

function parsePayload(payload: TradePayload) {
  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  const date = typeof payload.date === "string" ? payload.date : "";
  const beHit = payload.beHit === "No" ? "No" : payload.beHit === "Yes" ? "Yes" : "";
  const firstTpR = toNumber(payload.firstTpR);
  const rawMaxR = toNumber(payload.maxR);
  const maxR = beHit === "No" && rawMaxR === null ? 0 : rawMaxR;
  const actualR = beHit === "No" ? -1 : toNumber(payload.actualR);
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";

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
      date,
      beHit,
      firstTpR,
      maxR,
      actualR,
      notes,
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

    return Response.json({ trades });
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

    return Response.json({ trade }, { status: 201 });
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

    return Response.json({ trade });
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
    await db.delete(exitTrades).where(eq(exitTrades.id, id));

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: toRouteErrorMessage(error) }, { status: 500 });
  }
}
