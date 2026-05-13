import prisma from '../src/config/prisma';
import bcrypt from 'bcrypt';

async function seedAdmin() {

  try {
    
    const userCount = await prisma.user.count();

    const adminEmail = "admin@example.com";
    const adminPassword = "Admin@123";

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
      data: {
        name: "System Admin",
        email: adminEmail,
        password: hashedPassword,
        phone: "+250788888888",
        role: "ADMIN",
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });


  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    throw error;
  }
}

seedAdmin()
  .then(() => {
    console.log('🎉 Seeding completed!');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });