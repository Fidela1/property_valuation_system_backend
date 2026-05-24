import prisma from '../config/prisma';
import { hashedPassword, comparePassword } from '../utils/hash';
import { AppError } from '../utils/AppError';
import { sendPasswordResetEmail } from '../config/email';
import crypto from 'crypto';

export const createUser = async (name: string, email: string, phone: string, password: string) => {
  const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim()} });
  const existingPhone = await prisma.user.findFirst({ where: { phone } })

  if (existingUser) {
     throw new AppError('Email already exists', 400);
  }

  if(existingPhone){
    throw new AppError('Phone number already exists', 400);
  }

  const hashed = await hashedPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      phone,
      password: hashed
    },
    
  });

  return user;
};

export const userLogin = async (email: string, password: string) => {
  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  });
  
  if (!user) {
    throw new Error("User doesn't exist");
  }

   if (!user.isActive) {
    throw new Error('Your account has been deactivated. Please contact administrator.');
  }
  
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // Return user without password
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

export const handleGoogleAuthService = async (user: any) => {
  
  return {
    success: true,
    message: 'Google authentication successful',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    }
  };
};

export const loginWithEmail = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isValidPassword = await comparePassword(password, user.password);
  
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  return {
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      }
    }
  };
};

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  });
  
  if (!user) {
    // For security, don't reveal that the user doesn't exist
    return { success: true, message: 'If an account exists, you will receive a reset email' };
  }
  
  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  // Save token to database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires
    }
  });
  
  // Send email
  await sendPasswordResetEmail(user.email, resetToken, user.name);
  
  return { success: true, message: 'Password reset email sent' };
};

export const resetPassword = async (token: string, newPassword: string,) => {
  // Find user with valid token
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: {
        gt: new Date()
      }
    }
  });
  
  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }
  
  if (!newPassword || newPassword.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }
  
  const hashed = await hashedPassword(newPassword);
  
  // Update user and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      passwordResetToken: null,
      passwordResetExpires: null
    }
  });
  
  return { success: true, message: 'Password reset successfully' };
};

export const verifyResetToken = async (token: string) => {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: {
        gt: new Date()
      }
    },
    select: {
      id: true,
      email: true,
      name: true
    }
  });
  
  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }
  
  return { valid: true, email: user.email, name: user.name };
};