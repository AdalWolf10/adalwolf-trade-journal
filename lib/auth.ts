import { env } from "cloudflare:workers";
import { eq, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { authAttempts, authSettings, sessionRevocations } from "@/db/schema";

export const SESSION_COOKIE = "exit_journal_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  exp: number;
  jti: string;
  sub: string;
};

type AuthAttempt = {
  count: number;
  lockedUntil: number;
  resetAt: number;
};

type AttemptStore = "d1" | "memory";

type RevocationResult = "revoked" | "unknown-session" | "failed";

type ThrottleDecision =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      message: string;
      retryAfterSeconds: number;
    };

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PASSWORD_SETTING_KEY = "password_hash";
const PASSWORD_HASH_SCHEME = "pbkdf2_sha256";
const PASSWORD_HASH_ITERATIONS = 100_000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_HASH_BITS = 256;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const SESSION_ID_BYTES = 18;
const memoryAttempts = new Map<string, AuthAttempt>();
const memoryRevocations = new Map<string, number>();

export function isAuthConfigured() {
  return Boolean(
    readEnv("JOURNAL_USERNAME") &&
      readEnv("SESSION_SECRET") &&
      (readEnv("JOURNAL_PASSWORD_HASH") || readEnv("JOURNAL_PASSWORD") || hasDbBinding()),
  );
}

export async function isAuthenticated() {
  if (!isAuthConfigured()) {
    return false;
  }

  const cookieStore = await cookies();
  return Boolean(await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value));
}

export async function isAuthenticatedRequest(request: Request) {
  if (!isAuthConfigured()) {
    return false;
  }

  return Boolean(await verifySessionToken(readSessionToken(request)));
}

export function readSessionToken(request: Request) {
  return parseCookieHeader(request.headers.get("cookie"))[SESSION_COOKIE] ?? "";
}

/**
 * Rejects state-changing requests that a third-party page triggered. Browsers
 * always send `Origin` on cross-site POSTs, so a request that omits both
 * `Origin` and `Referer` is treated as untrusted rather than assumed local.
 */
export function isSameOriginRequest(request: Request) {
  const target = new URL(request.url);
  const origin = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
  if (!origin) {
    return false;
  }

  try {
    const candidate = new URL(origin);
    return candidate.protocol === target.protocol && candidate.host === target.host;
  } catch {
    return false;
  }
}

export async function requireAuthenticatedRequest(request: Request) {
  if (await isAuthenticatedRequest(request)) {
    return null;
  }

  return Response.json({ error: "Please log in to use the journal." }, { status: 401 });
}

export async function validateLogin(username: string, password: string) {
  const configuredUsername = readEnv("JOURNAL_USERNAME");
  if (!configuredUsername || !readEnv("SESSION_SECRET")) {
    return false;
  }

  if (!constantTimeEqual(username, configuredUsername)) {
    return false;
  }

  const storedHash = await readStoredPasswordHash();
  if (storedHash) {
    return verifyPasswordHash(password, storedHash);
  }

  const configuredHash = readEnv("JOURNAL_PASSWORD_HASH");
  if (configuredHash) {
    return verifyPasswordHash(password, configuredHash);
  }

  const configuredPassword = readEnv("JOURNAL_PASSWORD");
  return Boolean(configuredPassword) && constantTimeEqual(password, configuredPassword);
}

export async function validateCurrentPassword(password: string) {
  const configuredUsername = readEnv("JOURNAL_USERNAME");
  return Boolean(configuredUsername) && validateLogin(configuredUsername, password);
}

export function passwordPolicyError(password: string) {
  if (password.length < 12) {
    return "Use at least 12 characters.";
  }

  const categories = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (categories < 3) {
    return "Use a mix of letters, numbers, and symbols.";
  }

  if (password.toLowerCase().includes("password")) {
    return "Choose a less obvious password.";
  }

  return "";
}

export async function updateStoredPassword(password: string) {
  const policyError = passwordPolicyError(password);
  if (policyError) {
    throw new Error(policyError);
  }

  const hash = await hashPassword(password);
  const now = Date.now();

  try {
    await getDb()
      .insert(authSettings)
      .values({ key: PASSWORD_SETTING_KEY, updatedAt: now, value: hash })
      .onConflictDoUpdate({
        target: authSettings.key,
        set: { updatedAt: now, value: hash },
      });
  } catch (error) {
    if (isBootstrapStorageError(error)) {
      throw new Error("The security database is not ready yet. Publish the latest version first.");
    }
    throw error;
  }
}

export function loginAttemptIdentifier(request: Request, username: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("cf-connecting-ip") ?? forwarded ?? "local";
  return `${username.trim().toLowerCase() || "blank"}:${ip}`;
}

