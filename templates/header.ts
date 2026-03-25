#!/usr/bin/env node

/*
 * Path: /Users/ghost/Desktop/codemap/codemap-organizer/templates/header.ts
 * Module: templates/header
 * Purpose: Add structured headers to code files for AI-friendly navigation
 * Dependencies: fs, path
 * Related: ../scripts/generate-codemaps.ts
 * Keywords: header, generator, file-organization, metadata, navigation
 * Last Updated: 2026-03-24
 */

/**
 * File Header Generator
 * Adds structured headers to code files for AI-friendly navigation
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, extname, basename } from 'path';

interface HeaderData {
  path: string;
  module: string;
  purpose: string;
  dependencies: string[];
  related: string[];
  keywords: string[];
  lastUpdated: string;
}

interface LanguageConfig {
  headerStart: string;
  headerEnd: string;
  linePrefix: string;
  commentStyle: 'block' | 'line' | 'doc';
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  // Block comment styles
  '.ts': { headerStart: '/*', headerEnd: ' */', linePrefix: ' * ', commentStyle: 'block' },
  '.tsx': { headerStart: '/*', headerEnd: ' */', linePrefix: ' * ', commentStyle: 'block' },
  '.js': { headerStart: '/*', headerEnd: ' */', linePrefix: ' * ', commentStyle: 'block' },
  '.jsx': { headerStart: '/*', headerEnd: ' */', linePrefix: ' * ', commentStyle: 'block' },
  '.go': { headerStart: '/*', headerEnd: ' */', linePrefix: '', commentStyle: 'block' },
  '.java': { headerStart: '/*', headerEnd: ' */', linePrefix: ' * ', commentStyle: 'block' },
  '.c': { headerStart: '/*', headerEnd: ' */', linePrefix: ' * ', commentStyle: 'block' },
  '.cpp': { headerStart: '/*', headerEnd: ' */', linePrefix: ' * ', commentStyle: 'block' },
  '.h': { headerStart: '/*', headerEnd: ' */', linePrefix: ' * ', commentStyle: 'block' },
  '.hpp': { headerStart: '/*', headerEnd: ' */', linePrefix: ' * ', commentStyle: 'block' },

  // Python docstring style
  '.py': { headerStart: '"""', headerEnd: '"""', linePrefix: '', commentStyle: 'doc' },
  '.pyi': { headerStart: '"""', headerEnd: '"""', linePrefix: '', commentStyle: 'doc' },

  // Rust doc style
  '.rs': { headerStart: '//!', headerEnd: '', linePrefix: '! ', commentStyle: 'line' },

  // Line comment styles
  '.sh': { headerStart: '#', headerEnd: '', linePrefix: '# ', commentStyle: 'line' },
  '.bash': { headerStart: '#', headerEnd: '', linePrefix: '# ', commentStyle: 'line' },
  '.zsh': { headerStart: '#', headerEnd: '', linePrefix: '# ', commentStyle: 'line' },
  '.fish': { headerStart: '#', headerEnd: '', linePrefix: '# ', commentStyle: 'line' },
};

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  'venv',
  '.venv',
  '__pycache__',
  '.next',
  '.nuxt',
  'coverage',
  '.claude',
]);

function getLanguageConfig(filePath: string): LanguageConfig | null {
  const ext = extname(filePath);
  return LANGUAGE_CONFIGS[ext] || null;
}

function generateModulePath(filePath: string, projectRoot: string): string {
  const relPath = relative(projectRoot, filePath);
  const parts = relPath.split('/');
  // Remove filename and extension
  parts.pop();
  // Remove src/ or lib/ if present
  if (parts[0] === 'src' || parts[0] === 'lib') {
    parts.shift();
  }
  return parts.join('/');
}

