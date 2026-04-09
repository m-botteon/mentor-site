import { json, requireSession, Env } from "../../lib/auth";

type Ctx = {
  request: Request;
  env: Env;
};

export async function GET({ request, env }: Ctx) {
  const user = await requireSession(env, request);

  if (!user) {
    return json({ error: "not logged in" }, { status: 401 });
  }

  return json({ user });
}

export async function POST({ request, env }: Ctx) {
  const user = await requireSession(env, request);

  if (!user) {
    return json({ error: "not logged in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const displayName =
    body?.displayName === undefined ? undefined : String(body.displayName).trim();

  if (displayName !== undefined && displayName.length > 100) {
    return json({ error: "displayName is too long" }, { status: 400 });
  }

  await env.DB.prepare(
    "UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?"
  )
    .bind(displayName ?? null, Date.now(), user.id)
    .run();

  return json({ ok: true });
}