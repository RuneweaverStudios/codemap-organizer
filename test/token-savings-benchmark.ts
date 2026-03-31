/**
 * CODEMAP Index Token Savings Benchmark
 *
 * Measures how many tokens an AI agent saves by reading a codemap index
 * before exploring a codebase, vs exploring blind.
 *
 * Baseline (no codemap): scan filenames → grep/read files → find answer
 * With codemap: read INDEX.md → read area map → read targeted files
 */

import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync, existsSync } from 'fs';
import { join, relative, extname, basename, sep } from 'path';
import { generateCodemaps } from '../scripts/generate-codemaps';

const CHARS_PER_TOKEN = 4;
const TARGET_REPO = process.argv[2];

if (!TARGET_REPO || !existsSync(TARGET_REPO)) {
  console.error('Usage: npx tsx test/token-savings-benchmark.ts <path-to-repo>');
  process.exit(1);
}

// ============================================================================
// Types
// ============================================================================

interface FileInfo {
  path: string;
  relPath: string;
  content: string;
  tokens: number;
  lines: number;
  ext: string;
}

interface SearchTask {
  name: string;
  searchTerms: string[];
  category: 'find-function' | 'understand-module' | 'trace-flow' | 'find-config' | 'debug';
}

interface TaskResult {
  task: SearchTask;
  baseline: { tokensRead: number; filesRead: number; found: boolean };
  withCodemap: { tokensRead: number; filesRead: number; found: boolean; codemapTokens: number };
  saved: number;
  pctSaved: number;
}

// ============================================================================
// Helpers
// ============================================================================

function tokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function scanFiles(dir: string, files: FileInfo[] = [], root?: string): FileInfo[] {
  const actualRoot = root || dir;
  const SKIP = new Set([
    'node_modules', '.git', 'dist', 'build', 'target', 'venv', '.venv',
    '__pycache__', '.next', '.nuxt', 'coverage', '.claude', '.turbo', 'docs',
  ]);
  const CODE_EXTS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.rb',
    '.java', '.swift', '.c', '.cpp', '.h', '.hpp', '.cs', '.kt',
  ]);

  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanFiles(full, files, actualRoot);
      } else if (entry.isFile() && CODE_EXTS.has(extname(entry.name))) {
        try {
          const content = readFileSync(full, 'utf-8');
          files.push({
            path: full,
            relPath: relative(actualRoot, full),
            content,
            tokens: tokens(content),
            lines: content.split('\n').length,
            ext: extname(entry.name),
          });
        } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }
  return files;
}

// ============================================================================
// Baseline: Blind exploration (no codemap)
// ============================================================================

function searchBaseline(files: FileInfo[], task: SearchTask): TaskResult['baseline'] {
  let tokensRead = 0;
  let filesRead = 0;
  let found = false;

  // Step 1: Scan all filenames (~1 token each)
  const nameMatches: FileInfo[] = [];
  for (const f of files) {
    tokensRead += tokens(f.relPath);
    if (task.searchTerms.some(t => f.relPath.toLowerCase().includes(t.toLowerCase()))) {
      nameMatches.push(f);
    }
  }

  // Step 2: Read full files that matched by name
  for (const f of nameMatches) {
    filesRead++;
    tokensRead += f.tokens;
    if (task.searchTerms.some(t => f.content.toLowerCase().includes(t.toLowerCase()))) {
      found = true;
    }
  }

  // Step 3: If not found, grep through first 50 lines of remaining files
  if (!found) {
    let grepCount = 0;
    for (const f of files) {
      if (nameMatches.includes(f)) continue;
      grepCount++;
      filesRead++;
      const preview = f.content.split('\n').slice(0, 50).join('\n');
      tokensRead += tokens(preview);
      if (task.searchTerms.some(t => preview.toLowerCase().includes(t.toLowerCase()))) {
        tokensRead += f.tokens - tokens(preview);
        found = true;
        break;
      }
      if (grepCount >= 30) break; // give up after 30 files
    }
  }

  return { tokensRead, filesRead, found };
}

