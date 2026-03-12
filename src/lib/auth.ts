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
    secure: isHttps, // Only secure in HTTPS environments
    sameSite: isHttps ? 'none' : 'lax', // Use 'none' for cross-origin HTTPS, 'lax' for same-origin
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/' // Ensure cookie is available for all paths
  } as const;
  
  console.log('Setting auth cookie with options:', cookieOptions); // Debug logging
  
  res.cookie('auth_token', token, cookieOptions);
}

export function clearAuthCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = process.env.HTTPS === 'true' || isProduction;
  
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/'
  });
}
