import { getAllUsers, createUser } from "../../../lib/db.js";
import { requireAdmin } from "../../../lib/guard.js";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function GET(context: { request: Request }) {
  const auth = requireAdmin(context.request);
  if (auth instanceof Response) return auth;
  return json(getAllUsers());
}

export async function POST(context: { request: Request }) {
  const auth = requireAdmin(context.request);
  if (auth instanceof Response) return auth;

  let body: { name?: string; email?: string; skills?: { name: string; learning?: boolean; learning_note?: string; teaching?: boolean; teaching_note?: string; doing?: boolean; doing_note?: string }[] };
  try {
    body = await context.request.json() as typeof body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.name?.trim()) return json({ error: "Name is required" }, 400);
  if (!body.email?.trim()) return json({ error: "Email is required" }, 400);

  try {
    const user = createUser(body.name.trim(), body.email.trim(), body.skills ?? []);
    return json(user, 201);
  } catch (err: unknown) {
    const msg =
      err instanceof Error && err.message.includes("UNIQUE constraint")
        ? "A user with that email already exists"
        : "Failed to create user";
    return json({ error: msg }, 400);
  }
}
