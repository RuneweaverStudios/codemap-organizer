/*
 * Path: /Users/ghost/Desktop/codemap/codemap-organizer/test/spec.ts
 * Module: test/spec
 * Purpose: Benchmark specification for codemap-organizer skill evaluation
 * Dependencies: None
 * Related: ./benchmark.ts, ./utils.ts
 * Keywords: benchmark, specification, tasks, validation, testing
 * Last Updated: 2026-03-24
 */

/**
 * Benchmark Specification for codemap-organizer
 *
 * This specification defines test tasks for evaluating the codemap-organizer skill's
 * ability to help AI agents navigate and understand codebases efficiently.
 *
 * Target Repository: lossless-claude (https://github.com/RuneweaverStudios/lossless-claude)
 * - ~1051 lines of TypeScript code
 * - MCP server for conversation recall with SQLite storage
 * - Tools: recall_grep, recall_describe, recall_sessions
 *
 * Repository Structure:
 * - src/server.ts - MCP server initialization and tool routing
 * - src/store.ts - Database operations (search, insert, conversations)
 * - src/tools/ - Tool implementations (recall-grep, recall-describe, recall-sessions)
 * - src/db/ - Database utilities (connection, migration, fts5)
 * - src/capture.ts - Message capture functionality
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Represents a single benchmark task that an AI agent would perform
 * when exploring and understanding a codebase.
 */
export interface BenchmarkTask {
  /**
   * Unique identifier for the task
   */
  id: string;

  /**
   * Human-readable task name
   */
  name: string;

  /**
   * The task description as it would be presented to an AI agent
   */
  prompt: string;

  /**
   * Task category for grouping and analysis
   */
  category: TaskCategory;

  /**
   * Difficulty level estimate (1-5, where 1 is trivial, 5 is complex)
   */
  difficulty: 1 | 2 | 3 | 4 | 5;

  /**
   * Success criteria for the task
   */
  successCriteria: SuccessCriteria;

  /**
   * Expected files that should be found/read to complete the task
   */
  expectedFiles: string[];

  /**
   * Baseline token usage estimate (without codemap-organizer)
   */
  baselineTokens: TokenEstimate;

  /**
   * Target token usage with codemap-organizer (expected improvement)
   */
  targetTokens: TokenEstimate;

  /**
   * Maximum time allowed for task completion (seconds)
   */
  timeThreshold: number;

  /**
   * Files that should NOT be read (efficiency check)
   */
  irrelevantFiles?: string[];

  /**
   * Additional metadata for task execution
   */
  metadata?: TaskMetadata;
}

/**
 * Task categories for organization
 */
export type TaskCategory =
  | "find-functionality"
  | "understand-module"
  | "locate-related"
  | "navigate-architecture"
  | "edit-task"
  | "debug-task"
  | "refactor-task";

/**
 * Success criteria definition
 */
export interface SuccessCriteria {
  /**
   * What constitutes a successful completion
   */
  description: string;

  /**
   * Minimum accuracy threshold (0-1)
   * - For find tasks: percentage of expected files found
   * - For understand tasks: quality of explanation (graded)
   * - For edit tasks: correctness of modification
   */
  minAccuracy: number;

  /**
   * Validation function to check if task was completed successfully
   * Returns true if successful, false otherwise
   */
  validate: (result: TaskResult) => boolean;

  /**
   * Required outputs from the task
   */
  requiredOutputs: string[];
}

/**
 * Token usage estimates
 */
export interface TokenEstimate {
  /**
   * Estimated tokens for reading files
   */
  read: number;

  /**
   * Estimated tokens for search/navigation
   */
  search: number;

  /**
   * Estimated tokens for analysis/processing
   */
  analysis: number;

  /**
   * Total estimated tokens
   */
  total: number;
}

/**
 * Task execution metadata
 */
export interface TaskMetadata {
  /**
   * Key concepts or patterns involved in the task
   */
  concepts?: string[];

  /**
   * File patterns that are relevant
   */
  relevantPatterns?: string[];

  /**
   * Dependencies or relationships that should be discovered
   */
  dependencies?: string[];

