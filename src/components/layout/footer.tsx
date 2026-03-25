'use client';

import { useTranslations } from 'next-intl';
import { siteConfig } from '@/config/site';

export function Footer() {
  const t = useTranslations('Footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t py-8">
      <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>
          &copy; {year} {siteConfig.name}. {t('rights')}.
        </p>
      </div>
    </footer>
  );
}
