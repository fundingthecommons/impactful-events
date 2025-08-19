# Fix Build Errors

Iteratively run `vercel build` and fix all errors until the build succeeds.

## Usage
```
/fix-build-errors
```

## Description
This command will:
1. Run `vercel build` 
2. If errors occur, use the log-analyzer agent to identify and fix them
3. Repeat until the build succeeds or maximum attempts reached
4. Provide clear feedback on progress and final status

## Implementation
- Uses the log-analyzer agent for error analysis
- Follows project's ESLint rules for Vercel deployment
- Applies automated fixes where possible
- Reports remaining manual fixes needed