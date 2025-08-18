Clean up a git worktree: $ARGUMENTS

Steps:
1. Check if worktree exists: `git worktree list | grep $ARGUMENTS`
2. If worktree has uncommitted changes, warn the user and ask for confirmation
3. Remove the worktree: `git worktree remove .worktrees/$ARGUMENTS`
4. Delete the remote branch if it exists and has been merged
5. Clean up any leftover directories

Safety checks:
- Warn if branch has unpushed commits
- Warn if branch hasn't been merged to main
- Never force remove without explicit confirmation