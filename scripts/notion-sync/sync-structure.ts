/**
 * Sync Structure to Notion
 *
 * Main script that orchestrates the sync process:
 * 1. Parse all AGENTS.md files
 * 2. Transform to friendly format
 * 3. Create/update Notion pages
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { Client } from '@notionhq/client';
import { parseAllAgentsFiles, AgentsTree } from './parse-agents.js';
import { transformTreeToFriendly, loadGlossary, FriendlyDocument } from './transform-friendly.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.notion
// Try multiple locations: scripts/notion-sync/, project root
const envPaths = [
  path.join(__dirname, '.env.notion'),
  path.join(__dirname, '../../.env.notion'),
  path.join(process.cwd(), '.env.notion')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
    console.log(`Loaded env from: ${envPath}`);
    break;
  }
}

// Notion block types
type BlockObjectRequest = Parameters<Client['blocks']['children']['append']>[0]['children'][number];

interface SyncOptions {
  rootPath: string;
  rootPageId: string;
  dryRun?: boolean;
  verbose?: boolean;
  pathFilter?: string;
}

interface SyncResult {
  success: boolean;
  pagesCreated: number;
  pagesUpdated: number;
  errors: string[];
}

/**
 * Initialize Notion client
 */
function createNotionClient(): Client {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error('NOTION_API_KEY environment variable is not set');
  }
  return new Client({ auth: apiKey });
}

/**
 * Create Notion blocks from FriendlyDocument
 */
function createNotionBlocks(doc: FriendlyDocument): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];

  // Summary callout
  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: doc.summary } }],
      icon: { type: 'emoji', emoji: '📝' as const },
      color: 'blue_background'
    }
  });

  // Purpose section
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: '📖 설명' } }]
    }
  });

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: doc.purposeFriendly || doc.purpose || '설명이 없습니다.' } }]
    }
  });

  // Glossary terms (if any)
  if (doc.glossaryTerms.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: '📚 용어 설명' } }]
      }
    });

    blocks.push({
      object: 'block',
      type: 'toggle',
      toggle: {
        rich_text: [{ type: 'text', text: { content: '용어 설명 보기 (클릭하여 펼치기)' } }],
        children: doc.glossaryTerms.map(term => ({
          object: 'block' as const,
          type: 'bulleted_list_item' as const,
          bulleted_list_item: {
            rich_text: [
              { type: 'text' as const, text: { content: `${term.term}` }, annotations: { bold: true } },
              { type: 'text' as const, text: { content: ` (${term.ko}): ${term.description}` } }
            ]
          }
        }))
      }
    });
  }

  // Key files (if any)
  if (doc.keyFiles.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: '📄 주요 파일' } }]
      }
    });

    // Create a table for key files
    blocks.push({
      object: 'block',
      type: 'table',
      table: {
        table_width: 2,
        has_column_header: true,
        has_row_header: false,
        children: [
          // Header row
          {
            object: 'block',
            type: 'table_row',
            table_row: {
              cells: [
                [{ type: 'text', text: { content: '파일명' } }],
                [{ type: 'text', text: { content: '설명' } }]
              ]
            }
          },
          // Data rows
          ...doc.keyFiles.slice(0, 10).map(file => ({
            object: 'block' as const,
            type: 'table_row' as const,
            table_row: {
              cells: [
                [{ type: 'text' as const, text: { content: file.name } }],
                [{ type: 'text' as const, text: { content: file.descriptionFriendly || file.description } }]
              ]
            }
          }))
        ]
      }
    });
  }

  // Subdirectories (if any)
  if (doc.subdirectories.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: '📂 하위 폴더' } }]
      }
    });

    for (const subdir of doc.subdirectories) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [
            { type: 'text', text: { content: `${subdir.name}` }, annotations: { bold: true } },
            { type: 'text', text: { content: ` (${subdir.nameKo})` } }
          ]
        }
      });
    }
  }

  return blocks;
}

/**
 * Find existing page by title under parent
 */
async function findPageByTitle(
  notion: Client,
  parentId: string,
  title: string
): Promise<string | null> {
  try {
    const response = await notion.blocks.children.list({
      block_id: parentId,
      page_size: 100
    });

    for (const block of response.results) {
      if ('type' in block && block.type === 'child_page') {
        const pageBlock = block as any;
        if (pageBlock.child_page?.title === title) {
          return block.id;
        }
      }
    }
  } catch (error) {
    console.error(`Error finding page: ${error}`);
  }

  return null;
}

/**
 * Create or update a Notion page
 */
