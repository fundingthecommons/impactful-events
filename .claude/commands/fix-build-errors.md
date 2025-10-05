# Fix Build Errors (with Auto-Learning)

Iteratively run `vercel build` and fix all errors until the build succeeds. **Enhanced with auto-learning error pattern logging.**

## Usage
```
/fix-build-errors
```

## Description
This command will:
1. Run `vercel build` 
2. If errors occur, use the log-analyzer agent to identify and fix them
3. **NEW**: Log error patterns to `.claude/logs/` for future prevention
4. Repeat until the build succeeds or maximum attempts reached
5. Provide clear feedback on progress and final status

## Enhanced Implementation
- Uses the log-analyzer agent for error analysis
- Follows project's ESLint rules for Vercel deployment
- Applies automated fixes where possible
- **NEW**: Automatically logs violations to appropriate log files:
  - ESLint violations → `.claude/logs/eslint-violations.md`
  - TypeScript errors → `.claude/logs/typescript-errors.md`
  - Build failures → `.claude/logs/build-failures.md`
- **NEW**: Includes real code examples and context-specific fixes
- **NEW**: Builds growing knowledge base for prevention
- Reports remaining manual fixes needed

## Auto-Learning Format
Each logged error includes:
- **Date/Time**: When the error occurred
- **Error Details**: Specific rule violation or build error
- **File Context**: Actual file and code that caused the issue
- **Fix Applied**: Real solution used to resolve the error
- **Prevention Pattern**: How to avoid this error in future code generation

This creates a self-improving system that learns from actual mistakes in your codebase.