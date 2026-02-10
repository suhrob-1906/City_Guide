'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCityBySlug } from '@/config/cities';
import { motion } from 'framer-motion';
import { ArrowLeft, Wind, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language';

interface AirQualityData {
    aqi: number;
    label: string;
    color: string;
    measuredAt: string;
}

export default function AirQualityPage() {
    const params = useParams();
    const city = getCityBySlug(params.slug as string);
    const { t } = useLanguage();
    const [data, setData] = useState<AirQualityData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!city) return;
        async function fetchData() {
            try {
                const res = await fetch(`/api/air?city=${city?.slug}`);
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
                            <p className="text-gray-500">Air Quality Index (AQI)</p>
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
                                    {data.label}
                                </h2>
                            </div>

                            {/* Scale Visualization */}
                            <div className="mb-8">
                                <div className="flex justify-between text-xs text-gray-400 mb-2">
                                    <span>Good (1)</span>
                                    <span>Moderate (3)</span>
                                    <span>Hazardous (5)</span>
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
                                        <p className="font-semibold text-gray-900 mb-1">Health Implication</p>
                                        {data.aqi <= 2
                                            ? "Air quality is considered satisfactory, and air pollution poses little or no risk."
                                            : "Members of sensitive groups may experience health effects. The general public is not likely to be affected."}
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
