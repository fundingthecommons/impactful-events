# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
bun run dev              # Start Next.js development server with Turbo
bun run build           # Build the production application
bun run start           # Start production server
bun run preview         # Build and start production server

# Database
bun run db:generate     # Generate Prisma client after schema changes
bun run db:push         # Push schema changes to database (development, no migration file)
bun run db:migrate      # Deploy migrations (production)
bun run db:seed         # Seed database with initial data
bun run db:studio       # Open Prisma Studio database GUI

# Code Quality
bun run check           # Run both linting and type checking (comprehensive check)
bun run lint            # Run ESLint
bun run lint:fix        # Run ESLint with auto-fix
bun run typecheck       # Run TypeScript type checking
bun run format:check    # Check code formatting with Prettier
bun run format:write    # Format code with Prettier
```

## Project Conventions

- Always use `bun` to run commands in this project
- **NEVER start or restart the dev server** - it's always running in the background
- Check dev server logs in `one.log` file instead of running `bun run dev`
- Do what has been asked; nothing more, nothing less
- **NEVER create files unless they're absolutely necessary for achieving your goal**
- **ALWAYS prefer editing an existing file to creating a new one**
- **NEVER proactively create documentation files (*.md) or README files** - Only create documentation files if explicitly requested by the User

## CODE QUALITY REQUIREMENTS FOR VERCEL BUILD

**CRITICAL: All generated code must pass these ESLint rules to deploy on Vercel.**

### Mandatory Code Standards

1. **Nullish Coalescing (@typescript-eslint/prefer-nullish-coalescing)**
   ```typescript
   // ❌ WRONG - fails Vercel build
   const value = input || 'default';
   const name = user.name || 'Anonymous';
   
   // ✅ CORRECT - passes Vercel build  
   const value = input ?? 'default';
   const name = user.name ?? 'Anonymous';
   ```

2. **No Explicit Any (@typescript-eslint/no-explicit-any)**
   ```typescript
   // ❌ WRONG - fails Vercel build
   const data: any = response;
   function process(input: any): any { }
   
   // ✅ CORRECT - passes Vercel build
   const data: unknown = response;
   function process(input: unknown): string { }
   interface ResponseData { id: string; name: string; }
   const data: ResponseData = response;
   ```

3. **Safe Type Assertions (@typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access)**
   ```typescript
   // ❌ WRONG - fails Vercel build
   const result: any = getData();
   const name = result.user.name;
   
   // ✅ CORRECT - passes Vercel build
   interface UserData { user: { name: string } }
   const result = getData() as UserData;
   const name = result.user.name;
   ```

4. **Promise Handling (@typescript-eslint/no-floating-promises)**
   ```typescript
   // ❌ WRONG - fails Vercel build
   saveData(formData);
   processUser();
   
   // ✅ CORRECT - passes Vercel build
   await saveData(formData);
   void processUser(); // If fire-and-forget is intended
   saveData(formData).catch(console.error);
   ```

5. **String Conversion (@typescript-eslint/no-base-to-string)**
   ```typescript
   // ❌ WRONG - fails Vercel build
   const message = `User: ${userObject}`;
   
   // ✅ CORRECT - passes Vercel build
   const message = `User: ${userObject.name}`;
   const message = `User: ${JSON.stringify(userObject)}`;
   ```

6. **Remove Unused Variables (@typescript-eslint/no-unused-vars)**
   ```typescript
   // ❌ WRONG - fails Vercel build
   import { Button, Card } from '@mantine/core'; // Card unused
   
   // ✅ CORRECT - passes Vercel build
   import { Button } from '@mantine/core';
   ```

### Pre-Deployment Validation

**ALWAYS run these commands before considering any implementation complete:**
```bash
bun run check    # Must pass for Vercel deployment
bun run build    # Must complete successfully
```

**If any linting errors appear, they MUST be fixed before deployment.**

## Git Commit Conventions

- **NEVER mention "Claude Code" or any AI assistant references in commit messages**
- Write commit messages as if they were written by a human developer
- Follow conventional commit format (feat:, fix:, chore:, etc.)
- Keep commit messages professional and focused on the changes made
- **Close related GitHub issues** by adding `Closes #123` or `Fixes #123` at the end of commit messages
- For multiple issues, use `Closes #123, #456`

