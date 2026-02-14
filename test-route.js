const fetch = require('node-fetch');

async function testRoute() {
    try {
        const response = await fetch('http://localhost:3000/api/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start: [69.2401, 41.2995], // Tashkent
                end: [69.2451, 41.3005],   // Nearby point
                profile: 'foot-walking'
            })
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
    } catch (e) {
        console.error('Error:', e);
    }
}

testRoute();
