# /organize-code

Add structured file headers to all code files AND regenerate CODEMAPS.

## What It Does

1. **Adds file headers** to all code files:
   - Path (absolute file location)
   - Module (hierarchy within project)
   - Purpose (one-line description)
   - Dependencies (external packages and internal modules)
   - Related files (imports and dependents)
   - Keywords (searchable terms for AI navigation)
   - Last Updated timestamp

2. **Generates CODEMAPS** (same as `/codemap-update`)

## Supported Languages

- TypeScript/JavaScript (.ts, .tsx, .js, .jsx)
- Python (.py, .pyi)
- Go (.go)
- Rust (.rs) - uses `//!` doc comments
- Java (.java)
- C/C++ (.c, .cpp, .cc, .h, .hpp)
- Swift (.swift), Kotlin (.kt, .kts), Dart (.dart)
- C# (.cs), Scala (.scala), Groovy (.groovy)
- Ruby (.rb) - uses `#` line comments
- PHP (.php)
- Lua (.lua), SQL (.sql) - uses `--` line comments
- Haskell (.hs), Elm (.elm) - uses `--` line comments
- Zig (.zig) - uses `//` line comments
- Clojure (.clj, .cljs), Emacs Lisp (.el) - uses `;;` line comments
- Erlang (.erl) - uses `%` line comments
- Elixir (.ex, .exs), Nim (.nim), R (.r, .R)
- Shell (.sh, .bash, .zsh, .fish), PowerShell (.ps1)
- Config (.yaml, .yml, .toml, .tf, .dockerfile)
- CSS (.css, .scss, .less)
- HTML (.html), Vue (.vue), Svelte (.svelte) - uses `<!-- -->` comments

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
📁 Scanning /path/to/project for code files...

Found 47 code files

✓ Added header: src/components/Header.tsx
✓ Added header: src/services/auth.ts
✓ Already has header: src/utils/helpers.ts
...

✅ Processed 45/47 files

🗺️  Generating CODEMAPS for /path/to/project...
...
```

## Header Format

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

## When to Run

- First time setting up the skill
- After creating new files
- After major refactoring
- When AI seems to have trouble finding code

## Notes

- **Skips files with existing headers**: Won't duplicate headers
- **Non-destructive**: Adds headers before existing content
- **Preserves existing comments**: Doesn't remove other documentation
- **Smart detection**: Infers purpose from filename and code patterns
- **Dependency extraction**: Scans import statements to find dependencies

## Tips

- Run this before asking Claude to navigate unfamiliar codebases
- The Keywords field helps AI find files by searching for terms
- The Related field shows import relationships
- Combined with CODEMAPS, creates full navigation system
