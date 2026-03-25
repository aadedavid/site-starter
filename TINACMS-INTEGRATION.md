# TinaCMS Integration Guide
## Boas práticas, arquitetura e roteiro para sites com edição visual WYSIWYG

> Guia completo baseado na integração do movii-site. Cobre o que funciona, o que não funciona, armadilhas comuns e alternativas ao TinaCMS.

---

## 1. O que o TinaCMS É e o que NÃO É

### O que é
- **Git-backed CMS**: Todo conteúdo editado vira commit no GitHub. Histórico completo, rollback via git.
- **Sidebar editor com click-to-edit**: Editor vê a página num iframe, clica num elemento → sidebar foca no campo correto.
- **Schema-driven**: Você define os campos no código TypeScript (`tina/collections/*.ts`). O CMS renderiza os formulários automaticamente.
- **Self-hosted**: Você controla os dados, sem vendor lock-in. MongoDB para indexação + GitHub para storage.

### O que NÃO é
| Expectativa | Realidade |
|------------|-----------|
| Drag-and-drop visual como Webflow/Framer | Não. TinaCMS é sidebar editor, não constructor visual |
| Editar CSS raw ou criar layouts | Não. CMS de conteúdo, não de código |
| Criar páginas completamente novas com layout livre | Parcial: pode criar novo documento, mas o layout é sempre definido no código |
| Editar estrutura de formulários (adicionar inputs) | Não. Labels sim, estrutura do formulário é código |
| "O que você vê é o que você ganha" 100% | Quase: o iframe mostra a página real, mas só campos mapeados com `tinaField()` são clicáveis |

### Resumo executivo para stakeholders
> "TinaCMS permite que editores não-técnicos editem textos, títulos, imagens, navegação, cores e reordenem seções de páginas. Não permite criar novos layouts ou editar código CSS. Equivale a um CMS moderno como Contentful ou Sanity, mas self-hosted e com edição visual in-page."

---

## 2. Arquitetura de Dados

### Estrutura de arquivos
```
tina/
  config.ts              # defineConfig — branch, auth, build, media, collections
  database.ts            # Dual-mode: local (fs) / MongoDB (prod)
  auth-provider.ts       # NextAuth <-> TinaCMS bridge
  collections/           # Schema por tipo de conteúdo (TypeScript)
    page.ts              # Páginas com blocks pattern
    post.ts              # Blog/insights (markdown)
    case.ts              # Cases/portfólio (markdown)
    faq.ts               # FAQ (JSON)
    legal.ts             # Legal (markdown)
    settings.ts          # Config global (JSON)
    theme.ts             # Tema visual — cores e fontes (JSON)

content/                 # Conteúdo gerenciado pelo TinaCMS (commitado no git)
  pages/                 # {slug}.{locale}.json
  posts/                 # {slug}.{locale}.md
  cases/                 # {slug}.{locale}.md
  faq/                   # faq.{locale}.json
  legal/                 # {slug}.{locale}.md
  settings/              # global.{locale}.json, theme.json
```

### Padrão obrigatório: Server Component → Client Component

```
Server Component (page.tsx)  [NO TINA REACT HOOKS]
  ├── getPageFromTina(slug, locale)  ← usa databaseClient, NUNCA client HTTP
  ├── JSON.parse(JSON.stringify(result))  ← serializa para Next.js props
  └── <PageClient query={query} variables={variables} data={data} />

Client Component (page-client.tsx)  [TINA REACT HOOKS AQUI]
  ├── const { data } = useTina({ query, variables, data })  ← live editing
  ├── tinaField(data.page, 'fieldName')  ← click-to-edit attribute
  └── renderiza componentes com data props
```

**CRÍTICO — databaseClient vs client:**
```typescript
// ✅ CORRETO — server component, acesso direto ao MongoDB
import { databaseClient } from "../../tina/__generated__/databaseClient";
const result = await databaseClient.queries.page({ relativePath: "home.pt.json" });

// ❌ ERRADO — client usa URL relativa /api/tina/gql que falha no Vercel SSR
import { client } from "../../tina/__generated__/client";
const result = await client.queries.page({ relativePath: "home.pt.json" }); // falha!
```

---

## 3. Editabilidade: o que cada padrão permite

### 3.1 Campos simples (string, textarea, rich-text, image, boolean, datetime)

