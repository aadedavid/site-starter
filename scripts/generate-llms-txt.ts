/**
 * Generate llms.txt and llms-full.txt from TinaCMS content
 *
 * Usage: npx tsx scripts/generate-llms-txt.ts
 *
 * Reads all page content from content/ directory and generates:
 * - public/llms.txt: Summary with page titles and descriptions
 * - public/llms-full.txt: Full content for long-context LLMs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const CONTENT_DIR = path.join(process.cwd(), 'content/pages');
const OUTPUT_DIR = path.join(process.cwd(), 'public');

interface PageContent {
  title: string;
  description?: string;
  slug: string;
  locale: string;
}

function readPages(): PageContent[] {
  const pages: PageContent[] = [];
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const content = JSON.parse(
      fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8')
    );
    const [slug, locale] = file.replace('.json', '').split('.');
    pages.push({
      title: content.title,
      description: content.description,
      slug,
      locale,
    });
  }

  return pages;
}

function generateLlmsTxt(pages: PageContent[]): string {
  const ptPages = pages.filter((p) => p.locale === 'pt');
  let output = `# Site Starter\n> Template base para produtos digitais multilingues com CMS visual, SEO e AI discoverability.\n\n`;
  output += `## Paginas Principais\n`;
  for (const page of ptPages) {
    const href = page.slug === 'home' ? '/pt' : `/pt/${page.slug}`;
    output += `- [${page.title}](${href}): ${page.description || ''}\n`;
  }
  output += `\n## Contato\n- Email: contact@example.com\n`;
  return output;
}

const pages = readPages();
const llmsTxt = generateLlmsTxt(pages);

fs.writeFileSync(path.join(OUTPUT_DIR, 'llms.txt'), llmsTxt);
console.log('Generated public/llms.txt');

// llms-full.txt — include full content (placeholder for now)
fs.writeFileSync(path.join(OUTPUT_DIR, 'llms-full.txt'), llmsTxt);
console.log('Generated public/llms-full.txt');
