/*
 * Path: /Users/ghost/Desktop/codemap/codemap-organizer/test/utils.ts
 * Module: test/utils
 * Purpose: Test utility functions for token counting, timing, and file operations
 * Dependencies: fs, path, child_process
 * Related: ./benchmark.ts, ./spec.ts
 * Keywords: utils, token-count, timing, file-operations, testing
 * Last Updated: 2026-03-24
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Token Counter Utilities
 */

/**
 * Approximates token count for a given text.
 * Uses the rough heuristic: characters / 4
 * @param text - The text to count tokens for
 * @returns Approximate token count
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimates token count for a file by reading its contents.
 * @param filePath - Absolute path to the file
 * @returns Promise resolving to estimated token count
 */
export async function estimateFileTokens(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return countTokens(content);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`File not found: ${filePath}`);
      return 0;
    }
    throw error;
  }
}

/**
 * Counts total tokens across multiple files.
 * @param files - Array of absolute file paths
 * @returns Promise resolving to total token count
 */
export async function countContextTokens(files: string[]): Promise<number> {
  const tokenCounts = await Promise.all(
    files.map(file => estimateFileTokens(file))
  );
  return tokenCounts.reduce((sum, count) => sum + count, 0);
}

/**
 * Timer Utilities
 */

/**
 * Creates a timer that returns elapsed milliseconds when called.
 * @returns Function that returns elapsed time in milliseconds
 */
export function startTimer(): () => number {
  const startTime = Date.now();
  return () => Date.now() - startTime;
}

/**
 * Measures the duration of an async operation.
 * @param fn - Async function to measure
 * @returns Promise resolving to result and duration in milliseconds
 */
export async function measureAsync<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const endTimer = startTimer();
  const result = await fn();
  const duration = endTimer();
  return { result, duration };
}

/**
 * Accuracy Tracking Utilities
 */

/**
 * Result of accuracy calculation
 */
export interface AccuracyResult {
  correct: number;
  total: number;
  score: number;
}

/**
 * Calculates accuracy between expected and found items.
 * @param expected - Array of expected items
 * @param found - Array of found items
 * @returns Accuracy result with correct count, total count, and score (0-1)
 */
export function calculateAccuracy(
  expected: string[],
  found: string[]
): AccuracyResult {
  const expectedSet = new Set(expected);
  const correct = found.filter(item => expectedSet.has(item)).length;
  const total = expected.length;
  const score = total > 0 ? correct / total : 0;

  return { correct, total, score };
}

/**
 * Validates that the actual file list matches expected file list.
 * @param expected - Array of expected file paths
 * @param actual - Array of actual file paths found
 * @returns True if all expected files are present in actual
 */
export function validateFileList(
  expected: string[],
  actual: string[]
): boolean {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);

  // Check all expected files are present
  for (const file of expected) {
    if (!actualSet.has(file)) {
      return false;
    }
  }

  return true;
}

/**
 * File Operation Utilities
 */

/**
 * Finds files matching a glob pattern in a directory.
 * @param dir - Directory to search in
 * @param pattern - Glob pattern (e.g. "*.ts" or similar)
 * @returns Promise resolving to array of absolute file paths
 */
export async function findFiles(
  dir: string,
  pattern: string
): Promise<string[]> {
  try {
    // Use find with -name for simple patterns, or rely on shell glob expansion
    const { stdout } = await execAsync(
      `find "${dir}" -type f -name "${pattern}"`,
      { maxBuffer: 10 * 1024 * 1024 } // 10MB buffer for large results
    );

    if (!stdout.trim()) {
      return [];
    }

    return stdout
      .trim()
      .split('\n')
      .map(filePath => filePath.trim())
      .filter(Boolean);
  } catch (error) {
    // find returns exit code 1 when no files found - treat as empty result
    if ((error as any).code === 1) {
      return [];
    }
    throw error;
  }
}

/**
 * Counts lines matching a pattern in a file.
 * @param filePath - Absolute path to the file
 * @param pattern - Regex pattern to search for
 * @returns Promise resolving to count of matching lines
 */
export async function countMatchingLines(
  filePath: string,
  pattern: string
): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `grep -c "${pattern}" "${filePath}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );

    return parseInt(stdout.trim(), 10) || 0;
  } catch (error) {
    // grep returns exit code 1 when no matches - treat as 0
    if ((error as any).code === 1) {
      return 0;
    }
    throw error;
  }
}

/**
 * Safely reads a file, returning null if it doesn't exist.
 * @param filePath - Absolute path to the file
 * @returns Promise resolving to file content or null
 */
export async function readFileSafely(
  filePath: string
): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Claude Simulation Helpers
 */

/**
 * Simulates Claude reading a full file (for baseline measurement).
 * @param filePath - Absolute path to the file
 * @returns Promise resolving to token count and content
 */
export async function simulateClaudeFileRead(
  filePath: string
): Promise<{ tokens: number; content: string }> {
  const content = await fs.readFile(filePath, 'utf-8');
  const tokens = countTokens(content);
  return { tokens, content };
}

/**
 * Simulates Claude reading only file headers (for with-skill measurement).
 * Reads first 50 lines as a heuristic for header size.
 * @param filePath - Absolute path to the file
 * @returns Promise resolving to token count and header content
 */
export async function simulateClaudeHeaderRead(
  filePath: string
): Promise<{ tokens: number; header: string }> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  // Read first 50 lines as header (heuristic)
  const headerLines = lines.slice(0, 50);
  const header = headerLines.join('\n');
  const tokens = countTokens(header);

  return { tokens, header };
}

/**
 * Utility: Format milliseconds to human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "1.5s", "500ms")
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Utility: Format token count to human-readable string
 * @param tokens - Token count
 * @returns Formatted string (e.g., "1.5k", "500")
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

/**
 * Utility: Calculate percentage from score
 * @param score - Score between 0 and 1
 * @returns Percentage string (e.g., "85%")
 */
export function formatPercentage(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Utility: Check if a path is a file
 * @param filePath - Absolute path to check
 * @returns Promise resolving to true if path is a file
 */
export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Utility: Check if a path is a directory
 * @param dirPath - Absolute path to check
 * @returns Promise resolving to true if path is a directory
 */
export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Utility: Get relative path from base directory
 * @param filePath - Absolute file path
 * @param basePath - Base directory path
 * @returns Relative path
 */
export function getRelativePath(filePath: string, basePath: string): string {
  return path.relative(basePath, filePath);
}

/**
 * Utility: Batch array processing with concurrency limit
 * @param array - Array to process
 * @param asyncFn - Async function to apply to each item
 * @param concurrency - Maximum concurrent operations
 * @returns Promise resolving to array of results
 */
export async function batchProcess<T, R>(
  array: T[],
  asyncFn: (item: T) => Promise<R>,
  concurrency: number = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < array.length; i += concurrency) {
    const batch = array.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(asyncFn));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Utility: Memoization cache for expensive operations
 */
export class MemoCache<K, V> {
  private cache = new Map<K, V>();

  /**
   * Get or compute value for key
   * @param key - Cache key
   * @param fn - Function to compute value if not cached
   * @returns Cached or computed value
   */
  async getOrCompute(key: K, fn: () => Promise<V>): Promise<V> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const value = await fn();
    this.cache.set(key, value);
    return value;
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   * @returns Number of cached items
   */
  size(): number {
    return this.cache.size;
  }
}
