import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || '52257f096b9e118455b8d6e35042fdac50261d2cd8afc87244e1eea016e63323';

// Middleware to check if user is logged in
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
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

    req.user = {
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
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Requires role: ${allowedRoles.join(' or ')}` 
      });
    }
    
    next();
  };
};