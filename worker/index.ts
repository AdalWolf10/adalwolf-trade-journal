/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

const DEVICE_FILES_ENABLED_KEY = "device_files_enabled";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  DEVICE_FILES: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

type DeviceFileRow = {
  content: string | null;
  content_type: string;
  filename: string;
  object_key: string | null;
  size: number;
  updated_at: number;
};

type DeviceByteRange = {
  contentRange: string;
  length: number;
  offset: number;
};

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

function withNoStoreForHtml(request: Request, response: Response) {
  const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false;
  const isHtml = response.headers.get("content-type")?.includes("text/html") ?? false;

  if (!acceptsHtml && !isHtml) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function parseDeviceFilePath(pathname: string) {
  const [resource, rawCode, ...rawFilename] = pathname.split("/").filter(Boolean);

  if ((resource !== "d" && resource !== "t") || !rawCode || !rawFilename.length) {
    return null;
  }

  try {
    const code = decodeURIComponent(rawCode).toLowerCase();
    const filename = decodeURIComponent(rawFilename.join("/"));
    const isLongToken = resource === "d";
    const isValidCode = isLongToken
      ? /^[A-Za-z0-9_-]{32,96}$/.test(code)
      : /^[a-z0-9]{6}$/.test(code);

    if (
      !isValidCode ||
      !filename ||
      filename.length > 160 ||
      filename === "." ||
      filename === ".." ||
      filename.includes("/") ||
      filename.includes("\\") ||
      /[\x00-\x1f\x7f]/.test(filename)
    ) {
      return null;
    }

    return {
      code,
      filename,
      lookupColumn: isLongToken ? "token" : "short_code",
    };
  } catch {
    return null;
  }
}

function headerFilename(filename: string) {
  return filename.replace(/["\\\r\n]/g, "_");
}

async function areDeviceFilesEnabled(env: Env) {
  const setting = await env.DB.prepare(
    "SELECT value FROM auth_settings WHERE key = ?1 LIMIT 1",
  )
    .bind(DEVICE_FILES_ENABLED_KEY)
    .first<{ value: string }>();

  return setting?.value !== "false";
}

function parseDeviceRange(rangeHeader: string | null, size: number): DeviceByteRange | "invalid" | null {
  if (!rangeHeader) {
    return null;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || rangeHeader.includes(",") || size < 1) {
    return "invalid";
  }

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) {
    return "invalid";
  }

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength < 1) {
      return "invalid";
    }
    const offset = Math.max(size - suffixLength, 0);
    const length = size - offset;
    return {
      contentRange: `bytes ${offset}-${size - 1}/${size}`,
      length,
      offset,
    };
  }

  const start = Number(rawStart);
  const requestedEnd = rawEnd ? Number(rawEnd) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= size
  ) {
    return "invalid";
  }

  const end = Math.min(requestedEnd, size - 1);
  return {
    contentRange: `bytes ${start}-${end}/${size}`,
    length: end - start + 1,
    offset: start,
  };
}

function deviceObjectHeaders(file: DeviceFileRow, object: R2Object, contentLength: number) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=60");
  headers.set("Content-Disposition", `inline; filename="${headerFilename(file.filename)}"`);
  headers.set("Content-Length", String(contentLength));
  headers.set("Content-Type", file.content_type || headers.get("Content-Type") || "application/octet-stream");
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

function legacyDeviceFileHeaders(file: DeviceFileRow) {
  const body = file.content ?? "";
  const etag = `"device-file-${file.updated_at}-${file.size}"`;
  return new Headers({
    "Cache-Control": "private, max-age=60",
    "Content-Disposition": `inline; filename="${headerFilename(file.filename)}"`,
    "Content-Length": String(new TextEncoder().encode(body).byteLength),
    "Content-Type": file.content_type || "text/plain; charset=utf-8",
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
  });
}

async function serveDeviceObject(request: Request, env: Env, file: DeviceFileRow) {
  if (!file.object_key) {
    return null;
  }

  if (request.method === "HEAD") {
    const object = await env.DEVICE_FILES.head(file.object_key);
    if (!object) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(null, {
      headers: deviceObjectHeaders(file, object, object.size),
    });
  }

  const head = await env.DEVICE_FILES.head(file.object_key);
  if (!head) {
    return new Response("Not found", { status: 404 });
  }

  const range = parseDeviceRange(request.headers.get("range"), head.size);
  if (range === "invalid") {
    const headers = deviceObjectHeaders(file, head, 0);
    headers.set("Content-Range", `bytes */${head.size}`);
    headers.delete("Content-Length");
    return new Response("Range not satisfiable", { headers, status: 416 });
  }

  const object = await env.DEVICE_FILES.get(
    file.object_key,
    range ? { range: { length: range.length, offset: range.offset } } : undefined,
  );
  if (!object || !("body" in object)) {
    return new Response("Not found", { status: 404 });
  }

  const headers = deviceObjectHeaders(file, object, range?.length ?? object.size);
  if (range) {
    headers.set("Content-Range", range.contentRange);
  }

  return new Response(object.body, {
    headers,
    status: range ? 206 : 200,
  });
}

async function serveDeviceFile(request: Request, env: Env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      headers: { Allow: "GET, HEAD" },
      status: 405,
    });
  }

  const url = new URL(request.url);
  const parsed = parseDeviceFilePath(url.pathname);
  if (!parsed) {
    return new Response("Not found", { status: 404 });
  }

  try {
    if (!(await areDeviceFilesEnabled(env))) {
      return new Response("Device files are paused", { status: 403 });
    }

    const lookupColumn =
      parsed.lookupColumn === "short_code" ? "device_folders.short_code" : "device_folders.token";
    const file = await env.DB.prepare(
      `
        SELECT
          device_files.filename,
          device_files.content_type,
          device_files.content,
          device_files.object_key,
          device_files.size,
          device_files.updated_at
        FROM device_files
        INNER JOIN device_folders ON device_folders.id = device_files.folder_id
        WHERE ${lookupColumn} = ?1 AND device_files.filename = ?2
        LIMIT 1
      `,
    )
      .bind(parsed.code, parsed.filename)
      .first<DeviceFileRow>();

    if (!file) {
      return new Response("Not found", { status: 404 });
    }

    if (file.object_key) {
      const objectResponse = await serveDeviceObject(request, env, file);
      return objectResponse ?? new Response("Not found", { status: 404 });
    }

    const headers = legacyDeviceFileHeaders(file);
    const etag = headers.get("ETag");

    if (etag && request.headers.get("if-none-match") === etag) {
      return new Response(null, { headers, status: 304 });
    }

    return new Response(request.method === "HEAD" ? null : file.content ?? "", { headers });
  } catch {
    return new Response("Device files are not ready yet", { status: 500 });
  }
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/d/") || url.pathname.startsWith("/t/")) {
      return serveDeviceFile(request, env);
    }

    if (url.hostname === "shubhamtripathi.com") {
      url.hostname = "journal.shubhamtripathi.com";
      return Response.redirect(url.toString(), 302);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const response = await handler.fetch(request, env, ctx);
    return withNoStoreForHtml(request, response);
  },
};

export default worker;
