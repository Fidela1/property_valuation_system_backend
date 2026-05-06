import prisma from '../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';


export const verifyInvitationToken = async (token: string) => {
  const invitation = await prisma.invitation.findUnique({
    where: { token }
  });
  
  if (!invitation) {
    throw new AppError('Invalid invitation link', 400);
  }
  
  if (invitation.status !== 'PENDING') {
    throw new AppError(`Invitation has been ${invitation.status.toLowerCase()}`, 400);
  }
  
  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'EXPIRED' }
    });
    throw new AppError('Invitation link has expired. Please contact admin.', 400);
  }
  
  return {
    id: invitation.id,
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    token: invitation.token
  };
};

export const acceptInvitation = async (token: string, password: string, phone?: string) => {

  const verified = await verifyInvitationToken(token);
  
  const existingUser = await prisma.user.findUnique({
    where: { email: verified.email }
  });
  
  if (existingUser) {
    throw new AppError('User already exists with this email', 400);
  }
 
  if (!password || password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      name: verified.name,
      email: verified.email,
      phone: phone || null,
      password: hashedPassword,
      role: verified.role,
      isActive: true,
      isEmailVerified: true
    }
  });
  
  await prisma.invitation.update({
    where: { id: verified.id },
    data: { status:'COMPLETED' as any }  ,
  });
  
  const authToken = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  const { password: _, ...userWithoutPassword } = newUser;
  
  return {
    user: userWithoutPassword,
    token: authToken
  };
};

