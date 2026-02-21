'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { City } from '@/config/cities';
import { POI_LAYERS } from '@/config/layers';
import { RefreshCw, Layers, Navigation, MapPin, Volume2, VolumeX, PersonStanding, Car, Target, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '@/lib/language';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapSetup } from '@/hooks/useMapSetup';
import { usePoiData } from '@/hooks/usePoiData';
import { useRouting } from '@/hooks/useRouting';
import { NavigationOverlay } from './NavigationOverlay';
import { calculateStraightLine } from '@/lib/fetchers/openroute';

export default function MapView({ city }: { city: City }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const activePopupData = useRef<any>(null);

  // State
  const [selectedLayer, setSelectedLayer] = useState(POI_LAYERS[0].id);
  const [transportMode, setTransportMode] = useState<'driving' | 'walking'>('walking');
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [showNavOverlay, setShowNavOverlay] = useState(false);
  const [navInstruction, setNavInstruction] = useState<string>('');
  const [navDistance, setNavDistance] = useState<number>(0);
  const [lastSpokenIndex, setLastSpokenIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  // Hooks
  const { t, language } = useLanguage();
  const { tick: refreshTick, lastUpdate } = useAutoRefresh(60000); // 1 minute

  const { location: userLocation, permissionState, requestLocation, stopWatching, error: geoError, isLoading: geoLoading } = useGeolocation();
  const { map, isMapReady } = useMapSetup(mapContainer, city);
  const { pois, isLoadingPois, poiError, rateLimitWait, fetchPois } = usePoiData(city.slug, selectedLayer);
  const { route, steps, distance: routeDistance, duration, calculateRoute, getRouteInfo, resetRoute } = useRouting();

  const speechSynth = useRef<SpeechSynthesis | null>(null);

  // Initialize speech
  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynth.current = window.speechSynthesis;
    }
  }, []);

  // Speak instruction
  const speak = useCallback((text: string) => {
    if (!speechSynth.current || !isAudioEnabled) return;
    speechSynth.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speechSynth.current.getVoices();
    const ruVoice = voices.find(v => v.lang.includes('ru'));
    if (ruVoice) utterance.voice = ruVoice;
    speechSynth.current.speak(utterance);
  }, [isAudioEnabled]);

  // Update POIs on map
  useEffect(() => {
    if (!map.current || !isMapReady || !pois) return;

    console.log('[MapView] Updating POIs:', {
      featureCount: pois.features.length,
      selectedLayer,
      sampleFeature: pois.features[0]
    });

    const source = map.current.getSource('pois') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(pois);
      console.log('[MapView] POI data set to map source');

      // Only auto-fit bounds for reasonable dataset sizes
      if (pois.features.length > 0 && pois.features.length < 500) {
        const bounds = new maplibregl.LngLatBounds();
        pois.features.forEach(f => bounds.extend(f.geometry.coordinates as [number, number]));
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
        console.log('[MapView] Fitted bounds to POIs');
      } else if (pois.features.length >= 500) {
        console.log('[MapView] Too many POIs to auto-fit bounds, keeping current view');
      }
    } else {
      console.error('[MapView] POI source not found on map!');
    }
  }, [pois, isMapReady, map, selectedLayer]);

  // Update route on map
  useEffect(() => {
    if (!map.current || !isMapReady || !route) return;

    const source = map.current.getSource('route') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(route);
    }
  }, [route, isMapReady, map]);

  // Update user marker
  useEffect(() => {
    if (!map.current || !userLocation) return;

    if (userMarker.current) {
      userMarker.current.remove();
    }

    const el = document.createElement('div');
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#4285F4';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 10px rgba(66, 133, 244, 0.5)';

    userMarker.current = new maplibregl.Marker({ element: el })
      .setLngLat(userLocation)
      .addTo(map.current);
  }, [userLocation, map]);

  // Localize navigation instruction (used for inline MapView text and TTS)
  const localizeInstruction = useCallback((instruction: string, mode: 'walking' | 'driving' = 'walking'): string => {
    if (language === 'en') {
      const instrLower = String(instruction || '').toLowerCase().trim();
      if (!instrLower) return mode === 'walking' ? 'Walk straight' : 'Drive straight';
      if (instrLower === 'turn' || instrLower.includes('merge') || instrLower.includes('notification') || instrLower.includes('new name')) {
        return mode === 'walking' ? 'Walk straight' : 'Drive straight';
      }
      // Pass through existing English if it looks valid
      return instruction;
    }

    const instrLower = String(instruction || '').toLowerCase().trim();
    if (!instrLower) return mode === 'walking' ? 'Идти прямо' : 'Ехать прямо';

    const straight = mode === 'walking' ? 'Идти прямо' : 'Ехать прямо';

    if (instrLower.includes('arrive') || instrLower.includes('dest')) return t('nav.arrive');
    if (instrLower.includes('u-turn') || instrLower.includes('разворот')) return t('nav.uTurn');
    if (instrLower.includes('sharp right')) return t('nav.turnSharpRight');
    if (instrLower.includes('sharp left')) return t('nav.turnSharpLeft');
    if (instrLower.includes('slight right') || instrLower.includes('bear right') || instrLower.includes('keep right')) return t('nav.turnSlightRight');
    if (instrLower.includes('slight left') || instrLower.includes('bear left') || instrLower.includes('keep left')) return t('nav.turnSlightLeft');
    if (instrLower.includes('right') || instrLower.includes('направо')) return t('nav.turnRight');
    if (instrLower.includes('left') || instrLower.includes('налево')) return t('nav.turnLeft');
    if (instrLower.includes('roundabout') || instrLower.includes('кругов')) return t('nav.roundabout');
    if (instrLower.includes('straight') || instrLower.includes('continue') || instrLower.includes('прямо')) return straight;
    if (instrLower.includes('north') && instrLower.includes('east')) return t('nav.headNE');
    if (instrLower.includes('north') && instrLower.includes('west')) return t('nav.headNW');
    if (instrLower.includes('south') && instrLower.includes('east')) return t('nav.headSE');
    if (instrLower.includes('south') && instrLower.includes('west')) return t('nav.headSW');
    if (instrLower.includes('north') || instrLower.includes('север')) return t('nav.headNorth');
    if (instrLower.includes('south') || instrLower.includes('юг')) return t('nav.headSouth');
    if (instrLower.includes('east') || instrLower.includes('восток')) return t('nav.headEast');
    if (instrLower.includes('west') || instrLower.includes('запад')) return t('nav.headWest');
    if (instrLower.includes('head') || instrLower.includes('depart') || instrLower.includes('start')) return t('nav.depart');
    if (instrLower.includes('merge')) return straight;
    if (instrLower.includes('fork')) return t('nav.turnSlightRight');
    if (instrLower.includes('notification') || instrLower.includes('new name')) return straight;
    if (instrLower === 'turn') return straight;
    return straight;
  }, [t, language]);

  // Navigation instructions
  useEffect(() => {
    if (!userLocation || steps.length === 0) return;

    let nextStepIndex = -1;
    let minDist = Infinity;

    for (let i = lastSpokenIndex + 1; i < steps.length; i++) {
      const step = steps[i];
      // Support BOTH ORS format (way_points) and OSRM format (maneuver.location)
      const stepLoc: [number, number] | null =
        step.maneuver?.location ? step.maneuver.location :
          (Array.isArray(step.way_points) && step.way_points.length >= 2) ? step.way_points : null;

      if (!stepLoc || (stepLoc[0] === 0 && stepLoc[1] === 0)) continue;

      const dist = calculateStraightLine(userLocation, stepLoc).distance;
      if (dist < minDist) {
        minDist = dist;
        nextStepIndex = i;
      }
    }

    if (nextStepIndex !== -1) {
      const step = steps[nextStepIndex];
      const stepLoc: [number, number] | null =
        step.maneuver?.location ? step.maneuver.location :
          (Array.isArray(step.way_points) && step.way_points.length >= 2) ? step.way_points : null;

      if (stepLoc && (stepLoc[0] !== 0 || stepLoc[1] !== 0)) {
        const dist = calculateStraightLine(userLocation, stepLoc).distance;
        // Support ORS (step.instruction) and OSRM (maneuver.type + maneuver.modifier gives direction)
        const rawInstruction =
          step.instruction ||
          step.maneuver?.instruction ||
          (step.maneuver?.type
            ? `${step.maneuver.type} ${step.maneuver?.modifier || ''}`.trim()
            : '') ||
          '';

        // Skip 'depart' step — it's always first and means "you haven't moved yet"
        const maneuverType = (step.maneuver?.type || '').toLowerCase();
        if (maneuverType === 'depart' || rawInstruction.toLowerCase().startsWith('depart') || rawInstruction.toLowerCase() === 'head') {
          return;
        }

        const localizedInstruction = localizeInstruction(rawInstruction, transportMode);

        // Don't show "Направляйтесь к точке" as ongoing nav instruction
        if (localizedInstruction === t('nav.depart') || localizedInstruction === t('nav.fallback')) return;

        // Pass RAW instruction to NavigationOverlay. NavigationOverlay uses formatGuidebookInstruction
        // internally, which handles both English and Russian mapping.
        setNavInstruction(rawInstruction);
        setNavDistance(dist);
        setShowNavOverlay(true);

        if (isAudioEnabled) {
          if (dist < 30 && lastSpokenIndex < nextStepIndex) {
            speak(localizedInstruction);
            setLastSpokenIndex(nextStepIndex);
          }
        }
      }
    }
  }, [userLocation, steps, isAudioEnabled, lastSpokenIndex, language, t, speak, localizeInstruction]);

  // Reset nav overlay when transport mode changes to avoid stale 'Вы прибыли'
  useEffect(() => {
    setNavInstruction('');
    setShowNavOverlay(false);
    setLastSpokenIndex(-1);
  }, [transportMode]);

  // Show route preview immediately when steps load (first non-depart step)
  useEffect(() => {
    if (!steps || steps.length === 0) {
      setShowNavOverlay(false);
      return;
    }

    // Find first non-depart, non-arrive step
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const mType = (step.maneuver?.type || '').toLowerCase();
      if (mType === 'depart') continue;

      const rawInstruction =
        step.instruction ||
        step.maneuver?.instruction ||
        (step.maneuver?.type
          ? `${step.maneuver.type} ${step.maneuver?.modifier || ''}`.trim()
          : '') ||
        '';

      if (rawInstruction.toLowerCase().startsWith('depart')) continue;

      const localizedBase = localizeInstruction(rawInstruction, transportMode);
      if (localizedBase === t('nav.depart') || localizedBase === t('nav.fallback')) continue;

      // Compute distance to this step
      const stepLoc: [number, number] | null =
        step.maneuver?.location ? step.maneuver.location :
          (Array.isArray(step.way_points) && step.way_points.length >= 2) ? step.way_points : null;

      let distStr = '';
      if (stepLoc && userLocation) {
        const distM = calculateStraightLine(userLocation, stepLoc).distance;
        distStr = language === 'en'
          ? (distM < 1000 ? ` in ${Math.round(distM)} m` : ` in ${(distM / 1000).toFixed(1)} km`)
          : (distM < 1000 ? ` через ${Math.round(distM)} м` : ` через ${(distM / 1000).toFixed(1)} км`);
      }

      setNavInstruction(`${localizedBase}${distStr}`);
      setNavDistance(stepLoc && userLocation ? calculateStraightLine(userLocation, stepLoc).distance : 0);
      setShowNavOverlay(true);
      break;
    }
  }, [steps, transportMode, userLocation, localizeInstruction, t]);

  // Re-calculate route when transport mode changes
  useEffect(() => {
    if (userLocation && destination) {
      calculateRoute(userLocation, destination, transportMode).then((result) => {
        if (activePopupRef.current && activePopupData.current && result) {
          const distanceKm = (result.distance / 1000).toFixed(2);
          const durationMin = Math.round(result.duration / 60);
          const isStraightLine = (result.steps || []).length === 0;

          const { type, title, subtitle } = activePopupData.current;
          const transportIcon = transportMode === 'walking' ? '🚶' : '🚗';

          let html = '';
          if (type === 'map') {
            html = `
                <div class="p-2 min-w-[200px]">
                 <div class="font-bold text-sm mb-2">📍 ${title}</div>
                 <div class="border-t border-gray-100 pt-2">
                      <p class="text-sm text-gray-600 font-medium flex items-center gap-1">
                          ${transportIcon} ${distanceKm} ${t('nav.kilometers')}
                      </p>
                      <p class="text-xs text-gray-500 flex items-center gap-1">
                          ⏱️ ${durationMin} min
                      </p>
                 </div>
                 ${isStraightLine ? '<div class="text-xs text-orange-500 mt-1 italic">(' + t('map.straightLine') + ')</div>' : ''}
              </div>
              `;
          } else {
            html = `
                <div class="p-2 min-w-[220px]">
                  <h3 class="font-bold text-lg mb-1 leading-tight">${title}</h3>
                  <p class="text-sm text-gray-500 mb-2">${subtitle}</p>
                  <div class="text-xs text-blue-600 font-medium">
                    ${userLocation ? '' : t('map.noLocation')}
                  </div>
                  <div class="mt-2 pt-2 border-t border-gray-100">
                        <p class="text-sm text-gray-600 font-medium flex items-center gap-1">
                            ${transportIcon} ${distanceKm} ${t('nav.kilometers')}
                        </p>
                        <p class="text-sm text-gray-500 flex items-center gap-1">
                            ⏱️ ${durationMin} min
                        </p>
                  </div>
                </div>
              `;
          }
          activePopupRef.current.setHTML(html);
        }
      });
    }
  }, [transportMode, destination, userLocation, calculateRoute, t]);

  // Find nearest POI and calculate route
  const findNearest = useCallback(async () => {
    if (!userLocation || !pois || pois.features.length === 0) {
      return;
    }

    const [userLon, userLat] = userLocation;
    let nearest: any = null;
    let minDistance = Infinity;

    pois.features.forEach((poi: any) => {
      const [poiLon, poiLat] = poi.geometry.coordinates;
      // Use proper distance calculation instead of simple pythagoras 
      const distance = calculateStraightLine(userLocation, [poiLon, poiLat]).distance;

      if (distance < minDistance) {
        minDistance = distance;
        nearest = poi;
      }
    });

    if (nearest && map.current) {
      setDestination(nearest.geometry.coordinates as [number, number]);
      const result = await calculateRoute(userLocation, nearest.geometry.coordinates as [number, number], transportMode);

      // Re-check map.current after async operation
      if (!map.current || !result) return;

      const distanceKm = (result.distance / 1000).toFixed(2);
      const durationMin = Math.round(result.duration / 60);

      const pName = language === 'ru' && nearest.properties.nameRu ? nearest.properties.nameRu : (language === 'en' && nearest.properties.nameEn ? nearest.properties.nameEn : nearest.properties.name);
      const nearestName = pName && pName !== 'Unnamed' ? pName : (t(`map.${nearest.properties.layerId || nearest.properties.type}`) || t('map.customDestination'));

      const bounds = new maplibregl.LngLatBounds();
      bounds.extend(userLocation);
      bounds.extend(nearest.geometry.coordinates as [number, number]);

      try {
        map.current.fitBounds(bounds, { padding: 100 });
      } catch (e) {
        console.warn('Error fitting bounds:', e);
      }

      const popup = new maplibregl.Popup()
        .setLngLat(nearest.geometry.coordinates as [number, number])
        .setHTML(`
          <div class="p-2 min-w-[200px]">
            <h3 class="font-bold text-lg mb-1 leading-tight">${nearest.properties.icon || ''} ${nearestName}</h3>
            <p class="text-sm text-gray-500 mb-2">${nearest.properties.layerId ? t(`map.${nearest.properties.layerId}`) : (nearest.properties.amenity ? (t(`map.${nearest.properties.amenity}`) || nearest.properties.amenity) : '')}</p>
            <div class="mt-2 pt-2 border-t border-gray-100">
                  <p class="text-sm text-gray-600 font-medium flex items-center gap-1">
                      ${transportMode === 'walking' ? '🚶' : '🚗'} ${distanceKm} ${t('nav.kilometers')}
                  </p>
                  <p class="text-sm text-gray-500 flex items-center gap-1">
                      ⏱️ ${durationMin} min
                  </p>
            </div>
          </div>
        `)
        .addTo(map.current);

      if (activePopupRef.current) activePopupRef.current.remove();
      activePopupRef.current = popup;
      activePopupData.current = {
        type: 'poi',
        title: `${nearest.properties.icon || ''} ${nearestName}`,
        subtitle: nearest.properties.layerId ? t(`map.${nearest.properties.layerId}`) : (nearest.properties.amenity ? (t(`map.${nearest.properties.amenity}`) || nearest.properties.amenity) : '')
      };
    }
  }, [userLocation, pois, transportMode, calculateRoute, routeDistance, duration, t, map]);

  // Setup POI click handlers
  useEffect(() => {
    if (!map.current || !isMapReady) return;

    const mapInstance = map.current;

    const handleClick = async (e: any) => {
      if (!e.features || !e.features[0]) return;

      const coordinates = e.features[0].geometry.coordinates.slice();
      const props = e.features[0].properties;

      // Ensure we click the specific POI
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      // Localization aware name
      let poiName = language === 'ru' && props.nameRu ? props.nameRu : (language === 'en' && props.nameEn ? props.nameEn : props.name);

      if (!poiName || poiName === 'Unnamed') {
        poiName = t(`map.${props.layerId || props.type}`) || t('map.customDestination');
      }
      let routeInfo = '';

      // Calculate route immediately on click
      if (userLocation) {
        console.log('Calculating route to clicked POI...');
        setDestination(coordinates as [number, number]);

        // Use the RETURNED value, not state (which is stale in this closure)
        const result = await calculateRoute(userLocation, coordinates as [number, number], transportMode);

        if (result) {
          const distanceKm = (result.distance / 1000).toFixed(2);
          const durationMin = Math.round(result.duration / 60);

          routeInfo = `
                <div class="mt-2 pt-2 border-t border-gray-100">
                      <p class="text-sm text-gray-600 font-medium flex items-center gap-1">
                          ${transportMode === 'walking' ? '🚶' : '🚗'} ${distanceKm} ${t('nav.kilometers')}
                      </p>
                      <p class="text-sm text-gray-500 flex items-center gap-1">
                          ⏱️ ${durationMin} min
                      </p>
                </div>
            `;
        }
      }

      const popup = new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="p-2 min-w-[220px]">
            <h3 class="font-bold text-lg mb-1 leading-tight">${poiName}</h3>
            <p class="text-sm text-gray-500 mb-2">${props.layerId ? t(`map.${props.layerId}`) : (props.amenity ? t(`map.${props.amenity}`) || props.amenity : '')}</p>
            <div class="text-xs text-blue-600 font-medium">
              ${userLocation ? '' : t('map.noLocation')}
            </div>
            ${routeInfo}
          </div>
        `)
        .addTo(mapInstance);

      if (activePopupRef.current) activePopupRef.current.remove();
      activePopupRef.current = popup;
      activePopupData.current = {
        type: 'poi',
        title: poiName,
        subtitle: props.layerId ? t(`map.${props.layerId}`) : (props.amenity ? t(`map.${props.amenity}`) || props.amenity : '')
      };
    };

    mapInstance.on('click', 'poi-layer', handleClick);

    // Change cursor on hover
    const onMouseEnter = () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    };
    const onMouseLeave = () => {
      mapInstance.getCanvas().style.cursor = '';
    };

    mapInstance.on('mouseenter', 'poi-layer', onMouseEnter);
    mapInstance.on('mouseleave', 'poi-layer', onMouseLeave);

    // Handle missing images by generating a fallback marker on the fly
    mapInstance.on('styleimagemissing', (e) => {
      const id = e.id;
      if (!mapInstance.hasImage(id)) {
        // Generate a blue dot marker using canvas
        const width = 15;
        const height = 15;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, width / 2 - 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#4285F4'; // Google Blue
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();

          const imageData = ctx.getImageData(0, 0, width, height);
          mapInstance.addImage(id, {
            width: width,
            height: height,
            data: imageData.data
          });
        }
      }
    });

    // Handle click on map background (not on a POI)
    const handleMapClick = async (e: any) => {
      // Ignore if clicking on a POI (handled by other listener)
      const features = mapInstance.queryRenderedFeatures(e.point, { layers: ['poi-layer'] });
      if (features.length > 0) return;

      if (!userLocation) {
        // Optionally show a toast here: "Enable location to route"
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<div class="p-2 text-sm">📍 ${t('map.enableLocation')}</div>`)
          .addTo(mapInstance);
        return;
      }

      const dest = e.lngLat;
      const destCoords: [number, number] = [dest.lng, dest.lat];

      // Remove existing temp marker
      const existingMarker = document.getElementById('temp-dest-marker');
      if (existingMarker) existingMarker.remove();

      // Add temporary destination marker
      const el = document.createElement('div');
      el.id = 'temp-dest-marker';
      el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>';
      new maplibregl.Marker({ element: el })
        .setLngLat(dest)
        .addTo(mapInstance);

      // Show popup indicating routing is happening
      const popup = new maplibregl.Popup()
        .setLngLat(dest)
        .setHTML(`<div class="p-2 text-sm font-medium">🚶 ${t('map.calculatingRoute')}...</div>`)
        .addTo(mapInstance);

      if (activePopupRef.current) activePopupRef.current.remove();
      activePopupRef.current = popup;

      setDestination(destCoords);

      // Reverse geocode quietly
      let geocodeName = t('map.customDestination');
      activePopupData.current = { type: 'map', title: geocodeName };
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${dest.lat}&lon=${dest.lng}&format=json&accept-language=${language}`);
        const data = await res.json();
        if (data && data.address) {
          const road = data.address.road || data.address.pedestrian || '';
          const house = data.address.house_number || '';
          if (road) {
            geocodeName = `${road}${house ? `, ${house}` : ''}`;
          } else if (data.name) {
            geocodeName = data.name;
          }
          if (activePopupData.current && activePopupData.current.type === 'map') {
            activePopupData.current.title = geocodeName;
          }
        }
      } catch (e) {
        // keep default
      }

      const result = await calculateRoute(userLocation, destCoords, transportMode);

      if (result) {
        const isStraightLine = (result.steps || []).length === 0;
        const distanceKm = (result.distance / 1000).toFixed(2);
        const durationMin = Math.round(result.duration / 60);

        // Update popup with distance/time from result
        popup.setHTML(`
              <div class="p-2 min-w-[200px]">
               <div class="font-bold text-sm mb-2">📍 ${geocodeName}</div>
               <div class="border-t border-gray-100 pt-2">
                    <p class="text-sm text-gray-600 font-medium flex items-center gap-1">
                        ${transportMode === 'walking' ? '🚶' : '🚗'} ${distanceKm} km
                    </p>
                    <p class="text-xs text-gray-500 flex items-center gap-1">
                        ⏱️ ${durationMin} min
                    </p>
               </div>
               ${isStraightLine ? '<div class="text-xs text-orange-500 mt-1 italic">(' + t('map.straightLine') + ')</div>' : ''}
            </div>
      `);
      } else {
        popup.setHTML(`< div class="p-2 text-sm text-red-500" >❌ ${t('map.errorRouting')}</div > `);
      }
    };

    mapInstance.on('click', handleMapClick);

    return () => {
      mapInstance.off('click', 'poi-layer', handleClick);
      mapInstance.off('click', handleMapClick);
      mapInstance.off('mouseenter', 'poi-layer', onMouseEnter);
      mapInstance.off('mouseleave', 'poi-layer', onMouseLeave);
      mapInstance.off('styleimagemissing', () => { });
    };
  }, [isMapReady, userLocation, transportMode, calculateRoute, map, t, language, getRouteInfo]);



  const getLocalizedLayerName = (layerId: string) => {
    const layerMap: Record<string, string> = {
      'toilets': t('map.toilets'),
      'hospitals': t('map.hospitals'),
      'wheelchair': t('map.wheelchair'),
      'clinics': t('map.clinics'),
      'scooters': t('map.scooters'),
      'rent_car': t('map.rent_car'),
      'parking': t('map.parking'),
    };
    return layerMap[layerId] || layerId;
  };

  return (
    <div className="glass rounded-2xl overflow-hidden relative">
      <NavigationOverlay
        instruction={navInstruction}
        distance={navDistance}
        isVisible={showNavOverlay}
      />

      <div className="p-3 sm:p-4 border-b border-white/20">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            <span className="font-semibold text-sm sm:text-base">{t('map.title')}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {/* Row 1: Category Selector + Find Nearest */}
          <div className="flex gap-2 w-full">
            <div className="z-20 flex-1 w-1/2 flex gap-1.5 items-center">
              <div className="relative flex-1">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full h-10 px-3 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/40 flex items-center justify-between text-sm font-semibold text-gray-800 transition-all hover:bg-white/90 active:scale-[0.98]"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-base flex-shrink-0">{POI_LAYERS.find(l => l.id === selectedLayer)?.icon}</span>
                    <span className="truncate">{getLocalizedLayerName(selectedLayer)}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top max-h-[300px] overflow-y-auto z-50">
                    {POI_LAYERS.map((layer) => (
                      <button
                        key={layer.id}
                        onClick={() => {
                          setSelectedLayer(layer.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${selectedLayer === layer.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <span className="text-lg p-1 bg-white rounded-md shadow-sm border border-gray-100">{layer.icon}</span>
                        {getLocalizedLayerName(layer.id)}
                        {selectedLayer === layer.id && <Check className="w-4 h-4 ml-auto text-blue-600" />}
                      </button>
                    ))}
                  </div>
                )}

                {isDropdownOpen && (
                  <div
                    className="fixed inset-0 z-[-1]"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                )}
              </div>
              <button
                onClick={() => fetchPois(true)}
                disabled={isLoadingPois}
                className="shrink-0 w-10 h-10 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/40 flex items-center justify-center text-gray-700 transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('map.refresh') || 'Refresh Map'}
              >
                <RefreshCw className={`w-4 h-4 text-blue-600 ${isLoadingPois ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={findNearest}
              disabled={!userLocation || !pois || pois.features.length === 0 || isLoadingPois}
              className="flex-1 w-1/2 h-10 px-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-md font-medium text-sm"
              title={t('map.findNearest')}
            >
              <Target className={`w-4 h-4 ${isLoadingPois ? 'animate-pulse' : ''}`} />
              <span className="truncate">{t('map.findNearest')}</span>
            </button>
          </div>

          {/* Row 2: Location, Transport, Sound */}
          <div className="flex gap-2 w-full">
            <button
              onClick={() => {
                if (permissionState === 'granted' && userLocation) {
                  stopWatching();
                } else {
                  requestLocation();
                }
              }}
              disabled={permissionState === 'unavailable' || geoLoading}
              className={`h-10 px-3 flex-1 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs font-medium whitespace-nowrap ${permissionState === 'granted' && userLocation
                ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                : permissionState === 'denied'
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
            >
              <MapPin className={`w-3.5 h-3.5 ${geoLoading ? 'animate-pulse' : ''}`} />
              <span>
                {permissionState === 'granted' && userLocation
                  ? t('loc.on') || 'Location: ON'
                  : geoLoading
                    ? 'Locating...'
                    : t('loc.off') || 'Location: OFF'}
              </span>
            </button>

            <div className="flex-[2] flex gap-1 bg-white/50 rounded-lg p-1 h-10">
              <button
                onClick={() => setTransportMode('walking')}
                className={`rounded transition-all flex-1 flex items-center justify-center ${transportMode === 'walking'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-transparent text-gray-600 hover:bg-white/50'
                  }`}
                title={t('map.walking')}
              >
                <PersonStanding className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTransportMode('driving')}
                className={`rounded transition-all flex-1 flex items-center justify-center ${transportMode === 'driving'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-transparent text-gray-600 hover:bg-white/50'
                  }`}
                title={t('map.driving')}
              >
                <Car className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className={`h-10 px-3 rounded-lg transition-colors flex items-center justify-center shadow-md ${isAudioEnabled
                ? 'bg-blue-100 text-blue-600'
                : 'bg-white/50 text-gray-500 hover:bg-white/80'
                }`}
              title={isAudioEnabled ? t('map.mute') : t('map.unmute')}
            >
              {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>


        {(poiError || geoError) && (
          <div className="mt-2 text-sm text-red-600">
            {poiError || geoError}
          </div>
        )}

        {rateLimitWait > 0 && (
          <div className="mt-2 text-sm text-orange-600">
            {t('map.rateLimit')}: {rateLimitWait}{t('map.seconds')}
          </div>
        )}
      </div>

      <div ref={mapContainer} className="w-full h-[600px] sm:h-[700px]" />
    </div>
  );
}
