---
name: codemap-organizer
description: Generate navigable code map indexes so AI agents can understand codebase structure without reading every file
version: 2.0.0
author: Claude Code
tags: [documentation, organization, navigation, code-mapping]
---

# Code Map Organizer

**Purpose**: Generate structured code map indexes so AI (and humans) can quickly understand file locations, architecture, and relationships WITHOUT reading entire files.

## When This Skill Activates

- User runs: `/codemap-update` - Regenerate all CODEMAPS
- User runs: `/organize-code` - Scan project and generate CODEMAPS
- User runs: `/codemap-diff` - Show changes since last update

## Core Behavior: CODEMAP Generation

Create `docs/CODEMAPS/` directory with area-specific maps:
- `INDEX.md` - Master index with all areas, file counts, line counts
- `frontend.md` - UI components, pages, hooks, styles
- `backend.md` - API routes, controllers, services
- `database.md` - Models, schemas, migrations
- `integrations.md` - Third-party services
- `workers.md` - Background jobs, cron tasks

Each CODEMAP includes:
- Architecture tree view
- Key modules table (file | lines | purpose)
- Entry points
- External dependencies
- Related area links

## How It Saves Tokens

Instead of scanning every file:
1. AI reads `INDEX.md` (~100 tokens) → knows which area to look in
2. AI reads area codemap (~300 tokens) → knows exactly which files matter
3. AI reads only the relevant files

Without a codemap, the AI must scan filenames, grep through files, and read many irrelevant files to orient itself. The codemap acts as a table of contents.

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

## External Dependencies
- package-name - Purpose

## Related Areas
- [backend.md](../CODEMAPS/backend.md) - API endpoints
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
- **Write/Edit** - Generate CODEMAPS
- **Bash** - Run analysis scripts

## Quality Checklist

Before completing:
- [ ] CODEMAPS generated in `docs/CODEMAPS/`
- [ ] All file paths verified to exist
- [ ] Links tested and working
- [ ] Freshness timestamps updated
- [ ] Token-efficient (<500 tokens per CODEMAP)

## Notes

- **Skip non-code files**: `.md`, `.json`, `.yaml`, config files
- **Incremental updates**: Only update changed files on subsequent runs
- **No file modification**: Codemaps are generated as separate index files, no source code is modified