## Claude Code Configuration

### Specialized Agents
This project includes custom Claude Code agents in `.claude/agents/`:

- **log-analyzer**: Log analysis and debugging specialist for monitoring application health, analyzing errors, and providing debugging insights. Use this agent for all log analysis tasks.
- **build-tester**: Testing and validation specialist that runs tests, validates code changes, and ensures quality gates are met. Use after implementing features to validate correctness.

### Custom Commands
Custom Claude Code commands are available in `.claude/commands/`:

#### Git Worktree Management (`.claude/commands/worktrees/`)
- `/create-feature-worktree <feature-name>` - Create new worktree for feature development
- `/list-worktrees` - Show all active worktrees
- `/switch-worktree <name>` - Switch to specific worktree
- `/cleanup-worktree <name>` - Remove completed worktree
- `/setup-worktree` - Initial worktree setup
- `/worktree-dev` - Start development in current worktree

#### Development Workflow
- `/generate-prp <feature-file>` - Generate comprehensive Project Requirements & Planning document
- `/execute-parallel` - Execute multiple commands in parallel
- `/prep-parallel` - Prepare parallel command execution
- `/fix-github-issue <issue-number>` - Fix specific GitHub issue with structured approach

### Permissions Configuration
The project has pre-approved permissions in `.claude/settings.local.json` for:
- Build commands (`bun run:*`)
- File operations (`mkdir:*`, `cp:*`, `rm:*`)
- Git operations (`git add:*`)
- Vercel operations (`vercel build:*`, `vercel pull:*`)
- Auth.js documentation access (`WebFetch(domain:authjs.dev)`)

### Usage Examples
```bash
# Use log analyzer for debugging
/log-analyzer "Check for recent errors in application logs"

# Validate implementation with build tester  
/build-tester "Test the new user authentication feature I just implemented"

# Create feature worktree for parallel development
/create-feature-worktree user-dashboard

# Generate comprehensive feature plan
/generate-prp features/payment-integration.md
```

## CRITICAL DATABASE PROTECTION

### SAFE Migration Workflow (USE THESE):
```bash
# For schema changes - CREATE MIGRATIONS:
npx prisma migrate dev --name descriptive_name    # Creates migration file
bunx prisma migrate dev --name descriptive_name   # Safe for development

# Generate Prisma Client after schema changes:
npx prisma generate
bunx prisma generate
bun run db:generate

# Inspect database:
npx prisma studio
bunx prisma studio
bun run db:studio
```

### DANGEROUS Commands (NEVER USE):
```bash
# NEVER use these - they bypass migrations and can cause drift:
npx prisma db push          # Directly modifies DB without migration files
bunx prisma db push         # This causes the drift issues!
bun run db:push

# NEVER use in development:
npx prisma migrate deploy   # For production only
bunx prisma migrate deploy
bun run db:migrate

# NEVER reset without user permission:
npx prisma migrate reset    # Destroys all data
bunx prisma migrate reset
```

### Migration Best Practices:
1. **Always use `prisma migrate dev`** for schema changes - it creates migration files
2. **Never use `prisma db push`** - it modifies the database without creating migrations
3. **Commit migration files** to git immediately after creating them
4. **Ask the user** before running any command that might lose data

**WHY:** Using `db push` instead of `migrate dev` is what causes migration drift. Always create proper migration files to keep the database in sync.

## Log Analysis Policy

**CRITICAL: Always use the log-analyzer agent for any log/error analysis tasks.**

- **NEVER** run analysis commands directly including:
  - Log analysis commands (grep, tail, cat on log files)
  - Command output filtering (grep, head, etc. on command results)
  - Direct execution of typecheck, build, lint for error analysis
