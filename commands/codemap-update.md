# /codemap-update

Regenerate all CODEMAPS for the current project.

## What It Does

1. Scans all code files in the project
2. Classifies files into areas (frontend, backend, database, integrations, workers)
3. Generates area-specific CODEMAPS in `docs/CODEMAPS/`
4. Updates INDEX.md with overview

## Output

Creates/updates these files:
- `docs/CODEMAPS/INDEX.md` - Overview of all areas
- `docs/CODEMAPS/frontend.md` - Frontend architecture
- `docs/CODEMAPS/backend.md` - Backend/API structure
- `docs/CODEMAPS/database.md` - Database schema and models
- `docs/CODEMAPS/integrations.md` - External service integrations
- `docs/CODEMAPS/workers.md` - Background jobs and cron tasks

## Usage

Run from project root:
```
/codemap-update
```

Or specify a directory:
```
/codemap-update path/to/project
```

## Example Output

```
🗺️  Generating CODEMAPS for /path/to/project...

Found 47 code files

📄 Generating backend.md (23 files, 1,234 lines)
📄 Generating frontend.md (18 files, 987 lines)
📄 Generating database.md (6 files, 456 lines)

✅ Generated CODEMAPS in docs/CODEMAPS/

   📋 View: docs/CODEMAPS/INDEX.md
```

## When to Run

- After adding new files or modules
- After major refactoring
- Before starting work on a new area
- When CODEMAPS seem outdated

## Notes

- Only scans code files (.ts, .tsx, .js, .jsx, .py, .go, .rs, .java, .sql, .prisma)
- Excludes: node_modules, .git, dist, build, target, venv, __pycache__, .next, .nuxt, coverage
- Updates Last Updated timestamp on all CODEMAPS
- Preserves existing manual edits (regenerates entirely, not incremental)
