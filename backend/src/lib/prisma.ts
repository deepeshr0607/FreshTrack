import { PrismaClient } from '@prisma/client';

// Reuse one client during development hot reload; never enable query/error payload logs.
const shared = globalThis as typeof globalThis & { freshTrackPrisma?: PrismaClient };
export const prisma = shared.freshTrackPrisma ?? new PrismaClient({ log: [], errorFormat: 'minimal' });
if (process.env['NODE_ENV'] !== 'production') shared.freshTrackPrisma = prisma;
