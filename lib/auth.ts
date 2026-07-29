import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "exit_journal_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  exp: number;
  sub: string;
};

const encoder = new TextEncoder();

export function isAuthConfigured() {
  return Boolean(readEnv("JOURNAL_USERNAME") && readEnv("JOURNAL_PASSWORD") && readEnv("SESSION_SECRET"));
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

  const token = parseCookieHeader(request.headers.get("cookie"))[SESSION_COOKIE];
  return Boolean(await verifySessionToken(token));
}

export async function requireAuthenticatedRequest(request: Request) {
  if (await isAuthenticatedRequest(request)) {
    return null;
  }

  return Response.json({ error: "Please log in to use the journal." }, { status: 401 });
}

export async function validateLogin(username: string, password: string) {
  const configuredUsername = readEnv("JOURNAL_USERNAME");
  const configuredPassword = readEnv("JOURNAL_PASSWORD");
  if (!configuredUsername || !configuredPassword || !readEnv("SESSION_SECRET")) {
    return false;
  }

  return constantTimeEqual(username, configuredUsername) && constantTimeEqual(password, configuredPassword);
}

export async function createSessionToken(username: string) {
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    sub: username,
  };
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
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

  if (!payload.sub || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
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

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = `${value.replaceAll("-", "+").replaceAll("_", "/")}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}