  /**
   * Common pitfalls or inefficiencies to avoid
   */
  pitfalls?: string[];
}

/**
 * Result from executing a benchmark task
 */
export interface TaskResult {
  /**
   * Task ID
   */
  taskId: string;

  /**
   * Whether the task was completed successfully
   */
  success: boolean;

  /**
   * Actual files read during task execution
   */
  filesRead: string[];

  /**
   * Token usage breakdown
   */
  tokenUsage: {
    read: number;
    search: number;
    analysis: number;
    total: number;
  };

  /**
   * Time taken to complete (milliseconds)
   */
  duration: number;

  /**
   * Accuracy score (0-1)
   */
  accuracy: number;

  /**
   * Output or response generated
   */
  output: string;

  /**
   * Any errors encountered
   */
  errors?: string[];

  /**
   * Additional metrics
   */
  metrics?: {
    /**
     * Number of irrelevant files read (efficiency metric)
     */
    irrelevantFilesRead: number;

    /**
     * Number of search queries made
     */
    searchQueries: number;

    /**
     * Number of file read operations
     */
    fileReads: number;
  };
}

// ============================================================================
// Benchmark Tasks
// ============================================================================

/**
 * Complete set of benchmark tasks for testing codemap-organizer
 */
export const benchmarkTasks: BenchmarkTask[] = [
  // Task 1: Find specific functionality (simple search)
  {
    id: "task-001",
    name: "Find Full-Text Search Implementation",
    prompt: "Find and explain where the full-text search functionality is implemented in this codebase. I need to understand how the FTS5 integration works.",
    category: "find-functionality",
    difficulty: 2,
    successCriteria: {
      description: "Must locate the FTS5 integration code and explain its purpose",
      minAccuracy: 0.9,
      validate: (result: TaskResult) => {
        const hasFts5File = result.filesRead.some(f => f.includes("fts5"));
        const mentionsFts5 = result.output.toLowerCase().includes("fts5");
        const explainsIntegration = result.output.includes("index") ||
                                   result.output.includes("search") ||
                                   result.output.includes("MATCH");
        return hasFts5File && mentionsFts5 && explainsIntegration;
      },
      requiredOutputs: [
        "Location of FTS5 implementation",
        "Explanation of FTS5 integration",
        "How it's used in search operations"
      ]
    },
    expectedFiles: [
      "src/db/fts5.ts",
      "src/store.ts"
    ],
    irrelevantFiles: [
      "src/server.ts",
      "src/capture.ts"
    ],
    baselineTokens: {
      read: 8000,
      search: 2000,
      analysis: 3000,
      total: 13000
    },
    targetTokens: {
      read: 2000,
      search: 1000,
      analysis: 1500,
      total: 4500
    },
    timeThreshold: 30,
    metadata: {
      concepts: ["FTS5", "SQLite", "full-text search", "indexing"],
      relevantPatterns: ["**/fts5.ts", "**/store.ts"],
      dependencies: ["better-sqlite3"],
      pitfalls: [
        "Reading all database files instead of focusing on FTS5",
        "Missing the connection between FTS5 and searchMessages",
        "Not explaining how FTS5 falls back to LIKE"
      ]
    }
  },

  // Task 2: Understand a module (comprehensive analysis)
  {
    id: "task-002",
    name: "Explain Message Storage Architecture",
    prompt: "Explain how messages are stored and indexed in this system. I need to understand the complete flow from message capture to database storage, including how FTS5 indexing works.",
    category: "understand-module",
    difficulty: 4,
    successCriteria: {
      description: "Must explain the complete message storage flow including database operations, FTS5 indexing, and conversation management",
      minAccuracy: 0.85,
      validate: (result: TaskResult) => {
        const requiredKeywords = [
          "insertMessage", "conversation", "seq", "token",
          "fts5", "index", "transaction"
        ];
        const hasKeywords = requiredKeywords.every(kw =>
          result.output.toLowerCase().includes(kw.toLowerCase())
        );
        const readsStore = result.filesRead.some(f => f.includes("store"));
        const readsDb = result.filesRead.some(f => f.includes("db"));
        return hasKeywords && readsStore && readsDb;
      },
      requiredOutputs: [
        "Message insertion flow",
        "Conversation management",
        "FTS5 indexing process",
        "Transaction handling",
        "Token estimation"
      ]
    },
    expectedFiles: [
      "src/store.ts",
      "src/db/connection.ts",
      "src/db/migration.ts",
      "src/db/fts5.ts"
    ],
    irrelevantFiles: [
      "src/tools/",
      "src/capture.ts"
    ],
    baselineTokens: {
      read: 15000,
      search: 3000,
      analysis: 5000,
      total: 23000
    },
    targetTokens: {
      read: 6000,
      search: 1500,
      analysis: 2500,
      total: 10000
    },
    timeThreshold: 60,
    metadata: {
      concepts: [
        "database transactions",
        "sequence numbering",
        "token estimation",
        "FTS5 indexing",
        "conversation management"
      ],
      relevantPatterns: ["src/store.ts", "src/db/**/*.ts"],
      dependencies: ["better-sqlite3"],
      pitfalls: [
        "Missing the transaction wrapping in insertMessage",
        "Not understanding the seq auto-increment logic",
        "Overlooking the FTS5 fallback behavior",
        "Reading tool files which are not relevant to storage"
      ]
    }
  },

  // Task 3: Locate related files (discover all components)
  {
    id: "task-003",
    name: "Find All Search-Related Files",
    prompt: "Find all files related to the search functionality. I need to understand every component involved in searching messages, including the different search modes and how they're exposed through the MCP tools.",
    category: "locate-related",
    difficulty: 3,
    successCriteria: {
      description: "Must identify all files involved in search functionality across all layers (database, business logic, tool handlers)",
      minAccuracy: 0.9,
      validate: (result: TaskResult) => {
        const requiredFiles = [
          "src/store.ts",
          "src/db/fts5.ts",
          "src/tools/recall-grep.ts"
        ];
        const foundAll = requiredFiles.every(rf =>
          result.filesRead.some(f => f.includes(rf))
        );
        const mentionsModes = result.output.includes("regex") &&
                             result.output.includes("full_text") &&
                             result.output.includes("like");
        const mentionsTools = result.output.includes("recall_grep") ||
                             result.output.includes("tool");
        return foundAll && mentionsModes && mentionsTools;
      },
      requiredOutputs: [
        "All search-related files",
        "Explanation of search modes",
        "Tool handler implementations",
        "Database integration points"
      ]
    },
    expectedFiles: [
      "src/store.ts",
      "src/db/fts5.ts",
      "src/tools/recall-grep.ts",
      "src/server.ts"
    ],
    irrelevantFiles: [
      "src/capture.ts"
    ],
    baselineTokens: {
      read: 12000,
      search: 4000,
      analysis: 4000,
      total: 20000
    },
    targetTokens: {
      read: 5000,
      search: 1500,
      analysis: 2000,
      total: 8500
    },
    timeThreshold: 45,
    metadata: {
      concepts: [
        "search modes",
        "MCP tools",
        "pattern matching",
        "regex safety"
      ],
      relevantPatterns: ["**/search*", "**/grep*", "**/fts5*"],
      dependencies: ["safe-regex2"],
      pitfalls: [
        "Missing the tool handler layer",
        "Not understanding the three search modes",
        "Overlooking the ReDoS protection",
        "Missing the server.ts tool registration"
      ]
    }
  },

  // Task 4: Navigate architecture (understand system design)
  {
    id: "task-004",
    name: "Trace MCP Tool Request Flow",
    prompt: "Trace the complete flow of an MCP tool request from when it arrives at the server to when it returns a response. Use recall_grep as the example. I need to understand the architecture and how all the pieces fit together.",
    category: "navigate-architecture",
    difficulty: 4,
    successCriteria: {
      description: "Must trace the complete request flow through all layers: server → tool handler → database operations → response",
      minAccuracy: 0.85,
      validate: (result: TaskResult) => {
        const requiredComponents = [
          "server",
          "CallToolRequestSchema",
          "handleRecallGrep",
          "searchMessages",
          "db"
        ];
        const hasComponents = requiredComponents.every(c =>
          result.output.includes(c)
        );
        const explainsFlow = result.output.includes("switch") ||
                            result.output.includes("dispatch") ||
                            result.output.includes("route");
        const readsServer = result.filesRead.some(f => f.includes("server"));
        const readsTool = result.filesRead.some(f => f.includes("recall-grep"));
        const readsStore = result.filesRead.some(f => f.includes("store"));
        return hasComponents && explainsFlow && readsServer && readsTool && readsStore;
      },
      requiredOutputs: [
        "MCP server initialization",
        "Tool registration in server",
        "Request dispatching logic",
        "Tool handler implementation",
        "Database query execution",
        "Response formatting"
      ]
    },
    expectedFiles: [
      "src/server.ts",
      "src/tools/recall-grep.ts",
      "src/store.ts",
      "src/db/connection.ts"
    ],
    irrelevantFiles: [
      "src/capture.ts",
      "src/tools/recall-sessions.ts"
    ],
    baselineTokens: {
      read: 14000,
      search: 3500,
      analysis: 4500,
      total: 22000
    },
    targetTokens: {
      read: 5500,
      search: 1500,
      analysis: 2000,
      total: 9000
    },
    timeThreshold: 60,
    metadata: {
      concepts: [
        "MCP protocol",
        "request routing",
        "tool dispatch",
        "database connection pooling",
        "error handling"
      ],
      relevantPatterns: ["src/server.ts", "src/tools/**/*.ts", "src/store.ts"],
      dependencies: ["@modelcontextprotocol/sdk", "better-sqlite3"],
      pitfalls: [
        "Missing the server.ts initialization and registration",
        "Not understanding the tool dispatch switch statement",
        "Overlooking the database connection singleton pattern",
        "Missing error handling in the flow"
      ]
    }
  },

  // Task 5: Edit/modify task (prepare for code change)
  {
    id: "task-005",
    name: "Add Pagination to recall_sessions",
    prompt: "I need to add pagination support to the recall_sessions tool. Find and read all the files I would need to modify to implement this feature. The tool should accept skip/offset parameters in addition to limit.",
    category: "edit-task",
    difficulty: 3,
    successCriteria: {
      description: "Must identify all files that need modification to add pagination support",
      minAccuracy: 0.9,
      validate: (result: TaskResult) => {
        const needsToolHandler = result.filesRead.some(f =>
          f.includes("recall-sessions")
        );
        const needsServer = result.filesRead.some(f => f.includes("server"));
        const needsStore = result.filesRead.some(f => f.includes("store"));
        const explainsChanges = result.output.includes("offset") ||
                               result.output.includes("skip") ||
                               result.output.includes("pagination");
        return needsToolHandler && needsServer && needsStore && explainsChanges;
      },
      requiredOutputs: [
        "Files that need modification",
        "Current implementation of recall_sessions",
        "Where to add pagination parameters",
        "Database query that needs modification"
      ]
    },
    expectedFiles: [
      "src/tools/recall-sessions.ts",
      "src/server.ts",
      "src/store.ts"
    ],
    irrelevantFiles: [
      "src/db/fts5.ts",
      "src/capture.ts"
    ],
    baselineTokens: {
      read: 10000,
      search: 3000,
      analysis: 3500,
      total: 16500
    },
    targetTokens: {
      read: 3000,
      search: 1000,
      analysis: 1500,
      total: 5500
    },
    timeThreshold: 45,
    metadata: {
      concepts: [
        "pagination",
        "offset/limit",
        "SQL pagination",
        "MCP tool parameters"
      ],
      relevantPatterns: ["**/recall-sessions.ts", "src/server.ts", "src/store.ts"],
      dependencies: ["@modelcontextprotocol/sdk"],
      pitfalls: [
        "Forgetting to update the tool schema in server.ts",
        "Not finding the listConversations function in store.ts",
        "Reading irrelevant files like recall-grep",
        "Missing the inputSchema definition"
      ]
    }
  },

  // Task 6: Debug task (find error handling issues)
  {
    id: "task-006",
    name: "Identify Error Handling Patterns",
    prompt: "Find and explain all the error handling patterns in this codebase. I need to understand how errors are handled at different layers: database operations, tool handlers, and the MCP server layer.",
    category: "debug-task",
    difficulty: 3,
    successCriteria: {
      description: "Must identify error handling at all layers (DB, tools, server)",
      minAccuracy: 0.85,
      validate: (result: TaskResult) => {
        const mentionsDbErrors = result.output.includes("db") &&
                                 (result.output.includes("try") ||
                                  result.output.includes("catch"));
        const mentionsToolErrors = result.output.includes("tool") ||
                                  result.output.includes("isError");
        const mentionsServerErrors = result.output.includes("server") ||
                                    result.output.includes("error");
        const hasTryCatch = result.filesRead.some(f => {
          // Would need to check file contents, but assuming they read the right files
          return f.includes("server") || f.includes("store");
        });
        return mentionsDbErrors && mentionsToolErrors && mentionsServerErrors && hasTryCatch;
      },
      requiredOutputs: [
        "Database error handling patterns",
        "Tool handler error handling",
        "MCP server error responses",
        "Error logging strategies"
      ]
    },
    expectedFiles: [
      "src/server.ts",
      "src/store.ts",
      "src/tools/recall-grep.ts",
      "src/tools/recall-describe.ts"
    ],
    irrelevantFiles: [
      "src/capture.ts"
    ],
    baselineTokens: {
      read: 11000,
      search: 3000,
      analysis: 4000,
      total: 18000
    },
    targetTokens: {
      read: 4500,
      search: 1200,
      analysis: 1800,
      total: 7500
    },
    timeThreshold: 50,
    metadata: {
      concepts: [
        "error handling",
        "try-catch",
        "error responses",
        "logging"
      ],
      relevantPatterns: ["src/**/*.ts"],
      pitfalls: [
        "Missing the server-level error handler",
        "Not understanding the FTS fallback error handling",
        "Overlooking the safe-regex error handling"
      ]
    }
  },

  // Task 7: Refactor task (find optimization opportunities)
  {
    id: "task-007",
    name: "Identify Query Optimization Points",
    prompt: "Find all database query operations and identify potential optimization points. I'm particularly interested in the search functionality - are there any N+1 query problems or missing indexes?",
    category: "refactor-task",
    difficulty: 4,
    successCriteria: {
      description: "Must identify all database queries and analyze their efficiency",
      minAccuracy: 0.8,
      validate: (result: TaskResult) => {
        const mentionsQueries = result.output.includes("SELECT") ||
                               result.output.includes("query") ||
                               result.output.includes("prepare");
        const mentionsOptimization = result.output.includes("index") ||
                                   result.output.includes("N+1") ||
                                   result.output.includes("optimize") ||
                                   result.output.includes("performance");
        const readsStore = result.filesRead.some(f => f.includes("store"));
        const readsFts5 = result.filesRead.some(f => f.includes("fts5"));
        return mentionsQueries && mentionsOptimization && readsStore && readsFts5;
      },
      requiredOutputs: [
        "All database query locations",
        "Query performance analysis",
        "Index usage (FTS5)",
        "Potential optimization opportunities"
      ]
    },
    expectedFiles: [
      "src/store.ts",
      "src/db/fts5.ts",
      "src/db/migration.ts"
    ],
    irrelevantFiles: [
      "src/server.ts",
      "src/tools/"
    ],
    baselineTokens: {
      read: 13000,
      search: 3500,
      analysis: 4500,
      total: 21000
    },
    targetTokens: {
      read: 5000,
      search: 1500,
      analysis: 2000,
      total: 8500
    },
    timeThreshold: 55,
    metadata: {
      concepts: [
        "SQL optimization",
        "query performance",
        "indexing",
        "N+1 queries",
        "prepared statements"
      ],
      relevantPatterns: ["src/store.ts", "src/db/**/*.ts"],
      dependencies: ["better-sqlite3"],
      pitfalls: [
        "Not identifying the MAX_ROW_SCAN limit in regex search",
        "Missing the FTS5 vs LIKE performance difference",
        "Overlooking the transaction batching in insertMessages"
      ]
    }
  },

  // Task 8: Complex understanding task (multi-file analysis)
  {
    id: "task-008",
    name: "Explain Conversation Recall Flow",
    prompt: "Explain the complete flow of retrieving a range of messages from a conversation using recall_describe. Include how parameters are parsed, how the database query is constructed, and how the results are returned.",
    category: "understand-module",
    difficulty: 3,
    successCriteria: {
      description: "Must explain the complete parameter-to-query-to-response flow",
      minAccuracy: 0.9,
      validate: (result: TaskResult) => {
        const mentionsParameters = result.output.includes("seq_start") ||
                                   result.output.includes("seq_end") ||
                                   result.output.includes("conversation_id");
        const mentionsQuery = result.output.includes("getMessagesByConversation") ||
                             result.output.includes("ORDER BY seq");
        const mentionsResponse = result.output.includes("JSON") ||
                                result.output.includes("return");
        const readsTool = result.filesRead.some(f => f.includes("recall-describe"));
        const readsStore = result.filesRead.some(f => f.includes("store"));
        return mentionsParameters && mentionsQuery && mentionsResponse && readsTool && readsStore;
      },
      requiredOutputs: [
        "Parameter parsing logic",
        "Database query construction",
        "Sequence filtering logic",
        "Response formatting"
      ]
    },
    expectedFiles: [
      "src/tools/recall-describe.ts",
      "src/store.ts"
    ],
    irrelevantFiles: [
      "src/tools/recall-grep.ts",
      "src/tools/recall-sessions.ts",
      "src/capture.ts"
    ],
    baselineTokens: {
      read: 9000,
      search: 2500,
      analysis: 3000,
      total: 14500
    },
    targetTokens: {
      read: 2500,
      search: 800,
      analysis: 1200,
      total: 4500
    },
    timeThreshold: 35,
    metadata: {
      concepts: [
        "parameter validation",
        "sequence filtering",
        "database queries",
        "JSON serialization"
      ],
      relevantPatterns: ["**/recall-describe.ts", "src/store.ts"],
      pitfalls: [
        "Missing the filtering logic for seq_start/seq_end",
        "Not understanding the two modes (message_id vs conversation_id)",
        "Reading the other tool files unnecessarily"
      ]
    }
  }
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate token efficiency improvement
 * @param baseline Baseline token usage (without codemap-organizer)
 * @param actual Actual token usage (with codemap-organizer)
 * @returns Percentage improvement (0-1)
 */
export function calculateTokenImprovement(
  baseline: number,
  actual: number
): number {
  if (baseline === 0) return 0;
  return (baseline - actual) / baseline;
}

/**
 * Calculate time efficiency improvement
 * @param baseline Baseline time in milliseconds
 * @param actual Actual time in milliseconds
 * @returns Percentage improvement (0-1)
 */
export function calculateTimeImprovement(
  baseline: number,
  actual: number
): number {
  if (baseline === 0) return 0;
  return (baseline - actual) / baseline;
}

/**
 * Calculate file reading efficiency
 * @param expectedFiles Files that should have been read
 * @param actualFiles Files that were actually read
 * @returns Efficiency score (0-1)
 */
export function calculateFileEfficiency(
  expectedFiles: string[],
  actualFiles: string[]
): number {
  const expectedSet = new Set(expectedFiles.map(normalizePath));
  const actualSet = new Set(actualFiles.map(normalizePath));

  // Penalty for reading irrelevant files
  const irrelevantCount = [...actualSet].filter(
    f => !expectedSet.has(f)
  ).length;

  // Reward for reading expected files
  const relevantRead = [...expectedSet].filter(f => actualSet.has(f)).length;
  const relevantScore = relevantRead / expectedFiles.length;

  // Efficiency reduces as more irrelevant files are read
  const irrelevantPenalty = Math.min(irrelevantCount * 0.1, 0.5);

  return Math.max(0, relevantScore - irrelevantPenalty);
}

/**
 * Normalize file path for comparison
 */
function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").toLowerCase();
}

