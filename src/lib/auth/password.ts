import "server-only";
import { hash, verify } from "@node-rs/argon2";

// @node-rs/argon2 defaults to argon2id with safe parameters.
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

let dummyHash: Promise<string> | undefined;

/** Verifies a password; when the user doesn't exist, still burns a hash so timing is similar. */
export async function verifyPassword(stored: string | null, password: string): Promise<boolean> {
  if (!stored) {
    dummyHash ??= hash("dummy-password-for-timing");
    await verify(await dummyHash, password).catch(() => false);
    return false;
  }
  return verify(stored, password).catch(() => false);
}
