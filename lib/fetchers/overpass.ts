export interface PoiFeature {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number];
    };
    properties: {
        id: string;
        name?: string;
        type: string;
        tags: Record<string, any>;
    };
}

export interface PoiCollection {
    type: 'FeatureCollection';
    features: PoiFeature[];
    fetchedAt: string;
}

export async function fetchPois(
    bbox: [number, number, number, number],
    query: string
): Promise<PoiCollection> {
    const [minLon, minLat, maxLon, maxLat] = bbox;

    // Parse query: "amenity=toilets" -> ["amenity", "toilets"]
    const [key, value] = query.split('=');

    const overpassQuery = `
    [out:json][timeout:25];
    (
      node["${key}"="${value}"](${minLat},${minLon},${maxLat},${maxLon});
      way["${key}"="${value}"](${minLat},${minLon},${maxLat},${maxLon});
      relation["${key}"="${value}"](${minLat},${minLon},${maxLat},${maxLon});
    );
    out center;
  `;

    console.log('[Overpass] Query:', overpassQuery.trim());

    const url = 'https://overpass-api.de/api/interpreter';
    const res = await fetch(url, {
        method: 'POST',
        body: overpassQuery,
    });

    if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);

    const data = await res.json();
    console.log(`[Overpass] Raw elements count: ${data.elements?.length}`);

    if (data.elements?.length > 0) {
        const nodes = data.elements.filter((e: any) => e.type === 'node').length;
        const ways = data.elements.filter((e: any) => e.type === 'way').length;
        const relations = data.elements.filter((e: any) => e.type === 'relation').length;
        console.log(`[Overpass] Types breakdown: Nodes=${nodes}, Ways=${ways}, Relations=${relations}`);

        // Log sample of each type to check structure
        const sampleNode = data.elements.find((e: any) => e.type === 'node');
        if (sampleNode) console.log('[Overpass] Sample Node:', JSON.stringify(sampleNode));

        const sampleWay = data.elements.find((e: any) => e.type === 'way');
        if (sampleWay) console.log('[Overpass] Sample Way:', JSON.stringify(sampleWay));
    }

    const features: PoiFeature[] = data.elements
        .filter((el: any) => {
            // Filter out elements without coordinates/center
            if (el.type === 'node') {
                const hasCoords = el.lat !== undefined && el.lon !== undefined;
                if (!hasCoords) console.log(`[Overpass] Dropped Node ${el.id} - missing lat/lon`);
                return hasCoords;
            }
            if (el.type === 'way' || el.type === 'relation') {
                const hasCenter = el.center && el.center.lat !== undefined && el.center.lon !== undefined;
                if (!hasCenter) console.log(`[Overpass] Dropped ${el.type} ${el.id} - missing center`);
                return hasCenter;
            }
            return false;
        })
        .map((el: any) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [
                    parseFloat(el.type === 'node' ? el.lon : el.center.lon),
                    parseFloat(el.type === 'node' ? el.lat : el.center.lat)
                ],
            },
            properties: {
                id: `${el.type}/${el.id}`,
                name: el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:ru'] || 'Unnamed',
                type: query.split('=')[0],
                tags: el.tags || {},
            },
        }));

    console.log(`[Overpass] Parsed ${features.length} valid features from ${data.elements?.length || 0} elements`);

    return {
        type: 'FeatureCollection',
        features,
        fetchedAt: new Date().toISOString(),
    };
}
