import databaseClient from '../../tina/__generated__/databaseClient';

export async function getPageData(relativePath: string) {
  const result = await databaseClient.queries.page({ relativePath });
  return JSON.parse(JSON.stringify(result));
}

export async function getPostData(relativePath: string) {
  const result = await databaseClient.queries.post({ relativePath });
  return JSON.parse(JSON.stringify(result));
}

export async function getSettingsData(relativePath: string) {
  const result = await databaseClient.queries.settings({ relativePath });
  return JSON.parse(JSON.stringify(result));
}
