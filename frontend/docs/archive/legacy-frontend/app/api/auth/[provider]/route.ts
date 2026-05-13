import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { newOAuthState, setOAuthState } from "@/lib/auth/session";
import { getProvider } from "@/lib/auth/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ provider: string }>;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { provider: key } = await params;
  const provider = getProvider(key);
  if (!provider) return new Response(`unknown provider · ${key}`, { status: 404 });
  if (!provider.isConfigured()) {
    return new Response(
      `${provider.key} oauth not configured · set ${provider.key.toUpperCase()}_CLIENT_ID and ${provider.key.toUpperCase()}_CLIENT_SECRET`,
      { status: 503 },
    );
  }

  const state = newOAuthState();
  await setOAuthState(state);

  const url = new URL(req.url);
  const redirectUri = `${url.origin}/api/auth/${provider.key}/callback`;
  return NextResponse.redirect(provider.authorizeUrl(state, redirectUri));
}
