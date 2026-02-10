'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { City } from '@/config/cities';
import { POI_LAYERS } from '@/config/layers';
import { PoiCollection } from '@/lib/fetchers/overpass';
import { RefreshCw, Layers } from 'lucide-react';
import { useLanguage } from '@/lib/language';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

export default function MapView({ city }: { city: City }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [selectedLayer, setSelectedLayer] = useState(POI_LAYERS[0].id);
  const [loading, setLoading] = useState(false);
  const [pois, setPois] = useState<PoiCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitWait, setRateLimitWait] = useState(0);
  const { t } = useLanguage();
  const refreshTick = useAutoRefresh(600000); // 10 minutes

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json';

    try {
      const mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: styleUrl,
        center: [city.lon, city.lat],
        zoom: 12,
      });

      map.current = mapInstance;
      mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Setup layers when map style is loaded
      mapInstance.on('load', () => {
        console.log('[Map] Style loaded. Layers stack:', mapInstance.getStyle().layers?.map(l => l.id).join(', '));

        console.log('[Map] Creating POI source and layers');

        // Add source with a HARDCODED DEBUG POINT
        mapInstance.addSource('pois', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [city.lon, city.lat] }, // City center
                properties: { name: 'DEBUG POINT', type: 'debug' }
              }
            ]
          },
          cluster: false,
        });

        // Debug Green Circles
        if (mapInstance.getLayer('poi-layer')) mapInstance.removeLayer('poi-layer');

        mapInstance.addLayer({
          id: 'poi-layer',
          type: 'circle',
          source: 'pois',
          paint: {
            'circle-color': '#00ff00', // Bright GREEN
            'circle-radius': 20,
            'circle-stroke-width': 4,
            'circle-stroke-color': '#000000',
          },
        });

        console.log('[Map] Added poi-layer (Green). Verifying presence:', mapInstance.getLayer('poi-layer') ? 'EXISTS' : 'MISSING');
      });
    } catch (e) {
      console.error('Map initialization error:', e);
      setError('Failed to initialize map');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [city]);

  // Setup map layers (one-time)
  const setupMapLayers = useCallback(() => {
    if (!map.current || map.current.getSource('pois')) {
      console.log('[Map] Skipping layer setup - already exists or map not ready');
      return;
    }

    console.log('[Map] Creating POI source and layers');

    // Add empty source
    // Add empty source - CLUSTERING DISABLED FOR DEBUGGING
    map.current.addSource('pois', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: false, // Disabled clustering
    });

    // Render all points as circles - HIGH CONTRAST DEBUG
    if (map.current.getLayer('poi-layer')) map.current.removeLayer('poi-layer');
    map.current.addLayer({
      id: 'poi-layer',
      type: 'circle',
      source: 'pois',
      paint: {
        'circle-color': '#ff0000', // RED for visibility
        'circle-radius': 15, // Huge radius
        'circle-stroke-width': 3,
        'circle-stroke-color': '#000000',
      },
    });

    // Add a text label layer for icons/names
    map.current.addLayer({
      id: 'poi-labels',
      type: 'symbol',
      source: 'pois',
      minzoom: 10,
      layout: {
        'text-field': ['get', 'icon'], // Display the emoji icon
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 18, // Larger size for emoji
        'text-offset': [0, -0.6], // Center inside/above circle
        'text-anchor': 'center',
        'text-allow-overlap': true, // Allow some overlap to see more
      },
      paint: {
        'text-color': '#000000',
        'text-halo-color': '#ffffff',
        'text-halo-width': 0,
      },
    });

    console.log('[Map] Setup POI layers (No Clustering, with Labels)');

    /* 
    // OLD CLUSTER LAYERS COMMENTED OUT
    // Cluster circles
    map.current.addLayer({ ... });
    // Cluster count
    map.current.addLayer({ ... });
    // Unclustered points
    map.current.addLayer({ ... });
    */

    // Click handlers (set up once)
    // Click handlers
    map.current.on('click', 'poi-layer', (e) => {
      if (!e.features || !e.features[0]) return;
      const coordinates = (e.features[0].geometry as any).coordinates.slice();
      const props = e.features[0].properties;

      new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="p-2">
            <h3 class="font-bold">${props.name || 'Unnamed'}</h3>
            <p class="text-sm text-gray-600">${props.type}</p>
          </div>
        `)
        .addTo(map.current!);
    });

    map.current.on('mouseenter', 'poi-layer', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'poi-layer', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
  }, []);

  // Fetch POIs
  const fetchPois = useCallback(async () => {
    if (!map.current) {
      console.warn('[Map] Cannot fetch POIs: map not initialized');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[Map] Fetching POIs for ${city.slug}, layer: ${selectedLayer}`);
      const res = await fetch(`/api/pois?city=${city.slug}&type=${selectedLayer}`);

      if (res.status === 429) {
        setError(t('map.rateLimit'));
        setRateLimitWait(10);
        // Countdown timer
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
      console.log(`[Map] Received ${data.features.length} POI features`);

      // Validate data
      if (!data.features || data.features.length === 0) {
        console.warn('[Map] No POI features found');
        setPois(data);
        return;
      }

      // Validate coordinates
      const validFeatures = data.features.filter(f => {
        const coords = f.geometry.coordinates;
        if (coords.length !== 2) return false;
        const [lon, lat] = coords;
        return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
      });

      if (validFeatures.length !== data.features.length) {
        console.warn(`[Map] Filtered out ${data.features.length - validFeatures.length} invalid features`);
      }

      const validData = { ...data, features: validFeatures };

      // Inject icon into properties for display
      const currentLayer = POI_LAYERS.find(l => l.id === selectedLayer);
      const icon = currentLayer?.icon || '•';

      validData.features = validData.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          icon: icon
        }
      }));

      setPois(validData);

      // Update map source (layers should already exist from setupMapLayers)
      const source = map.current.getSource('pois');
      if (source) {
        (source as maplibregl.GeoJSONSource).setData(validData);
        console.log(`[Map] Updated POI source with ${validFeatures.length} features`);

        // Fit map to points
        if (validFeatures.length > 0) {
          const sample = validFeatures[0];
          console.log('[Map DEBUG] First feature coords:', sample.geometry.coordinates);
          console.log('[Map DEBUG] First feature props:', sample.properties);

          const bounds = new maplibregl.LngLatBounds();
          validFeatures.forEach((f) => {
            bounds.extend(f.geometry.coordinates as [number, number]);
          });

          console.log('[Map DEBUG] Fitting bounds:', bounds.toArray());
          map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });

          // Force move to first point to ensure we are looking at it
          // map.current.flyTo({ center: sample.geometry.coordinates as [number, number], zoom: 14 });
        }
      } else {
        console.error('[Map] POI source not found! Layers may not be initialized.');
      }
    } catch (error) {
      console.error('[Map] Failed to fetch POIs:', error);
      setError(t('map.loading'));
    } finally {
      setLoading(false);
    }
  }, [city.slug, selectedLayer, t]);

  // Update marker color when layer changes
  useEffect(() => {
    if (map.current && map.current.getLayer('poi-layer')) {
      const layer = POI_LAYERS.find((l) => l.id === selectedLayer);
      // Update stroke color to match layer type, keep white background
      map.current.setPaintProperty('poi-layer', 'circle-stroke-color', layer?.color || '#3b82f6');
    }
  }, [selectedLayer]);

  // Fetch POIs when layer changes or auto-refresh
  useEffect(() => {
    if (map.current) {
      fetchPois();
    }
  }, [fetchPois, refreshTick]);

  const getLocalizedLayerName = (layerId: string) => {
    const layerMap: Record<string, string> = {
      'toilets': t('map.toilets'),
      'hospitals': t('map.hospitals'),
      'wheelchair': t('map.wheelchair'),
    };
    return layerMap[layerId] || layerId;
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          <span className="font-semibold">{t('map.title')}</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedLayer}
            onChange={(e) => setSelectedLayer(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/50 border border-white/30 text-sm"
          >
            {POI_LAYERS.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.icon} {getLocalizedLayerName(layer.id)}
              </option>
            ))}
          </select>
          <button
            onClick={fetchPois}
            disabled={loading || rateLimitWait > 0}
            className="px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={rateLimitWait > 0 ? `${t('map.rateLimit')} ${rateLimitWait}${t('map.seconds')}` : t('map.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div ref={mapContainer} className="h-[500px] w-full" />
      {error && (
        <div className="p-3 text-sm text-red-600 border-t border-white/20 bg-red-50">
          {error} {rateLimitWait > 0 && `(${rateLimitWait}${t('map.seconds')})`}
        </div>
      )}
      {pois && !error && (
        <div className="p-3 text-xs text-gray-500 border-t border-white/20">
          {t('map.found')} {pois.features.length} {t('map.locations')} • {t('map.updated')} {new Date(pois.fetchedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
