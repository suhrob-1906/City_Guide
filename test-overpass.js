// Native fetch is available in Node.js 18+

async function testOverpass() {
    const bbox = [41.2, 69.1, 41.4, 69.4]; // South, West, North, East (Tashkent approx)
    const queries = [
        'amenity=toilets',
        'amenity=hospital',
        'wheelchair=yes'
    ];

    console.log('Testing Overpass API for Tashkent...');
    console.log(`BBox: ${bbox.join(',')}`);

    for (const q of queries) {
        const [key, value] = q.split('=');
        const query = `
        [out:json][timeout:25];
        (
            node["${key}"="${value}"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
            way["${key}"="${value}"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
            relation["${key}"="${value}"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
        );
        out center;
        `;

        try {
            const start = Date.now();
            const res = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query
            });

            if (!res.ok) {
                console.error(`❌ ${q}: HTTP ${res.status}`);
                continue;
            }

            const data = await res.json();
            const duration = Date.now() - start;
            console.log(`✅ ${q}: ${data.elements.length} elements found in ${duration}ms`);
        } catch (e) {
            console.error(`❌ ${q}: Error ${e.message}`);
        }
    }
}

testOverpass();
