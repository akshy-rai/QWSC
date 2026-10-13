import 'server-only';
import { hash, verify } from '@node-rs/argon2';

/**
 * Hashes a plaintext password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Verifies a plaintext password against an Argon2id hash.
 * Returns true if valid, false otherwise (safe constant-time check).
 */
export async function verifyPassword(
  passwordHash: string,
  candidate: string
): Promise<boolean> {
  try {
    return await verify(passwordHash, candidate);
  } catch {
    return false;
  }
}
