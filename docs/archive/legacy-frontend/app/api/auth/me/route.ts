import { currentUser } from "@/lib/auth/session";
import { configuredProviders } from "@/lib/auth/providers";
import type { AuthMe } from "@/lib/codebase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await currentUser();
  const providers = configuredProviders();
  const body: AuthMe = ctx
    ? {
        user: {
          id: ctx.user.id,
          provider: ctx.provider,
          email: ctx.user.email,
          name: ctx.user.name,
          avatarUrl: ctx.user.avatarUrl,
        },
        providers,
        githubAccess: !!ctx.user.githubToken,
      }
    : {
        user: null,
        providers,
        githubAccess: false,
      };
  return Response.json(body);
}
