import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';

import en from './messages/en.json';
import fr from './messages/fr.json';
import ar from './messages/ar.json';

const locales = ['en', 'fr', 'ar'] as const;
const messages = { en, fr, ar };

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(locales, requested) ? requested : 'fr';

  return {
    locale,
    messages: messages[locale],
  };
});
