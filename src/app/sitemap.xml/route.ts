import { siteConfig } from '@/config/site';
import { locales } from '@/config/i18n';

const pages = ['', '/about', '/contact', '/faq'];

export function GET() {
  const urls = pages.flatMap((path) =>
    locales.map((locale) => {
      const url = `${siteConfig.url}/${locale}${path}`;
      const alternates = locales
        .map(
          (l) =>
            `    <xhtml:link rel="alternate" hreflang="${l}" href="${siteConfig.url}/${l}${path}" />`
        )
        .join('\n');

      return `  <url>
    <loc>${url}</loc>
${alternates}
    <changefreq>weekly</changefreq>
  </url>`;
    })
  );

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
