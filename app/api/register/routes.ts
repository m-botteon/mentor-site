import { hashPassword, json, Env } from "../../lib/auth";

type RegisterBody = {
	email?: string;
	password?: string;
	displayName?: string;
};

type Ctx = {
  request: Request;
  env: Env;
};

export async function POST({ request, env }: Ctx) {
  const body = (await request.json()) as RegisterBody;

  if (!body?.email || !body?.password) {
    return json({ error: "email and password are required" }, { status: 400 });
  }

  const email = String(body.email).toLowerCase().trim();
  const password = String(body.password);
  const displayName = body.displayName ? String(body.displayName).trim() : null;

  if (password.length < 8) {
    return json({ error: "password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();

  if (existing) {
    return json({ error: "email already exists" }, { status: 409 });
  }

  const userId = crypto.randomUUID();
  const now = Date.now();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, role, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(userId, email, passwordHash, "user", displayName, now, now)
    .run();

  return json({ ok: true, userId }, { status: 201 });
}