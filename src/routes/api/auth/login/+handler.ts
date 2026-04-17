import { getUserForAuth, createSession } from "../../../../lib/db.js";
import { verifyPassword, sessionCookie } from "../../../../lib/auth.js";

const json = (data: unknown, status = 200, headers?: Record<string, string>) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

export async function POST(context: { request: Request }) {
  let body: { email?: string; password?: string };

  try {
    body = await context.request.json() as typeof body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.email?.trim() || !body.password) {
    return json({ error: "Email and password are required" }, 400);
  }

  const user = getUserForAuth(body.email.trim());
  if (!user || !verifyPassword(body.password, user.password_hash)) {
    // Same message for both cases to avoid user enumeration
    return json({ error: "Invalid email or password" }, 401);
  }

  const token = createSession(user.id);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
}
