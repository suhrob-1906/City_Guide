import { NextRequest, NextResponse } from 'next/server';
import { getTourismPOIs } from '@/lib/fetchers/tourism';
import { cache } from '@/lib/cache';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lon = parseFloat(searchParams.get('lon') || '0');
    const radius = parseFloat(searchParams.get('radius') || '10');

    if (!lat || !lon) {
        return NextResponse.json(
            { error: 'Missing lat/lon parameters' },
            { status: 400 }
        );
    }

    const cacheKey = `tourism:${lat}:${lon}:${radius}`;

    try {
        // Check cache first (24 hour TTL)
        const cached = await cache.get(cacheKey);
        if (cached) {
            return NextResponse.json(cached, {
                headers: {
                    'X-Cache': 'HIT',
                },
            });
        }

        // Fetch from Overpass API
        const pois = await getTourismPOIs(lat, lon, radius);

        // Cache the result
        await cache.set(cacheKey, pois, 86400); // 24 hours

        return NextResponse.json(pois, {
            headers: {
                'X-Cache': 'MISS',
            },
        });
    } catch (error: any) {
        console.error('[Tourism API] Error:', error);

        // Check for timeout or connectivity issues
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
            return NextResponse.json(
                { error: 'Tourism data fetch timed out. Please try again later.' },
                { status: 504 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch tourism data', details: error.message },
            { status: 500 }
        );
    }
}