// ============================================================================
// With Codemap: Read index first, then targeted files
// ============================================================================

function searchWithCodemap(
  files: FileInfo[],
  task: SearchTask,
  codemapDir: string,
): TaskResult['withCodemap'] {
  let tokensRead = 0;
  let filesRead = 0;
  let found = false;
  let codemapTokens = 0;

  // Step 1: Read INDEX.md to identify relevant area
  const indexPath = join(codemapDir, 'INDEX.md');
  if (!existsSync(indexPath)) {
    return { tokensRead: 0, filesRead: 0, found: false, codemapTokens: 0 };
  }
  const indexContent = readFileSync(indexPath, 'utf-8');
  const indexTok = tokens(indexContent);
  tokensRead += indexTok;
  codemapTokens += indexTok;

  // Step 2: Identify which area codemaps to read based on search terms
  const areaFiles = readdirSync(codemapDir).filter(f => f.endsWith('.md') && f !== 'INDEX.md');
  const matchedAreas: string[] = [];

  for (const areaFile of areaFiles) {
    const areaName = areaFile.replace('.md', '').toLowerCase();
    // Check if any search term relates to this area
    const areaTermMap: Record<string, string[]> = {
      frontend: ['component', 'hook', 'ui', 'page', 'view', 'layout', 'style', 'css', 'react', 'vue'],
      backend: ['route', 'api', 'controller', 'middleware', 'server', 'service', 'handler', 'auth', 'endpoint'],
      database: ['model', 'schema', 'migration', 'db', 'database', 'query', 'sql', 'prisma'],
      integrations: ['integration', 'third-party', 'external', 'adapter', 'connector', 'webhook'],
      workers: ['worker', 'job', 'queue', 'task', 'cron', 'background'],
    };

    const areaKeywords = areaTermMap[areaName] || [];
    const isRelevant = task.searchTerms.some(t =>
      areaKeywords.some(k => t.toLowerCase().includes(k) || k.includes(t.toLowerCase())) ||
      areaName.includes(t.toLowerCase())
    );

    // Also check if index mentions the term in this area's entry
    const indexLower = indexContent.toLowerCase();
    const termInIndex = task.searchTerms.some(t =>
      indexLower.includes(`${t.toLowerCase()}`) && indexLower.includes(areaName)
    );

    if (isRelevant || termInIndex) {
      matchedAreas.push(areaFile);
    }
  }

  // If no area matched, read all area maps (worst case)
  if (matchedAreas.length === 0) {
    matchedAreas.push(...areaFiles);
  }

  // Step 3: Read matched area codemaps
  const targetFiles = new Set<string>();

  for (const areaFile of matchedAreas) {
    const areaPath = join(codemapDir, areaFile);
    const areaContent = readFileSync(areaPath, 'utf-8');
    const areaTok = tokens(areaContent);
    tokensRead += areaTok;
    codemapTokens += areaTok;

    // Extract file paths from the Key Modules table
    const fileMatches = areaContent.matchAll(/\| `([^`]+)` \|/g);
    for (const match of fileMatches) {
      const filePath = match[1];
      // Check if this file is relevant to our search
      const entryLine = areaContent.split('\n').find(l => l.includes(filePath)) || '';
      const isRelevant = task.searchTerms.some(t =>
        filePath.toLowerCase().includes(t.toLowerCase()) ||
        entryLine.toLowerCase().includes(t.toLowerCase())
      );
      if (isRelevant) {
        targetFiles.add(filePath);
      }
    }

    // If no specific files matched, take top 3 from the area
    if (targetFiles.size === 0) {
      const allFilesInArea = [...areaContent.matchAll(/\| `([^`]+)` \|/g)].map(m => m[1]);
      allFilesInArea.slice(0, 3).forEach(f => targetFiles.add(f));
    }
  }

  // Step 4: Read only the targeted files
  for (const targetRel of targetFiles) {
    const file = files.find(f => f.relPath === targetRel || f.relPath.endsWith(targetRel));
    if (file) {
      filesRead++;
      tokensRead += file.tokens;
      if (task.searchTerms.some(t => file.content.toLowerCase().includes(t.toLowerCase()))) {
        found = true;
      }
    }
  }

  // Step 5: If still not found, fall back to filename scan on the matched area files only
  if (!found) {
    for (const f of files) {
      if (targetFiles.has(f.relPath)) continue;
      const pathLower = f.relPath.toLowerCase();
      if (task.searchTerms.some(t => pathLower.includes(t.toLowerCase()))) {
        filesRead++;
        tokensRead += f.tokens;
        if (task.searchTerms.some(t => f.content.toLowerCase().includes(t.toLowerCase()))) {
          found = true;
          break;
        }
      }
    }
  }

  return { tokensRead, filesRead, found, codemapTokens };
}

