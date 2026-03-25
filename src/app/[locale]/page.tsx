import { setRequestLocale } from 'next-intl/server';
import { getPageData } from '@/lib/tina';
import HomeClient from '@/components/pages/home-client';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const result = await getPageData(`home.${locale}.json`);
  return <HomeClient {...result} />;
}
