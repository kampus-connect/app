import { getUserForAuth, registerUser, createSession } from "../../../../lib/db.js";
import { hashPassword, sessionCookie } from "../../../../lib/auth.js";

const json = (data: unknown, status = 200, headers?: Record<string, string>) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

export async function POST(context: { request: Request }) {
  let body: {
    name?: string;
    email?: string;
    password?: string;
    skills?: { name: string; level: string }[];
  };

  try {
    body = await context.request.json() as typeof body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.name?.trim()) return json({ error: "Name is required" }, 400);
  if (!body.email?.trim()) return json({ error: "Email is required" }, 400);
  if (!body.password || body.password.length < 6)
    return json({ error: "Password must be at least 6 characters" }, 400);

  if (getUserForAuth(body.email.trim())) {
    return json({ error: "An account with that email already exists" }, 400);
  }

  try {
    const passwordHash = hashPassword(body.password);
    const user = registerUser(body.name.trim(), body.email.trim(), passwordHash, body.skills ?? []);
    const token = createSession(user.id);

    return json({ id: user.id }, 201, { "Set-Cookie": sessionCookie(token) });
  } catch {
    return json({ error: "Failed to create account" }, 500);
  }
}
