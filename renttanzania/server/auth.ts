import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';
import type { User } from '../src/types/index.ts';
import firebaseConfig from '../firebase-applet-config.json';

// ============================================================================
// Passwords (scrypt, per-user salt). Hashes live in db credentials, never on User.
// ============================================================================
const SCRYPT_KEYLEN = 64;
export const MIN_PASSWORD_LENGTH = 8;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Spend the same scrypt time when the account does not exist, so login timing
// does not reveal which emails/phones are registered
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString('hex'));
export function burnPasswordCheck(password: string): void {
  verifyPassword(password, DUMMY_HASH);
}

// ============================================================================
// Sessions: random token in an httpOnly cookie; only its SHA-256 is stored
// ============================================================================
export const SESSION_COOKIE = 'rentz_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

export function startSession(res: Response, user: User): void {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  db.createSession({
    tokenHash: hashToken(token),
    userId: user.id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function endSession(req: Request, res: Response): void {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) db.deleteSession(hashToken(token));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

// Resolves the signed-in user for every API request. The user record is read fresh
// from the database, so role or verification changes apply immediately.
export function attachSessionUser(req: Request, res: Response, next: NextFunction): void {
  res.locals.sessionUser = null;
  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    const session = db.getSession(hashToken(token));
    if (session && new Date(session.expiresAt).getTime() > Date.now()) {
      res.locals.sessionUser = db.getUserById(session.userId) || null;
    } else if (session) {
      db.deleteSession(session.tokenHash);
    }
  }
  next();
}

export function getSessionUser(res: Response): User | null {
  return (res.locals.sessionUser as User | null) || null;
}

// ============================================================================
// Login throttling: 5 failed attempts per account per 15 minutes
// ============================================================================
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; firstAt: number }>();

export function isLockedOut(key: string): boolean {
  const entry = failedAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > LOCKOUT_MS) {
    failedAttempts.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

export function recordFailedLogin(key: string): void {
  const entry = failedAttempts.get(key);
  if (!entry || Date.now() - entry.firstAt > LOCKOUT_MS) {
    failedAttempts.set(key, { count: 1, firstAt: Date.now() });
  } else {
    entry.count++;
  }
}

export function clearFailedLogins(key: string): void {
  failedAttempts.delete(key);
}

// ============================================================================
// Firebase (Google sign-in) ID token verification, without the Admin SDK.
// https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
// ============================================================================
const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getFirebaseCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) return certCache.certs;
  const res = await fetch(FIREBASE_CERTS_URL);
  if (!res.ok) throw new Error('Could not fetch Google signing certificates');
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1] || 3600);
  const certs = (await res.json()) as Record<string, string>;
  certCache = { certs, expiresAt: Date.now() + maxAge * 1000 };
  return certs;
}

export interface FirebaseIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdentity> {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('Malformed ID token');
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unexpected token algorithm');
  const cert = (await getFirebaseCerts())[header.kid];
  if (!cert) throw new Error('Unknown token signing key');

  const signatureValid = crypto
    .createVerify('RSA-SHA256')
    .update(`${headerB64}.${payloadB64}`)
    .verify(crypto.createPublicKey(cert), Buffer.from(signatureB64, 'base64url'));
  if (!signatureValid) throw new Error('Invalid token signature');

  const projectId = firebaseConfig.projectId;
  const nowSec = Math.floor(Date.now() / 1000);
  const CLOCK_SKEW_SEC = 60;
  if (payload.aud !== projectId) throw new Error('Token was issued for another project');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Unexpected token issuer');
  if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_SEC < nowSec) throw new Error('Token has expired');
  if (typeof payload.iat !== 'number' || payload.iat - CLOCK_SKEW_SEC > nowSec) throw new Error('Token issued in the future');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Token has no subject');

  return {
    uid: payload.sub,
    email: String(payload.email || '').trim().toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: payload.name,
    picture: payload.picture,
  };
}

// ============================================================================
// Identifier helpers
// ============================================================================
export function normalizeEmail(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

// Tanzanian numbers are compared as 255XXXXXXXXX regardless of how they were typed
export function normalizePhone(value?: string | null): string {
  let digits = String(value || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('0') && digits.length === 10) digits = `255${digits.slice(1)}`;
  return digits;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
