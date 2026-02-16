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

  // State
  const [selectedLayer, setSelectedLayer] = useState(POI_LAYERS[0].id);
  const [transportMode, setTransportMode] = useState<'driving' | 'walking'>('walking');
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
  const { route, steps, distance: routeDistance, duration, calculateRoute, resetRoute } = useRouting();

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

    const source = map.current.getSource('pois') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(pois);

      if (pois.features.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        pois.features.forEach(f => bounds.extend(f.geometry.coordinates as [number, number]));
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    }
  }, [pois, isMapReady, map]);

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

  // Localize navigation instruction
  const localizeInstruction = useCallback((instruction: string): string => {
    const instrLower = String(instruction).toLowerCase();

    if (instrLower.includes('arrive') || instrLower.includes('dest')) return t('nav.arrive');
    if (instrLower.includes('sharp right') || instrLower.includes('резко направо')) return t('nav.turnSharpRight');
    if (instrLower.includes('sharp left') || instrLower.includes('резко налево')) return t('nav.turnSharpLeft');
    if (instrLower.includes('slight right') || instrLower.includes('правее')) return t('nav.turnSlightRight');
    if (instrLower.includes('slight left') || instrLower.includes('левее')) return t('nav.turnSlightLeft');
    if (instrLower.includes('right') || instrLower.includes('направо')) return t('nav.turnRight');
    if (instrLower.includes('left') || instrLower.includes('налево')) return t('nav.turnLeft');
    if (instrLower.includes('u-turn') || instrLower.includes('разворот')) return t('nav.uTurn');
    if (instrLower.includes('straight') || instrLower.includes('прямо')) return t('nav.straight');
    if (instrLower.includes('roundabout') || instrLower.includes('кругов')) return t('nav.roundabout');
    if (instrLower.includes('head to') || instrLower.includes('направляйтесь к')) return t('nav.depart');
    if (instrLower.includes('north') && instrLower.includes('east')) return t('nav.headNE');
    if (instrLower.includes('north') && instrLower.includes('west')) return t('nav.headNW');
    if (instrLower.includes('south') && instrLower.includes('east')) return t('nav.headSE');
    if (instrLower.includes('south') && instrLower.includes('west')) return t('nav.headSW');
    if (instrLower.includes('north') || instrLower.includes('север')) return t('nav.headNorth');
    if (instrLower.includes('south') || instrLower.includes('юг')) return t('nav.headSouth');
    if (instrLower.includes('east') || instrLower.includes('восток')) return t('nav.headEast');
    if (instrLower.includes('west') || instrLower.includes('запад')) return t('nav.headWest');

    return instruction;
  }, [t]);

  // Navigation instructions
  useEffect(() => {
    if (!userLocation || steps.length === 0) return;

    let nextStepIndex = -1;
    let minDist = Infinity;

    for (let i = lastSpokenIndex + 1; i < steps.length; i++) {
      const step = steps[i];
      const stepLoc = step.way_points;

      // Safety check: ensure stepLoc is valid array [lon, lat] and not [0,0]
      if (!stepLoc || !Array.isArray(stepLoc) || (stepLoc[0] === 0 && stepLoc[1] === 0)) continue;

      const dist = calculateStraightLine(userLocation, stepLoc as [number, number]).distance;

      if (dist < minDist) {
        minDist = dist;
        nextStepIndex = i;
      }
    }

    if (nextStepIndex !== -1) {
      const step = steps[nextStepIndex];
      const stepLoc = step.way_points;

      if (stepLoc && Array.isArray(stepLoc) && (stepLoc[0] !== 0 || stepLoc[1] !== 0)) {
        const dist = calculateStraightLine(userLocation, stepLoc as [number, number]).distance;
        let localizedInstruction = localizeInstruction(step.instruction);

        setNavInstruction(localizedInstruction);
        setNavDistance(dist);
        setShowNavOverlay(true);

        if (isAudioEnabled) {
          if (dist < 50 && lastSpokenIndex < nextStepIndex) {
            speak(localizedInstruction);
            setLastSpokenIndex(nextStepIndex);
          } else if (dist < 300 && dist > 250 && lastSpokenIndex < nextStepIndex - 0.5) {
            const prefix = language === 'ru' ? `${t('nav.in')} 300 ${t('nav.meters')} ` : `${t('nav.in')} 300 ${t('nav.meters')} `;
            speak(prefix + localizedInstruction);
            setLastSpokenIndex(nextStepIndex - 0.5);
          }
        }
      }
    }
  }, [userLocation, steps, isAudioEnabled, lastSpokenIndex, language, t, speak, localizeInstruction]);

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
      const distance = Math.sqrt(
        Math.pow(poiLon - userLon, 2) + Math.pow(poiLat - userLat, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearest = poi;
      }
    });

    if (nearest && map.current) {
      await calculateRoute(userLocation, nearest.geometry.coordinates, transportMode);

      // Re-check map.current after async operation
      if (!map.current) return;

      const bounds = new maplibregl.LngLatBounds();
      bounds.extend(userLocation);
      bounds.extend(nearest.geometry.coordinates as [number, number]);

      try {
        map.current.fitBounds(bounds, { padding: 100 });
      } catch (e) {
        console.warn('Error fitting bounds:', e);
      }

      const distanceKm = (routeDistance / 1000).toFixed(2);
      const durationMin = Math.round(duration / 60);

      new maplibregl.Popup()
        .setLngLat(nearest.geometry.coordinates as [number, number])
        .setHTML(`
          <div class="p-2">
            <h3 class="font-bold">${nearest.properties.icon} ${nearest.properties.name}</h3>
            <p class="text-sm text-gray-600">${transportMode === 'walking' ? '🚶' : '🚗'} ${t('map.distance')}: ${distanceKm} km</p>
            <p class="text-sm text-gray-600">⏱️ ${durationMin} min</p>
          </div>
        `)
        .addTo(map.current);
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

      // Calculate route immediately on click
      if (userLocation) {
        // Show loading indicator in popup or console
        console.log('Calculating route to clicked POI...');
        await calculateRoute(userLocation, coordinates as [number, number], transportMode);
      }

      new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(`
          <div class="p-2 min-w-[200px]">
            <h3 class="font-bold text-lg mb-1">${props.name || 'POI'}</h3>
            <p class="text-sm text-gray-600 mb-2">${props.amenity || props.shop || props.tourism || ''}</p>
            <div class="text-xs text-blue-600 font-medium">
              ${userLocation ? '🕒 Calculating route...' : '⚠️ Enable location for route'}
            </div>
          </div>
        `)
        .addTo(mapInstance);
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

      const result = await calculateRoute(userLocation, destCoords, transportMode);

      if (result) {
        // Update popup with distance/time from result
        popup.setHTML(`
            <div class="p-2">
               <div class="font-bold text-sm mb-1">📍 ${t('map.customDestination')}</div>
               <div class="text-xs text-gray-600">
                  ${transportMode === 'walking' ? '🚶' : '🚗'} ${(result.distance / 1000).toFixed(2)} km
                  <br>
                  ⏱️ ${Math.round(result.duration / 60)} min
               </div>
            </div>
        `);
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
  }, [isMapReady, userLocation, transportMode, calculateRoute, map]);



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

        <div className="flex flex-col gap-3">
          {/* Row 1: Category Selector + Find Nearest Button (50% / 50%) */}
          <div className="flex gap-2 w-full">
            <div className="relative z-20 flex-1 w-1/2">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full h-12 px-3 bg-white/80 backdrop-blur-md rounded-xl shadow-sm border border-white/40 flex items-center justify-between text-sm font-semibold text-gray-800 transition-all hover:bg-white/90 active:scale-[0.98]"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="text-lg flex-shrink-0">{POI_LAYERS.find(l => l.id === selectedLayer)?.icon}</span>
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
                      className={`w-full px-4 py-3 flex items-center gap-3 text-sm transition-colors ${selectedLayer === layer.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      <span className="text-xl p-1 bg-white rounded-md shadow-sm border border-gray-100">{layer.icon}</span>
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
              onClick={findNearest}
              disabled={!userLocation || !pois || pois.features.length === 0 || isLoadingPois}
              className="flex-1 w-1/2 h-12 px-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-md font-medium text-sm"
              title={t('map.findNearest')}
            >
              <Target className={`w-5 h-5 ${isLoadingPois ? 'animate-pulse' : ''}`} />
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
              className={`h-11 px-3 flex-1 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium whitespace-nowrap ${permissionState === 'granted' && userLocation
                ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                : permissionState === 'denied'
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
            >
              <MapPin className={`w-4 h-4 ${geoLoading ? 'animate-pulse' : ''}`} />
              <span>
                {permissionState === 'granted' && userLocation
                  ? t('loc.on') || 'Location: ON'
                  : geoLoading
                    ? 'Locating...'
                    : t('loc.off') || 'Location: OFF'}
              </span>
            </button>

            <div className="flex-[2] flex gap-1 bg-white/50 rounded-lg p-1 h-11">
              <button
                onClick={() => setTransportMode('walking')}
                className={`rounded transition-all flex-1 flex items-center justify-center ${transportMode === 'walking'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-transparent text-gray-600 hover:bg-white/50'
                  }`}
                title={t('map.walking')}
              >
                <PersonStanding className="w-5 h-5" />
              </button>
              <button
                onClick={() => setTransportMode('driving')}
                className={`rounded transition-all flex-1 flex items-center justify-center ${transportMode === 'driving'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-transparent text-gray-600 hover:bg-white/50'
                  }`}
                title={t('map.driving')}
              >
                <Car className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className={`h-11 px-3 rounded-lg transition-colors flex items-center justify-center shadow-md ${isAudioEnabled
                ? 'bg-blue-100 text-blue-600'
                : 'bg-white/50 text-gray-500 hover:bg-white/80'
                }`}
              title={isAudioEnabled ? t('map.mute') : t('map.unmute')}
            >
              {isAudioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
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
