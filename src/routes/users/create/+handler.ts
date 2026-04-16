import { requireAdmin } from "../../../lib/guard.js";
import { injectI18n } from "../../../lib/i18n.js";

export function GET(context: { request: Request } & Record<string, unknown>, next: () => Promise<Response>) {
  injectI18n(context);
  const auth = requireAdmin(context.request);
  if (auth instanceof Response) return Response.redirect("/dashboard", 302);
  return next();
}
