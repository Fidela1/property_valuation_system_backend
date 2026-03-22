// src/config/prisma.ts
// ────────────────────────────────────────────────
// Load .env FIRST – before anything else uses process.env
import "dotenv/config";   // ← This line loads .env automatically

import { PrismaClient } from '../generated/client';  // adjust path as needed
import { PrismaPg } from '@prisma/adapter-pg';

// Optional: Log to confirm it's loaded (remove later)
console.log('Loaded DATABASE_URL:', process.env.DATABASE_URL ? 'Yes' : 'No – missing!');

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

  prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
}

export default prisma;