```typescript
// Schema
{ type: "string", name: "title", label: "Título" }
{ type: "string", name: "body", label: "Corpo", ui: { component: "textarea" } }
{ type: "image", name: "coverImage", label: "Imagem de capa" }
{ type: "rich-text", name: "content", label: "Conteúdo", isBody: true }
```

```tsx
// No client component
<h1 data-tina-field={tinaField(page, 'title')}>{page.title}</h1>
<img src={page.coverImage} data-tina-field={tinaField(page, 'coverImage')} />
```

**Resultado**: Editor clica no título → sidebar foca no campo. Edita → página atualiza ao vivo.

### 3.2 Objetos aninhados

```typescript
{
  type: "object", name: "hero", label: "Hero",
  fields: [
    { type: "string", name: "title", label: "Título" },
    { type: "string", name: "subtitle", label: "Subtítulo" },
  ]
}
```

```tsx
<h1 data-tina-field={tinaField(page.hero, 'title')}>{page.hero.title}</h1>
```

### 3.3 Listas (arrays de strings ou objetos)

```typescript
// Lista de strings
{ type: "string", name: "items", label: "Items", list: true }

// Lista de objetos
{
  type: "object", name: "pillars", label: "Pilares", list: true,
  fields: [
    { type: "string", name: "title", label: "Título" },
    { type: "string", name: "desc", label: "Descrição" },
  ]
}
```

**Resultado**: Editor pode adicionar, remover e reordenar items na lista.

### 3.4 Blocks pattern (seções reordenáveis)

O pattern mais poderoso para dar autonomia ao editor:

```typescript
// Schema
{
  type: "object", name: "blocks", label: "Seções", list: true,
  templates: [
    {
      name: "hero",
      label: "Hero",
      fields: [/* ... */],
    },
    {
      name: "ctaFinal",
      label: "CTA Final",
      fields: [/* ... */],
    },
  ]
}
```

```tsx
// Client component
{page.blocks?.map((block, i) => {
  switch (block?._template) {
    case "hero": return <HeroSection key={i} data={block} />;
    case "ctaFinal": return <CtaSection key={i} data={block} />;
    default: return null;
  }
})}
```

**Resultado**: Editor pode adicionar, remover e **reordenar seções** da página via drag-and-drop no sidebar.

### 3.5 Navegação via Settings collection

```typescript
// settings.ts
{
  type: "object", name: "navigation", label: "Menu", list: true,
  fields: [
    { type: "string", name: "label", label: "Label" },
    { type: "string", name: "href", label: "Link" },
  ]
}
```

```tsx
// layout.tsx (server component)
const settings = await getSettingsFromTina(locale);
const navItems = settings?.navigation?.map(item => ({
  label: item.label,
  href: `/${locale}${item.href}`,
}));

<Header navItems={navItems} />
```

**Resultado**: Editor pode renomear items de menu, adicionar novas páginas no menu, reordenar.

### 3.6 Tema visual (cores e fontes)

```typescript
// theme.ts
{ type: "string", name: "colorBrandOrange", label: "Cor principal", ui: { component: "color" } }
{ type: "string", name: "fontDisplay", label: "Fonte de títulos", options: [...] }
```

```typescript
// src/lib/theme.ts (server)
const theme = JSON.parse(fs.readFileSync("content/settings/theme.json"));
const css = `--color-brand-orange: ${theme.colorBrandOrange}; ...`;
```

```tsx
// layout.tsx
<style dangerouslySetInnerHTML={{ __html: `:root { ${themeCss} }` }} />
```

**Resultado**: Editor muda cor primária → faz commit no GitHub → Vercel redeploy → todo o site usa a nova cor.

**Limitação**: Não é em tempo real como texto. Exige redeploy (automático via Vercel, ~1-2min).

---

## 4. O que NÃO dá para fazer no TinaCMS (e alternativas)

| Desejo do editor | TinaCMS faz? | Alternativa |
|-----------------|-------------|-------------|
| Criar novo layout de página do zero | ❌ | Blocks pattern + novos templates por código |
| Editar CSS raw / criar classes | ❌ | Theme collection + CSS vars |
| Mudar espaçamentos entre seções | ⚠️ Com esforço | Adicionar campo `spacing: small/medium/large` no block |
| Upload de vídeos grandes | ⚠️ Cloudinary/S3 necessário | `media.loadCustomStore` com Cloudinary |
| Preview em tempo real de cores | ⚠️ Parcial | Só após save + redeploy |
| Editor visual como Webflow | ❌ | Framer, Webflow, ou Builder.io |
| CMS multi-tenant (um CMS, vários sites) | ❌ | Contentful, Sanity (multi-tenant nativos) |
| Formulários customizáveis pelo editor | ❌ | Typeform, Tally (integrado via embed) |