export async function checkLoginThrottle(identifier: string): Promise<ThrottleDecision> {
  const { attempt } = await readAuthAttempt(identifier);
  const now = Date.now();

  if (!attempt || attempt.resetAt <= now) {
    return { allowed: true };
  }

  if (attempt.lockedUntil > now) {
    return throttleBlocked(attempt.lockedUntil, now);
  }

  return { allowed: true };
}

export async function recordFailedLogin(identifier: string): Promise<ThrottleDecision> {
  const { attempt, store } = await readAuthAttempt(identifier);
  const now = Date.now();
  const activeAttempt = attempt && attempt.resetAt > now ? attempt : null;
  const count = activeAttempt ? activeAttempt.count + 1 : 1;
  const lockedUntil = count >= LOGIN_MAX_FAILURES ? now + LOGIN_LOCK_MS : 0;
  const nextAttempt = {
    count,
    lockedUntil,
    resetAt: activeAttempt ? activeAttempt.resetAt : now + LOGIN_WINDOW_MS,
  };

  await writeAuthAttempt(identifier, nextAttempt, store);

  if (lockedUntil) {
    return throttleBlocked(lockedUntil, now);
  }

  return { allowed: true };
}

export async function clearLoginThrottle(identifier: string) {
  memoryAttempts.delete(identifier);
  try {
    await getDb().delete(authAttempts).where(eq(authAttempts.identifier, identifier));
  } catch {
    // In local/bootstrap states the D1 throttle table may not exist yet.
  }
}

export async function createSessionToken(username: string) {
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    jti: makeSessionId(),
    sub: username,
  };
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

/**
 * Signing out has to outlive the cookie: the token stays valid for its whole
 * TTL once it leaks, so record its id and reject it on every later request.
 * Reports "failed" when the revocation could not be stored, so the caller can
 * tell the user their session is still live somewhere.
 */
export async function revokeSessionToken(token: string): Promise<RevocationResult> {
  const payload = await verifySessionToken(token);
  if (!payload) {
    // Already expired, already revoked, or not ours: nothing left to revoke.
    return "unknown-session";
  }

  const now = Date.now();
  const revocation = {
    expiresAt: payload.exp * 1000,
    jti: payload.jti,
    revokedAt: now,
  };

  try {
    await getDb()
      .insert(sessionRevocations)
      .values(revocation)
      .onConflictDoNothing({ target: sessionRevocations.jti });
  } catch (error) {
    if (!isBootstrapStorageError(error)) {
      return "failed";
    }

    // The revocation table is not deployed yet; hold it for this isolate.
    memoryRevocations.set(revocation.jti, revocation.expiresAt);
    return "revoked";
  }

  await purgeExpiredRevocations(now);
  return "revoked";
}

export function makeSessionCookie(token: string, requestUrl: string) {
  return serializeCookie(SESSION_COOKIE, token, requestUrl, SESSION_TTL_SECONDS);
}

export function makeExpiredSessionCookie(requestUrl: string) {
  return serializeCookie(SESSION_COOKIE, "", requestUrl, 0);
}

async function verifySessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await sign(encodedPayload);
  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
  } catch {
    return null;
  }

  // Sessions minted before revocation existed carry no id, so they can never be
  // signed out. Retire them and make the browser log in once more.
  if (!payload.sub || !payload.jti || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  if (await isSessionRevoked(payload.jti)) {
    return null;
  }

  return payload;
}

