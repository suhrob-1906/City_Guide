import { Redis } from '@upstash/redis';
import { prisma } from './db';

interface CacheAdapter {
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttlSeconds: number): Promise<void>;
}

class InMemoryCache implements CacheAdapter {
    private cache = new Map<string, { value: any; expires: number }>();

    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return null;
        }
        return entry.value as T;
    }

    async set(key: string, value: any, ttlSeconds: number): Promise<void> {
        this.cache.set(key, {
            value,
            expires: Date.now() + ttlSeconds * 1000,
        });
    }
}

class UpstashCache implements CacheAdapter {
    private redis: Redis;

    constructor() {
        this.redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
    }

    async get<T>(key: string): Promise<T | null> {
        return await this.redis.get<T>(key);
    }

    async set(key: string, value: any, ttlSeconds: number): Promise<void> {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    }
}

class PostgresCache implements CacheAdapter {
    async get<T>(key: string): Promise<T | null> {
        const entry = await prisma.cacheEntry.findUnique({ where: { key } });
        if (!entry || entry.expiresAt < new Date()) return null;
        return JSON.parse(entry.valueJson) as T;
    }

    async set(key: string, value: any, ttlSeconds: number): Promise<void> {
        await prisma.cacheEntry.upsert({
            where: { key },
            create: {
                key,
                valueJson: JSON.stringify(value),
                expiresAt: new Date(Date.now() + ttlSeconds * 1000),
            },
            update: {
                valueJson: JSON.stringify(value),
                expiresAt: new Date(Date.now() + ttlSeconds * 1000),
            },
        });
    }
}

function createCache(): CacheAdapter {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.log('✓ Using Upstash Redis cache');
        return new UpstashCache();
    }
    console.log('⚠ Using in-memory cache (data will be lost on restart)');
    return new InMemoryCache();
}

export const cache = createCache();
