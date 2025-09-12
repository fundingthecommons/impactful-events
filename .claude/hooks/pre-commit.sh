#!/bin/bash

# Smart pre-commit hook - only check staged files
# Dramatically faster than full project scan

# Ensure we're in the project root
cd "$(dirname "$0")/../.."

echo "🔍 Checking staged files..."

# Get staged TypeScript files
staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)

if [[ -z "$staged_files" ]]; then
  echo "ℹ️  No TypeScript files staged, skipping lint checks"
else
  echo "📝 Staged TypeScript files:"
  echo "$staged_files" | sed 's/^/  - /'
  
  # Run ESLint directly on staged files only
  echo "🔍 Running ESLint on staged files..."
  if ! SKIP_ENV_VALIDATION=1 npx eslint $staged_files; then
    echo "❌ ESLint failed on staged files"
    exit 1
  fi
  
  # Quick typecheck - use project config for proper path resolution
  echo "🔍 Running TypeScript check on project (for staged files)..."
  if ! SKIP_ENV_VALIDATION=1 bunx tsc --noEmit; then
    echo "❌ TypeScript check failed"
    exit 1
  fi
  
  echo "✅ All staged TypeScript files passed checks"
fi

# Check if any form-related files are staged and run form tests if needed
form_files=$(git diff --cached --name-only | grep -E '(form|Form|_components/__tests__)' || true)

if [[ -n "$form_files" ]]; then
  echo "🧪 Form-related files detected, running form tests..."
  if ! bun run test:form; then
    echo "❌ Form tests failed"
    exit 1
  fi
  echo "✅ Form tests passed"
else
  echo "ℹ️  No form-related files staged, skipping form tests"
fi

echo "🚀 All pre-commit checks passed!"
exit 0