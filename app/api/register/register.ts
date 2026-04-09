// functions/api/register.ts
import { json } from "../../src/lib/auth";

export async function onRequestPost({ request, env }: any) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return json({ error: "email and password are required" }, { status: 400 });
  }

  const email = String(body.email).toLowerCase().trim();
  const password = String(body.password);

  const existing = await env.DB.prepare(
    "SELECT id FROM users WHERE email = ?"
  )
    .bind(email)
    .first();

  if (existing) {
    return json({ error: "email already exists" }, { status: 409 });
  }

  // Replace this with your chosen password hashing method.
  // Workers support Web Crypto and a subset of Node.js APIs. :contentReference[oaicite:1]{index=1}
  const passwordHash = `HASH_ME:${password}`;

  const userId = crypto.randomUUID();
  const now = Date.now();

  await env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(userId, email, passwordHash, "user", now)
    .run();

  return json({ ok: true, userId }, { status: 201 });
}