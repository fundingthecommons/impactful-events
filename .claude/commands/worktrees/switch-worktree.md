Switch to a different worktree: $ARGUMENTS

Steps:
1. List available worktrees if no argument provided
2. If argument provided, check if worktree exists
3. Show current location and target worktree
4. Provide the cd command to switch: `cd .worktrees/$ARGUMENTS`
5. Check if the worktree needs setup (missing node_modules or .env)
6. Show the current git status in that worktree

Note: This command provides navigation help since Claude Code cannot change the user's working directory.