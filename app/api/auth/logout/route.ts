import { makeExpiredSessionCookie, readSessionToken, revokeSessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const token = readSessionToken(request);
  if (!token) {
    return Response.json({ error: "There is no session to sign out." }, { status: 401 });
  }

  const headers = { "Set-Cookie": makeExpiredSessionCookie(request.url) };

  if ((await revokeSessionToken(token)) === "failed") {
    return Response.json(
      {
        error:
          "Signed out on this device, but the session could not be revoked. Change your password if this device is shared.",
      },
      { headers, status: 500 },
    );
  }

  return Response.json({ ok: true }, { headers });
}
