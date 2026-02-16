/**
 * Tourism data fetcher for OpenStreetMap Overpass API
 * Fetches tourism POIs like attractions, museums, viewpoints, etc.
 */

export interface TourismPOI {
    id: string;
    name: string;
    type: string; // attraction, museum, viewpoint, artwork, gallery, etc.
    description?: string;
    lat: number;
    lon: number;
    wikipedia?: string;
    website?: string;
    opening_hours?: string;
}

interface OverpassElement {
    type: string;
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags: {
        name?: string;
        tourism?: string;
        historic?: string;
        'name:en'?: string;
        'name:ru'?: string;
        description?: string;
        'description:en'?: string;
        'description:ru'?: string;
        wikipedia?: string;
        website?: string;
        opening_hours?: string;
    };
}

interface OverpassResponse {
    elements: OverpassElement[];
}

/**
 * Fetch tourism POIs for a city from OpenStreetMap
 */
export async function getTourismPOIs(
    lat: number,
    lon: number,
    radiusKm: number = 10
): Promise<TourismPOI[]> {
    const radius = radiusKm * 1000; // convert to meters

    // Overpass QL query for tourism and historic sites
    const query = `
        [out:json][timeout:30];
        (
            node["tourism"~"attraction|museum|viewpoint|artwork|gallery|information"](around:${radius},${lat},${lon});
            way["tourism"~"attraction|museum|viewpoint|artwork|gallery|information"](around:${radius},${lat},${lon});
            node["historic"~"monument|memorial|castle|archaeological_site|ruins"](around:${radius},${lat},${lon});
            way["historic"~"monument|memorial|castle|archaeological_site|ruins"](around:${radius},${lat},${lon});
        );
        out center;
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`);
        }

        const data: OverpassResponse = await response.json();

        // Transform to our format
        const pois: TourismPOI[] = data.elements
            .filter((el) => el.tags?.name) // Only include named POIs
            .map((el) => {
                const tags = el.tags;
                const coordinates = el.lat && el.lon
                    ? { lat: el.lat, lon: el.lon }
                    : el.center || { lat: 0, lon: 0 };

                return {
                    id: `${el.type}-${el.id}`,
                    name: tags['name:en'] || tags.name || 'Unknown',
                    type: tags.tourism || tags.historic || 'attraction',
                    description: tags['description:en'] || tags.description,
                    lat: coordinates.lat,
                    lon: coordinates.lon,
                    wikipedia: tags.wikipedia,
                    website: tags.website,
                    opening_hours: tags.opening_hours,
                };
            })
            .filter((poi) => poi.lat !== 0 && poi.lon !== 0); // Filter out invalid coordinates

        return pois;
    } catch (error) {
        console.error('[Tourism] Failed to fetch POIs:', error);
        throw error;
    }
}
