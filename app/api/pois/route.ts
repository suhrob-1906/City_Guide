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

    // Rate limit (with fallback)
    try {
        const { success } = await poiRateLimiter.check(ip);
        if (!success) {
            return NextResponse.json({ error: 'Rate limit exceeded. Please wait.' }, { status: 429 });
        }
    } catch (rateLimitError) {
        console.warn('[POI API] Rate limiter failed, proceeding without rate limit:', rateLimitError);
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
        // Try to get from cache (non-blocking) - SKIP for scooters to show mock data
        let cached = null;
        if (type !== 'scooters') {
            try {
                cached = await cache.get(cacheKey);
                if (cached) {
                    console.log('[POI API] Cache hit');
                    await logApi('pois', 'overpass', 200, Date.now() - startTime, true);
                    return NextResponse.json(cached);
                }
            } catch (cacheError) {
                console.warn('[POI API] Cache get failed:', cacheError);
            }
        }

        // Fetch fresh data
        console.log('[POI API] Fetching from Overpass API...');
        const data = await fetchPois(cityData.bbox, layer.overpassQuery);

        // Try to cache (non-blocking)
        try {
            await cache.set(cacheKey, data, TTL);
            console.log('[POI API] Data cached successfully');
        } catch (cacheError) {
            console.warn('[POI API] Cache set failed:', cacheError);
        }

        if (type === 'scooters' && data.features.length === 0) {
            console.log('[POI API] No real scooters found, injecting mock data for demo...');
            const centerLat = cityData.lat;
            const centerLon = cityData.lon;

            // Generate 15 random scooters around city center
            for (let i = 0; i < 15; i++) {
                // Random offset within ~1km
                const latOffset = (Math.random() - 0.5) * 0.02;
                const lonOffset = (Math.random() - 0.5) * 0.02;

                data.features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [centerLon + lonOffset, centerLat + latOffset]
                    },
                    properties: {
                        id: `mock-scooter-${i}`,
                        name: `Jet Scooter #${1000 + i}`,
                        type: 'scooters',
                        tags: { amenity: 'bicycle_rental', operator: 'Jet' }
                    }
                });
            }
        }

        await logApi('pois', 'overpass', 200, Date.now() - startTime, false);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[POI API] Error:', error.message, error.stack);
        await logApi('pois', 'overpass', 500, Date.now() - startTime, false);

        // Try stale cache as fallback
        try {
            const stale = await cache.get(cacheKey);
            if (stale) {
                console.log('[POI API] Returning stale cache due to error');
                return NextResponse.json({ ...stale, stale: true });
            }
        } catch (staleCacheError) {
            console.warn('[POI API] Stale cache retrieval failed:', staleCacheError);
        }

        return NextResponse.json({
            error: 'Failed to fetch POI data',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}

async function logApi(endpoint: string, provider: string, status: number, latency: number, cached: boolean) {
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') return;

        // Fire and forget, don't await to avoid slowing down response
        prisma.apiLog.create({
            data: { endpoint, provider, status, latencyMs: latency, cached },
        }).catch((e) => {
            // Silently fail if DB is offline
            console.warn('[POI API] Failed to log API call (DB offline)');
        });
    } catch (e) {
        // Completely ignore any logging errors
        console.warn('[POI API] Logging system unavailable');
    }
}
