# TypeScript Errors Auto-Learning Log

This file automatically captures TypeScript compilation errors that occur during development and their resolutions. It builds a growing knowledge base of real type errors from this codebase to prevent future issues.

## Format

Each entry follows this structure:

```markdown
## [Date/Time] - Error Type

**Error**: TypeScript error message
**File**: Path to file where error occurred
**Line**: Line number where error occurred
**Code Context**: Actual code that caused the error
**Fix Applied**: How the error was resolved
**Type Pattern**: Type annotation pattern that should be used

---
```

## Historical Type Errors

## 2025-01-05 10:50 - @typescript-eslint/no-unsafe-assignment - [Project: ftc-platform]

**Error**: Unsafe assignment of an error typed value
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/contacts/page.tsx:51
**Line**: 51
**Code Context**: `const sendBulkMessage = api.telegramAuth.sendBulkMessage.useMutation();`
**Fix Applied**: Ensure proper typing of tRPC mutations with explicit type annotations
**Type Pattern**: Use proper tRPC mutation typing - avoid `any` or `error` typed values

---

## 2025-01-05 10:50 - @typescript-eslint/no-unsafe-call - [Project: ftc-platform]

**Error**: Unsafe call of a(n) `error` type typed value
**Project Type**: Next.js + TypeScript + Vercel  
**File**: src/app/contacts/page.tsx:51
**Line**: 51
**Code Context**: `api.telegramAuth.sendBulkMessage.useMutation()`
**Fix Applied**: Ensure tRPC router exports are properly typed
**Type Pattern**: Verify tRPC router includes all procedures with proper typing

---

## 2025-01-05 10:50 - @typescript-eslint/no-unsafe-member-access - [Project: ftc-platform]

**Error**: Unsafe member access on an `error` typed value
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/app/contacts/page.tsx:93-101
**Line**: Multiple lines
**Code Context**: `result.successCount`, `result.failureCount`, `sendBulkMessage.mutateAsync`
**Fix Applied**: Add proper typing for mutation results and return values
**Type Pattern**: Always type tRPC mutation responses with proper interfaces

---

---

## Usage

This log is referenced by CLAUDE.md to help Claude Code generate type-safe TypeScript code on the first try by learning from actual type errors made in this specific codebase.
## 2025-01-07 15:20 - TS2322 Type Assignment Error - [Project: ftc-platform]

**Error**: Type 'bigint' is not assignable to type 'BigInteger'
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/server/api/routers/telegramAuth.ts:537
**Line**: 537
**Code Context**: `randomId: (BigInteger as unknown as (num: number) => bigint)(Math.floor(Math.random() * 1000000000))`
**Fix Applied**: Import bigInt from "big-integer" and use proper function call
**Type Pattern**: Import `bigInt` from "big-integer" and use `bigInt(number)` instead of type casting

---

## 2025-01-07 15:20 - TS2693 Type/Value Confusion - [Project: ftc-platform]

**Error**: 'BigInteger' only refers to a type, but is being used as a value here
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/server/api/routers/telegramAuth.ts:537
**Line**: 537
**Code Context**: `(BigInteger as unknown as (num: number) => bigint)`
**Fix Applied**: Changed from type import to value import: `import bigInt from "big-integer"`
**Type Pattern**: Use value imports for functions, type imports for type annotations - `import bigInt from "big-integer"` vs `import { type BigInteger } from "big-integer"`

---
