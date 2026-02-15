import { NextRequest, NextResponse } from 'next/server';
import { getCityBySlug } from '@/config/cities';
import { fetchWeather } from '@/lib/fetchers/openmeteo';
import { cache } from '@/lib/cache';
import { prisma } from '@/lib/db';

const TTL = 600; // 10 minutes

export async function GET(req: NextRequest) {
    const startTime = Date.now();
    const city = req.nextUrl.searchParams.get('city');

    if (!city) {
        return NextResponse.json({ error: 'City parameter required' }, { status: 400 });
    }

    const cityData = getCityBySlug(city);
    if (!cityData) {
        return NextResponse.json({ error: 'Invalid city' }, { status: 404 });
    }

    const cacheKey = `weather:${city}`;

    try {
        // Check cache
        const cached = await cache.get(cacheKey);
        if (cached) {
            await logApi('weather', 'open-meteo', 200, Date.now() - startTime, true);
            return NextResponse.json(cached);
        }

        // Fetch fresh data
        const data = await fetchWeather(cityData.lat, cityData.lon);
        await cache.set(cacheKey, data, TTL);
        await logApi('weather', 'open-meteo', 200, Date.now() - startTime, false);

        return NextResponse.json(data);
    } catch (error: any) {
        await logApi('weather', 'open-meteo', 500, Date.now() - startTime, false);

        // Try to return stale cache
        const stale = await cache.get(cacheKey);
        if (stale) {
            return NextResponse.json({ ...stale, stale: true });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function logApi(endpoint: string, provider: string, status: number, latency: number, cached: boolean) {
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') return;

        // Fire and forget - do not await
        prisma.apiLog.create({
            data: { endpoint, provider, status, latencyMs: latency, cached },
        }).catch(() => {
            // Silently fail if DB is offline - do not spam logs
        });
    } catch (e) {
        // Ignore initiation errors
    }
}