---

## 5. Setup completo passo a passo

### 5.1 Instalação

```bash
npm install tinacms @tinacms/datalayer
```

### 5.2 Variáveis de ambiente

**IMPORTANTE: Use sempre `printf`, nunca `echo`** ao adicionar env vars via Vercel CLI.
`echo "valor"` adiciona `\n` silenciosamente → causa erros difíceis de debugar.

```bash
# ✅ CORRETO
printf "movii-site" | vercel env add GITHUB_REPO production

# ❌ ERRADO — adiciona \n ao valor
echo "movii-site" | vercel env add GITHUB_REPO production
```

Variáveis necessárias:
```bash
# Dev (.env.local)
TINA_PUBLIC_IS_LOCAL=true          # Usa filesystem local em vez do MongoDB

# GitHub (para salvar conteúdo)
GITHUB_OWNER=seu-usuario
GITHUB_REPO=nome-do-repo
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...  # Precisa: Contents R/W
GITHUB_BRANCH=main

# Database (MongoDB Atlas — para indexação TinaCMS)
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=nome-do-db         # SEM espaços, SEM \n

# Auth
NEXTAUTH_SECRET=...                # openssl rand -base64 32
NEXTAUTH_URL=https://seu-site.com
TINA_ALLOWED_EMAILS=admin@email.com,outro@email.com
```

### 5.3 Dual-mode database (local vs produção)

```typescript
// tina/database.ts
const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";

export default isLocal
  ? createLocalDatabase()          // lê do filesystem
  : createDatabase({               // lê do MongoDB
      databaseAdapter: new MongodbLevel({ uri, dbName }),
      gitProvider: new GitHubProvider({ owner, repo, token, branch }),
    });
```

### 5.4 Autenticação em produção

```typescript
// tina/auth-provider.ts — bridge NextAuth <-> TinaCMS
export class NextAuthProvider implements TinaAuthProvider {
  async getToken() {
    const session = await fetch("/api/auth/session").then(r => r.json());
    return session?.tinaCMSToken ?? null;
  }
  async authenticate() {
    window.location.href = "/api/auth/signin";
  }
}
```

```typescript
// tina/config.ts
authProvider: isLocal ? new LocalAuthProvider() : new NextAuthProvider()
```

### 5.4.1 Google OAuth (recomendado para produção)

**Setup no Google Cloud Console:**
1. Criar projeto (ou usar existente) em console.cloud.google.com
2. APIs & Services → Credentials → Create OAuth Client ID
3. Application type: Web application
4. Authorized redirect URIs:
   - `https://seu-site.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (dev)

**Env vars:**
```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**NextAuth route (adicionar Google provider):**
```typescript
import Google from "next-auth/providers/google";

providers: [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  }),
  Credentials({ /* ... email/senha como fallback */ }),
]
```

**Segurança:** O callback `signIn` valida `TINA_ALLOWED_EMAILS` — mesmo via Google OAuth, só emails autorizados conseguem logar.

**Multi-projeto:** Um único Google OAuth Client pode ter múltiplas redirect URIs, servindo vários sites. Ou criar um Client por projeto para isolamento.

### 5.5 Security headers para o iframe do TinaCMS

**CRÍTICO**: O TinaCMS visual editor abre **as páginas do site** (não só `/admin/`) dentro de um iframe para permitir click-to-edit. Por isso, `X-Frame-Options` deve ser `SAMEORIGIN` **em todo o site**, não apenas nas rotas `/admin/`.

```typescript
// next.config.ts — X-Frame-Options deve ser SAMEORIGIN GLOBALMENTE
{
  source: "/:path*",
  headers: [
    { key: "X-Frame-Options", value: "SAMEORIGIN" },  // NÃO usar DENY
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  ],
},
```

