Run development server in a worktree: $ARGUMENTS

Steps:
1. Parse worktree name and optional port from arguments (e.g., "outcomes-delete 3001")
2. Check if worktree exists
3. Ensure worktree has node_modules installed
4. Ensure worktree has .env file
5. Determine port (default to 3001 for first worktree, 3002 for second, etc.)
6. Run: `cd .worktrees/$WORKTREE && npm run dev -- -p $PORT`
7. Show the URL where the server is running

Port assignment:
- Main project: 3000 (default)
- First worktree: 3001
- Second worktree: 3002
- Or use explicitly provided port