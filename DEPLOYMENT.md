# Deployment Guide - Render + Postgres + Upstash Redis

This guide walks you through deploying the Uzbek City Helper to Render with PostgreSQL and optional Upstash Redis.

## Prerequisites

- GitHub account
- Render account (free tier works)
- OpenWeather API key ([Get one here](https://openweathermap.org/api))
- (Optional) MapTiler account for map tiles ([Get free key](https://www.maptiler.com/))
- (Optional) Upstash account for Redis caching ([Get free account](https://upstash.com/))

## Step 1: Prepare Your Repository

### 1.1 Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: Uzbek City Helper"
```

### 1.2 Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository (e.g., `uzbek-city-helper`)
3. Push your code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/uzbek-city-helper.git
git branch -M main
git push -u origin main
```

## Step 2: Set Up Render PostgreSQL Database

### 2.1 Create Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `uzbek-city-helper-db`
   - **Database**: `uzbek_city_helper`
   - **User**: (auto-generated)
   - **Region**: Choose closest to your users
   - **Plan**: Free (or paid for production)
4. Click **"Create Database"**

### 2.2 Get Database URL

1. Once created, go to the database page
2. Scroll to **"Connections"**
3. Copy the **"Internal Database URL"** (starts with `postgresql://`)
   - **Important**: Use the **Internal** URL, not External
   - Format: `postgresql://user:password@hostname/database`

## Step 3: Set Up Upstash Redis (Optional but Recommended)

### 3.1 Create Redis Database

1. Go to [Upstash Console](https://console.upstash.com)
2. Click **"Create Database"**
3. Configure:
   - **Name**: `uzbek-city-helper-cache`
   - **Type**: Regional
   - **Region**: Choose closest to your Render region
4. Click **"Create"**

### 3.2 Get Redis Credentials

1. Go to your database page
2. Scroll to **"REST API"** section
3. Copy:
   - **UPSTASH_REDIS_REST_URL**
   - **UPSTASH_REDIS_REST_TOKEN**

## Step 4: Deploy to Render

### 4.1 Create Web Service

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Click **"Connect a repository"**
3. Authorize GitHub and select your repository
4. Configure:
   - **Name**: `uzbek-city-helper`
   - **Region**: Same as your database
   - **Branch**: `main`
   - **Root Directory**: (leave empty)
   - **Environment**: `Node`
   - **Build Command**: `npm ci && npm run build:prod`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for production)

### 4.2 Configure Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add:

#### Required Variables

```bash
# Database (from Step 2.2)
DATABASE_URL=postgresql://user:password@hostname/database

# OpenWeather API Key
OPENWEATHER_API_KEY=your_openweather_api_key

# Map Style URL (use demo or get MapTiler key)
NEXT_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
# OR with MapTiler:
# NEXT_PUBLIC_MAP_STYLE_URL=https://api.maptiler.com/maps/basic/style.json?key=YOUR_MAPTILER_KEY

# Node Version
NODE_VERSION=20.11.0
```

#### Optional Variables (Recommended for Production)

```bash
# Upstash Redis (from Step 3.2)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# App URL (will be provided by Render after deployment)
NEXT_PUBLIC_APP_URL=https://uzbek-city-helper.onrender.com
```

### 4.3 Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Generate Prisma client
   - Run database migrations
   - Build Next.js app
   - Start the server

3. Wait for deployment (usually 3-5 minutes)
4. Your app will be available at: `https://uzbek-city-helper.onrender.com`

## Step 5: Verify Deployment

### 5.1 Check Build Logs

1. Go to your Web Service page
2. Click **"Logs"** tab
3. Look for:
   - ✅ `Prisma Client generated`
   - ✅ `Database migrations applied`
   - ✅ `Next.js build completed`
   - ✅ `Server started on port 3000`

### 5.2 Test the Application

1. Open your deployed URL
2. Verify:
   - ✅ Home page loads with 3 city cards
   - ✅ Click on a city (e.g., Tashkent)
   - ✅ Weather card shows data
   - ✅ Kp index card shows data
   - ✅ Air quality card shows data
   - ✅ Map loads with tiles
   - ✅ POI layer switching works
   - ✅ Clicking "Refresh" loads POI markers

### 5.3 Check Cache Status

Look in the logs for:
- `✓ Using Upstash Redis cache` (if Redis configured)
- `⚠ Using in-memory cache` (if no Redis)

## Step 6: Post-Deployment Configuration

### 6.1 Update App URL

1. Copy your Render URL (e.g., `https://uzbek-city-helper.onrender.com`)
2. Go to **Environment** tab
3. Update `NEXT_PUBLIC_APP_URL` with your actual URL
4. Render will auto-redeploy

### 6.2 Set Up Custom Domain (Optional)

1. In Render, go to **Settings** → **Custom Domains**
2. Add your domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain

## Troubleshooting

### Build Fails: "Authentication failed against database"

**Problem**: Database URL is incorrect or database doesn't exist

**Solution**:
1. Verify `DATABASE_URL` is the **Internal** URL from Render Postgres
2. Ensure database is running (check Render Postgres dashboard)
3. Check for typos in the connection string

### Build Fails: "Prisma migrate deploy failed"

**Problem**: Migration issues

**Solution**:
1. Check Render Postgres logs for errors
2. Manually run migrations via Render Shell:
   ```bash
   npx prisma migrate deploy
   ```

### App Loads but "Unable to load air quality data"

**Problem**: OpenWeather API key is invalid or missing

**Solution**:
1. Verify `OPENWEATHER_API_KEY` is set correctly
2. Test your API key at: `https://api.openweathermap.org/data/2.5/air_pollution?lat=41.3&lon=69.3&appid=YOUR_KEY`
3. Ensure you've activated the API key (can take a few minutes)

### Map Doesn't Load

**Problem**: Map style URL is incorrect

**Solution**:
1. Verify `NEXT_PUBLIC_MAP_STYLE_URL` is set
2. For production, get a free MapTiler key instead of using demo tiles
3. Check browser console for errors

### "Rate limit exceeded" Errors

**Problem**: Too many requests to POI or air quality endpoints

**Solution**:
1. This is expected behavior (1 request per 10 seconds)
2. Set up Upstash Redis for better rate limiting
3. Data is cached for 24 hours (POIs) or 10 minutes (air quality)

### Cache Not Persisting

**Problem**: Using in-memory cache (data lost on restart)

**Solution**:
1. Set up Upstash Redis (see Step 3)
2. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Redeploy - logs should show "Using Upstash Redis cache"

## Monitoring and Maintenance

### View API Logs

The app logs all API calls to the database. To view:

```sql
-- Connect to Render Postgres via psql or GUI tool
SELECT * FROM "ApiLog" ORDER BY "createdAt" DESC LIMIT 100;

-- Check cache hit rate
SELECT 
  endpoint,
  COUNT(*) as total_requests,
  SUM(CASE WHEN cached THEN 1 ELSE 0 END) as cached_requests,
  ROUND(100.0 * SUM(CASE WHEN cached THEN 1 ELSE 0 END) / COUNT(*), 2) as cache_hit_rate
FROM "ApiLog"
GROUP BY endpoint;
```

### Update Dependencies

```bash
# Update Prisma
npm install prisma@latest @prisma/client@latest

# Update Next.js
npm install next@latest react@latest react-dom@latest

# Commit and push to trigger redeploy
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

## Cost Optimization

### Free Tier Limits

- **Render Web Service**: 750 hours/month (enough for 1 app)
- **Render Postgres**: 1GB storage, 97 hours/month (spins down after 15 min inactivity)
- **Upstash Redis**: 10,000 commands/day

### Recommendations

1. **Use Upstash Redis** to reduce database load
2. **Increase cache TTL** for POI data (already 24 hours)
3. **Monitor API logs** to identify high-traffic endpoints
4. **Upgrade to paid plan** if you exceed free tier limits

## Security Checklist

- ✅ Never commit `.env` file to Git
- ✅ Use environment variables for all secrets
- ✅ Use Internal Database URL (not External)
- ✅ Enable rate limiting (already implemented)
- ✅ Keep dependencies updated
- ✅ Monitor API logs for suspicious activity

## Support

If you encounter issues:

1. Check Render logs for error messages
2. Review this troubleshooting guide
3. Check the main README.md for API documentation
4. Verify all environment variables are set correctly

---

**Congratulations!** Your Uzbek City Helper is now deployed and running on Render! 🎉
