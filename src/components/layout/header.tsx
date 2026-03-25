'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { siteConfig } from '@/config/site';
import { navigationItems } from '@/config/navigation';
import { LanguageSwitcher } from './language-switcher';
import type { Locale } from '@/config/i18n';

export function Header() {
  const locale = useLocale() as Locale;
  const items = navigationItems[locale];

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          {siteConfig.name}
        </Link>
        <nav className="flex items-center gap-6">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm hover:underline underline-offset-4"
            >
              {item.label}
            </Link>
          ))}
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
