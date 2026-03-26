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

## TinaCMS — Arquitetura e Padroes Obrigatorios

Referencia completa: `TINACMS-INTEGRATION.md` (guia de 500+ linhas com checklist, erros, alternativas).

### Padrao de pagina (Server → Client)

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

### Regras criticas

1. **NUNCA usar `client` (HTTP) em server components** — usar `databaseClient` (acesso direto ao DB). O `client` usa URL relativa `/api/tina/gql` que falha no Vercel SSR (Node.js exige URL absoluta).
2. **NUNCA criar `src/app/admin/[[...index]]/page.tsx`** — intercepta os assets JS do TinaCMS (`/admin/assets/*.js`) e retorna HTML em vez de JS, quebrando o CMS inteiro.
3. **SEMPRE usar `printf` (nunca `echo`)** ao setar env vars via Vercel CLI — `echo` adiciona `\n` silenciosamente, corrompendo MONGODB_DB_NAME, GITHUB_REPO, etc.
4. **X-Frame-Options: SAMEORIGIN** (nunca DENY) — TinaCMS abre o site num iframe para visual editing.
5. **Build command no Vercel**: `tinacms build && next build` — gera `public/admin/` (SPA) + `tina/__generated__/` (tipos + databaseClient).

### Patterns de editabilidade

| Pattern | Quando usar | Exemplo |
|---------|------------|---------|
| Campos fixos | Paginas com estrutura fixa (about, contact) | `hero.title`, `hero.subtitle` |
| Blocks (array com `_template`) | Paginas com secoes reordenaveis (home) | `blocks[0]._template === "hero"` |
| Settings collection | Dados globais (nav, footer, emails) | `settings.navigation`, `settings.contact.directEmails` |
| Theme collection | Cores, fontes, CSS vars | `theme.colorBrandOrange` → `--color-brand-orange` |
| Image fields (`type: "image"`) | Imagens editaveis em posts, cases, paginas | `coverImage`, `clientLogo` |

### O que TinaCMS NAO faz

- Drag-and-drop visual como Webflow/Framer (e sidebar editor, nao constructor)
- Editar CSS raw ou criar layouts
- Criar paginas com layout livre (layout e sempre definido no codigo)
- Editar estrutura de formularios (labels sim, inputs nao)

### Alternativas OSS (quando TinaCMS nao for suficiente)

| Necessidade | Ferramenta |
|------------|-----------|
| Layout visual drag-and-drop | Builder.io ou Framer |
| Backend complexo + CMS | Payload CMS |
| Site simples + DX melhor | Keystatic |
| Multi-tenant / equipe grande | Sanity.io |

### Debugging rapido

| Sintoma | Causa | Fix |
|---------|-------|-----|
| "Failed loading TinaCMS assets" | `app/admin/[[...index]]` intercepta JS | Deletar o arquivo |
| CredentialsSignin em producao | `MONGODB_DB_NAME` com `\n` | `printf "nome" \| vercel env add ...` |
| HttpError: Not Found ao salvar | `GITHUB_REPO` com `\n` | Recriar com `printf` |
| Failed to parse URL `/api/tina/gql` | Server usando `client` HTTP | Trocar por `databaseClient` |
| "refused to connect" no iframe | `X-Frame-Options: DENY` | Mudar para `SAMEORIGIN` |
| Two collections same `path` | Collections sem `match` compartilham dir | Adicionar `match: { include: "pattern" }` |
| Home vazia sem erro (blocks null) | `block._template` undefined, GraphQL retorna `__typename` | Helper `getBlockTemplate()` com mapeamento |
| `tinacms build` falha (GraphQL schema) | Dois templates com campo mesmo nome, tipos diferentes | Renomear campo em um dos templates |

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
MONGODB_DB_NAME=                   # Database name (SEM \n — usar printf!)

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
- **Env vars Vercel:** SEMPRE com `printf`, NUNCA com `echo`

## Documentacao

| Arquivo | Conteudo |
|---------|---------|
| `TINACMS-INTEGRATION.md` | Guia completo (500+ linhas): arquitetura, patterns, setup checklist, debugging, CSS/estilos, alternativas OSS |
| `SETUP.md` | Setup inicial de novo projeto |
| `~/.claude/memory/PRD-SITE-STARTER.md` | PRD completo com arquitetura, stack, AI discoverability |

## Arquivos Criticos

| Arquivo | Proposito |
|---------|-----------|
| `src/config/site.ts` | Identidade do site (nome, URL, descricao) |
| `src/lib/tina.ts` | Data fetching server-side (databaseClient pattern) |
| `src/lib/theme.ts` | Theme JSON → CSS custom properties |
| `src/lib/metadata.ts` | SEO metadata generator |
| `src/lib/structured-data.ts` | JSON-LD schema factories |
| `tina/config.ts` | TinaCMS collections + auth + build |
| `tina/database.ts` | Dual-mode DB (local/MongoDB) |
| `tina/collections/theme.ts` | Theme visual (cores, fontes via color picker) |
| `tina/collections/settings.ts` | Nav, emails, footer, social |
| `middleware.ts` | i18n routing (next-intl) |
| `vercel.json` | Build: "tinacms build && next build" |
