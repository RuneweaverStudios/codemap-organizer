/*
 * Path: /Users/ghost/Desktop/codemap/codemap-organizer/test/comparison.ts
 * Module: test/comparison
 * Purpose: Generate A/B comparison reports from baseline and with-skill results
 * Dependencies: ./spec.ts
 * Related: ./baseline-runner.ts, ./with-skill-runner.ts
 * Keywords: comparison, reporting, a-b-test, analysis
 * Last Updated: 2026-03-24
 */

import { TaskResult } from './spec.js';

/**
 * A/B comparison result for a single task
 */
export interface TaskComparison {
  taskId: string;
  taskName: string;

  // Baseline metrics
  baselineDuration: number;
  baselineTokens: number;
  baselineAccuracy: number;
  baselineFilesRead: number;

  // With-skill metrics
  withSkillDuration: number;
  withSkillTokens: number;
  withSkillAccuracy: number;
  withSkillFilesRead: number;

  // Improvements
  durationImprovement: number; // percentage
  tokenReduction: number; // percentage
  accuracyChange: number; // percentage points
  filesReadReduction: number; // percentage

  // Absolute differences
  durationSaved: number; // ms
  tokensSaved: number;
  filesReadSaved: number;
}

/**
 * Overall benchmark comparison summary
 */
export interface BenchmarkComparison {
  timestamp: string;
  repository: string;

  // Overall metrics
  totalDurationImprovement: number;
  totalTokenReduction: number;
  totalAccuracyChange: number;

  // Baseline totals
  baselineTotalDuration: number;
  baselineTotalTokens: number;
  baselineAvgAccuracy: number;

  // With-skill totals
  withSkillTotalDuration: number;
  withSkillTotalTokens: number;
  withSkillAvgAccuracy: number;

  // Per-task comparisons
  taskComparisons: TaskComparison[];

  // Assessment
  tokenSavingsRating: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'MINIMAL';
  overallRating: string;
}

/**
 * Compares baseline and with-skill results for a single task
 */
export function compareTaskResults(
  taskId: string,
  taskName: string,
  baselineResult: TaskResult,
  withSkillResult: TaskResult
): TaskComparison {
  // Duration improvement (lower is better)
  const durationImprovement =
    baselineResult.duration > 0
      ? ((baselineResult.duration - withSkillResult.duration) / baselineResult.duration) * 100
      : 0;

  // Token reduction (lower is better)
  const tokenReduction =
    baselineResult.tokensTotal > 0
      ? ((baselineResult.tokensTotal - withSkillResult.tokensTotal) / baselineResult.tokensTotal) * 100
      : 0;

  // Accuracy change (higher is better)
  const accuracyChange = (withSkillResult.accuracy - baselineResult.accuracy) * 100;

  // Files read reduction (lower is better)
  const filesReadReduction =
    baselineResult.filesRead.length > 0
      ? ((baselineResult.filesRead.length - withSkillResult.filesRead.length) / baselineResult.filesRead.length) *
        100
      : 0;

  // Absolute differences
  const durationSaved = baselineResult.duration - withSkillResult.duration;
  const tokensSaved = baselineResult.tokensTotal - withSkillResult.tokensTotal;
  const filesReadSaved = baselineResult.filesRead.length - withSkillResult.filesRead.length;

  return {
    taskId,
    taskName,
    baselineDuration: baselineResult.duration,
    baselineTokens: baselineResult.tokensTotal,
    baselineAccuracy: baselineResult.accuracy,
    baselineFilesRead: baselineResult.filesRead.length,
    withSkillDuration: withSkillResult.duration,
    withSkillTokens: withSkillResult.tokensTotal,
    withSkillAccuracy: withSkillResult.accuracy,
    withSkillFilesRead: withSkillResult.filesRead.length,
    durationImprovement,
    tokenReduction,
    accuracyChange,
    filesReadReduction,
    durationSaved,
    tokensSaved,
    filesReadSaved,
  };
}

