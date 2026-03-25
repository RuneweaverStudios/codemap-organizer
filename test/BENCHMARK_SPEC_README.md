# Benchmark Specification for codemap-organizer

## Overview

This specification defines a comprehensive benchmark suite for testing the `codemap-organizer` skill's ability to help AI agents navigate and understand codebases efficiently.

**Target Repository:** [lossless-claude](https://github.com/RuneweaverStudios/lossless-claude)
- ~1,051 lines of TypeScript code
- MCP server for conversation recall with SQLite storage
- Architecture: Server → Tool Handlers → Database Operations

## File Structure

```
test/
├── spec.ts                    # Complete benchmark specification (1009 lines)
└── BENCHMARK_SPEC_README.md   # This file
```

## Benchmark Tasks (8 Total)

### 1. Find Full-Text Search Implementation
**Category:** `find-functionality` | **Difficulty:** ⭐⭐

- **Task:** Locate and explain FTS5 integration
- **Expected Files:** `src/db/fts5.ts`, `src/store.ts`
- **Baseline:** 13,000 tokens → **Target:** 4,500 tokens (65% reduction)
- **Time Threshold:** 30s

### 2. Explain Message Storage Architecture
**Category:** `understand-module` | **Difficulty:** ⭐⭐⭐⭐

- **Task:** Explain complete message storage flow including transactions, FTS5 indexing, and conversation management
- **Expected Files:** `src/store.ts`, `src/db/connection.ts`, `src/db/migration.ts`, `src/db/fts5.ts`
- **Baseline:** 23,000 tokens → **Target:** 10,000 tokens (57% reduction)
- **Time Threshold:** 60s

### 3. Find All Search-Related Files
**Category:** `locate-related` | **Difficulty:** ⭐⭐⭐

- **Task:** Identify all files involved in search functionality across all layers
- **Expected Files:** `src/store.ts`, `src/db/fts5.ts`, `src/tools/recall-grep.ts`, `src/server.ts`
- **Baseline:** 20,000 tokens → **Target:** 8,500 tokens (58% reduction)
- **Time Threshold:** 45s

### 4. Trace MCP Tool Request Flow
**Category:** `navigate-architecture` | **Difficulty:** ⭐⭐⭐⭐

- **Task:** Trace complete request flow from server → tool handler → database → response
- **Expected Files:** `src/server.ts`, `src/tools/recall-grep.ts`, `src/store.ts`, `src/db/connection.ts`
- **Baseline:** 22,000 tokens → **Target:** 9,000 tokens (59% reduction)
- **Time Threshold:** 60s

### 5. Add Pagination to recall_sessions
**Category:** `edit-task` | **Difficulty:** ⭐⭐⭐

- **Task:** Identify all files that need modification to add pagination support
- **Expected Files:** `src/tools/recall-sessions.ts`, `src/server.ts`, `src/store.ts`
- **Baseline:** 16,500 tokens → **Target:** 5,500 tokens (67% reduction)
- **Time Threshold:** 45s

### 6. Identify Error Handling Patterns
**Category:** `debug-task` | **Difficulty:** ⭐⭐⭐

- **Task:** Find and explain error handling at all layers (DB, tools, server)
- **Expected Files:** `src/server.ts`, `src/store.ts`, `src/tools/recall-grep.ts`, `src/tools/recall-describe.ts`
- **Baseline:** 18,000 tokens → **Target:** 7,500 tokens (58% reduction)
- **Time Threshold:** 50s

### 7. Identify Query Optimization Points
**Category:** `refactor-task` | **Difficulty:** ⭐⭐⭐⭐

- **Task:** Analyze database queries for optimization opportunities (N+1, indexes)
- **Expected Files:** `src/store.ts`, `src/db/fts5.ts`, `src/db/migration.ts`
- **Baseline:** 21,000 tokens → **Target:** 8,500 tokens (60% reduction)
- **Time Threshold:** 55s

### 8. Explain Conversation Recall Flow
**Category:** `understand-module` | **Difficulty:** ⭐⭐⭐

- **Task:** Explain complete flow of retrieving message ranges via recall_describe
- **Expected Files:** `src/tools/recall-describe.ts`, `src/store.ts`
- **Baseline:** 14,500 tokens → **Target:** 4,500 tokens (69% reduction)
- **Time Threshold:** 35s

## Metrics Tracked

### Primary Metrics
1. **Token Usage** - Total tokens consumed (read + search + analysis)
2. **Time to Completion** - Wall-clock time for task completion
3. **Accuracy** - Correctness of result (0-1 scale)
4. **Files Read** - Number of files accessed (efficiency indicator)

### Secondary Metrics
- **Irrelevant Files Read** - Files that didn't need to be read
- **Search Queries** - Number of search operations performed
- **File Reads** - Total file read operations

## Success Criteria

Each task defines:
- **Description** - What constitutes successful completion
- **Minimum Accuracy** - Threshold (typically 0.85-0.90)
- **Validation Function** - Automated check of result quality
- **Required Outputs** - Specific outputs that must be present

## Helper Functions

### Core Functions
- `calculateTokenImprovement()` - Measure token reduction
- `calculateTimeImprovement()` - Measure time savings
- `calculateFileEfficiency()` - Measure file reading efficiency
- `validateTaskResult()` - Check if result meets criteria
- `calculateOverallScore()` - Aggregate benchmark score
- `generateBenchmarkReport()` - Format results

### Query Functions
- `getTaskById()` - Retrieve specific task
- `getTasksByCategory()` - Filter by category
- `getTasksByDifficulty()` - Filter by difficulty
- `getTaskCategories()` - List all categories

## Task Categories

| Category | Description | Tasks |
|----------|-------------|-------|
| `find-functionality` | Locate specific features | 1 |
| `understand-module` | Comprehend module behavior | 2 |
| `locate-related` | Find all related files | 1 |
| `navigate-architecture` | Understand system design | 1 |
| `edit-task` | Prepare for code changes | 1 |
| `debug-task` | Find error handling | 1 |
| `refactor-task` | Identify optimizations | 1 |

## Expected Improvements

**Average Across All Tasks:**
- **Token Reduction:** ~61% (18,000 → ~7,000 tokens)
- **Time Savings:** Target ~50% reduction
- **Accuracy:** ≥85% required for all tasks

## Usage Example

```typescript
import { benchmarkTasks, validateTaskResult, generateBenchmarkReport } from './spec';

// Execute a task
const task = benchmarkTasks[0]; // Find FTS5 implementation
const result = await executeTask(task); // Your execution function

// Validate result
if (validateTaskResult(task, result)) {
  console.log("Task passed!");
}

// Generate report
const report = generateBenchmarkReport(allResults);
console.log(report);
```

## Architecture Context

### lossless-claude Structure
```
src/
├── server.ts              # MCP server, tool registration (114 lines)
├── store.ts               # Database operations (587 lines)
├── capture.ts             # Message capture
├── tools/
│   ├── recall-grep.ts     # Search tool (24 lines)
│   ├── recall-describe.ts # Fetch tool (36 lines)
│   └── recall-sessions.ts # List tool (18 lines)
└── db/
    ├── connection.ts      # DB singleton (56 lines)
    ├── migration.ts       # Schema setup
    └── fts5.ts            # FTS5 utilities
```

### Key Patterns
- **Database Singleton:** `getDb()` returns cached connection
- **Tool Dispatch:** `switch` statement in `server.ts`
- **Search Modes:** regex, full_text (FTS5), like (fallback)
- **Transactions:** Wrapped in `db.transaction()`
- **ReDoS Protection:** `safe-regex2` library

## Validation Strategy

Each task includes:
1. **File-level validation** - Did it read the right files?
2. **Content validation** - Does output contain required concepts?
3. **Accuracy scoring** - Automated grading of result quality
4. **Efficiency checks** - Penalty for reading irrelevant files

## Running Benchmarks

To execute the full benchmark suite:

1. **Setup:** Ensure target repository is available
2. **Execute:** Run each task with and without codemap-organizer
3. **Collect:** Gather metrics (tokens, time, files read)
4. **Validate:** Apply task-specific validation functions
5. **Report:** Generate comparison report

## Key Insights

### What This Tests
- **Navigation Efficiency** - How quickly can relevant code be found?
- **Context Understanding** - Can the AI grasp module relationships?
- **Token Optimization** - Does codemap-organizer reduce context bloat?
- **Accuracy** - Are results correct and complete?

### What Makes Good Tasks
- **Realistic** - Mirror actual AI coding workflows
- **Measurable** - Clear success criteria and metrics
- **Varied** - Different categories and difficulty levels
- **Repository-Specific** - Tailored to actual codebase structure

## Future Enhancements

Potential additions:
- More repositories (different languages, sizes)
- Additional task categories (testing, documentation)
- Performance regression detection
- Comparative benchmarking against other tools
- Statistical significance testing

## Contributing

When adding new tasks:
1. Follow the `BenchmarkTask` interface
2. Include realistic prompts an AI would receive
3. Set measurable success criteria
4. Estimate baseline/target tokens empirically
5. Document common pitfalls in metadata

## License

Part of the codemap-organizer project.
