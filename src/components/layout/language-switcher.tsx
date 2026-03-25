'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales } from '@/config/i18n';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function handleChange(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div className="flex gap-1">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => handleChange(l)}
          className={`px-2 py-1 text-sm rounded uppercase ${
            l === locale
              ? 'bg-foreground text-background font-semibold'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
