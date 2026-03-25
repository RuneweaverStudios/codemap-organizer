/*
 * Path: /Users/ghost/Desktop/codemap/codemap-organizer/test/run-benchmark.ts
 * Module: test/run-benchmark
 * Purpose: Main orchestration script for A/B benchmark of codemap-organizer skill
 * Dependencies: ./spec.ts, ./baseline-runner.ts, ./with-skill-runner.ts, ./comparison.ts
 * Related: ./benchmark.ts
 * Keywords: benchmark, orchestration, a-b-test, main
 * Last Updated: 2026-03-24
 */

import { resolve } from 'path';
import { writeFile } from 'fs/promises';
import { getBenchmarkTasks, BenchmarkTask } from './spec.js';
import { runBaselineBenchmark } from './baseline-runner.js';
import { runWithSkillBenchmark } from './with-skill-runner.js';
import {
  generateComparison,
  printComparisonReport,
  saveComparisonReport,
  generateMarkdownReport,
} from './comparison.js';

/**
 * Main benchmark orchestration
 *
 * Flow:
 * 1. Run baseline tests (no headers)
 * 2. Check if headers installed
 * 3. Run with-skill tests (with headers)
 * 4. Generate comparison report
 */
export async function runBenchmark(
  repoDir: string,
  options: {
    skipBaseline?: boolean;
    skipWithSkill?: boolean;
    tasks?: BenchmarkTask[];
    outputDir?: string;
  } = {}
): Promise<void> {
  const { skipBaseline = false, skipWithSkill = false, outputDir } = options;

  console.log('\n' + '='.repeat(80));
  console.log('🧪 A/B BENCHMARK: codemap-organizer skill');
  console.log('='.repeat(80));
  console.log(`\nTarget Repository: ${repoDir}`);

  // Get benchmark tasks
  const tasks = options.tasks || getBenchmarkTasks();
  console.log(`Benchmark Tasks: ${tasks.length}`);

  // Create task name lookup
  const taskNames: Record<string, string> = {};
  for (const task of tasks) {
    taskNames[task.id] = task.name;
  }

  let baselineResults: any = null;
  let withSkillResults: any = null;

  // Phase 1: Baseline (no headers)
  if (!skipBaseline) {
    console.log('\n' + '─'.repeat(80));
    console.log('📊 PHASE 1: BASELINE (without codemap headers)');
    console.log('─'.repeat(80));

    baselineResults = await runBaselineBenchmark(repoDir, tasks);

    console.log('\n✅ Baseline Complete:');
    console.log(`   Total Duration: ${baselineResults.summary.totalDuration}ms`);
    console.log(`   Total Tokens: ${baselineResults.summary.totalTokens.toLocaleString()}`);
    console.log(`   Avg Accuracy: ${(baselineResults.summary.avgAccuracy * 100).toFixed(1)}%`);
  }

  // Phase 2: With Skill (with headers)
  if (!skipWithSkill) {
    console.log('\n' + '─'.repeat(80));
    console.log('📊 PHASE 2: WITH SKILL (with codemap headers)');
    console.log('─'.repeat(80));

    withSkillResults = await runWithSkillBenchmark(repoDir, tasks);

    console.log('\n✅ With Skill Complete:');
    console.log(`   Total Duration: ${withSkillResults.summary.totalDuration}ms`);
    console.log(`   Total Tokens: ${withSkillResults.summary.totalTokens.toLocaleString()}`);
    console.log(`   Avg Accuracy: ${(withSkillResults.summary.avgAccuracy * 100).toFixed(1)}%`);
  }

  // Phase 3: Comparison
  if (baselineResults && withSkillResults) {
    console.log('\n' + '─'.repeat(80));
    console.log('📊 PHASE 3: COMPARISON & ANALYSIS');
    console.log('─'.repeat(80));

    const comparison = generateComparison(
      repoDir,
      baselineResults.results,
      withSkillResults.results,
      taskNames
    );

    // Print report to console
    printComparisonReport(comparison);

    // Save reports
    if (outputDir) {
      const jsonPath = resolve(outputDir, 'benchmark-results.json');
      const mdPath = resolve(outputDir, 'benchmark-results.md');

      await saveComparisonReport(comparison, jsonPath);
      await writeFile(mdPath, generateMarkdownReport(comparison), 'utf-8');

      console.log(`📁 Reports saved:`);
      console.log(`   JSON: ${jsonPath}`);
      console.log(`   Markdown: ${mdPath}\n`);
    } else {
      // Save to repo directory
      const jsonPath = resolve(repoDir, '.benchmark-results.json');
      const mdPath = resolve(repoDir, '.benchmark-results.md');

      await saveComparisonReport(comparison, jsonPath);
      await writeFile(mdPath, generateMarkdownReport(comparison), 'utf-8');

      console.log(`📁 Reports saved:`);
      console.log(`   JSON: ${jsonPath}`);
      console.log(`   Markdown: ${mdPath}\n`);
    }
  } else {
    console.log('\n⚠️  Skipping comparison (missing baseline or with-skill results)');
  }

  console.log('='.repeat(80) + '\n');
}

/**
 * CLI entry point
 */
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const repoDir = process.argv[2] || process.cwd();

  console.log(`\nUsage: node run-benchmark.ts <repository-path>`);
  console.log(`Running benchmark on: ${repoDir}\n`);

  runBenchmark(resolve(repoDir))
    .then(() => {
      console.log('✅ Benchmark completed successfully\n');
      process.exit(0);
    })
    .catch(error => {
      console.error(`\n❌ Benchmark failed: ${error}`);
      process.exit(1);
    });
}
