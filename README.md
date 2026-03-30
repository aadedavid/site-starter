# Site Starter

Template base para produtos digitais multilíngues. Pronto para edição visual, SEO, IA e produção.

---

## O que é

Site Starter é um template de código aberto para criar sites e produtos digitais com:

- Edição de conteúdo visual (sem código) via TinaCMS
- Suporte a múltiplos idiomas (pt/en por padrão)
- SEO e descoberta por IA nativos desde o primeiro dia
- Stack moderna e deploy em Vercel em minutos

Cada projeto clona este template e vira um repositório independente, com credenciais e deploy próprios.

---

## Para quem é

| Persona | Cenário |
|---------|---------|
| **Agência ou freelancer** | Criar sites de clientes com edição visual sem depender de Webflow ou WordPress |
| **Fundador** | Lançar site de produto multilíngue com SEO sólido sem montar stack do zero |
| **Dev ou time técnico** | Ter um template opinado e reutilizável para novos projetos |

---

## Que problema resolve

Criar um site com edição de conteúdo, i18n, SEO e deploy correto levava dias de configuração manual:

- Configurar Next.js + TinaCMS corretamente sem cometer os erros clássicos (server components, env vars, iframe headers)
- Montar i18n com roteamento por locale desde o início
- Gerar JSON-LD, sitemap, robots.txt e llms.txt para SEO e IA
- Criar script de seed, padrão de dados e estrutura de conteúdo reutilizável

Este template resolve tudo isso com decisões já tomadas, documentadas e testadas.

---

## Casos de uso

### Caso 1 - Agência criando site de cliente

**Persona:** Dev de agência entregando site para cliente não técnico que precisa editar conteúdo sozinho.

**Fluxo:** Clonar template → configurar `src/config/site.ts` → criar conteúdo inicial no TinaCMS → deploy no Vercel → passar acesso `/admin` ao cliente.

**Critério de aceite:**
- Cliente consegue editar texto e imagens sem tocar em código
- Alterações são commitadas automaticamente no GitHub
- Site aparece nos resultados do Google e em respostas de LLMs

---

### Caso 2 - Fundador lançando produto

**Persona:** Fundador técnico que quer lançar rápido com site multilíngue (pt + en) e SEO desde o dia 1.

**Fluxo:** Clonar template → ajustar identidade do site → adicionar conteúdo das páginas → conectar domínio → lançar.

**Critério de aceite:**
- Site acessível em `/pt/` e `/en/` com hreflang correto
- Lighthouse SEO > 90
- llms.txt gerado e robots.txt com estratégia de IA correta (permitir citação, bloquear treinamento)

---

### Caso 3 - Dev construindo template reutilizável

**Persona:** Dev que cria múltiplos projetos similares e quer evitar reconfigurar stack toda vez.

**Fluxo:** Fazer fork → personalizar padrões → usar skill `/new-site` para bootstrap de novos projetos.

**Critério de aceite:**
- Novo projeto rodando localmente com `npm run dev` em menos de 10 minutos após clonar
- TinaCMS em modo local funcionando sem MongoDB
- Todas as env vars documentadas em `.env.example`

---

## Features

### Implementado

| Feature | Arquivo principal |
|---------|------------------|
| Next.js 15 App Router + TypeScript | `next.config.ts` |
| Tailwind CSS 4 + typography plugin | `src/app/globals.css` |
| i18n com next-intl (pt/en, locale prefix) | `middleware.ts`, `src/i18n/` |
| TinaCMS visual editing (local + prod) | `tina/config.ts` |
| Dual-mode DB (filesystem dev / MongoDB prod) | `tina/database.ts` |
| Páginas Home e About com click-to-edit | `src/app/[locale]/` |
| Coleções TinaCMS: Pages, Posts, Settings | `tina/collections/` |
| SEO: metadata, canonical, hreflang, OG | `src/lib/metadata.ts` |
| JSON-LD: Organization, WebSite, Article, FAQ | `src/lib/structured-data.ts` |
| robots.txt com estratégia de IA | `src/app/robots.txt/route.ts` |
| llms.txt para descoberta por LLMs | `public/llms.txt` |
| sitemap.xml dinâmico | `src/app/sitemap.xml/route.ts` |
| Security headers (SAMEORIGIN, nosniff) | `vercel.json` |
| Header com navegação e troca de idioma | `src/components/layout/` |
| Scripts de seed e geração de llms.txt | `scripts/` |

