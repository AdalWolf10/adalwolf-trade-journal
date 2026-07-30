import {
  checkLoginThrottle,
  clearLoginThrottle,
  createSessionToken,
  isAuthConfigured,
  loginAttemptIdentifier,
  makeSessionCookie,
  recordFailedLogin,
  validateLogin,
} from "@/lib/auth";

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
  const attemptId = loginAttemptIdentifier(request, username);
  const throttle = await checkLoginThrottle(attemptId);

  if (!throttle.allowed) {
    return Response.json(
      { error: throttle.message },
      { headers: { "Retry-After": String(throttle.retryAfterSeconds) }, status: 429 },
    );
  }

  if (!(await validateLogin(username, password))) {
    const failure = await recordFailedLogin(attemptId);
    if (!failure.allowed) {
      return Response.json(
        { error: failure.message },
        { headers: { "Retry-After": String(failure.retryAfterSeconds) }, status: 429 },
      );
    }

    return Response.json({ error: "Invalid username or password." }, { status: 401 });
  }

  await clearLoginThrottle(attemptId);
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
