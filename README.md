# Uzbek City Helper

A fullstack Next.js application providing real-time weather, geomagnetic activity, air quality data, and accessible POI mapping for three Uzbek cities: Tashkent, Samarkand, and Bukhara.

## Features

- **Weather Data**: Real-time weather from Open-Meteo API (temperature, humidity, wind speed)
- **Geomagnetic Activity**: Kp index from NOAA Space Weather Prediction Center
- **Air Quality**: Human-friendly AQI levels from OpenWeather API
- **POI Mapping**: Interactive map with toilets, hospitals, and wheelchair-accessible locations
- **Smart Caching**: Automatic caching with TTL (in-memory, Upstash Redis, or Postgres)
- **Rate Limiting**: Protects external APIs from overuse
- **Stale Cache Fallback**: Shows cached data when APIs are unavailable
- **Glassmorphism UI**: Modern, premium design with smooth animations

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, GSAP
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Upstash Redis (optional, falls back to in-memory)
- **Map**: MapLibre GL JS with GeoJSON clustering
- **UI Components**: shadcn/ui

## Prerequisites

- Node.js 20+
- PostgreSQL database (Render Postgres recommended)
- OpenWeather API key (for air quality data)
- Map tiles URL (MapTiler, Maptiler Cloud, or similar)
- (Optional) Upstash Redis for production caching

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/uzbek_city_helper"

# OpenWeather API (required)
OPENWEATHER_API_KEY="your_openweather_api_key"

# Map tiles (required)
NEXT_PUBLIC_MAP_STYLE_URL="https://demotiles.maplibre.org/style.json"

# Upstash Redis (optional, recommended for production)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Render

### 1. Create GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Create Render PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Name: `uzbek-city-helper-db`
4. Copy the **Internal Database URL**

### 3. Create Render Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `uzbek-city-helper`
   - **Environment**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`

### 4. Configure Environment Variables

In Render Web Service → Environment, add:

```
DATABASE_URL=<Internal Database URL from step 2>
OPENWEATHER_API_KEY=<your key>
NEXT_PUBLIC_MAP_STYLE_URL=<your map tiles URL>
UPSTASH_REDIS_REST_URL=<optional>
UPSTASH_REDIS_REST_TOKEN=<optional>
NODE_VERSION=20.11.0
```

### 5. Deploy

Click "Create Web Service". Render will automatically:
- Install dependencies
- Run Prisma migrations
- Build the Next.js app
- Start the server

## API Endpoints

| Endpoint | Method | Parameters | TTL | Rate Limit |
|----------|--------|------------|-----|------------|
| `/api/weather` | GET | `city` (slug) | 10 min | None |
| `/api/kp` | GET | None | 30 min | None |
| `/api/air` | GET | `city` (slug) | 10 min | 1 req/10s |
| `/api/pois` | GET | `city` (slug), `type` (toilets/hospitals/wheelchair) | 24 hours | 1 req/10s |

## Caching Strategy

The app automatically selects the best caching strategy:

1. **Upstash Redis** (if `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set)
   - Persistent cache across restarts
   - Recommended for production

2. **In-Memory Cache** (fallback)
   - Fast, but data lost on restart
   - Suitable for development

3. **Postgres Cache** (alternative)
   - Use `CacheEntry` table if Redis is unavailable
   - Slower than Redis but persistent

## Rate Limiting

- **POI endpoint**: 1 request per 10 seconds per IP (protects Overpass API)
- **Air quality endpoint**: 1 request per 10 seconds per IP (protects OpenWeather API)
- Automatically uses Upstash Rate Limit if Redis is configured, otherwise in-memory

## Error Handling

- All API routes implement stale cache fallback
- If external API fails, returns last cached data with `stale: true` flag
- UI shows warnings for stale or missing data
- Graceful degradation ensures app never crashes

## Database Schema

### `Favorite`
- User-saved POI locations
- Uses client ID from cookie (no authentication required)

### `ApiLog`
- Tracks all API calls for monitoring
- Records endpoint, provider, status, latency, and cache hits

### `CacheEntry`
- Optional Postgres-based cache
- Alternative to Redis for persistent caching

## Project Structure

```
uzbek-city-helper/
├── app/
│   ├── api/              # API routes
│   ├── city/[slug]/      # City dashboard pages
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/
│   ├── cards/            # Data cards (Weather, Kp, Air Quality)
│   ├── map/              # Map components
│   └── ui/               # shadcn/ui components
├── config/
│   ├── cities.ts         # City definitions
│   └── layers.ts         # POI layer definitions
├── lib/
│   ├── fetchers/         # External API fetchers
│   ├── cache.ts          # Cache layer
│   ├── rateLimit.ts      # Rate limiting
│   ├── db.ts             # Prisma client
│   └── utils.ts          # Utilities
├── prisma/
│   └── schema.prisma     # Database schema
└── package.json
```

## Troubleshooting

### "Unable to load air quality data"
- Check that `OPENWEATHER_API_KEY` is correctly set
- Verify the API key is valid at [OpenWeather](https://openweathermap.org/)

### "Rate limit exceeded"
- Wait 10 seconds before retrying POI or air quality requests
- Consider setting up Upstash Redis for better rate limiting

### Map not loading
- Verify `NEXT_PUBLIC_MAP_STYLE_URL` is correctly configured
- Check that the map tiles provider is accessible

### Database connection errors
- Ensure `DATABASE_URL` is correct
- Run `npx prisma migrate deploy` to apply migrations

## License

MIT

## Credits

- Weather data: [Open-Meteo](https://open-meteo.com/)
- Geomagnetic data: [NOAA SWPC](https://www.swpc.noaa.gov/)
- Air quality data: [OpenWeather](https://openweathermap.org/)
- POI data: [OpenStreetMap](https://www.openstreetmap.org/) via Overpass API
