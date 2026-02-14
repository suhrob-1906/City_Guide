/**
 * OpenRouteService API client for pedestrian routing
 * Free tier: 2000 requests/day
 * Docs: https://openrouteservice.org/dev/#/api-docs/v2/directions/{profile}/post
 */

interface RouteStep {
    distance: number;
    duration: number;
    type: number;
    instruction: string;
    name: string;
    way_points: [number, number];
}

interface RouteSegment {
    distance: number;
    duration: number;
    steps: RouteStep[];
}

interface RouteResponse {
    features: Array<{
        geometry: {
            coordinates: number[][];
            type: string;
        };
        properties: {
            segments: RouteSegment[];
            summary: {
                distance: number; // in meters
                duration: number; // in seconds
            };
        };
    }>;
}

interface RouteOptions {
    start: [number, number]; // [lon, lat]
    end: [number, number]; // [lon, lat]
    profile?: 'foot-walking' | 'driving-car';
    language?: string;
}

export interface RouteResult {
    geometry: {
        type: 'LineString';
        coordinates: number[][];
    };
    distance: number; // in meters
    duration: number; // in seconds
    steps?: RouteStep[];
}

// API Key is now handled server-side in /api/route

/**
 * Get pedestrian or driving route from OpenRouteService
 */
export async function getRoute(options: RouteOptions): Promise<RouteResult | null> {
    const { start, end, profile = 'foot-walking', language = 'en' } = options;

    try {
        // 1. Try OpenRouteService (via internal proxy)
        const response = await fetch('/api/route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                start,
                end,
                profile,
                language,
            }),
        });

        if (response.ok) {
            const data: RouteResponse = await response.json();
            if (data && data.features && data.features.length > 0) {
                const feature = data.features[0];
                const rawSteps = feature.properties.segments?.[0]?.steps || [];
                // ORS V2 returns way_points as [startIndex, endIndex] indices into geometry
                const steps = rawSteps.map((s: any) => ({
                    distance: s.distance,
                    duration: s.duration,
                    type: s.type,
                    instruction: s.instruction,
                    name: s.name,
                    way_points: feature.geometry.coordinates[s.way_points[0]] as [number, number]
                }));

                return {
                    geometry: {
                        type: 'LineString',
                        coordinates: feature.geometry.coordinates,
                    },
                    distance: feature.properties.summary.distance,
                    duration: feature.properties.summary.duration,
                    steps,
                };
            }
        }

        console.warn('[Routing] OpenRouteService failed or empty, trying OSRM fallback...');

        // 2. Fallback to OSRM (Open Source Routing Machine) - Public Demo API
        // Note: usage policy applies, but good for demo/fallback
        // OSRM doesn't provide the same step structure easily compatible with ORS without mapping,
        // so we might skip steps for fallback or map them if needed. For now, simple fallback.
        const osrmProfile = profile === 'driving-car' ? 'driving' : 'foot';
        const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true`;

        const osrmResponse = await fetch(osrmUrl);
        if (osrmResponse.ok) {
            const osrmData = await osrmResponse.json();
            if (osrmData.routes && osrmData.routes.length > 0) {
                const route = osrmData.routes[0];
                // Map OSRM steps to our format (simplified)
                const steps = route.legs?.[0]?.steps?.map((s: any) => ({
                    distance: s.distance,
                    duration: s.duration,
                    instruction: s.maneuver?.type, // Simplified
                    type: 0,
                    name: s.name,
                    way_points: s.maneuver?.location
                })) || [];

                return {
                    geometry: route.geometry,
                    distance: route.distance,
                    duration: route.duration,
                    steps
                };
            }
        }

        console.warn('[Routing] OSRM also failed, using straight-line fallback');
        return null;

    } catch (error) {
        console.error('[Routing] Request failed:', error);
        return null;
    }
}

/**
 * Calculate straight-line distance and estimated walking time as fallback
 */
export function calculateStraightLine(
    start: [number, number],
    end: [number, number]
): RouteResult {
    const [startLon, startLat] = start;
    const [endLon, endLat] = end;

    // Haversine formula
    const R = 6371000; // Earth's radius in meters
    const dLat = ((endLat - startLat) * Math.PI) / 180;
    const dLon = ((endLon - startLon) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((startLat * Math.PI) / 180) *
        Math.cos((endLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Estimate walking time (average speed: 5 km/h = 1.39 m/s)
    const walkingSpeed = 1.39; // m/s
    const duration = distance / walkingSpeed;

    return {
        geometry: {
            type: 'LineString',
            coordinates: [start, end],
        },
        distance,
        duration,
        steps: []
    };
}
