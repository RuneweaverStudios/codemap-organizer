# Code Map Organizer Skill

**Automatically add structured file headers and generate navigable code maps for AI-friendly code navigation.**

## Features

✅ **File Headers** - Add structured metadata to every code file
✅ **CODEMAP Generation** - Create navigable architecture maps by area
✅ **Multi-Language** - TypeScript, Python, Go, Rust, Java, C++
✅ **Smart Detection** - Auto-infers purpose, dependencies, and relationships

## Quick Start

```bash
# Add headers to all files and generate CODEMAPS
/organize-code

# Just regenerate CODEMAPS (faster)
/codemap-update

# See what changed since last update
/codemap-diff
```

## What Gets Added

### File Headers
```typescript
/*
 * Path: /absolute/path/to/file.ts
 * Module: services/auth
 * Purpose: JWT token validation and refresh logic
 * Dependencies: jsonwebtoken, config/auth
 * Related: /src/controllers/auth.ts, /src/middleware/auth.ts
 * Keywords: jwt, auth, token, validation, refresh
 * Last Updated: 2026-03-24
 */
```

### CODEMAPS
```
docs/CODEMAPS/
├── INDEX.md       - Overview of all areas
├── frontend.md    - UI components, pages, hooks
├── backend.md     - API routes, controllers, services
├── database.md    - Models, schemas, migrations
├── integrations.md - Third-party services
└── workers.md     - Background jobs, cron tasks
```

## Supported Languages

| Language | Extensions | Header Style |
|----------|------------|--------------|
| **TypeScript** | `.ts`, `.tsx` | Block comment `/* */` |
| **JavaScript** | `.js`, `.jsx` | Block comment `/* */` |
| **Python** | `.py`, `.pyi` | Docstring `"""` |
| **Swift** | `.swift` | Block comment `/* */` |
| **Rust** | `.rs` | Line comment `//!` |
| **Go** | `.go` | Block comment `/* */` |
| **Java** | `.java` | Block comment `/* */` |
| **Kotlin** | `.kt`, `.kts` | Block comment `/* */` |
| **C#** | `.cs` | Block comment `/* */` |
| **C/C++** | `.c`, `.cpp`, `.cc`, `.h`, `.hpp` | Block comment `/* */` |
| **Ruby** | `.rb` | Block comment `/* */` |
| **PHP** | `.php` | Block comment `/* */` |
| **Dart** | `.dart` | Block comment `/* */` |
| **Shell** | `.sh`, `.bash`, `.zsh`, `.fish`, `.ps1` | Line comment `#` |
| **YAML** | `.yaml`, `.yml` | Line comment `#` |

## Commands

| Command | Description |
|---------|-------------|
| `/organize-code` | Add headers + generate CODEMAPS |
| `/codemap-update` | Just regenerate CODEMAPS |
| `/codemap-diff` | Show changes since last update |

## Performance & Benchmarks

**Tested**: March 2026 on multiple codebases

### TypeScript/JavaScript Project (10 files, 4,778 lines)
### Token Efficiency: **96.5% reduction**
- Baseline grep: ~4,333 tokens per search
- With codemap headers: ~150 tokens per search
- **29× fewer tokens** per navigation operation

### Quality Improvement: **+32% F1 Score**
- **Precision**: 0.48 → 0.67 (+40% fewer false positives)
- **Recall**: 0.83 → 0.83 (maintained, no relevant files missed)
- **F1 Score**: 0.56 → 0.73 (+32% overall accuracy)

### Swift Project Test (Legion - 88 files, 18,565 lines)
- **Token reduction**: 94% (10,000 → 30 tokens per search)
- **Precision**: Found 1 exact match vs 20 false positives
- **Swift support**: Fully functional with dependency extraction

### Real-World Impact
For a **1M line codebase**:
- **Without codemap**: ~95K tokens per search query
- **With codemap**: ~2K tokens per search query
- **Per-day savings** (50 searches): ~4.6M tokens

### Running Benchmarks
```bash
# Run A/B benchmark (requires headers first)
npx tsx test/benchmark-v2.ts /path/to/project

# View results
cat .benchmark-results-v2.json
```

## Why This Matters

**Problem**: AI has to read entire files to understand purpose, location, and relationships.

**Solution**: Structured headers + CODEMAPS = instant context without full reads.

**Benefits**:
- 🚀 Faster code navigation
- 📚 Better code understanding
- 🔍 Easier file discovery
- 🤖 Improved AI context
- 💰 Dramatic token cost savings

## Example Workflow

```bash
# 1. Set up new project
cd my-project
/organize-code

# 2. Make changes
git pull
# ... add new files ...

# 3. Update CODEMAPS
/codemap-update

# 4. Ask Claude to navigate
"Find the auth service" → Uses header keywords
"What handles payments?" → Uses Purpose field
"Related files to user model?" → Uses Related field
```

## File Structure

```
~/.claude/skills/codemap-organizer/
├── SKILL.md              # Main skill definition
├── README.md             # This file
├── templates/
│   └── header.ts         # Header generation logic
├── scripts/
│   └── generate-codemaps.ts  # CODEMAP generator
└── commands/
    ├── codemap-update.md
    ├── organize-code.md
    └── codemap-diff.md
```

## Advanced Usage

### Skip Specific Directories
Edit `EXCLUDED_DIRS` in `header.ts` to add more exclusions.

### Custom Header Format
Modify `generateHeader()` in `header.ts` to change field order or add new fields.

### Custom Area Patterns
Edit `AREA_PATTERNS` in `generate-codemaps.ts` to change file classification.

## Related Skills

- `doc-updater` - Documentation updates (inspiration for CODEMAP format)
- `coding-standards` - File organization patterns
- `tdd-workflow` - Test-driven development

## License

MIT

## Contributing

Contributions welcome! Feel free to:
- Add support for more languages
- Improve header templates
- Enhance CODEMAP formats
- Fix bugs or add features

---

**Built with ❤️ by Mei (Dev)**
