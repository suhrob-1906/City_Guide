import { useState, useCallback } from 'react';
import { getRoute, calculateStraightLine, RouteResult } from '@/lib/fetchers/openroute';
import { useLanguage } from '@/lib/language';

export interface RouteData {
    type: 'FeatureCollection';
    features: Array<{
        type: 'Feature';
        geometry: any;
        properties: {
            mode: 'walking' | 'driving';
        };
    }>;
}

export function useRouting() {
    const [route, setRoute] = useState<RouteData | null>(null);
    const [steps, setSteps] = useState<any[]>([]);
    const [distance, setDistance] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();

    const resetRoute = useCallback(() => {
        setRoute(null);
        setSteps([]);
        setDistance(0);
        setDuration(0);
        setError(null);
    }, []);

    const calculateRoute = useCallback(async (
        start: [number, number],
        end: [number, number],
        mode: 'walking' | 'driving'
    ) => {
        setIsLoading(true);
        setError(null);

        try {
            let result: RouteResult | null = null;

            if (mode === 'driving') {
                const coords = `${start[0]},${start[1]};${end[0]},${end[1]}`;
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;

                const response = await fetch(osrmUrl);
                if (!response.ok) throw new Error('OSRM Driving API failed');

                const data = await response.json();
                if (data.code === 'Ok' && data.routes?.[0]) {
                    const r = data.routes[0];
                    result = {
                        geometry: r.geometry,
                        distance: r.distance,
                        duration: r.duration,
                        steps: r.legs?.[0]?.steps || []
                    };
                }
            } else {
                try {
                    // Try server-side routing logic (ORS -> GraphHopper -> OSRM)
                    result = await getRoute({
                        start,
                        end,
                        profile: 'foot-walking',
                    });
                } catch (e) {
                    console.warn('[useRouting] getRoute failed, falling back to straight line', e);
                    // result remains null, enforcing fallback below
                }
            }

            if (!result) {
                console.warn('[useRouting] All providers failed. Using straight line fallback.');
                const sl = calculateStraightLine(start, end);
                result = {
                    geometry: sl.geometry,
                    distance: sl.distance,
                    duration: sl.duration,
                    steps: [] // No steps for straight line
                };
            }

            setRoute({
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: result.geometry,
                    properties: { mode }
                }]
            });
            setSteps(result.steps || []);
            setDistance(result.distance);
            setDuration(result.duration);

            return {
                route: {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        geometry: result.geometry,
                        properties: { mode }
                    }]
                } as RouteData,
                distance: result.distance,
                duration: result.duration,
                steps: result.steps
            };

        } catch (err) {
            console.error('[useRouting] Critical Error:', err);
            setError(t('map.errorRouting'));

            // Absolute last resort fallback
            const fallback = calculateStraightLine(start, end);
            setRoute({
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: fallback.geometry,
                    properties: { mode }
                }]
            });
            setDistance(fallback.distance);
            setDuration(fallback.duration);

            return {
                route: {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        geometry: fallback.geometry,
                        properties: { mode }
                    }]
                } as RouteData,
                distance: fallback.distance,
                duration: fallback.duration,
                steps: [] as any[]
            };
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    return {
        route,
        steps,
        distance,
        duration,
        isLoading,
        error,
        calculateRoute,
        resetRoute
    };
}
