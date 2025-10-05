# Fix Build Errors and Push (with Auto-Learning)

Iteratively run `vercel build` and fix all errors until the build succeeds, then automatically commit and push changes. **Enhanced with auto-learning error pattern logging.**

## Usage
```
/fix-build-errors-and-push
```

## Description
This command will:
1. Run `vercel build` 
2. If errors occur, use the log-analyzer agent to identify and fix them
3. **NEW**: Log error patterns to `.claude/logs/` for future prevention
4. Repeat until the build succeeds or maximum attempts reached
5. **NEW**: Log any pre-push hook violations encountered
6. Once all errors are fixed and build succeeds:
   - Run `git add .` to stage all changes
   - Create a commit with message describing the fixes applied
   - Push changes to the remote repository
7. Provide clear feedback on progress and final status

## Enhanced Implementation
- Uses the log-analyzer agent for error analysis
- Follows project's ESLint rules for Vercel deployment
- Applies automated fixes where possible
- **NEW**: Automatically logs violations to appropriate log files:
  - ESLint violations → `.claude/logs/eslint-violations.md`
  - TypeScript errors → `.claude/logs/typescript-errors.md`
  - Build failures → `.claude/logs/build-failures.md`
- **NEW**: Logs pre-push hook failures and resolutions
- **NEW**: Includes real code examples and context-specific fixes
- **NEW**: Builds growing knowledge base for prevention
- Reports remaining manual fixes needed
- Automatically commits and pushes successful fixes
- Uses conventional commit format for commit messages
- Follows project's git conventions (no AI assistant references)

## Safety Features
- Only commits and pushes if build is successful
- Creates meaningful commit messages based on fixes applied
- Follows project's established git workflow patterns
- **NEW**: Logs all error patterns for team learning and future prevention

## Auto-Learning Benefits
- **Team Knowledge Sharing**: Error logs can be committed to git for team learning
- **Continuous Improvement**: System gets smarter with each error encountered
- **Context-Specific Solutions**: Fixes are tailored to this specific codebase
- **Prevention Focus**: Reduces future violations by learning from past mistakes