import { addSkill } from "../../../../lib/db.js";
import { getAuthInfo } from "../../../../lib/guard.js";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function POST(context: { request: Request }) {
  const auth = getAuthInfo(context.request);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  let body: {
    name?: string;
    learning?: boolean;
    learning_note?: string;
    teaching?: boolean;
    teaching_note?: string;
    doing?: boolean;
    doing_note?: string;
  };
  try {
    body = await context.request.json() as typeof body;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = body.name?.trim();
  if (!name) return json({ error: "Activity name is required" }, 400);

  const skill = addSkill(auth.userId, name, {
    learning: !!body.learning,
    learning_note: body.learning_note ?? "",
    teaching: !!body.teaching,
    teaching_note: body.teaching_note ?? "",
    doing: !!body.doing,
    doing_note: body.doing_note ?? "",
  });
  return json(skill, 201);
}
