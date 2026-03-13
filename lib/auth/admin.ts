import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = '__admin_session';
const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000;

function getSecret(): Buffer {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD not configured');
  return crypto.createHash('sha256').update(password).digest();
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) return false;

  const usernameHash = crypto.createHash('sha256').update(username).digest();
  const expectedUsernameHash = crypto.createHash('sha256').update(expectedUsername).digest();
  const passwordHash = crypto.createHash('sha256').update(password).digest();
  const expectedPasswordHash = crypto.createHash('sha256').update(expectedPassword).digest();

  const usernameMatch = crypto.timingSafeEqual(usernameHash, expectedUsernameHash);
  const passwordMatch = crypto.timingSafeEqual(passwordHash, expectedPasswordHash);

  return usernameMatch && passwordMatch;
}

export function createSessionToken(): string {
  const timestamp = Date.now().toString();
  const secret = getSecret();
  const signature = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
  return `${timestamp}.${signature}`;
}

export function verifySessionToken(token: string): boolean {
  try {
    const [timestamp, signature] = token.split('.');
    if (!timestamp || !signature) return false;

    const age = Date.now() - parseInt(timestamp);
    if (isNaN(age) || age < 0 || age > TOKEN_MAX_AGE) return false;

    const secret = getSecret();
    const expected = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    return verifySessionToken(token);
  } catch {
    return false;
  }
}

export function getSessionCookieOptions(token: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 24 * 60 * 60,
  };
}

export function getClearCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  };
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000;

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && now < record.resetAt && record.count >= MAX_ATTEMPTS) {
    return false;
  }

  if (record && now >= record.resetAt) {
    loginAttempts.delete(ip);
  }

  return true;
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && now < record.resetAt) {
    record.count++;
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + BLOCK_DURATION });
  }
}

export function clearAttempts(ip: string): void {
  loginAttempts.delete(ip);
}
