import { getActiveInitiatives, createInitiative } from "../../../lib/db.js";
import { getAuthInfo } from "../../../lib/guard.js";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export function GET(context: { request: Request }) {
  const auth = getAuthInfo(context.request);
  if (!auth) return json({ error: "Unauthorized" }, 401);
  return json(getActiveInitiatives(auth.userId));
}

export async function POST(context: { request: Request }) {
  const auth = getAuthInfo(context.request);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  let body: { title?: string; description?: string; max_users?: number; skills?: string[] };
  try {
    body = await context.request.json() as typeof body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const title = body.title?.trim();
  const description = body.description?.trim();
  const maxUsers = Number(body.max_users);
  const skills = body.skills ?? [];

  if (!title) return json({ error: "Title is required" }, 400);
  if (!description) return json({ error: "Description is required" }, 400);
  if (!Number.isInteger(maxUsers) || maxUsers < 2 || maxUsers > 100)
    return json({ error: "Max participants must be between 2 and 100" }, 400);

  const initiative = createInitiative(title, description, maxUsers, auth.userId, skills);
  return json(initiative, 201);
}
