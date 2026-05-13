// File-backed user + session store.
//
// This is intentionally simple: two JSON files under .cache/auth, an
// in-process promise chain for serializing writes, and a 30-day
// session expiry with lazy garbage-collection on every new session.
//
// On a serverless host (Vercel) the filesystem is ephemeral, so this
// won't persist across deploys. Production swap-out: a real KV /
// Postgres / Redis. The store API below is small enough to port.

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type AuthProvider = "github" | "google" | "email";

export interface User {
  id: string;
  provider: AuthProvider;
  /** Provider-side ID. For email accounts, equal to the lowercased email. */
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string;
  /** GitHub access token, set only when the session was created via GitHub. */
  githubToken?: string;
  /** Scrypt password hash, set only for email/password accounts. */
  passwordHash?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Session {
  id: string;
  userId: string;
  provider: AuthProvider;
  expiresAt: number;
  createdAt: number;
}

export interface UpsertUserInput {
  provider: AuthProvider;
  providerId: string;
  email: string;
  name: string;
  avatarUrl: string;
  githubToken?: string;
  passwordHash?: string;
}

export interface CreateEmailUserInput {
  email: string;
  name: string;
  passwordHash: string;
  avatarUrl?: string;
}

const AUTH_DIR = path.join(process.cwd(), ".cache", "auth");
const USERS_FILE = path.join(AUTH_DIR, "users.json");
const SESSIONS_FILE = path.join(AUTH_DIR, "sessions.json");

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function randomId(): string {
  return crypto.randomBytes(24).toString("hex");
}

// ── Single-process write serialization ────────────────────────────
let writeChain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  writeChain = next.catch(() => undefined);
  return next;
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

// ── Users ─────────────────────────────────────────────────────────
export async function findUser(provider: AuthProvider, providerId: string): Promise<User | null> {
  const users = await readJson<User[]>(USERS_FILE, []);
  return users.find((u) => u.provider === provider && u.providerId === providerId) ?? null;
}

export async function getUser(id: string): Promise<User | null> {
  const users = await readJson<User[]>(USERS_FILE, []);
  return users.find((u) => u.id === id) ?? null;
}

export async function upsertUser(input: UpsertUserInput): Promise<User> {
  return withLock(async () => {
    const users = await readJson<User[]>(USERS_FILE, []);
    const idx = users.findIndex(
      (u) => u.provider === input.provider && u.providerId === input.providerId,
    );
    const now = Date.now();
    if (idx >= 0) {
      const merged: User = {
        ...users[idx],
        email: input.email,
        name: input.name,
        avatarUrl: input.avatarUrl,
        githubToken: input.provider === "github" ? input.githubToken : users[idx].githubToken,
        passwordHash: input.passwordHash ?? users[idx].passwordHash,
        updatedAt: now,
      };
      users[idx] = merged;
      await writeJson(USERS_FILE, users);
      return merged;
    }
    const user: User = {
      id: randomId(),
      provider: input.provider,
      providerId: input.providerId,
      email: input.email,
      name: input.name,
      avatarUrl: input.avatarUrl,
      githubToken: input.provider === "github" ? input.githubToken : undefined,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    users.push(user);
    await writeJson(USERS_FILE, users);
    return user;
  });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const target = email.toLowerCase();
  const users = await readJson<User[]>(USERS_FILE, []);
  return (
    users.find((u) => u.provider === "email" && u.providerId === target) ?? null
  );
}

export async function createEmailUser(input: CreateEmailUserInput): Promise<User> {
  const email = input.email.toLowerCase();
  return upsertUser({
    provider: "email",
    providerId: email,
    email,
    name: input.name || email.split("@")[0] || "user",
    avatarUrl: input.avatarUrl ?? "",
    passwordHash: input.passwordHash,
  });
}

// ── Sessions ──────────────────────────────────────────────────────
export async function createSession(userId: string, provider: AuthProvider): Promise<Session> {
  return withLock(async () => {
    const sessions = await readJson<Session[]>(SESSIONS_FILE, []);
    const now = Date.now();
    const session: Session = {
      id: randomId(),
      userId,
      provider,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    };
    const fresh = sessions.filter((s) => s.expiresAt > now);
    fresh.push(session);
    await writeJson(SESSIONS_FILE, fresh);
    return session;
  });
}

export async function getSessionWithUser(sessionId: string): Promise<{ session: Session; user: User } | null> {
  const sessions = await readJson<Session[]>(SESSIONS_FILE, []);
  const session = sessions.find((s) => s.id === sessionId);
  if (!session || session.expiresAt < Date.now()) return null;
  const user = await getUser(session.userId);
  if (!user) return null;
  return { session, user };
}

export async function deleteSession(sessionId: string): Promise<void> {
  return withLock(async () => {
    const sessions = await readJson<Session[]>(SESSIONS_FILE, []);
    const fresh = sessions.filter((s) => s.id !== sessionId);
    await writeJson(SESSIONS_FILE, fresh);
  });
}
