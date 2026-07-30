import {
  passwordPolicyError,
  requireAuthenticatedRequest,
  updateStoredPassword,
  validateCurrentPassword,
} from "@/lib/auth";

type PasswordPayload = {
  currentPassword?: unknown;
  newPassword?: unknown;
};

export async function POST(request: Request) {
  const unauthorized = await requireAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  const payload = (await request.json()) as PasswordPayload;
  const currentPassword =
    typeof payload.currentPassword === "string" ? payload.currentPassword : "";
  const newPassword = typeof payload.newPassword === "string" ? payload.newPassword : "";
  const policyError = passwordPolicyError(newPassword);

  if (policyError) {
    return Response.json({ error: policyError }, { status: 400 });
  }

  if (!(await validateCurrentPassword(currentPassword))) {
    return Response.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  try {
    await updateStoredPassword(newPassword);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to update password." },
      { status: 500 },
    );
  }
}