/**
 * Validate task result against success criteria
 * @param task The benchmark task
 * @param result The actual result from execution
 * @returns Whether the result meets success criteria
 */
export function validateTaskResult(
  task: BenchmarkTask,
  result: TaskResult
): boolean {
  return task.successCriteria.validate(result) && result.accuracy >= task.successCriteria.minAccuracy;
}

/**
 * Calculate overall benchmark score
 * @param results Array of task results
 * @returns Overall score (0-1)
 */
export function calculateOverallScore(results: TaskResult[]): number {
  if (results.length === 0) return 0;

  const successRate = results.filter(r => r.success).length / results.length;
  const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;
  const avgTokenEfficiency = results.reduce((sum, r) => {
    const task = benchmarkTasks.find(t => t.id === r.taskId);
    if (!task) return sum;
    const improvement = calculateTokenImprovement(
      task.baselineTokens.total,
      r.tokenUsage.total
    );
    return sum + improvement;
  }, 0) / results.length;

  // Weighted score: 40% success, 30% accuracy, 30% efficiency
  return (successRate * 0.4) + (avgAccuracy * 0.3) + (avgTokenEfficiency * 0.3);
}

/**
 * Generate benchmark report
 * @param results Array of task results
 * @returns Formatted report string
 */
export function generateBenchmarkReport(results: TaskResult[]): string {
  const overallScore = calculateOverallScore(results);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const totalTokens = results.reduce((sum, r) => sum + r.tokenUsage.total, 0);

  let report = `
╔═══════════════════════════════════════════════════════════════╗
║           CODEMAP-ORGANIZER BENCHMARK RESULTS                ║
╚═══════════════════════════════════════════════════════════════╝

Overall Score: ${(overallScore * 100).toFixed(1)}%
Total Duration: ${(totalDuration / 1000).toFixed(2)}s
Total Tokens: ${totalTokens.toLocaleString()}

Task Results:
${"─".repeat(70)}
`;

  for (const result of results) {
    const task = benchmarkTasks.find(t => t.id === result.taskId);
    if (!task) continue;

    const status = result.success ? "✓" : "✗";
    const tokenImprovement = calculateTokenImprovement(
      task.baselineTokens.total,
      result.tokenUsage.total
    );

    report += `
${status} ${task.name}
  Category: ${task.category}
  Difficulty: ${"/".repeat(task.difficulty)}${".".repeat(5 - task.difficulty)}
  Duration: ${(result.duration / 1000).toFixed(2)}s
  Tokens: ${result.tokenUsage.total.toLocaleString()} (${(tokenImprovement * 100).toFixed(0)}% improvement)
  Accuracy: ${(result.accuracy * 100).toFixed(0)}%
  Files Read: ${result.filesRead.length}
`;
  }

  report += `
${"─".repeat(70)}

Metrics Summary:
- Success Rate: ${(results.filter(r => r.success).length / results.length * 100).toFixed(0)}%
- Average Accuracy: ${(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length * 100).toFixed(0)}%
- Average Token Efficiency: ${(results.reduce((sum, r) => {
    const task = benchmarkTasks.find(t => t.id === r.taskId);
    if (!task) return sum;
    return sum + calculateTokenImprovement(task.baselineTokens.total, r.tokenUsage.total);
  }, 0) / results.length * 100).toFixed(0)}%
`;

  return report;
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Get task by ID
 */
export function getTaskById(id: string): BenchmarkTask | undefined {
  return benchmarkTasks.find(task => task.id === id);
}

/**
 * Get tasks by category
 */
export function getTasksByCategory(category: TaskCategory): BenchmarkTask[] {
  return benchmarkTasks.filter(task => task.category === category);
}

/**
 * Get tasks by difficulty
 */
export function getTasksByDifficulty(difficulty: number): BenchmarkTask[] {
  return benchmarkTasks.filter(task => task.difficulty === difficulty);
}

/**
 * Get all task categories
 */
export function getTaskCategories(): TaskCategory[] {
  return Array.from(new Set(benchmarkTasks.map(task => task.category)));
}

/**
 * Get all benchmark tasks
 * Convenience function to get the complete task list
 */
export function getBenchmarkTasks(): BenchmarkTask[] {
  return benchmarkTasks;
}
