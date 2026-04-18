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
// Client component — IMPORTANTE: usar __typename, NÃO _template
const TYPENAME_TO_TEMPLATE: Record<string, string> = {
  PageBlocksHero: "hero",
  PageBlocksCtaFinal: "ctaFinal",
  // ... mapear todos os templates
};

function getBlockTemplate(block: any): string | undefined {
  // _template existe no visual editor do TinaCMS (iframe editing)
  if (block?._template) return block._template;
  // __typename é retornado pelo GraphQL em SSR/CSR normal
  if (block?.__typename) return TYPENAME_TO_TEMPLATE[block.__typename];
  return undefined;
}

{page.blocks?.map((block, i) => {
  switch (getBlockTemplate(block)) {
    case "hero": return <HeroSection key={i} data={block} />;
    case "ctaFinal": return <CtaSection key={i} data={block} />;
    default: return null;
  }
})}
```

**⚠️ ARMADILHA CRÍTICA — `_template` vs `__typename`:**
- O `content/pages/home.pt.json` salva `_template: "hero"` em cada block
- MAS quando o TinaCMS processa via GraphQL (`databaseClient`), converte `_template` em `__typename: "PageBlocksHero"` (formato GraphQL union type)
- Localmente com `TINA_PUBLIC_IS_LOCAL=true` + filesystem fallback, o JSON raw retorna `_template` → funciona
- Em produção com MongoDB, o `databaseClient` retorna `__typename` → `_template` é `undefined` → todos os blocks caem no `default: return null` → **página vazia sem erro**
- **Fix**: sempre usar helper `getBlockTemplate()` que checa ambos

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

**⚠️ Importante**: `TINA_PUBLIC_IS_LOCAL` sozinho não basta — **preview deploys**
(staging, branches não-main) do Vercel crasham em runtime com "Database is not
open" porque herdam envs do ambiente "Preview", que frequentemente **não têm**
`MONGODB_URI` / `GITHUB_*` (marcadas "Production only"). Use detecção expandida:

```typescript
// tina/database.ts — padrão oficial site-starter (3 cenários de local)
import { createDatabase, createLocalDatabase } from '@tinacms/datalayer';
import { GitHubProvider } from 'tinacms-gitprovider-github';
import { MongodbLevel } from 'mongodb-level';

