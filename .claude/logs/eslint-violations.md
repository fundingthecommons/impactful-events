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

## 2025-01-11 - @typescript-eslint/no-unused-vars - [Project: impactful-events]

**Problem**: Caught unused 'error' variables in async catch blocks
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/events/[eventId]/projects/[projectId]/MetricsTab.tsx:421,458
**Code Context**: `catch (error) { notifications.show({ ... }); }` - error variable captured but never used
**Fix Applied**: Removed unused error parameter: `catch { notifications.show({ ... }); }`
**Prevention**: If the caught error is not used in the catch block (not logged, not thrown, not inspected), omit the error parameter entirely. Use `catch { }` instead of `catch (error) { }`.

---

## 2025-01-11 - react/no-unescaped-entities - [Project: impactful-events]

**Problem**: Unescaped apostrophe in JSX text content
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/events/[eventId]/projects/[projectId]/MetricsTab.tsx:485
**Code Context**: `Get AI-powered metric suggestions based on your project's name` - apostrophe not escaped
**Fix Applied**: Escaped apostrophe using HTML entity: `your project&apos;s name`
**Prevention**: In JSX text content, escape apostrophes/single quotes with `&apos;` or `&#39;`. Alternatively, wrap text in curly braces: `{"your project's name"}`.

---

## 2025-01-11 - @typescript-eslint/no-unused-vars - Timeline Layout Changes - [Project: impactful-events]

**Problem**: Multiple unused variables and imports after implementing timeline layout changes
**Project Type**: Next.js + TypeScript + Vercel
**Files Affected**:
  - src/app/_components/ProjectManager.tsx:149,217
  - src/app/_components/RepositoryManager.tsx:21,24,43
  - src/app/admin/users/UsersClient.tsx:3
  - src/app/events/[eventId]/EventDetailClient.tsx:34
  - src/app/events/[eventId]/projects/[projectId]/ProjectDetailClient.tsx:61,318

**Code Context**:
```typescript
// Unused error parameters in catch blocks
catch (error) { notifications.show({ ... }); }

// Unused imports
import { IconStar } from "@tabler/icons-react"; // Not used
import type { Repository } from "@prisma/client"; // Not used
import { useState, useEffect } from "react"; // useEffect not used
import { getPrimaryRepoUrl } from "~/utils/project"; // Not used
import { getPrimaryRepoUrl, type ProjectWithRepositories } from "~/utils/project"; // Both not used

// Unused function parameter
function RepositoryManager({ projectId, ... }) { // projectId not used
```

**Fix Applied**:
```typescript
// ✅ Removed error parameters from catch blocks
catch { notifications.show({ ... }); }

// ✅ Removed unused imports
// Removed IconStar, Repository type import
import { useState } from "react"; // Removed useEffect
// Removed getPrimaryRepoUrl and ProjectWithRepositories imports

// ✅ Prefixed unused parameter with underscore per project convention
function RepositoryManager({ projectId: _projectId, ... }) {
```

**Prevention**:
1. After removing features or refactoring components, always run `bun run check` to identify unused imports and variables
2. If catch block doesn't use the error, omit the parameter: `catch { }` instead of `catch (error) { }`
3. For required function parameters that aren't used, prefix with underscore: `_projectId` per `@typescript-eslint/no-unused-vars` rule with `argsIgnorePattern: "^_"`
4. Remove utility function imports when the functions are no longer called in the component
5. Only import specific hooks/functions that are actually used in the component

---

## 2025-01-12 - @typescript-eslint/no-unused-vars - Multiple Files - [Project: impactful-events]

**Problem**: Multiple unused imports across different files after refactoring
**Project Type**: Next.js + TypeScript + Vercel
**Files Affected**:
  - src/app/events/[eventId]/impact/page.tsx:19,20
  - src/app/events/[eventId]/latest/UpdatesFeedClient.tsx:48
  - src/app/kudos/KudosLeaderboardClient.tsx:20

**Code Context**:
```typescript
// File 1: impact/page.tsx
import {
  Container,
  Title,
  Text,
  Group,
  Paper,
  Loader,
  Center,
  Tabs,
  Timeline,
  Badge,
  Divider,
  Card,
  Table,
  ThemeIcon,  // ❌ Not used
  Box,        // ❌ Not used
} from "@mantine/core";

// File 2: UpdatesFeedClient.tsx
const CARD_STYLE = {  // ❌ Not used
  cursor: "pointer",
  transition: "background-color 0.2s ease",
} as const;

// File 3: KudosLeaderboardClient.tsx
import {
  IconTrophy,
  IconSparkles,  // ❌ Not used
  IconThumbUp,
  IconMessage,
  IconFileText,
} from "@tabler/icons-react";
```

**Fix Applied**:
```typescript
// ✅ File 1: Removed ThemeIcon and Box from imports
import {
  Container,
  Title,
  Text,
  Group,
  Paper,
  Loader,
  Center,
  Tabs,
  Timeline,
  Badge,
  Divider,
  Card,
  Table,
} from "@mantine/core";

// ✅ File 2: Removed entire CARD_STYLE constant
// const CARD_STYLE removed - style was never used

// ✅ File 3: Removed IconSparkles from imports
import {
  IconTrophy,
  IconThumbUp,
  IconMessage,
  IconFileText,
} from "@tabler/icons-react";
```

**Prevention**:
1. After refactoring components or changing UI layout, always run `bun run check` to catch unused imports
2. Remove entire constant declarations if they're not used anywhere (not just the usage)
3. When multiple files are affected by the same refactoring, check all related files for unused imports
4. Pay special attention to:
   - Mantine UI component imports that may no longer be needed
   - Tabler icon imports after icon changes
   - Style constants that were defined for optimization but never applied
5. ESLint will fail Vercel builds with unused imports - catch them in development

---

## Usage

This log is referenced by CLAUDE.md to help Claude Code generate ESLint-compliant code on the first try by learning from actual mistakes made in this specific codebase.