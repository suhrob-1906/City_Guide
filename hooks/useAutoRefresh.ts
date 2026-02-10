import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAutoRefresh(intervalMs: number = 60000) {
    const router = useRouter();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        // Clear any existing interval
        if (intervalRef.current) clearInterval(intervalRef.current);

        // Set up new interval
        intervalRef.current = setInterval(() => {
            router.refresh(); // Triggers a server component re-fetch
            setTick(prev => prev + 1); // Triggers client-side effects
            console.log('[AutoRefresh] Data refreshed at', new Date().toLocaleTimeString());
        }, intervalMs);

        // Cleanup on unmount
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [intervalMs, router]);

    return tick;
}
