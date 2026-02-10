'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/lib/language';
import Link from 'next/link';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

import ChartComponent from '@/components/ui/ChartComponent';

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
            'Quiet': t('kp.quiet'),
            'Unsettled': t('kp.unsettled'),
            'Active': t('kp.active'),
            'Storm': t('kp.storm'),
            'Severe Storm': t('kp.severe'),
        };
        return levelMap[level] || level;
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
                                View Details →
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

                        {data.history && (
                            <div className="mt-4">
                                <div className="text-xs text-gray-500 mb-2 font-medium">{t('kp.forecast')}</div>
                                <ChartComponent
                                    data={data.history}
                                    dataKey="kp"
                                    color={data.color}
                                    height={100}
                                    label={t('kp.legend')}
                                />
                            </div>
                        )}

                        <div className="text-sm text-gray-600 mt-2">{data.description}</div>
                    </CardContent>
                </Card>
            </Link>
        </div>
    );
}
