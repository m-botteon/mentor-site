import { clearSessionCookie, getCookie, json, Env } from "../../lib/auth";

type Ctx = {
  request: Request;
  env: Env;
};

export async function POST({ request, env }: Ctx) {
  const token = getCookie(request, "session");
  const secure = request.url.startsWith("https://");

  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?")
      .bind(token)
      .run();
  }

  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookie(secure));

  return json({ ok: true }, { headers });
}