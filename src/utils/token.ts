import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || "secret"

export const generateToken = (id: string, email: string, role: string) => {
  return jwt.sign(
    { id, email, role },  // ← Changed from 'userId' to 'id'
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};