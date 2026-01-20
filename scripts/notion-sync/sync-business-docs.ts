/**
 * Sync Business Documentation to Notion
 *
 * Creates non-developer friendly business documentation:
 * 1. System Overview - What the system does
 * 2. Business Glossary - Key terms explained
 * 3. Data Dictionary - What each field means
 * 4. Dashboard Guide - What each dashboard shows
 * 5. Cost Guide - How costs are calculated
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { Client } from '@notionhq/client';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPaths = [
  path.join(__dirname, '.env.notion'),
  path.join(__dirname, '../../.env.notion'),
  path.join(process.cwd(), '.env.notion')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
    break;
  }
}

interface BusinessGlossary {
  systemOverview: {
    title: string;
    description: string;
    targetUsers: string[];
    keyBenefits: string[];
  };
  businessTerms: Record<string, {
    definition: string;
    example?: string;
    whyImportant?: string;
    cost?: string;
    interpretation?: Record<string, string>;
    businessUse?: string;
    threshold?: string;
    causes?: string;
    method?: string;
    examples?: string[];
  }>;
  dataFields: Record<string, {
    type: string;
    description: string;
    example?: string;
    format?: string;
    values?: Record<string, string>;
    typical_range?: string;
    privacyNote?: string;
    costImplication?: string;
  }>;
  dashboards: Record<string, {
    purpose: string;
    targetUser: string;
    keyMetrics: string[];
    refreshRate: string;
  }>;
  costCalculation: {
    formula: Record<string, string>;
    example: Record<string, string>;
    tip: string;
  };
}

function loadBusinessGlossary(): BusinessGlossary {
  const glossaryPath = path.join(__dirname, 'business-glossary.json');
  return JSON.parse(fs.readFileSync(glossaryPath, 'utf-8'));
}

function createNotionClient(): Client {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error('NOTION_API_KEY environment variable is not set');
  }
  return new Client({ auth: apiKey });
}

type RichTextItemRequest = {
  type: 'text';
  text: { content: string };
  annotations?: { bold?: boolean; italic?: boolean; code?: boolean };
};

type BlockObjectRequest = {
  object: 'block';
  type: string;
  [key: string]: any;
};

function createOverviewBlocks(glossary: BusinessGlossary): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];
  const { systemOverview } = glossary;

  // Title callout
  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: systemOverview.description } }],
      icon: { type: 'emoji', emoji: '📊' },
      color: 'blue_background'
    }
  });

  // Target users
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: '👥 대상 사용자' } }]
    }
  });

  for (const user of systemOverview.targetUsers) {
    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: user } }]
      }
    });
  }

  // Key benefits
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: '✨ 주요 기능' } }]
    }
  });

  for (const benefit of systemOverview.keyBenefits) {
    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: benefit } }]
      }
    });
  }

  return blocks;
}

function createGlossaryBlocks(glossary: BusinessGlossary): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];

  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: '이 문서는 시스템에서 사용하는 주요 용어를 비개발자도 이해할 수 있게 설명합니다.' } }],
      icon: { type: 'emoji', emoji: '📚' },
      color: 'yellow_background'
    }
  });

  for (const [term, info] of Object.entries(glossary.businessTerms)) {
    // Term as toggle
    const children: BlockObjectRequest[] = [];

    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '정의: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: info.definition } }
        ]
      }
    });

    if (info.example) {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: '예시: ' }, annotations: { bold: true } },
            { type: 'text', text: { content: info.example } }
          ]
        }
      });
    }

    if (info.whyImportant) {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: '왜 중요한가: ' }, annotations: { bold: true } },
            { type: 'text', text: { content: info.whyImportant } }
          ]
        }
      });
    }

    if (info.cost) {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: '💰 비용: ' }, annotations: { bold: true } },
            { type: 'text', text: { content: info.cost } }
          ]
        }
      });
    }

    if (info.businessUse) {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: '비즈니스 활용: ' }, annotations: { bold: true } },
            { type: 'text', text: { content: info.businessUse } }
          ]
        }
      });
    }

    blocks.push({
      object: 'block',
      type: 'toggle',
      toggle: {
        rich_text: [{ type: 'text', text: { content: `📌 ${term}` }, annotations: { bold: true } }],
        children
      }
    });
  }

  return blocks;
}

function createDataDictionaryBlocks(glossary: BusinessGlossary): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];

  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: '시스템에서 수집하고 분석하는 데이터 항목을 설명합니다.' } }],
      icon: { type: 'emoji', emoji: '🗃️' },
      color: 'green_background'
    }
  });

  // Create table
  const tableRows: BlockObjectRequest[] = [];

  // Header row
  tableRows.push({
    object: 'block',
    type: 'table_row',
    table_row: {
      cells: [
        [{ type: 'text', text: { content: '필드명' } }],
        [{ type: 'text', text: { content: '유형' } }],
        [{ type: 'text', text: { content: '설명' } }]
      ]
    }
  });

  // Data rows
  for (const [field, info] of Object.entries(glossary.dataFields)) {
    tableRows.push({
      object: 'block',
      type: 'table_row',
      table_row: {
        cells: [
          [{ type: 'text', text: { content: field } }],
          [{ type: 'text', text: { content: info.type } }],
          [{ type: 'text', text: { content: info.description } }]
        ]
      }
    });
  }

  blocks.push({
    object: 'block',
    type: 'table',
    table: {
      table_width: 3,
      has_column_header: true,
      has_row_header: false,
      children: tableRows
    }
  });

  return blocks;
}

function createDashboardGuideBlocks(glossary: BusinessGlossary): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];

  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: '각 대시보드의 목적과 주요 지표를 설명합니다.' } }],
      icon: { type: 'emoji', emoji: '📈' },
      color: 'purple_background'
    }
  });

  for (const [name, info] of Object.entries(glossary.dashboards)) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: `📊 ${name}` } }]
      }
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '목적: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: info.purpose } }
        ]
      }
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '대상 사용자: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: info.targetUser } }
        ]
      }
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '갱신 주기: ' }, annotations: { bold: true } },
          { type: 'text', text: { content: info.refreshRate } }
        ]
      }
    });

    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: '주요 지표:' }, annotations: { bold: true } }]
      }
    });

    for (const metric of info.keyMetrics) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: metric } }]
        }
      });
    }

    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    });
  }

  return blocks;
}

function createCostGuideBlocks(glossary: BusinessGlossary): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];
  const { costCalculation } = glossary;

  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: 'AI 사용 비용이 어떻게 계산되는지 설명합니다.' } }],
      icon: { type: 'emoji', emoji: '💰' },
      color: 'orange_background'
    }
  });

  // Formula section
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: '📐 비용 계산 공식' } }]
    }
  });

  for (const [name, formula] of Object.entries(costCalculation.formula)) {
    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          { type: 'text', text: { content: `${name}: ` }, annotations: { bold: true } },
          { type: 'text', text: { content: formula }, annotations: { code: true } }
        ]
      }
    });
  }

  // Example section
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: '📝 계산 예시' } }]
    }
  });

  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        { type: 'text', text: { content: '시나리오: ' }, annotations: { bold: true } },
        { type: 'text', text: { content: costCalculation.example.scenario } }
      ]
    }
  });

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [{ type: 'text', text: { content: `입력 비용: ${costCalculation.example.inputCost}` } }]
    }
  });

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [{ type: 'text', text: { content: `출력 비용: ${costCalculation.example.outputCost}` } }]
    }
  });

  blocks.push({
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [
        { type: 'text', text: { content: `총 비용: ${costCalculation.example.totalCost}` }, annotations: { bold: true } }
      ]
    }
  });

  // Tip
  blocks.push({
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [{ type: 'text', text: { content: `💡 Tip: ${costCalculation.tip}` } }],
      icon: { type: 'emoji', emoji: '💡' },
      color: 'yellow_background'
    }
  });

  return blocks;
}

async function createPage(
  notion: Client,
  parentId: string,
  title: string,
  emoji: string,
  blocks: BlockObjectRequest[]
): Promise<string> {
  const page = await notion.pages.create({
    parent: { page_id: parentId },
    icon: { type: 'emoji', emoji: emoji as any },
    properties: {
      title: {
        title: [{ text: { content: title } }]
      }
    },
    children: blocks as any
  });

  return page.id;
}

async function syncBusinessDocs(rootPageId: string, dryRun: boolean = false): Promise<void> {
  const glossary = loadBusinessGlossary();

  if (dryRun) {
    console.log('[DRY-RUN] Would create the following pages:');
    console.log('  1. 📊 시스템 개요');
    console.log('  2. 📚 비즈니스 용어집');
    console.log('  3. 🗃️ 데이터 사전');
    console.log('  4. 📈 대시보드 가이드');
    console.log('  5. 💰 비용 가이드');
    return;
  }

  const notion = createNotionClient();

  console.log('Creating business documentation pages...\n');

  // Create main business docs page
  const businessDocsPage = await createPage(
    notion,
    rootPageId,
    '📖 비즈니스 문서',
    '📖',
    [{
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [{ type: 'text', text: { content: 'OLA B2B 모니터링 시스템의 비즈니스 관점 문서입니다. 비개발자도 쉽게 이해할 수 있도록 작성되었습니다.' } }],
        icon: { type: 'emoji', emoji: '📖' },
        color: 'blue_background'
      }
    }]
  );
  console.log('✅ Created: 비즈니스 문서 (root)');

  await new Promise(r => setTimeout(r, 350));

  // 1. System Overview
  await createPage(
    notion,
    businessDocsPage,
    '시스템 개요',
    '📊',
    createOverviewBlocks(glossary)
  );
  console.log('✅ Created: 시스템 개요');

  await new Promise(r => setTimeout(r, 350));

  // 2. Business Glossary
  await createPage(
    notion,
    businessDocsPage,
    '비즈니스 용어집',
    '📚',
    createGlossaryBlocks(glossary)
  );
  console.log('✅ Created: 비즈니스 용어집');

  await new Promise(r => setTimeout(r, 350));

  // 3. Data Dictionary
  await createPage(
    notion,
    businessDocsPage,
    '데이터 사전',
    '🗃️',
    createDataDictionaryBlocks(glossary)
  );
  console.log('✅ Created: 데이터 사전');

  await new Promise(r => setTimeout(r, 350));

  // 4. Dashboard Guide
  await createPage(
    notion,
    businessDocsPage,
    '대시보드 가이드',
    '📈',
    createDashboardGuideBlocks(glossary)
  );
  console.log('✅ Created: 대시보드 가이드');

  await new Promise(r => setTimeout(r, 350));

  // 5. Cost Guide
  await createPage(
    notion,
    businessDocsPage,
    '비용 가이드',
    '💰',
    createCostGuideBlocks(glossary)
  );
  console.log('✅ Created: 비용 가이드');

  console.log('\n✅ Business documentation sync complete!');
}

// CLI
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const rootPageId = process.env.NOTION_ROOT_PAGE_ID;

  if (!rootPageId) {
    console.error('Error: NOTION_ROOT_PAGE_ID environment variable is not set');
    process.exit(1);
  }

  console.log('Starting business docs sync to Notion...');
  console.log(`Root page ID: ${rootPageId}`);
  console.log(`Dry run: ${dryRun}\n`);

  syncBusinessDocs(rootPageId, dryRun)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}
