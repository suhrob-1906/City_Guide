import { useState, useCallback, useEffect, useRef } from 'react';

export type GeolocationPermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

interface GeolocationState {
    location: [number, number] | null;
    permissionState: GeolocationPermissionState;
    error: string | null;
    isLoading: boolean;
}

interface UseGeolocationReturn extends GeolocationState {
    requestLocation: () => Promise<void>;
    clearError: () => void;
    stopWatching: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
    const [state, setState] = useState<GeolocationState>({
        location: null,
        permissionState: 'prompt',
        error: null,
        isLoading: false,
    });

    const watchId = useRef<number | null>(null);

    // Function to handle position updates
    const handlePositionSuccess = useCallback((position: GeolocationPosition) => {
        setState(prev => ({
            ...prev,
            location: [position.coords.longitude, position.coords.latitude],
            permissionState: 'granted',
            error: null,
            isLoading: false,
        }));
    }, []);

    const handlePositionError = useCallback((error: GeolocationPositionError) => {
        let errorMessage = 'Failed to get location';
        let permissionState: GeolocationPermissionState = 'denied';

        if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            permissionState = 'denied';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'Location information is unavailable.';
            permissionState = 'prompt';
        } else if (error.code === error.TIMEOUT) {
            errorMessage = 'Location request timed out.';
            permissionState = 'prompt';
        }

        // Only update error if we don't have a location yet, or if it's a permission issue
        // We don't want to clear existing location on transient errors
        setState(prev => ({
            ...prev,
            permissionState,
            error: prev.location ? prev.error : errorMessage,
            isLoading: false,
        }));
    }, []);

    // Start watching position
    const startWatching = useCallback(() => {
        if (!navigator.geolocation) return;

        // Clear existing watch if any
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        watchId.current = navigator.geolocation.watchPosition(
            handlePositionSuccess,
            handlePositionError,
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }, [handlePositionSuccess, handlePositionError]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, []);

    // Check initial permission state and start watching if granted
    useEffect(() => {
        if (!navigator.geolocation) {
            setState(prev => ({ ...prev, permissionState: 'unavailable' }));
            return;
        }

        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                const newState = result.state as GeolocationPermissionState;
                setState(prev => ({ ...prev, permissionState: newState }));

                if (newState === 'granted') {
                    startWatching();
                }

                result.addEventListener('change', () => {
                    const changedState = result.state as GeolocationPermissionState;
                    setState(prev => ({ ...prev, permissionState: changedState }));

                    if (changedState === 'granted') {
                        startWatching();
                    }
                });
            }).catch(() => {
                // Permissions API not fully supported
            });
        }
    }, [startWatching]);

    const requestLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setState(prev => ({
                ...prev,
                error: 'Geolocation is not supported by your browser',
                permissionState: 'unavailable',
            }));
            return;
        }

        startWatching();
    }, [startWatching]);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    const stopWatching = useCallback(() => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        setState(prev => ({ ...prev, location: null, isLoading: false }));
    }, []);

    return {
        ...state,
        requestLocation,
        clearError,
        stopWatching,
    };
}
