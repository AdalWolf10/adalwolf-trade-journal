import { makeExpiredSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": makeExpiredSessionCookie(request.url),
      },
    },
  );
}
