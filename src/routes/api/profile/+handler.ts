import { getUserForAuth, updateUser } from "../../../lib/db.js";
import { getAuthInfo } from "../../../lib/guard.js";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function PATCH(context: { request: Request }) {
  const auth = getAuthInfo(context.request);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  let body: { name?: string; email?: string };
  try {
    body = await context.request.json() as typeof body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const updates: { name?: string; email?: string } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return json({ error: "Name cannot be empty" }, 400);
    updates.name = name;
  }

  if (body.email !== undefined) {
    const email = body.email.trim();
    if (!email) return json({ error: "Email cannot be empty" }, 400);
    const existing = getUserForAuth(email);
    if (existing && existing.id !== auth.userId) {
      return json({ error: "Email already in use" }, 400);
    }
    updates.email = email;
  }

  const user = updateUser(auth.userId, updates);
  if (!user) return json({ error: "User not found" }, 404);

  return json({ name: user.name, email: user.email });
}
