#!/usr/bin/env node
/**
 * duplicate-vercel-envs.mjs
 *
 * Duplica env vars de "Production only" para incluir também "Preview" no Vercel.
 * Resolve problema comum: preview deploys (branch staging, PRs) falham com
 * "Database is not open", "Missing NEXT_PUBLIC_SUPABASE_URL", etc, porque o
 * Vercel por default marca env vars adicionadas via UI só como Production.
 *
 * Uso:
 *   node scripts/duplicate-vercel-envs.mjs           # duplica todas prod-only → preview
 *   node scripts/duplicate-vercel-envs.mjs --dry-run # lista sem alterar
 *   node scripts/duplicate-vercel-envs.mjs --exclude=NEXTAUTH_URL,FOO  # pula algumas
 *
 * Pré-requisitos:
 *   - Vercel CLI autenticado (`vercel whoami` funciona). Lê token de
 *     ~/Library/Application Support/com.vercel.cli/auth.json
 *   - Projeto linkado (.vercel/project.json existe na cwd)
 *
 * Referências:
 *   - Skill /vercel-preview-env (workflow completo pra criar staging)
 *   - Skill /tinacms-debug Fix J (problema específico TinaCMS)
 *   - TINACMS-INTEGRATION.md §5.3 (dual-mode database)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const EXCLUDE = (args.find((a) => a.startsWith('--exclude='))?.split('=')[1] || '')
  .split(',')
  .filter(Boolean);

function readAuthToken() {
  const authPath = resolve(
    homedir(),
    'Library/Application Support/com.vercel.cli/auth.json',
  );
  if (!existsSync(authPath)) {
    throw new Error(
      'Vercel CLI auth não encontrado. Rode `vercel login` primeiro.',
    );
  }
  const { token } = JSON.parse(readFileSync(authPath, 'utf-8'));
  if (!token) throw new Error('Token vazio em auth.json');
  return token;
}

function readProjectJson() {
  const path = resolve(process.cwd(), '.vercel/project.json');
  if (!existsSync(path)) {
    throw new Error(
      '.vercel/project.json não encontrado. Rode `vercel link` primeiro.',
    );
  }
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  if (!data.projectId || !data.orgId) {
    throw new Error('projectId ou orgId faltando em .vercel/project.json');
  }
  return data;
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function main() {
  const TOKEN = readAuthToken();
  const { projectId, orgId } = readProjectJson();
  const teamParam = `teamId=${orgId}`;

  console.log(`Project: ${projectId}`);
  console.log(`Team: ${orgId}`);
  console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be made\n' : '');

  // 1) List env vars
  const listUrl = `https://api.vercel.com/v10/projects/${projectId}/env?${teamParam}&decrypt=false`;
  const { envs } = await fetchJson(listUrl, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });

  const prodOnly = envs.filter(
    (e) =>
      Array.isArray(e.target) &&
      e.target.length === 1 &&
      e.target[0] === 'production' &&
      !EXCLUDE.includes(e.key),
  );

  console.log(`Total envs: ${envs.length}`);
  console.log(`Production-only (candidates): ${prodOnly.length}`);
  if (EXCLUDE.length) console.log(`Excluded by flag: ${EXCLUDE.join(', ')}`);
  if (prodOnly.length === 0) {
    console.log('\n✅ Nothing to do. All envs already include preview or are excluded.');
    return;
  }

  console.log('\nCandidates:');
  for (const e of prodOnly) console.log(`  - ${e.key}`);

  if (DRY_RUN) {
    console.log('\n🔍 Dry-run — exit without changes.');
    return;
  }

  // 2) PATCH each — add "preview" target
  console.log('\nApplying changes:');
  let ok = 0;
  let failed = 0;
  for (const e of prodOnly) {
    const patchUrl = `https://api.vercel.com/v10/projects/${projectId}/env/${e.id}?${teamParam}`;
    try {
      const body = JSON.stringify({ target: ['production', 'preview'] });
      const result = await fetchJson(patchUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      console.log(`  ✓ ${result.key} → ${JSON.stringify(result.target)}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${e.key} → ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Done. ${ok} ok, ${failed} failed.`);
  if (failed === 0 && ok > 0) {
    console.log(
      '\nNext step: trigger rebuild of preview branch pra envs novas entrarem em vigor:',
    );
    console.log("  git commit --allow-empty -m 'chore: rebuild preview with new envs'");
    console.log('  git push origin <branch>');
  }
}

main().catch((err) => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
