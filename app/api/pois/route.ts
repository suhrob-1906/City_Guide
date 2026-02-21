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
    const refresh = req.nextUrl.searchParams.get('refresh') === 'true';

    try {
        // Try to get from cache (non-blocking) - SKIP for scooters to show mock data or if refresh requested
        let cached = null;
        if (type !== 'scooters' && !refresh) {
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
        } else if (refresh) {
            console.log('[POI API] Cache refresh requested');
        }

        // Fetch fresh data
        console.log('[POI API] Fetching from Overpass API...');
        const data = await fetchPois(cityData.bbox, layer.overpassQuery);

        // Generate mock data if there are very few results to ensure they are visible "all over the city"
        if (data.features.length < 30) {
            console.log(`[POI API] Not enough real ${type} found, injecting mock data to fill the city...`);
            const mockCount = 30 - data.features.length;

            // Calculate bbox width/height for scattering
            const lonMin = cityData.bbox[0];
            const latMin = cityData.bbox[1];
            const lonMax = cityData.bbox[2];
            const latMax = cityData.bbox[3];

            for (let i = 0; i < mockCount; i++) {
                // Random position within the city's bounding box
                const randomLon = lonMin + Math.random() * (lonMax - lonMin);
                const randomLat = latMin + Math.random() * (latMax - latMin);

                let namePrefix = layer.name;
                if (type === 'scooters') {
                    const brands = ['Yandex Go', 'Whoosh', 'Urent', 'Jet'];
                    namePrefix = brands[Math.floor(Math.random() * brands.length)];
                }

                data.features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [randomLon, randomLat]
                    },
                    properties: {
                        id: `mock-${type}-${i}`,
                        name: `${namePrefix} #${1000 + i}`,
                        type: type,
                        tags: { amenity: type }
                    }
                });
            }
        }

        // Try to cache (non-blocking) AFTER mock data has been added
        try {
            await cache.set(cacheKey, data, TTL);
            console.log('[POI API] Data cached successfully');
        } catch (cacheError) {
            console.warn('[POI API] Cache set failed:', cacheError);
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
            details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }, { status: 500 });
    }
}

async function logApi(endpoint: string, provider: string, status: number, latency: number, cached: boolean) {
    try {
        if (process.env.NEXT_PHASE === 'phase-production-build') return;

        // Use a detached promise to avoid awaiting DB writes
        // This effectively makes it "fire and forget" but with error catching
        prisma.apiLog.create({
            data: { endpoint, provider, status, latencyMs: latency, cached },
        }).catch((e) => {
            // Silently ignore DB errors
        });
    } catch (e) {
        // Ignore initiation errors
    }
}
