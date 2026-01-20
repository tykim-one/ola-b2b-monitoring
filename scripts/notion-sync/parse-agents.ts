/**
 * AGENTS.md Parser
 *
 * Parses all AGENTS.md files in the codebase and extracts structured data
 * including hierarchy, purpose, key files, and subdirectories.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface AgentsSection {
  title: string;
  content: string;
  items?: string[];
}

export interface AgentsFile {
  path: string;
  relativePath: string;
  parentPath: string | null;
  depth: number;
  purpose: string;
  sections: AgentsSection[];
  keyFiles: Array<{ name: string; description: string }>;
  subdirectories: Array<{ name: string; path: string }>;
  rawContent: string;
}

export interface AgentsTree {
  root: AgentsFile | null;
  files: Map<string, AgentsFile>;
  hierarchy: Map<string, string[]>; // parent -> children
}

/**
 * Extract parent path from AGENTS.md content
 */
function extractParentPath(content: string): string | null {
  const match = content.match(/<!--\s*Parent:\s*(.+?)\s*-->/);
  if (match) {
    return match[1].trim();
  }
  return null;
}

/**
 * Extract purpose from AGENTS.md (first paragraph after title)
 */
function extractPurpose(content: string): string {
  const lines = content.split('\n');
  let foundTitle = false;
  let purpose = '';

  for (const line of lines) {
    if (line.startsWith('# ')) {
      foundTitle = true;
      continue;
    }
    if (foundTitle && line.trim() && !line.startsWith('#') && !line.startsWith('<!--')) {
      purpose = line.trim();
      break;
    }
  }

  return purpose;
}

/**
 * Extract sections from markdown content
 */
function extractSections(content: string): AgentsSection[] {
  const sections: AgentsSection[] = [];
  const lines = content.split('\n');
  let currentSection: AgentsSection | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)/);
    const h3Match = line.match(/^### (.+)/);

    if (h2Match || h3Match) {
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection);
      }
      currentSection = {
        title: (h2Match || h3Match)![1].trim(),
        content: '',
        items: []
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
      // Extract list items
      const listMatch = line.match(/^[-*]\s+(.+)/);
      if (listMatch) {
        currentSection.items?.push(listMatch[1].trim());
      }
    }
  }

  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract key files from AGENTS.md
 */
function extractKeyFiles(content: string): Array<{ name: string; description: string }> {
  const keyFiles: Array<{ name: string; description: string }> = [];

  // Match patterns like "- `filename.ts` - Description" or "- **filename.ts**: Description"
  const patterns = [
    /[-*]\s+[`*]+([^`*]+)[`*]+\s*[-:]\s*(.+)/g,
    /[-*]\s+([a-zA-Z0-9_.-]+\.[a-z]+)\s*[-:]\s*(.+)/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1].trim();
      const description = match[2].trim();
      if (!keyFiles.find(f => f.name === name)) {
        keyFiles.push({ name, description });
      }
    }
  }

  return keyFiles;
}

/**
 * Extract subdirectories from AGENTS.md
 */
function extractSubdirectories(content: string, basePath: string): Array<{ name: string; path: string }> {
  const subdirs: Array<{ name: string; path: string }> = [];

  // Match patterns like "- `subdir/` - Description" or links to child AGENTS.md
  const patterns = [
    /[-*]\s+\[([^\]]+)\]\(([^)]+\/AGENTS\.md)\)/g,
    /[-*]\s+[`*]+([^`*]+\/)[`*]+/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1].replace(/\/$/, '').trim();
      const subPath = match[2] ? path.dirname(match[2]) : name;
      if (!subdirs.find(s => s.name === name)) {
        subdirs.push({ name, path: path.join(basePath, subPath) });
      }
    }
  }

  return subdirs;
}

/**
 * Calculate directory depth from root
 */
function calculateDepth(filePath: string, rootPath: string): number {
  const relative = path.relative(rootPath, path.dirname(filePath));
  if (!relative) return 0;
  return relative.split(path.sep).filter(p => p).length;
}

/**
 * Parse a single AGENTS.md file
 */
export function parseAgentsFile(filePath: string, rootPath: string): AgentsFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  const dirPath = path.dirname(filePath);
  const relativePath = path.relative(rootPath, dirPath) || '.';

  return {
    path: filePath,
    relativePath,
    parentPath: extractParentPath(content),
    depth: calculateDepth(filePath, rootPath),
    purpose: extractPurpose(content),
    sections: extractSections(content),
    keyFiles: extractKeyFiles(content),
    subdirectories: extractSubdirectories(content, dirPath),
    rawContent: content
  };
}

/**
 * Parse all AGENTS.md files in a directory
 */
export async function parseAllAgentsFiles(rootPath: string): Promise<AgentsTree> {
  const pattern = path.join(rootPath, '**/AGENTS.md');
  const files = await glob(pattern, {
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
  });

  const tree: AgentsTree = {
    root: null,
    files: new Map(),
    hierarchy: new Map()
  };

  // Parse all files
  for (const file of files) {
    const parsed = parseAgentsFile(file, rootPath);
    tree.files.set(parsed.relativePath, parsed);

    if (parsed.depth === 0) {
      tree.root = parsed;
    }
  }

  // Build hierarchy
  for (const [relativePath, file] of tree.files) {
    if (file.parentPath) {
      const parentDir = path.normalize(path.join(path.dirname(file.path), file.parentPath));
      const parentRelative = path.relative(rootPath, path.dirname(parentDir)) || '.';

      if (!tree.hierarchy.has(parentRelative)) {
        tree.hierarchy.set(parentRelative, []);
      }
      tree.hierarchy.get(parentRelative)!.push(relativePath);
    }
  }

  return tree;
}

/**
 * Get files sorted by depth (parents first)
 */
export function getFilesByDepth(tree: AgentsTree): AgentsFile[] {
  return Array.from(tree.files.values()).sort((a, b) => a.depth - b.depth);
}

// CLI usage
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const rootPath = process.argv[2] || process.cwd();

  parseAllAgentsFiles(rootPath).then(tree => {
    console.log(`Found ${tree.files.size} AGENTS.md files\n`);

    const sorted = getFilesByDepth(tree);
    for (const file of sorted) {
      console.log(`${'  '.repeat(file.depth)}${file.relativePath}/`);
      console.log(`${'  '.repeat(file.depth)}  Purpose: ${file.purpose.substring(0, 60)}...`);
      console.log(`${'  '.repeat(file.depth)}  Key files: ${file.keyFiles.length}`);
      console.log('');
    }
  });
}
