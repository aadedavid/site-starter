# Site Starter

Template base para criar sites e plataformas digitais multilingues, SEO-first, AI-discoverable, com CMS visual (WYSIWYG).

## Features

- **Next.js 16+** App Router (SSR/SSG)
- **TinaCMS** self-hosted com visual editing (sidebar + click-to-edit)
- **i18n** com next-intl (pt/en, locale prefix)
- **SEO** completo (sitemap, robots.txt, JSON-LD, meta tags, hreflang)
- **AI Discoverability** (llms.txt, structured data, AI crawler rules)
- **Auth** com NextAuth (credentials + Google OAuth)
- **Analytics** GA4 + Plausible (privacy-first)
- **Contact form** com Resend + lead capture
- **Compliance** GDPR/LGPD ready

## Quick Start

```bash
# Clone e instale
git clone https://github.com/aadedavid/site-starter.git my-site
cd my-site
cp .env.example .env.local
# Preencha as credenciais em .env.local
npm install
npm run dev
```

Abra `http://localhost:3002` para o site e `http://localhost:3002/admin` para o CMS.

## Documentacao

- `CLAUDE.md` — Instrucoes para Claude Code
- `SETUP.md` — Guia completo de setup
- `~/.claude/memory/PRD-SITE-STARTER.md` — PRD com arquitetura completa

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js + Tailwind + Shadcn/UI |
| CMS | TinaCMS self-hosted |
| i18n | next-intl |
| Auth | NextAuth (Auth.js) |
| DB | MongoDB Atlas + Supabase (opt-in) |
| Deploy | Vercel + Railway |