**Por que SAMEORIGIN global?**
- `DENY` bloqueia iframes mesmo do mesmo domínio → quebra o visual editor do TinaCMS
- `SAMEORIGIN` permite iframes apenas do mesmo domínio → seguro contra clickjacking externo
- Se colocar `SAMEORIGIN` só em `/admin/*`, as páginas do site continuam com `DENY` e o iframe do CMS não carrega

**Armadilha**: Colocar `SAMEORIGIN` só na rota `/admin/` NÃO resolve — o CMS abre as páginas reais do site (ex: `/pt/`, `/en/for-business`) no iframe, e essas páginas herdam o `DENY` da regra global `/:path*`.

### 5.5.1 NextAuth redirect callback (obrigatório)

**CRÍTICO**: Sem o callback `redirect`, o NextAuth v5 com Credentials provider redireciona para a raiz do site (`/`) após login, em vez de voltar ao CMS.

```typescript
// app/api/auth/[...nextauth]/route.ts — callbacks
callbacks: {
  async redirect({ url, baseUrl }) {
    // Preserva callbackUrl para que login retorne ao /admin/index.html
    if (url.startsWith("/")) return `${baseUrl}${url}`;
    if (new URL(url).origin === baseUrl) return url;
    return baseUrl;
  },
  async signIn({ user }) { /* ... */ },
  // ...
},
```

**Sem isso**: Login com sucesso → usuário vai parar na home do site em vez do CMS.
**Com isso**: Login → volta para `/admin/index.html` (ou `/admin-cms/index.html`).

### 5.6 Build command no Vercel

```json
// vercel.json
{
  "buildCommand": "tinacms build && next build"
}
```

`tinacms build` gera:
- `public/admin/` — SPA estática do CMS
- `tina/__generated__/` — tipos TypeScript + databaseClient

**CRÍTICO**: Não crie `src/app/admin/[[...index]]/page.tsx` — ele intercepta os assets JS do TinaCMS e retorna HTML, quebrando o CMS.

---

## 6. Padrões de dados i18n

```
content/pages/{slug}.{locale}.json   # ex: home.pt.json, home.en.json
content/posts/{slug}.{locale}.md     # ex: meu-post.pt.md
content/settings/global.{locale}.json
```

```typescript
// Convenção de filename no schema
ui: {
  filename: {
    readonly: true,
    slugify: (values) => `${values?.slug}.${values?.locale}`,
  }
}
```

---

## 7. Debugging de problemas comuns

### "Failed loading TinaCMS assets" / JS assets retornando HTML

**Causa**: Next.js catch-all route interceptando `/admin/*`.
**Fix**: Deletar `src/app/admin/[[...index]]/page.tsx`.
**Verificação**: `curl -sI https://seu-site.com/admin/assets/bundle.js | grep content-type` deve retornar `application/javascript`.

### CredentialsSignin / login falha em produção

**Causa**: `MONGODB_DB_NAME` com `\n` silencioso → conecta no banco `nome\n` (vazio).
**Fix**: `printf "nome-do-banco" | vercel env add MONGODB_DB_NAME production` (não echo!).

### HttpError: Not Found ao salvar pelo CMS

**Causa**: `GITHUB_REPO` ou `GITHUB_OWNER` com `\n` → URL da API do GitHub fica `repos/user/repo%0A/...` → 404.
**Fix**: Recriar TODOS os env vars do GitHub com `printf`.

### Failed to parse URL from /api/tina/gql

**Causa**: Server component usando `client` (HTTP) em vez de `databaseClient`.
**Fix**: Em todos os server components, importar e usar `databaseClient`.

### TinaCMS não abre o site no iframe ("refused to connect")

**Causa**: `X-Frame-Options: DENY` bloqueando o iframe. O CMS abre as **páginas reais do site** (ex: `/pt/`, `/en/about`) em iframe — não apenas `/admin/`.
**Fix**: Mudar para `SAMEORIGIN` **na regra global** `/:path*` do `next.config.js`. NÃO basta colocar `SAMEORIGIN` só em `/admin/*`.
**Verificação**: `curl -sI https://seu-site.com/en | grep x-frame` deve retornar `SAMEORIGIN`.

### Login redireciona para home em vez do CMS