async function createOrUpdatePage(
  notion: Client,
  parentId: string,
  doc: FriendlyDocument,
  dryRun: boolean
): Promise<{ pageId: string; created: boolean }> {
  const title = `${doc.emoji} ${doc.title} (${doc.titleKo})`;

  if (dryRun) {
    console.log(`[DRY-RUN] Would create/update page: ${title}`);
    return { pageId: 'dry-run-id', created: true };
  }

  // Check if page exists
  const existingPageId = await findPageByTitle(notion, parentId, title);

  if (existingPageId) {
    // Archive existing page content and replace
    console.log(`Updating existing page: ${title}`);

    // Delete existing children
    const existingChildren = await notion.blocks.children.list({
      block_id: existingPageId,
      page_size: 100
    });

    for (const child of existingChildren.results) {
      if ('id' in child) {
        await notion.blocks.delete({ block_id: child.id });
      }
    }

    // Add new content
    const blocks = createNotionBlocks(doc);
    await notion.blocks.children.append({
      block_id: existingPageId,
      children: blocks
    });

    return { pageId: existingPageId, created: false };
  } else {
    // Create new page
    console.log(`Creating new page: ${title}`);

    const page = await notion.pages.create({
      parent: { page_id: parentId },
      properties: {
        title: {
          title: [{ text: { content: title } }]
        }
      },
      children: createNotionBlocks(doc)
    });

    return { pageId: page.id, created: true };
  }
}

/**
 * Main sync function
 */
export async function syncStructure(options: SyncOptions): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    pagesCreated: 0,
    pagesUpdated: 0,
    errors: []
  };

  try {
    const notion = createNotionClient();
    const glossaryPath = path.join(__dirname, 'glossary.json');
    const glossary = loadGlossary(glossaryPath);

    console.log('Parsing AGENTS.md files...');
    const tree = await parseAllAgentsFiles(options.rootPath);
    console.log(`Found ${tree.files.size} AGENTS.md files`);

    console.log('Transforming to friendly format...');
    let docs = transformTreeToFriendly(tree, glossary);

    // Apply path filter if specified
    if (options.pathFilter) {
      docs = docs.filter(doc =>
        doc.relativePath.startsWith(options.pathFilter!) ||
        doc.relativePath === '.'
      );
      console.log(`Filtered to ${docs.length} documents matching: ${options.pathFilter}`);
    }

    // Create page hierarchy map
    const pageIdMap = new Map<string, string>();
    pageIdMap.set('.', options.rootPageId);

    // Process documents in order (parents first)
    for (const doc of docs) {
      try {
        // Find parent page ID
        let parentPageId = options.rootPageId;
        if (doc.relativePath !== '.') {
          const parentPath = path.dirname(doc.relativePath);
          const mappedParent = pageIdMap.get(parentPath);
          if (mappedParent) {
            parentPageId = mappedParent;
          }
        }

        if (options.verbose) {
          console.log(`\nProcessing: ${doc.relativePath}`);
          console.log(`  Parent: ${parentPageId}`);
        }

        const { pageId, created } = await createOrUpdatePage(
          notion,
          parentPageId,
          doc,
          options.dryRun || false
        );

        pageIdMap.set(doc.relativePath, pageId);

        if (created) {
          result.pagesCreated++;
        } else {
          result.pagesUpdated++;
        }

        // Rate limiting (Notion API: 3 requests/second)
        await new Promise(resolve => setTimeout(resolve, 350));

      } catch (error) {
        const message = `Error processing ${doc.relativePath}: ${error}`;
        console.error(message);
        result.errors.push(message);
      }
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Fatal error: ${error}`);
  }

  return result;
}

/**
 * Print sync results
 */
function printResults(result: SyncResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('Sync Complete');
  console.log('='.repeat(60));
  console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`Pages created: ${result.pagesCreated}`);
  console.log(`Pages updated: ${result.pagesUpdated}`);

  if (result.errors.length > 0) {
    console.log(`\nErrors (${result.errors.length}):`);
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
  }
}

// CLI usage
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);

  // First non-flag argument is the root path, or default to project root
  const projectRoot = path.resolve(__dirname, '../..');
  const rootPathArg = args.find(arg => !arg.startsWith('--'));

  const options: SyncOptions = {
    rootPath: rootPathArg || projectRoot,
    rootPageId: process.env.NOTION_ROOT_PAGE_ID || '',
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose')
  };

  // Parse --path argument
  const pathIndex = args.indexOf('--path');
  if (pathIndex !== -1 && args[pathIndex + 1]) {
    options.pathFilter = args[pathIndex + 1];
  }

  if (!options.rootPageId) {
    console.error('Error: NOTION_ROOT_PAGE_ID environment variable is not set');
    process.exit(1);
  }

  console.log('Starting structure sync to Notion...');
  console.log(`Root path: ${options.rootPath}`);
  console.log(`Root page ID: ${options.rootPageId}`);
  console.log(`Dry run: ${options.dryRun}`);

  syncStructure(options)
    .then(result => {
      printResults(result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
