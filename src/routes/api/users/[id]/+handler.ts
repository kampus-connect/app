import { deleteUser } from "../../../../lib/db.js";
import { requireAdmin } from "../../../../lib/guard.js";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export function DELETE(context: { request: Request; params: { id: string } }) {
  const auth = requireAdmin(context.request);
  if (auth instanceof Response) return auth;

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return json({ error: "Invalid ID" }, 400);

  const deleted = deleteUser(id);
  if (!deleted) return json({ error: "User not found" }, 404);

  return json({ success: true });
}
