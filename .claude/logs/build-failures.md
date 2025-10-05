# Build Failures Auto-Learning Log

This file automatically captures build failures that occur during development and their resolutions. It builds a growing knowledge base of real build issues from this codebase to prevent future failures.

## Format

Each entry follows this structure:

```markdown
## [Date/Time] - Build Issue Type

**Build Command**: Command that failed (e.g., bun run build, vercel build)
**Error**: Build error message or exit code
**Root Cause**: What caused the build to fail
**Files Affected**: Files that needed changes to resolve
**Fix Applied**: Specific changes made to resolve the failure
**Prevention**: Pattern to follow to avoid this build issue

---
```

## Historical Build Failures

*This section will be automatically populated as build failures are encountered and fixed.*

---

## Usage

This log is referenced by CLAUDE.md to help Claude Code generate code that builds successfully on the first try by learning from actual build failures in this specific codebase.