import { setRequestLocale } from 'next-intl/server';
import { getPageData } from '@/lib/tina';
import PageClient from '@/components/pages/page-client';

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const result = await getPageData(`about.${locale}.json`);
  return <PageClient {...result} />;
}
