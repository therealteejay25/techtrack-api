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
  res.cookie('auth_token', token, {
  httpOnly: true,
  secure: true, // MUST be true for sameSite: 'none'
  sameSite: 'none' as const, 
  maxAge: 7 * 24 * 60 * 60 * 1000
});
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie('auth_token');
}
