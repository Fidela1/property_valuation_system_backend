import prisma from '../src/config/prisma';
import bcrypt from 'bcrypt';

async function seedAdmin() {
  console.log('🌱 Seeding database...');
  console.log('📊 Checking connection...');

  try {
    // Test database connection
    const userCount = await prisma.user.count();
    console.log(`📊 Current users in database: ${userCount}`);

    const adminEmail = "admin@example.com";
    const adminPassword = "Admin@123";

    console.log(`🔍 Looking for admin with email: ${adminEmail}`);

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('✅ Admin already exists:', existingAdmin.email);
      console.log('✅ Admin ID:', existingAdmin.id);
      console.log('✅ Admin Role:', existingAdmin.role);
      return;
    }

    console.log('📝 Admin not found. Creating new admin...');

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    console.log('✅ Password hashed');

    // Create admin user
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

    console.log('✅ Admin user created successfully!');
    console.log('   Email:', admin.email);
    console.log('   Role:', admin.role);
    console.log('   ID:', admin.id);

  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    throw error;
  }
}

// Make sure the function is called
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