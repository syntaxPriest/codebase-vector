import type { NextRequest } from "next/server";
import { startSession } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/store";
import { verifyPassword, isValidEmail } from "@/lib/auth/password";
import { DEMO_EMAIL, DEMO_PASSWORD, ensureDemoUser } from "@/lib/auth/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LoginBody {
  email?: string;
  password?: string;
}

const INVALID = "invalid email or password";

export async function POST(req: NextRequest) {
  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!isValidEmail(email) || !password) {
    return Response.json({ error: INVALID }, { status: 401 });
  }

  // Make the documented demo credentials work on a fresh checkout.
  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    await ensureDemoUser();
  }

  const user = await findUserByEmail(email);
  if (!user || !user.passwordHash) {
    return Response.json({ error: INVALID }, { status: 401 });
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return Response.json({ error: INVALID }, { status: 401 });
  }

  await startSession(user.id, "email");
  return Response.json({
    ok: true,
    user: {
      id: user.id,
      provider: "email" as const,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  });
}
