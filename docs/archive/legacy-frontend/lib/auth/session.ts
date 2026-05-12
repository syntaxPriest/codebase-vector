// Cookie helpers + the session-aware "current user" lookup.
// The session cookie holds an opaque session id; the actual user
// record lives in the file store.

import { cookies } from "next/headers";
import crypto from "crypto";
import {
  createSession as storeCreateSession,
  deleteSession as storeDeleteSession,
  getSessionWithUser,
  type AuthProvider,
  type User,
} from "./store";

const SESSION_COOKIE = "cv_session";
const STATE_COOKIE = "cv_oauth_state";

interface CookieOpts {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  maxAge: number;
}

function cookieOpts(maxAge: number): CookieOpts {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

export async function startSession(userId: string, provider: AuthProvider): Promise<void> {
  const session = await storeCreateSession(userId, provider);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, session.id, cookieOpts(60 * 60 * 24 * 30));
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  jar.delete(SESSION_COOKIE);
  if (id) await storeDeleteSession(id);
}

export interface CurrentUserCtx {
  user: User;
  provider: AuthProvider;
}

export async function currentUser(): Promise<CurrentUserCtx | null> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const found = await getSessionWithUser(id);
  if (!found) return null;
  return { user: found.user, provider: found.session.provider };
}

// GitHub access token from the signed-in user. Null if not signed in
// via GitHub. Used by ingestion routes that need to call the GitHub
// API on the user's behalf for private repos / higher rate limits.
export async function getGithubToken(): Promise<string | null> {
  const ctx = await currentUser();
  return ctx?.user.githubToken ?? null;
}

export function newOAuthState(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function setOAuthState(state: string): Promise<void> {
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, cookieOpts(600));
}

export async function readAndClearOAuthState(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(STATE_COOKIE)?.value ?? null;
  jar.delete(STATE_COOKIE);
  return value;
}
