import { injectI18n } from "../../lib/i18n.js";

export function GET(context: Record<string, unknown>, next: () => Promise<Response>) {
  injectI18n(context);
  return next();
}
