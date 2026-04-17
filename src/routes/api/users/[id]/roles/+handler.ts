import { addRole, removeRole, getUserById } from "../../../../../lib/db.js";
import { requireAdmin } from "../../../../../lib/guard.js";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function PATCH(context: { request: Request; params: { id: string } }) {
  const auth = requireAdmin(context.request);
  if (auth instanceof Response) return auth;

  const id = parseInt(context.params.id, 10);
  if (isNaN(id)) return json({ error: "Invalid ID" }, 400);

  const user = getUserById(id);
  if (!user) return json({ error: "User not found" }, 404);

  const body = await context.request.json() as { action?: string; role?: string };
  if (!["admin", "standard"].includes(body.role ?? "")) return json({ error: "Invalid role" }, 400);
  if (!["add", "remove"].includes(body.action ?? "")) return json({ error: "Invalid action" }, 400);

  // Prevent an admin from removing their own admin role
  if (body.action === "remove" && body.role === "admin" && id === auth.userId) {
    return json({ error: "You cannot remove your own admin role" }, 400);
  }

  if (body.action === "add") {
    addRole(id, body.role!);
  } else {
    removeRole(id, body.role!);
  }

  return json({ ok: true, user: getUserById(id) });
}
