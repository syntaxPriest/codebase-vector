import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readAndClearOAuthState, startSession } from "@/lib/auth/session";
import { getProvider } from "@/lib/auth/providers";
import { upsertUser } from "@/lib/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ provider: string }>;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { provider: key } = await params;
  const provider = getProvider(key);
  if (!provider) return new Response(`unknown provider · ${key}`, { status: 404 });
  if (!provider.isConfigured()) return new Response("not configured", { status: 503 });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = await readAndClearOAuthState();

  if (!code || !state || !expectedState || state !== expectedState) {
    return new Response("invalid oauth callback", { status: 400 });
  }

  const redirectUri = `${url.origin}/api/auth/${provider.key}/callback`;

  try {
    const { accessToken } = await provider.exchangeCode(code, redirectUri);
    const info = await provider.fetchUser(accessToken);
    const user = await upsertUser({
      provider: provider.key,
      providerId: info.providerId,
      email: info.email,
      name: info.name,
      avatarUrl: info.avatarUrl,
      githubToken: provider.key === "github" ? accessToken : undefined,
    });
    await startSession(user.id, provider.key);
    return NextResponse.redirect(new URL("/", url));
  } catch (e) {
    const message = e instanceof Error ? e.message : "auth failed";
    return new Response(message, { status: 502 });
  }
}
