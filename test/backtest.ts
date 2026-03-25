#!/usr/bin/env node

/*
 * Path: /Users/ghost/Desktop/codemap/codemap-organizer/test/backtest.ts
 * Module: test/backtest
 * Purpose: Backtest suite for codemap-organizer skill - tests against baseline
 * Dependencies: fs, path, child_process
 * Related: ../templates/header.ts, ../scripts/generate-codemaps.ts, ./spec.ts
 * Keywords: backtest, testing, verification, regression, validation
 * Last Updated: 2026-03-24
 */

/**
 * Backtest suite for codemap-organizer skill
 * Tests against baseline to verify correctness and catch regressions
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  diff?: string;
}

interface BacktestReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
}

const TEST_DIR = '/tmp/codemap-backtest';
const BASELINE_DIR = join(TEST_DIR, 'baseline');
const ACTUAL_DIR = join(TEST_DIR, 'actual');
const RESULTS_FILE = join(TEST_DIR, 'results.json');

// Test codebase structure
const TEST_FILES = {
  'src/index.ts': `export function main() {
  console.log('Hello, World!');
}

main();
`,
  'src/services/auth.ts': `import { hash } from 'crypto';

export interface User {
  id: string;
  name: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return hash('sha256', password);
}

export async function verifyUser(user: User, password: string): Promise<boolean> {
  const hashed = await hashPassword(password);
  return user.email.includes('@');
}
`,
  'src/components/Button.tsx': `import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};

export default Button;
`,
  'src/utils/helpers.ts': `export function formatDate(date: Date): string {
  return date.toISOString();
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
`,
  'src/config/index.ts': `export const config = {
  apiUrl: process.env.API_URL || 'http://localhost:3000',
  timeout: 5000,
  retries: 3,
};
`,
  'tests/auth.test.ts': `import { hashPassword, verifyUser } from '../src/services/auth';

describe('Auth', () => {
  it('should hash passwords', async () => {
    const hash = await hashPassword('test');
    expect(hash).toBeDefined();
  });

  it('should verify users', async () => {
    const user = { id: '1', name: 'Test', email: 'test@test.com' };
    const valid = await verifyUser(user, 'password');
    expect(valid).toBe(true);
  });
});
`,
};

// Expected headers for each file
const EXPECTED_HEADERS = {
  'src/index.ts': `/*
 * Path: ${ACTUAL_DIR}/src/index.ts
 * Module: index
 * Purpose: Main entry point
 * Dependencies:
 * Related:
 * Keywords: index, main
 * Last Updated:`,
  'src/services/auth.ts': `/*
 * Path: ${ACTUAL_DIR}/src/services/auth
 * Purpose: Authentication and user management
 * Dependencies: crypto
 * Related:
 * Keywords: services, auth, user, password, hash, verify
 * Last Updated:`,
  'src/components/Button.tsx': `/*
 * Path: ${ACTUAL_DIR}/src/components/Button.tsx
 * Module: components
 * Purpose: React button component
 * Dependencies: react
 * Related:
 * Keywords: components, button, react
 * Last Updated:`,
  'src/utils/helpers.ts': `/*
 * Path: ${ACTUAL_DIR}/src/utils/helpers.ts
 * Module: utils
 * Purpose: Utility helper functions
 * Dependencies:
 * Related:
 * Keywords: utils, helpers, format, capitalize
 * Last Updated:`,
  'src/config/index.ts': `/*
 * Path: ${ACTUAL_DIR}/src/config/index
 * Module: config
 * Purpose: Configuration settings
 * Dependencies:
 * Related:
 * Keywords: config, settings
 * Last Updated:`,
  'tests/auth.test.ts': `/*
 * Path: ${ACTUAL_DIR}/tests/auth.test.ts
 * Module: tests
 * Purpose: Authentication tests
 * Dependencies:
 * Related: ../src/services/auth.ts
 * Keywords: tests, auth
 * Last Updated:`,
};

function setupTestDirs(): void {
  // Clean and create test directories
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(BASELINE_DIR, { recursive: true });
  mkdirSync(ACTUAL_DIR, { recursive: true });
  mkdirSync(join(BASELINE_DIR, 'src'), { recursive: true });
  mkdirSync(join(ACTUAL_DIR, 'src'), { recursive: true });
  mkdirSync(join(ACTUAL_DIR, 'src/services'), { recursive: true });
  mkdirSync(join(ACTUAL_DIR, 'src/components'), { recursive: true });
  mkdirSync(join(ACTUAL_DIR, 'src/utils'), { recursive: true });
  mkdirSync(join(ACTUAL_DIR, 'src/config'), { recursive: true });
  mkdirSync(join(ACTUAL_DIR, 'tests'), { recursive: true });

  // Write test files
  for (const [filePath, content] of Object.entries(TEST_FILES)) {
    const basePath = join(BASELINE_DIR, filePath);
    const actualPath = join(ACTUAL_DIR, filePath);

    // Create directory if needed
    const dir = filePath.split('/').slice(0, -1).join('/');
    if (dir) {
      mkdirSync(join(BASELINE_DIR, dir), { recursive: true });
      mkdirSync(join(ACTUAL_DIR, dir), { recursive: true });
    }

    writeFileSync(basePath, content);
    writeFileSync(actualPath, content);
  }
}

function cleanup(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function runHeaderGenerator(): void {
  try {
    const skillPath = '~/.claude/skills/codemap-organizer';
    execSync(`npx tsx ${skillPath}/templates/header.ts ${ACTUAL_DIR}`, {
      stdio: 'inherit',
      cwd: ACTUAL_DIR,
    });
  } catch (error) {
    throw new Error(`Header generator failed: ${error}`);
  }
}

function runCodemapGenerator(): void {
  try {
    const skillPath = '~/.claude/skills/codemap-organizer';
    execSync(`npx tsx ${skillPath}/scripts/generate-codemaps.ts ${ACTUAL_DIR}`, {
      stdio: 'inherit',
      cwd: ACTUAL_DIR,
    });
  } catch (error) {
    throw new Error(`CODEMAP generator failed: ${error}`);
  }
}

function verifyHeaders(results: TestResult[]): void {
  console.log('\n📋 Verifying file headers...');

  for (const [filePath, expectedHeader] of Object.entries(EXPECTED_HEADERS)) {
    const startTime = Date.now();
    const fullPath = join(ACTUAL_DIR, filePath);

    try {
      if (!existsSync(fullPath)) {
        results.push({
          name: `Header: ${filePath}`,
          passed: false,
          duration: Date.now() - startTime,
          error: 'File does not exist',
        });
        continue;
      }

      const content = readFileSync(fullPath, 'utf-8');
      const hasHeader = content.includes(expectedHeader.split('\n')[0]); // Check first line

      if (!hasHeader) {
        results.push({
          name: `Header: ${filePath}`,
          passed: false,
          duration: Date.now() - startTime,
          error: 'Header not found',
          diff: `Expected: ${expectedHeader.split('\n')[0]}`,
        });
        console.log(`  ✗ ${filePath} - Missing header`);
      } else {
        // Verify all required fields
        const requiredFields = ['Path:', 'Module:', 'Purpose:', 'Dependencies:', 'Related:', 'Keywords:', 'Last Updated:'];
        const missingFields = requiredFields.filter(field => !content.includes(field));

        if (missingFields.length > 0) {
          results.push({
            name: `Header: ${filePath}`,
            passed: false,
            duration: Date.now() - startTime,
            error: `Missing fields: ${missingFields.join(', ')}`,
          });
          console.log(`  ✗ ${filePath} - Missing fields: ${missingFields.join(', ')}`);
        } else {
          results.push({
            name: `Header: ${filePath}`,
            passed: true,
            duration: Date.now() - startTime,
          });
          console.log(`  ✓ ${filePath}`);
        }
      }
    } catch (error) {
      results.push({
        name: `Header: ${filePath}`,
        passed: false,
        duration: Date.now() - startTime,
        error: String(error),
      });
      console.log(`  ✗ ${filePath} - Error: ${error}`);
    }
  }
}

function verifyCodemaps(results: TestResult[]): void {
  console.log('\n🗺️  Verifying CODEMAPS...');

  const expectedCodemaps = [
    'INDEX.md',
    'backend.md',
    'frontend.md',
  ];

  for (const codemap of expectedCodemaps) {
    const startTime = Date.now();
    const codemapPath = join(ACTUAL_DIR, 'docs/CODEMAPS', codemap);

    try {
      if (!existsSync(codemapPath)) {
        results.push({
          name: `CODEMAP: ${codemap}`,
          passed: false,
          duration: Date.now() - startTime,
          error: 'CODEMAP does not exist',
        });
        console.log(`  ✗ ${codemap} - Not found`);
        continue;
      }

      const content = readFileSync(codemapPath, 'utf-8');

      // Verify required sections (check for section headers with ##)
      const requiredSections = ['# ', 'Last Updated:', '## Entry Points', '## Architecture', '## Key Modules'];
      const missingSections = requiredSections.filter(section => !content.includes(section));

      if (missingSections.length > 0) {
        results.push({
          name: `CODEMAP: ${file}`,
          passed: false,
          duration: Date.now() - startTime,
          error: `Missing sections: ${missingSections.join(', ')}`,
        });
        console.log(`  ✗ ${file} - Missing sections: ${missingSections.join(', ')}`);
      } else {
        results.push({
          name: `CODEMAP: ${file}`,
          passed: true,
          duration: Date.now() - startTime,
        });
        console.log(`  ✓ ${file}`);
      }
    } catch (error) {
      results.push({
        name: `CODEMAP: ${codemap}`,
        passed: false,
        duration: Date.now() - startTime,
        error: String(error),
      });
      console.log(`  ✗ ${codemap} - Error: ${error}`);
    }
  }
}

function verifyNoDuplicateHeaders(results: TestResult[]): void {
  console.log('\n🔍 Checking for duplicate headers...');

  const startTime = Date.now();

  try {
    for (const filePath of Object.keys(TEST_FILES)) {
      const fullPath = join(ACTUAL_DIR, filePath);
      if (!existsSync(fullPath)) continue;

      const content = readFileSync(fullPath, 'utf-8');
      const headerCount = (content.match(/Path: \/.*\n/g) || []).length;

      if (headerCount > 1) {
        results.push({
          name: `Duplicate check: ${filePath}`,
          passed: false,
          duration: Date.now() - startTime,
          error: `Found ${headerCount} headers, expected 1`,
        });
        console.log(`  ✗ ${filePath} - ${headerCount} headers found`);
        return;
      }
    }

    results.push({
      name: 'Duplicate check',
      passed: true,
      duration: Date.now() - startTime,
    });
    console.log('  ✓ No duplicate headers found');
  } catch (error) {
    results.push({
      name: 'Duplicate check',
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    });
    console.log(`  ✗ Error: ${error}`);
  }
}

function compareWithBaseline(results: TestResult[]): void {
  console.log('\n📊 Comparing with baseline...');

  const startTime = Date.now();

  try {
    let allMatch = true;

    for (const filePath of Object.keys(TEST_FILES)) {
      const baselinePath = join(BASELINE_DIR, filePath);
      const actualPath = join(ACTUAL_DIR, filePath);

      if (!existsSync(actualPath)) {
        allMatch = false;
        console.log(`  ✗ ${filePath} - Actual file missing`);
        continue;
      }

      const baselineContent = readFileSync(baselinePath, 'utf-8');
      const actualContent = readFileSync(actualPath, 'utf-8');

      // Baseline should be subset of actual (actual has header)
      if (!actualContent.includes(baselineContent.trim())) {
        allMatch = false;
        console.log(`  ⚠️  ${filePath} - Content modified beyond header`);
      }
    }

    if (allMatch) {
      results.push({
        name: 'Baseline comparison',
        passed: true,
        duration: Date.now() - startTime,
      });
      console.log('  ✓ Baseline content preserved');
    } else {
      results.push({
        name: 'Baseline comparison',
        passed: false,
        duration: Date.now() - startTime,
        error: 'Content modified unexpectedly',
      });
    }
  } catch (error) {
    results.push({
      name: 'Baseline comparison',
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    });
    console.log(`  ✗ Error: ${error}`);
  }
}

function runBacktest(): BacktestReport {
  console.log('\n🧪 Running codemap-organizer backtest...\n');
  const startTime = Date.now();

  const results: TestResult[] = [];

  try {
    // Setup
    console.log('📁 Setting up test environment...');
    setupTestDirs();
    console.log('  ✓ Test directories created\n');

    // Run header generator
    console.log('📝 Running header generator...');
    runHeaderGenerator();
    console.log('  ✓ Headers added\n');

    // Run CODEMAP generator
    console.log('🗺️  Running CODEMAP generator...');
    runCodemapGenerator();
    console.log('  ✓ CODEMAPS generated\n');

    // Verify outputs
    verifyHeaders(results);
    verifyCodemaps(results);
    verifyNoDuplicateHeaders(results);
    compareWithBaseline(results);

  } catch (error) {
    console.error(`\n❌ Backtest failed: ${error}`);
    results.push({
      name: 'Backtest',
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    });
  }

  const duration = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  const report: BacktestReport = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed,
    failed,
    duration,
    results,
  };

  // Save report
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(RESULTS_FILE, JSON.stringify(report, null, 2));

  return report;
}

function printReport(report: BacktestReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 BACKTEST REPORT');
  console.log('='.repeat(60));
  console.log(`\nTimestamp: ${report.timestamp}`);
  console.log(`Duration: ${report.duration}ms`);
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(`✅ Passed: ${report.passed}`);
  console.log(`❌ Failed: ${report.failed}`);
  console.log(`Success Rate: ${((report.passed / report.totalTests) * 100).toFixed(1)}%\n`);

  if (report.failed > 0) {
    console.log('Failed Tests:');
    console.log('-'.repeat(60));
    for (const result of report.results.filter(r => !r.passed)) {
      console.log(`\n❌ ${result.name}`);
      console.log(`   Duration: ${result.duration}ms`);
      if (result.error) console.log(`   Error: ${result.error}`);
      if (result.diff) console.log(`   Diff: ${result.diff}`);
    }
    console.log('\n' + '-'.repeat(60));
  }

  console.log('\n' + '='.repeat(60));

  if (report.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED!\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED\n');
    console.log(`📁 Results saved to: ${RESULTS_FILE}`);
    console.log(`📁 Test files preserved in: ${ACTUAL_DIR}`);
  }
  console.log('='.repeat(60) + '\n');
}

// Main execution
if (require.main === module) {
  const report = runBacktest();
  printReport(report);

  // Cleanup on success
  if (report.failed === 0) {
    console.log('🧹 Cleaning up test artifacts...');
    cleanup();
    console.log('  ✓ Cleanup complete\n');
  } else {
    console.log('📁 Test artifacts preserved for inspection\n');
  }

  process.exit(report.failed > 0 ? 1 : 0);
}

export { runBacktest, printReport };
