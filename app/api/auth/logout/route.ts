import {
  isSameOriginRequest,
  makeExpiredSessionCookie,
  readSessionToken,
  revokeSessionToken,
} from "@/lib/auth";

export async function POST(request: Request) {
  const expiredCookie = makeExpiredSessionCookie(request.url);

  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "Cross-site logout requests are not allowed." },
      { headers: { "Set-Cookie": expiredCookie }, status: 403 },
    );
  }

  try {
    const token = readSessionToken(request);
    if (token) {
      await revokeSessionToken(token);
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to securely log out." },
      { headers: { "Set-Cookie": expiredCookie }, status: 500 },
    );
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": expiredCookie,
      },
    },
  );
}
