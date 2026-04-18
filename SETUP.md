# Setup — Novo projeto a partir do site-starter

Guia passo a passo para configurar um projeto novo do zero. Tempo estimado: 15-30 minutos.

---

## Pré-requisitos

- Node.js 18+
- Conta no GitHub
- Conta no MongoDB Atlas (gratuita)
- Conta no Vercel (gratuita)

---

## Passo 1 — Clonar e inicializar

```bash
# Clonar o template
git clone https://github.com/aadedavid/site-starter.git meu-projeto
cd meu-projeto

# Desconectar do repositório original e criar o seu
git remote set-url origin https://github.com/SEU_USUARIO/meu-projeto.git

# Criar o repositório no GitHub (requer gh CLI)
gh repo create meu-projeto --public --source=. --push

# Instalar dependências
npm install
```

---

## Passo 2 — Identidade do site

Editar `src/config/site.ts` com os dados do projeto:

```ts
export const siteConfig = {
  name: "Nome do Site",
  url: "https://meu-dominio.com",
  description: "Descrição curta do site",
  defaultLocale: "pt",
  creator: "Seu Nome",
  email: "contato@meu-dominio.com",
  social: {
    github: "https://github.com/usuario",
    linkedin: "https://linkedin.com/in/usuario",
    twitter: "",
    instagram: "",
  },
}
```

---

## Passo 3 — Variáveis de ambiente (desenvolvimento local)

```bash
cp .env.example .env.local
```

Para desenvolvimento local, o mínimo necessário em `.env.local`:

```bash
# Modo local — TinaCMS usa arquivos locais, não MongoDB
TINA_PUBLIC_IS_LOCAL=true

# Auth — gerar um secret seguro
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3010

# Usuários permitidos no CMS
TINA_ALLOWED_EMAILS=seu@email.com
```

Com `TINA_PUBLIC_IS_LOCAL=true`, o TinaCMS lê e salva conteúdo em arquivos locais — sem precisar de MongoDB ou GitHub token.

---

## Passo 4 — Rodar localmente

```bash
npm run dev
```

- Site: `http://localhost:3010`
- CMS admin: `http://localhost:3010/admin`

No primeiro acesso ao `/admin`, o TinaCMS em modo local não pede senha. Em produção, requer autenticação.

---

## Passo 5 — Seed de usuários (para produção)

Após configurar o MongoDB (passo 6), criar os usuários iniciais do CMS:

```bash
npx tsx scripts/seed-users.ts
```

O script lê `TINA_ALLOWED_EMAILS` do `.env.local` e cria os usuários no banco.

---

## Passo 6 — MongoDB Atlas (para produção)

1. Criar cluster gratuito em mongodb.com/atlas
2. Criar banco de dados (ex: `meu-projeto`)
3. Criar usuário com permissão de leitura/escrita
4. Liberar IP `0.0.0.0/0` no Network Access (para o Vercel)
5. Copiar a connection string

Adicionar ao `.env.local` (ou ao Vercel posteriormente):

```bash
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/
MONGODB_DB_NAME=meu-projeto
```

> **Atenção:** Ao adicionar `MONGODB_DB_NAME` no Vercel CLI, sempre usar `printf` (nunca `echo`):
> ```bash
> printf "meu-projeto" | vercel env add MONGODB_DB_NAME production
> ```
> `echo` adiciona `\n` invisível que corrompe a variável e causa erros de autenticação.

---

## Passo 7 — GitHub Personal Access Token

O TinaCMS em produção commita alterações de conteúdo diretamente no repositório GitHub.

1. Ir em GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Criar token com permissão **Contents: Read and Write** no repositório do projeto
3. Adicionar ao `.env.local`:

```bash
GITHUB_OWNER=seu-usuario
GITHUB_REPO=meu-projeto
GITHUB_PERSONAL_ACCESS_TOKEN=github_pat_...
GITHUB_BRANCH=main
```

---

## Passo 8 — Deploy no Vercel

```bash
# Instalar Vercel CLI (se necessário)
npm i -g vercel

# Deploy inicial
vercel
```

