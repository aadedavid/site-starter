import { defineConfig, LocalAuthProvider } from 'tinacms';
import { UsernamePasswordAuthJSProvider } from 'tinacms-authjs/dist/tinacms';
import { page } from './collections/page';
import { post } from './collections/post';
import { settings } from './collections/settings';

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === 'true';

export default defineConfig({
  authProvider: isLocal
    ? new LocalAuthProvider()
    : new UsernamePasswordAuthJSProvider(),
  contentApiUrlOverride: '/api/tina/gql',
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      publicFolder: 'public',
      mediaRoot: 'images',
    },
  },
  schema: {
    collections: [page, post, settings],
  },
});
