# ESLint Violations Auto-Learning Log

This file automatically captures ESLint violations that occur during development and their resolutions. It builds a growing knowledge base of real error patterns from this codebase to prevent future violations.

## Format

Each entry follows this structure:

```markdown
## [Date/Time] - Rule Name

**Problem**: Brief description of what was wrong
**File**: Path to file where violation occurred  
**Code Context**: Actual code that caused the violation
**Fix Applied**: How the violation was resolved
**Prevention**: Pattern to follow in future code generation

---
```

## Historical Violations

## 2025-01-05 10:45 - prefer-const - [Project: ftc-platform]

**Problem**: Variable declared with 'let' but never reassigned
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/server/api/routers/contact.ts:167
**Code Context**: `let linkedin = response.answer.trim();`
**Fix Applied**: `const linkedin = response.answer.trim();`
**Prevention**: Use `const` for variables that are never reassigned, `let` only when reassignment is needed

---

## 2025-01-11 - @typescript-eslint/no-unused-vars - [Project: ftc-platform]

**Problem**: Imported 'IconHandStop' but never used after removing tab
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/events/[eventId]/ResidentDashboard.tsx:53
**Code Context**: `import { ..., IconHandStop } from "@tabler/icons-react";` - Used in removed "Asks & Offers" tab
**Fix Applied**: Removed `IconHandStop` from imports after removing the tab that used it
**Prevention**: When removing components or tabs, always check and remove unused imports. Run ESLint before committing to catch unused imports.

---

## Usage

This log is referenced by CLAUDE.md to help Claude Code generate ESLint-compliant code on the first try by learning from actual mistakes made in this specific codebase.