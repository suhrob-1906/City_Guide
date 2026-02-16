'use client';

import { useParams } from 'next/navigation';
import { getCityBySlug } from '@/config/cities';
import WeatherCard from '@/components/cards/WeatherCard';
import KpCard from '@/components/cards/KpCard';
import AirQualityCard from '@/components/cards/AirQualityCard';
import TourGuideCard from '@/components/cards/TourGuideCard';
import MapView from '@/components/map/MapView';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language';

export default function CityPage() {
    const params = useParams();
    const city = getCityBySlug(params.slug as string);
    const { t } = useLanguage();

    if (!city) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold mb-4">City not found</h1>
                    <Link href="/" className="text-blue-600 hover:underline">
                        ← {t('nav.back')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto"
            >
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/">
                        <button className="glass rounded-full p-3 hover:scale-110 transition-transform">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold">{t(`city.${city.slug}`)}</h1>
                        <p className="text-gray-600 text-lg">{city.nameRu}</p>
                    </div>
                </div>

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                    variants={{
                        hidden: {},
                        show: { transition: { staggerChildren: 0.1 } },
                    }}
                    initial="hidden"
                    animate="show"
                >
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                        <WeatherCard city={city.slug} />
                    </motion.div>
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                        <KpCard />
                    </motion.div>
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                        <AirQualityCard city={city.slug} />
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="mb-8"
                >
                    <TourGuideCard city={city} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <MapView city={city} />
                </motion.div>
            </motion.div>
        </div>
    );
}
