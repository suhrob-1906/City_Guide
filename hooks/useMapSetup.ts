import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { City } from '@/config/cities';
import { POI_LAYERS } from '@/config/layers';

export function useMapSetup(containerRef: React.RefObject<HTMLDivElement>, city: City) {
    const map = useRef<maplibregl.Map | null>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);

    // Initialize Map
    useEffect(() => {
        if (!containerRef.current || map.current) return;

        try {
            const mapInstance = new maplibregl.Map({
                container: containerRef.current,
                style: process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json',
                center: [city.lon, city.lat],
                zoom: 12,
                attributionControl: false
            });

            mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right');
            mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

            mapInstance.on('load', () => {
                map.current = mapInstance;

                // Add custom marker image
                addCustomMarkerImage(mapInstance);

                // Setup sources and layers
                setupLayers(mapInstance);

                setIsMapReady(true);
            });

            mapInstance.on('error', (e) => {
                setMapError('Failed to load map style');
            });

        } catch (e) {
            setMapError('Failed to initialize map');
        }

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [city]);

    // Helpers
    const addCustomMarkerImage = (map: maplibregl.Map) => {
        const size = 48;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw pin
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2 - 5, 20, 0, Math.PI * 2);
        ctx.fill();
        // Pin tip
        ctx.beginPath();
        ctx.moveTo(size / 2 - 20, size / 2);
        ctx.lineTo(size / 2, size);
        ctx.lineTo(size / 2 + 20, size / 2);
        ctx.fill();

        // Inner white circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2 - 5, 8, 0, Math.PI * 2);
        ctx.fill();

        const imageData = ctx.getImageData(0, 0, size, size);
        if (!map.hasImage('custom-pin')) {
            map.addImage('custom-pin', {
                width: size,
                height: size,
                data: new Uint8Array(imageData.data)
            }, { sdf: true });
        }
    };

    const setupLayers = (map: maplibregl.Map) => {
        // Source for POIs with clustering enabled
        if (!map.getSource('pois')) {
            map.addSource('pois', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
                cluster: true,
                clusterMaxZoom: 14, // Max zoom to cluster points on
                clusterRadius: 50 // Radius of each cluster when clustering points
            });
        }

        // Source for Route
        if (!map.getSource('route')) {
            map.addSource('route', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });
        }

        // 1. Route Line (Layer)
        if (!map.getLayer('route-line')) {
            map.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#3b82f6',
                    'line-width': 6,
                    'line-opacity': 0.8
                }
            });
        }

        // 2. Walking Dots (Layer overlay)
        if (!map.getLayer('route-line-walking')) {
            map.addLayer({
                id: 'route-line-walking',
                type: 'line',
                source: 'route',
                filter: ['==', 'mode', 'walking'],
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': '#ffffff',
                    'line-width': 2,
                    'line-dasharray': [0, 2]
                }
            });
        }

        // 3. Clusters (circles)
        if (!map.getLayer('clusters')) {
            map.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'pois',
                filter: ['has', 'point_count'],
                paint: {
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        '#51bbd6', 20,
                        '#f1f075', 100,
                        '#f28cb1'
                    ],
                    'circle-radius': [
                        'step',
                        ['get', 'point_count'],
                        20, 20,
                        30, 100,
                        40
                    ]
                }
            });
        }

        // 4. Cluster count labels
        if (!map.getLayer('cluster-count')) {
            map.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'pois',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': '{point_count_abbreviated}',
                    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                    'text-size': 14
                },
                paint: {
                    'text-color': '#ffffff'
                }
            });
        }

        // 5. POI Markers (Symbol Layer) - only unclustered points
        if (!map.getLayer('poi-layer')) {
            map.addLayer({
                id: 'poi-layer',
                type: 'symbol',
                source: 'pois',
                filter: ['!', ['has', 'point_count']], // Only show unclustered points
                layout: {
                    'icon-image': 'custom-pin',
                    'icon-size': 0.7,
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'text-field': ['get', 'name'],
                    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                    'text-size': 12,
                    'text-offset': [0, 1.2],
                    'text-anchor': 'top',
                    'text-optional': true
                },
                paint: {
                    'icon-color': ['get', 'color'],
                    'text-color': '#1f2937',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 2
                }
            });
        }

        // 6. POI Icons (Emoji overlay) - only unclustered points
        if (!map.getLayer('poi-emoji')) {
            map.addLayer({
                id: 'poi-emoji',
                type: 'symbol',
                source: 'pois',
                filter: ['!', ['has', 'point_count']], // Only show unclustered points
                layout: {
                    'text-field': ['get', 'icon'],
                    'text-size': 20,
                    'text-anchor': 'center',
                    'text-offset': [0, -0.9], // Align with pin head
                    'text-allow-overlap': true
                }
            });
        }
    };

    return { map, isMapReady, mapError };
}