function makeSessionId() {
  const bytes = new Uint8Array(SESSION_ID_BYTES);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function isSessionRevoked(jti: string) {
  try {
    const [revoked] = await getDb()
      .select({ jti: sessionRevocations.jti })
      .from(sessionRevocations)
      .where(eq(sessionRevocations.jti, jti))
      .limit(1);
    return Boolean(revoked);
  } catch (error) {
    if (isBootstrapStorageError(error)) {
      return memoryRevocations.has(jti);
    }

    // Fail closed: an unreadable revocation list must not grant access.
    return true;
  }
}

async function purgeExpiredRevocations(now: number) {
  memoryRevocations.forEach((expiresAt, jti) => {
    if (expiresAt <= now) {
      memoryRevocations.delete(jti);
    }
  });

  try {
    await getDb().delete(sessionRevocations).where(lt(sessionRevocations.expiresAt, now));
  } catch {
    // Housekeeping only; an expired row is already rejected by the exp check.
  }
}

async function sign(value: string) {
  const secret = readEnv("SESSION_SECRET");
  if (!secret) {
    return "";
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

async function readStoredPasswordHash() {
  try {
    const [setting] = await getDb()
      .select({ value: authSettings.value })
      .from(authSettings)
      .where(eq(authSettings.key, PASSWORD_SETTING_KEY))
      .limit(1);
    return setting?.value ?? "";
  } catch (error) {
    if (isBootstrapStorageError(error)) {
      return "";
    }
    throw error;
  }
}

async function hashPassword(password: string) {
  const salt = new Uint8Array(PASSWORD_SALT_BYTES);
  crypto.getRandomValues(salt);
  const derived = await derivePasswordBytes(password, salt, PASSWORD_HASH_ITERATIONS);
  return `${PASSWORD_HASH_SCHEME}$${PASSWORD_HASH_ITERATIONS}$${base64UrlEncode(salt)}$${base64UrlEncode(derived)}`;
}

async function verifyPasswordHash(password: string, storedHash: string) {
  const [scheme, iterationText, saltText, hashText] = storedHash.split("$");
  const iterations = Number(iterationText);

  if (
    scheme !== PASSWORD_HASH_SCHEME ||
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    !saltText ||
    !hashText
  ) {
    return false;
  }

  try {
    const salt = base64UrlToBytes(saltText);
    const expectedHash = base64UrlToBytes(hashText);
    const candidateHash = await derivePasswordBytes(password, salt, iterations);
    return constantTimeEqualBytes(candidateHash, expectedHash);
  } catch {
    return false;
  }
}

async function derivePasswordBytes(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      hash: "SHA-256",
      iterations,
      name: "PBKDF2",
      salt: bytesToArrayBuffer(salt),
    },
    key,
    PASSWORD_HASH_BITS,
  );
  return new Uint8Array(bits);
}

function bytesToArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function readAuthAttempt(identifier: string): Promise<{
  attempt: AuthAttempt | null;
  store: AttemptStore;
}> {
  try {
    const [attempt] = await getDb()
      .select()
      .from(authAttempts)
      .where(eq(authAttempts.identifier, identifier))
      .limit(1);
    return { attempt: attempt ?? null, store: "d1" };
  } catch {
    return { attempt: memoryAttempts.get(identifier) ?? null, store: "memory" };
  }
}

async function writeAuthAttempt(identifier: string, attempt: AuthAttempt, store: AttemptStore) {
  if (store === "d1") {
    try {
      await getDb()
        .insert(authAttempts)
        .values({ identifier, ...attempt })
        .onConflictDoUpdate({
          target: authAttempts.identifier,
          set: attempt,
        });
      return;
    } catch {
      // Fall through to memory when the throttle table is not available.
    }
  }

  memoryAttempts.set(identifier, attempt);
}

function throttleBlocked(lockedUntil: number, now: number): ThrottleDecision {
  return {
    allowed: false,
    message: `Too many login attempts. Try again in ${Math.ceil((lockedUntil - now) / 60000)} minutes.`,
    retryAfterSeconds: Math.max(1, Math.ceil((lockedUntil - now) / 1000)),
  };
}

function readEnv(key: string) {
  const runtimeValue = (env as unknown as Record<string, unknown>)[key];
  if (typeof runtimeValue === "string" && runtimeValue.length) {
    return runtimeValue;
  }

  if (typeof process !== "undefined") {
    const nodeValue = process.env[key];
    if (typeof nodeValue === "string" && nodeValue.length) {
      return nodeValue;
    }
  }

  return "";
}

function hasDbBinding() {
  return Boolean((env as unknown as Record<string, unknown>).DB);
}

function serializeCookie(name: string, value: string, requestUrl: string, maxAge: number) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly${secure}`;
}

function parseCookieHeader(header: string | null) {
  return (header ?? "").split(";").reduce<Record<string, string>>((cookies, chunk) => {
    const [name, ...valueParts] = chunk.trim().split("=");
    if (name) {
      cookies[name] = valueParts.join("=");
    }
    return cookies;
  }, {});
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return difference === 0;
}

function constantTimeEqualBytes(left: Uint8Array, right: Uint8Array) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }

  return difference === 0;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  return decoder.decode(base64UrlToBytes(value));
}

function base64UrlToBytes(value: string) {
  const padded = `${value.replaceAll("-", "+").replaceAll("_", "/")}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isMissingTableError(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.message}\n${error.cause instanceof Error ? error.cause.message : ""}`
      : String(error);
  return (
    message.includes("no such table") &&
    /auth_settings|auth_attempts|session_revocations/.test(message)
  );
}

function isBootstrapStorageError(error: unknown) {
  const message =
    error instanceof Error
      ? `${error.message}\n${error.cause instanceof Error ? error.cause.message : ""}`
      : String(error);
  return isMissingTableError(error) || message.includes("D1 binding `DB` is unavailable");
}
