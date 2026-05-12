// Idempotent demo-account seeder.
// Used by the login route so the documented dummy credentials always
// just work, even on a freshly-cloned repo with an empty store.

import { createEmailUser, findUserByEmail, type User } from "./store";
import { hashPassword } from "./password";

export const DEMO_EMAIL = "demo@codebase.dev";
export const DEMO_PASSWORD = "password123";
export const DEMO_NAME = "Demo User";

export async function ensureDemoUser(): Promise<User> {
  const existing = await findUserByEmail(DEMO_EMAIL);
  if (existing) return existing;
  return createEmailUser({
    email: DEMO_EMAIL,
    name: DEMO_NAME,
    passwordHash: hashPassword(DEMO_PASSWORD),
  });
}
