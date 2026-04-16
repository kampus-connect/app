import { getUserPasswordHash, updatePassword } from "../../../../lib/db.js";
import { verifyPassword, hashPassword } from "../../../../lib/auth.js";
import { getAuthInfo } from "../../../../lib/guard.js";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(context: { request: Request }) {
  const auth = getAuthInfo(context.request);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await context.request.json() as typeof body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.currentPassword) return json({ error: "Current password is required" }, 400);
  if (!body.newPassword) return json({ error: "New password is required" }, 400);
  if (body.newPassword.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);

  const stored = getUserPasswordHash(auth.userId);
  if (!stored) return json({ error: "User not found" }, 404);

  if (!verifyPassword(body.currentPassword, stored)) {
    return json({ error: "Current password is incorrect" }, 400);
  }

  updatePassword(auth.userId, hashPassword(body.newPassword));
  return json({ success: true });
}
