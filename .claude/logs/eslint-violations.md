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

## 2025-01-11 - @typescript-eslint/prefer-nullish-coalescing - [Project: ftc-platform]

**Problem**: Used logical OR (||) instead of nullish coalescing (??) for default values
**Project Type**: Next.js + TypeScript + Vercel
**File**: scripts/check-missing-telegram.ts:42,44
**Code Context**: `name: nameResponse?.answer || 'Unknown'` and `telegramAnswer: telegramResponse?.answer || '(no answer)'`
**Fix Applied**: Changed to use nullish coalescing: `name: nameResponse?.answer ?? 'Unknown'` and `telegramAnswer: telegramResponse?.answer ?? '(no answer)'`
**Prevention**: Always use ?? for default values instead of ||. The ?? operator only falls back on null/undefined, while || also treats empty strings, 0, false as falsy. Use || only when you intentionally want to treat all falsy values the same.

---

## 2025-01-11 15:30 - @typescript-eslint/no-unused-vars - [Project: ftc-platform]

**Problem**: Multiple unused imports (Button, IconExternalLink, Link) in profiles admin page
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/admin/profiles/ProfilesAdminClient.tsx:20,23,26
**Code Context**: `import { ..., Button, ... } from "@mantine/core";`, `import { ..., IconExternalLink } from "@tabler/icons-react";`, `import Link from "next/link";`
**Fix Applied**: Removed all three unused imports: `Button`, `IconExternalLink`, and `Link`
**Prevention**: After refactoring components, always run `bun run check` to identify and remove unused imports. Unused imports bloat bundle size and fail Vercel builds.

---

## Usage

This log is referenced by CLAUDE.md to help Claude Code generate ESLint-compliant code on the first try by learning from actual mistakes made in this specific codebase.