// backend/src/utils/seedAdmin.ts

import prisma from '../config/prisma';
import { hashedPassword } from './hash';

export const seedAdmin = async () => {
  try {
    const adminEmail = "admin@propertyval.com";
    const adminPassword = "Admin@123";  

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      return existingAdmin;
    }

    const hashed = await hashedPassword(adminPassword);

    const admin = await prisma.user.create({
      data: {
        name: "System Admin",
        email: adminEmail,
        password: hashed,
        phone: "+250788888888",
        role: "ADMIN"          
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    return admin;

  } catch (error) {
    console.error("Error seeding admin:", error);
    throw error;
  }
};