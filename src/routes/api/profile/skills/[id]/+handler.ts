import { removeSkill, updateSkill } from "../../../../../lib/db.js";
import { getAuthInfo } from "../../../../../lib/guard.js";

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
  if (!deleted) return json({ error: "Activity not found" }, 404);

  return json({ success: true });
}

export async function PATCH(context: { request: Request; params: { id: string } }) {
  const auth = getAuthInfo(context.request);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return json({ error: "Invalid ID" }, 400);

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

  const options = {
    learning: !!body.learning,
    learning_note: body.learning_note ?? "",
    teaching: !!body.teaching,
    teaching_note: body.teaching_note ?? "",
    doing: !!body.doing,
    doing_note: body.doing_note ?? "",
  };

  const updated = updateSkill(id, auth.userId, name, options);
  if (!updated) return json({ error: "Activity not found" }, 404);

  return json({ id, user_id: auth.userId, name, ...options });
}
