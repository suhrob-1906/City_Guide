'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

type Language = 'en' | 'ru';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations = {
    en: {
        // Home page
        'home.title': 'Uzbek City Helper',
        'home.subtitle': 'Real-time weather, geomagnetic activity, air quality, and accessible POI mapping',
        'home.selectCity': 'Select a city to view data',

        // Cities
        'city.tashkent': 'Tashkent',
        'city.samarkand': 'Samarkand',
        'city.bukhara': 'Bukhara',
        'city.andijan': 'Andijan',
        'city.namangan': 'Namangan',
        'city.fergana': 'Fergana',
        'city.kokand': 'Kokand',
        'city.nukus': 'Nukus',
        'city.urgench': 'Urgench',
        'city.khiva': 'Khiva',
        'city.termez': 'Termez',
        'city.qarshi': 'Qarshi',
        'city.navoi': 'Navoi',
        'city.zarafshan': 'Zarafshan',
        'city.jizzakh': 'Jizzakh',
        'city.guliston': 'Guliston',
        'city.angren': 'Angren',
        'city.chirchiq': 'Chirchiq',
        'city.almalyk': 'Almalyk',

        'city.capital': 'Capital of Uzbekistan',
        'city.ancient': 'Ancient Silk Road city',
        'city.historic': 'Historic city',

        // Navigation
        'nav.back': 'Back to cities',

        // Weather card
        'weather.title': 'Weather',
        'weather.temperature': 'Temperature',
        'weather.humidity': 'Humidity',
        'weather.wind': 'Wind Speed',
        'weather.loading': 'Loading weather data...',
        'weather.error': 'Unable to load weather data',
        'weather.stale': 'Showing cached data',

        // Kp index card
        'kp.title': 'Geomagnetic Activity',
        'kp.index': 'Kp Index',
        'kp.level': 'Activity Level',
        'kp.loading': 'Loading Kp index...',
        'kp.error': 'Unable to load Kp data',
        'kp.quiet': 'Quiet',
        'kp.unsettled': 'Unsettled',
        'kp.active': 'Active',
        'kp.storm': 'Storm',
        'kp.severe': 'Severe Storm',
        'kp.forecast': '24h Forecast',
        'kp.legend': 'Kp Index',

        // Air quality card
        'air.title': 'Air Quality',
        'air.index': 'AQI',
        'air.level': 'Quality Level',
        'air.loading': 'Loading air quality...',
        'air.error': 'Unable to load air quality data',
        'air.stale': 'Showing cached data',
        'air.updated': 'Updated',
        'air.good': 'Good',
        'air.fair': 'Fair',
        'air.moderate': 'Moderate',
        'air.poor': 'Poor',
        'air.veryPoor': 'Very Poor',
        'air.forecast': 'Forecast',
        'air.legend': 'AQI Index',

        // Map
        'map.title': 'Points of Interest',
        'map.refresh': 'Refresh',
        'map.layer': 'Layer',
        'map.toilets': 'Toilets',
        'map.hospitals': 'Hospitals',
        'map.wheelchair': 'Wheelchair Access',
        'map.found': 'Found',
        'map.locations': 'locations',
        'map.updated': 'Updated',
        'map.loading': 'Loading POI data...',
        'map.rateLimit': 'Please wait before refreshing',
        'map.seconds': 's',

        // Data sources
        'sources.title': 'Data Sources',
        'sources.weather': 'Weather data from Open-Meteo',
        'sources.kp': 'Geomagnetic data from NOAA SWPC',
        'sources.air': 'Air quality from OpenWeather',
        'sources.poi': 'POI data from OpenStreetMap',
    },
    ru: {
        // Home page
        'home.title': 'Помощник по городам Узбекистана',
        'home.subtitle': 'Погода, геомагнитная активность, качество воздуха и доступные места в реальном времени',
        'home.selectCity': 'Выберите город для просмотра данных',

        // Cities
        'city.tashkent': 'Ташкент',
        'city.samarkand': 'Самарканд',
        'city.bukhara': 'Бухара',
        'city.andijan': 'Андижан',
        'city.namangan': 'Наманган',
        'city.fergana': 'Фергана',
        'city.kokand': 'Коканд',
        'city.nukus': 'Нукус',
        'city.urgench': 'Ургенч',
        'city.khiva': 'Хива',
        'city.termez': 'Термез',
        'city.qarshi': 'Карши',
        'city.navoi': 'Навои',
        'city.zarafshan': 'Зарафшан',
        'city.jizzakh': 'Джизак',
        'city.guliston': 'Гулистан',
        'city.angren': 'Ангрен',
        'city.chirchiq': 'Чирчик',
        'city.almalyk': 'Алмалык',

        'city.capital': 'Столица Узбекистана',
        'city.ancient': 'Древний город Шёлкового пути',
        'city.historic': 'Исторический город',

        // Navigation
        'nav.back': 'Назад к городам',

        // Weather card
        'weather.title': 'Погода',
        'weather.temperature': 'Температура',
        'weather.humidity': 'Влажность',
        'weather.wind': 'Скорость ветра',
        'weather.loading': 'Загрузка данных о погоде...',
        'weather.error': 'Не удалось загрузить данные о погоде',
        'weather.stale': 'Показаны кэшированные данные',

        // Kp index card
        'kp.title': 'Геомагнитная активность',
        'kp.index': 'Индекс Kp',
        'kp.level': 'Уровень активности',
        'kp.loading': 'Загрузка индекса Kp...',
        'kp.error': 'Не удалось загрузить данные Kp',
        'kp.quiet': 'Спокойно',
        'kp.unsettled': 'Неспокойно',
        'kp.active': 'Активно',
        'kp.storm': 'Буря',
        'kp.severe': 'Сильная буря',
        'kp.forecast': 'Прогноз на 24 часа',
        'kp.legend': 'Индекс Kp',

        // Air quality card
        'air.title': 'Качество воздуха',
        'air.index': 'ИКВ',
        'air.level': 'Уровень качества',
        'air.loading': 'Загрузка качества воздуха...',
        'air.error': 'Не удалось загрузить данные о качестве воздуха',
        'air.stale': 'Показаны кэшированные данные',
        'air.updated': 'Обновлено',
        'air.good': 'Хорошо',
        'air.fair': 'Удовлетворительно',
        'air.moderate': 'Умеренно',
        'air.poor': 'Плохо',
        'air.veryPoor': 'Очень плохо',
        'air.forecast': 'Прогноз',
        'air.legend': 'Индекс AQI',

        // Map
        'map.title': 'Точки интереса',
        'map.refresh': 'Обновить',
        'map.layer': 'Слой',
        'map.toilets': 'Туалеты',
        'map.hospitals': 'Больницы',
        'map.wheelchair': 'Доступ для инвалидных колясок',
        'map.found': 'Найдено',
        'map.locations': 'мест',
        'map.updated': 'Обновлено',
        'map.loading': 'Загрузка данных POI...',
        'map.rateLimit': 'Подождите перед обновлением',
        'map.seconds': 'с',

        // Data sources
        'sources.title': 'Источники данных',
        'sources.weather': 'Данные о погоде от Open-Meteo',
        'sources.kp': 'Геомагнитные данные от NOAA SWPC',
        'sources.air': 'Качество воздуха от OpenWeather',
        'sources.poi': 'Данные POI от OpenStreetMap',
    },
};

const defaultContext: LanguageContextType = {
    language: 'en',
    setLanguage: () => { },
    t: (key: string) => key,
};

const LanguageContext = createContext<LanguageContextType>(defaultContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        // Load saved language from localStorage
        const saved = localStorage.getItem('language') as Language;
        console.log('[Language] Loading from localStorage:', saved);
        if (saved && (saved === 'en' || saved === 'ru')) {
            setLanguageState(saved);
            console.log('[Language] Set initial language to:', saved);
        }
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        console.log('[Language] setLanguage called with:', lang);
        console.log('[Language] Current language:', language);
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', lang);
            console.log('[Language] Saved to localStorage:', lang);
        }
    }, [language]);

    const t = useCallback((key: string): string => {
        return translations[language][key as keyof typeof translations['en']] || key;
    }, [language]);

    const value = useMemo(() => {
        console.log('[Language] Context value updated, language:', language);
        return { language, setLanguage, t };
    }, [language, setLanguage, t]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    return context;
}