- **ALWAYS** use the log-analyzer agent via the Task tool for:
  - Running and analyzing typecheck output (`bun run typecheck`)
  - Running and analyzing build output (`bun run build`, `vercel build`)
  - Running and analyzing lint output (`bun run lint`)
  - Checking application logs (one.log)
  - Investigating runtime errors and exceptions
  - Monitoring application health and performance
  - Debugging issues from any command output
  - Filtering and parsing error messages

**Examples:**
```bash
# ❌ DON'T do this:
grep "error" one.log
tail -f one.log
bun run typecheck
bun run build
bun run lint
SKIP_ENV_VALIDATION=1 bun run typecheck 2>&1 | grep -E "(workflows|documents)"

# ❌ NEVER run Prisma database commands:
npx prisma db push
bunx prisma db push
bun run db:push
npx prisma migrate deploy
bunx prisma migrate deploy
bun run db:migrate
bun run db:generate

# ✅ DO this instead:
Task log-analyzer "Check for recent errors in application logs"
Task log-analyzer "Run typecheck and analyze any type errors"
Task log-analyzer "Run build and check for compilation issues"
Task log-analyzer "Run lint and analyze code quality issues"  
Task log-analyzer "Run typecheck and analyze workflow/document related errors"
Task log-analyzer "Monitor logs for performance issues"
```

**Why:** The log-analyzer agent is specifically trained on this codebase's error patterns, provides structured analysis, and gives actionable debugging insights.

## Architecture Overview

This is a **T3 Stack** application using Next.js App Router with the following architecture:

### Core Technologies
- **Next.js 15** with App Router for the frontend framework
- **tRPC** for type-safe API calls between client and server
- **Prisma** as the ORM with PostgreSQL database
- **NextAuth.js v5** for authentication (Discord OAuth + custom credentials)
- **Mantine** for UI components
- **TailwindCSS** for styling
- **TypeScript** throughout the codebase

### Project Structure

```
src/
├── app/                 # Next.js App Router pages and API routes
│   ├── _components/     # Shared UI components
│   ├── api/            # API route handlers
│   ├── dashboard/      # Dashboard page and components
│   └── register/       # Registration page
├── server/             # Server-side code
│   ├── api/            # tRPC router definitions
│   ├── auth/           # NextAuth.js configuration
│   └── db.ts           # Prisma client setup
├── trpc/               # tRPC client configuration
└── utils/              # Utility functions
```

### Key Architectural Patterns

1. **tRPC API Layer**: All server communication goes through type-safe tRPC procedures defined in `src/server/api/routers/`. The main router is in `src/server/api/root.ts`.

2. **Authentication Flow**: 
   - NextAuth.js configured in `src/server/auth/config.ts`
   - Supports Discord OAuth and custom email/password credentials
   - Session management integrated with Prisma adapter
   - Custom password hashing utility in `src/utils/password.ts`

3. **Database Layer**:
   - Prisma schema defines User, Post, Account, Session models
   - Uses PostgreSQL in production, SQLite for development
   - User model extended with business fields (company info, job title, etc.)

4. **Client-Side State**:
   - React Query for server state management via tRPC
   - Session state managed by NextAuth.js SessionProvider
   - Mantine for UI state and components

5. **Environment Configuration**:
   - Type-safe environment variables using `@t3-oss/env-nextjs`
   - Required: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`

### Adding New Features

1. **New API Endpoints**: Create tRPC procedures in `src/server/api/routers/` and add to main router
2. **New Pages**: Add to `src/app/` following App Router conventions
3. **New Components**: Place shared components in `src/app/_components/`
4. **Database Changes**: Modify `prisma/schema.prisma` and run `bun run db:generate`

### Authentication Integration

The app uses a dual authentication system:
- OAuth providers (Discord configured)
- Custom email/password with hashed passwords
- Session management through NextAuth.js with Prisma adapter
- User registration includes business information fields

### UI Framework

Uses Mantine v8 for components with custom theming. Key providers in root layout:
- MantineProvider for theme management
- Notifications for toast messages
- SessionProvider for auth state
- TRPCReactProvider for API state