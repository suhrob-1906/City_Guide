import { NextRequest, NextResponse } from 'next/server';
import { getCityBySlug } from '@/config/cities';
import { fetchAirQuality, fetchAirQualityForecast } from '@/lib/fetchers/openweather';
import { cache } from '@/lib/cache';
import { airRateLimiter } from '@/lib/rateLimit';
import { prisma } from '@/lib/db';

const TTL = 600; // 10 minutes

export async function GET(req: NextRequest) {
    const startTime = Date.now();
    const city = req.nextUrl.searchParams.get('city');
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Rate limit
    const { success } = await airRateLimiter.check(ip);
    if (!success) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    if (!city) {
        return NextResponse.json({ error: 'City parameter required' }, { status: 400 });
    }

    const cityData = getCityBySlug(city);
    if (!cityData) {
        return NextResponse.json({ error: 'Invalid city' }, { status: 404 });
    }

    const cacheKey = `air:${city}`;

    try {
        const cached = await cache.get(cacheKey);
        if (cached) {
            await logApi('air', 'openweather', 200, Date.now() - startTime, true);
            return NextResponse.json(cached);
        }

        const data = await fetchAirQuality(cityData.lat, cityData.lon);

        // Fetch forecast if requested
        const type = req.nextUrl.searchParams.get('type');
        if (type === 'forecast') {
            const forecast = await fetchAirQualityForecast(cityData.lat, cityData.lon);
            // Merge forecast into response or return separately? 
            // Let's attach it to the main response for now or standard is separate
            // For simplicity, let's return it as part of a new structure if type=forecast 
            // BUT to keep backward compat, let's just add it to the response if requested
            // OR better, client makes 2 requests? No, one is better to save rate limits?
            // Actually, the card needs both. Let's fetch both if type=forecast.
            // Wait, `fetchAirQuality` hits current `air_pollution`. `fetchAirQualityForecast` hits `forecast`.
            // These are separate API calls.

            // Simplest: just adding `forecast` field to the response
            const forecastData = await fetchAirQualityForecast(cityData.lat, cityData.lon);
            const response = { ...data, forecast: forecastData };
            await cache.set(cacheKey, response, TTL); // Cache combined
            await logApi('air', 'openweather', 200, Date.now() - startTime, false);
            return NextResponse.json(response);
        }

        await cache.set(cacheKey, data, TTL);
        await logApi('air', 'openweather', 200, Date.now() - startTime, false);

        return NextResponse.json(data);
    } catch (error: any) {
        await logApi('air', 'openweather', 500, Date.now() - startTime, false);

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

        prisma.apiLog.create({
            data: { endpoint, provider, status, latencyMs: latency, cached },
        }).catch((e) => {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to log API call:', e.message);
            }
        });
    } catch (e) {
        // Ignore initiation errors
    }
}
