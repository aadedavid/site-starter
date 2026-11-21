# Trabalho colaborativo: plano

> Última atualização: 2026-11-21. Movido do `CLAUDE.md` (seção "Trabalho Colaborativo") para cá quando o contrato virou `AGENTS.md`. Conteúdo original sem mudança abaixo.

Esta secao documenta os gaps e decisoes para habilitar trabalho em paralelo (multiplos devs, PRs, preview deploys). Implementacao ainda nao foi feita — status: referencia para quando for priorizado.

## Estado atual (single-dev)

O template funciona bem para dev solo: bootstrap com `/new-site`, deploy com `/deploy-site`, edicao visual no TinaCMS. Nao ha CI/CD, branch protection, nem preview deploys.

## Gaps identificados

| Area | Hoje | Necessario para colaboracao |
|------|------|-----------------------------|
| Branching | Tudo direto no `main` | Feature branches + PRs |
| CI/CD | Zero | GitHub Actions: lint + type-check + build no PR |
| Preview deploys | Nao existe | Vercel preview automatico por PR |
| Rollback | Manual (git revert + redeploy) | `vercel rollback` |
| Branch protection | Sem regras | Require checks + review antes de merge |
| DB isolation | MongoDB compartilhado | Preview usa filesystem (ver abaixo) |

## Decisao chave: isolamento de DB em previews

Preview deploys devem usar `TINA_PUBLIC_IS_LOCAL=true` no ambiente de Preview do Vercel (nao em Production). Isso faz o TinaCMS ler conteudo do Git (filesystem), sem tocar no MongoDB de producao. Simples, seguro, sem DB separado.

Configurar no Vercel:
- `TINA_PUBLIC_IS_LOCAL=true` → ambiente **Preview** apenas
- Production fica sem essa variavel (usa MongoDB Atlas normalmente)

## Prioridades de implementacao

| Prioridade | Item | Esforco |
|-----------|------|---------|
| P0 | GitHub Actions CI (lint + build no PR) | ~1h |
| P0 | Vercel Git Integration (preview deploys automaticos) | ~30min |
| P1 | Branch protection rules (via `gh api rulesets`) | ~30min |
| P1 | PR template (`.github/pull_request_template.md`) | ~15min |
| P1 | Env isolation no Vercel (preview = `TINA_PUBLIC_IS_LOCAL=true`) | ~15min |
| P2 | Opcao de rollback no skill `/deploy-site` | ~1h |
| P3 | RBAC no NextAuth (admin/editor) | ~2-4h |

## O que muda em cada asset quando implementado

- **Template:** `.github/workflows/ci.yml`, `.github/pull_request_template.md`, script `type-check` no `package.json`
- **Skill `/new-site`:** adicionar step de branch protection e Vercel env vars separados por ambiente
- **Skill `/deploy-site`:** adicionar opcao de rollback, verificar checks antes de prod

## Pitfall importante

**Nao commitar `.claude/settings.local.json`** — contem permissoes locais do Claude Code especificas do usuario. Ja esta no `.gitignore`.
