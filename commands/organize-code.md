# /organize-code

Scan a project and generate navigable CODEMAP index files.

## What It Does

Scans all code files in the project and generates `docs/CODEMAPS/` with:
- `INDEX.md` - Master index listing all areas, file counts, and line counts
- Area-specific maps (`frontend.md`, `backend.md`, `database.md`, etc.)

Each area map contains:
- Architecture tree view
- Key modules table (file, lines, purpose)
- Entry points
- External dependencies
- Related area links

## Usage

Run from project root:
```
/organize-code
```

Or specify a directory:
```
/organize-code path/to/project
```

## Example Output

```
Generating CODEMAPS for /path/to/project...

Found 143 code files

Generating frontend.md (45 files, 3200 lines)
Generating backend.md (62 files, 8400 lines)
Generating database.md (12 files, 1100 lines)
Generating workers.md (8 files, 600 lines)
Skipping integrations (no files)

Generated CODEMAPS in docs/CODEMAPS/
```

## When to Run

- First time working with a new codebase
- After major refactoring or adding new modules
- When AI seems to have trouble finding code
- Before handing off a project

## Notes

- **Non-destructive**: Only creates files in `docs/CODEMAPS/`, never modifies source code
- **Smart classification**: Files are classified into areas by path patterns and extensions
- **Token-efficient**: Each codemap targets <500 tokens so AI can read them cheaply
