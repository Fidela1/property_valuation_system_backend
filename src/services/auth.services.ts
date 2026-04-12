import prisma from '../config/prisma';
import { hashedPassword, comparePassword } from '../utils/hash'
import { AppError } from '../utils/AppError';

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

// Regular email/password login (using your comparePassword)
export const loginWithEmail = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // ✅ Use your comparePassword function
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