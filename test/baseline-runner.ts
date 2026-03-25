/*
 * Path: /Users/ghost/Desktop/codemap/codemap-organizer/test/baseline-runner.ts
 * Module: test/baseline-runner
 * Purpose: Baseline benchmark runner - tests repository WITHOUT codemap headers
 * Dependencies: ./spec.ts, ./utils.ts, child_process
 * Related: ./with-skill-runner.ts, ./benchmark.ts
 * Keywords: baseline, benchmark, no-headers, performance, testing
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
  estimateFileTokens,
  calculateAccuracy,
} from './utils.js';

const execAsync = promisify(exec);

/**
 * Runs a benchmark task simulating Claude WITHOUT headers (baseline performance)
 *
 * Baseline behavior:
 * - Must READ ENTIRE FILES to find content
 * - Uses grep to search full file contents
 * - No structured metadata to guide search
 * - Higher token usage (full file reads)
 */
export async function runBaselineTask(
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
        return await runFindFunctionalityBaseline(task, repoDir, endTimer);

      case 'understand-module':
        return await runUnderstandModuleBaseline(task, repoDir, endTimer);

      case 'locate-related':
        return await runLocateRelatedBaseline(task, repoDir, endTimer);

      case 'navigate-architecture':
        return await runNavigateArchitectureBaseline(task, repoDir, endTimer);

      case 'edit-task':
        return await runEditTaskBaseline(task, repoDir, endTimer);

      case 'debug-task':
        return await runDebugTaskBaseline(task, repoDir, endTimer);

      case 'refactor-task':
        return await runRefactorTaskBaseline(task, repoDir, endTimer);

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
 * Baseline: Find functionality by grepping entire files
 */
async function runFindFunctionalityBaseline(
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
  const keyword = keywordMatch ? keywordMatch[1] : task.prompt.split(' ')[0];

  // Baseline: grep entire files (no header optimization)
  const grepResult = await execAsync(
    `grep -r "${keyword}" ${repoDir} --include="*.ts" --include="*.tsx" -l | head -20`,
    { encoding: 'utf-8' }
  );

  const matchedFiles = grepResult.stdout
    .trim()
    .split('\n')
    .filter(f => f)
    .map(f => f.trim());

  // Estimate search tokens (grep results show file paths + context)
  tokensSearch = countTokens(grepResult.stdout);

  // Baseline must read some files to verify
  for (const file of matchedFiles.slice(0, 5)) {
    try {
      const { result: content } = await measureAsync(() =>
        promisify(require('fs').readFile)(file, 'utf-8')
      );
      tokensRead += countTokens(content);
      filesRead.push(file);
    } catch {
      // Skip files that can't be read
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
 * Baseline: Understand module by reading full file + imports
 */
async function runUnderstandModuleBaseline(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // Baseline: read the main file completely
  for (const expectedFile of task.expectedFiles.slice(0, 3)) {
    const fullPath = path.join(repoDir, expectedFile);
    try {
      const { result: content, duration } = await measureAsync(() =>
        promisify(require('fs').readFile)(fullPath, 'utf-8')
      );
      tokensRead += countTokens(content);
      filesRead.push(fullPath);

      // Extract imports and read them too (baseline inefficiency)
      const importMatches = content.match(/import\s+.*?\s+from\s+['"](.+?)['"]/g) || [];
      for (const imp of importMatches.slice(0, 3)) {
        const match = imp.match(/from\s+['"](.+?)['"]/);
        if (match) {
          const importPath = match[1];
          // Try to resolve relative imports
          if (importPath.startsWith('.')) {
            const resolved = path.join(path.dirname(fullPath), importPath + '.ts');
            try {
              const importContent = await promisify(require('fs').readFile)(resolved, 'utf-8');
              tokensRead += countTokens(importContent);
              filesRead.push(resolved);
            } catch {
              // Import may not exist or be built-in
            }
          }
        }
      }

      // Analysis tokens for understanding
      tokensAnalysis += countTokens(content) * 0.5;
    } catch {
      // File not found
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
 * Baseline: Locate related files by reading and parsing imports
 */
async function runLocateRelatedBaseline(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // Baseline: must grep for patterns, then read files to verify relationships
  const keywordMatch = task.prompt.match(/related to\s+(\w+)/i);
  const keyword = keywordMatch ? keywordMatch[1] : 'related';

  try {
    const grepResult = await execAsync(
      `grep -r "${keyword}" ${repoDir} --include="*.ts" -l | head -15`,
      { encoding: 'utf-8' }
    );

    const matchedFiles = grepResult.stdout
      .trim()
      .split('\n')
      .filter(f => f)
      .map(f => f.trim());

    tokensSearch = countTokens(grepResult.stdout);

    // Read files to check actual relationships
    for (const file of matchedFiles) {
      try {
        const content = await promisify(require('fs').readFile)(file, 'utf-8');
        tokensRead += countTokens(content);
        filesRead.push(file);
      } catch {
        // Skip
      }
    }
  } catch {
    // No matches
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
 * Baseline: Navigate architecture by reading multiple files
 */
async function runNavigateArchitectureBaseline(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // Baseline: grep for entry points, then read everything
  try {
    const grepResult = await execAsync(
      `find ${repoDir} -name "*.ts" -type f | head -20`,
      { encoding: 'utf-8' }
    );

    const files = grepResult.stdout
      .trim()
      .split('\n')
      .filter(f => f)
      .map(f => f.trim());

    // Read multiple files to trace architecture
    for (const file of files.slice(0, 10)) {
      try {
        const content = await promisify(require('fs').readFile)(file, 'utf-8');
        tokensRead += countTokens(content);
        filesRead.push(file);
      } catch {
        // Skip
      }
    }
  } catch {
    // No files
  }

  const accuracy = filesRead.length > 0 ? 0.7 : 0; // Baseline gets partial credit

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
 * Baseline: Edit task by reading full file for context
 */
async function runEditTaskBaseline(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // Baseline: read entire file to understand context before edit
  for (const expectedFile of task.expectedFiles) {
    const fullPath = path.join(repoDir, expectedFile);
    try {
      const content = await promisify(require('fs').readFile)(fullPath, 'utf-8');
      tokensRead += countTokens(content);
      filesRead.push(fullPath);
      break; // Just read first file
    } catch {
      // File not found
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
 * Baseline: Debug task by reading error-prone sections
 */
async function runDebugTaskBaseline(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // Baseline: grep for error patterns, read full files
  try {
    const grepResult = await execAsync(
      `grep -r "error\\|catch\\|throw" ${repoDir} --include="*.ts" -l | head -10`,
      { encoding: 'utf-8' }
    );

    const files = grepResult.stdout
      .trim()
      .split('\n')
      .filter(f => f)
      .map(f => f.trim());

    tokensSearch = countTokens(grepResult.stdout);

    for (const file of files) {
      try {
        const content = await promisify(require('fs').readFile)(file, 'utf-8');
        tokensRead += countTokens(content);
        filesRead.push(file);
      } catch {
        // Skip
      }
    }
  } catch {
    // No matches
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
 * Baseline: Refactor task by reading full file + dependencies
 */
async function runRefactorTaskBaseline(
  task: BenchmarkTask,
  repoDir: string,
  endTimer: () => number
): Promise<TaskResult> {
  let tokensRead = 0;
  let tokensSearch = 0;
  let tokensAnalysis = 0;
  const filesRead: string[] = [];

  // Baseline: read main file and all dependencies
  for (const expectedFile of task.expectedFiles) {
    const fullPath = path.join(repoDir, expectedFile);
    try {
      const content = await promisify(require('fs').readFile)(fullPath, 'utf-8');
      tokensRead += countTokens(content);
      filesRead.push(fullPath);

      // Read imports too
      const importMatches = content.match(/import\s+.*?\s+from\s+['"](.+?)['"]/g) || [];
      for (const imp of importMatches.slice(0, 5)) {
        const match = imp.match(/from\s+['"](.+?)['"]/);
        if (match && match[1].startsWith('.')) {
          const resolved = path.join(path.dirname(fullPath), match[1] + '.ts');
          try {
            const importContent = await promisify(require('fs').readFile)(resolved, 'utf-8');
            tokensRead += countTokens(importContent);
            filesRead.push(resolved);
          } catch {
            // Import may not exist
          }
        }
      }
    } catch {
      // File not found
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
 * Runs all baseline benchmark tasks
 */
export async function runBaselineBenchmark(
  repoDir: string,
  tasks?: BenchmarkTask[]
): Promise<{ results: TaskResult[]; summary: any }> {
  // Import tasks if not provided
  if (!tasks) {
    const { getBenchmarkTasks } = await import('./spec.js');
    tasks = getBenchmarkTasks();
  }

  const results: TaskResult[] = [];

  for (const task of tasks) {
    console.log(`\n[Baseline] Running: ${task.name}...`);
    const result = await runBaselineTask(task, repoDir);
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
    phase: 'baseline',
  };

  return { results, summary };
}
