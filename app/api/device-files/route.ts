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
import { dailyJournals } from "@/db/schema";

async function journalAttachmentIds() {
  const rows = await getDb().select({ attachments: dailyJournals.attachments }).from(dailyJournals);
  const ids = new Set<string>();

  for (const row of rows) {
    const attachments = parseAttachments(row.attachments);
    attachments.forEach((attachment) => {
      if (attachment.id) {
        ids.add(attachment.id);
      }
    });
  }

  return ids;
}

function parseAttachments(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
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
  } catch {
    return [];
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
    const files = await listDeviceFiles(folder.id);

    return Response.json(
      {
        file: deviceFileResponse(storedFile, folder, request),
        files: files.map((item) => deviceFileResponse(item, folder, request)),
        folder: deviceFolderResponse(folder, request),
        safety: await getDeviceSafetyStatus(folder.id),
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

    const folder =
      payload.action === "rotate-short-code"
        ? await rotateDeviceShortCode()
        : await rotateDeviceFolderToken();
    const files = await listDeviceFiles(folder.id);
    return Response.json({
      files: files.map((file) => deviceFileResponse(file, folder, request)),
      folder: deviceFolderResponse(folder, request),
      safety: await getDeviceSafetyStatus(folder.id),
    });
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