Vincular ao projeto GitHub quando solicitado. O Vercel vai detectar Next.js automaticamente.

**Build command obrigatório** — verificar que `vercel.json` tem:

```json
{
  "buildCommand": "tinacms build && next build"
}
```

**Adicionar todas as variáveis de ambiente no Vercel:**

```bash
# Usar printf para todas — nunca echo
printf "valor" | vercel env add NOME_DA_VAR production
```

**Variáveis obrigatórias em produção:**

```
GITHUB_OWNER
GITHUB_REPO
GITHUB_PERSONAL_ACCESS_TOKEN
GITHUB_BRANCH
MONGODB_URI
MONGODB_DB_NAME
NEXTAUTH_SECRET
NEXTAUTH_URL         (URL do deploy: https://meu-projeto.vercel.app)
TINA_ALLOWED_EMAILS
```

---

### 8.1 — Criar ambiente de staging/preview (opcional, recomendado)

Se você quer testar mudanças grandes antes de promover pra `main`/produção, crie uma branch `staging` com env vars duplicadas de produção:

```bash
# 1. Criar branch e push
git checkout -b staging
git push -u origin staging
# Vercel auto-cria preview deployment em:
# https://<project>-git-staging-<team>.vercel.app

# 2. Duplicar env vars prod → preview (one-liner)
node scripts/duplicate-vercel-envs.mjs

# 3. Trigger rebuild pra envs entrarem em vigor
git commit --allow-empty -m "chore: rebuild with new preview envs"
git push origin staging
```

**Por quê**: por default, envs adicionadas via Vercel UI são marcadas só como "Production". Preview deploys crasham com `"Database is not open"` (TinaCMS), `"Missing NEXT_PUBLIC_SUPABASE_URL"`, etc.

O script `duplicate-vercel-envs.mjs` adiciona `"preview"` ao `target` de todas as envs prod-only via API Vercel (precisa `vercel login` feito).

**Workflow completo** (skill dedicada): `/vercel-preview-env` — cria branch + duplica envs + valida build + retorna URL shareable. Use quando "quero um ambiente de staging isolado".

Ver também `TINACMS-INTEGRATION.md §5.3.1` pra tradeoffs entre staging compartilhado vs infra isolada.

---

## Passo 9 — Gerar llms.txt atualizado

Após criar ou alterar conteúdo:

```bash
npx tsx scripts/generate-llms-txt.ts
```

Commitar o `public/llms.txt` gerado.

---

## Verificação final

Antes de divulgar o site, verificar:

- [ ] Site abre em `/pt/` e `/en/`
- [ ] CMS admin abre em `/admin` e pede login
- [ ] Editar um campo no CMS e salvar → commit aparece no GitHub
- [ ] `/sitemap.xml` retorna URLs válidas
- [ ] `/robots.txt` retorna sem erro
- [ ] `/llms.txt` existe e tem conteúdo
- [ ] Lighthouse SEO > 90
- [ ] HTTPS ativo no domínio

---

## Erros comuns no setup

| Sintoma | Causa provável | Solução |
|---------|---------------|---------|
| CMS não carrega assets (`/admin/assets/*.js` → 404) | Existe `app/admin/[[...index]]/page.tsx` | Deletar esse arquivo |
| "CredentialsSignin" no login do CMS | `MONGODB_DB_NAME` com `\n` | Recriar com `printf` |
| "HttpError: Not Found" ao salvar | `GITHUB_REPO` com `\n` | Recriar com `printf` |
| "Failed to parse URL" em server components | Server component usando `client` HTTP | Trocar por `databaseClient` |
| Site não aparece no iframe do CMS | `X-Frame-Options: DENY` | Usar `SAMEORIGIN` no `vercel.json` |

Para mais detalhes de debugging, ver `TINACMS-INTEGRATION.md`.

---

## Próximos passos após o setup

1. Personalizar conteúdo inicial em `content/pages/`
2. Adicionar logo em `public/`
3. Ajustar navegação em `src/config/navigation.ts`
4. Atualizar `public/llms.txt` com descrição do site
5. Configurar Google Search Console com o sitemap
