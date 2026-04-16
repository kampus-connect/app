import { getSession, getUserById } from "../lib/db.js";
import { parseCookies } from "../lib/auth.js";

export function GET(context: Record<string, unknown>, next: () => Promise<Response>) {
  const cookies = parseCookies(context["request"] as Request);
  const session = getSession(cookies["session"] ?? "");
  if (session && getUserById(session.user_id)) {
    const request = context["request"] as Request;
    const url = new URL("/dashboard", request.url);
    return Response.redirect(url, 302);
  }
  return next();
}
