// src/config/prisma.ts
// ────────────────────────────────────────────────
// Load .env FIRST – before anything else uses process.env
import "dotenv/config";   // ← This line loads .env automatically

import { PrismaClient } from '../generated/client';  // adjust path as needed
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
    // No SSL needed for local Postgres usually
  });

  prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
}

export default prisma;