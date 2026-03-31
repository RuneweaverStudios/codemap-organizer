---
name: codemap-organizer
description: Enforce file headers and generate navigable code maps for AI-friendly code navigation
version: 1.0.0
author: Claude Code
tags: [documentation, organization, navigation, code-mapping]
---

# Code Map Organizer

**Purpose**: Add structured file headers and maintain navigable code maps so AI (and humans) can quickly understand file location, hierarchy, and relationships WITHOUT reading entire files.

## When This Skill Activates

- User runs: `/codemap-update` - Regenerate all CODEMAPS
- User runs: `/organize-code` - Add headers to files + update CODEMAPS
- User runs: `/codemap-diff` - Show changes since last update

## Core Behaviors

### 1. File Header Injection

Add structured headers to code files showing:
- **Path**: Absolute file location
- **Module**: Hierarchy within project
- **Purpose**: One-line description
- **Dependencies**: External packages and internal modules
- **Related**: Linked files (imports, dependents)
- **Keywords**: Searchable terms for AI navigation

### 2. CODEMAP Generation

Create `docs/CODEMAPS/` directory with area-specific maps:
- `frontend.md` - UI components, pages, hooks, styles
- `backend.md` - API routes, controllers, services
- `database.md` - Models, schemas, migrations
- `integrations.md` - Third-party services
- `workers.md` - Background jobs, cron tasks

Each CODEMAP includes:
- Architecture tree view
- Key modules table (file | lines | purpose)
- Data flow diagrams
- External dependencies
- Related area links

### 3. Dependency Tracking

- Use `madge` or TypeScript compiler API for dependency graphs
- Track import/export relationships
- Map file co-changes (files that change together)
- Identify circular dependencies

## File Header Templates

### TypeScript/JavaScript
```typescript
/*
 * Path: /absolute/path/to/file.ts
 * Module: module/submodule/component
 * Purpose: One-line description
 * Dependencies: [external-package], [internal/module]
 * Related: /path/to/related.ts, /another/file.ts
 * Keywords: searchable terms, for AI navigation
 * Last Updated: 2026-03-24
 */
```

### Python
```python
"""
Path: /absolute/path/to/file.py
Module: module/submodule/component
Purpose: One-line description
Dependencies: [external-package], [internal/module]
Related: /path/to/related.py, /another/file.py
Keywords: searchable terms, for AI navigation
Last Updated: 2026-03-24
"""
```

### Go
```go
/*
Path: /absolute/path/to/file.go
Module: module/submodule/component
Purpose: One-line description
Dependencies: [external-package], [internal/module]
Related: /path/to/related.go, /another/file.go
Keywords: searchable terms, for AI navigation
Last Updated: 2026-03-24
*/
```

### Rust
```rust
//!
//! Path: /absolute/path/to/file.rs
//! Module: module/submodule/component
//! Purpose: One-line description
//! Dependencies: [external-package], [internal/module]
//! Related: /path/to/related.rs, /another/file.rs
//! Keywords: searchable terms, for AI navigation
//! Last Updated: 2026-03-24
//!
```

### Ruby
```ruby
# Path: /absolute/path/to/file.rb
# Module: module/submodule/component
# Purpose: One-line description
# Dependencies: [external-package], [internal/module]
# Related: /path/to/related.rb, /another/file.rb
# Keywords: searchable terms, for AI navigation
# Last Updated: 2026-03-24
```

### Lua / SQL / Haskell
```lua
-- Path: /absolute/path/to/file.lua
-- Module: module/submodule/component
-- Purpose: One-line description
-- Dependencies: [external-package], [internal/module]
-- Related: /path/to/related.lua
-- Keywords: searchable terms, for AI navigation
-- Last Updated: 2026-03-24
```

## CODEMAP Format

```markdown
# [Area] Codemap

**Last Updated:** YYYY-MM-DD
**Entry Points:** list of main files
**Total Files:** count
**Total Lines:** count

## Entry Points
- `index.ts` - Main entry point description

## Architecture
```
directory/
├── submodule/
│   └── component.ts
└── utils/
    └── helper.ts
```

## Key Modules
| File | Lines | Purpose |
|------|-------|---------|
| `path/to/file.ts` | 120 | Brief description |
| `another/file.ts` | 85 | Brief description |

## Data Flow
[Description of how data moves through this area]

## External Dependencies
- package-name - Purpose, Version

## Related Areas
- [backend.md](../CODEMAPS/backend.md) - API endpoints
- [database.md](../CODEMAPS/database.md) - Data models
```

## File Classification

Files are classified into areas using these patterns:

| Area | Patterns |
|------|----------|
| **Frontend** | `/(app\|pages\|components\|hooks\|contexts\|ui\|views\|layouts\|styles)/` , `.(tsx\|jsx\|css\|scss\|sass\|less\|vue\|svelte)$` |
| **Backend** | `/(api\|routes\|controllers\|middleware\|server\|services\|handlers)/` , `.(route\|controller\|handler\|middleware\|service).(ts\|js)$` |
| **Database** | `/(models\|schemas\|migrations\|prisma\|drizzle\|db\|database\|repositories)/` , `.(model\|schema\|migration\|seed).(ts\|js)$` |
| **Integrations** | `/(integrations?\|third-party\|external\|plugins?\|adapters?\|connectors?)/` , `.(integration\|adapter\|connector).(ts\|js)$` |
| **Workers** | `/(workers?\|jobs?\|queues?\|tasks?\|cron\|background)/` , `.(worker\|job\|queue\|task\|cron).(ts\|js)$` |

## Tools Required

- **Read/Grep/Glob** - Scan files and content
- **Write/Edit** - Add headers, generate CODEMAPS
- **Bash** - Run analysis scripts
- Optional: `npx madge` - Dependency graphs
- Optional: `npx jsdoc2md` - Extract JSDoc

## Quality Checklist

Before completing:
- [ ] Headers added to all code files
- [ ] CODEMAPS generated in `docs/CODEMAPS/`
- [ ] All file paths verified to exist
- [ ] Links tested and working
- [ ] Freshness timestamps updated
- [ ] No circular dependencies flagged
- [ ] Token-efficient (<1000 tokens per CODEMAP)

## Related Skills

- `doc-updater` - Inspiration for CODEMAP format
- `coding-standards` - File organization patterns
- `tdd-workflow` - When building tests

## Notes

- **Don't duplicate headers**: Check for existing headers before adding
- **Skip non-code files**: `.md`, `.json`, `.yaml`, config files
- **Preserve existing comments**: Don't remove other documentation
- **Incremental updates**: Only update changed files on subsequent runs