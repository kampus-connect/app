import pl from "./i18n/pl.json";
import en from "./i18n/en.json";
import { parseCookies } from "./auth.js";

type Msgs = Record<string, Record<string, string>>;

const bundles: Record<string, Msgs> = { pl, en };

export const SUPPORTED_LANGS = ["pl", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export function getLang(cookies: Record<string, string>): Lang {
  const c = cookies["kc-lang"];
  return (SUPPORTED_LANGS as readonly string[]).includes(c ?? "") ? (c as Lang) : "pl";
}

/** Injects `locale` (string) and `translations` (plain JSON) into the handler context. */
export function injectI18n(context: Record<string, unknown>): void {
  const cookies = parseCookies(context["request"] as Request);
  const lang = getLang(cookies);
  context["locale"] = lang;
  context["translations"] = bundles[lang] ?? bundles["pl"];
}
