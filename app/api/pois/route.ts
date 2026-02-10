import { NextRequest, NextResponse } from 'next/server';
import { getCityBySlug } from '@/config/cities';
import { POI_LAYERS } from '@/config/layers';
import { fetchPois } from '@/lib/fetchers/overpass';
import { cache } from '@/lib/cache';
import { poiRateLimiter } from '@/lib/rateLimit';
import { prisma } from '@/lib/db';

const TTL = 86400; // 24 hours

export async function GET(req: NextRequest) {
    const startTime = Date.now();
    const city = req.nextUrl.searchParams.get('city');
    const type = req.nextUrl.searchParams.get('type');
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Rate limit
    const { success } = await poiRateLimiter.check(ip);
    if (!success) {
        return NextResponse.json({ error: 'Rate limit exceeded. Please wait.' }, { status: 429 });
    }

    if (!city || !type) {
        return NextResponse.json({ error: 'City and type parameters required' }, { status: 400 });
    }

    const cityData = getCityBySlug(city);
    const layer = POI_LAYERS.find((l) => l.id === type);

    if (!cityData || !layer) {
        return NextResponse.json({ error: 'Invalid city or type' }, { status: 404 });
    }

    const cacheKey = `pois:${city}:${type}`;

    try {
        const cached = await cache.get(cacheKey);
        // Force refresh for debugging
        if (cached && false) {
            await logApi('pois', 'overpass', 200, Date.now() - startTime, true);
            return NextResponse.json(cached);
        }

        const data = await fetchPois(cityData.bbox, layer.overpassQuery);
        await cache.set(cacheKey, data, TTL);
        await logApi('pois', 'overpass', 200, Date.now() - startTime, false);

        return NextResponse.json(data);
    } catch (error: any) {
        await logApi('pois', 'overpass', 500, Date.now() - startTime, false);

        const stale = await cache.get(cacheKey);
        if (stale) {
            return NextResponse.json({ ...stale, stale: true });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function logApi(endpoint: string, provider: string, status: number, latency: number, cached: boolean) {
    try {
        await prisma.apiLog.create({
            data: { endpoint, provider, status, latencyMs: latency, cached },
        });
    } catch (e) {
        console.error('Failed to log API call:', e);
    }
}
