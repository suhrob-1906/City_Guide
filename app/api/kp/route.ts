import { NextResponse } from 'next/server';
import { fetchKpIndex } from '@/lib/fetchers/noaa';
import { cache } from '@/lib/cache';
import { prisma } from '@/lib/db';

const TTL = 1800; // 30 minutes

export async function GET() {
    const startTime = Date.now();
    const cacheKey = 'kp:global';

    try {
        const cached = await cache.get(cacheKey);
        if (cached) {
            await logApi('kp', 'noaa', 200, Date.now() - startTime, true);
            return NextResponse.json(cached);
        }

        const data = await fetchKpIndex();
        await cache.set(cacheKey, data, TTL);
        await logApi('kp', 'noaa', 200, Date.now() - startTime, false);

        return NextResponse.json(data);
    } catch (error: any) {
        await logApi('kp', 'noaa', 500, Date.now() - startTime, false);

        const stale = await cache.get(cacheKey);
        if (stale) {
            return NextResponse.json({ ...stale, stale: true });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function logApi(endpoint: string, provider: string, status: number, latency: number, cached: boolean) {
    try {
        // Skip logging during build time or if explicitly disabled
        if (process.env.NEXT_PHASE === 'phase-production-build') return;

        prisma.apiLog.create({
            data: { endpoint, provider, status, latencyMs: latency, cached },
        }).catch(() => {
            // Silently fail if DB is offline
        });
    } catch (e) {
        // Ignore initiation errors
    }
}
