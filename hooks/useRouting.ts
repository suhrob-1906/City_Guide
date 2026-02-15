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
                // Use OSRM public API for driving (Demo server)
                // Note: In production, this should likely be proxied or use a paid key if heavy usage
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
                // Walking: Use our internal fetcher which tries ORS -> OSRM Walking -> Straight Line
                result = await getRoute({
                    start,
                    end,
                    profile: 'foot-walking',
                });
            }

            if (!result) {
                // Final fallback if everything fails
                console.warn('[useRouting] All routing services failed, using straight line.');
                result = calculateStraightLine(start, end);
            }

            // Update state
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

        } catch (err) {
            console.error('[useRouting] Error:', err);
            setError(t('map.errorRouting'));

            // Even on error, try straight line as last resort so user isn't stranded
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
