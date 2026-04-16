import { removeSkill, updateSkill } from "../../../../../lib/db.js";
import { getAuthInfo } from "../../../../../lib/guard.js";

const VALID_LEVELS = ["Beginner", "Intermediate", "Advanced"];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export function DELETE(context: { request: Request; params: { id: string } }) {
  const auth = getAuthInfo(context.request);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return json({ error: "Invalid ID" }, 400);

  const deleted = removeSkill(id, auth.userId);
  if (!deleted) return json({ error: "Skill not found" }, 404);

  return json({ success: true });
}

export async function PATCH(context: { request: Request; params: { id: string } }) {
  const auth = getAuthInfo(context.request);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return json({ error: "Invalid ID" }, 400);

  let body: { name?: string; level?: string };
  try {
    body = await context.request.json() as typeof body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = body.name?.trim();
  const level = body.level ?? "Beginner";

  if (!name) return json({ error: "Skill name is required" }, 400);
  if (!VALID_LEVELS.includes(level)) return json({ error: "Invalid skill level" }, 400);

  const updated = updateSkill(id, auth.userId, name, level);
  if (!updated) return json({ error: "Skill not found" }, 404);

  return json({ id, user_id: auth.userId, name, level });
}
