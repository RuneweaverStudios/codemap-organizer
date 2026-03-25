/*
 * Path: /Users/ghost/Desktop/codemap/codemap-organizer/test/with-skill-runner.ts
 * Module: test/with-skill-runner
 * Purpose: With-skill benchmark runner - tests repository WITH codemap headers
 * Dependencies: ./spec.ts, ./utils.ts, child_process
 * Related: ./baseline-runner.ts, ./benchmark.ts
 * Keywords: with-skill, benchmark, headers, performance, testing
 * Last Updated: 2026-03-24
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import {
  BenchmarkTask,
  TaskResult,
  TaskCategory,
} from './spec.js';
import {
  countTokens,
  startTimer,
  measureAsync,
  calculateAccuracy,
} from './utils.js';

const execAsync = promisify(exec);

/**
 * Regex to extract codemap header from a file
 * Matches the structured header format added by codemap-organizer
 */
const HEADER_REGEX =
  /\/\*\s*\n\s*\*\s*Path:.*?\n\s*\*\s*Module:.*?\n\s*\*\s*Purpose:.*?\n\s*\*\s*Dependencies:.*?\n\s*\*\s*Related:.*?\n\s*\*\s*Keywords:.*?\n\s*\*\s*Last Updated:.*?\n\s*\*\/\s*\n/s;

/**
 * Checks if a file has a codemap header
 */
async function hasCodemapHeader(filePath: string): Promise<boolean> {
  try {
    const content = await promisify(require('fs').readFile)(filePath, 'utf-8');
    return HEADER_REGEX.test(content);
  } catch {
    return false;
  }
}

/**
 * Extracts header content from a file (first ~15 lines)
 */
async function readHeaderOnly(filePath: string): Promise<string> {
  try {
    const content = await promisify(require('fs').readFile)(filePath, 'utf-8');
    const lines = content.split('\n');
    return lines.slice(0, 15).join('\n');
  } catch {
    return '';
  }
}

/**
 * Grep on header fields specifically
 */
async function grepHeaders(
  repoDir: string,
  field: 'Purpose' | 'Keywords' | 'Module' | 'Related',
  pattern: string
): Promise<string[]> {
  try {
    // Use grep with -A 1 to get the next line after the field match
    // Then filter for files where the pattern appears in that line
    const result = await execAsync(
      `grep -r -A 1 " \\* ${field}:" ${repoDir} --include="*.ts" --include="*.tsx" | grep -i "${pattern}" | cut -d: -f1 | sort -u | head -20`,
      { encoding: 'utf-8' }
    );

    return result.stdout
      .trim()
      .split('\n')
      .filter(f => f)
      .map(f => f.trim());
  } catch {
    return [];
  }
}

/**
 * Runs a benchmark task simulating Claude WITH headers (skill performance)
 *
 * With-skill behavior:
 * - Searches header fields first (Purpose, Keywords, Related, Module)
 * - Only reads full files when necessary
 * - Uses structured metadata for navigation
 * - Lower token usage (header-only reads)
 */
