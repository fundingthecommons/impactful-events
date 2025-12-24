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

## 2025-01-24 - Next.js 15 useSearchParams Suspense Boundary - [Project: impactful-events]

**Build Command**: `vercel build`
**Error**: `useSearchParams() should be wrapped in a suspense boundary at page "/crm/communicate"`
**Root Cause**: Next.js 15 requires client components using `useSearchParams()` to be wrapped in a Suspense boundary during static generation
**Files Affected**: `src/app/crm/communicate/page.tsx`
**Code Context**:
```typescript
// ❌ INCORRECT - useSearchParams at page level without Suspense
export default function CommunicatePage() {
  const searchParams = useSearchParams();
  // ...
}
```
**Fix Applied**:
```typescript
// ✅ CORRECT - Wrap content in Suspense boundary
import { Suspense } from "react";

export default function CommunicatePage() {
  return (
    <Suspense fallback={<Center h="100vh"><Loader size="lg" /></Center>}>
      <CommunicatePageContent />
    </Suspense>
  );
}

function CommunicatePageContent() {
  const searchParams = useSearchParams();
  // ...
}
```
**Prevention**:
1. When using `useSearchParams()` in a page component, always wrap it in a Suspense boundary
2. Create a separate inner component for the content that uses client-side hooks
3. Export a wrapper component that provides the Suspense boundary with a loading fallback
4. This is required in Next.js 15 for pages that use client-side routing/search params during static generation

---

## Usage

This log is referenced by CLAUDE.md to help Claude Code generate code that builds successfully on the first try by learning from actual build failures in this specific codebase.