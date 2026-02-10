'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/lib/language';
import Link from 'next/link';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';



interface AirQualityData {
    aqi: number;
    label: string;
    color: string;
    measuredAt: string;
    fetchedAt: string;
    stale?: boolean;
    forecast?: { time: string; aqi: number; color: string }[];
}

export default function AirQualityCard({ city }: { city: string }) {
    const [data, setData] = useState<AirQualityData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();
    const refreshTick = useAutoRefresh(600000); // 10 minutes

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);
                // Fetch with forecast
                const res = await fetch(`/api/air?city=${city}`);

                if (res.status === 429) {
                    setError(t('map.rateLimit'));
                    return;
                }

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(errorData.error || 'Failed to fetch');
                }

                const json = await res.json();
                setData(json);
                setError(null);
            } catch (e: any) {
                console.error('Air quality fetch error:', e);
                setError(e.message || t('air.error'));
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [city, t, refreshTick]);

    const getLocalizedLabel = (label: string) => {
        const labelMap: Record<string, string> = {
            'good': t('air.good'),
            'fair': t('air.fair'),
            'moderate': t('air.moderate'),
            'poor': t('air.poor'),
            'very_poor': t('air.veryPoor'),
        };
        return labelMap[label] || label;
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t('air.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t('air.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-red-500">{error}</p>
                    <p className="text-xs text-gray-500 mt-2">
                        Check OPENWEATHER_API_KEY configuration
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t('air.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-500">{t('air.error')}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Link href={`/city/${city}/air-quality`} className="block group">
            <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        {t('air.title')}
                        {data.stale && (
                            <span className="text-xs text-yellow-600">⚠️ {t('air.stale')}</span>
                        )}
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 text-sm">
                            {t('map.viewDetails')} →
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-4xl font-bold">{data.aqi}</div>
                            <div className="text-sm text-gray-500">{t('air.index')}</div>
                        </div>
                        <div
                            className="px-4 py-2 rounded-full text-white font-semibold transition-transform duration-300 group-hover:scale-105"
                            style={{ backgroundColor: data.color }}
                        >
                            {getLocalizedLabel(data.label)}
                        </div>
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                        {t('air.updated')}: {new Date(data.measuredAt).toLocaleString()}
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
