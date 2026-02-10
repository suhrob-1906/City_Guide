# Uzbek City Helper 🇺🇿

A modern, full-stack Next.js application designed to provide real-time environmental data and accessible location services for major cities in Uzbekistan (Tashkent, Samarkand, Bukhara, and more).

![Project Banner](https://via.placeholder.com/1200x600?text=Uzbek+City+Helper+Dashboard)

## 🚀 Features

### 🌤️ Weather Monitoring
- Real-time weather conditions including temperature, humidity, wind speed, and precipitation.
- **Detailed Forecasts**: Hourly and 10-day weather forecasts powered by [Open-Meteo](https://open-meteo.com/).
- **Dynamic Visuals**: Beautifully animated gradients representing current weather conditions.

### 🌌 Geomagnetic Activity (Kp Index)
- Live geomagnetic storm tracking using data from [NOAA SWPC](https://www.swpc.noaa.gov/).
- **24-Hour History**: Interactive chart showing Kp index trends over the last day.
- **Health Advisories**: Clear explanations of what different Kp levels mean for your health and technology.

### 💨 Air Quality (AQI)
- Comprehensive air quality monitoring with data from [OpenWeatherMap](https://openweathermap.org/).
- **24-Hour Forecast**: Predictive chart for air quality changes.
- **Health Recommendations**: Actionable advice based on current pollution levels.

### 🗺️ Accessible Points of Interest (POI)
- Interactive map to find essential services:
  - **Restrooms**: Public toilets.
  - **Hospitals**: Medical facilities.
  - **Accessibility**: Wheelchair-accessible places.
- Powered by [OpenStreetMap](https://www.openstreetmap.org/) via Overpass API.

### 🌍 Application Intelligence
- **Full Localization**: Seamlessly switch between English and Russian languages.
- **Smart Caching**: Auto-detects environment (Redis vs. In-Memory) to cache API responses and respect rate limits.
- **Robust Error Handling**: Graceful fallbacks ensure the app works even if external services are temporarily down.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/) components
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Prisma ORM](https://www.prisma.io/))
- **Maps**: [MapLibre GL JS](https://maplibre.org/)
- **Deployment**: Optimized for [Render](https://render.com/) and [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (local or cloud)
- OpenWeather API Key (free tier works)

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/uzbek-city-helper.git
    cd uzbek-city-helper
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory:
    ```env
    # Database (Required for logging, optional for core features)
    DATABASE_URL="postgresql://user:password@localhost:5432/uzbek_city_helper"

    # APIs (Required)
    OPENWEATHER_API_KEY="your_openweather_api_key_here"

    # Map Style (Optional - use free demo if needed)
    NEXT_PUBLIC_MAP_STYLE_URL="https://demotiles.maplibre.org/style.json"
    
    # Optional Caching (Upstash Redis)
    UPSTASH_REDIS_REST_URL=""
    UPSTASH_REDIS_REST_TOKEN=""
    ```

4.  **Listen to the database (Optional):**
    If you have a database connection:
    ```bash
    npx prisma generate
    npx prisma migrate dev
    ```

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## ☁️ Deployment Guide

### Option 1: Deploy to Render (Recommended for Fullstack)

Render provides excellent support for Next.js and managed PostgreSQL/Redis services.

1.  **Database**: Create a new **PostgreSQL** database on Render. Copy the `Internal Database URL`.
2.  **Web Service**: Create a new **Web Service** connected to your GitHub repo.
3.  **Configuration**:
    - **Build Command**: `npm ci && npx prisma generate && npm run build`
    - **Start Command**: `npm start`
4.  **Environment Variables**: Add `DATABASE_URL` (from step 1) and `OPENWEATHER_API_KEY`.

### Option 2: Deploy to Vercel (Fastest)

Vercel is the native platform for Next.js.

1.  **Import Project**: Connect your GitHub repository to Vercel.
2.  **Database**: Vercel doesn't host databases, so use **Vercel Postgres**, **Supabase**, or **Neon**. Add the connection string as `DATABASE_URL`.
3.  **Environment Variables**: Add your `OPENWEATHER_API_KEY` in the dashboard.
4.  **Deploy**: Click deploy, and your app will be live in minutes.

---

## 📂 Project Structure

```
├── app/                  # Next.js App Router pages
│   ├── api/              # Backend API routes
│   ├── city/[slug]/      # Dynamic city dashboards
│   └── globals.css       # Global styles & tailwind imports
├── components/           # React components
│   ├── cards/            # Dashboard widgets
│   ├── map/              # Map visualization
│   └── ui/               # Reusable UI elements
├── config/               # Static configuration (Cities, Layers)
├── lib/                  # Utilities & Business Logic
│   ├── fetchers/         # External API clients
│   └── language.tsx      # Application localization
├── prisma/               # Database schema
└── public/               # Static assets
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- **Data Sources**: Open-Meteo, NOAA, OpenWeather, OpenStreetMap.
- **Icons**: Lucide React.
