import { joinInitiative, leaveInitiative } from "../../../../../lib/db.js";
import { getAuthInfo } from "../../../../../lib/guard.js";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export function POST(context: { request: Request; params: { id: string } }) {
  const auth = getAuthInfo(context.request);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return json({ error: "Invalid ID" }, 400);

  const result = joinInitiative(id, auth.userId);
  if (!result) return json({ error: "Initiative not found or already closed" }, 404);

  return json(result.initiative);
}

export function DELETE(context: { request: Request; params: { id: string } }) {
  const auth = getAuthInfo(context.request);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return json({ error: "Invalid ID" }, 400);

  const ok = leaveInitiative(id, auth.userId);
  if (!ok) return json({ error: "Not a participant or initiative is closed" }, 400);

  return json({ success: true });
}
