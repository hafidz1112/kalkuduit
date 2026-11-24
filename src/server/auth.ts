import crypto from 'crypto';

/**
 * Hash a password using PBKDF2 (Node.js native, safe, zero node-gyp dependencies)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against stored salt:hash
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, originalHash] = stored.split(':');
    if (!salt || !originalHash) return false;
    const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch (e) {
    return false;
  }
}

/**
 * Generate a random session token / ID
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