### Em breve

| Feature | Prioridade |
|---------|-----------|
| Blog com listagem e página de post | P0 |
| Formulário de contato com Resend | P0 |
| Auth completo (NextAuth + Google OAuth) | P0 |
| FAQ com TinaCMS + schema JSON-LD | P1 |
| Analytics (GA4 + Plausible) | P1 |
| Tema visual editável no CMS (cores, fontes) | P1 |
| Shadcn/UI + design system base | P1 |
| GitHub Actions CI (lint + build no PR) | P1 |

### Planejado

| Feature | Prioridade |
|---------|-----------|
| Vercel preview deploys automáticos por PR | P2 |
| Branch protection + PR template | P2 |
| FAQ com busca semântica (embeddings) | P2 |
| A/B testing com Vercel Edge Config | P3 |
| RBAC no CMS (admin/editor) | P3 |
| Compliance GDPR/LGPD (cookie consent, privacy) | P3 |

---

## Roadmap

### Fase 1 - Fundação (concluída)

- [x] Next.js 15 + TinaCMS + next-intl
- [x] Páginas com visual editing (home, about)
- [x] SEO completo (metadata, JSON-LD, sitemap, robots.txt, llms.txt)
- [x] Deploy em Vercel

### Fase 2 - Conteúdo e conversão

- [ ] Blog funcional com posts Markdown
- [ ] Formulário de contato + email via Resend
- [ ] Auth (NextAuth + Google OAuth)
- [ ] FAQ editável no CMS

### Fase 3 - Produto

- [ ] Analytics integrado (GA4 + Plausible)
- [ ] Tema visual editável no CMS
- [ ] Design system com Shadcn/UI

### Fase 4 - Colaboração e escala

- [ ] CI/CD com GitHub Actions
- [ ] Preview deploys por branch
- [ ] FAQ com busca semântica
- [ ] Compliance GDPR/LGPD

---

## Quick start

```bash
# 1. Clonar o template
git clone https://github.com/aadedavid/site-starter.git meu-projeto
cd meu-projeto
git remote set-url origin https://github.com/SEU_USUARIO/meu-projeto.git

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais

# 4. Rodar em modo local (sem MongoDB — tudo em arquivos locais)
npm run dev
# → http://localhost:3010       (site)
# → http://localhost:3010/admin (CMS)
```

Ver `SETUP.md` para o guia completo com MongoDB, GitHub e deploy em Vercel.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 App Router + TypeScript + Tailwind CSS 4 |
| CMS | TinaCMS self-hosted (edição visual, Git-backed) |
| i18n | next-intl (locale prefix always) |
| Auth | NextAuth v4 (credentials + Google OAuth) |
| DB | MongoDB Atlas (TinaCMS) + Supabase (opt-in) |
| Email | Resend |
| Analytics | GA4 + Plausible |
| Deploy | Vercel (frontend) + Railway (backend opt-in) |

---

## Documentação

| Arquivo | O que contém |
|---------|-------------|
| `SETUP.md` | Guia passo a passo para configurar um novo projeto do zero |
| `CLAUDE.md` | Padrões de desenvolvimento, regras críticas, debugging |
| `TINACMS-INTEGRATION.md` | Referência completa do TinaCMS (500+ linhas) |
| `~/.claude/memory/PRD-SITE-STARTER.md` | PRD com arquitetura, AI discoverability, compliance |
