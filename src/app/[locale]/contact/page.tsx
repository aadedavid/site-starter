import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Navigation');

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold tracking-tight">{t('contact')}</h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
        {locale === 'pt'
          ? 'Formulario de contato em breve.'
          : 'Contact form coming soon.'}
      </p>
    </div>
  );
}
