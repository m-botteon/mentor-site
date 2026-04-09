import {
  json,
  makeCookie,
  randomToken,
  verifyPassword,
  Env,
} from "../../lib/auth";

type RegisterBody = {
	email?: string;
    password?: string;
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

  const user = await env.DB.prepare(
    "SELECT id, email, password_hash, role, display_name FROM users WHERE email = ?"
  )
    .bind(email)
    .first<{
      id: string;
      email: string;
      password_hash: string;
      role: "admin" | "staff" | "user";
      display_name: string | null;
    }>();

  if (!user) {
    return json({ error: "invalid email or password" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return json({ error: "invalid email or password" }, { status: 401 });
  }

  const token = randomToken();
  const createdAt = Date.now();
  const expiresAt = createdAt + 1000 * 60 * 60 * 24 * 7;

  await env.DB.prepare(
    "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
  )
    .bind(token, user.id, expiresAt, createdAt)
    .run();

  const secure = request.url.startsWith("https://");
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    makeCookie("session", token, {
      maxAgeSeconds: 60 * 60 * 24 * 7,
      secure,
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
    })
  );

  return json(
    {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        display_name: user.display_name,
      },
    },
    { headers }
  );
}