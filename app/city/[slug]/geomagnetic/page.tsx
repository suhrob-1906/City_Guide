'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCityBySlug } from '@/config/cities';
import { motion } from 'framer-motion';
import { ArrowLeft, Activity, Info } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language';

import ChartComponent from '@/components/ui/ChartComponent';

interface KpData {
    kpIndex: number;
    level: string;
    color: string;
    description: string;
    history?: { time: string; kp: number }[];
}

export default function GeomagneticPage() {
    const params = useParams();
    const city = getCityBySlug(params.slug as string);
    const { t } = useLanguage();
    const [data, setData] = useState<KpData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch('/api/kp');
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
    }, []);

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
                        <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{t('kp.title')}</h1>
                            <p className="text-gray-500">{t('kp.subtitle')}</p>
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
                                    {data.kpIndex}
                                </motion.div>
                                <h2 className="text-2xl font-bold" style={{ color: data.color }}>
                                    {getLocalizedLevel(data.level)}
                                </h2 >
                                <p className="text-gray-600 mt-2 max-w-md mx-auto">
                                    {t(`kp.desc.${data.description}`)}
                                </p>
                            </div>

                            {/* Chart Visualization */}
                            {data.history && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold mb-4">{t('kp.forecast')}</h3>
                                    <ChartComponent
                                        data={data.history}
                                        dataKey="kp"
                                        color={data.color}
                                        height={200}
                                        label={t('kp.legend')}
                                    />
                                </div>
                            )}

                            {/* Scale Visualization */}
                            <div className="mb-8">
                                <div className="flex justify-between text-xs text-gray-400 mb-2">
                                    <span>{t('kp.scale.quiet')}</span>
                                    <span>{t('kp.scale.unsettled')}</span>
                                    <span>{t('kp.scale.storm')}</span>
                                </div>
                                <div className="h-4 rounded-full bg-gray-200 overflow-hidden flex relative">
                                    <div className="w-1/3 h-full bg-green-400"></div>
                                    <div className="w-1/6 h-full bg-yellow-400"></div>
                                    <div className="w-1/6 h-full bg-orange-400"></div>
                                    <div className="w-1/3 h-full bg-red-500"></div>

                                    {/* Indicator */}
                                    <div
                                        className="absolute top-0 bottom-0 w-1 bg-black border-2 border-white shadow-lg transition-all duration-1000"
                                        style={{ left: `${Math.min((data.kpIndex / 9) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="glass p-6 rounded-2xl bg-blue-50/50">
                                <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                                    <div className="text-sm text-gray-600">
                                        <p className="font-semibold text-gray-900 mb-1">{t('kp.whatIs')}</p>
                                        {t('kp.descriptionLong')}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-red-500">{t('kp.error')}</p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
