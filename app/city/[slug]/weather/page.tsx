'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCityBySlug } from '@/config/cities';
import { motion } from 'framer-motion';
import { ArrowLeft, CloudRain, Droplets, Wind, Thermometer, Sunrise, Sunset, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language';
import { WeatherData } from '@/lib/fetchers/openmeteo';

function getWeatherIcon(code: number) {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '🌨️';
    if (code <= 82) return '🌦️';
    if (code >= 95) return '⛈️';
    return '🌤️';
}

export default function WeatherPage() {
    const params = useParams();
    const city = getCityBySlug(params.slug as string);
    const { t } = useLanguage();
    const [data, setData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!city) return;
        async function fetchData() {
            try {
                const res = await fetch(`/api/weather?city=${city?.slug}`);
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

    const isRaining = data?.hourly?.weather_code?.[0] ? [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(data.hourly.weather_code[0]) : false;

    // Helper to format time
    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Helper to format day
    const formatDay = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
    };

    return (
        <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl w-full space-y-6"
            >
                {/* Header & Navigation */}
                <div className="flex items-center gap-4">
                    <Link href={`/city/${city.slug}`}>
                        <button className="glass rounded-full p-3 hover:scale-110 transition-transform text-gray-700">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800">{t(`city.${city.slug}`)}</h1>
                </div>

                {loading ? (
                    <div className="space-y-6">
                        <div className="h-64 glass rounded-3xl animate-pulse"></div>
                        <div className="h-48 glass rounded-3xl animate-pulse"></div>
                    </div>
                ) : data ? (
                    <>
                        {/* Current Weather Card */}
                        <div className="glass rounded-3xl p-8 relative overflow-hidden">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                <div className="text-center md:text-left">
                                    <div className="text-8xl font-bold text-gray-800 tracking-tighter">
                                        {Math.round(data.temperature)}°
                                    </div>
                                    <p className="text-2xl text-gray-600 font-medium mt-2 capitalize">{data.description}</p>
                                    <p className="text-gray-500 mt-1">Feels like {data.feelsLike}°</p>
                                </div>
                                <div className="text-9xl animate-bounce-slow filter drop-shadow-xl">
                                    {data.icon}
                                </div>
                                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                                    <div className="glass bg-white/50 p-4 rounded-2xl flex flex-col items-center">
                                        <Droplets className="w-6 h-6 text-blue-500 mb-1" />
                                        <span className="text-sm text-gray-500">Humidity</span>
                                        <span className="font-bold">{data.humidity}%</span>
                                    </div>
                                    <div className="glass bg-white/50 p-4 rounded-2xl flex flex-col items-center">
                                        <Wind className="w-6 h-6 text-blue-500 mb-1" />
                                        <span className="text-sm text-gray-500">Wind</span>
                                        <span className="font-bold">{data.windSpeed} km/h</span>
                                    </div>
                                    <div className="glass bg-white/50 p-4 rounded-2xl flex flex-col items-center col-span-2">
                                        {isRaining ? (
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <CloudRain className="w-5 h-5" />
                                                <span className="font-bold">Rain Expected</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-green-600">
                                                <Thermometer className="w-5 h-5" />
                                                <span className="font-bold">No Rain</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hourly Forecast */}
                        {data.hourly && (
                            <div className="glass rounded-3xl p-6">
                                <div className="flex items-center gap-2 mb-4 text-gray-700">
                                    <Clock className="w-5 h-5" />
                                    <h2 className="text-xl font-bold">Hourly Forecast</h2>
                                </div>
                                <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
                                    {data.hourly.time.slice(0, 24).map((time, i) => (
                                        <div key={i} className="flex-shrink-0 flex flex-col items-center space-y-2 min-w-[4.5rem]">
                                            <span className="text-sm text-gray-500">{formatTime(time)}</span>
                                            <span className="text-3xl">{getWeatherIcon(data.hourly.weather_code[i])}</span>
                                            <span className="text-lg font-bold">{Math.round(data.hourly.temperature_2m[i])}°</span>
                                            <div className="flex items-center text-xs text-blue-500 font-medium">
                                                <Droplets className="w-3 h-3 mr-1" />
                                                {data.hourly.precipitation_probability[i]}%
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 10-Day Forecast */}
                        {data.daily && (
                            <div className="glass rounded-3xl p-6">
                                <div className="flex items-center gap-2 mb-6 text-gray-700">
                                    <Calendar className="w-5 h-5" />
                                    <h2 className="text-xl font-bold">10-Day Forecast</h2>
                                </div>
                                <div className="space-y-4">
                                    {data.daily.time.map((time, i) => (
                                        <div key={i} className="flex items-center justify-between hover:bg-white/50 p-2 rounded-xl transition-colors">
                                            <div className="w-24 font-medium text-gray-700">{formatDay(time)}</div>
                                            <div className="flex items-center flex-1 justify-center gap-4">
                                                <span className="text-2xl">{getWeatherIcon(data.daily.weather_code[i])}</span>
                                                <div className="flex items-center text-xs text-blue-500 w-12 justify-center bg-blue-50 rounded-full px-2 py-1">
                                                    {data.daily.precipitation_probability_max[i]}%
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 w-32 justify-end">
                                                <span className="text-gray-400 text-sm font-semibold">{Math.round(data.daily.temperature_2m_min[i])}°</span>
                                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden relative">
                                                    <div
                                                        className="absolute h-full bg-gradient-to-r from-blue-400 to-orange-400 rounded-full"
                                                        style={{
                                                            left: '20%', // Simplified for demo
                                                            right: '20%'
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className="text-gray-800 font-bold">{Math.round(data.daily.temperature_2m_max[i])}°</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="glass rounded-3xl p-8 text-center text-red-500">
                        {t('weather.error')}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
