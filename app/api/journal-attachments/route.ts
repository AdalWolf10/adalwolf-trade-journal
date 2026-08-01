import { env } from "cloudflare:workers";
import { requireAuthenticatedRequest } from "@/lib/auth";

type AttachmentResponse = {
  attachment?: {
    contentType: string;
    filename: string;
    id: string;
    size: number;
    uploadedAt: number;
    url: string;
  };
  error?: string;
  ok?: boolean;
};

const JOURNAL_ATTACHMENT_PREFIX = "journal-attachments/";

const knownContentTypes: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  pdf: "application/pdf",
  png: "image/png",
  webp: "image/webp",
};

function getBucket() {
  if (!env.DEVICE_FILES) {
    throw new Error("Private journal attachment storage is not ready yet.");
  }

  return env.DEVICE_FILES;
}

function cleanFilename(value: string) {
  const filename = value.trim();

  if (
    !filename ||
    filename.length > 180 ||
    filename === "." ||
    filename === ".." ||
    filename.includes("/") ||
    filename.includes("\\") ||
    /[\x00-\x1f\x7f]/.test(filename)
  ) {
    throw new Error("Use a simple attachment filename.");
  }

  return filename;
}

function headerFilename(filename: string) {
  return filename.replace(/["\\\r\n]/g, "_");
}

function inferContentType(filename: string, explicitType = "") {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const knownType = knownContentTypes[extension];

  if (knownType) {
    return knownType;
  }

  return explicitType || "application/octet-stream";
}

function parseSize(value: string | null) {
  const size = Number(value);
  return Number.isFinite(size) && size >= 0 ? Math.floor(size) : 0;
}

function makeObjectKey(filename: string) {
  return `${JOURNAL_ATTACHMENT_PREFIX}${crypto.randomUUID()}/${encodeURIComponent(filename)}`;
}

function isValidAttachmentKey(key: string) {
  return (
    key.startsWith(JOURNAL_ATTACHMENT_PREFIX) &&
    key.length <= 320 &&
    !key.includes("..") &&
    !/[\x00-\x1f\x7f]/.test(key)
  );
}

function filenameFromKey(key: string) {
  const lastPart = key.split("/").pop() ?? "attachment";
  try {
    return cleanFilename(decodeURIComponent(lastPart));
  } catch {
    return "attachment";
  }
}

function attachmentUrl(key: string) {
  return `/api/journal-attachments?key=${encodeURIComponent(key)}`;
}

function attachmentHeaders(object: R2Object | R2ObjectBody, filename: string) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  headers.set("Content-Disposition", `inline; filename="${headerFilename(filename)}"`);
  headers.set("Content-Length", String(object.size));
  headers.set("Content-Type", headers.get("Content-Type") || "application/octet-stream");
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

function routeError(error: unknown) {
  return error instanceof Error ? error.message : "Unable to use private journal attachment.";
}

export async function POST(request: Request): Promise<Response> {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    if (!request.body) {
      return Response.json({ error: "Choose a file to upload." } satisfies AttachmentResponse, {
        status: 400,
      });
    }

    const url = new URL(request.url);
    const filename = cleanFilename(url.searchParams.get("filename") ?? "");
    const contentType = inferContentType(filename, request.headers.get("content-type") ?? "");
    const expectedSize = parseSize(
      request.headers.get("x-journal-attachment-size") ?? request.headers.get("content-length"),
    );
    const objectKey = makeObjectKey(filename);
    const storedObject = await getBucket().put(objectKey, request.body, {
      customMetadata: {
        filename,
        uploadedAt: String(Date.now()),
      },
      httpMetadata: {
        contentDisposition: `inline; filename="${headerFilename(filename)}"`,
        contentType,
      },
    });

    return Response.json(
      {
        attachment: {
          contentType,
          filename,
          id: objectKey,
          size: storedObject.size || expectedSize,
          uploadedAt: Date.now(),
          url: attachmentUrl(objectKey),
        },
      } satisfies AttachmentResponse,
      { status: 201 },
    );
  } catch (error) {
    const message = routeError(error);
    const status = /filename|Choose/.test(message) ? 400 : 500;
    return Response.json({ error: message } satisfies AttachmentResponse, { status });
  }
}

export async function GET(request: Request): Promise<Response> {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key") ?? "";

    if (!isValidAttachmentKey(key)) {
      return new Response("Not found", { status: 404 });
    }

    const object = await getBucket().get(key);
    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(object.body, {
      headers: attachmentHeaders(object, filenameFromKey(key)),
    });
  } catch {
    return new Response("Private journal attachment is not ready yet.", { status: 500 });
  }
}

export async function HEAD(request: Request): Promise<Response> {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key") ?? "";

    if (!isValidAttachmentKey(key)) {
      return new Response(null, { status: 404 });
    }

    const object = await getBucket().head(key);
    if (!object) {
      return new Response(null, { status: 404 });
    }

    return new Response(null, {
      headers: attachmentHeaders(object, filenameFromKey(key)),
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key") ?? "";

    if (!isValidAttachmentKey(key)) {
      return Response.json({ error: "Attachment not found." } satisfies AttachmentResponse, {
        status: 404,
      });
    }

    await getBucket().delete(key);
    return Response.json({ ok: true } satisfies AttachmentResponse);
  } catch (error) {
    return Response.json({ error: routeError(error) } satisfies AttachmentResponse, { status: 500 });
  }
}
