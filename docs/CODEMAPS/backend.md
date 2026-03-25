# Backend Codemap

**Last Updated:** 2026-03-25
**Entry Points:** None detected
**Total Files:** 6
**Total Lines:** 3124

## Entry Points
_No explicit entry points detected_

## Architecture
```
scripts/
  └── generate-codemaps.ts
templates/
  └── header.ts
test/
  └── backtest.ts
  └── benchmark.ts
  └── spec.ts
  └── utils.ts
```

## Key Modules
| File | Lines | Purpose |
|------|-------|---------|
| `test/spec.ts` | 1020 | Benchmark specification for codemap-organizer skill evaluation |
| `test/backtest.ts` | 556 | Backtest suite for codemap-organizer skill - tests against baseline |
| `scripts/generate-codemaps.ts` | 405 | Generate navigable code maps organized by area (frontend, backend, database, etc.) |
| `test/utils.ts` | 395 | Test utility functions for token counting, timing, and file operations |
| `templates/header.ts` | 385 | Add structured headers to code files for AI-friendly navigation |
| `test/benchmark.ts` | 363 | A/B benchmark measuring codemap-organizer skill impact on speed, tokens, and accuracy |

## Data Flow
1. HTTP Requests → Route Handlers
1. Middleware → Authentication/Validation
1. Controllers → Business Logic
1. Services → Data Access

## External Dependencies
- `child_process` - External package
- `crypto` - External package
- `fs` - External package
- `path` - External package
- `react` - External package
- `util` - External package

## Related Areas
- [frontend.md](./frontend.md) - Frontend modules
- [database.md](./database.md) - Database modules
- [integrations.md](./integrations.md) - Integrations modules
- [workers.md](./workers.md) - Workers modules
