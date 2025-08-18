List all git worktrees and their status.

Steps:
1. Run `git worktree list` to show all worktrees
2. For each worktree, show:
   - Path
   - Current branch
   - Whether it has uncommitted changes (git status)
   - Whether dependencies are installed (check node_modules)
   - Whether .env exists
3. Suggest next actions for each worktree