/**
 * Generates complete A/B comparison from baseline and with-skill results
 */
export function generateComparison(
  repoDir: string,
  baselineResults: TaskResult[],
  withSkillResults: TaskResult[],
  taskNames: Record<string, string>
): BenchmarkComparison {
  // Calculate baseline totals
  const baselineTotalDuration = baselineResults.reduce((sum, r) => sum + r.duration, 0);
  const baselineTotalTokens = baselineResults.reduce((sum, r) => sum + r.tokensTotal, 0);
  const baselineAvgAccuracy =
    baselineResults.reduce((sum, r) => sum + r.accuracy, 0) / baselineResults.length;

  // Calculate with-skill totals
  const withSkillTotalDuration = withSkillResults.reduce((sum, r) => sum + r.duration, 0);
  const withSkillTotalTokens = withSkillResults.reduce((sum, r) => sum + r.tokensTotal, 0);
  const withSkillAvgAccuracy =
    withSkillResults.reduce((sum, r) => sum + r.accuracy, 0) / withSkillResults.length;

  // Overall improvements
  const totalDurationImprovement =
    baselineTotalDuration > 0
      ? ((baselineTotalDuration - withSkillTotalDuration) / baselineTotalDuration) * 100
      : 0;

  const totalTokenReduction =
    baselineTotalTokens > 0
      ? ((baselineTotalTokens - withSkillTotalTokens) / baselineTotalTokens) * 100
      : 0;

  const totalAccuracyChange = (withSkillAvgAccuracy - baselineAvgAccuracy) * 100;

  // Per-task comparisons
  const taskComparisons: TaskComparison[] = baselineResults.map((baseline, index) => {
    const withSkill = withSkillResults[index];
    const taskName = taskNames[baseline.taskId] || `Task ${baseline.taskId}`;
    return compareTaskResults(baseline.taskId, taskName, baseline, withSkill);
  });

  // Determine rating
  let tokenSavingsRating: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'MINIMAL';
  if (totalTokenReduction >= 60) {
    tokenSavingsRating = 'EXCELLENT';
  } else if (totalTokenReduction >= 40) {
    tokenSavingsRating = 'GOOD';
  } else if (totalTokenReduction >= 20) {
    tokenSavingsRating = 'MODERATE';
  } else {
    tokenSavingsRating = 'MINIMAL';
  }

  // Overall rating
  const overallRating = calculateOverallRating({
    tokenReduction: totalTokenReduction,
    durationImprovement: totalDurationImprovement,
    accuracyChange: totalAccuracyChange,
  });

  return {
    timestamp: new Date().toISOString(),
    repository: repoDir,
    totalDurationImprovement,
    totalTokenReduction,
    totalAccuracyChange,
    baselineTotalDuration,
    baselineTotalTokens,
    baselineAvgAccuracy,
    withSkillTotalDuration,
    withSkillTotalTokens,
    withSkillAvgAccuracy,
    taskComparisons,
    tokenSavingsRating,
    overallRating,
  };
}

/**
 * Calculate overall rating based on all metrics
 */
function calculateOverallRating(metrics: {
  tokenReduction: number;
  durationImprovement: number;
  accuracyChange: number;
}): string {
  const { tokenReduction, durationImprovement, accuracyChange } = metrics;

  // Score components
  const tokenScore = tokenReduction >= 50 ? 3 : tokenReduction >= 30 ? 2 : tokenReduction >= 10 ? 1 : 0;
  const durationScore = durationImprovement >= 30 ? 2 : durationImprovement >= 10 ? 1 : 0;
  const accuracyScore = accuracyChange >= 0 ? 1 : -1; // Penalty for accuracy loss

  const totalScore = tokenScore + durationScore + accuracyScore;

  if (totalScore >= 5) return '⭐⭐⭐⭐⭐ EXCELLENT';
  if (totalScore >= 4) return '⭐⭐⭐⭐ VERY GOOD';
  if (totalScore >= 3) return '⭐⭐⭐ GOOD';
  if (totalScore >= 2) return '⭐⭐ MODERATE';
  if (totalScore >= 1) return '⭐ MINIMAL IMPROVEMENT';
  return '❌ NO IMPROVEMENT';
}

