import { getActiveInitiatives, getAllSkillNames, getSession, getUserById } from "../../lib/db.js";
import { parseCookies } from "../../lib/auth.js";
import { injectI18n } from "../../lib/i18n.js";

export function GET(context: Record<string, unknown>, next: () => Promise<Response>) {
  injectI18n(context);

  const cookies = parseCookies(context["request"] as Request);
  const session = getSession(cookies["session"] ?? "");

  if (!session) return Response.redirect("/login", 302);

  const currentUser = getUserById(session.user_id);
  if (!currentUser) return Response.redirect("/login", 302);

  context["currentUser"] = currentUser;
  context["initiatives"] = getActiveInitiatives(session.user_id);
  context["allSkillNames"] = getAllSkillNames();
  context["currentUserId"] = session.user_id;

  return next();
}
