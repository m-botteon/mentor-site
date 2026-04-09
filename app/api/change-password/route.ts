import { hashPassword, json, requireSession, verifyPassword, Env } from "../../lib/auth";

type RegisterBody = {
	currentPassword?: string;
    newPassword?: string;
};

type Ctx = {
  request: Request;
  env: Env;
};

export async function POST({ request, env }: Ctx) {
  const user = await requireSession(env, request);

  if (!user) {
    return json({ error: "not logged in" }, { status: 401 });
  }

  const body = (await request.json()) as RegisterBody;

  if (!body?.currentPassword || !body?.newPassword) {
    return json(
      { error: "currentPassword and newPassword are required" },
      { status: 400 }
    );
  }

  const currentPassword = String(body.currentPassword);
  const newPassword = String(body.newPassword);

  if (newPassword.length < 8) {
    return json({ error: "new password must be at least 8 characters" }, { status: 400 });
  }

  const row = await env.DB.prepare(
    "SELECT password_hash FROM users WHERE id = ?"
  )
    .bind(user.id)
    .first<{ password_hash: string }>();

  if (!row) {
    return json({ error: "user not found" }, { status: 404 });
  }

  const ok = await verifyPassword(currentPassword, row.password_hash);
  if (!ok) {
    return json({ error: "current password is incorrect" }, { status: 401 });
  }

  const newHash = await hashPassword(newPassword);

  await env.DB.prepare(
    "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?"
  )
    .bind(newHash, Date.now(), user.id)
    .run();

  return json({ ok: true });
}