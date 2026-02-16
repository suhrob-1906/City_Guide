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
 * Get route from GraphHopper API as fallback
 */
async function getGraphHopperRoute(options: RouteOptions): Promise<RouteResult | null> {
    const { start, end, profile } = options;
    const ghProfile = profile === 'foot-walking' ? 'foot' : 'car';

    try {
        const url = `https://graphhopper.com/api/1/route?point=${start[1]},${start[0]}&point=${end[1]},${end[0]}&profile=${ghProfile}&locale=en&instructions=true&calc_points=true&points_encoded=false`;

        const response = await fetch(url);
        if (!response.ok) {
            console.warn('[GraphHopper] API request failed:', response.status);
            return null;
        }

        const data = await response.json();
        if (data.paths && data.paths.length > 0) {
            const path = data.paths[0];
            const steps = path.instructions?.map((inst: any) => ({
                distance: inst.distance,
                duration: inst.time / 1000, // convert ms to seconds
                instruction: inst.text,
                type: inst.sign,
                name: inst.street_name || '',
                way_points: inst.interval?.[0] !== undefined
                    ? path.points.coordinates[inst.interval[0]] as [number, number]
                    : [0, 0]
            })) || [];

            return {
                geometry: {
                    type: 'LineString',
                    coordinates: path.points.coordinates,
                },
                distance: path.distance,
                duration: path.time / 1000,
                steps,
            };
        }
        return null;
    } catch (error) {
        console.error('[GraphHopper] Request failed:', error);
        return null;
    }
}

/**
 * Get pedestrian or driving route from OpenRouteService
 * For walking: Uses ORS foot-walking profile which respects sidewalks and pedestrian paths
 * For driving: Falls back to OSRM if ORS fails
 */
