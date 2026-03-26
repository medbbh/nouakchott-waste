'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'ar', label: 'ع' },
];

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    startTransition(() => {
      // pathname is like /fr or /fr?report=xxx — replace locale segment
      const newPath = pathname.replace(/^\/(en|fr|ar)/, `/${newLocale}`);
      router.replace(newPath);
    });
  };

  return (
    <div className="flex gap-1">
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          disabled={isPending}
          className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
            locale === code
              ? 'bg-white text-gray-900'
              : 'text-white/80 hover:text-white hover:bg-white/20'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
