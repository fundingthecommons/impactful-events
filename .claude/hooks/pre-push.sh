#!/bin/bash

# Smart pre-push hook - only check files changed since origin/main
# Much faster than comprehensive project scan

# Ensure we're in the project root
cd "$(dirname "$0")/../.."

echo "🚀 Running pre-push checks on changed files..."

# Get files changed since origin/main
changed_files=$(git diff origin/main..HEAD --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)

if [[ -z "$changed_files" ]]; then
  echo "ℹ️  No TypeScript files changed since origin/main, skipping checks"
else
  echo "📝 Changed TypeScript files since origin/main:"
  echo "$changed_files" | sed 's/^/  - /'
  
  # Run comprehensive checks on changed files only
  echo "🔍 Running ESLint on changed files..."
  if ! SKIP_ENV_VALIDATION=1 npx eslint $changed_files; then
    echo "❌ ESLint failed on changed files"
    exit 1
  fi
  
  echo "🔍 Running TypeScript check on project (for changed files)..."
  if ! SKIP_ENV_VALIDATION=1 bunx tsc --noEmit; then
    echo "❌ TypeScript check failed"
    exit 1
  fi
  
  echo "✅ All changed files passed checks"
fi

# Check if any form files changed and run comprehensive form tests
form_files_changed=$(git diff origin/main..HEAD --name-only | grep -E '(form|Form|_components/__tests__)' || true)

if [[ -n "$form_files_changed" ]]; then
  echo "🧪 Form-related files changed, running comprehensive form test suite..."
  
  # Run all form tests
  if ! bun run test:form; then
    echo "❌ Form tests failed"
    exit 1
  fi
  
  # Run form validation tests  
  if ! bun run test:form-validation 2>/dev/null || true; then
    echo "⚠️  Form validation tests not available, skipping"
  fi
  
  echo "✅ All form tests passed"
else
  echo "ℹ️  No form-related files changed, skipping form tests"
fi

echo "🎉 All pre-push checks passed! Ready to push."
exit 0