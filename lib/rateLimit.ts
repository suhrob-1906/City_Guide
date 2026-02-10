import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimiter {
    check(identifier: string): Promise<{ success: boolean; remaining: number }>;
}

class UpstashRateLimiter implements RateLimiter {
    private limiter: Ratelimit;

    constructor(requests: number, window: string) {
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
        // Ensure window is in correct format for Upstash (e.g., "10 s" or "10s")
        const formattedWindow = window.includes(' ') ? window : window.replace(/(\d+)/, '$1 ');
        this.limiter = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(requests, formattedWindow as any),
        });
    }

    async check(identifier: string) {
        const result = await this.limiter.limit(identifier);
        return { success: result.success, remaining: result.remaining };
    }
}

class InMemoryRateLimiter implements RateLimiter {
    private requests = new Map<string, number[]>();
    private maxRequests: number;
    private windowMs: number;

    constructor(requests: number, windowSeconds: number) {
        this.maxRequests = requests;
        this.windowMs = windowSeconds * 1000;
    }

    async check(identifier: string) {
        const now = Date.now();
        const timestamps = this.requests.get(identifier) || [];
        const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

        if (validTimestamps.length >= this.maxRequests) {
            return { success: false, remaining: 0 };
        }

        validTimestamps.push(now);
        this.requests.set(identifier, validTimestamps);
        return { success: true, remaining: this.maxRequests - validTimestamps.length };
    }
}

function createRateLimiter(requests: number, window: string): RateLimiter {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        return new UpstashRateLimiter(requests, window);
    }
    const windowSeconds = window.endsWith('s') ? parseInt(window) : 10;
    return new InMemoryRateLimiter(requests, windowSeconds);
}

// Increased limits for development - change to 1 for production
export const poiRateLimiter = createRateLimiter(10, '10s');
export const airRateLimiter = createRateLimiter(10, '10s');
