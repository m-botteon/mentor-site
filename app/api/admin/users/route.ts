import { json, requireRole, Env } from "../../../lib/auth";

type Ctx = {
  request: Request;
  env: Env;
};

export async function GET({ request, env }: Ctx) {
  const user = await requireRole(env, request, ["admin"]);

  if (!user) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const users = await env.DB.prepare(
    "SELECT id, email, role, display_name, created_at FROM users"
  ).all();

  return json({ users: users.results ?? [] });
}

export async function PATCH({ request, env }: Ctx) {
  const user = await requireRole(env, request, ["admin"]);

  if (!user) {
    return json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.userId || !body?.role) {
    return json({ error: "userId and role required" }, { status: 400 });
  }

  const role = String(body.role);

  if (!["admin", "staff", "user"].includes(role)) {
    return json({ error: "invalid role" }, { status: 400 });
  }

  await env.DB.prepare(
    "UPDATE users SET role = ? WHERE id = ?"
  )
    .bind(role, String(body.userId))
    .run();

  return json({ ok: true });
}