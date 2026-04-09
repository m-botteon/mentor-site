import { json, requireSession, Env } from "../../../lib/auth";

type Ctx = {
  request: Request;
  env: Env;
};

export async function GET({ request, env }: Ctx) {
  const user = await requireSession(env, request);

  if (!user) {
    return json({ error: "not logged in" }, { status: 401 });
  }

  const notes = await env.DB.prepare(
    "SELECT id, note, created_at FROM profile_notes WHERE user_id = ? ORDER BY created_at DESC"
  )
    .bind(user.id)
    .all();

  return json({ notes: notes.results ?? [] });
}

export async function POST({ request, env }: Ctx) {
  const user = await requireSession(env, request);

  if (!user) {
    return json({ error: "not logged in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  if (!body?.note) {
    return json({ error: "note is required" }, { status: 400 });
  }

  const note = String(body.note).trim();
  if (!note) {
    return json({ error: "note is required" }, { status: 400 });
  }

  const noteId = crypto.randomUUID();

  await env.DB.prepare(
    "INSERT INTO profile_notes (id, user_id, note, created_at) VALUES (?, ?, ?, ?)"
  )
    .bind(noteId, user.id, note, Date.now())
    .run();

  return json({ ok: true, noteId }, { status: 201 });
}