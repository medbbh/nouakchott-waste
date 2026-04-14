import createMiddleware from 'next-intl/middleware';
import { defineRouting } from 'next-intl/routing';

const routing = defineRouting({
  locales: ['en', 'fr', 'ar'],
  defaultLocale: 'fr',
  localePrefix: 'always',
  localeDetection: true,
});

export default createMiddleware(routing);

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|mapbox-gl.css|sw.js|workbox-.*\\.js|og-image.*|logo\\.svg|llms\\.txt).*)',
  ],
};
