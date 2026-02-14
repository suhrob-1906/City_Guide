'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { City } from '@/config/cities';
import { POI_LAYERS } from '@/config/layers';
import { PoiCollection } from '@/lib/fetchers/overpass';
import { RefreshCw, Layers, Navigation, Car, PersonStanding, MapPin, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/lib/language';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getRoute, calculateStraightLine } from '@/lib/fetchers/openroute';
import { NavigationOverlay } from './NavigationOverlay';

export default function MapView({ city }: { city: City }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const [selectedLayer, setSelectedLayer] = useState(POI_LAYERS[0].id);
  const [loading, setLoading] = useState(false);
  const [pois, setPois] = useState<PoiCollection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitWait, setRateLimitWait] = useState(0);
  const [nearestPOI, setNearestPOI] = useState<any | null>(null);
  const [transportMode, setTransportMode] = useState<'driving' | 'walking'>('walking');
  const { t } = useLanguage();
  const refreshTick = useAutoRefresh(600000); // 10 minutes
  const { location: userLocation, permissionState, requestLocation, error: geoError, isLoading: geoLoading } = useGeolocation();

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

  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [lastSpokenIndex, setLastSpokenIndex] = useState(-1);
  // Navigation State
  const [navInstruction, setNavInstruction] = useState('');
  const [navDistance, setNavDistance] = useState(0);
  const [navType, setNavType] = useState(0);
  const [showNavOverlay, setShowNavOverlay] = useState(false);

  const speechSynth = useRef<SpeechSynthesis | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynth.current = window.speechSynthesis;
    }
  }, []);

  // Speak instruction
  const speak = useCallback((text: string) => {
    if (!speechSynth.current || !isAudioEnabled) return;

    // Cancel current speech to prevent queue buildup
    speechSynth.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Try to set Russian voice if available, otherwise default
    const voices = speechSynth.current.getVoices();
    const ruVoice = voices.find(v => v.lang.includes('ru'));
    if (ruVoice) utterance.voice = ruVoice;

    speechSynth.current.speak(utterance);
  }, [isAudioEnabled]);

  // Update user location marker on map and center map
  useEffect(() => {
    if (!map.current || !userLocation) return;

    // Remove existing marker if any
    if (userMarker.current) {
      userMarker.current.remove();
    }

    // Create new marker for user location
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#4285F4';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 10px rgba(66, 133, 244, 0.5)';
    // Add direction indicator if heading is available (advanced)

    userMarker.current = new maplibregl.Marker({ element: el })
      .setLngLat(userLocation)
      .addTo(map.current);

    // console.log('[Map] User location marker updated:', userLocation);

    // Check for navigation instructions
    // Check for navigation instructions
    if (routeSteps.length > 0) {
      let nextStepIndex = -1;
      let minDist = Infinity;

      // Find the next relevant step (simple nearest logic for now)
      // In a real app, we'd project position onto the route line
      for (let i = lastSpokenIndex + 1; i < routeSteps.length; i++) {
        const step = routeSteps[i];
        const stepLoc = step.way_points;
        const dist = calculateStraightLine(userLocation, stepLoc as [number, number]).distance;

        // If we are very close to a step, it's the current one
        if (dist < minDist) {
          minDist = dist;
          nextStepIndex = i;
        }
      }

      if (nextStepIndex !== -1) {
        const step = routeSteps[nextStepIndex];
        const stepLoc = step.way_points;
        const dist = calculateStraightLine(userLocation, stepLoc as [number, number]).distance;

        // Localize instruction
        let localizedInstruction = step.instruction;
        const instrLower = String(step.instruction).toLowerCase();

        if (instrLower.includes('arrive') || instrLower.includes('dest')) localizedInstruction = t('nav.arrive');
        else if (instrLower.includes('sharp right') || instrLower.includes('резко направо')) localizedInstruction = t('nav.turnSharpRight');
        else if (instrLower.includes('sharp left') || instrLower.includes('резко налево')) localizedInstruction = t('nav.turnSharpLeft');
        else if (instrLower.includes('slight right') || instrLower.includes('правее')) localizedInstruction = t('nav.turnSlightRight');
        else if (instrLower.includes('slight left') || instrLower.includes('левее')) localizedInstruction = t('nav.turnSlightLeft');
        else if (instrLower.includes('right') || instrLower.includes('направо')) localizedInstruction = t('nav.turnRight');
        else if (instrLower.includes('left') || instrLower.includes('налево')) localizedInstruction = t('nav.turnLeft');
        else if (instrLower.includes('u-turn') || instrLower.includes('разворот')) localizedInstruction = t('nav.uTurn');
        else if (instrLower.includes('straight') || instrLower.includes('прямо')) localizedInstruction = t('nav.straight');
        else if (instrLower.includes('roundabout') || instrLower.includes('кругов')) localizedInstruction = t('nav.roundabout');
        else if (instrLower.includes('head to') || instrLower.includes('направляйтесь к')) localizedInstruction = t('nav.depart');
        else if (instrLower.includes('north') && instrLower.includes('east') || instrLower.includes('северо-восток')) localizedInstruction = t('nav.headNE');
        else if (instrLower.includes('north') && instrLower.includes('west') || instrLower.includes('северо-запад')) localizedInstruction = t('nav.headNW');
        else if (instrLower.includes('south') && instrLower.includes('east') || instrLower.includes('юго-восток')) localizedInstruction = t('nav.headSE');
        else if (instrLower.includes('south') && instrLower.includes('west') || instrLower.includes('юго-запад')) localizedInstruction = t('nav.headSW');
        else if (instrLower.includes('north') || instrLower.includes('север')) localizedInstruction = t('nav.headNorth');
        else if (instrLower.includes('south') || instrLower.includes('юг')) localizedInstruction = t('nav.headSouth');
        else if (instrLower.includes('east') || instrLower.includes('восток')) localizedInstruction = t('nav.headEast');
        else if (instrLower.includes('west') || instrLower.includes('запад')) localizedInstruction = t('nav.headWest');

        setNavInstruction(localizedInstruction);
        setNavDistance(dist);
        setNavType(typeof step.instruction === 'number' ? step.instruction : 0);
        setShowNavOverlay(true);

        if (isAudioEnabled) {
          // Logic for announcements
          // 1. Pre-announce at 300m (if not spoken yet)
          // 2. Announce at 50m (turn now)

          if (dist < 50 && lastSpokenIndex < nextStepIndex) {
            // Speak translated text
            speak(localizedInstruction);
            setLastSpokenIndex(nextStepIndex);
          } else if (dist < 300 && dist > 250 && lastSpokenIndex < nextStepIndex - 0.5) {
            // Pre-announcement: "In 300 meters, turn right"
            const lang = typeof window !== 'undefined' ? localStorage.getItem('language') : 'en';
            const prefix = lang === 'ru' ? 'Через 300 метров ' : 'In 300 meters ';
            speak(prefix + localizedInstruction);
            setLastSpokenIndex(nextStepIndex - 0.5); // Use fractional index to mark pre-announcement
          }
        }
      }
    }
  }, [userLocation, routeSteps, isAudioEnabled, lastSpokenIndex, speak, t]);

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
        'line-width': 5,
        'line-opacity': 0.8,
      },
      filter: ['!=', 'mode', 'walking']
    });

    map.current.addLayer({
      id: 'route-line-walking',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 5,
        'line-opacity': 0.8,
        'line-dasharray': [0, 2], // Dotted line
      },
      filter: ['==', 'mode', 'walking']
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
                properties: { mode: 'driving' }
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
          // For walking, use OpenRouteService API for real pedestrian routing
          try {
            const route = await getRoute({
              start: [userLon, userLat],
              end: nearest.geometry.coordinates,
              profile: 'foot-walking',
            });

            if (route) {
              // Successfully got pedestrian route from API
              const routeData = {
                type: 'FeatureCollection' as const,
                features: [{
                  type: 'Feature' as const,
                  geometry: route.geometry,
                  properties: { mode: 'walking' }
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

              setRouteSteps(route.steps || []);


              new maplibregl.Popup()
                .setLngLat(nearest.geometry.coordinates as [number, number])
                .setHTML(`
                  <div class="p-2">
                    <h3 class="font-bold">${nearest.properties.icon} ${nearest.properties.name}</h3>
                    <p class="text-sm text-gray-600">🚶 ${t('map.distance')}: ${distanceKm} km</p>
                    <p class="text-sm text-gray-600">⏱️ ${durationMin} min</p>
                  </div>
                `)
                .addTo(map.current);
            } else {
              // Fallback to straight-line if API fails
              console.warn('[Map] OpenRouteService failed, using straight-line fallback');
              const fallbackRoute = calculateStraightLine(
                [userLon, userLat],
                nearest.geometry.coordinates
              );

              const routeData = {
                type: 'FeatureCollection' as const,
                features: [{
                  type: 'Feature' as const,
                  geometry: fallbackRoute.geometry,
                  properties: { mode: 'walking' }
                }]
              };

              const routeSource = map.current.getSource('route') as maplibregl.GeoJSONSource;
              if (routeSource) {
                routeSource.setData(routeData);
              }

              // Fallback guide
              setRouteSteps([{
                instruction: 'Направляйтесь к точке назначения',
                distance: fallbackRoute.distance,
                duration: fallbackRoute.duration,
                type: 0,
                name: 'Destination',
                way_points: nearest.geometry.coordinates as [number, number]
              }]);

              const bounds = new maplibregl.LngLatBounds();
              bounds.extend(userLocation);
              bounds.extend(nearest.geometry.coordinates as [number, number]);
              map.current.fitBounds(bounds, { padding: 100 });

              const distanceKm = (fallbackRoute.distance / 1000).toFixed(2);
              const durationMin = Math.round(fallbackRoute.duration / 60);

              new maplibregl.Popup()
                .setLngLat(nearest.geometry.coordinates as [number, number])
                .setHTML(`
                  <div class="p-2">
                    <h3 class="font-bold">${nearest.properties.icon} ${nearest.properties.name}</h3>
                    <p class="text-sm text-gray-600">🚶 ${t('map.distance')}: ${distanceKm} km (${t('map.straightLine')})</p>
                    <p class="text-sm text-gray-600">⏱️ ~${durationMin} min</p>
                  </div>
                `)
                .addTo(map.current);
            }
          } catch (error) {
            console.error('[Map] Pedestrian routing error:', error);
            // Use straight-line as final fallback
            const fallbackRoute = calculateStraightLine(
              [userLon, userLat],
              nearest.geometry.coordinates
            );

            const routeData = {
              type: 'FeatureCollection' as const,
              features: [{
                type: 'Feature' as const,
                geometry: fallbackRoute.geometry,
                properties: { mode: 'walking' }
              }]
            };

            const routeSource = map.current.getSource('route') as maplibregl.GeoJSONSource;
            if (routeSource) {
              routeSource.setData(routeData);
            }

            // Fallback guide
            setRouteSteps([{
              instruction: 'Направляйтесь к точке назначения',
              distance: fallbackRoute.distance,
              duration: fallbackRoute.duration,
              type: 0,
              name: 'Destination',
              way_points: nearest.geometry.coordinates as [number, number]
            }]);

            const bounds = new maplibregl.LngLatBounds();
            bounds.extend(userLocation);
            bounds.extend(nearest.geometry.coordinates as [number, number]);
            map.current.fitBounds(bounds, { padding: 100 });

            const distanceKm = (fallbackRoute.distance / 1000).toFixed(2);
            const durationMin = Math.round(fallbackRoute.distance / 60);

            new maplibregl.Popup()
              .setLngLat(nearest.geometry.coordinates as [number, number])
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-bold">${nearest.properties.icon} ${nearest.properties.name}</h3>
                  <p class="text-sm text-gray-600">🚶 ${t('map.distance')}: ${distanceKm} km (${t('map.straightLine')})</p>
                  <p class="text-sm text-gray-600">⏱️ ~${durationMin} min</p>
                </div>
              `)
              .addTo(map.current);
          }
        }
      } catch (error) {
        console.error('Routing error:', error);
        setError('Failed to calculate route');
      } finally {
        setLoading(false);
      }
    }
  }, [userLocation, pois, transportMode, t]);

  // Auto-recalculate route when transport mode changes
  useEffect(() => {
    if (userLocation && pois?.features.length) {
      findNearest();
    }
  }, [transportMode, userLocation, pois]); // Dependencies triggering update

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

      if (!map.current) return;

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
      'scooters': t('map.scooters'),
    };
    return layerMap[layerId] || layerId;
  };

  return (
    <div className="glass rounded-2xl overflow-hidden relative">

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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Enable Location Button */}
            <button
              onClick={requestLocation}
              disabled={permissionState === 'granted' || permissionState === 'unavailable' || geoLoading}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium whitespace-nowrap ${permissionState === 'granted'
                ? 'bg-green-500 text-white cursor-default'
                : permissionState === 'denied'
                  ? 'bg-red-500 text-white cursor-not-allowed'
                  : permissionState === 'unavailable'
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              title={
                permissionState === 'denied'
                  ? 'Location access denied. Please enable in browser settings.'
                  : permissionState === 'unavailable'
                    ? 'Geolocation not supported by your browser'
                    : geoError || t('map.enableLocation')
              }
            >
              <MapPin className={`w-4 h-4 ${geoLoading ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">
                {permissionState === 'granted'
                  ? t('map.locationEnabled')
                  : permissionState === 'denied'
                    ? t('map.locationDenied')
                    : permissionState === 'unavailable'
                      ? t('map.locationUnavailable')
                      : geoLoading
                        ? 'Loading...'
                        : t('map.enableLocation')}
              </span>
            </button>
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
              <button
                onClick={() => setIsAudioEnabled(!isAudioEnabled)}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm ${isAudioEnabled ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
                title={isAudioEnabled ? "Disable Voice Guidance" : "Enable Voice Guidance"}
              >
                {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                <span className="text-sm font-medium hidden sm:inline">{isAudioEnabled ? t('nav.voiceOn') : t('nav.voiceOff')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="relative w-full">
        <NavigationOverlay
          instruction={navInstruction}
          distance={navDistance}
          type={navType}
          isVisible={showNavOverlay && routeSteps.length > 0}
        />
        <div ref={mapContainer} className="h-[400px] sm:h-[500px] w-full" />
      </div>
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
