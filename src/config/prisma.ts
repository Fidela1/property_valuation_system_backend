import "dotenv/config";   

import { PrismaClient } from '../generated/client'; 
import { PrismaPg } from '@prisma/adapter-pg';


const globalForPrisma = global as unknown as { prisma?: PrismaClient };

let prisma: PrismaClient;

if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma;
} else {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in .env');
  }

  const adapter = new PrismaPg({
    connectionString,
    
  });

  prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
}

export default prisma;