/**
 * Prints comparison report to console
 */
export function printComparisonReport(comparison: BenchmarkComparison): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 A/B BENCHMARK REPORT: codemap-organizer skill');
  console.log('='.repeat(80));
  console.log(`\nRepository: ${comparison.repository}`);
  console.log(`Timestamp: ${comparison.timestamp}`);
  console.log(`Tasks: ${comparison.taskComparisons.length}\n`);

  // Overall summary
  console.log('━'.repeat(80));
  console.log('📈 OVERALL SUMMARY');
  console.log('━'.repeat(80));
  console.log(`\n⚡ Speed Improvement:     ${comparison.totalDurationImprovement.toFixed(1)}%`);
  console.log(
    `   ${comparison.baselineTotalDuration}ms → ${comparison.withSkillTotalDuration}ms (${comparison.baselineTotalDuration - comparison.withSkillTotalDuration}ms saved)`
  );

  console.log(`\n📉 Token Reduction:       ${comparison.totalTokenReduction.toFixed(1)}%`);
  console.log(
    `   ${comparison.baselineTotalTokens.toLocaleString()} → ${comparison.withSkillTotalTokens.toLocaleString()} (${(comparison.baselineTotalTokens - comparison.withSkillTotalTokens).toLocaleString()} tokens saved)`
  );

  console.log(`\n🎯 Accuracy Change:       ${comparison.totalAccuracyChange > 0 ? '+' : ''}${comparison.totalAccuracyChange.toFixed(1)}%`);
  console.log(
    `   ${(comparison.baselineAvgAccuracy * 100).toFixed(1)}% → ${(comparison.withSkillAvgAccuracy * 100).toFixed(1)}%`
  );

  console.log(`\n🏆 Overall Rating:        ${comparison.overallRating}`);
  console.log(`\n${getTokenSavingsMessage(comparison.tokenSavingsRating, comparison.totalTokenReduction)}`);

  // Per-task breakdown
  console.log('\n' + '━'.repeat(80));
  console.log('📋 PER-TASK BREAKDOWN');
  console.log('━'.repeat(80));

  for (const comp of comparison.taskComparisons) {
    console.log(`\n${comp.taskName}`);
    console.log('  ' + '─'.repeat(78));

    // Metrics table
    console.log('  Metric          │ Baseline        │ With Skill       │ Improvement');
    console.log('  ' + '─'.repeat(78));

    console.log(
      `  Duration (ms)   │ ${comp.baselineDuration.toString().padStart(8)}       │ ${comp.withSkillDuration.toString().padStart(8)}       │ ${comp.durationImprovement.toFixed(1)}%`
    );

    console.log(
      `  Tokens          │ ${comp.baselineTokens.toString().padStart(8)}       │ ${comp.withSkillTokens.toString().padStart(8)}       │ ${comp.tokenReduction.toFixed(1)}%`
    );

    console.log(
      `  Files Read      │ ${comp.baselineFilesRead.toString().padStart(8)}       │ ${comp.withSkillFilesRead.toString().padStart(8)}       │ ${comp.filesReadReduction.toFixed(1)}%`
    );

    console.log(
      `  Accuracy (%)    │ ${(comp.baselineAccuracy * 100).toFixed(1).padStart(8)}       │ ${(comp.withSkillAccuracy * 100).toFixed(1).padStart(8)}       │ ${comp.accuracyChange > 0 ? '+' : ''}${comp.accuracyChange.toFixed(1)}pp`
    );
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Get token savings message based on rating
 */
function getTokenSavingsMessage(rating: string, reduction: number): string {
  switch (rating) {
    case 'EXCELLENT':
      return `🎉 EXCELLENT token savings! The skill dramatically reduces context usage.\n   This represents significant cost savings and faster response times.`;
    case 'GOOD':
      return `✅ GOOD token savings. The skill effectively reduces context usage.\n   Noticeable improvement in efficiency and cost.`;
    case 'MODERATE':
      return `⚠️  MODERATE token savings. The skill provides some benefit.\n   Consider tuning header extraction or task design.`;
    case 'MINIMAL':
      return `⚠️  MINIMAL token savings detected.\n   The skill may not be providing significant value for this repository.\n   Consider: verifying headers are installed, adjusting task patterns, or reviewing implementation.`;
    default:
      return '';
  }
}

/**
 * Save comparison report to JSON file
 */
export async function saveComparisonReport(
  comparison: BenchmarkComparison,
  outputPath: string
): Promise<void> {
  const { writeFile } = await import('fs/promises');
  await writeFile(outputPath, JSON.stringify(comparison, null, 2), 'utf-8');
}

/**
 * Generate markdown report from comparison
 */
export function generateMarkdownReport(comparison: BenchmarkComparison): string {
  const lines: string[] = [];

  lines.push('# A/B Benchmark Report: codemap-organizer skill\n');
  lines.push(`**Repository:** ${comparison.repository}\n`);
  lines.push(`**Timestamp:** ${comparison.timestamp}\n`);
  lines.push(`**Tasks:** ${comparison.taskComparisons.length}\n`);

  lines.push('## Overall Summary\n');
  lines.push('| Metric | Baseline | With Skill | Improvement |');
  lines.push('|--------|----------|------------|-------------|');
  lines.push(
    `| **Speed** | ${comparison.baselineTotalDuration}ms | ${comparison.withSkillTotalDuration}ms | **${comparison.totalDurationImprovement.toFixed(1)}%** |`
  );
  lines.push(
    `| **Tokens** | ${comparison.baselineTotalTokens.toLocaleString()} | ${comparison.withSkillTotalTokens.toLocaleString()} | **${comparison.totalTokenReduction.toFixed(1)}%** |`
  );
  lines.push(
    `| **Accuracy** | ${(comparison.baselineAvgAccuracy * 100).toFixed(1)}% | ${(comparison.withSkillAvgAccuracy * 100).toFixed(1)}% | ${comparison.totalAccuracyChange > 0 ? '+' : ''}${comparison.totalAccuracyChange.toFixed(1)}pp |`
  );

  lines.push(`\n### Overall Rating: ${comparison.overallRating}\n`);

  lines.push('## Per-Task Results\n\n');

  for (const comp of comparison.taskComparisons) {
    lines.push(`### ${comp.taskName}\n\n`);
    lines.push('| Metric | Baseline | With Skill | Change |');
    lines.push('|--------|----------|------------|--------|');
    lines.push(`| Duration | ${comp.baselineDuration}ms | ${comp.withSkillDuration}ms | ${comp.durationImprovement.toFixed(1)}% |`);
    lines.push(`| Tokens | ${comp.baselineTokens.toLocaleString()} | ${comp.withSkillTokens.toLocaleString()} | ${comp.tokenReduction.toFixed(1)}% |`);
    lines.push(`| Files Read | ${comp.baselineFilesRead} | ${comp.withSkillFilesRead} | ${comp.filesReadReduction.toFixed(1)}% |`);
    lines.push(`| Accuracy | ${(comp.baselineAccuracy * 100).toFixed(1)}% | ${(comp.withSkillAccuracy * 100).toFixed(1)}% | ${comp.accuracyChange > 0 ? '+' : ''}${comp.accuracyChange.toFixed(1)}pp |`);
    lines.push('\n');
  }

  return lines.join('');
}
