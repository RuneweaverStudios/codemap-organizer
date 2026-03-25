# /codemap-diff

Show what changed since the last CODEMAP update.

## What It Does

1. Compares current codebase structure to last CODEMAP generation
2. Shows new files, deleted files, and modified files
3. Displays diff percentage
4. Asks for confirmation if changes exceed 30%

## Usage

```
/codemap-diff
```

## Example Output

```
📊 Comparing to last CODEMAP update (2026-03-23)...

New Files (3):
  ✨ src/components/Button.tsx
  ✨ src/services/payment.ts
  ✨ src/hooks/useAuth.ts

Deleted Files (1):
  ❌ src/utils/oldHelpers.ts

Modified Files (5):
  📝 src/app.tsx (+45 lines)
  📝 src/services/auth.ts (+12 lines)
  📝 src/index.tsx (-8 lines)
  📝 src/types.ts (+67 lines)
  📝 src/config.ts (+3 lines)

Summary:
  Total Changes: 9 files
  Lines Added: +127
  Lines Removed: -8
  Net Change: +119 lines
  Diff: 19.2%

💡 Tip: Run /codemap-update to regenerate CODEMAPS
```

## When to Run

- Before updating CODEMAPS to see what changed
- After pull/merge to understand incoming changes
- To gauge project growth rate
- Before releasing documentation

## Confirmation Threshold

If changes exceed 30%, you'll be prompted:
```
⚠️  Large change detected (45.3%)

This suggests significant restructuring.
Review the diff above before updating.

Update CODEMAPS anyway? [y/N]
```

## Notes

- Compares against Last Updated timestamp in CODEMAPS
- Uses git if available, otherwise filesystem timestamps
- Shows line counts for modified files
- Percentage based on total file count vs changed files

## Tips

- Run regularly to track project evolution
- Use before/after refactoring to measure impact
- Combine with git log to understand what changed
- Good for project health monitoring
