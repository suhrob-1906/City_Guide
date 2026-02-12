'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { City } from '@/config/cities';
import { POI_LAYERS } from '@/config/layers';
import { PoiCollection } from '@/lib/fetchers/overpass';
import { RefreshCw, Layers, Navigation, Car, PersonStanding } from 'lucide-react';
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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [nearestPOI, setNearestPOI] = useState<any | null>(null);
  const [transportMode, setTransportMode] = useState<'driving' | 'walking'>('walking');
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

      // Add Geolocation Control
      const geolocate = new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserLocation: true
      });
      mapInstance.addControl(geolocate, 'top-right');

      // Track user location
      geolocate.on('geolocate', (e: any) => {
        setUserLocation([e.coords.longitude, e.coords.latitude]);
      });

      // Suppress sprite warnings for base map style
      mapInstance.on('styleimagemissing', (e) => {
        const missingImage = e.id;
        if (!mapInstance.hasImage(missingImage)) {
          mapInstance.addImage(missingImage, {
            width: 1,
            height: 1,
            data: new Uint8Array(4)
          });
        }
      });

      // Setup layers when map style is loaded
      mapInstance.on('load', () => {
        console.log('[Map] Style loaded.');

        // Create custom pin icon using canvas
        const size = 48;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.moveTo(size / 2, size - 4);
          ctx.bezierCurveTo(size / 2, size - 4, size - 8, size / 2, size - 8, size / 3);
          ctx.bezierCurveTo(size - 8, 8, size / 2, 4, size / 2, 4);
          ctx.bezierCurveTo(size / 2, 4, 8, 8, 8, size / 3);
          ctx.bezierCurveTo(8, size / 2, size / 2, size - 4, size / 2, size - 4);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(size / 2, size / 3, 6, 0, Math.PI * 2);
          ctx.fill();

          const imageData = ctx.getImageData(0, 0, size, size);
          if (!mapInstance.hasImage('custom-pin')) {
            mapInstance.addImage('custom-pin', {
              width: size,
              height: size,
              data: new Uint8Array(imageData.data)
            }, { sdf: true });
          }
          console.log('[Map] Custom pin icon added successfully');
        }

        setupMapLayers();

        // Always request geolocation on first visit to city page
        const hasRequestedLocation = sessionStorage.getItem(`map-geo-${city.slug}`);
        if (!hasRequestedLocation) {
          setTimeout(() => {
            geolocate.trigger();
            sessionStorage.setItem(`map-geo-${city.slug}`, 'true');
          }, 1000);
        }
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

  // Setup map layers
  const setupMapLayers = useCallback(() => {
    if (!map.current || map.current.getSource('pois')) {
      return;
    }

    console.log('[Map] Creating POI source and layers');

    map.current.addSource('pois', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: false,
    });

    map.current.addSource('route', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    if (map.current.getLayer('poi-layer')) map.current.removeLayer('poi-layer');

    map.current.addLayer({
      id: 'poi-layer',
      type: 'symbol',
      source: 'pois',
      layout: {
        'icon-image': 'custom-pin',
        'icon-size': 0.6,
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true,
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 11,
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-optional': true,
      },
      paint: {
        'icon-color': ['get', 'color'],
        'text-color': '#1f2937',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
      },
    });

    map.current.addLayer({
      id: 'poi-emoji',
      type: 'symbol',
      source: 'pois',
      layout: {
        'text-field': ['get', 'icon'],
        'text-size': 20,
        'text-anchor': 'center',
        'text-offset': [0, -0.9],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    map.current.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 4,
        'line-opacity': 0.8,
      },
    });

    console.log('[Map] Setup POI layers with Pins');

    const handleClick = (e: any) => {
      if (!e.features || !e.features[0]) return;
      const coordinates = (e.features[0].geometry as any).coordinates.slice();
      const props = e.features[0].properties;

      // Calculate distance if user location is available
      let distanceHtml = '';
      if (userLocation) {
        const [userLon, userLat] = userLocation;
        const [poiLon, poiLat] = coordinates;

        // Calculate straight-line distance using Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = (poiLat - userLat) * Math.PI / 180;
        const dLon = (poiLon - userLon) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(userLat * Math.PI / 180) * Math.cos(poiLat * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        distanceHtml = `<p class="text-sm text-gray-600 mt-1">📍 ${distance.toFixed(2)} km ${t('map.distance').toLowerCase()}</p>`;
      }

      new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="p-2">
            <h3 class="font-bold">${props.icon} ${props.name || 'Unnamed'}</h3>
            <p class="text-sm text-gray-600">${props.type}</p>
            ${distanceHtml}
          </div>
        `)
        .addTo(map.current!);
    };

    map.current.on('click', 'poi-layer', handleClick);
    map.current.on('click', 'poi-emoji', handleClick);

    map.current.on('mouseenter', 'poi-layer', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'poi-layer', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
    map.current.on('mouseenter', 'poi-emoji', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'poi-emoji', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
  }, [userLocation, t]);

  // Find nearest POI with real routing
  const findNearest = useCallback(async () => {
    if (!userLocation || !pois || !pois.features.length) {
      setError(t('map.noLocation'));
      return;
    }

    const [userLon, userLat] = userLocation;
    let nearest: any = null;
    let minDistance = Infinity;

    pois.features.forEach((poi: any) => {
      const [poiLon, poiLat] = poi.geometry.coordinates;
      const distance = Math.sqrt(
        Math.pow(poiLon - userLon, 2) + Math.pow(poiLat - userLat, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = poi;
      }
    });

    if (nearest && map.current) {
      setNearestPOI(nearest);
      setLoading(true);

      try {
        if (transportMode === 'driving') {
          // Use OSRM API for car routing
          const coords = `${userLon},${userLat};${nearest.geometry.coordinates[0]},${nearest.geometry.coordinates[1]}`;
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

          const response = await fetch(osrmUrl);
          const data = await response.json();

          if (data.code === 'Ok' && data.routes && data.routes[0]) {
            const route = data.routes[0];
            const routeData = {
              type: 'FeatureCollection' as const,
              features: [{
                type: 'Feature' as const,
                geometry: route.geometry,
                properties: {}
              }]
            };

            const routeSource = map.current.getSource('route') as maplibregl.GeoJSONSource;
            if (routeSource) {
              routeSource.setData(routeData);
            }

            const bounds = new maplibregl.LngLatBounds();
            bounds.extend(userLocation);
            bounds.extend(nearest.geometry.coordinates as [number, number]);
            map.current.fitBounds(bounds, { padding: 100 });

            const distanceKm = (route.distance / 1000).toFixed(2);
            const durationMin = Math.round(route.duration / 60);

            new maplibregl.Popup()
              .setLngLat(nearest.geometry.coordinates as [number, number])
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-bold">${nearest.properties.icon} ${nearest.properties.name}</h3>
                  <p class="text-sm text-gray-600">🚗 ${t('map.distance')}: ${distanceKm} km</p>
                  <p class="text-sm text-gray-600">⏱️ ${durationMin} min</p>
                </div>
              `)
              .addTo(map.current);
          } else {
            throw new Error('OSRM routing failed');
          }
        } else {
          // For walking, show straight line with accurate distance
          // Calculate Haversine distance
          const R = 6371; // Earth's radius in km
          const dLat = (nearest.geometry.coordinates[1] - userLat) * Math.PI / 180;
          const dLon = (nearest.geometry.coordinates[0] - userLon) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLat * Math.PI / 180) * Math.cos(nearest.geometry.coordinates[1] * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceKm = (R * c).toFixed(2);
          const walkingSpeedKmH = 5; // Average walking speed
          const durationMin = Math.round((R * c / walkingSpeedKmH) * 60);

          const routeData = {
            type: 'FeatureCollection' as const,
            features: [{
              type: 'Feature' as const,
              geometry: {
                type: 'LineString' as const,
                coordinates: [userLocation, nearest.geometry.coordinates]
              },
              properties: {}
            }]
          };

          const routeSource = map.current.getSource('route') as maplibregl.GeoJSONSource;
          if (routeSource) {
            routeSource.setData(routeData);
          }

          const bounds = new maplibregl.LngLatBounds();
          bounds.extend(userLocation);
          bounds.extend(nearest.geometry.coordinates as [number, number]);
          map.current.fitBounds(bounds, { padding: 100 });

          new maplibregl.Popup()
            .setLngLat(nearest.geometry.coordinates as [number, number])
            .setHTML(`
              <div class="p-2">
                <h3 class="font-bold">${nearest.properties.icon} ${nearest.properties.name}</h3>
                <p class="text-sm text-gray-600">🚶 ${t('map.distance')}: ${distanceKm} km (прямая)</p>
                <p class="text-sm text-gray-600">⏱️ ~${durationMin} min</p>
              </div>
            `)
            .addTo(map.current);
        }
      } catch (error) {
        console.error('Routing error:', error);
        // Fallback to straight line
        const R = 6371;
        const dLat = (nearest.geometry.coordinates[1] - userLat) * Math.PI / 180;
        const dLon = (nearest.geometry.coordinates[0] - userLon) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(userLat * Math.PI / 180) * Math.cos(nearest.geometry.coordinates[1] * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = (R * c).toFixed(2);
        setError('Failed to calculate route');
      } finally {
        setLoading(false);
      }
    }
  }, [userLocation, pois, transportMode, t]);

  // Fetch POIs
  const fetchPois = useCallback(async () => {
    if (!map.current) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/pois?city=${city.slug}&type=${selectedLayer}`);

      if (res.status === 429) {
        setError(t('map.rateLimit'));
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

      if (!data.features) {
        setPois({ type: 'FeatureCollection', features: [], fetchedAt: new Date().toISOString() });
        return;
      }

      const validFeatures = data.features.filter(f => {
        const coords = f.geometry.coordinates;
        return coords.length === 2;
      });

      const currentLayer = POI_LAYERS.find(l => l.id === selectedLayer);
      const icon = currentLayer?.icon || '•';
      const color = currentLayer?.color || '#3b82f6';

      const validData = {
        ...data,
        features: validFeatures.map(f => ({
          ...f,
          properties: {
            ...f.properties,
            icon: icon,
            color: color
          }
        }))
      };

      setPois(validData);

      const source = map.current.getSource('pois');
      if (source) {
        (source as maplibregl.GeoJSONSource).setData(validData);

        if (validFeatures.length > 0) {
          const bounds = new maplibregl.LngLatBounds();
          validFeatures.forEach((f) => {
            bounds.extend(f.geometry.coordinates as [number, number]);
          });
          map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        }
      }
    } catch (error) {
      console.error('[Map] Failed to fetch POIs:', error);
      setError(t('map.loading'));
    } finally {
      setLoading(false);
    }
  }, [city.slug, selectedLayer, t]);

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
      'clinics': t('map.clinics'),
    };
    return layerMap[layerId] || layerId;
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-white/20">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            <span className="font-semibold text-sm sm:text-base">{t('map.title')}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={selectedLayer}
            onChange={(e) => setSelectedLayer(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/50 border border-white/30 text-sm w-full sm:w-auto"
          >
            {POI_LAYERS.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.icon} {getLocalizedLayerName(layer.id)}
              </option>
            ))}
          </select>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex gap-1 bg-white/50 rounded-lg p-1">
              <button
                onClick={() => setTransportMode('walking')}
                className={`px-3 py-2 rounded transition-colors ${transportMode === 'walking'
                  ? 'bg-blue-500 text-white'
                  : 'bg-transparent text-gray-600 hover:bg-white/50'
                  }`}
                title={t('map.walking')}
              >
                <PersonStanding className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTransportMode('driving')}
                className={`px-3 py-2 rounded transition-colors ${transportMode === 'driving'
                  ? 'bg-blue-500 text-white'
                  : 'bg-transparent text-gray-600 hover:bg-white/50'
                  }`}
                title={t('map.driving')}
              >
                <Car className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={findNearest}
              disabled={!userLocation || !pois?.features.length || loading}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap"
              title={t('map.findNearest')}
            >
              <Navigation className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">{t('map.findNearest')}</span>
            </button>
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
      </div>
      <div ref={mapContainer} className="h-[400px] sm:h-[500px] w-full" />
      {error && (
        <div className="p-3 text-xs sm:text-sm text-red-600 border-t border-white/20 bg-red-50">
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
