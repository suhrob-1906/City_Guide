import { NextRequest, NextResponse } from 'next/server';

const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || process.env.NEXT_PUBLIC_OPENROUTE_API_KEY;
const TIMEOUT_MS = 30000; // 30 seconds

export async function POST(req: NextRequest) {
    if (!ORS_API_KEY) {
        console.error('[ORS API] API key not configured. Set NEXT_PUBLIC_ORS_API_KEY in .env');
        return NextResponse.json({
            error: 'Routing service not configured. Please contact administrator.'
        }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { start, end, profile = 'foot-walking', language = 'en' } = body;

        // Validate coordinates
        if (!start || !end || !Array.isArray(start) || !Array.isArray(end)) {
            return NextResponse.json({ error: 'Invalid coordinates format' }, { status: 400 });
        }

        if (start.length !== 2 || end.length !== 2) {
            return NextResponse.json({ error: 'Coordinates must be [lon, lat]' }, { status: 400 });
        }

        // Validate profile
        const validProfiles = ['foot-walking', 'driving-car'];
        if (!validProfiles.includes(profile)) {
            return NextResponse.json({ error: 'Invalid routing profile' }, { status: 400 });
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(
                `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': ORS_API_KEY,
                    },
                    body: JSON.stringify({
                        coordinates: [start, end],
                        instructions: true,
                        maneuvers: true,
                        language: language,
                    }),
                    signal: controller.signal,
                }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[ORS API] External API error:', response.status, errorText);

                // Return user-friendly error
                if (response.status === 429) {
                    return NextResponse.json({
                        error: 'Too many requests. Please try again in a moment.'
                    }, { status: 429 });
                }

                return NextResponse.json({
                    error: 'Unable to calculate route. Please try again.'
                }, { status: response.status });
            }

            const data = await response.json();
            return NextResponse.json(data);

        } catch (fetchError: any) {
            clearTimeout(timeoutId);

            if (fetchError.name === 'AbortError') {
                console.error('[ORS API] Request timeout after', TIMEOUT_MS, 'ms');
                return NextResponse.json({
                    error: 'Route calculation timed out. Please try a shorter distance.'
                }, { status: 504 });
            }

            throw fetchError;
        }

    } catch (error: any) {
        console.error('[ORS API] Request failed:', error);
        return NextResponse.json({
            error: 'Internal server error. Please try again.'
        }, { status: 500 });
    }
}
