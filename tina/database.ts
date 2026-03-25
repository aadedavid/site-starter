import { createDatabase, createLocalDatabase } from '@tinacms/datalayer';
import { GitHubProvider } from 'tinacms-gitprovider-github';
import { MongodbLevel } from 'mongodb-level';

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true';
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
