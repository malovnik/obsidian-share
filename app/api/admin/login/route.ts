import { NextRequest, NextResponse } from 'next/server';
import {
  verifyCredentials,
  createSessionToken,
  getSessionCookieOptions,
  getClearCookieOptions,
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
} from '@/lib/auth/admin';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте позже.' },
      { status: 429 }
    );
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Введите логин и пароль' },
        { status: 400 }
      );
    }

    if (!verifyCredentials(username, password)) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { error: 'Неверные данные' },
        { status: 401 }
      );
    }

    clearAttempts(ip);
    const token = createSessionToken();
    const cookie = getSessionCookieOptions(token);

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookie);
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  const cookie = getClearCookieOptions();
  response.cookies.set(cookie);
  return response;
}
