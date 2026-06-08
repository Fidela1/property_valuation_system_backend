// src/scripts/createBankUser.ts
import prisma from '../config/prisma';
import bcrypt from 'bcrypt';

async function createBankUser() {
  const email = 'bk@example.com';
  const password = 'Test123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log('User already exists:', existingUser.email);
    return;
  }

  const bank = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Test Bank',
      phone: '+250780000000',
      role: 'FINACIAL_INSTITUTION',
      isActive: true,
      isEmailVerified: true // Bypass email verification
    }
  });

  console.log('Bank user created successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('User ID:', bank.id);
}

createBankUser()
  .catch(console.error)
  .finally(() => process.exit());