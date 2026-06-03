import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyApiToken } from '../services/apiTokens';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

/**
 * Allow both JWT (browser session) and API tokens (sync client).
 */
export async function authenticateAny(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  // Try API token first (cheaper, no jwt verify)
  if (token.startsWith('ft_')) {
    const result = await verifyApiToken(token);
    if (result) {
      const db = (await import('../database/connection')).default;
      const user = await db('users').where({ id: result.userId }).first();
      if (user) {
        req.user = { id: user.id, email: user.email, role: user.role };
        next();
        return;
      }
    }
    res.status(401).json({ error: 'API token inválido' });
    return;
  }

  // Fallback to JWT
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' });
    return;
  }
  next();
}
