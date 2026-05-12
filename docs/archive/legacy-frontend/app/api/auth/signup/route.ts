import type { NextRequest } from "next/server";
import { startSession } from "@/lib/auth/session";
import { createEmailUser, findUserByEmail } from "@/lib/auth/store";
import { hashPassword, isValidEmail, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SignupBody {
  email?: string;
  password?: string;
  name?: string;
}

export async function POST(req: NextRequest) {
  let body: SignupBody;
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim();

  if (!isValidEmail(email)) {
    return Response.json({ error: "enter a valid email" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return Response.json(
      { error: `password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 },
    );
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return Response.json({ error: "email already registered" }, { status: 409 });
  }

  const user = await createEmailUser({
    email,
    name: name || email.split("@")[0] || "user",
    passwordHash: hashPassword(password),
  });
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