**Causa**: NextAuth v5 com Credentials provider não preserva `callbackUrl` por padrão.
**Fix**: Adicionar callback `redirect` no NextAuth config:
```typescript
callbacks: {
  async redirect({ url, baseUrl }) {
    if (url.startsWith("/")) return `${baseUrl}${url}`;
    if (new URL(url).origin === baseUrl) return url;
    return baseUrl;
  },
  // ...demais callbacks
}
```
**Verificação**: Após login em `/api/auth/signin?callbackUrl=/admin/index.html`, deve voltar ao CMS.

### Two collections without match can not have the same `path`

**Causa**: Duas collections (ex: `settings` e `theme`) usando o mesmo `path: "content/settings"` sem `match`.
**Fix**: Adicionar `match: { include: "pattern" }` a cada collection:
```typescript
// settings.ts — filtra global.pt.json, global.en.json
match: { include: "global*" }

// theme.ts — filtra theme.json
match: { include: "theme" }
```

---

## 8. Estilos, CSS e o que o TinaCMS consegue controlar

### O que é possível controlar via TinaCMS

| Aspecto visual | Como | Impacto |
|--------------|------|---------|
| Cor primária (brand) | Theme collection + CSS vars | Imediato após redeploy (~1-2min) |
| Cor de fundo das seções | Theme collection | Imediato após redeploy |
| Fontes (escolha de lista) | Theme collection | Imediato após redeploy |
| Cores de acentos/dots | Theme collection | Imediato após redeploy |
| Espaçamento entre seções | Campo `spacing` no block template | Imediato no editor |
| Classes Tailwind por bloco | Campo `variant: string` + mapeamento no componente | Exige código |

### O que NÃO é possível sem código

- Espaçamentos arbitrários (padding/margin em pixels livres)
- Criação de novas classes CSS
- Mudança de layout (grid, flex, posicionamento)
- Animações
- Responsive breakpoints

### Arquitetura de CSS vars + TinaCMS

```
TinaCMS Admin
  └── Edita content/settings/theme.json
        └── git commit → GitHub
              └── Vercel redeploy automático
                    └── src/lib/theme.ts lê theme.json
                          └── layout.tsx injeta <style>:root { --color-brand-orange: #FB8C00; }
                                └── globals.css usa var(--color-brand-orange) nos componentes
```

**Fallback**: Se `theme.json` não existir ou o campo estiver vazio, o `globals.css` fornece os valores default. Sistema sempre funciona.

---

## 9. Alternativas ao TinaCMS — quando considerar

### Quando o TinaCMS é a escolha certa
- Site marketing com Next.js
- Conteúdo editável por equipe não-técnica
- Git-backed (histórico, rollback, branches)
- Self-hosted (controle total dos dados)
- Budget limitado (gratuito em self-hosted)

### Alternativas open-source a considerar

#### Payload CMS
- **Melhor para**: Aplicações com backend complexo, APIs customizadas, admin panel customizável
- **WYSIWYG**: Visual editing em desenvolvimento (menos maduro que TinaCMS)
- **Stack**: Next.js + MongoDB/PostgreSQL
- **Deploy**: Self-hosted no Railway/Render
- **Quando usar**: Quando precisar de lógica de negócio no backend + CMS

#### Keystatic (Thkeystatic)
- **Melhor para**: Sites Next.js/Astro menores, dev experience limpa
- **WYSIWYG**: Sem iframe preview (editor form-based)
- **Stack**: Git-backed como TinaCMS, mas mais simples
- **Deploy**: Vercel (integração nativa)
- **Quando usar**: Quando o TinaCMS for complexo demais para o projeto

#### Sanity.io
- **Melhor para**: Grandes equipes, conteúdo complexo, CDN de assets
- **WYSIWYG**: Presentation tool (separado do CMS, pago)
- **Stack**: SaaS (hosted), SDK TypeScript
- **Deploy**: Sanity cloud (gratuito até 3 usuários)
- **Quando usar**: Quando precisar de multi-tenant, CDN de imagens ou equipes grandes

#### Builder.io
- **Melhor para**: Landing pages visuais, drag-and-drop REAL
- **WYSIWYG**: Verdadeiro visual builder (mais próximo de Webflow)
- **Stack**: SaaS, integra com Next.js
- **Deploy**: Builder cloud
- **Quando usar**: Quando o editor precisa criar layouts visuais (não só editar texto)

### Tabela de decisão

