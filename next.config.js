/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    experimental: {
        optimizeCss: true,
        optimizePackageImports: ['lucide-react'],
    },
    // Reduce font preload warnings
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
    },
}

module.exports = nextConfig
