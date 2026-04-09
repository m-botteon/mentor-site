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