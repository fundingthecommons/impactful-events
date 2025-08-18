Create a new git worktree for feature development: $ARGUMENTS

Steps:
1. Parse the feature name from arguments (e.g., "outcomes-delete" from "/create-feature-worktree outcomes-delete")
2. Create a new branch: `git checkout -b feature/$ARGUMENTS`
3. Switch back to main: `git checkout main`
4. Create worktree: `git worktree add .worktrees/$ARGUMENTS feature/$ARGUMENTS`
5. Copy essential files:
   - `cp .env .worktrees/$ARGUMENTS/`
   - `cp .env.local .worktrees/$ARGUMENTS/` (if exists)
6. Install dependencies: `cd .worktrees/$ARGUMENTS && bun install`
7. Provide instructions for running the dev server on an alternate port

Output format:
```
✅ Created worktree for feature/$ARGUMENTS

To work in this worktree:
- Navigate: cd .worktrees/$ARGUMENTS
- Run dev server: npm run dev -- -p 3001
- Make changes and commit as usual
- When done: git push -u origin feature/$ARGUMENTS
```