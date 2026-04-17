import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  authenticatedUser?: {
    id: string;
    email: string;
    role: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || '52257f096b9e118455b8d6e35042fdac50261d2cd8afc87244e1eea016e63323';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Unauthorized. Please login first.' 
      });
    }
    
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ 
        error: 'Invalid token format. Use: Bearer <your-token>' 
      });
    }
    
    const token = parts[1];

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    req.authenticatedUser = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
    
  } catch (error) {
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token. Please login again.' });
    }
    
    res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.authenticatedUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!allowedRoles.includes(req.authenticatedUser.role)) {
      return res.status(403).json({ 
        error: `Access denied. Requires role: ${allowedRoles.join(' or ')}` 
      });
    }
    
    next();
  };
};