| Necessidade | Recomendação |
|------------|-------------|
| Next.js + edição de textos/imagens + git | **TinaCMS** |
| Layout visual drag-and-drop | **Builder.io** ou Framer |
| Backend complexo + CMS | **Payload CMS** |
| Site simples + DX melhor | **Keystatic** |
| Multi-tenant / equipe grande | **Sanity.io** |
| E-commerce | **Medusa** + Sanity/TinaCMS |

---

## 10. Checklist de integração TinaCMS em site existente

### Fase 0 — Avaliação (1 dia)
- [ ] Mapear todo o conteúdo hardcoded (textos, imagens, links)
- [ ] Identificar quais seções precisam ser editáveis
- [ ] Decidir quais páginas precisam de blocks (reordenação) vs campos fixos
- [ ] Confirmar stack: Next.js App Router obrigatório

### Fase 1 — Infraestrutura (2-3 dias)
- [ ] Instalar tinacms + criar `tina/config.ts`
- [ ] Configurar `tina/database.ts` (dual-mode local/MongoDB)
- [ ] Configurar NextAuth + `tina/auth-provider.ts`
- [ ] Configurar `vercel.json`: `"buildCommand": "tinacms build && next build"`
- [ ] Configurar security headers (`X-Frame-Options: SAMEORIGIN`)
- [ ] Criar seed script `scripts/seed-users.ts`
- [ ] Testar build local com `TINA_PUBLIC_IS_LOCAL=true npm run dev`

### Fase 2 — Schema e conteúdo (2-3 dias por página)
- [ ] Criar collection para cada tipo de conteúdo
- [ ] Criar arquivos JSON/MD em `content/` com conteúdo atual
- [ ] Adicionar `getPageFromTina()` helpers no `src/lib/tina.ts`
- [ ] Criar server components que buscam dados do TinaCMS
- [ ] Criar client components com `useTina()` + `tinaField()`
- [ ] Testar visual editing em localhost

### Fase 3 — Editabilidade avançada (1-2 dias)
- [ ] Settings collection (navegação, emails, footer)
- [ ] Theme collection (cores, fontes)
- [ ] Blocks pattern para páginas que precisam de reordenação
- [ ] Campos de imagem (`type: "image"`) em posts e cases

### Fase 4 — Deploy e validação (1 dia)
- [ ] Configurar env vars na Vercel com `printf` (NUNCA echo)
- [ ] Verificar `tinacms build` sem erros
- [ ] Testar `/admin/index.html` → login → edição → salvar
- [ ] Verificar que assets JS do CMS retornam `content-type: application/javascript`
- [ ] Testar visual editing em produção
- [ ] Adicionar usuários via seed script ou diretamente no MongoDB

### Fase 5 — Handoff para editores (meio dia)
- [ ] Gravar vídeo de 5min: como logar, editar, salvar
- [ ] Documentar quais campos existem em cada página
- [ ] Documentar o que NÃO pode ser editado sem desenvolvedor
- [ ] Criar backup do `content/` antes de dar acesso

---

## 11. Blog / Insights — Fluxo Completo

### Arquitetura de pagina de post

```
src/app/[locale]/insights/page.tsx        → Lista de posts (postConnection)
src/app/[locale]/insights/[slug]/page.tsx → Post individual (getPostFromTina)
src/components/pages/insights-client.tsx  → Client com useTina (lista)
src/components/pages/post-client.tsx      → Client com useTina (individual)
content/posts/{slug}.{locale}.md          → Conteudo markdown com frontmatter
```

### Criar novo post via TinaCMS

1. No admin (`/admin`), ir em "Blog / Insights"
2. Clicar "Create" → preencher titulo, slug, locale, excerpt, categoria, autor
3. Escrever conteudo no editor rich-text
4. Salvar → TinaCMS faz commit no GitHub → Vercel redeploy automatico

### Formato do arquivo markdown

```yaml
---
title: "Titulo do artigo"
locale: "pt"
slug: "meu-artigo"
excerpt: "Resumo curto"
author: "Alexandre Dedavid"
category: "Estrategia"
readingTime: "~6 min"
status: "published"    # published | draft | coming-soon
hipotese: false
publishedAt: "2026-03-25T10:00:00.000Z"
coverImage: "/images/meu-artigo.jpg"
---

## Conteudo em markdown aqui...
```

### Renderizacao do body

