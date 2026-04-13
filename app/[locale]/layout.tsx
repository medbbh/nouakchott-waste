import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import { FingerprintProvider } from '@/context/FingerprintContext';

const locales = ['en', 'fr', 'ar'];
const APP_URL = 'https://www.0dechets.com';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: '0Déchets',
  url: APP_URL,
  description:
    'Civic waste reporting PWA for Mauritania. Citizens report illegal dumps, overflowing bins, and missed garbage collections by taking a photo. Reports appear as real-time pins on a public map to hold local authorities accountable.',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any',
  browserRequirements: 'Requires JavaScript. Works on all modern mobile browsers.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  inLanguage: ['fr', 'ar', 'en'],
  availableLanguage: [
    { '@type': 'Language', name: 'French', alternateName: 'fr' },
    { '@type': 'Language', name: 'Arabic', alternateName: 'ar' },
    { '@type': 'Language', name: 'English', alternateName: 'en' },
  ],
  spatialCoverage: {
    '@type': 'Place',
    name: 'Mauritania',
    geo: { '@type': 'GeoCoordinates', latitude: 18.0858, longitude: -15.9785 },
  },
  featureList: [
    'Report illegal waste dumps with photo evidence',
    'GPS location from EXIF or geolocation',
    'Real-time map with clustered report pins',
'Share reports via WhatsApp and Facebook',
    'Works offline as a PWA',
    'Available in French, Arabic, and English',
  ],
};

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(locales, locale)) notFound();

  const messages = await getMessages();
  const isRTL = locale === 'ar';

  return (
    <html lang={locale} dir={isRTL ? 'rtl' : 'ltr'}>
      <head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/mapbox-gl.css" />
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://events.mapbox.com" />
        <link rel="dns-prefetch" href="https://a.tiles.mapbox.com" />
        <link rel="dns-prefetch" href="https://b.tiles.mapbox.com" />
        <link rel="canonical" href={`${APP_URL}/${locale}`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <FingerprintProvider>
            {children}
          </FingerprintProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
