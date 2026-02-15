'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/lib/language';
import Link from 'next/link';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

interface WeatherData {
    temperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    description: string;
    icon: string;
    fetchedAt: string;
    stale?: boolean;
    hourly?: any; // Added to match new API response structure
    daily?: any;  // Added to match new API response structure
}

export default function WeatherCard({ city }: { city: string }) {
    const [data, setData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const { t } = useLanguage();
    const { tick } = useAutoRefresh(60000); // 1 minute

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/weather?city=${city}`);
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
    }, [city, tick]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t('weather.title')}</CardTitle>
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
                    <CardTitle>{t('weather.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-red-500">{t('weather.error')}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Link href={`/city/${city}/weather`} className="block group">
            <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        {t('weather.title')}
                        {data.stale && (
                            <span className="text-xs text-yellow-600">⚠️ {t('weather.stale')}</span>
                        )}
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 text-sm">
                            View Details →
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="text-4xl font-bold">{data.temperature}°C</div>
                            <div className="text-gray-600">{data.description}</div>
                        </div>
                        <div className="text-6xl group-hover:scale-110 transition-transform duration-300">{data.icon}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="text-gray-500">{t('weather.humidity')}</div>
                            <div className="font-semibold">{data.humidity}%</div>
                        </div>
                        <div>
                            <div className="text-gray-500">{t('weather.wind')}</div>
                            <div className="font-semibold">{data.windSpeed} km/h</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
