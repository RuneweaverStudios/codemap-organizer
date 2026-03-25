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
import { join, relative, extname, basename, dirname } from 'path';

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

  // IMPROVED: Analyze code exports and structure
  const lines = content.split('\n');

  // Look for leading comments/docstrings
  const firstComment = lines.slice(0, 15).join('\n').match(/\/\*\*([\s\S]*?)\*\//);
  if (firstComment) {
    const desc = firstComment[1].trim().split('\n')[0];
    if (desc.length > 10 && desc.length < 100) {
      return desc;
    }
  }

  // Look for main exports
  const exportPatterns = [
    /export\s+(class|interface|type|function|const)\s+(\w+)/g,
    /export\s+default\s+(class|function|\w+)/g,
  ];

  const exports: string[] = [];
  for (const pattern of exportPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      exports.push(match[2] || match[1]);
    }
  }

  // If we have clear exports, use them to build purpose
  if (exports.length > 0 && exports.length <= 5) {
    const uniqueExports = [...new Set(exports)];
    if (uniqueExports.length === 1) {
      return `${uniqueExports[0]} module`;
    } else if (uniqueExports.length <= 3) {
      return `${uniqueExports.join(', ')} modules`;
    }
  }

  // Look for class/function definitions as fallback
  const definitionPatterns = [
    /class\s+(\w+)/g,
    /function\s+(\w+)\s*\(/g,
    /interface\s+(\w+)/g,
    /type\s+(\w+)\s*=/g,
  ];

  const definitions: string[] = [];
  for (const pattern of definitionPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      definitions.push(match[1]);
    }
  }

  if (definitions.length > 0 && definitions.length <= 3) {
    const topDefs = [...new Set(definitions)].slice(0, 2);
    return `${topDefs.join(' and ')}`;
  }

  // Fallback to file naming
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

function extractRelatedFiles(filePath: string, content: string, allFiles?: string[]): string[] {
  const related: string[] = [];
  const dir = dirname(filePath);

  // Look for import statements to find related files (outbound dependencies)
  const importPatterns = [
    /import\s+.*?\s+from\s+['"](\.\.?\/[^'"]+)['"]/g,
    /require\(['"](\.\.?\/[^'"]+)['"]\)/g,
  ];

  for (const pattern of importPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];
      // Resolve relative paths
      let resolvedPath: string;
      if (importPath.startsWith('../')) {
        const parts = dir.split('/').filter(Boolean);
        const goUp = importPath.split('../').length - 1;
        const remaining = importPath.split('../').filter(p => p).join('/');
        resolvedPath = '/' + [...parts.slice(0, -goUp), remaining].join('/');
      } else if (importPath.startsWith('./')) {
        resolvedPath = dir + '/' + importPath.slice(2);
      } else {
        resolvedPath = '/' + importPath;
      }
      related.push(resolvedPath);
    }
  }

  // If all files provided, also find files that import this file (inbound dependencies)
  // Only do this if we have the file list (expensive operation)
  if (allFiles && allFiles.length > 0) {
    const fileName = basename(filePath);
    const fileBaseName = fileName.replace(/\.(ts|tsx|js|jsx|py|go|rs)$/, '');

    // This is a simple heuristic - in production would use AST parsing
    for (const otherFile of allFiles) {
      if (otherFile === filePath) continue;

      try {
        const otherContent = readFileSync(otherFile, 'utf-8');
        // Check if other file imports this one
        const importsThis = (
          otherContent.includes(`from '${filePath}'`) ||
          otherContent.includes(`from "${filePath}"`) ||
          otherContent.includes(`from './${fileName}'`) ||
          otherContent.includes(`from "../${fileName}"`) ||
          otherContent.includes(`require('${filePath}'`) ||
          otherContent.includes(`require("${filePath}"`)
        );

        if (importsThis) {
          related.push(otherFile);
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  return [...new Set(related)].slice(0, 8); // Increased to 8 related files
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

  // Look for common patterns in code - IMPROVED
  const keywordPatterns = [
    // Exported interfaces and types (higher priority)
    /export\s+(interface|type|class)\s+(\w+)/g,
    // Public API functions
    /export\s+(const|function|async\s+function)\s+(\w+)/g,
    // Non-exported but important (classes, interfaces)
    /\b(interface|type|class)\s+(\w+)/g,
    // Functions and constants
    /\b(function|const)\s+(\w+)\s*(?=\(|=)/g,
  ];

  for (const pattern of keywordPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // match[2] is the identifier name in export patterns
      const word = match[2] || match[1];
      if (word && word.length > 3 && word.length < 30 && /^[A-Z_][a-zA-Z0-9_]*$/.test(word)) {
        // Skip common generic words
        if (!['from', 'import', 'export', 'default', 'return', 'async'].includes(word)) {
          keywords.add(word.toLowerCase());
        }
      }
    }
  }

  // Extract from purpose field if already exists
  const purposeMatch = content.match(/Purpose:\s*([^\n]+)/);
  if (purposeMatch) {
    const purposeWords = purposeMatch[1]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter(w => w.length > 3);
    purposeWords.forEach(w => keywords.add(w));
  }

  return Array.from(keywords).slice(0, 10);
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

function processFile(filePath: string, projectRoot: string, allFiles: string[]): boolean {
  const config = getLanguageConfig(filePath);
  if (!config) return false;

  const content = readFileSync(filePath, 'utf-8');

  // Skip if already has header
  if (hasHeader(content, config)) {
    console.log(`✓ Already has header: ${filePath}`);
    return false;
  }

  const dependencies = extractDependencies(content);
  const related = extractRelatedFiles(filePath, content, allFiles);
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

export function addHeaders(root: string = process.cwd(), incremental: boolean = false): void {
  console.log(`\n📁 Scanning ${root} for code files...\n`);

  const allFiles = scanDirectory(root, root);
  let files = allFiles;

  // Incremental mode: only process files without headers or with old headers
  if (incremental) {
    const needsUpdate = allFiles.filter(file => {
      try {
        const content = readFileSync(file, 'utf-8');
        const config = getLanguageConfig(file);
        if (!config) return false;

        // Check if has header
        if (!hasHeader(content, config)) return true;

        // Check if header is stale (older than 7 days or file modified since)
        const headerMatch = content.match(/Last Updated:\s*(\d{4}-\d{2}-\d{2})/);
        if (headerMatch) {
          const headerDate = new Date(headerMatch[1]);
          const daysSinceUpdate = (Date.now() - headerDate.getTime()) / (1000 * 60 * 60 * 24);

          const stats = statSync(file);
          const fileModified = new Date(stats.mtime);

          // Update if header is old or file was modified after header
          return daysSinceUpdate > 7 || fileModified > headerDate;
        }

        return false;
      } catch {
        return true; // Process on error
      }
    });

    files = needsUpdate;
    console.log(`Incremental mode: ${files.length} of ${allFiles.length} files need updates\n`);
  }

  console.log(`Found ${files.length} code files to process\n`);

  let processed = 0;
  for (const file of files) {
    if (processFile(file, root, allFiles)) {
      processed++;
    }
  }

  console.log(`\n✅ Processed ${processed}/${files.length} files\n`);
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const root = args[0] || process.cwd();
  const incremental = args.includes('--incremental') || args.includes('-i');

  addHeaders(root, incremental);
}
