import { useEffect, useRef, useState } from 'react';

export function useAutoRefresh(intervalMs: number = 60000) { // 1 minute default
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [tick, setTick] = useState(0);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Set up new interval - only update tick, not router
        intervalRef.current = setInterval(() => {
            setTick(prev => prev + 1); // Triggers client-side data refresh
            setLastUpdate(new Date());
        }, intervalMs);

        // Cleanup on unmount
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [intervalMs]);

    return { tick, lastUpdate };
}