// ============================================================================
// Generate realistic search tasks from repo content
// ============================================================================

function generateTasks(files: FileInfo[]): SearchTask[] {
  const tasks: SearchTask[] = [];

  // Find a real function name from the codebase
  const midFile = files[Math.floor(files.length * 0.3)];
  const funcMatch = midFile?.content.match(/(?:export\s+)?(?:function|const|class)\s+(\w{4,})/);
  if (funcMatch) {
    tasks.push({
      name: `Find "${funcMatch[1]}" implementation`,
      searchTerms: [funcMatch[1]],
      category: 'find-function',
    });
  }

  // Find a real directory
  const dirs = [...new Set(files.map(f => f.relPath.split('/').slice(0, -1).join('/')).filter(d => d.length > 0))];
  const targetDir = dirs[Math.floor(dirs.length * 0.4)] || 'src';
  tasks.push({
    name: `Understand "${targetDir}" module`,
    searchTerms: targetDir.split('/').filter(p => p.length > 2),
    category: 'understand-module',
  });

  tasks.push({
    name: 'Find request handling flow',
    searchTerms: ['route', 'handler', 'controller', 'middleware'],
    category: 'trace-flow',
  });

  tasks.push({
    name: 'Find database configuration',
    searchTerms: ['config', 'database', 'connection', 'env'],
    category: 'find-config',
  });

  tasks.push({
    name: 'Find error handling patterns',
    searchTerms: ['error', 'catch', 'throw', 'exception'],
    category: 'debug',
  });

  tasks.push({
    name: 'Find authentication code',
    searchTerms: ['auth', 'login', 'token', 'session'],
    category: 'find-function',
  });

  tasks.push({
    name: 'Map API endpoints',
    searchTerms: ['router', 'endpoint', 'api'],
    category: 'trace-flow',
  });

  tasks.push({
    name: 'Find test infrastructure',
    searchTerms: ['test', 'spec', 'mock', 'fixture'],
    category: 'find-config',
  });

  return tasks;
}

// ============================================================================
// Main
// ============================================================================

