export interface AirQualityData {
    aqi: number;
    label: string;
    color: string;
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
    source: string;
    measuredAt: string;
    fetchedAt: string;
    stale: boolean;
}

export async function fetchAirQuality(lat: number, lon: number): Promise<AirQualityData> {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) throw new Error('OPENWEATHER_API_KEY not configured');

    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeather API error: ${res.status}`);

    const data = await res.json();
    const aqi = data.list[0].main.aqi;
    const components = data.list[0].components;

    return {
        aqi,
        label: getAqiLabel(aqi),
        color: getAqiColor(aqi),
        components,
        source: 'OpenWeather',
        measuredAt: new Date(data.list[0].dt * 1000).toISOString(),
        fetchedAt: new Date().toISOString(),
        stale: false,
    };
}

export async function fetchAirQualityForecast(lat: number, lon: number): Promise<any> {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) throw new Error('OPENWEATHER_API_KEY not configured');

    const url = `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenWeather API error: ${res.status}`);

    const data = await res.json();

    // Get next 24 hours (data is hourly)
    const forecast = data.list.slice(0, 24).map((item: any) => ({
        time: new Date(item.dt * 1000).toISOString(),
        aqi: item.main.aqi,
        color: getAqiColor(item.main.aqi)
    }));

    return forecast;
}

function getAqiLabel(aqi: number): string {
    const labels = ['good', 'fair', 'moderate', 'poor', 'very_poor'];
    return labels[aqi - 1] || 'unknown';
}

function getAqiColor(aqi: number): string {
    const colors = ['#10b981', '#84cc16', '#fbbf24', '#f97316', '#ef4444'];
    return colors[aqi - 1] || '#6b7280';
}
