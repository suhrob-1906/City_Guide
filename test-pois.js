// Test script to diagnose POI fetching issues
// Run with: node test-pois.js

const bbox = [69.1, 41.2, 69.4, 41.4]; // Tashkent
const [minLon, minLat, maxLon, maxLat] = bbox;
const bboxStr = `(${minLat},${minLon},${maxLat},${maxLon})`;

// Test different query variations
const queries = [
    { name: 'Toilets (singular)', query: 'amenity=toilets' },
    { name: 'Toilets (plural)', query: 'amenity=toilet' },
    { name: 'Parking', query: 'amenity=parking' },
];

async function testQuery(name, query) {
    console.log(`\n=== Testing: ${name} ===`);
    console.log(`Query: ${query}`);

    const [key, value] = query.split('=');
    const overpassQuery = `
    [out:json][timeout:25];
    (
      node["${key}"="${value}"]${bboxStr};
      way["${key}"="${value}"]${bboxStr};
      relation["${key}"="${value}"]${bboxStr};
    );
    out center;
  `;

    console.log('Overpass Query:', overpassQuery.trim());

    try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: overpassQuery,
        });

        if (!res.ok) {
            console.error(`❌ HTTP Error: ${res.status}`);
            return;
        }

        const data = await res.json();
        console.log(`✅ Total elements: ${data.elements?.length || 0}`);

        if (data.elements?.length > 0) {
            const nodes = data.elements.filter(e => e.type === 'node').length;
            const ways = data.elements.filter(e => e.type === 'way').length;
            const relations = data.elements.filter(e => e.type === 'relation').length;
            console.log(`   Nodes: ${nodes}, Ways: ${ways}, Relations: ${relations}`);

            // Show first 3 results
            console.log('\nFirst 3 results:');
            data.elements.slice(0, 3).forEach((el, i) => {
                const coords = el.type === 'node'
                    ? `[${el.lon}, ${el.lat}]`
                    : `[${el.center?.lon}, ${el.center?.lat}]`;
                console.log(`  ${i + 1}. ${el.type}/${el.id} - ${el.tags?.name || 'Unnamed'} at ${coords}`);
            });
        } else {
            console.log('⚠️  No results found');
        }
    } catch (error) {
        console.error(`❌ Error:`, error.message);
    }
}

async function runTests() {
    console.log('🔍 Testing POI Queries for Tashkent');
    console.log(`Bounding Box: ${bboxStr}\n`);

    for (const { name, query } of queries) {
        await testQuery(name, query);
        await new Promise(r => setTimeout(r, 1000)); // Rate limit
    }

    console.log('\n✅ Tests complete!');
}

runTests();
