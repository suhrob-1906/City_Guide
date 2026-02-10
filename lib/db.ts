import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Prevent crash if DATABASE_URL is missing or invalid
let prismaClient: PrismaClient;

try {
    prismaClient = globalForPrisma.prisma ?? new PrismaClient({
        log: ['error', 'warn'],
    });
} catch (e) {
    console.warn('Failed to initialize Prisma Client. Database features will be disabled.', e);
    // Create a dummy client or just let it fail later? 
    // Better to let it fail but catch it in usage.
    // However, new PrismaClient() usually doesn't connect immediately.
    prismaClient = new PrismaClient();
}

export const prisma = prismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
