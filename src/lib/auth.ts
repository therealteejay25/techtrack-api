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
  const isHttps = process.env.HTTPS === 'true' || isProduction;
  
  const cookieOptions = {
    httpOnly: true,
    secure: isHttps, // Must be true for HTTPS
    sameSite: 'none' as const, // Required for cross-domain cookies in production
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/', // Ensure cookie is available for all paths
    domain: undefined // Let browser handle domain automatically
  };
  
  console.log('Setting auth cookie with options:', cookieOptions); // Debug logging
  console.log('Environment - Production:', isProduction, 'HTTPS:', isHttps);
  
  res.cookie('auth_token', token, cookieOptions);
}

export function clearAuthCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = process.env.HTTPS === 'true' || isProduction;
  
  const cookieOptions = {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'none' as const,
    path: '/',
    domain: undefined
  };
  
  res.clearCookie('auth_token', cookieOptions);
}
