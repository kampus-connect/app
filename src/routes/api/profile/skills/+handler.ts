import { addSkill } from "../../../../lib/db.js";
import { getAuthInfo } from "../../../../lib/guard.js";

const VALID_LEVELS = ["Beginner", "Intermediate", "Advanced"];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(context: { request: Request }) {
  const auth = getAuthInfo(context.request);
  if (!auth) return json({ error: "Unauthorized" }, 401);

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

  const skill = addSkill(auth.userId, name, level);
  return json(skill, 201);
}
