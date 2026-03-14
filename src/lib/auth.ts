import jwt from 'jsonwebtoken';
import { Response } from 'express';

export interface JwtPayload {
  userId: string;
  orgId: string;
  role: string;
  name: string;
  email: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,          // true in prod (HTTPS), false in local dev (HTTP)
    sameSite: 'none' as const,     // ✅ 'as const' fixes TypeScript type inference
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };

  console.log('Setting auth cookie | production:', isProduction, '| origin:', res.req?.headers?.origin);
  res.cookie('auth_token', token, cookieOptions);
}

export function clearAuthCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: isProduction,          // ✅ Must match exactly what was set
    sameSite: 'none' as const,
    path: '/',
  });
}