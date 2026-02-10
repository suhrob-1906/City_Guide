'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/lib/language';
import Link from 'next/link';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';



interface KpData {
    kpIndex: number; // Changed from kp to match new interface, or map it
    kp?: number; // Keep for backward compat if needed, or better, just use one. Fetcher returns kpIndex. 
    // Wait, the fetcher returns `kpIndex` but the old component used `kp`.
    // Let's check the fetcher again. 
    // The fetcher returns `{ kpIndex: kp, ... }`. 
    // The previous component used `data.kp`.
    // The previous fetcher returned `{ kpIndex: ... }`? 
    // Let's look at `noaa.ts` again. 
    // Original `noaa.ts` returned `kpIndex`. 
    // Old `KpCard.tsx` used `data.kp`. 
    // If `data.kp` worked, then `fetchKpIndex` must have returned `kp`.
    // Let's check `noaa.ts` content I read earlier.
    // Line 19: `return { kpIndex: kp, ... }`.
    // So `data.kp` in KpCard might have been undefined or I missed something?
    // Ah, `KpCard` line 95: `<div className="text-4xl font-bold">{data.kp}</div>`.
    // If `fetchKpIndex` returns `kpIndex`, then `data.kp` would be undefined.
    // Maybe the API route or something else renamed it?
    // `api/kp/route.ts` returns `NextResponse.json(data)`.
    // So it returns whatever `fetchKpIndex` returns.
    // I should fix the interface to match `fetchKpIndex` output: `kpIndex`.
    // And `history`.

    kpIndex: number;
    level: string;
    color: string;
    description: string;
    fetchedAt: string;
    stale?: boolean;
    history?: { time: string; kp: number }[];
}

export default function KpCard() {
    const [data, setData] = useState<KpData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const { t, language } = useLanguage();
    const refreshTick = useAutoRefresh(600000); // 10 minutes

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/kp');
                if (!res.ok) throw new Error('Failed to fetch');
                const json = await res.json();
                setData(json);
                setError(false);
            } catch (e) {
                setError(true);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [refreshTick]);

    const getLocalizedLevel = (level: string) => {
        const levelMap: Record<string, string> = {
            'quiet': t('kp.quiet'),
            'unsettled': t('kp.unsettled'),
            'active': t('kp.active'),
            'storm': t('kp.storm'),
            'severe': t('kp.severe'),
        };
        return levelMap[level] || level;
    };

    const getLocalizedDescription = (desc: string) => {
        const descMap: Record<string, string> = {
            'normal': t('kp.description.normal') || t('kp.descriptionLong'), // Fallback to long desc if specific not found
            'minor': t('kp.description.minor') || t('kp.unsettled'),
            'storm': t('kp.description.storm') || t('kp.storm'),
        };
        // Since we didn't add specific description keys yet, let's map to existing or add them?
        // Actually, let's just use the logic to return the 'kp.descriptionLong' equivalent or similar.
        // Or simpler: define these keys in language.tsx.
        // For now, I'll fallback to a generic description if keys are missing or use what I have.
        // Wait, the user wants EVERYTHING translated.
        // I should add `kp.desc.normal`, `kp.desc.minor`, `kp.desc.storm` to language.tsx first.
        return descMap[desc] || desc;
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t('kp.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t('kp.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-red-500">{t('kp.error')}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="block h-full cursor-pointer group">
            <Link href={`/city/tashkent/geomagnetic`}>
                <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            {t('kp.title')}
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 text-sm">
                                {t('map.viewDetails')} →
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-4xl font-bold">{data.kpIndex}</div>
                                <div className="text-sm text-gray-500">{t('kp.index')}</div>
                            </div>
                            <div
                                className="px-4 py-2 rounded-full text-white font-semibold transition-transform duration-300 group-hover:scale-105"
                                style={{ backgroundColor: data.color }}
                            >
                                {getLocalizedLevel(data.level)}
                            </div>
                        </div>

                        <div className="text-sm text-gray-600 mt-2">
                            {/* We'll implement a proper mapped description here, 
                                 but first I need to ensure the keys exist. 
                                 For now, I'll map 'normal' -> kp.quiet etc? 
                                 No, let's just add the keys to language.tsx in the next step.
                                 Here I will use a helper function that expects those keys.
                             */}
                            {t(`kp.desc.${data.description}`)}
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </div>
    );
}
