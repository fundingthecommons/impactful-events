Set up an existing worktree for development: $ARGUMENTS

Steps:
1. Navigate to worktree: `.worktrees/$ARGUMENTS`
2. Copy environment files from main:
   - `cp .env .worktrees/$ARGUMENTS/`
   - `cp .env.local .worktrees/$ARGUMENTS/` (if exists)
3. Install dependencies: `cd .worktrees/$ARGUMENTS && bun install`
4. Run type checking: `cd .worktrees/$ARGUMENTS && npm run typecheck`
5. Provide status and next steps

This is useful when switching between worktrees or after cloning.