import { and, desc, eq, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { authSettings, deviceFiles, deviceFolders } from "@/db/schema";

const DEFAULT_DEVICE_FOLDER_ID = "shared-device-files";
const DEFAULT_DEVICE_FOLDER_NAME = "Shared Device Files";
const DEFAULT_STORAGE_LIMIT_BYTES = Math.floor(9.8 * 1024 * 1024 * 1024);
const DEVICE_FILES_ENABLED_KEY = "device_files_enabled";
const STORAGE_WARNING_RATIO = 0.8;
const SHORT_CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const SHORT_CODE_LENGTH = 6;
const TOKEN_BYTES = 24;

const knownContentTypes: Record<string, string> = {
  aac: "audio/aac",
  avif: "image/avif",
  css: "text/css; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  flac: "audio/flac",
  gif: "image/gif",
  html: "text/html; charset=utf-8",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "application/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  m3u: "audio/x-mpegurl; charset=utf-8",
  m3u8: "application/vnd.apple.mpegurl; charset=utf-8",
  m4a: "audio/mp4",
  m4v: "video/mp4",
  md: "text/markdown; charset=utf-8",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  png: "image/png",
  txt: "text/plain; charset=utf-8",
  wav: "audio/wav",
  webm: "video/webm",
  webp: "image/webp",
  xml: "application/xml; charset=utf-8",
  zip: "application/zip",
};

export type DeviceFolder = typeof deviceFolders.$inferSelect;
export type DeviceFile = typeof deviceFiles.$inferSelect;
type ReadyDeviceFolder = DeviceFolder & { shortCode: string };
type DeviceSafetyStatus = {
  enabled: boolean;
  isNearStorageLimit: boolean;
  isStorageLimitReached: boolean;
  percentUsed: number;
  remainingBytes: number;
  storageLimitBytes: number;
  storageWarningBytes: number;
  totalSize: number;
};

type DeviceFileUpload = {
  body: ReadableStream;
  contentType: string;
  filename: string;
  size: number;
};

export function sharedDeviceFolderId() {
  return DEFAULT_DEVICE_FOLDER_ID;
}

export function makeFolderToken() {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function makeShortCode() {
  let code = "";
  const maxByte = 256 - (256 % SHORT_CODE_ALPHABET.length);

  while (code.length < SHORT_CODE_LENGTH) {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);

    bytes.forEach((byte) => {
      if (byte < maxByte && code.length < SHORT_CODE_LENGTH) {
        code += SHORT_CODE_ALPHABET[byte % SHORT_CODE_ALPHABET.length];
      }
    });
  }

  return code;
}

export function sanitizeDeviceFilename(name: string) {
  const filename = name.trim();

  if (
    !filename ||
    filename.length > 160 ||
    filename === "." ||
    filename === ".." ||
    filename.includes("/") ||
    filename.includes("\\") ||
    /[\x00-\x1f\x7f]/.test(filename)
  ) {
    throw new Error("Use a simple filename like widget.json.");
  }

  return filename;
}

export function inferDeviceContentType(filename: string, explicitType = "") {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const knownType = knownContentTypes[extension];

  if (knownType) {
    return knownType;
  }

  if (explicitType.startsWith("text/")) {
    return explicitType.includes("charset=") ? explicitType : `${explicitType}; charset=utf-8`;
  }

  if (explicitType === "application/json" || explicitType === "application/xml") {
    return `${explicitType}; charset=utf-8`;
  }

  if (explicitType) {
    return explicitType;
  }

  return "application/octet-stream";
}

export async function parseDeviceFileUpload(request: Request): Promise<DeviceFileUpload> {
  const requestContentType = request.headers.get("content-type") ?? "";

  if (requestContentType.toLowerCase().startsWith("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!isFile(file) || !file.name) {
      throw new Error("Choose a device file to upload.");
    }

    return {
      body: file.stream(),
      contentType: inferDeviceContentType(file.name, file.type),
      filename: sanitizeDeviceFilename(file.name),
      size: file.size,
    };
  }

  if (!request.body) {
    throw new Error("Choose a device file to upload.");
  }

  const url = new URL(request.url);
  const filename = sanitizeDeviceFilename(url.searchParams.get("filename") ?? "");

  return {
    body: request.body,
    contentType: inferDeviceContentType(filename, requestContentType),
    filename,
    size: parseUploadedSize(
      request.headers.get("x-device-file-size") ?? request.headers.get("content-length"),
    ),
  };
}

export async function ensureDeviceFolder(): Promise<ReadyDeviceFolder> {
  const db = getDb();
  const [existingFolder] = await db
    .select()
    .from(deviceFolders)
    .where(eq(deviceFolders.id, DEFAULT_DEVICE_FOLDER_ID))
    .limit(1);

  if (existingFolder?.shortCode) {
    return existingFolder;
  }

  if (existingFolder) {
    return updateDeviceFolderShortCode(existingFolder);
  }

  const now = Date.now();
  const folder = {
    createdAt: now,
    id: DEFAULT_DEVICE_FOLDER_ID,
    name: DEFAULT_DEVICE_FOLDER_NAME,
    shortCode: await makeUniqueShortCode(),
    token: makeFolderToken(),
    tokenUpdatedAt: now,
    updatedAt: now,
  };

  await db.insert(deviceFolders).values(folder).onConflictDoNothing();

  const [savedFolder] = await db
    .select()
    .from(deviceFolders)
    .where(eq(deviceFolders.id, DEFAULT_DEVICE_FOLDER_ID))
    .limit(1);

  return savedFolder?.shortCode ? savedFolder : folder;
}

export async function listDeviceFiles(folderId = DEFAULT_DEVICE_FOLDER_ID) {
  return getDb()
    .select()
    .from(deviceFiles)
    .where(eq(deviceFiles.folderId, folderId))
    .orderBy(desc(deviceFiles.updatedAt), desc(deviceFiles.createdAt));
}

export async function getDeviceSafetyStatus(folderId = DEFAULT_DEVICE_FOLDER_ID): Promise<DeviceSafetyStatus> {
  const [enabled, totalSize] = await Promise.all([
    isDeviceFilesEnabled(),
    getDeviceStorageBytes(folderId),
  ]);
  const storageLimitBytes = getDeviceStorageLimitBytes();
  const storageWarningBytes = Math.floor(storageLimitBytes * STORAGE_WARNING_RATIO);
  const remainingBytes = Math.max(storageLimitBytes - totalSize, 0);
  const percentUsed = storageLimitBytes > 0 ? Math.min((totalSize / storageLimitBytes) * 100, 100) : 100;

  return {
    enabled,
    isNearStorageLimit: totalSize >= storageWarningBytes,
    isStorageLimitReached: totalSize >= storageLimitBytes,
    percentUsed,
    remainingBytes,
    storageLimitBytes,
    storageWarningBytes,
    totalSize,
  };
}

export async function setDeviceFilesEnabled(enabled: boolean) {
  const now = Date.now();
  await getDb()
    .insert(authSettings)
    .values({
      key: DEVICE_FILES_ENABLED_KEY,
      updatedAt: now,
      value: enabled ? "true" : "false",
    })
    .onConflictDoUpdate({
      target: authSettings.key,
      set: { updatedAt: now, value: enabled ? "true" : "false" },
    });

  return getDeviceSafetyStatus();
}

export async function storeDeviceFile(upload: DeviceFileUpload, folder?: DeviceFolder) {
  const activeFolder = folder ?? (await ensureDeviceFolder());
  const db = getDb();
  const now = Date.now();
  const [existingFile] = await db
    .select()
    .from(deviceFiles)
    .where(and(eq(deviceFiles.folderId, activeFolder.id), eq(deviceFiles.filename, upload.filename)))
    .limit(1);
  const fileId = existingFile?.id ?? crypto.randomUUID();
  const objectKey = makeDeviceObjectKey(activeFolder.id, fileId, crypto.randomUUID(), upload.filename);
  const safety = await getDeviceSafetyStatus(activeFolder.id);

  if (!safety.enabled) {
    throw new Error("Device Files are paused. Enable them before uploading.");
  }

  const existingSize = existingFile?.size ?? 0;
  if (upload.size > 0) {
    assertWithinStorageLimit(safety.totalSize - existingSize + upload.size, safety.storageLimitBytes);
  }

  const storedObject = await getDeviceFilesBucket().put(objectKey, upload.body, {
    httpMetadata: {
      contentDisposition: `inline; filename="${headerFilename(upload.filename)}"`,
      contentType: upload.contentType,
    },
  });

  try {
    assertWithinStorageLimit(safety.totalSize - existingSize + storedObject.size, safety.storageLimitBytes);

    if (existingFile) {
      const [updatedFile] = await db
        .update(deviceFiles)
        .set({
          content: "",
          contentType: upload.contentType,
          objectKey,
          size: storedObject.size,
          updatedAt: now,
        })
        .where(eq(deviceFiles.id, existingFile.id))
        .returning();

      if (existingFile.objectKey && existingFile.objectKey !== objectKey) {
        await getDeviceFilesBucket().delete(existingFile.objectKey).catch(() => undefined);
      }

      return updatedFile ?? existingFile;
    }

    const [createdFile] = await db
      .insert(deviceFiles)
      .values({
        content: "",
        contentType: upload.contentType,
        createdAt: now,
        filename: upload.filename,
        folderId: activeFolder.id,
        id: fileId,
        objectKey,
        size: storedObject.size,
        updatedAt: now,
      })
      .returning();

    return createdFile;
  } catch (error) {
    await getDeviceFilesBucket().delete(objectKey).catch(() => undefined);
    throw error;
  }
}

export async function deleteDeviceFile(id: string, folderId = DEFAULT_DEVICE_FOLDER_ID) {
  const db = getDb();
  const [existingFile] = await db
    .select()
    .from(deviceFiles)
    .where(and(eq(deviceFiles.folderId, folderId), eq(deviceFiles.id, id)))
    .limit(1);

  if (!existingFile) {
    return null;
  }

  await db.delete(deviceFiles).where(eq(deviceFiles.id, id));
  if (existingFile.objectKey) {
    await getDeviceFilesBucket().delete(existingFile.objectKey);
  }
  return existingFile;
}

export async function rotateDeviceFolderToken() {
  const folder = await ensureDeviceFolder();
  const now = Date.now();
  const [updatedFolder] = await getDb()
    .update(deviceFolders)
    .set({
      token: makeFolderToken(),
      tokenUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(deviceFolders.id, folder.id))
    .returning();

  return updatedFolder ?? folder;
}

export async function rotateDeviceShortCode() {
  const folder = await ensureDeviceFolder();
  return updateDeviceFolderShortCode(folder);
}

export function deviceFolderResponse(folder: DeviceFolder, request: Request) {
  const sharedPath = `/d/${encodeURIComponent(folder.token)}`;
  const shortCode = folder.shortCode ?? "";
  const shortPath = `/t/${encodeURIComponent(shortCode)}`;
  return {
    createdAt: folder.createdAt,
    id: folder.id,
    name: folder.name,
    sharedPath,
    sharedUrl: `${sharedOrigin(request)}${sharedPath}`,
    shortCode,
    shortPath,
    shortUrl: `${sharedOrigin(request)}${shortPath}`,
    token: folder.token,
    tokenUpdatedAt: folder.tokenUpdatedAt,
    updatedAt: folder.updatedAt,
  };
}

export function deviceFileResponse(file: DeviceFile, folder: DeviceFolder, request: Request) {
  const sharedPath = `/d/${encodeURIComponent(folder.token)}/${encodeURIComponent(file.filename)}`;
  const shortPath = `/t/${encodeURIComponent(folder.shortCode ?? "")}/${encodeURIComponent(file.filename)}`;
  return {
    contentType: file.contentType,
    createdAt: file.createdAt,
    filename: file.filename,
    id: file.id,
    sharedPath,
    sharedUrl: `${sharedOrigin(request)}${sharedPath}`,
    shortPath,
    shortUrl: `${sharedOrigin(request)}${shortPath}`,
    size: file.size,
    updatedAt: file.updatedAt,
  };
}

export function deviceFilesRouteError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const detail =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message}\n${detail}`;

  if (combined.includes("no such table") || /device_folders|device_files/.test(combined)) {
    return "The device files database is not ready yet. Deploy the generated migration with the site.";
  }

  return message;
}

async function isDeviceFilesEnabled() {
  const [setting] = await getDb()
    .select({ value: authSettings.value })
    .from(authSettings)
    .where(eq(authSettings.key, DEVICE_FILES_ENABLED_KEY))
    .limit(1);

  return setting?.value !== "false";
}

async function getDeviceStorageBytes(folderId: string) {
  const [row] = await getDb()
    .select({
      totalSize: sql<number>`coalesce(sum(${deviceFiles.size}), 0)`,
    })
    .from(deviceFiles)
    .where(eq(deviceFiles.folderId, folderId));

  return Number(row?.totalSize ?? 0);
}

function getDeviceStorageLimitBytes() {
  const rawLimit = Number(env.DEVICE_FILES_STORAGE_LIMIT_BYTES);

  if (Number.isFinite(rawLimit) && rawLimit > 0) {
    return Math.floor(rawLimit);
  }

  return DEFAULT_STORAGE_LIMIT_BYTES;
}

function assertWithinStorageLimit(totalSize: number, storageLimitBytes: number) {
  if (totalSize <= storageLimitBytes) {
    return;
  }

  throw new Error(
    `Device Files storage safety limit reached. Delete files or raise the limit before uploading more.`
  );
}

function getDeviceFilesBucket() {
  if (!env.DEVICE_FILES) {
    throw new Error(
      "Cloudflare R2 binding `DEVICE_FILES` is unavailable. Keep the DEVICE_FILES bucket binding in wrangler.jsonc and run the app through the Cloudflare Workers runtime before using device files."
    );
  }

  return env.DEVICE_FILES;
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function parseUploadedSize(value: string | null) {
  const size = Number(value);
  return Number.isFinite(size) && size >= 0 ? Math.floor(size) : 0;
}

function makeDeviceObjectKey(folderId: string, fileId: string, uploadId: string, filename: string) {
  return `device-files/${encodeURIComponent(folderId)}/${encodeURIComponent(fileId)}/${encodeURIComponent(uploadId)}/${encodeURIComponent(filename)}`;
}

function headerFilename(filename: string) {
  return filename.replace(/["\\\r\n]/g, "_");
}

function sharedOrigin(request: Request) {
  const url = new URL(request.url);

  if (url.hostname === "journal.shubhamtripathi.com") {
    return "https://shubhamtripathi.com";
  }

  return url.origin;
}

async function makeUniqueShortCode() {
  const db = getDb();

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const shortCode = makeShortCode();
    const [existingFolder] = await db
      .select({ id: deviceFolders.id })
      .from(deviceFolders)
      .where(eq(deviceFolders.shortCode, shortCode))
      .limit(1);

    if (!existingFolder) {
      return shortCode;
    }
  }

  throw new Error("Unable to create a unique TV code.");
}

async function updateDeviceFolderShortCode(folder: DeviceFolder): Promise<ReadyDeviceFolder> {
  const now = Date.now();
  const [updatedFolder] = await getDb()
    .update(deviceFolders)
    .set({
      shortCode: await makeUniqueShortCode(),
      updatedAt: now,
    })
    .where(eq(deviceFolders.id, folder.id))
    .returning();

  if (!updatedFolder?.shortCode) {
    throw new Error("Unable to save the TV code.");
  }

  return updatedFolder;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
