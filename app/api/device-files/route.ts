import {
  deleteDeviceFile,
  deviceFileResponse,
  deviceFilesRouteError,
  deviceFolderResponse,
  ensureDeviceFolder,
  getDeviceSafetyStatus,
  listDeviceFiles,
  parseDeviceFileUpload,
  rotateDeviceFolderToken,
  rotateDeviceShortCode,
  setDeviceFilesEnabled,
  storeDeviceFile,
} from "@/lib/device-files";
import { requireAuthenticatedRequest } from "@/lib/auth";
import { getDb } from "@/db";
import { dailyJournals, exitTrades, journalTrashItems } from "@/db/schema";

const JOURNAL_ATTACHMENT_PREFIX = "journal-attachments/";

async function journalAttachmentIds() {
  const db = getDb();
  const [journalRows, tradeRows, trashRows] = await Promise.all([
    db.select({ attachments: dailyJournals.attachments }).from(dailyJournals),
    db.select({ attachments: exitTrades.attachments }).from(exitTrades),
    db.select({ payload: journalTrashItems.payload }).from(journalTrashItems),
  ]);
  const ids = new Set<string>();

  for (const row of [...journalRows, ...tradeRows]) {
    const attachments = parseAttachments(row.attachments);
    attachments.forEach((attachment) => {
      if (attachment.id) {
        ids.add(attachment.id);
      }
    });
  }

  trashRows.forEach((row) => collectJournalAttachmentIds(row.payload, ids));

  return ids;
}

function collectJournalAttachmentIds(value: unknown, ids: Set<string>) {
  if (!value) {
    return;
  }

  if (typeof value === "string") {
    if (value.startsWith(JOURNAL_ATTACHMENT_PREFIX)) {
      ids.add(value);
      return;
    }

    const parsed = value.trim().startsWith("[") || value.trim().startsWith("{") ? tryParseJson(value) : null;
    if (parsed) {
      collectJournalAttachmentIds(parsed, ids);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectJournalAttachmentIds(item, ids));
    return;
  }

  if (typeof value === "object") {
    const item = value as { id?: unknown };
    if (typeof item.id === "string" && item.id.startsWith(JOURNAL_ATTACHMENT_PREFIX)) {
      ids.add(item.id);
    }
    Object.values(value).forEach((itemValue) => collectJournalAttachmentIds(itemValue, ids));
  }
}

function parseAttachments(value: string) {
  const parsed = tryParseJson(value);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((attachment) => {
      if (!attachment || typeof attachment !== "object") {
        return null;
      }

      const item = attachment as { id?: unknown };
      return typeof item.id === "string" ? { id: item.id } : null;
    })
    .filter((attachment): attachment is { id: string } => Boolean(attachment));
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

async function folderPayload(request: Request) {
  const folder = await ensureDeviceFolder();
  const [files, hiddenAttachmentIds, safety] = await Promise.all([
    listDeviceFiles(folder.id),
    journalAttachmentIds(),
    getDeviceSafetyStatus(folder.id),
  ]);
  const visibleFiles = files.filter((file) => !hiddenAttachmentIds.has(file.id));
  return {
    files: visibleFiles.map((file) => deviceFileResponse(file, folder, request)),
    folder: deviceFolderResponse(folder, request),
    safety,
  };
}

export async function GET(request: Request) {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    return Response.json(await folderPayload(request));
  } catch (error) {
    return Response.json({ error: deviceFilesRouteError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const folder = await ensureDeviceFolder();
    const upload = await parseDeviceFileUpload(request);
    const storedFile = await storeDeviceFile(upload, folder);

    return Response.json(
      {
        file: deviceFileResponse(storedFile, folder, request),
        ...(await folderPayload(request)),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = deviceFilesRouteError(error);
    const status = /paused/.test(message)
      ? 403
      : /storage safety limit/.test(message)
        ? 413
        : /Choose a device file|simple filename/.test(message)
          ? 400
          : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      enabled?: unknown;
    };
    if (
      payload.action !== "rotate-token" &&
      payload.action !== "rotate-short-code" &&
      payload.action !== "set-enabled"
    ) {
      return Response.json({ error: "Unknown device file action." }, { status: 400 });
    }

    if (payload.action === "set-enabled") {
      if (typeof payload.enabled !== "boolean") {
        return Response.json({ error: "enabled is required" }, { status: 400 });
      }

      await setDeviceFilesEnabled(payload.enabled);
      return Response.json(await folderPayload(request));
    }

    if (payload.action === "rotate-short-code") {
      await rotateDeviceShortCode();
    } else {
      await rotateDeviceFolderToken();
    }

    return Response.json(await folderPayload(request));
  } catch (error) {
    return Response.json({ error: deviceFilesRouteError(error) }, { status: 500 });
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

    const deletedFile = await deleteDeviceFile(id);
    if (!deletedFile) {
      return Response.json({ error: "device file not found" }, { status: 404 });
    }

    return Response.json({ ok: true, ...(await folderPayload(request)) });
  } catch (error) {
    return Response.json({ error: deviceFilesRouteError(error) }, { status: 500 });
  }
}
