import type { Metadata, Viewport } from 'next';
import './globals.css';

const APP_URL = 'https://www.0dechets.com';
const TITLE = '0Déchets — Waste Reporting in Nouakchott';
const DESCRIPTION =
  '0Déchets is a free civic PWA for reporting illegal waste dumps, overflowing bins, and missed garbage collections in Nouakchott, Mauritania. Take a photo, pin the location, and hold ARMA Holding accountable.';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: '%s | 0Déchets',
  },
  description: DESCRIPTION,
  keywords: [
    'waste reporting Nouakchott',
    'déchets Nouakchott',
    'illegal dump Mauritania',
    'ARMA Holding',
    'civic app Mauritania',
    'garbage reporting',
    'signalement déchets',
    'بلاغ نفايات نواكشوط',
    'نفايات موريتانيا',
    '0Déchets',
    'PWA Mauritania',
  ],
  authors: [{ name: '0Déchets' }],
  creator: '0Déchets',
  publisher: '0Déchets',
  category: 'civic technology',
  classification: 'Environment, Civic',
  manifest: '/manifest.json',

  openGraph: {
    type: 'website',
    url: APP_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: '0Déchets',
    locale: 'fr_MR',
    alternateLocale: ['ar_MR', 'en_US'],
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '0Déchets — Waste Reporting Map for Nouakchott',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },

  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '0Déchets',
  },
};

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