function extractPurpose(content: string, filePath: string): string {
  // Extract from path/filename for better context
  const pathParts = filePath.split('/');
  const fileName = basename(filePath, extname(filePath));

  // Check for common patterns in path
  const pathStr = filePath.toLowerCase();

  // API routes
  if (pathStr.includes('/api/auth/')) return `Auth API route - ${fileName}`;
  if (pathStr.includes('/api/')) return `API route - ${fileName}`;

  // Auth related
  if (pathStr.includes('auth') || pathStr.includes('login') || pathStr.includes('signout')) {
    return `Authentication module - ${fileName}`;
  }

  // Components
  if (pathStr.includes('/components/')) return `UI component - ${fileName}`;

  // Hooks
  if (pathStr.includes('/hooks/')) return `React hook - ${fileName}`;

  // Lib/utils
  if (pathStr.includes('/lib/')) return `Library utility - ${fileName}`;

  // Services
  if (pathStr.includes('/services/')) return `Service module - ${fileName}`;

  // Workers
  if (pathStr.includes('/worker/') || pathStr.includes('/processors/')) {
    return `Worker processor - ${fileName}`;
  }

  // Default: Try to find in content
  const lines = content.split('\n');
  const firstLines = lines.slice(0, 10).join(' ');

  const purposePatterns = [
    /(?:\/\/|\/\*\*|#)[\s\*]*([A-Z][^.!?]*[.!?])/i,
    /(?:exports|default export|export const|export function)\s+(\w+)/,
    /class\s+(\w+)/,
    /function\s+(\w+)/,
    /interface\s+(\w+)/,
    /type\s+(\w+)/,
  ];

  for (const pattern of purposePatterns) {
    const match = firstLines.match(pattern);
    if (match) {
      return `${match[1] || fileName} - ${extractFromFileNaming(filePath)}`;
    }
  }

  return extractFromFileNaming(filePath);
}

function extractFromFileNaming(filePath: string): string {
  const name = basename(filePath, extname(filePath));
  // Convert camelCase/PascalCase to words
  const words = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .trim()
    .toLowerCase();
  return `${words.charAt(0).toUpperCase() + words.slice(1)} module`;
}

function extractDependencies(content: string): { external: string[]; internal: string[] } {
  const external: string[] = [];
  const internal: string[] = [];

  // TypeScript/JavaScript imports
  const importPatterns = [
    /import\s+.*?\s+from\s+['"]([^./][^'"]*)['"]/g,
    /require\(['"]([^./][^'"]*)['"]\)/g,
  ];

  for (const pattern of importPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      external.push(match[1]);
    }
  }

  // Python imports
  const pyImportPattern = /(?:^|\n)import\s+([^\s.]+)(?:\s+as\s+\w+)?/gm;
  let pyMatch;
  while ((pyMatch = pyImportPattern.exec(content)) !== null) {
    external.push(pyMatch[1]);
  }

  return { external: [...new Set(external)], internal: [...new Set(internal)] };
}

function extractRelatedFiles(filePath: string, content: string): string[] {
  const related: string[] = [];
  const dir = join(filePath, '..');

  // Look for import statements to find related files
  const importPatterns = [
    /import\s+.*?\s+from\s+['"](\.\.?\/[^'"]+)['"]/g,
    /require\(['"](\.\.?\/[^'"]+)['"]\)/g,
  ];

  for (const pattern of importPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      related.push(match[1]);
    }
  }

  return [...new Set(related)].slice(0, 5); // Limit to 5 related files
}

function extractKeywords(content: string, filePath: string): string[] {
  const keywords = new Set<string>();

  // Add filename-based keywords
  const name = basename(filePath, extname(filePath)).toLowerCase();
  keywords.add(name);

  // Extract from path for better context
  const pathParts = filePath.toLowerCase().split('/');

  // Add meaningful path segments
  for (const part of pathParts) {
    if (
      part.length > 2 &&
      part.length < 30 &&
      !part.startsWith('.') &&
      !['src', 'app', 'lib', 'components', 'pages', 'utils', 'hooks'].includes(part)
    ) {
      keywords.add(part);
    }
  }

  // Look for common patterns in code
  const keywordPatterns = [
    /interface\s+(\w+)/g,
    /type\s+(\w+)/g,
    /class\s+(\w+)/g,
    /function\s+(\w+)/g,
    /const\s+(\w+)\s*=/g,
  ];

  for (const pattern of keywordPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const word = match[1];
      if (word.length > 3 && word.length < 30 && /^[A-Z_][a-zA-Z0-9_]*$/.test(word)) {
        keywords.add(word.toLowerCase());
      }
    }
  }

  return Array.from(keywords).slice(0, 8);
}

