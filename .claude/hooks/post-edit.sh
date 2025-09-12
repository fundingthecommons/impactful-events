#!/bin/bash

# Fast post-edit hook - only check the file that was actually edited
# This replaces the slow full-project scan with targeted file checking

# Ensure we're in the project root
cd "$(dirname "$0")/../.."

if [[ -z "$CLAUDE_EDITED_FILE" ]]; then
  echo "⚠️  No edited file specified, skipping checks"
  exit 0
fi

# Only check TypeScript/TSX files
if [[ "$CLAUDE_EDITED_FILE" =~ \.(ts|tsx)$ ]]; then
  echo "🔍 Checking $CLAUDE_EDITED_FILE..."
  
  # Run ESLint directly on the edited file (skip env validation)
  if ! SKIP_ENV_VALIDATION=1 npx eslint "$CLAUDE_EDITED_FILE" --quiet; then
    echo "❌ ESLint failed for $CLAUDE_EDITED_FILE"
    exit 1
  fi
  
  echo "✅ $CLAUDE_EDITED_FILE passed checks"
else
  echo "ℹ️  Skipping checks for non-TypeScript file: $CLAUDE_EDITED_FILE"
fi

exit 0