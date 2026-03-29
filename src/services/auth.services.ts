import prisma from '../config/prisma';
import { hashedPassword, comparePassword } from '../utils/hash'
import { AppError } from '../utils/AppError';

export const createUser = async (name: string, email: string, phone: string, password: string) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AppError("User already exists", 400);
  }

  const hashed = await hashedPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashed
    },
  });

  return user;
};

