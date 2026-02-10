export interface KpData {
    kpIndex: number;
    level: string;
    color: string;
    description: string;
    fetchedAt: string;
    history: { time: string; kp: number }[];
}

export async function fetchKpIndex(): Promise<KpData> {
    const url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';

    const res = await fetch(url);
    if (!res.ok) throw new Error(`NOAA API error: ${res.status}`);

    const data = await res.json();
    // Data format: [time_tag, kp_index, ...]
    // Skip header row
    const rows = data.slice(1);

    // Get last 24 entries (approx 24 hours if data is hourly, usually it's 3-hourly or more freq)
    // NOAA provides 3-hour planetary K-index. 8 entries = 24 hours.
    // Actually the file usually contains recent data. Let's take the last 8-12 entries.
    const recent = rows.slice(-12);

    const history = recent.map((row: any[]) => ({
        time: row[0],
        kp: parseFloat(row[1])
    }));

    const latest = rows[rows.length - 1];
    const kp = parseFloat(latest[1]);

    return {
        kpIndex: kp,
        level: getKpLevel(kp),
        color: getKpColor(kp),
        description: getKpDescription(kp),
        fetchedAt: new Date().toISOString(),
        history
    };
}

function getKpLevel(kp: number): string {
    if (kp < 4) return 'Quiet';
    if (kp < 5) return 'Unsettled';
    if (kp < 6) return 'Active';
    if (kp < 7) return 'Minor Storm';
    if (kp < 8) return 'Moderate Storm';
    return 'Strong Storm';
}

function getKpColor(kp: number): string {
    if (kp < 4) return '#10b981';
    if (kp < 5) return '#fbbf24';
    if (kp < 6) return '#f59e0b';
    if (kp < 7) return '#ef4444';
    return '#dc2626';
}

function getKpDescription(kp: number): string {
    if (kp < 4) return 'Normal geomagnetic conditions';
    if (kp < 6) return 'Minor geomagnetic disturbances';
    return 'Geomagnetic storm in progress';
}
