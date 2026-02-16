'use client';

import { City } from '@/config/cities';
import { MapPin, Landmark } from 'lucide-react';
import { useLanguage } from '@/lib/language';
import { POPULAR_PLACES } from '@/config/popularPlaces';

export default function TourGuideCard({ city }: { city: City }) {
    const { t, language } = useLanguage();

    // Get popular places for this city
    const places = POPULAR_PLACES[city.slug] || [];

    const getTypeName = (type: string) => {
        return t(`guide.${type}`);
    };

    if (places.length === 0) {
        return (
            <div className="glass rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                    <Landmark className="w-6 h-6 text-amber-500" />
                    <h2 className="text-xl font-bold">{t('guide.title')}</h2>
                </div>
                <div className="text-gray-500 text-sm">{t('guide.noPlaces')}</div>
            </div>
        );
    }

    return (
        <div className="glass rounded-2xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-white/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Landmark className="w-6 h-6 text-amber-500" />
                        <div>
                            <h2 className="text-xl font-bold">{t('guide.title')}</h2>
                            <p className="text-sm text-gray-600">{t('guide.subtitle')}</p>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600">
                        {t('guide.found')} <span className="font-semibold text-amber-600">{places.length}</span> {t('guide.places')}
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {places.map((place) => (
                        <div
                            key={place.id}
                            className="group bg-white/40 rounded-xl p-4 hover:bg-white/60 transition-all duration-300 hover:shadow-lg border border-white/40 hover:scale-[1.02]"
                        >
                            <div className="flex items-start gap-3">
                                <div className="text-3xl flex-shrink-0">
                                    {place.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-800 mb-1 line-clamp-1">
                                        {language === 'ru' ? place.nameRu : place.name}
                                    </h3>
                                    <p className="text-xs text-amber-600 mb-2">
                                        {getTypeName(place.type)}
                                    </p>
                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                        {language === 'ru' ? place.descriptionRu : place.description}
                                    </p>

                                    <a
                                        href={`https://www.google.com/maps?q=${place.lat},${place.lon}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors text-xs font-medium"
                                    >
                                        <MapPin className="w-3 h-3" />
                                        {t('guide.viewOnMap')}
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
