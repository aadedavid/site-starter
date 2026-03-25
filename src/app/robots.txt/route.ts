import { siteConfig } from '@/config/site';

export function GET() {
  const body = `# Search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# AI retrieval (allow — appear in LLM responses)
User-agent: ChatGPT-User
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

# AI training (block — protect content)
User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

# Default
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${siteConfig.url}/sitemap.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
