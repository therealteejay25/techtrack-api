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
  
  console.log('=== AUTH MIDDLEWARE DEBUG ===');
  console.log('Request URL:', req.url);
  console.log('Request Origin:', req.get('Origin'));
  console.log('All Cookies:', req.cookies);
  console.log('Auth Token:', token ? 'Present' : 'Missing');
  console.log('User-Agent:', req.get('User-Agent'));
  console.log('==============================');

  if (!token) {
    console.log('Auth failed: No token provided');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const payload = verifyToken(token);

  if (!payload) {
    console.log('Auth failed: Invalid token');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  console.log('Auth success for user:', payload.email);
  req.user = payload;
  next();
}
