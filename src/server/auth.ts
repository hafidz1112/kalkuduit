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

export interface GoogleTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

interface GoogleJwk {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
}

let cachedGoogleCerts: { keys: GoogleJwk[]; expiresAt: number } | null = null;

async function fetchGoogleJwks(forceRefresh = false): Promise<GoogleJwk[]> {
  if (!forceRefresh && cachedGoogleCerts && cachedGoogleCerts.expiresAt > Date.now()) {
    return cachedGoogleCerts.keys;
  }

  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!res.ok) {
    throw new Error('Gagal mengambil kunci verifikasi Google.');
  }

  const data = (await res.json()) as { keys?: GoogleJwk[] };
  const keys = Array.isArray(data.keys) ? data.keys : [];

  let maxAgeSec = 3600;
  const cacheControl = res.headers.get('cache-control');
  const match = cacheControl?.match(/max-age=(\d+)/i);
  if (match) {
    maxAgeSec = Math.max(60, Number(match[1]) || 3600);
  }

  cachedGoogleCerts = {
    keys,
    expiresAt: Date.now() + maxAgeSec * 1000,
  };

  return keys;
}

/**
 * Verify a Google Identity Services ID Token (RS256) against Google's JWKS
 */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedClientId: string
): Promise<GoogleTokenPayload> {
  if (!expectedClientId) {
    throw new Error('GOOGLE_CLIENT_ID belum dikonfigurasi di server.');
  }

  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Format token Google tidak valid.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string };
  let payload: Record<string, any>;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8'));
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
  } catch {
    throw new Error('Token Google tidak dapat didekode.');
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Algoritma atau key ID token Google tidak valid.');
  }

  let keys = await fetchGoogleJwks(false);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await fetchGoogleJwks(true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) {
    throw new Error('Kunci publik Google tidak ditemukan untuk token ini.');
  }

  const publicKey = crypto.createPublicKey({ key: jwk as any, format: 'jwk' });
  const isSignatureValid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${headerB64}.${payloadB64}`),
    publicKey,
    Buffer.from(signatureB64, 'base64url')
  );

  if (!isSignatureValid) {
    throw new Error('Tanda tangan token Google tidak valid.');
  }

  const validIssuers = ['https://accounts.google.com', 'accounts.google.com'];
  if (!validIssuers.includes(String(payload.iss || ''))) {
    throw new Error('Issuer token Google tidak valid.');
  }

  if (payload.aud !== expectedClientId) {
    throw new Error('Client ID token Google tidak sesuai dengan konfigurasi aplikasi.');
  }

  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now() - 30_000) {
    throw new Error('Sesi login Google sudah kedaluwarsa. Silakan coba lagi.');
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email || payload.email_verified !== true) {
    throw new Error('Email Google belum terverifikasi.');
  }

  const fallbackName = email.split('@')[0] || 'Pengguna';
  return {
    sub: String(payload.sub || ''),
    email,
    email_verified: true,
    name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : fallbackName,
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
  };
}
