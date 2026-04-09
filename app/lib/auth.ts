export type Role = "admin" | "staff" | "user";

export type User = {
  id: string;
  email: string;
  role: Role;
  display_name: string | null;
};

export type Env = {
  DB: D1Database;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function json(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, init);
}

export function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(";").map((p) => p.trim());
  const match = parts.find((part) => part.startsWith(`${name}=`));
  if (!match) return null;

  return decodeURIComponent(match.slice(name.length + 1));
}

export function makeCookie(
  name: string,
  value: string,
  options: {
    maxAgeSeconds?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Lax" | "Strict" | "None";
    path?: string;
  } = {}
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.maxAgeSeconds !== undefined) parts.push(`Max-Age=${options.maxAgeSeconds}`);
  if (options.httpOnly ?? true) parts.push("HttpOnly");
  if (options.secure ?? true) parts.push("Secure");
  parts.push(`SameSite=${options.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

export function clearSessionCookie(isSecure = true): string {
  return makeCookie("session", "", {
    maxAgeSeconds: 0,
    secure: isSecure,
    httpOnly: true,
    sameSite: "Lax",
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 210000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return `${bytesToBase64(salt)}:${bytesToBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltB64, hashB64] = storedHash.split(":");
  if (!saltB64 || !hashB64) return false;

  const salt = base64ToBytes(saltB64);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 210000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return bytesToBase64(new Uint8Array(bits)) === hashB64;
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(bytes);
}

export async function requireSession(env: Env, request: Request): Promise<User | null> {
  const token = getCookie(request, "session");
  if (!token) return null;

  const session = await env.DB.prepare(
    "SELECT token, user_id, expires_at FROM sessions WHERE token = ?"
  )
    .bind(token)
    .first<{ token: string; user_id: string; expires_at: number }>();

  if (!session) return null;
  if (Number(session.expires_at) <= Date.now()) return null;

  const user = await env.DB.prepare(
    "SELECT id, email, role, display_name FROM users WHERE id = ?"
  )
    .bind(session.user_id)
    .first<User>();

  return user ?? null;
}

export async function requireRole(
  env: Env,
  request: Request,
  allowed: Role[]
): Promise<User | null> {
  const user = await requireSession(env, request);
  if (!user) return null;
  if (!allowed.includes(user.role)) return null;
  return user;
}