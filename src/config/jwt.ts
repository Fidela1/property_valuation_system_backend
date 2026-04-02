import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '52257f096b9e118455b8d6e35042fdac50261d2cd8afc87244e1eea016e63323';
const JWT_EXPIRES_IN = '7d'; 

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};