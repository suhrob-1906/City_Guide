import { NextRequest, NextResponse } from 'next/server';

const ORS_API_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || process.env.NEXT_PUBLIC_OPENROUTE_API_KEY;

export async function POST(req: NextRequest) {
    if (!ORS_API_KEY) {
        return NextResponse.json({ error: 'OpenRouteService API key not configured' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { start, end, profile = 'foot-walking', language = 'en' } = body;

        if (!start || !end) {
            return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
        }

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
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[OpenRouteService] Proxy error:', response.status, errorText);
            return NextResponse.json({ error: `External API error: ${response.statusText}` }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[OpenRouteService] Proxy request failed:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
