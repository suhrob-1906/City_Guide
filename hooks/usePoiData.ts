import { useState, useCallback, useEffect } from 'react';
import { PoiCollection } from '@/lib/fetchers/overpass';
import { POI_LAYERS } from '@/config/layers';
import { useLanguage } from '@/lib/language';

export function usePoiData(citySlug: string, selectedLayerId: string) {
    const [pois, setPois] = useState<PoiCollection | null>(null);
    const [isLoadingPois, setIsLoadingPois] = useState(false);
    const [poiError, setPoiError] = useState<string | null>(null);
    const [rateLimitWait, setRateLimitWait] = useState(0);
    const { t } = useLanguage();

    const fetchPois = useCallback(async (forceRefresh = false) => {
        setIsLoadingPois(true);
        setPoiError(null);

        try {
            const res = await fetch(`/api/pois?city=${citySlug}&type=${selectedLayerId}${forceRefresh ? '&refresh=true' : ''}`);

            if (res.status === 429) {
                setPoiError(t('map.rateLimit'));
                setRateLimitWait(10);
                const interval = setInterval(() => {
                    setRateLimitWait((prev) => {
                        if (prev <= 1) {
                            clearInterval(interval);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
                return;
            }

            if (!res.ok) throw new Error('Failed to fetch POIs');

            const data: PoiCollection = await res.json();

            // Enrich with icon/color from config
            const currentLayer = POI_LAYERS.find(l => l.id === selectedLayerId);
            const enrichedFeatures = (data.features || []).filter(f => f.geometry.coordinates.length === 2).map(f => ({
                ...f,
                properties: {
                    ...f.properties,
                    layerId: currentLayer?.id || selectedLayerId,
                    icon: currentLayer?.icon || '•',
                    color: currentLayer?.color || '#3b82f6'
                }
            }));

            setPois({
                ...data,
                features: enrichedFeatures
            });

        } catch (error) {
            console.error('[usePoiData] Error:', error);
            setPoiError(t('map.loading'));
        } finally {
            setIsLoadingPois(false);
        }
    }, [citySlug, selectedLayerId, t]);

    // Initial fetch
    useEffect(() => {
        fetchPois();
    }, [fetchPois]);

    return { pois, isLoadingPois, poiError, rateLimitWait, fetchPois };
}
