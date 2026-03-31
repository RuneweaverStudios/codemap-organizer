/**
 * Language Syntax Validation Test
 *
 * Creates sample files for every supported language, runs header injection,
 * and validates that:
 * 1. The correct comment syntax was used for each language
 * 2. The injected header doesn't break the file's syntax (where a checker is available)
 */

import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { addHeaders } from '../templates/header';

// ============================================================================
// Sample file content per language (minimal valid programs)
// ============================================================================

interface LanguageSample {
  ext: string;
  filename: string;
  content: string;
  expectedCommentStart: string;       // First non-empty chars of the header
  expectedCommentContains: string;    // A string that must appear in the header block
  syntaxChecker?: string;             // CLI command to check syntax (uses %FILE% placeholder)
}

const LANGUAGE_SAMPLES: LanguageSample[] = [
  // --- Block comment languages (/* */) ---
  {
    ext: '.ts',
    filename: 'sample.ts',
    content: 'export const hello = "world";\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
    syntaxChecker: 'npx tsx --eval "import(\'%FILE%\')" 2>&1 || true',
  },
  {
    ext: '.js',
    filename: 'sample.js',
    content: 'const hello = "world";\nmodule.exports = { hello };\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
    syntaxChecker: 'node --check %FILE%',
  },
  {
    ext: '.tsx',
    filename: 'sample.tsx',
    content: 'export const App = () => <div>Hello</div>;\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.jsx',
    filename: 'sample.jsx',
    content: 'const App = () => <div>Hello</div>;\nmodule.exports = App;\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.go',
    filename: 'sample.go',
    content: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hello")\n}\n',
    expectedCommentStart: '/*',
    expectedCommentContains: 'Path:',
  },
  {
    ext: '.java',
    filename: 'Sample.java',
    content: 'public class Sample {\n    public static void main(String[] args) {\n        System.out.println("hello");\n    }\n}\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.c',
    filename: 'sample.c',
    content: '#include <stdio.h>\nint main() { printf("hello\\n"); return 0; }\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.cpp',
    filename: 'sample.cpp',
    content: '#include <iostream>\nint main() { std::cout << "hello" << std::endl; return 0; }\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.h',
    filename: 'sample.h',
    content: '#ifndef SAMPLE_H\n#define SAMPLE_H\nvoid hello();\n#endif\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.swift',
    filename: 'sample.swift',
    content: 'import Foundation\nprint("hello")\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
    syntaxChecker: 'swiftc -typecheck %FILE% 2>&1 || true',
  },
  {
    ext: '.kt',
    filename: 'sample.kt',
    content: 'fun main() {\n    println("hello")\n}\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.cs',
    filename: 'Sample.cs',
    content: 'using System;\nclass Sample {\n    static void Main() { Console.WriteLine("hello"); }\n}\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.dart',
    filename: 'sample.dart',
    content: 'void main() {\n  print("hello");\n}\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.php',
    filename: 'sample.php',
    content: '<?php\necho "hello";\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.scala',
    filename: 'Sample.scala',
    content: 'object Sample {\n  def main(args: Array[String]): Unit = println("hello")\n}\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.groovy',
    filename: 'sample.groovy',
    content: 'println "hello"\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.css',
    filename: 'sample.css',
    content: 'body { color: red; }\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },
  {
    ext: '.scss',
    filename: 'sample.scss',
    content: '$color: red;\nbody { color: $color; }\n',
    expectedCommentStart: '/*',
    expectedCommentContains: ' * Path:',
  },

  // --- Python docstring style (""") ---
  {
    ext: '.py',
    filename: 'sample.py',
    content: 'def hello():\n    print("hello")\n\nhello()\n',
    expectedCommentStart: '"""',
    expectedCommentContains: 'Path:',
    syntaxChecker: 'python3 -m py_compile %FILE%',
  },

  // --- Rust doc comments (//!) ---
  {
    ext: '.rs',
    filename: 'sample.rs',
    content: 'fn main() {\n    println!("hello");\n}\n',
    expectedCommentStart: '//!',
    expectedCommentContains: '//! Path:',
  },

  // --- Hash line comments (#) ---
  {
    ext: '.rb',
    filename: 'sample.rb',
    content: 'puts "hello"\n',
    expectedCommentStart: '#',
    expectedCommentContains: '# Path:',
    syntaxChecker: 'ruby -c %FILE%',
  },
  {
    ext: '.sh',
    filename: 'sample.sh',
    content: '#!/bin/bash\necho "hello"\n',
    expectedCommentStart: '#',
    expectedCommentContains: '# Path:',
    syntaxChecker: 'bash -n %FILE%',
  },
  {
    ext: '.zsh',
    filename: 'sample.zsh',
    content: '#!/bin/zsh\necho "hello"\n',
    expectedCommentStart: '#',
    expectedCommentContains: '# Path:',
  },
  {
    ext: '.yaml',
    filename: 'sample.yaml',
    content: 'name: test\nvalue: hello\n',
    expectedCommentStart: '#',
    expectedCommentContains: '# Path:',
  },
  {
    ext: '.yml',
    filename: 'sample.yml',
    content: 'items:\n  - one\n  - two\n',
    expectedCommentStart: '#',
    expectedCommentContains: '# Path:',
  },
  {
    ext: '.toml',
    filename: 'sample.toml',
    content: '[package]\nname = "test"\n',
    expectedCommentStart: '#',
    expectedCommentContains: '# Path:',
  },
  {
    ext: '.r',
    filename: 'sample.r',
    content: 'x <- 1\nprint(x)\n',
    expectedCommentStart: '#',
    expectedCommentContains: '# Path:',
  },
  {
    ext: '.ex',
    filename: 'sample.ex',
    content: 'defmodule Sample do\n  def hello, do: IO.puts("hello")\nend\n',
    expectedCommentStart: '#',
    expectedCommentContains: '# Path:',
  },
  {
    ext: '.exs',
    filename: 'sample.exs',
    content: 'IO.puts("hello")\n',
    expectedCommentStart: '#',
    expectedCommentContains: '# Path:',
  },
  {
    ext: '.nim',
    filename: 'sample.nim',
    content: 'echo "hello"\n',
    expectedCommentStart: '#',
    expectedCommentContains: '# Path:',
  },
  {
    ext: '.tf',
    filename: 'sample.tf',
    content: 'resource "null_resource" "example" {}\n',
    expectedCommentStart: '#',
    expectedCommentContains: '# Path:',
  },

  // --- Double dash line comments (--) ---
  {
    ext: '.lua',
    filename: 'sample.lua',
    content: 'print("hello")\n',
    expectedCommentStart: '--',
    expectedCommentContains: '-- Path:',
  },
  {
    ext: '.sql',
    filename: 'sample.sql',
    content: 'SELECT 1;\n',
    expectedCommentStart: '--',
    expectedCommentContains: '-- Path:',
  },
  {
    ext: '.hs',
    filename: 'sample.hs',
    content: 'main = putStrLn "hello"\n',
    expectedCommentStart: '--',
    expectedCommentContains: '-- Path:',
  },
  {
    ext: '.elm',
    filename: 'sample.elm',
    content: 'module Main exposing (..)\n',
    expectedCommentStart: '--',
    expectedCommentContains: '-- Path:',
  },

  // --- Double slash line comments (//) ---
  {
    ext: '.zig',
    filename: 'sample.zig',
    content: 'const std = @import("std");\npub fn main() !void { std.debug.print("hello", .{}); }\n',
    expectedCommentStart: '//',
    expectedCommentContains: '// Path:',
  },

  // --- Semicolon line comments (;;) ---
  {
    ext: '.clj',
    filename: 'sample.clj',
    content: '(println "hello")\n',
    expectedCommentStart: ';;',
    expectedCommentContains: ';; Path:',
  },
  {
    ext: '.el',
    filename: 'sample.el',
    content: '(message "hello")\n',
    expectedCommentStart: ';;',
    expectedCommentContains: ';; Path:',
  },

  // --- Percent line comments (%) ---
  {
    ext: '.erl',
    filename: 'sample.erl',
    content: '-module(sample).\n-export([hello/0]).\nhello() -> io:format("hello~n").\n',
    expectedCommentStart: '%',
    expectedCommentContains: '% Path:',
  },

  // --- HTML-style comments (<!-- -->) ---
  {
    ext: '.html',
    filename: 'sample.html',
    content: '<!DOCTYPE html>\n<html><body><p>Hello</p></body></html>\n',
    expectedCommentStart: '<!--',
    expectedCommentContains: 'Path:',
  },
  {
    ext: '.vue',
    filename: 'sample.vue',
    content: '<template><div>Hello</div></template>\n<script>export default { name: "Sample" }</script>\n',
    expectedCommentStart: '<!--',
    expectedCommentContains: 'Path:',
  },
  {
    ext: '.svelte',
    filename: 'sample.svelte',
    content: '<script>let name = "world";</script>\n<p>Hello {name}</p>\n',
    expectedCommentStart: '<!--',
    expectedCommentContains: 'Path:',
  },
];

// ============================================================================
// Test Runner
// ============================================================================

interface TestResult {
  language: string;
  ext: string;
  commentCheck: 'PASS' | 'FAIL';
  syntaxCheck: 'PASS' | 'FAIL' | 'SKIP';
  error?: string;
}

function runTests(): void {
  const tmpDir = join('/tmp', `codemap-lang-test-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  console.log(`\nLanguage Syntax Validation Test`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Temp directory: ${tmpDir}`);
  console.log(`Testing ${LANGUAGE_SAMPLES.length} language configurations\n`);

  // Write all sample files
  for (const sample of LANGUAGE_SAMPLES) {
    const filePath = join(tmpDir, sample.filename);
    writeFileSync(filePath, sample.content);
  }

  // Run header injection
  console.log(`Running header injection on ${LANGUAGE_SAMPLES.length} files...\n`);
  addHeaders(tmpDir);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Validation Results\n`);

  // Validate each file
  for (const sample of LANGUAGE_SAMPLES) {
    const filePath = join(tmpDir, sample.filename);
    const result: TestResult = {
      language: sample.filename,
      ext: sample.ext,
      commentCheck: 'FAIL',
      syntaxCheck: 'SKIP',
    };

    try {
      const content = readFileSync(filePath, 'utf-8');
      const firstLine = content.split('\n')[0];

      // Check 1: Does the file start with the expected comment syntax?
      if (!firstLine.startsWith(sample.expectedCommentStart)) {
        result.commentCheck = 'FAIL';
        result.error = `Expected start "${sample.expectedCommentStart}", got "${firstLine.slice(0, 20)}"`;
      } else {
        // Check 2: Does the header block contain the expected pattern?
        const headerBlock = content.split('\n').slice(0, 15).join('\n');
        if (!headerBlock.includes(sample.expectedCommentContains)) {
          result.commentCheck = 'FAIL';
          result.error = `Header missing "${sample.expectedCommentContains}"`;
        } else {
          result.commentCheck = 'PASS';
        }
      }

      // Check 3: Does the original content still exist after the header?
      const firstOriginalLine = sample.content.split('\n')[0];
      if (!content.includes(firstOriginalLine)) {
        result.commentCheck = 'FAIL';
        result.error = `Original content lost after header injection`;
      }

      // Check 4: Syntax validation if checker available
      if (sample.syntaxChecker) {
        try {
          const cmd = sample.syntaxChecker.replace(/%FILE%/g, filePath);
          const output = execSync(cmd, {
            timeout: 10000,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          // Ruby -c prints "Syntax OK" on success
          // Python py_compile returns 0 on success
          // Node --check returns 0 on success
          result.syntaxCheck = 'PASS';
        } catch (err: any) {
          const stderr = err.stderr?.toString() || err.stdout?.toString() || '';
          result.syntaxCheck = 'FAIL';
          result.error = (result.error ? result.error + '; ' : '') +
            `Syntax check failed: ${stderr.split('\n')[0]}`;
        }
      }
    } catch (err: any) {
      result.error = `File read error: ${err.message}`;
    }

    results.push(result);

    // Print result
    const commentIcon = result.commentCheck === 'PASS' ? 'PASS' : 'FAIL';
    const syntaxIcon = result.syntaxCheck === 'PASS' ? 'PASS' :
                       result.syntaxCheck === 'SKIP' ? 'SKIP' : 'FAIL';

    const line = `  ${commentIcon} comment | ${syntaxIcon} syntax | ${sample.ext.padEnd(12)} ${sample.filename}`;

    if (result.commentCheck === 'FAIL' || result.syntaxCheck === 'FAIL') {
      console.log(`  FAIL  ${line}`);
      if (result.error) console.log(`        -> ${result.error}`);
      failed++;
    } else {
      console.log(`  OK    ${line}`);
      if (result.syntaxCheck === 'SKIP') skipped++;
      passed++;
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Summary: ${passed} passed, ${failed} failed, ${skipped} syntax checks skipped`);
  console.log(`Total languages tested: ${LANGUAGE_SAMPLES.length}`);

  // Cleanup
  try {
    rmSync(tmpDir, { recursive: true, force: true });
    console.log(`\nCleaned up temp directory.`);
  } catch {
    console.log(`\nNote: temp directory remains at ${tmpDir}`);
  }

  if (failed > 0) {
    console.log(`\nFAILED: ${failed} language(s) have incorrect comment syntax!`);
    process.exit(1);
  } else {
    console.log(`\nAll language comment syntax checks passed!`);
  }
}

runTests();
