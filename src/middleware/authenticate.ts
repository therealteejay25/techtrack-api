import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/auth';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.auth_token;
  
  console.log('Auth middleware - Cookies:', req.cookies); // Debug logging
  console.log('Auth middleware - Token:', token ? 'Present' : 'Missing'); // Debug logging

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const payload = verifyToken(token);

  if (!payload) {
    console.log('Auth middleware - Invalid token'); // Debug logging
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  console.log('Auth middleware - Success for user:', payload.email); // Debug logging
  req.user = payload;
  next();
}
