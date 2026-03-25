# Site Starter — Claude Code Instructions

> Template base para produtos digitais multilingues com TinaCMS, SEO, AI discoverability.

## PRD Completo

Referencia obrigatoria: `~/.claude/memory/PRD-SITE-STARTER.md`
Contem: arquitetura, stack, AI discoverability, compliance, checklist de lancamento.

## Stack

| Camada | Tecnologia | Porta dev |
|--------|-----------|-----------|
| Frontend | Next.js 16+ App Router + Tailwind + Shadcn/UI | 3010 |
| CMS | TinaCMS self-hosted (visual editing WYSIWYG) | 4001 (admin) |
| i18n | next-intl (locale prefix always) | — |
| Auth | NextAuth (credentials + Google OAuth) | — |
| DB | MongoDB Atlas (TinaCMS) + Supabase (opt-in) | — |
| Deploy | Vercel (frontend) + Railway (backend) | — |

## Comandos Dev

```bash
# Dev com TinaCMS (modo local — TINA_PUBLIC_IS_LOCAL=true)
npm run dev           # TINA_PUBLIC_IS_LOCAL=true tinacms dev -c "next dev -p 3010"

# Build (producao — sem TINA_PUBLIC_IS_LOCAL)
npm run build         # tinacms build && next build

# Seed users do CMS
npx tsx scripts/seed-users.ts

# Gerar llms.txt
npx tsx scripts/generate-llms-txt.ts
```

## Arquitetura de Paginas (TinaCMS + Next.js App Router)

```
Server Component (page.tsx)
  |-- Busca dados: databaseClient (producao) ou fs (local)
  |-- Serializa: JSON.parse(JSON.stringify(result))
  |-- Passa para Client Component

Client Component (xxx-client.tsx)
  |-- useTina({ query, variables, data })  ← live editing
  |-- tinaField(data, 'field')             ← click-to-edit
  |-- Renderiza componentes com data props
```

**CRITICO:** Nunca usar `client` (HTTP) do TinaCMS em server components — usar `databaseClient` (acesso direto ao DB). O `client` usa URL relativa que falha no Vercel SSR.

## Variaveis de Ambiente

```bash
# TinaCMS
TINA_PUBLIC_IS_LOCAL=true          # Dev only
GITHUB_OWNER=                      # GitHub repo owner
GITHUB_REPO=                       # GitHub repo name
GITHUB_PERSONAL_ACCESS_TOKEN=      # GitHub PAT (Contents R/W)
GITHUB_BRANCH=main                 # Branch for content

# Database
MONGODB_URI=                       # MongoDB Atlas connection string
MONGODB_DB_NAME=                   # Database name

# Auth
NEXTAUTH_SECRET=                   # openssl rand -base64 32
NEXTAUTH_URL=                      # http://localhost:3010 (dev) ou URL prod
GOOGLE_CLIENT_ID=                  # Google OAuth (optional)
GOOGLE_CLIENT_SECRET=              # Google OAuth (optional)
TINA_ALLOWED_EMAILS=               # Comma-separated email whitelist

# Analytics (optional)
NEXT_PUBLIC_GA4_ID=                # Google Analytics 4
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=      # Plausible domain

# Email (optional)
RESEND_API_KEY=                    # Resend.com API key
```

## Convencoes

- **Conteudo i18n:** `{slug}.{locale}.json` para paginas, `{slug}.{locale}.md` para posts
- **Locales:** pt (default), en. Configuravel em `src/config/i18n.ts`
- **Security headers:** SAMEORIGIN (para TinaCMS iframe), nosniff, strict referrer
- **AI Discoverability:** Manter `llms.txt`, structured data JSON-LD, robots.txt atualizado
- **Nao committar:** `.env.local`, `public/admin/` (gerado por tinacms build)

## Documentacao

| Arquivo | Conteudo |
|---------|---------|
| `TINACMS-INTEGRATION.md` | Guia completo: arquitetura, o que e possivel/impossivel, setup checklist, erros comuns, alternativas OSS |
| `SETUP.md` | Setup inicial de novo projeto |
| `~/.claude/memory/PRD-SITE-STARTER.md` | PRD completo com arquitetura, stack, AI discoverability |

## Arquivos Criticos

| Arquivo | Proposito |
|---------|-----------|
| `src/config/site.ts` | Identidade do site (nome, URL, descricao) |
| `src/lib/tina.ts` | Data fetching server-side (databaseClient pattern) |
| `src/lib/metadata.ts` | SEO metadata generator |
| `src/lib/structured-data.ts` | JSON-LD schema factories |
| `tina/config.ts` | TinaCMS collections + auth + build |
| `tina/database.ts` | Dual-mode DB (local/MongoDB) |
| `middleware.ts` | i18n routing (next-intl) |
| `vercel.json` | Build: "tinacms build && next build" |
