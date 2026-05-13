// OAuth provider abstraction. Add a new entry to PROVIDERS and the
// auth routes pick it up automatically.

import type { AuthProvider } from "./store";

export interface UserInfo {
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string;
}

export interface ProviderImpl {
  key: AuthProvider;
  isConfigured(): boolean;
  authorizeUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<{ accessToken: string }>;
  fetchUser(accessToken: string): Promise<UserInfo>;
}

// ── GitHub ────────────────────────────────────────────────────────
const github: ProviderImpl = {
  key: "github",
  isConfigured: () => !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  authorizeUrl(state, redirectUri) {
    const u = new URL("https://github.com/login/oauth/authorize");
    u.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("scope", "repo read:user user:email");
    u.searchParams.set("state", state);
    u.searchParams.set("allow_signup", "true");
    return u.toString();
  },
  async exchangeCode(code, redirectUri) {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "codebase-vector",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) throw new Error(`github token exchange · ${res.status}`);
    const data = await res.json();
    if (!data.access_token) {
      throw new Error(`github token exchange · ${data.error_description ?? data.error ?? "no token"}`);
    }
    return { accessToken: data.access_token as string };
  },
  async fetchUser(token) {
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "User-Agent": "codebase-vector",
    };
    const res = await fetch("https://api.github.com/user", { headers });
    if (!res.ok) throw new Error(`github user fetch · ${res.status}`);
    const u = await res.json();

    let email: string | null = u.email ?? null;
    if (!email) {
      try {
        const er = await fetch("https://api.github.com/user/emails", { headers });
        if (er.ok) {
          const list = (await er.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
          email = list.find((e) => e.primary)?.email ?? list.find((e) => e.verified)?.email ?? list[0]?.email ?? null;
        }
      } catch {}
    }

    return {
      providerId: String(u.id),
      email: email ?? "",
      name: typeof u.name === "string" && u.name ? u.name : String(u.login ?? ""),
      avatarUrl: typeof u.avatar_url === "string" ? u.avatar_url : "",
    };
  },
};

// ── Google ────────────────────────────────────────────────────────
const google: ProviderImpl = {
  key: "google",
  isConfigured: () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  authorizeUrl(state, redirectUri) {
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
    u.searchParams.set("redirect_uri", redirectUri);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "openid email profile");
    u.searchParams.set("state", state);
    u.searchParams.set("access_type", "online");
    u.searchParams.set("prompt", "select_account");
    return u.toString();
  },
  async exchangeCode(code, redirectUri) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`google token exchange · ${res.status} · ${body.slice(0, 160)}`);
    }
    const data = await res.json();
    if (!data.access_token) throw new Error("google token exchange · no token");
    return { accessToken: data.access_token as string };
  },
  async fetchUser(token) {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`google user fetch · ${res.status}`);
    const u = await res.json();
    return {
      providerId: String(u.sub),
      email: typeof u.email === "string" ? u.email : "",
      name: typeof u.name === "string" ? u.name : "",
      avatarUrl: typeof u.picture === "string" ? u.picture : "",
    };
  },
};

type OAuthKey = "github" | "google";

const PROVIDERS: Record<OAuthKey, ProviderImpl> = { github, google };

export function getProvider(key: string): ProviderImpl | null {
  return key === "github" || key === "google" ? PROVIDERS[key] : null;
}

// "email" is always available — it doesn't depend on env vars.
// OAuth providers only show up when their credentials are configured.
export function configuredProviders(): AuthProvider[] {
  const oauth: AuthProvider[] = (["github", "google"] as OAuthKey[]).filter(
    (k) => PROVIDERS[k].isConfigured(),
  );
  return ["email", ...oauth];
}