function generateHeader(data: HeaderData, config: LanguageConfig): string {
  const lines: string[] = [];

  if (config.commentStyle === 'block') {
    lines.push(config.headerStart);
    lines.push(`${config.linePrefix}Path: ${data.path}`);
    lines.push(`${config.linePrefix}Module: ${data.module}`);
    lines.push(`${config.linePrefix}Purpose: ${data.purpose}`);
    lines.push(`${config.linePrefix}Dependencies: ${data.dependencies.join(', ')}`);
    lines.push(`${config.linePrefix}Related: ${data.related.join(', ')}`);
    lines.push(`${config.linePrefix}Keywords: ${data.keywords.join(', ')}`);
    lines.push(`${config.linePrefix}Last Updated: ${data.lastUpdated}`);
    lines.push(config.headerEnd);
  } else if (config.commentStyle === 'doc') {
    lines.push(config.headerStart);
    lines.push(`Path: ${data.path}`);
    lines.push(`Module: ${data.module}`);
    lines.push(`Purpose: ${data.purpose}`);
    lines.push(`Dependencies: ${data.dependencies.join(', ')}`);
    lines.push(`Related: ${data.related.join(', ')}`);
    lines.push(`Keywords: ${data.keywords.join(', ')}`);
    lines.push(`Last Updated: ${data.lastUpdated}`);
    lines.push(config.headerEnd);
  } else if (config.commentStyle === 'line') {
    lines.push(`${config.linePrefix}Path: ${data.path}`);
    lines.push(`${config.linePrefix}Module: ${data.module}`);
    lines.push(`${config.linePrefix}Purpose: ${data.purpose}`);
    lines.push(`${config.linePrefix}Dependencies: ${data.dependencies.join(', ')}`);
    lines.push(`${config.linePrefix}Related: ${data.related.join(', ')}`);
    lines.push(`${config.linePrefix}Keywords: ${data.keywords.join(', ')}`);
    lines.push(`${config.linePrefix}Last Updated: ${data.lastUpdated}`);
  }

  return lines.join('\n') + '\n\n';
}

function hasHeader(content: string, config: LanguageConfig): boolean {
  const headerPatterns = [
    /Path:\s*\/[^\s]+/,
    /Module:\s+/,
    /Purpose:\s+/,
  ];

  const firstLines = content.split('\n').slice(0, 15).join('\n');

  for (const pattern of headerPatterns) {
    if (!pattern.test(firstLines)) {
      return false;
    }
  }

  return true;
}

function processFile(filePath: string, projectRoot: string): boolean {
  const config = getLanguageConfig(filePath);
  if (!config) return false;

  const content = readFileSync(filePath, 'utf-8');

  // Skip if already has header
  if (hasHeader(content, config)) {
    console.log(`✓ Already has header: ${filePath}`);
    return false;
  }

  const dependencies = extractDependencies(content);
  const related = extractRelatedFiles(filePath, content);
  const keywords = extractKeywords(content, filePath);

  const headerData: HeaderData = {
    path: filePath,
    module: generateModulePath(filePath, projectRoot),
    purpose: extractPurpose(content, filePath),
    dependencies: [...dependencies.external, ...dependencies.internal],
    related,
    keywords,
    lastUpdated: new Date().toISOString().split('T')[0],
  };

  const header = generateHeader(headerData, config);
  writeFileSync(filePath, header + content);

  console.log(`✓ Added header: ${filePath}`);
  return true;
}

function scanDirectory(dir: string, projectRoot: string, files: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        scanDirectory(fullPath, projectRoot, files);
      }
    } else if (entry.isFile()) {
      const config = getLanguageConfig(fullPath);
      if (config) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

export function addHeaders(root: string = process.cwd()): void {
  console.log(`\n📁 Scanning ${root} for code files...\n`);

  const files = scanDirectory(root, root);
  console.log(`Found ${files.length} code files\n`);

  let processed = 0;
  for (const file of files) {
    if (processFile(file, root)) {
      processed++;
    }
  }

  console.log(`\n✅ Processed ${processed}/${files.length} files\n`);
}

// CLI entry point
if (require.main === module) {
  const root = process.argv[2] || process.cwd();
  addHeaders(root);
}