// Local mode em 3 cenários (evita "Database is not open" em runtime):
// 1. TINA_PUBLIC_IS_LOCAL=true explícito (dev local)
// 2. VERCEL_ENV !== 'production' (preview deploys — branches tipo staging/PRs)
// 3. Env vars MongoDB/GitHub ausentes (failsafe — evita crash serverless)
const isLocal =
  process.env.TINA_PUBLIC_IS_LOCAL === 'true' ||
  (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') ||
  !process.env.MONGODB_URI ||
  !process.env.GITHUB_PERSONAL_ACCESS_TOKEN;

const branch =
  process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || 'main';

export default isLocal
  ? createLocalDatabase()          // lê do filesystem
  : createDatabase({               // lê do MongoDB
      databaseAdapter: new MongodbLevel({ uri, dbName }),
      gitProvider: new GitHubProvider({ owner, repo, token, branch }),
    });
```

**vercel.json também precisa ajustar buildCommand** pra pular `tinacms build`
com MongoDB em preview:

```json
{
  "buildCommand": "if [ \"$VERCEL_ENV\" = \"production\" ]; then tinacms build && next build; else TINA_PUBLIC_IS_LOCAL=true tinacms build && next build; fi"
}
```

**Combinação resolve ambos**: build Tina passa com filesystem em preview, e o
database.ts runtime também não tenta Mongo quando `VERCEL_ENV=preview`.

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

## 6.1 Per-page collections vs collection genérica

### Quando usar collections individuais por página
Para sites com páginas muito diferentes (home com hero+stats, about com timeline+educação, for-business com pain-points+services), **collections individuais** funcionam melhor que uma collection genérica com blocks:

```
tina/collections/
  home-page.ts       # homePage — hero, twoPaths, proofStrip, foresight
  about-page.ts      # aboutPage — hero, journey, education, recognition
  for-business-page.ts  # forBusinessPage — hero, painPoints, services, process
  mentoring-page.ts  # mentoringPage — hero, benefits, methodology
  contact-page.ts    # contactPage — hero, methods, quickLinks
  fit-page.ts        # fitPage — form labels, result labels, CTA labels
```

**Vantagens:**
- Cada página tem campos específicos sem poluir as outras
- Editor vê apenas os campos relevantes para aquela página
- TypeScript types são precisos (`client.queries.homePage()` vs `client.queries.page()`)

**Quando NÃO usar:** Sites com muitas páginas semelhantes (blog, portfólio) — aí uma collection com blocks é melhor.

### match pattern para path compartilhado

Quando múltiplas collections usam `path: "content/pages/"`, adicione `match` para evitar conflito:

```typescript
// home-page.ts
path: "content/pages",
match: { include: "home*" },

// about-page.ts
path: "content/pages",
match: { include: "about*" },

// fit-page.ts
path: "content/pages",
match: { include: "fit*" },
```

---

## 6.2 Safe wrappers e resiliência em produção

### Padrão getFooSafe()

Toda função de fetch do TinaCMS deve ter uma versão "safe" que retorna `null` em vez de lançar exceção. Isso permite que a página caia graciosamente no fallback hardcoded:

```typescript
// lib/tina.ts

// Função principal — lança exceção se falhar
export async function getHomePageFromTina(locale: string) {
  const client = await db();
  return toPlainObject(
    await client.queries.homePage({ relativePath: `home.${locale}.json` })
  );
}

// Wrapper safe — retorna null, nunca lança
export async function getHomePageSafe(locale: string) {
  try {
    return await getHomePageFromTina(locale);
  } catch (error) {
    console.error(`Failed to fetch home page (${locale}):`, error);
    return null;
  }
}
```

```typescript
// Uso no server component
const tinaData = await getHomePageSafe(locale);
const page = tinaData?.data?.homePage;

// Se TinaCMS falhou, page é null e o componente usa fallback
```

**Por que isso importa:** Em produção, se o MongoDB estiver indisponível ou o TinaCMS tiver um bug, o site continua funcionando com os valores fallback hardcoded.

### Fallback SEO metadata

Mantenha SEO metadata hardcoded em cada `page.tsx` como rede de segurança. A prioridade é:

1. TinaCMS `seo` field (se disponível)
2. Fallback hardcoded no `page.tsx`

```typescript
const tinaSeo = (tinaData?.data?.homePage as any)?.seo;
const fallback = metaByLocale[locale];
const title = tinaSeo?.metaTitle || fallback.title;
```

**Não mova** os fallbacks para o CMS — isso eliminaria a rede de segurança.

---

## 6.3 Páginas interativas (Fit Check, formulários, wizards)

### Problema
Páginas com lógica interativa complexa (multi-step wizards, gravação de áudio, upload de arquivos, chamadas de API) são `'use client'` monolíticas. TinaCMS precisa de server component para buscar dados.

### Solução: extrair labels, manter lógica

```
app/[locale]/fit/page.tsx           ← Server component (fetch labels do CMS)
app/[locale]/fit/fit-client.tsx     ← Client component (toda a lógica interativa)
content/pages/fit.{locale}.json     ← Labels editáveis no CMS
```

**Schema com sub-objetos** para organizar ~35+ labels:

```typescript
fields: [
  { type: "object", name: "form", label: "Formulário", fields: [
    { type: "string", name: "title", label: "Título" },
    { type: "string", name: "submit", label: "Botão enviar" },
    // ... mais 12 campos de formulário
  ]},
  { type: "object", name: "results", label: "Resultados", fields: [
    { type: "string", name: "result_strong", label: "Resultado forte" },
    // ... mais 8 campos de resultado
  ]},
  { type: "object", name: "cta", label: "CTA", fields: [/* ... */] },
  { type: "object", name: "sharing", label: "Compartilhamento", fields: [/* ... */] },
]
```

**Server component:** busca labels do CMS, mapeia para formato flat, passa como prop:

```typescript
// page.tsx (server)
const tinaData = await getFitPageSafe(locale);
const labels = tinaData ? buildLabelsFromCms(tinaData) : hardcodedLabels[locale];
return <FitClient labels={labels} />;
```

**Client component:** recebe `labels` como prop, usa normalmente:

```typescript
// fit-client.tsx (client) — lógica 100% preservada
export default function FitClient({ labels }: { labels: FitLabels }) {
  // wizard state, audio recording, API calls — tudo igual
  return <h1>{labels.title}</h1>;
}
```

**CRÍTICO:** Não modifique a lógica interativa ao migrar para CMS. Apenas extraia as strings.

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

### Blocks com campo de mesmo nome mas tipos diferentes (GraphQL conflict)

**Causa**: Dois block templates com um campo chamado `items` mas com tipos diferentes (ex: `items: object[]` em "tension" e `items: string[]` em "whenWeHelp"). O GraphQL union type não aceita campos com o mesmo nome e tipos conflitantes.
**Sintoma**: `tinacms build` falha com erro de schema GraphQL.
**Fix**: Renomear o campo em um dos templates para um nome único:
```typescript
// ❌ ERRADO — dois templates com "items" de tipos diferentes
{ name: "tension", fields: [{ name: "items", type: "object", list: true, fields: [...] }] }
{ name: "whenWeHelp", fields: [{ name: "items", type: "string", list: true }] }

// ✅ CORRETO — nomes únicos
{ name: "tension", fields: [{ name: "items", type: "object", list: true, fields: [...] }] }
{ name: "whenWeHelp", fields: [{ name: "scenarios", type: "string", list: true }] }
```
**Regra**: Em blocks pattern, cada nome de campo deve ter o mesmo tipo em TODOS os templates que o usam, ou usar nomes diferentes.

### Home page vazia (blocks renderizam null sem erro)

**Causa**: `renderBlock()` usa `block._template` (ex: `"hero"`) mas o GraphQL do TinaCMS retorna `block.__typename` (ex: `"PageBlocksHero"`). Todos os blocks caem no `default: return null`, renderizando página completamente vazia sem nenhum erro no console.
**Sintoma**: Página carrega com header + footer mas `<main>` vazio. Runtime logs mostram "blocks count: 7" (dados chegaram), mas nada renderiza.
**Fix**: Usar helper `getBlockTemplate()` que checa `_template` primeiro (TinaCMS editing) e faz fallback para mapeamento `__typename → template`:
```typescript
const TYPENAME_TO_TEMPLATE: Record<string, string> = {
  PageBlocksHero: "hero",
  PageBlocksTension: "tension",
  // ... todos os templates
};
function getBlockTemplate(block: any): string | undefined {
  return block?._template ?? TYPENAME_TO_TEMPLATE[block?.__typename];
}
```
**Por que acontece**: Localmente com `TINA_PUBLIC_IS_LOCAL=true` o filesystem reader retorna o JSON raw (com `_template`). Em produção o `databaseClient` processa via GraphQL e retorna `__typename`.

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

## 14. Media Manager (self-hosted)

### Configuracao

TinaCMS self-hosted NAO usa Cloudinary por padrao. Para upload de imagens sem TinaCMS Cloud, use `TinaNodeBackend` + GitHub API:

```typescript
// src/app/api/tina/[...routes]/route.ts
import { TinaNodeBackend, LocalBackendAuthProvider } from "@tinacms/datalayer";
import databaseClient from "../../../../tina/__generated__/databaseClient";

const handler = TinaNodeBackend({
  authProvider: isLocal ? LocalBackendAuthProvider() : AuthJsBackendAuthProvider(...),
  databaseClient,
});
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
```

### Como funciona
1. Editor clica em campo de imagem no CMS → abre media manager
2. Upload via browser → Next.js API route → GitHub API → commit no repo
3. Imagem acessivel via `https://raw.githubusercontent.com/...`

### Erro "Bad Route — Cloudinary API route missing"
**Causa**: TinaCMS tenta usar rota Cloudinary quando `mediaStore` nao esta configurado para self-hosted.
**Fix**: Usar `TinaNodeBackend` na API route e nao configurar `mediaStore` no `tina/config.ts`.

---

## 15. Search (limitacoes)

**Search NAO funciona em self-hosted.** A documentacao oficial confirma:
> "Search is not currently supported in self-hosted Tina."

Requer TinaCMS Cloud (SaaS) com `indexerToken` obtido no dashboard.

### Se configurar `search` no config.ts
Erro de build: `clientId not configured`. O search depende de `clientId` que so existe no TinaCMS Cloud.

### Alternativas para busca no admin self-hosted
1. Navegacao manual pela sidebar (collections → documentos)
2. Ctrl+F no browser dentro da lista de documentos
3. Futuro: TinaCMS promete providers customizados de search

**Regra**: NAO incluir `search` no `tina/config.ts` em modo self-hosted.

---

## 16. Padrões de campo não editável: causas e correções

Esta seção documenta os quatro padrões recorrentes que causam campos "invisíveis" ao TinaCMS, identificados ao longo da integração do movii-site.

### Padrão 1: Hardcoded no JSX (campo existe no schema mas componente ignora)

**Sintoma**: O campo aparece corretamente no TinaCMS admin, mas mudar o valor no CMS não reflete na página.

**Causa**: O componente React usa uma string literal em vez de `{data.field}`.

```tsx
// ERRADO — hardcoded, ignora o TinaCMS
<h3>Patricia Mourthé</h3>

// CORRETO — consome o campo TinaCMS com fallback
<h3 data-tina-field={tinaField(founders, "patriciaName")}>
  {founders.patriciaName || "Patricia Mourthé"}
</h3>
```

**Como detectar**: Grep por strings literais no JSX que deveriam vir do CMS. Se `about.pt.json` tem `"patriciaName": "Patricia Mourthé"` mas o componente tem `>Patricia Mourthé<`, está hardcoded.

---

### Padrão 2: Campo de imagem ausente no schema

**Sintoma**: Foto carrega no site, mas não há campo de imagem no TinaCMS admin para trocá-la.

**Causa**: O componente usa `src="/images/foo.jpg"` hardcoded. TinaCMS só gerencia o que está explicitamente declarado como `type: "image"` no schema.

```typescript
// ERRADO — TinaCMS não sabe desta imagem
<Image src="/images/founders/patricia.jpg" />

// CORRETO — campo type: "image" no schema
{ type: "image", name: "patriciaPhoto", label: "Foto Patricia" }

// E no componente:
<Image
  src={founders.patriciaPhoto || "/images/founders/patricia.jpg"}
  data-tina-field={tinaField(founders, "patriciaPhoto")}
/>
```

**Regra**: Todo `src=` hardcoded de imagem editável precisa de campo `type: "image"` no schema.

---

### Padrão 3: Label i18n em vez de campo TinaCMS

**Sintoma**: O texto é visível na página mas não tem handle de edição no TinaCMS.

**Causa**: O texto vem de `t("key")` do `messages/*.json` — é uma string de tradução, fora do escopo do TinaCMS.

```tsx
// NÃO editável no TinaCMS:
<h3>{t("labels.deliverables")}</h3>

// Editável no TinaCMS (com fallback para i18n):
<h3 data-tina-field={tinaField(lever, "deliverablesLabel")}>
  {lever.deliverablesLabel || t("labels.deliverables")}
</h3>
```

**Quando usar TinaCMS vs i18n**: Labels de UI fixos (botão "Enviar", "Cancelar") ficam em i18n. Títulos e labels de seções editáveis pelo cliente ficam em TinaCMS.

---

### Padrão 4: SVG/código React gerado programaticamente

**Sintoma**: O diagrama/gráfico não tem campo no TinaCMS, pois é renderizado por código.

**Causa**: TinaCMS gerencia conteúdo (strings, imagens, booleans) — não gerencia lógica React nem SVG dinâmico.

**Solução**: Campo de imagem opcional como override.

```typescript
// Schema: campo opcional de imagem
{ type: "image", name: "loopImage", label: "Imagem do Loop (substitui diagrama SVG)" }

// Componente: imagem se existir, SVG caso contrário
{mp?.loopImage ? (
  <Image src={mp.loopImage} alt="The Movii Loop" fill />
) : (
  <LoopDiagram />
)}
```

---

### Checklist ao revisar editabilidade

Para cada elemento visível na página, perguntar:

- [ ] O texto/imagem vem de um campo TinaCMS com `data-tina-field`?
- [ ] Se for imagem: há campo `type: "image"` no schema?
- [ ] Se for label de seção: é string i18n ou campo TinaCMS?
- [ ] Se for componente gráfico (SVG, chart): há campo de imagem como override?
- [ ] O componente realmente *usa* o campo do schema (não tem string literal escondida)?

---

## 17. Referências

- [TinaCMS Docs](https://tina.io/docs/)
- [TinaCMS Contextual Editing](https://tina.io/docs/contextual-editing/react)
- [TinaCMS Blocks Pattern](https://tina.io/docs/editing/blocks)
- [TinaCMS MongoDB](https://tina.io/docs/reference/self-hosted/database-adapter/mongodb)
- [NextAuth Credentials](https://next-auth.js.org/providers/credentials)
- [Payload CMS](https://payloadcms.com/)
- [Keystatic](https://keystatic.com/)
- [Builder.io](https://www.builder.io/)