function main() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  CODEMAP INDEX TOKEN SAVINGS BENCHMARK`);
  console.log(`${'='.repeat(70)}\n`);
  console.log(`Target: ${TARGET_REPO}\n`);

  // Scan original repo
  console.log(`Scanning repository...`);
  const files = scanFiles(TARGET_REPO);
  const totalTokens = files.reduce((s, f) => s + f.tokens, 0);
  const totalLines = files.reduce((s, f) => s + f.lines, 0);
  console.log(`  ${files.length} code files, ${totalLines.toLocaleString()} lines, ${totalTokens.toLocaleString()} tokens\n`);

  // Generate codemaps in a temp copy
  const tmpDir = join('/tmp', `codemap-bench-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  // Copy only code files
  for (const f of files) {
    const dest = join(tmpDir, f.relPath);
    mkdirSync(join(tmpDir, f.relPath.split('/').slice(0, -1).join('/')), { recursive: true });
    writeFileSync(dest, f.content);
  }

  console.log(`Generating codemaps...`);
  generateCodemaps(tmpDir);

  // Measure codemap size
  const codemapDir = join(tmpDir, 'docs', 'CODEMAPS');
  let totalCodemapTokens = 0;
  if (existsSync(codemapDir)) {
    for (const f of readdirSync(codemapDir)) {
      if (f.endsWith('.md')) {
        totalCodemapTokens += tokens(readFileSync(join(codemapDir, f), 'utf-8'));
      }
    }
  }
  console.log(`  Codemap index total: ${totalCodemapTokens.toLocaleString()} tokens\n`);

  // Run search tasks
  const tasks = generateTasks(files);
  const results: TaskResult[] = [];

  console.log(`Running ${tasks.length} search tasks...\n`);

  for (const task of tasks) {
    const baseline = searchBaseline(files, task);
    const withCodemap = searchWithCodemap(files, task, codemapDir);
    const saved = baseline.tokensRead - withCodemap.tokensRead;
    const pctSaved = baseline.tokensRead > 0 ? (saved / baseline.tokensRead) * 100 : 0;
    results.push({ task, baseline, withCodemap, saved, pctSaved });

    const icon = saved > 0 ? 'SAVED' : saved < 0 ? 'OVER ' : 'EVEN ';
    const delta = saved > 0
      ? `saved ${saved.toLocaleString()} tokens (${pctSaved.toFixed(0)}%)`
      : saved < 0
        ? `overhead +${Math.abs(saved).toLocaleString()} tokens`
        : 'no change';

    console.log(`  [${icon}] ${task.name}`);
    console.log(`          Blind: ${baseline.tokensRead.toLocaleString()} tok, ${baseline.filesRead} files | Codemap: ${withCodemap.tokensRead.toLocaleString()} tok, ${withCodemap.filesRead} files (${withCodemap.codemapTokens} codemap tok)`);
    console.log(`          ${delta}`);
    console.log();
  }

  // Summary
  const totalBaseline = results.reduce((s, r) => s + r.baseline.tokensRead, 0);
  const totalWithCodemap = results.reduce((s, r) => s + r.withCodemap.tokensRead, 0);
  const totalSaved = totalBaseline - totalWithCodemap;
  const avgPct = results.reduce((s, r) => s + r.pctSaved, 0) / results.length;
  const avgFilesBaseline = results.reduce((s, r) => s + r.baseline.filesRead, 0) / results.length;
  const avgFilesCodemap = results.reduce((s, r) => s + r.withCodemap.filesRead, 0) / results.length;
  const wins = results.filter(r => r.saved > 0).length;
  const losses = results.filter(r => r.saved < 0).length;

  console.log(`${'='.repeat(70)}`);
  console.log(`  SUMMARY`);
  console.log(`${'='.repeat(70)}\n`);
  console.log(`  Repository: ${files.length} files, ${totalLines.toLocaleString()} lines, ${totalTokens.toLocaleString()} tokens`);
  console.log(`  Codemap index size: ${totalCodemapTokens.toLocaleString()} tokens (${((totalCodemapTokens / totalTokens) * 100).toFixed(1)}% of codebase)\n`);
  console.log(`  ${tasks.length} search tasks: ${wins} saved tokens, ${losses} added overhead\n`);
  console.log(`  Blind total:   ${totalBaseline.toLocaleString()} tokens across all tasks`);
  console.log(`  Codemap total: ${totalWithCodemap.toLocaleString()} tokens across all tasks`);
  console.log(`  Net:           ${totalSaved > 0 ? 'SAVED' : 'OVERHEAD'} ${Math.abs(totalSaved).toLocaleString()} tokens (${avgPct.toFixed(1)}% avg per task)`);
  console.log(`  Avg files/task: ${avgFilesBaseline.toFixed(1)} (blind) → ${avgFilesCodemap.toFixed(1)} (codemap)\n`);

  const costPerM = 3.0;
  const savePer1k = ((totalSaved / results.length) / 1_000_000) * costPerM * 1000;
  console.log(`  Cost impact ($${costPerM}/M tokens): ${savePer1k >= 0 ? 'saves' : 'costs'} $${Math.abs(savePer1k).toFixed(2)} per 1000 searches`);

  console.log(`\n${'='.repeat(70)}\n`);

  // Cleanup
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
}

main();
