'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CITIES } from '@/config/cities';
import { MapPin, Cloud, Wind, Activity } from 'lucide-react';
import { useLanguage } from '@/lib/language';

export default function HomePage() {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
            >
                <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-green-600 to-blue-500 bg-clip-text text-transparent flex items-center justify-center gap-4">
                    <svg viewBox="0 0 512 512" className="w-16 h-16 drop-shadow-lg shrink-0">
                        <defs>
                            <linearGradient id="opt1-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#3b82f6" />
                                <stop offset="100%" stop-color="#8b5cf6" />
                            </linearGradient>
                            <filter id="opt1-shadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="16" stdDeviation="16" floodColor="#000000" floodOpacity="0.2" />
                            </filter>
                        </defs>
                        <rect width="512" height="512" rx="128" fill="url(#opt1-grad)" />
                        <path d="M256 112c-61.85 0-112 50.15-112 112 0 84 112 208 112 208s112-124 112-208c0-61.85-50.15-112-112-112zm0 160c-26.51 0-48-21.49-48-48s21.49-48 48-48 48 21.49 48 48-21.49 48-48 48z" fill="#ffffff" filter="url(#opt1-shadow)" />
                    </svg>
                    {t('home.title')}
                </h1>
                <p className="text-xl text-gray-600 mb-2">
                    {t('home.subtitle')}
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                        <Cloud className="w-4 h-4" /> {t('weather.title')}
                    </span>
                    <span className="flex items-center gap-1">
                        <Wind className="w-4 h-4" /> {t('air.title')}
                    </span>
                    <span className="flex items-center gap-1">
                        <Activity className="w-4 h-4" /> {t('kp.title')}
                    </span>
                </div>
            </motion.div>

            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl w-full"
                variants={{
                    hidden: {},
                    show: {
                        transition: {
                            staggerChildren: 0.15,
                        },
                    },
                }}
                initial="hidden"
                animate="show"
            >
                {CITIES.map((city, index) => (
                    <motion.div
                        key={city.slug}
                        variants={{
                            hidden: { opacity: 0, y: 30 },
                            show: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.5 }}
                    >
                        <Link href={`/city/${city.slug}`}>
                            <div className="glass rounded-2xl p-8 hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
                                <div className="flex items-center justify-between mb-4">
                                    <MapPin className="w-12 h-12 text-blue-500 group-hover:text-blue-600 transition-colors" />
                                    <span className="text-4xl">
                                        {['🏛️', '🕌', '🏰', '🏔️', '🌲', '🏭', '🏺', '🎨', '🌉', '🏜️'][index % 10]}
                                    </span>
                                </div>
                                <h2 className="text-3xl font-bold mb-2 group-hover:text-blue-600 transition-colors">
                                    {t(`city.${city.slug}`)}
                                </h2>
                                <p className="text-gray-600 text-lg">{city.nameRu}</p>
                                <div className="mt-4 text-sm text-gray-500">
                                    {city.lat.toFixed(4)}°, {city.lon.toFixed(4)}°
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}