- **Producao (TinaCMS)**: Body vem como rich-text AST → renderizado com `TinaMarkdown`
- **Local (filesystem)**: Body vem como string markdown → renderizado com `markdownToHtml()` (parser simples embutido)
- **Coming-soon sem body**: Mostra placeholder "Conteudo em desenvolvimento"

### Sitemap dinamico

O sitemap (`src/app/sitemap.ts`) le posts e cases do TinaCMS automaticamente:
- Posts `published` e `coming-soon` sao incluidos (drafts nao)
- Cases sao incluidos com alternates hreflang
- Fallback silencioso se TinaCMS estiver indisponivel

### FadeIn em paginas de conteudo

**NAO usar FadeIn** em paginas de artigo (post-client). O intersection observer pode nao disparar para conteudo longo abaixo do fold, deixando o body com opacity 0.

---

## 12. Tipografia (Tailwind v4 + prose)

### @tailwindcss/typography e Tailwind v4

A versao 0.5.x do plugin `@tailwindcss/typography` nao e compativel com `@plugin` ou `@import` no Tailwind v4.2+. A solucao e definir os estilos `.prose` manualmente no `globals.css`.

### Estilos minimos para `.prose`

```css
.prose { font-size: 1.125rem; line-height: 1.8; color: #434343; }
.prose h2 { font-size: 1.5rem; font-weight: 600; margin-top: 2.5rem; margin-bottom: 1rem; color: #212121; }
.prose h3 { font-size: 1.25rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #212121; }
.prose p { margin-bottom: 1.25rem; }
.prose strong { font-weight: 700; color: #212121; }
.prose ul, .prose ol { padding-left: 1.5rem; margin-bottom: 1.25rem; }
.prose li { margin-bottom: 0.5rem; }
.prose a { color: #FB8C00; text-decoration: none; }
.prose blockquote { border-left: 3px solid #FB8C00; padding-left: 1rem; font-style: italic; color: #757575; }
```

---

## 13. Google Auth para TinaCMS

### O que ja esta pronto no codigo

- NextAuth configurado com Google provider em `src/app/api/auth/[...nextauth]/route.ts`
- MongoDBAdapter para persistir sessoes
- Whitelist de emails via `TINA_ALLOWED_EMAILS`
- Callback URLs documentados no `.env.local`

### Setup do Google OAuth Client

1. Ir em [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Criar projeto (ou usar existente)
3. Ir em "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth client ID"
4. Tipo: "Web application"
5. **Authorized redirect URIs**:
   - Dev: `http://localhost:3002/api/auth/callback/google`
   - Prod: `https://moviiconsultancy.com/api/auth/callback/google`
6. Copiar Client ID e Client Secret
7. Setar no Vercel (SEMPRE com `printf`, nunca `echo`):
   ```bash
   printf "CLIENT_ID_AQUI" | vercel env add GOOGLE_CLIENT_ID production
   printf "CLIENT_SECRET_AQUI" | vercel env add GOOGLE_CLIENT_SECRET production
   ```
8. Setar em `.env.local` para dev:
   ```
   GOOGLE_CLIENT_ID=xxx
   GOOGLE_CLIENT_SECRET=xxx
   ```
9. Adicionar emails permitidos:
   ```bash
   printf "aadedavid@gmail.com,patricia@movii.com.br" | vercel env add TINA_ALLOWED_EMAILS production
   ```

### Fluxo de autenticacao

1. Usuario acessa `/admin/index.html`
2. TinaCMS `NextAuthProvider` verifica sessao via `/api/auth/session`
3. Se nao autenticado, redireciona para `/api/auth/signin`
4. Pagina de login mostra: Google button + formulario email/senha
5. Apos login, callback verifica se email esta em `TINA_ALLOWED_EMAILS`
6. Se permitido, sessao JWT 24h criada → usuario volta ao CMS

---

## 14. Referências

- [TinaCMS Docs](https://tina.io/docs/)
- [TinaCMS Contextual Editing](https://tina.io/docs/contextual-editing/react)
- [TinaCMS Blocks Pattern](https://tina.io/docs/editing/blocks)
- [TinaCMS MongoDB](https://tina.io/docs/reference/self-hosted/database-adapter/mongodb)
- [NextAuth Credentials](https://next-auth.js.org/providers/credentials)
- [Payload CMS](https://payloadcms.com/)
- [Keystatic](https://keystatic.com/)
- [Builder.io](https://www.builder.io/)
