import type { Metadata, Viewport } from 'next';
import './globals.css';

const APP_URL = 'https://www.0dechets.com';
const TITLE = '0Déchets — Signalez les dépôts sauvages en Mauritanie';
const DESCRIPTION =
  'Dépôt sauvage ou benne débordante en Mauritanie ? Prenez une photo, épinglez le lieu et alertez votre communauté. Signalez en quelques secondes.';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: '%s | 0Déchets',
  },
  description: DESCRIPTION,
  keywords: [
    'signalement déchets Mauritanie',
    'dépôt sauvage Mauritanie',
    'déchets Nouakchott',
    'application signalement déchets',
    'benne débordante Mauritanie',
    'نفايات موريتانيا',
    'بلاغ نفايات موريتانيا',
    '0Déchets',
    'application civique Mauritanie',
    'signaler déchet',
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
        alt: '0Déchets — Signalez les dépôts sauvages en Mauritanie',
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
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
