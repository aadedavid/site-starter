import { createDatabase, createLocalDatabase } from '@tinacms/datalayer';
import { GitHubProvider } from 'tinacms-gitprovider-github';
import { MongodbLevel } from 'mongodb-level';

// Local mode em 3 cenários (evita "Database is not open" em runtime):
// 1. TINA_PUBLIC_IS_LOCAL=true explícito (dev local)
// 2. VERCEL_ENV !== 'production' (preview deploys — branches tipo staging/PRs)
// 3. Env vars MongoDB/GitHub ausentes (failsafe — evita crash serverless)
//
// Por que (2): preview deploys do Vercel herdam envs "Preview" environment,
// que frequentemente NÃO incluem MONGODB_URI/GITHUB_* (marcadas "Production
// only"). Build passa com TINA_PUBLIC_IS_LOCAL no buildCommand, mas runtime
// serverless volta a tentar MongoDB e crasha com "Database is not open".
// Solução: auto-detectar env preview e cair pra createLocalDatabase.
const isLocal =
  process.env.TINA_PUBLIC_IS_LOCAL === 'true' ||
  (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') ||
  !process.env.MONGODB_URI ||
  !process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  'main';

export default isLocal
  ? createLocalDatabase()
  : createDatabase({
      gitProvider: new GitHubProvider({
        repo: process.env.GITHUB_REPO!,
        owner: process.env.GITHUB_OWNER!,
        token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
        branch,
      }),
      databaseAdapter: new MongodbLevel<string, Record<string, any>>({
        collectionName: 'tinacms',
        dbName: process.env.MONGODB_DB_NAME || 'site-starter',
        mongoUri: process.env.MONGODB_URI!,
      }),
    });