export async function getRoute(options: RouteOptions): Promise<RouteResult | null> {
    const { start, end, profile = 'foot-walking', language = 'en' } = options;

    try {
        // 0. CHECK KEY VALIDITY FIRST
        // If the key is likely invalid (e.g. starts with 'ey' which is a JWT/project ID, not an ORS key),
        // skip the proxy and direct call immediately to avoid 401/500 errors.
        const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY || process.env.NEXT_PUBLIC_OPENROUTE_API_KEY;
        const isKeyInvalid = !apiKey || apiKey.startsWith('ey');

        if (!isKeyInvalid) {
            // 1. Try OpenRouteService (via internal proxy)
            console.log(`[Routing] Attempting ${profile} route via OpenRouteService...`);
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
                    console.log('[Routing] ✓ OpenRouteService succeeded');
                    const feature = data.features[0];
                    const rawSteps = feature.properties.segments?.[0]?.steps || [];
                    // ORS V2 returns way_points as [startIndex, endIndex] indices into geometry
                    const steps = rawSteps.map((s: any) => {
                        let point: [number, number] = [0, 0];
                        if (s.way_points && Array.isArray(s.way_points) && s.way_points.length > 0) {
                            const idx = s.way_points[0];
                            if (feature.geometry.coordinates[idx]) {
                                point = feature.geometry.coordinates[idx] as [number, number];
                            }
                        }
                        return {
                            distance: s.distance,
                            duration: s.duration,
                            type: s.type,
                            instruction: s.instruction,
                            name: s.name,
                            way_points: point
                        };
                    });

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
            } else {
                const errorText = await response.text();
                console.warn(`[Routing] OpenRouteService Proxy failed with status ${response.status}:`, errorText);
            }

            // 2. Fallback: Try calling ORS DIRECTLY from client (bypass server proxy)
            // This is useful if our server 500s but ORS is up.
            console.log(`[Routing] Attempting direct client-side ORS call...`);
            const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY || process.env.NEXT_PUBLIC_OPENROUTE_API_KEY;
            if (apiKey) {
                try {
                    const directResponse = await fetch(`https://api.openrouteservice.org/v2/directions/${profile}/geojson`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': apiKey,
                        },
                        body: JSON.stringify({
                            coordinates: [start, end],
                            instructions: true,
                            maneuvers: true,
                            language: language,
                        })
                    });

                    if (directResponse.ok) {
                        const data = await directResponse.json();
                        if (data && data.features && data.features.length > 0) {
                            console.log('[Routing] ✓ Direct ORS call succeeded');
                            const feature = data.features[0];
                            // ... (Process data same as before) ...
                            // To avoid code duplication, we could extract this, but for now let's just return normalized
                            const rawSteps = feature.properties.segments?.[0]?.steps || [];
                            const steps = rawSteps.map((s: any) => {
                                let point: [number, number] = [0, 0];
                                if (s.way_points && Array.isArray(s.way_points) && s.way_points.length > 0) {
                                    const idx = s.way_points[0];
                                    if (feature.geometry.coordinates[idx]) {
                                        point = feature.geometry.coordinates[idx] as [number, number];
                                    }
                                }
                                return {
                                    distance: s.distance,
                                    duration: s.duration,
                                    type: s.type,
                                    instruction: s.instruction,
                                    name: s.name,
                                    way_points: point
                                };
                            });
                            return {
                                geometry: { type: 'LineString', coordinates: feature.geometry.coordinates },
                                distance: feature.properties.summary.distance,
                                duration: feature.properties.summary.duration,
                                steps,
                            };
                        }
                    } else {
                        console.warn('[Routing] Direct ORS call failed:', directResponse.status);
                    }
                } catch (e) {
                    console.warn('[Routing] Direct ORS call error:', e);
                }
            }
        } // End of isKeyInvalid check

        // 3. For WALKING: Try OSRM Walking as fallback (project-osrm.org)
        if (profile === 'foot-walking') {
            console.log('[Routing] ORS failed. Trying OSRM Walking fallback...');
            const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true`;

            try {
                const osrmResponse = await fetch(osrmUrl);
                if (osrmResponse.ok) {
                    const osrmData = await osrmResponse.json();
                    if (osrmData.routes && osrmData.routes.length > 0) {
                        console.log('[Routing] ✓ OSRM Walking succeeded');
                        const route = osrmData.routes[0];
                        const steps = route.legs?.[0]?.steps?.map((s: any) => ({
                            distance: s.distance,
                            duration: s.duration,
                            instruction: s.maneuver?.type, // Raw OSRM instruction
                            type: 0,
                            name: s.name,
                            way_points: s.maneuver?.location || [0, 0]
                        })) || [];

                        return {
                            geometry: route.geometry,
                            distance: route.distance,
                            duration: route.duration,
                            steps
                        };
                    }
                }
            } catch (e) {
                console.warn('[Routing] Primary OSRM Walking failed:', e);
            }

            // 3b. Secondary OSRM Fallback (routing.openstreetmap.de)
            // Sometimes project-osrm is busy/rate-limited
            console.log('[Routing] Trying Secondary OSRM (DE)...');
            const altOsrmUrl = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true`;
            try {
                const altResponse = await fetch(altOsrmUrl);
                if (altResponse.ok) {
                    const altData = await altResponse.json();
                    if (altData.routes && altData.routes.length > 0) {
                        console.log('[Routing] ✓ Secondary OSRM succeeded');
                        const route = altData.routes[0];
                        const altSteps = route.legs?.[0]?.steps?.map((s: any) => ({
                            distance: s.distance,
                            duration: s.duration,
                            instruction: s.maneuver?.type,
                            type: 0,
                            name: s.name,
                            way_points: s.maneuver?.location || [0, 0]
                        })) || [];

                        return {
                            geometry: route.geometry,
                            distance: route.distance,
                            duration: route.duration,
                            steps: altSteps
                        };
                    }
                }
            } catch (e) {
                console.warn('[Routing] Secondary OSRM failed:', e);
            }
            console.warn('[Routing] All walking providers failed. Will use straight line.');
        }


        // 3. For DRIVING ONLY: Fallback to OSRM
        if (profile === 'driving-car') {
            console.warn('[Routing] OpenRouteService failed for driving, trying OSRM fallback...');

            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true`;

            const osrmResponse = await fetch(osrmUrl);
            if (osrmResponse.ok) {
                const osrmData = await osrmResponse.json();
                if (osrmData.routes && osrmData.routes.length > 0) {
                    console.log('[Routing] ✓ OSRM succeeded');
                    const route = osrmData.routes[0];
                    const steps = route.legs?.[0]?.steps?.map((s: any) => ({
                        distance: s.distance,
                        duration: s.duration,
                        instruction: s.maneuver?.type,
                        type: 0,
                        name: s.name,
                        way_points: s.maneuver?.location || [0, 0]
                    })) || [];

                    return {
                        geometry: route.geometry,
                        distance: route.distance,
                        duration: route.duration,
                        steps
                    };
                }
            }
        }

        console.warn('[Routing] All routing services failed. Returning null to trigger straight-line fallback.');
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

    console.log('[Routing] ⚠ Using straight-line fallback');

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
