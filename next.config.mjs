import withPWA from 'next-pwa';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const WEEK  = 7  * 24 * 60 * 60; // seconds
const MONTH = 30 * 24 * 60 * 60; // seconds

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

const withPWAConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // App shell & pages — network first, fall back to cache
    {
      urlPattern: /^https:\/\/.*\/(_next\/static|_next\/image|favicon\.ico)/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 128, maxAgeSeconds: WEEK },
      },
    },
    // Mapbox vector/raster tiles — serve from cache instantly, tiles never change
    {
      urlPattern: /^https:\/\/[abc]\.tiles\.mapbox\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'mapbox-tiles',
        expiration: { maxEntries: 1000, maxAgeSeconds: MONTH },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Mapbox style tiles (v3 serves tiles via api.mapbox.com/styles too)
    {
      urlPattern: /^https:\/\/api\.mapbox\.com\/styles\/.*\/tiles\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'mapbox-tiles',
        expiration: { maxEntries: 1000, maxAgeSeconds: MONTH },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Mapbox fonts/glyphs — map labels, static, safe to cache long-term
    {
      urlPattern: /^https:\/\/api\.mapbox\.com\/fonts\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'mapbox-fonts',
        expiration: { maxEntries: 64, maxAgeSeconds: MONTH },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Mapbox style JSON & sprites — versioned URLs, safe to serve from cache immediately
    {
      urlPattern: /^https:\/\/api\.mapbox\.com\/(styles|sprites|v4)\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'mapbox-style',
        expiration: { maxEntries: 32, maxAgeSeconds: WEEK },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Supabase API responses
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-data',
        expiration: { maxEntries: 64, maxAgeSeconds: WEEK },
        networkTimeoutSeconds: 5,
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Report photos from Supabase storage
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'report-photos',
        expiration: { maxEntries: 128, maxAgeSeconds: WEEK },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // App pages — network first, fall back to cache for offline
    {
      urlPattern: /^\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'app-pages',
        expiration: { maxEntries: 16, maxAgeSeconds: WEEK },
        networkTimeoutSeconds: 5,
      },
    },
  ],
});

export default withPWAConfig(withNextIntl(nextConfig));
