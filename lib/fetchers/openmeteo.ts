export interface WeatherData {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    description: string;
    icon: string;
    fetchedAt: string;
    hourly: {
        time: string[];
        temperature_2m: number[];
        precipitation_probability: number[];
        weather_code: number[];
    };
    daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        weather_code: number[];
        precipitation_probability_max: number[];
    };
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);

    const data = await res.json();
    const current = data.current;

    return {
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        description: getWeatherDescription(current.weather_code),
        icon: getWeatherIcon(current.weather_code),
        fetchedAt: new Date().toISOString(),
        hourly: data.hourly,
        daily: data.daily,
    };
}

function getWeatherDescription(code: number): string {
    const codes: Record<number, string> = {
        0: 'weather.clear',
        1: 'weather.mainly_clear',
        2: 'weather.partly_cloudy',
        3: 'weather.overcast',
        45: 'weather.fog',
        48: 'weather.fog',
        51: 'weather.drizzle',
        53: 'weather.drizzle',
        55: 'weather.drizzle',
        56: 'weather.drizzle',
        57: 'weather.drizzle',
        61: 'weather.rain',
        63: 'weather.rain',
        65: 'weather.rain',
        66: 'weather.rain',
        67: 'weather.rain',
        71: 'weather.snow',
        73: 'weather.snow',
        75: 'weather.snow',
        77: 'weather.snow',
        80: 'weather.showers',
        81: 'weather.showers',
        82: 'weather.showers',
        85: 'weather.showers',
        86: 'weather.showers',
        95: 'weather.thunderstorm',
        96: 'weather.thunderstorm',
        99: 'weather.thunderstorm',
    };
    return codes[code] || 'weather.clear';
}

function getWeatherIcon(code: number): string {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '🌨️';
    if (code <= 82) return '🌦️';
    if (code >= 95) return '⛈️';
    return '🌤️';
}
