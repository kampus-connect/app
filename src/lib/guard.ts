import { parseCookies } from "./auth.js";
import { getSession, hasRole } from "./db.js";

export interface AuthInfo {
  userId: number;
  isAdmin: boolean;
}

const jsonErr = (msg: string, status: number) =>
  new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Returns auth info for a valid session, or null. */
export function getAuthInfo(request: Request): AuthInfo | null {
  const token = parseCookies(request)["session"] ?? "";
  const session = getSession(token);
  if (!session) return null;
  return { userId: session.user_id, isAdmin: hasRole(session.user_id, "admin") };
}

/** Returns AuthInfo or a 401/403 Response. Use with `instanceof Response` check. */
export function requireAdmin(request: Request): AuthInfo | Response {
  const auth = getAuthInfo(request);
  if (!auth) return jsonErr("Unauthorized", 401);
  if (!auth.isAdmin) return jsonErr("Forbidden", 403);
  return auth;
}
