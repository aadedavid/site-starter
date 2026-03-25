import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { locales } from '@/config/i18n';

export function generatePageMetadata({
  title,
  description,
  locale,
  path,
  image,
}: {
  title: string;
  description?: string;
  locale: string;
  path: string;
  image?: string;
}): Metadata {
  const url = `${siteConfig.url}/${locale}${path}`;
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = `${siteConfig.url}/${l}${path}`;
  }
  languages['x-default'] = `${siteConfig.url}/${siteConfig.defaultLocale}${path}`;

  return {
    title: `${title} | ${siteConfig.name}`,
    description: description || siteConfig.description,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title,
      description: description || siteConfig.description,
      url,
      siteName: siteConfig.name,
      locale,
      type: 'website',
      ...(image && { images: [{ url: image }] }),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
