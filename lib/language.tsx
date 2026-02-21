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
        'nav.voiceOn': 'Voice On',
        'nav.voiceOff': 'Voice Off',
        'nav.straight': 'Go straight',
        'nav.turnRight': 'Turn right',
        'nav.turnSlightRight': 'Bear right',
        'nav.turnSharpRight': 'Sharp right',
        'nav.turnLeft': 'Turn left',
        'nav.turnSlightLeft': 'Bear left',
        'nav.turnSharpLeft': 'Sharp left',
        'nav.uTurn': 'Make a U-turn',
        'nav.arrive': 'You have arrived',
        'nav.depart': 'Head to destination',
        'nav.fallback': 'Head straight to destination',
        'nav.continue': 'Continue',
        'nav.headNorth': 'Head North',
        'nav.headSouth': 'Head South',
        'nav.headEast': 'Head East',
        'nav.headWest': 'Head West',
        'nav.headNE': 'Head Northeast',
        'nav.headNW': 'Head Northwest',
        'nav.headSE': 'Head Southeast',
        'nav.headSW': 'Head Southwest',
        'nav.unknown': 'Follow route',

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
        'kp.desc.normal': 'Normal geomagnetic conditions',
        'kp.desc.minor': 'Minor geomagnetic disturbances',
        'kp.desc.storm': 'Geomagnetic storm in progress',
        'kp.forecast': '24h Forecast',
        'kp.legend': 'Kp Index',
        'kp.subtitle': 'Planetary K-index',
        'kp.whatIs': 'What is Kp Index?',
        'kp.descriptionLong': 'The K-index quantifies disturbances in the horizontal component of earth\'s magnetic field. Values below 3 are calm, while 5 or higher indicates a storm.',
        'kp.scale.quiet': 'Quiet (0-2)',
        'kp.scale.unsettled': 'Unsettled (3)',
        'kp.scale.storm': 'Storm (5+)',

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
        'air.subtitle': 'Air Quality Index (AQI)',
        'air.health': 'Health Implication',
        'air.goodDesc': 'Air quality is considered satisfactory, and air pollution poses little or no risk.',
        'air.poorDesc': 'Members of sensitive groups may experience health effects. The general public is not likely to be affected.',
        'air.scale.good': 'Good (1)',
        'air.scale.moderate': 'Moderate (3)',
        'air.scale.hazardous': 'Hazardous (5)',
        'air.pollutants': 'Pollutants',
        'air.pm25': 'PM2.5',
        'air.pm10': 'PM10',
        'air.o3': 'Ozone (O₃)',
        'air.no2': 'Nitrogen Dioxide (NO₂)',
        'air.so2': 'Sulfur Dioxide (SO₂)',
        'air.co': 'Carbon Monoxide (CO)',
        'air.recommendations': 'Health Recommendations',
        'air.detailsTitle': 'Air Quality Details',

        // Map
        'map.title': 'Points of Interest',
        'map.refresh': 'Refresh',
        'map.layer': 'Layer',
        'map.toilets': 'Toilets',
        'map.hospitals': 'Hospitals',
        'map.wheelchair': 'Wheelchair Access',
        'map.clinics': 'Clinics',
        'map.scooters': 'Electric Scooters',
        'map.rent_car': 'Rent Car',
        'map.parking': 'Parking',
        'map.found': 'Found',
        'map.locations': 'locations',
        'map.updated': 'Updated',
        'map.loading': 'Loading POI data...',
        'map.loadingMap': 'Loading Map...',
        'map.errorRouting': 'Failed to calculate route',
        'map.rateLimit': 'Please wait before refreshing',
        'map.seconds': 's',
        'map.viewDetails': 'View Details',
        'map.findNearest': 'Find Nearest',
        'map.lastUpdate': 'Last update',
        'map.routeToNearest': 'Route to nearest',
        'map.distance': 'Distance',
        'map.noLocation': 'Enable location to find nearest',
        'map.driving': 'Driving',
        'map.walking': 'Walking',
        'map.straightLine': 'straight line',
        'map.enableLocation': 'Enable Location',
        'map.locationEnabled': 'Location Enabled',
        'map.locationDenied': 'Location Denied',
        'map.locationUnavailable': 'Location Unavailable',
        'map.calculatingRoute': 'Calculating route',
        'map.customDestination': 'Selected Destination',

        // Popular Places
        'guide.title': 'Popular Places',
        'guide.subtitle': 'Must-visit locations in the city',
        'guide.park': 'Park',
        'guide.mall': 'Shopping Mall',
        'guide.monument': 'Monument',
        'guide.museum': 'Museum',
        'guide.attraction': 'Attraction',
        'guide.square': 'Square',
        'guide.building': 'Building',
        'guide.found': 'Found',
        'guide.places': 'places',
        'guide.viewOnMap': 'View on Map',
        'guide.noPlaces': 'No popular places available for this city',

        // Navigation (Dynamic)
        'nav.in': 'In',
        'nav.meters': 'meters',
        'nav.kilometers': 'km',
        'nav.then': 'then',
        'nav.destination': 'You will arrive at your destination',

        // Weather (Additional)
        'weather.feelsLike': 'Feels like',
        'weather.rainExpected': 'Rain Expected',
        'weather.noRain': 'No Rain',
        'weather.hourly': 'Hourly Forecast',
        'weather.daily': '7-Day Forecast',
        'weather.kmh': 'km/h',

        // Weather conditions
        'weather.clear': 'Clear sky',
        'weather.mainly_clear': 'Mainly clear',
        'weather.partly_cloudy': 'Partly cloudy',
        'weather.overcast': 'Overcast',
        'weather.fog': 'Foggy',
        'weather.drizzle': 'Drizzle',
        'weather.rain': 'Rain',
        'weather.snow': 'Snow',
        'weather.showers': 'Showers',
        'weather.thunderstorm': 'Thunderstorm',

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
        'nav.voiceOn': 'Звук вкл',
        'nav.voiceOff': 'Звук выкл',
        'nav.straight': 'Прямо',
        'nav.turnRight': 'Поверните направо',
        'nav.turnSlightRight': 'Держитесь правее',
        'nav.turnSharpRight': 'Резко направо',
        'nav.turnLeft': 'Поверните налево',
        'nav.turnSlightLeft': 'Держитесь левее',
        'nav.turnSharpLeft': 'Резко налево',
        'nav.uTurn': 'Разворот',
        'nav.arrive': 'Вы прибыли',
        'nav.depart': 'Направляйтесь к точке',
        'nav.fallback': 'Направляйтесь к точке назначения',
        'nav.continue': 'Продолжайте движение',
        'nav.headNorth': 'Направляйтесь на север',
        'nav.headSouth': 'Направляйтесь на юг',
        'nav.headEast': 'Направляйтесь на восток',
        'nav.headWest': 'Направляйтесь на запад',
        'nav.headNE': 'Направляйтесь на северо-восток',
        'nav.headNW': 'Направляйтесь на северо-запад',
        'nav.headSE': 'Направляйтесь на юго-восток',
        'nav.headSW': 'Направляйтесь на юго-запад',
        'nav.unknown': 'Следуйте по маршруту',

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
        'kp.desc.normal': 'Геомагнитная обстановка спокойная',
        'kp.desc.minor': 'Небольшие геомагнитные возмущения',
        'kp.desc.storm': 'Геомагнитная буря',
        'kp.forecast': 'Прогноз на 24 часа',
        'kp.legend': 'Индекс Kp',
        'kp.subtitle': 'Планетарный K-индекс',
        'kp.whatIs': 'Что такое Kp-индекс?',
        'kp.descriptionLong': 'K-индекс количественно определяет возмущения горизонтальной составляющей магнитного поля Земли. Значения ниже 3 — спокойные, а 5 и выше указывают на магнитную бурю.',
        'kp.scale.quiet': 'Спокойно (0-2)',
        'kp.scale.unsettled': 'Неспокойно (3)',
        'kp.scale.storm': 'Буря (5+)',

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
        'air.subtitle': 'Индекс качества воздуха (AQI)',
        'air.health': 'Влияние на здоровье',
        'air.goodDesc': 'Качество воздуха считается удовлетворительным, загрязнение не представляет риска.',
        'air.poorDesc': 'Люди из групп риска могут испытать ухудшение здоровья. Для остальных риск невелик.',
        'air.scale.good': 'Хорошо (1)',
        'air.scale.moderate': 'Умеренно (3)',
        'air.scale.hazardous': 'Опасно (5)',
        'air.pollutants': 'Загрязнители',
        'air.pm25': 'PM2.5',
        'air.pm10': 'PM10',
        'air.o3': 'Озон (O₃)',
        'air.no2': 'Диоксид азота (NO₂)',
        'air.so2': 'Диоксид серы (SO₂)',
        'air.co': 'Угарный газ (CO)',
        'air.recommendations': 'Рекомендации для здоровья',
        'air.detailsTitle': 'Детали качества воздуха',

        // Map
        'map.title': 'Точки интереса',
        'map.refresh': 'Обновить',
        'map.layer': 'Слой',
        'map.toilets': 'Туалеты',
        'map.hospitals': 'Больницы',
        'map.wheelchair': 'Доступ для инвалидных колясок',
        'map.clinics': 'Поликлиники',
        'map.scooters': 'Электросамокаты',
        'map.rent_car': 'Аренда авто',
        'map.parking': 'Парковка',
        'map.found': 'Найдено',
        'map.locations': 'мест',
        'map.updated': 'Обновлено',
        'map.loading': 'Загрузка данных POI...',
        'map.loadingMap': 'Загрузка карты...',
        'map.errorRouting': 'Не удалось построить маршрут',
        'map.rateLimit': 'Подождите перед обновлением',
        'map.seconds': 'с',
        'map.viewDetails': 'Подробнее',
        'map.findNearest': 'Найти ближайший',
        'map.lastUpdate': 'Последнее обновление',
        'map.routeToNearest': 'Маршрут к ближайшему',
        'map.distance': 'Расстояние',
        'map.noLocation': 'Включите геолокацию для поиска',
        'map.driving': 'На машине',
        'map.walking': 'Пешком',
        'map.straightLine': 'прямая',
        'map.enableLocation': 'Включить геолокацию',
        'map.locationEnabled': 'Геолокация включена',
        'map.locationDenied': 'Доступ запрещен',
        'map.locationUnavailable': 'Геолокация недоступна',
        'map.calculatingRoute': 'Вычисление маршрута',
        'map.customDestination': 'Выбранная точка',

        // Popular Places
        'guide.title': 'Популярные места в городе',
        'guide.subtitle': 'Обязательные к посещению локации',
        'guide.park': 'Парк',
        'guide.mall': 'Торговый центр',
        'guide.monument': 'Памятник',
        'guide.museum': 'Музей',
        'guide.attraction': 'Достопримечательность',
        'guide.square': 'Площадь',
        'guide.building': 'Здание',
        'guide.found': 'Найдено',
        'guide.places': 'мест',
        'guide.viewOnMap': 'Показать на карте',
        'guide.noPlaces': 'Нет популярных мест для этого города',

        // Navigation (Dynamic)
        'nav.in': 'Через',
        'nav.meters': 'метров',
        'nav.kilometers': 'км',
        'nav.then': 'затем',
        'nav.destination': 'Вы прибудете в пункт назначения',

        // Weather (Additional)
        'weather.feelsLike': 'Ощущается как',
        'weather.rainExpected': 'Ожидается дождь',
        'weather.noRain': 'Без осадков',
        'weather.hourly': 'Почасовой прогноз',
        'weather.daily': 'Прогноз на 7 дней',
        'weather.kmh': 'км/ч',

        // Weather conditions
        'weather.clear': 'Ясно',
        'weather.mainly_clear': 'Преимущественно ясно',
        'weather.partly_cloudy': 'Переменная облачность',
        'weather.overcast': 'Пасмурно',
        'weather.fog': 'Туман',
        'weather.drizzle': 'Морось',
        'weather.rain': 'Дождь',
        'weather.snow': 'Снег',
        'weather.showers': 'Ливень',
        'weather.thunderstorm': 'Гроза',

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
        if (saved && (saved === 'en' || saved === 'ru')) {
            setLanguageState(saved);
        }
    }, []);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', lang);
        }
    }, []);

    const t = useCallback((key: string): string => {
        return translations[language][key as keyof typeof translations['en']] || key;
    }, [language]);

    const value = useMemo(() => {
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
