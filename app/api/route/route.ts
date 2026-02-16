import { NextRequest, NextResponse } from 'next/server';

const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || process.env.NEXT_PUBLIC_OPENROUTE_API_KEY;
const TIMEOUT_MS = 30000; // 30 seconds

export async function POST(req: NextRequest) {
    if (!ORS_API_KEY) {
        console.error('[ORS API] API key not configured.');
        return NextResponse.json({
            error: 'Routing service not configured.'
        }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { start, end, profile = 'foot-walking', language = 'en' } = body;

        // Validate coordinates
        if (!start || !end || !Array.isArray(start) || !Array.isArray(end) || start.length !== 2 || end.length !== 2) {
            return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
        }

        const validProfiles = ['foot-walking', 'driving-car'];
        if (!validProfiles.includes(profile)) {
            return NextResponse.json({ error: 'Invalid routing profile' }, { status: 400 });
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            console.log(`[ORS API] Proxying request to ${profile}`);
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
                console.error('[ORS API] External error:', response.status, errorText);
                return NextResponse.json({
                    error: 'External API Error'
                }, { status: response.status });
            }

            const data = await response.json();
            return NextResponse.json(data);

        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                return NextResponse.json({ error: 'Timeout' }, { status: 504 });
            }
            throw fetchError;
        }

    } catch (error: any) {
        console.error('[ORS API] Internal error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}

