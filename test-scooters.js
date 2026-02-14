const fetch = require('node-fetch');

async function testScooters() {
    const bbox = [41.20, 69.10, 41.40, 69.40]; // Tashkent approx bbox
    const [minLat, minLon, maxLat, maxLon] = bbox;
    const bboxStr = `(${minLat},${minLon},${maxLat},${maxLon})`;

    // Queries to test
    const queries = [
        'amenity=bicycle_rental',
        'amenity=charging_station',
        'amenity=kick-scooter_rental'
    ];

    for (const q of queries) {
        const [key, value] = q.split('=');
        const query = `
            [out:json][timeout:25];
            (
                node["${key}"="${value}"]${bboxStr};
                way["${key}"="${value}"]${bboxStr};
                relation["${key}"="${value}"]${bboxStr};
            );
            out center;
        `;

        console.log(`Testing query: ${q}`);
        try {
            const res = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query
            });
            const data = await res.json();
            console.log(`Results for ${q}: ${data.elements ? data.elements.length : 0}`);
        } catch (e) {
            console.error(`Error for ${q}:`, e.message);
        }
    }
}

testScooters();
