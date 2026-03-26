import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import { FingerprintProvider } from '@/context/FingerprintContext';

const locales = ['en', 'fr', 'ar'];

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
