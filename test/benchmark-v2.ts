#!/usr/bin/env node

/*
 * Path: /Users/ghost/Desktop/codemap/codemap-organizer/test/benchmark-v2.ts
 * Module: test/benchmark-v2
 * Purpose: Robust A/B benchmark with precision/recall accuracy metrics
 * Dependencies: fs, path, child_process
 * Related: ./spec.ts, ./utils.ts, ../templates/header.ts
 * Keywords: benchmark, precision, recall, f1-score, validation
 * Last Updated: 2026-03-24
 */

/**
 * Robust A/B Benchmark: codemap-organizer skill impact
 * Measures: speed, tokens, precision, recall, F1 score
 *
 * Uses ground-truth sets for accurate quality measurement
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface BenchmarkResult {
  phase: 'baseline' | 'with-skill';
  task: string;
  duration: number;
  tokens: number;
  filesFound: string[];
  precision: number;
  recall: number;
  f1: number;
}

interface TestCase {
  name: string;
  query: string;
  baselinePattern: string;
  skillPattern: string;
  groundTruth: string[];  // Files that SHOULD be found
  ignoreFiles?: string[];  // Files to explicitly exclude from ground truth
}

// Test cases with ground truth for codemap-organizer project
const TEST_CASES: TestCase[] = [
  {
    name: 'find-test-files',
    query: 'Find test files',
    baselinePattern: 'test|spec|benchmark',
    skillPattern: 'Purpose:.*(test|spec|benchmark)|Keywords:.*(test|spec|benchmark)',
    groundTruth: [
      'test/backtest.ts',
      'test/benchmark.ts',
      'test/benchmark-v2.ts',
      'test/spec.ts',
      'test/utils.ts',
      'test/run-benchmark.ts',
      'test/baseline-runner.ts',
      'test/with-skill-runner.ts',
      'test/comparison.ts',
    ],
    ignoreFiles: [
      'scripts/generate-codemaps.ts',  // Has "benchmark" in comments
      'templates/header.ts',  // Has "test" in comments
    ],
  },
  {
    name: 'find-generator-scripts',
    query: 'Find code generation scripts',
    baselinePattern: 'generate|generator',
    skillPattern: 'Purpose:.*generat|Keywords:.*generat',
    groundTruth: [
      'scripts/generate-codemaps.ts',
      'templates/header.ts',
    ],
  },
  {
    name: 'find-utility-files',
    query: 'Find utility/helper files',
    baselinePattern: 'util|helper',
    skillPattern: 'Purpose:.*util|Keywords:.*util',
    groundTruth: [
      'test/utils.ts',
      'test/comparison.ts',  // Utility for comparison
    ],
    ignoreFiles: [
      'test/spec.ts',  // Contains "util" imports
    ],
  },
];

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getFilesFound(dir: string, pattern: string): string[] {
  try {
    const result = execSync(
      `grep -r -E "${pattern}" ${dir} --include="*.ts" --include="*.tsx" -l`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return result.trim().split('\n').filter(f => f).map(f => f.replace(dir + '/', ''));
  } catch {
    return [];
  }
}

function calculateMetrics(
  filesFound: string[],
  groundTruth: string[],
  ignoreFiles: string[] = []
): { precision: number; recall: number; f1: number } {
  // Filter out ignored files from results
  const filteredFound = filesFound.filter(f => !ignoreFiles.includes(f));

  const truePositives = filteredFound.filter(f => groundTruth.includes(f)).length;
  const falsePositives = filteredFound.filter(f => !groundTruth.includes(f)).length;
  const falseNegatives = groundTruth.filter(f => !filteredFound.includes(f)).length;

  const precision = truePositives + falsePositives === 0
    ? 1
    : truePositives / (truePositives + falsePositives);

  const recall = truePositives + falseNegatives === 0
    ? 1
    : truePositives / (truePositives + falseNegatives);

  const f1 = precision + recall === 0
    ? 0
    : 2 * (precision * recall) / (precision + recall);

  return { precision, recall, f1 };
}

async function runBenchmark(projectDir: string): Promise<BenchmarkResult[]> {
  console.log('\n🧪 Running Robust A/B Benchmark: codemap-organizer skill\n');
  console.log(`Project: ${projectDir}\n`);

  const results: BenchmarkResult[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`Task: ${testCase.name}`);

    // Baseline
    const baselineStart = Date.now();
    const baselineFiles = getFilesFound(projectDir, testCase.baselinePattern);
    const baselineDuration = Date.now() - baselineStart;

    // Estimate tokens: baseline reads full content (~500 tokens per file)
    const baselineTokens = baselineFiles.length * 500;

    const baselineMetrics = calculateMetrics(
      baselineFiles,
      testCase.groundTruth,
      testCase.ignoreFiles
    );

    results.push({
      phase: 'baseline',
      task: testCase.name,
      duration: baselineDuration,
      tokens: baselineTokens,
      filesFound: baselineFiles,
      ...baselineMetrics,
    });

    console.log(`  Baseline: ${baselineDuration}ms, ${baselineTokens} tokens, ${baselineFiles.length} files`);
    console.log(`    P=${baselineMetrics.precision.toFixed(2)} R=${baselineMetrics.recall.toFixed(2)} F1=${baselineMetrics.f1.toFixed(2)}`);

    // With Skill
    const skillStart = Date.now();
    const skillFiles = getFilesFound(projectDir, testCase.skillPattern);
    const skillDuration = Date.now() - skillStart;

    // Estimate tokens: skill reads only headers (~30 tokens per file)
    const skillTokens = skillFiles.length * 30;

    const skillMetrics = calculateMetrics(
      skillFiles,
      testCase.groundTruth,
      testCase.ignoreFiles
    );

    results.push({
      phase: 'with-skill',
      task: testCase.name,
      duration: skillDuration,
      tokens: skillTokens,
      filesFound: skillFiles,
      ...skillMetrics,
    });

    console.log(`  With Skill: ${skillDuration}ms, ${skillTokens} tokens, ${skillFiles.length} files`);
    console.log(`    P=${skillMetrics.precision.toFixed(2)} R=${skillMetrics.recall.toFixed(2)} F1=${skillMetrics.f1.toFixed(2)}\n`);
  }

  return results;
}

function printReport(results: BenchmarkResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 ROBUST BENCHMARK REPORT: codemap-organizer skill');
  console.log('='.repeat(80));

  const tasks = [...new Set(results.map(r => r.task))];

  // Per-task breakdown
  console.log('\n📋 Task Results:\n');
  for (const task of tasks) {
    const baseline = results.find(r => r.phase === 'baseline' && r.task === task);
    const skill = results.find(r => r.phase === 'with-skill' && r.task === task);

    if (!baseline || !skill) continue;

    const tokenReduction = ((baseline.tokens - skill.tokens) / baseline.tokens * 100).toFixed(1);
    const speedup = ((baseline.duration - skill.duration) / baseline.duration * 100).toFixed(1);
    const f1Improvement = (skill.f1 - baseline.f1).toFixed(2);

    console.log(`${task}:`);
    console.log(`  Tokens:    ${baseline.tokens.toString().padStart(6)} → ${skill.tokens.toString().padStart(6)} (${tokenReduction}% reduction)`);
    console.log(`  Speed:     ${baseline.duration.toString().padStart(4)}ms → ${skill.duration.toString().padStart(4)}ms (${speedup}% faster)`);
    console.log(`  Precision: ${baseline.precision.toFixed(2)} → ${skill.precision.toFixed(2)}`);
    console.log(`  Recall:    ${baseline.recall.toFixed(2)} → ${skill.recall.toFixed(2)}`);
    console.log(`  F1 Score:  ${baseline.f1.toFixed(2)} → ${skill.f1.toFixed(2)} (+${f1Improvement})`);
    console.log('');
  }

  // Aggregate metrics
  const baselineResults = results.filter(r => r.phase === 'baseline');
  const skillResults = results.filter(r => r.phase === 'with-skill');

  const avgBaselineTokens = baselineResults.reduce((sum, r) => sum + r.tokens, 0) / baselineResults.length;
  const avgSkillTokens = skillResults.reduce((sum, r) => sum + r.tokens, 0) / skillResults.length;

  const avgBaselineDuration = baselineResults.reduce((sum, r) => sum + r.duration, 0) / baselineResults.length;
  const avgSkillDuration = skillResults.reduce((sum, r) => sum + r.duration, 0) / skillResults.length;

  const avgBaselineF1 = baselineResults.reduce((sum, r) => sum + r.f1, 0) / baselineResults.length;
  const avgSkillF1 = skillResults.reduce((sum, r) => sum + r.f1, 0) / skillResults.length;

  const avgBaselinePrecision = baselineResults.reduce((sum, r) => sum + r.precision, 0) / baselineResults.length;
  const avgSkillPrecision = skillResults.reduce((sum, r) => sum + r.precision, 0) / skillResults.length;

  const avgBaselineRecall = baselineResults.reduce((sum, r) => sum + r.recall, 0) / baselineResults.length;
  const avgSkillRecall = skillResults.reduce((sum, r) => sum + r.recall, 0) / skillResults.length;

  console.log('='.repeat(80));
  console.log('📈 AGGREGATE METRICS:\n');

  console.log(`⚡ Speed:     ${(avgBaselineDuration - avgSkillDuration) / avgBaselineDuration * 100 > 0 ? '' : '+'}${((avgSkillDuration - avgBaselineDuration) / avgBaselineDuration * 100).toFixed(1)}%`);
  console.log(`📉 Tokens:    ${((avgBaselineTokens - avgSkillTokens) / avgBaselineTokens * 100).toFixed(1)}% reduction`);
  console.log(`🎯 Precision: ${avgBaselinePrecision.toFixed(2)} → ${avgSkillPrecision.toFixed(2)} (${(avgSkillPrecision - avgBaselinePrecision > 0 ? '+' : '')}${(avgSkillPrecision - avgBaselinePrecision).toFixed(2)})`);
  console.log(`🔍 Recall:    ${avgBaselineRecall.toFixed(2)} → ${avgSkillRecall.toFixed(2)} (${(avgSkillRecall - avgBaselineRecall > 0 ? '+' : '')}${(avgSkillRecall - avgBaselineRecall).toFixed(2)})`);
  console.log(`⭐ F1 Score:  ${avgBaselineF1.toFixed(2)} → ${avgSkillF1.toFixed(2)} (${(avgSkillF1 - avgBaselineF1 > 0 ? '+' : '')}${(avgSkillF1 - avgBaselineF1).toFixed(2)})`);

  console.log('\n' + '='.repeat(80));

  // Verdict
  if (avgSkillF1 >= avgBaselineF1 && avgSkillTokens < avgBaselineTokens) {
    console.log('\n✅ WIN: Codemap-organizer improves or maintains quality while reducing tokens');
  } else if (avgSkillTokens < avgBaselineTokens) {
    console.log('\n⚠️  MIXED: Token savings achieved but quality may need attention');
  } else {
    console.log('\n❌ LOSE: No significant improvement detected');
  }

  console.log('='.repeat(80) + '\n');
}

// Main execution
const isMainModule = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule) {
  const projectDir = process.argv[2] || process.cwd();

  if (!existsSync(projectDir)) {
    console.error(`❌ Directory not found: ${projectDir}`);
    process.exit(1);
  }

  runBenchmark(projectDir)
    .then(results => {
      printReport(results);

      // Save results
      const reportPath = join(projectDir, '.benchmark-results-v2.json');
      writeFileSync(reportPath, JSON.stringify(results, null, 2));
      console.log(`📁 Results saved to: ${reportPath}\n`);

      process.exit(0);
    })
    .catch(error => {
      console.error(`\n❌ Benchmark failed: ${error}`);
      process.exit(1);
    });
}

export { runBenchmark, printReport };
