import { deleteSession } from "../../../../lib/db.js";
import { parseCookies, clearSessionCookie } from "../../../../lib/auth.js";

export function POST(context: { request: Request }) {
  const cookies = parseCookies(context.request);
  if (cookies["session"]) deleteSession(cookies["session"]);

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearSessionCookie(),
    },
  });
}
