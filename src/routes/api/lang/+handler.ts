import { SUPPORTED_LANGS } from "../../../lib/i18n.js";

export async function POST(context: Record<string, unknown>) {
  const request = context["request"] as Request;
  let lang = "pl";
  try {
    const body = await request.json();
    if ((SUPPORTED_LANGS as readonly string[]).includes(body?.lang)) lang = body.lang;
  } catch { /* invalid body — use default */ }

  const maxAge = 60 * 60 * 24 * 365; // 1 year
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `kc-lang=${lang}; Path=/; Max-Age=${maxAge}; SameSite=Lax`,
    },
  });
}
