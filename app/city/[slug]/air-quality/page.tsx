'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCityBySlug } from '@/config/cities';
import { motion } from 'framer-motion';
import { ArrowLeft, Wind, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language';

import ChartComponent from '@/components/ui/ChartComponent';

interface AirQualityData {
    aqi: number;
    label: string;
    color: string;
    measuredAt: string;
    forecast?: { time: string; aqi: number; color: string }[];
    components?: {
        co: number;
        no: number;
        no2: number;
        o3: number;
        so2: number;
        pm2_5: number;
        pm10: number;
        nh3: number;
    };
}

export default function AirQualityPage() {
    const params = useParams();
    const city = getCityBySlug(params.slug as string);
    const { t, language } = useLanguage();
    const [data, setData] = useState<AirQualityData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!city) return;
        async function fetchData() {
            try {
                // Fetch with forecast
                const res = await fetch(`/api/air?city=${city?.slug}&type=forecast`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [city]);

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

    if (!city) return null;

    return (
        <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl w-full"
            >
                <div className="flex items-center gap-4 mb-6">
                    <Link href={`/city/${city.slug}`}>
                        <button className="glass rounded-full p-3 hover:scale-110 transition-transform text-gray-700">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    </Link>
                </div>

                <div className="glass rounded-3xl p-8 relative">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-gray-100 rounded-full text-gray-600">
                            <Wind className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{t('air.title')}</h1>
                            <p className="text-gray-500">{t('air.subtitle')}</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="animate-pulse h-40 bg-gray-100 rounded-xl"></div>
                    ) : data ? (
                        <>
                            <div className="text-center mb-12">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 text-5xl font-bold mb-4 bg-white shadow-lg transition-colors duration-500"
                                    style={{ borderColor: data.color, color: data.color }}
                                >
                                    {data.aqi}
                                </motion.div>
                                <h2 className="text-2xl font-bold" style={{ color: data.color }}>
                                    {getLocalizedLabel(data.label)}
                                </h2>
                            </div>

                            {/* Pollutants Breakdown */}
                            {data.components && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold mb-4">{t('air.pollutants')}</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="glass p-3 rounded-xl text-center">
                                            <div className="text-xs text-gray-500 mb-1">{t('air.pm25')}</div>
                                            <div className="font-bold text-lg">{data.components.pm2_5}</div>
                                            <div className="text-xs text-gray-400">μg/m³</div>
                                        </div>
                                        <div className="glass p-3 rounded-xl text-center">
                                            <div className="text-xs text-gray-500 mb-1">{t('air.pm10')}</div>
                                            <div className="font-bold text-lg">{data.components.pm10}</div>
                                            <div className="text-xs text-gray-400">μg/m³</div>
                                        </div>
                                        <div className="glass p-3 rounded-xl text-center">
                                            <div className="text-xs text-gray-500 mb-1">{t('air.o3')}</div>
                                            <div className="font-bold text-lg">{data.components.o3}</div>
                                            <div className="text-xs text-gray-400">μg/m³</div>
                                        </div>
                                        <div className="glass p-3 rounded-xl text-center">
                                            <div className="text-xs text-gray-500 mb-1">{t('air.no2')}</div>
                                            <div className="font-bold text-lg">{data.components.no2}</div>
                                            <div className="text-xs text-gray-400">μg/m³</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                        <div className="glass p-3 rounded-xl text-center">
                                            <div className="text-xs text-gray-500 mb-1">{t('air.so2')}</div>
                                            <div className="font-bold text-lg">{data.components.so2}</div>
                                            <div className="text-xs text-gray-400">μg/m³</div>
                                        </div>
                                        <div className="glass p-3 rounded-xl text-center">
                                            <div className="text-xs text-gray-500 mb-1">{t('air.co')}</div>
                                            <div className="font-bold text-lg">{data.components.co}</div>
                                            <div className="text-xs text-gray-400">μg/m³</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Chart Visualization */}
                            {data.forecast && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold mb-4">{t('air.forecast')}</h3>
                                    <ChartComponent
                                        data={data.forecast}
                                        dataKey="aqi"
                                        color={data.color}
                                        height={200}
                                        label={t('air.legend')}
                                        language={language}
                                    />
                                </div>
                            )}

                            {/* Scale Visualization */}
                            <div className="mb-8">
                                <div className="flex justify-between text-xs text-gray-400 mb-2">
                                    <span>{t('air.scale.good')}</span>
                                    <span>{t('air.scale.moderate')}</span>
                                    <span>{t('air.scale.hazardous')}</span>
                                </div>
                                <div className="h-4 rounded-full bg-gray-200 overflow-hidden flex relative">
                                    <div className="w-1/5 h-full bg-green-500"></div>
                                    <div className="w-1/5 h-full bg-green-300"></div>
                                    <div className="w-1/5 h-full bg-yellow-400"></div>
                                    <div className="w-1/5 h-full bg-orange-500"></div>
                                    <div className="w-1/5 h-full bg-red-600"></div>

                                    {/* Indicator */}
                                    <div
                                        className="absolute top-0 bottom-0 w-1 bg-black border-2 border-white shadow-lg transition-all duration-1000"
                                        style={{ left: `${Math.min(((data.aqi - 0.5) / 5) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="glass p-6 rounded-2xl bg-gray-50/50">
                                <div className="flex items-start gap-3">
                                    {data.aqi <= 2 ? <CheckCircle className="w-5 h-5 text-green-500 mt-1" /> : <AlertTriangle className="w-5 h-5 text-yellow-500 mt-1" />}
                                    <div className="text-sm text-gray-600">
                                        <p className="font-semibold text-gray-900 mb-1">{t('air.health')}</p>
                                        {data.aqi <= 2
                                            ? t('air.goodDesc')
                                            : t('air.poorDesc')}
                                        <p className="text-xs text-gray-400 mt-2">
                                            {t('air.updated')}: {new Date(data.measuredAt).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-red-500">{t('air.error')}</p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
