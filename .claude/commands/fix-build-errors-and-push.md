# Fix Build Errors and Push

Iteratively run `vercel build` and fix all errors until the build succeeds, then automatically commit and push changes.

## Usage
```
/fix-build-errors-and-push
```

## Description
This command will:
1. Run `vercel build` 
2. If errors occur, use the log-analyzer agent to identify and fix them
3. Repeat until the build succeeds or maximum attempts reached
4. Once all errors are fixed and build succeeds:
   - Run `git add .` to stage all changes
   - Create a commit with message describing the fixes applied
   - Push changes to the remote repository
5. Provide clear feedback on progress and final status

## Implementation
- Uses the log-analyzer agent for error analysis
- Follows project's ESLint rules for Vercel deployment
- Applies automated fixes where possible
- Reports remaining manual fixes needed
- Automatically commits and pushes successful fixes
- Uses conventional commit format for commit messages
- Follows project's git conventions (no AI assistant references)

## Safety Features
- Only commits and pushes if build is successful
- Creates meaningful commit messages based on fixes applied
- Follows project's established git workflow patterns