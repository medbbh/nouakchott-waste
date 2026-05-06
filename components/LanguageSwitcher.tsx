'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    startTransition(() => {
      const newPath = pathname.replace(/^\/(en|fr|ar)/, `/${newLocale}`);
      router.replace(newPath);
    });
  };

  return (
    <select
      value={locale}
      onChange={(e) => switchLocale(e.target.value)}
      disabled={isPending}
      className="bg-transparent text-white text-base font-semibold appearance-none cursor-pointer outline-none"
    >
      <option value="ar" className="text-gray-900 bg-white">ar</option>
      <option value="fr" className="text-gray-900 bg-white">fr</option>
      <option value="en" className="text-gray-900 bg-white">en</option>
    </select>
  );
}
