#!/usr/bin/env node

/*
 * Path: /Users/ghost/Desktop/codemap/codemap-organizer/scripts/generate-codemaps.ts
 * Module: scripts/generate-codemaps
 * Purpose: Generate navigable code maps organized by area (frontend, backend, database, etc.)
 * Dependencies: fs, path
 * Related: ../templates/header.ts
 * Keywords: codemap, generator, architecture, documentation, navigation
 * Last Updated: 2026-03-24
 */

/**
 * CODEMAP Generator
 * Generates navigable code maps organized by area (frontend, backend, database, etc.)
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, relative, extname, sep } from 'path';

interface FileInfo {
  path: string;
  relPath: string;
  lines: number;
  area: string;
  purpose?: string;
}

interface AreaInfo {
  name: string;
  files: FileInfo[];
  totalLines: number;
  entryPoints: string[];
}

const AREA_PATTERNS: Record<string, RegExp[]> = {
  frontend: [
    new RegExp(`/(app|pages|components|hooks|contexts|ui|views|layouts|styles)(${sep}|$)`),
    /\.(tsx|jsx|css|scss|sass|less|vue|svelte)$/i,
  ],
  backend: [
    new RegExp(`/(api|routes|controllers|middleware|server|services|handlers)(${sep}|$)`),
    /\.(route|controller|handler|middleware|service)\.(ts|js)$/i,
  ],
  database: [
    new RegExp(`/(models|schemas|migrations|prisma|drizzle|db|database|repositories)(${sep}|$)`),
    /\.(model|schema|migration|seed)\.(ts|js)$/i,
    /prisma[\\/]schema\.prisma$/,
    /schema\.sql$/,
  ],
  integrations: [
    new RegExp(`/(integrations?|third-party|external|plugins?|adapters?|connectors?)(${sep}|$)`),
    /\.(integration|adapter|connector)\.(ts|js)$/i,
  ],
  workers: [
    new RegExp(`/(workers?|jobs?|queues?|tasks?|cron|background)(${sep}|$)`),
    /\.(worker|job|queue|task|cron)\.(ts|js)$/i,
  ],
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
  'docs',
]);

function classifyFile(filePath: string, projectRoot: string): string {
  const relPath = relative(projectRoot, filePath);

  for (const [area, patterns] of Object.entries(AREA_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(filePath) || pattern.test(relPath)) {
        return area;
      }
    }
  }

  // Default: check extension for generic classification
  const ext = extname(filePath).toLowerCase();
  if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) return 'backend';
  if (['.py', '.go', '.rs', '.java'].includes(ext)) return 'backend';
  if (['.sql', '.prisma'].includes(ext)) return 'database';

  return 'backend'; // fallback
}

function countLines(content: string): number {
  return content.split('\n').length;
}

function extractPurpose(content: string): string {
  // Look for purpose in header comments
  const headerMatch = content.match(/Purpose:\s*([^\n]+)/);
  if (headerMatch) return headerMatch[1].trim();

  // Look for module/class descriptions
  const descMatch = content.match(/(?:class|interface|type|function)\s+(\w+)/);
  if (descMatch) {
    return `${descMatch[1]} module`;
  }

  return 'Code module';
}

function scanDirectory(dir: string, projectRoot: string, files: Map<string, FileInfo> = new Map()): Map<string, FileInfo> {
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        scanDirectory(fullPath, projectRoot, files);
      }
    } else if (entry.isFile()) {
      const ext = extname(fullPath).toLowerCase();
      const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.sql', '.prisma'];

      if (codeExts.includes(ext)) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const relPath = relative(projectRoot, fullPath);

          files.set(fullPath, {
            path: fullPath,
            relPath,
            lines: countLines(content),
            area: classifyFile(fullPath, projectRoot),
            purpose: extractPurpose(content),
          });
        } catch (e) {
          // Skip unreadable files
        }
      }
    }
  }

  return files;
}

function groupByArea(files: FileInfo[]): Map<string, AreaInfo> {
  const areas = new Map<string, AreaInfo>();

  // Initialize all areas
  for (const areaName of Object.keys(AREA_PATTERNS)) {
    areas.set(areaName, {
      name: areaName,
      files: [],
      totalLines: 0,
      entryPoints: [],
    });
  }

  // Group files by area
  for (const file of files) {
    const area = areas.get(file.area);
    if (area) {
      area.files.push(file);
      area.totalLines += file.lines;
    }
  }

  return areas;
}

function findEntryPoints(files: FileInfo[]): string[] {
  const entryPatterns = [
    /^(index|main|app|server)\.(ts|js|py|go|rs)$/,
    /^cli\.(ts|js|py)$/,
  ];

  return files
    .filter(f => entryPatterns.some(p => p.test(f.relPath)))
    .map(f => f.relPath)
    .slice(0, 5);
}

function generateArchitectureTree(files: FileInfo[]): string {
  const tree = new Map<string, Set<string>>();

  for (const file of files) {
    const parts = file.relPath.split(sep);
    parts.pop(); // Remove filename

    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!tree.has(currentPath)) {
        tree.set(currentPath, new Set());
      }
      // Add file to its directory
      if (part === parts[parts.length - 1]) {
        tree.get(currentPath)!.add(file.relPath.split(sep).pop()!);
      }
    }
  }

  // Build tree string
  let result = '```\n';
  const sortedPaths = Array.from(tree.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [path, items] of sortedPaths) {
    const depth = path.split(sep).length - 1;
    const indent = '  '.repeat(depth);
    const name = path.split(sep).pop() || path;
    result += `${indent}${name}/\n`;

    for (const item of Array.from(items).sort()) {
      result += `${indent}  └── ${item}\n`;
    }
  }

  result += '```';
  return result;
}

function generateDataFlow(area: string, files: FileInfo[]): string {
  const flowPatterns: Record<string, string[]> = {
    frontend: [
      'UI Components → User Interactions',
      'Event Handlers → Action Dispatchers',
      'State Management → Component Re-render',
      'API Calls → Data Fetching',
    ],
    backend: [
      'HTTP Requests → Route Handlers',
      'Middleware → Authentication/Validation',
      'Controllers → Business Logic',
      'Services → Data Access',
    ],
    database: [
      'Schema Definitions → Data Models',
      'Migrations → Schema Evolution',
      'Queries → Data Retrieval',
      'Transactions → Data Consistency',
    ],
    integrations: [
      'API Clients → External Services',
      'Webhook Handlers → Event Processing',
      'Adapters → Protocol Translation',
    ],
    workers: [
      'Job Queue → Task Scheduler',
      'Workers → Background Processing',
      'Cron → Scheduled Tasks',
    ],
  };

  const flows = flowPatterns[area] || ['Data flows through this area'];
  return flows.map(f => `1. ${f}`).join('\n');
}

function generateExternalDependencies(files: FileInfo[]): string[] {
  const deps = new Set<string>();

  for (const file of files) {
    try {
      const content = readFileSync(file.path, 'utf-8');
      const patterns = [
        /import\s+.*?\s+from\s+['"]([^./][^'"]*)['"]/g,
        /require\(['"]([^./][^'"]*)['"]\)/g,
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const dep = match[1].split('/')[0];
          if (dep && !dep.startsWith('@types')) {
            deps.add(dep);
          }
        }
      }
    } catch (e) {
      // Skip
    }
  }

  return Array.from(deps).sort().slice(0, 10);
}

function generateAreaCodemap(area: string, info: AreaInfo, projectRoot: string): string {
  const date = new Date().toISOString().split('T')[0];
  const architecture = generateArchitectureTree(info.files);
  const dataFlow = generateDataFlow(area, info.files);
  const externalDeps = generateExternalDependencies(info.files);

  // Find entry points
  const entryPoints = findEntryPoints(info.files);

  // Key modules table (top 15 by lines)
  const keyModules = info.files
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 15)
    .map(f => `| \`${f.relPath}\` | ${f.lines} | ${f.purpose} |`)
    .join('\n');

  // Related areas
  const relatedAreas = Object.keys(AREA_PATTERNS)
    .filter(a => a !== area)
    .map(a => `- [${a}.md](./${a}.md) - ${a.charAt(0).toUpperCase() + a.slice(1)} modules`)
    .join('\n');

  return `# ${area.charAt(0).toUpperCase() + area.slice(1)} Codemap

**Last Updated:** ${date}
**Entry Points:** ${entryPoints.length > 0 ? entryPoints.join(', ') : 'None detected'}
**Total Files:** ${info.files.length}
**Total Lines:** ${info.totalLines}

## Entry Points
${entryPoints.map(ep => `- \`${ep}\` - Main entry point`).join('\n') || '_No explicit entry points detected_'}

## Architecture
${architecture}

## Key Modules
| File | Lines | Purpose |
|------|-------|---------|
${keyModules}

## Data Flow
${dataFlow}

## External Dependencies
${externalDeps.map(d => `- \`${d}\` - External package`).join('\n') || '_No external dependencies detected_'}

## Related Areas
${relatedAreas}
`;
}

export function generateCodemaps(root: string = process.cwd()): void {
  console.log(`\n🗺️  Generating CODEMAPS for ${root}...\n`);

  // Scan all files
  const filesMap = scanDirectory(root, root);
  const allFiles = Array.from(filesMap.values());

  console.log(`Found ${allFiles.length} code files\n`);

  // Group by area
  const areas = groupByArea(allFiles);

  // Create output directory
  const outputDir = join(root, 'docs', 'CODEMAPS');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Generate INDEX.md
  let indexContent = `# Project CODEMAPS

**Last Updated:** ${new Date().toISOString().split('T')[0]}
**Total Areas:** ${areas.size}
**Total Files:** ${allFiles.length}

## Overview
This directory contains navigable code maps organized by area. Each codemap provides:
- Architecture tree view
- Key modules with line counts
- Data flow diagrams
- External dependencies
- Related area links

## Areas
`;

  // Generate each area codemap
  for (const [areaName, areaInfo] of areas.entries()) {
    if (areaInfo.files.length === 0) {
      console.log(`⏭️  Skipping ${areaName} (no files)`);
      continue;
    }

    console.log(`📄 Generating ${areaName}.md (${areaInfo.files.length} files, ${areaInfo.totalLines} lines)`);

    const codemap = generateAreaCodemap(areaName, areaInfo, root);
    const outputPath = join(outputDir, `${areaName}.md`);
    writeFileSync(outputPath, codemap);

    indexContent += `- **[${areaName.charAt(0).toUpperCase() + areaName.slice(1)}](./${areaName}.md)** - ${areaInfo.files.length} files, ${areaInfo.totalLines} lines\n`;
  }

  // Write INDEX.md
  writeFileSync(join(outputDir, 'INDEX.md'), indexContent);
  console.log(`\n✅ Generated CODEMAPS in ${outputDir}/\n`);
  console.log(`   📋 View: ${outputDir}/INDEX.md\n`);
}

// CLI entry point
if (require.main === module) {
  const root = process.argv[2] || process.cwd();
  generateCodemaps(root);
}
