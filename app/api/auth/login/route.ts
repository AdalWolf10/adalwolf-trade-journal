import { createSessionToken, isAuthConfigured, makeSessionCookie, validateLogin } from "@/lib/auth";

type LoginPayload = {
  password?: unknown;
  username?: unknown;
};

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return Response.json({ error: "Login is not configured yet." }, { status: 503 });
  }

  const payload = (await request.json()) as LoginPayload;
  const username = typeof payload.username === "string" ? payload.username.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!(await validateLogin(username, password))) {
    return Response.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const token = await createSessionToken(username);
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": makeSessionCookie(token, request.url),
      },
    },
  );
}