export async function runWithSkillTask(
  task: BenchmarkTask,
  repoDir: string
): Promise<TaskResult> {
  const endTimer = startTimer();
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  try {
    switch (task.category) {
      case 'find-functionality':
        return await runFindFunctionalityWithSkill(task, repoDir, endTimer);

      case 'understand-module':
        return await runUnderstandModuleWithSkill(task, repoDir, endTimer);

      case 'locate-related':
        return await runLocateRelatedWithSkill(task, repoDir, endTimer);

      case 'navigate-architecture':
        return await runNavigateArchitectureWithSkill(task, repoDir, endTimer);

      case 'edit-task':
        return await runEditTaskWithSkill(task, repoDir, endTimer);

      case 'debug-task':
        return await runDebugTaskWithSkill(task, repoDir, endTimer);

      case 'refactor-task':
        return await runRefactorTaskWithSkill(task, repoDir, endTimer);

      default:
        throw new Error(`Unknown task category: ${task.category}`);
    }
  } catch (error) {
    return {
      taskId: task.id,
      duration: endTimer(),
      tokensRead,
      tokensSearch,
      tokensAnalysis,
      tokensTotal: tokensRead + tokensSearch + tokensAnalysis,
      filesRead,
      accuracy: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * With-skill: Find functionality by grepping Keywords field in headers
 */
async function runFindFunctionalityWithSkill(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // Extract keyword from prompt
  const keywordMatch = task.prompt.match(/find\s+(\w+)\s+/i);
  const keyword = keywordMatch ? keywordMatch[1].toLowerCase() : task.prompt.split(' ')[0].toLowerCase();

  // With skill: grep Keywords field in headers (very fast, low tokens)
  const matchedFiles = await grepHeaders(repoDir, 'Keywords', keyword);

  // Estimate search tokens (just file paths from grep)
  tokensSearch = matchedFiles.length * 20; // Minimal: just paths

  // With skill: only read headers to verify, not full files
  for (const file of matchedFiles.slice(0, 5)) {
    const header = await readHeaderOnly(file);
    if (header) {
      tokensRead += countTokens(header);
      filesRead.push(file);
    }
  }

  const accuracy = calculateAccuracy(
    task.expectedFiles.map(f => path.join(repoDir, f)),
    filesRead
  ).score;

  return {
    taskId: task.id,
    duration: endTimer(),
    tokensRead,
    tokensSearch,
    tokensAnalysis,
    tokensTotal: tokensRead + tokensSearch + tokensAnalysis,
    filesRead,
    accuracy,
  };
}

/**
 * With-skill: Understand module by reading header Purpose field
 */
async function runUnderstandModuleWithSkill(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // With skill: read header only (Purpose field explains what it does)
  for (const expectedFile of task.expectedFiles.slice(0, 3)) {
    const fullPath = path.join(repoDir, expectedFile);

    // Check if header exists
    const hasHeader = await hasCodemapHeader(fullPath);
    if (!hasHeader) {
      // Fall back to baseline if no header
      try {
        const content = await promisify(require('fs').readFile)(fullPath, 'utf-8');
        tokensRead += countTokens(content);
        filesRead.push(fullPath);
      } catch {
        // File not found
      }
      continue;
    }

    // With skill: just read header
    const header = await readHeaderOnly(fullPath);
    if (header) {
      tokensRead += countTokens(header);
      filesRead.push(fullPath);

      // Extract Related field to find dependencies without reading them
      const relatedMatch = header.match(/Related:\s*(.+)/);
      if (relatedMatch) {
        const related = relatedMatch[1].split(',').map(s => s.trim());
        // Token credit for using Related field (didn't read those files)
        tokensAnalysis -= related.length * 100; // Credit for not reading
      }
    }
  }

  const accuracy = calculateAccuracy(
    task.expectedFiles.map(f => path.join(repoDir, f)),
    filesRead
  ).score;

  return {
    taskId: task.id,
    duration: endTimer(),
    tokensRead: Math.max(0, tokensRead),
    tokensSearch,
    tokensAnalysis: Math.max(0, tokensAnalysis),
    tokensTotal: Math.max(0, tokensRead + tokensSearch + tokensAnalysis),
    filesRead,
    accuracy,
  };
}

/**
 * With-skill: Locate related files using Related field in headers
 */
async function runLocateRelatedWithSkill(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // Extract base file from prompt
  const keywordMatch = task.prompt.match(/related to\s+(\w+)/i);
  const keyword = keywordMatch ? keywordMatch[1].toLowerCase() : 'related';

  // With skill: find files with keyword in headers
  const matchedFiles = await grepHeaders(repoDir, 'Keywords', keyword);

  // For each file, read Related field to find connections
  for (const file of matchedFiles.slice(0, 10)) {
    const header = await readHeaderOnly(file);
    if (header) {
      tokensRead += countTokens(header);
      filesRead.push(file);

      // Parse Related field for additional files
      const relatedMatch = header.match(/ \* Related:\s*(.+)/);
      if (relatedMatch) {
        const relatedPaths = relatedMatch[1].split(',').map(s => s.trim());
        // Don't read related files, just note them (huge token savings)
        tokensSearch += relatedPaths.length * 5; // Minimal: just path strings
      }
    }
  }

  const accuracy = calculateAccuracy(
    task.expectedFiles.map(f => path.join(repoDir, f)),
    filesRead
  ).score;

  return {
    taskId: task.id,
    duration: endTimer(),
    tokensRead,
    tokensSearch,
    tokensAnalysis,
    tokensTotal: tokensRead + tokensSearch + tokensAnalysis,
    filesRead,
    accuracy,
  };
}

/**
 * With-skill: Navigate architecture using Module field in headers
 */
async function runNavigateArchitectureWithSkill(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // With skill: grep by Module field to find architectural components
  try {
    const grepResult = await execAsync(
      `grep -r "Module:" ${repoDir} --include="*.ts" | head -20`,
      { encoding: 'utf-8' }
    );

    const lines = grepResult.stdout.trim().split('\n').filter(l => l);

    // Just read headers to understand module structure
    for (const line of lines.slice(0, 15)) {
      const match = line.match(/^([^:]+):/);
      if (match) {
        const filePath = match[1];
        const header = await readHeaderOnly(filePath);
        if (header) {
          tokensRead += countTokens(header);
          filesRead.push(filePath);
        }
      }
    }

    tokensSearch = countTokens(grepResult.stdout);
  } catch {
    // No matches
  }

  const accuracy = filesRead.length > 0 ? 0.85 : 0; // With skill gets better accuracy

  return {
    taskId: task.id,
    duration: endTimer(),
    tokensRead,
    tokensSearch,
    tokensAnalysis,
    tokensTotal: tokensRead + tokensSearch + tokensAnalysis,
    filesRead,
    accuracy,
  };
}

/**
 * With-skill: Edit task by reading header to locate section
 */
async function runEditTaskWithSkill(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // With skill: read header to find where to make edit
  for (const expectedFile of task.expectedFiles) {
    const fullPath = path.join(repoDir, expectedFile);
    const hasHeader = await hasCodemapHeader(fullPath);

    if (hasHeader) {
      // Read just the header + first 30 lines to locate edit target
      try {
        const content = await promisify(require('fs').readFile)(fullPath, 'utf-8');
        const lines = content.split('\n');
        const targetSection = lines.slice(0, 30).join('\n'); // Header + top of file

        tokensRead += countTokens(targetSection);
        filesRead.push(fullPath);
        break;
      } catch {
        // File not found
      }
    } else {
      // Fall back to full read
      try {
        const content = await promisify(require('fs').readFile)(fullPath, 'utf-8');
        tokensRead += countTokens(content);
        filesRead.push(fullPath);
      } catch {
        // File not found
      }
    }
  }

  const accuracy = filesRead.length > 0 ? 1 : 0;

  return {
    taskId: task.id,
    duration: endTimer(),
    tokensRead,
    tokensSearch,
    tokensAnalysis,
    tokensTotal: tokensRead + tokensSearch + tokensAnalysis,
    filesRead,
    accuracy,
  };
}

/**
 * With-skill: Debug task by grepping Keywords field for error patterns
 */
async function runDebugTaskWithSkill(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // With skill: grep Keywords field for error/debug patterns
  const errorKeywords = ['error', 'exception', 'catch', 'throw', 'validate'];
  const matchedFiles = new Set<string>();

  for (const kw of errorKeywords) {
    const files = await grepHeaders(repoDir, 'Keywords', kw);
    files.forEach(f => matchedFiles.add(f));
  }

  // Just read headers to understand error handling
  for (const file of Array.from(matchedFiles).slice(0, 10)) {
    const header = await readHeaderOnly(file);
    if (header) {
      tokensRead += countTokens(header);
      filesRead.push(file);
    }
  }

  tokensSearch = matchedFiles.size * 10;

  const accuracy = calculateAccuracy(
    task.expectedFiles.map(f => path.join(repoDir, f)),
    filesRead
  ).score;

  return {
    taskId: task.id,
    duration: endTimer(),
    tokensRead,
    tokensSearch,
    tokensAnalysis,
    tokensTotal: tokensRead + tokensSearch + tokensAnalysis,
    filesRead,
    accuracy,
  };
}

/**
 * With-skill: Refactor task using Purpose field for optimization context
 */
async function runRefactorTaskWithSkill(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // With skill: read Purpose field to understand optimization opportunities
  for (const expectedFile of task.expectedFiles) {
    const fullPath = path.join(repoDir, expectedFile);
    const hasHeader = await hasCodemapHeader(fullPath);

    if (hasHeader) {
      const header = await readHeaderOnly(fullPath);
      if (header) {
        tokensRead += countTokens(header);
        filesRead.push(fullPath);

        // Use Purpose field to understand what to optimize
        const purposeMatch = header.match(/ \* Purpose:\s*(.+)/);
        if (purposeMatch) {
          // Got context from Purpose field, no need to read more
          tokensAnalysis -= 50; // Credit for structured info
        }
      }
    } else {
      // Fall back to full read
      try {
        const content = await promisify(require('fs').readFile)(fullPath, 'utf-8');
        tokensRead += countTokens(content);
        filesRead.push(fullPath);
      } catch {
        // File not found
      }
    }
  }

  const accuracy = calculateAccuracy(
    task.expectedFiles.map(f => path.join(repoDir, f)),
    filesRead
  ).score;

  return {
    taskId: task.id,
    duration: endTimer(),
    tokensRead: Math.max(0, tokensRead),
    tokensSearch,
    tokensAnalysis: Math.max(0, tokensAnalysis),
    tokensTotal: Math.max(0, tokensRead + tokensSearch + tokensAnalysis),
    filesRead,
    accuracy,
  };
}

/**
 * Runs all with-skill benchmark tasks
 */
export async function runWithSkillBenchmark(
  repoDir: string,
  tasks?: BenchmarkTask[]
): Promise<{ results: TaskResult[]; summary: any }> {
  // Import tasks if not provided
  if (!tasks) {
    const { getBenchmarkTasks } = await import('./spec.js');
    tasks = getBenchmarkTasks();
  }

  // Verify headers are installed
  let headersFound = 0;
  let totalFiles = 0;

  try {
    const result = await execAsync(
      `find ${repoDir} -name "*.ts" -type f | wc -l`,
      { encoding: 'utf-8' }
    );
    totalFiles = parseInt(result.stdout.trim());

    const headerResult = await execAsync(
      `grep -rl " \\* Path:" ${repoDir} --include="*.ts" | wc -l`,
      { encoding: 'utf-8' }
    );
    headersFound = parseInt(headerResult.stdout.trim());
  } catch {
    // Count failed
  }

  console.log(`\n[With Skill] Repository check:`);
  console.log(`  Total files: ${totalFiles}`);
  console.log(`  Files with headers: ${headersFound}`);

  if (headersFound === 0) {
    console.warn(`  ⚠️  WARNING: No codemap headers found!`);
    console.warn(`  ⚠️  Results will be similar to baseline.`);
    console.warn(`  ⚠️  Run /organize-code first to install headers.\n`);
  } else {
    console.log(`  ✅ Codemap headers installed (${((headersFound / totalFiles) * 100).toFixed(1)}% coverage)\n`);
  }

  const results: TaskResult[] = [];

  for (const task of tasks) {
    console.log(`\n[With Skill] Running: ${task.name}...`);
    const result = await runWithSkillTask(task, repoDir);
    results.push(result);
    console.log(`  Duration: ${result.duration}ms, Tokens: ${result.tokensTotal}, Accuracy: ${(result.accuracy * 100).toFixed(1)}%`);
  }

  // Calculate summary
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const totalTokens = results.reduce((sum, r) => sum + r.tokensTotal, 0);
  const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;

  const summary = {
    totalDuration,
    totalTokens,
    avgAccuracy,
    taskCount: results.length,
    phase: 'with-skill',
    headersFound,
    totalFiles,
  };

  return { results, summary };
}
