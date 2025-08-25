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

7. **Proper Async/Await Usage (@typescript-eslint/await-thenable)**
   ```typescript
   // ❌ WRONG - fails Vercel build
   await someNonPromiseValue;
   await 42;
   
   // ✅ CORRECT - passes Vercel build
   await somePromise;
   await fetch('/api/data');
   const value = someNonPromiseValue; // Don't await non-promises
   ```

8. **Promise Misuse Prevention (@typescript-eslint/no-misused-promises)**
   ```typescript
   // ❌ WRONG - fails Vercel build
   if (fetchData()) { } // Promise in boolean context
   array.forEach(async item => await process(item)); // Async callback issues
   
   // ✅ CORRECT - passes Vercel build
   if (await fetchData()) { }
   await Promise.all(array.map(async item => await process(item)));
   ```

9. **TypeScript Comment Usage (@typescript-eslint/ban-ts-comment)**
   ```typescript
   // ❌ WRONG - fails Vercel build
   // @ts-ignore
   const result = someApi();
   
   // ✅ CORRECT - passes Vercel build
   const result = someApi() as ExpectedType;
   // @ts-expect-error: Legacy API compatibility
   const result = legacyApi();
   ```

10. **Consistent Type Imports (@typescript-eslint/consistent-type-imports)**
    ```typescript
    // ❌ WRONG - fails Vercel build
    import { User, createUser } from './user';
    
    // ✅ CORRECT - passes Vercel build
    import { type User, createUser } from './user';
    import type { User } from './user';
    import { createUser } from './user';
    ```

11. **No Unsafe Type Assertions (@typescript-eslint/no-unsafe-assignment)**
    ```typescript
    // ❌ WRONG - fails Vercel build
    const user: any = getUser();
    const name = user.name; // Unsafe access
    
    // ✅ CORRECT - passes Vercel build
    const user = getUser() as User;
    const name = user.name;
    // Or with proper typing
    interface User { name: string }
    const user: User = getUser();
    ```

12. **Prefer Modern Array Methods (@typescript-eslint/prefer-for-of)**
    ```typescript
    // ❌ WRONG - fails Vercel build
    for (let i = 0; i < array.length; i++) {
      console.log(array[i]);
    }
    
    // ✅ CORRECT - passes Vercel build
    for (const item of array) {
      console.log(item);
    }
    array.forEach(item => console.log(item));
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

### Automatic Code Validation
This project implements triple-protection ESLint integration:

1. **Prevention**: Comprehensive ESLint guidelines above prevent violations during code generation
2. **Immediate Feedback**: Post-edit hooks automatically run `bun run check` after file changes
3. **Comprehensive Validation**: Build-tester agent provides thorough validation for major features

The post-edit hook is configured in `.claude/settings.json` and runs automatically - no manual intervention required.

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

## Theme System Best Practices

### Overview
This project uses a comprehensive theme system with CSS custom properties and Mantine integration for consistent light/dark mode support across all pages and components.

### Core Architecture
- **CSS Custom Properties**: Theme-aware colors defined in `src/styles/globals.css`
- **Theme Provider**: `src/app/_components/ThemeProvider.tsx` manages theme state and sets `data-theme` attribute
- **Theme Hook**: `src/hooks/useTheme.ts` provides theme state management
- **Mantine Integration**: Seamlessly works with existing Mantine components

### ✅ Theme-Aware Coding Guidelines

#### 1. Use Theme-Aware Classes Instead of Hardcoded Colors
```tsx
// ❌ WRONG - Hardcoded light colors that won't adapt to dark theme
<div className="bg-gradient-to-br from-blue-50 via-white to-purple-50">
<div className="bg-purple-200 rounded-full">
<div className="border-white/50">

// ✅ CORRECT - Use theme-aware classes
<div className="bg-theme-gradient">
<div className="bg-theme-blob-1 rounded-full">  
<div className="border-theme-light">
```

#### 2. Prefer Mantine Semantic Colors
```tsx
// ❌ WRONG - Hardcoded text colors
<Text className="text-blue-900">
<Text style={{ color: '#1e293b' }}>

// ✅ CORRECT - Use Mantine semantic colors
<Text c="dimmed">  {/* Automatically adapts to theme */}
<Text fw={600}>    {/* Uses theme-aware font weight */}
<Text c="blue.7">  {/* Theme-aware blue shade */}
```

#### 3. Use CSS Custom Properties for Complex Styling
```tsx
// ❌ WRONG - Hardcoded gradients and colors
<Paper style={{ 
  background: 'linear-gradient(135deg, #dbeafe 0%, #faf5ff 100%)',
  border: '1px solid #bfdbfe'
}}>

// ✅ CORRECT - Theme-aware CSS custom properties
<Paper style={{ 
  background: 'var(--theme-mantine-gradient-bg)',
  border: '1px solid var(--theme-mantine-border)'
}}>
```

#### 4. Available Theme CSS Custom Properties
```css
/* Background gradients */
--theme-bg-gradient-main      /* Main page background gradient */
--theme-bg-primary            /* Alternative background gradient */

/* Decorative blob colors */
--theme-bg-blob-1             /* Purple blob color */
--theme-bg-blob-2             /* Blue blob color */ 
--theme-bg-blob-3             /* Pink blob color */

/* Surface colors */
--theme-surface-primary       /* Primary surface color */
--theme-surface-secondary     /* Secondary surface color */
--theme-border-light          /* Light border color */

/* Mantine integration */
--theme-mantine-gradient-bg   /* Mantine-compatible gradient */
--theme-mantine-border        /* Mantine-compatible border */
```

#### 5. Available Utility Classes
```css
.bg-theme-gradient     /* Main background gradient */
.bg-theme-blob-1       /* Purple decorative background */
.bg-theme-blob-2       /* Blue decorative background */
.bg-theme-blob-3       /* Pink decorative background */
.border-theme-light    /* Theme-aware light border */
```

### 🚫 Common Theming Mistakes to Avoid

#### 1. Never Use Hardcoded Light/Dark Colors
```tsx
// ❌ These will NOT adapt to dark theme
className="bg-blue-50 text-gray-900"
className="bg-white border-gray-200"  
className="from-blue-50 to-purple-50"
style={{ backgroundColor: '#ffffff' }}
```

#### 2. Don't Mix Theming Approaches
```tsx
// ❌ Mixing hardcoded and theme-aware styles
<div className="bg-blue-50">  {/* Hardcoded */}
  <Text c="dimmed">Content</Text>  {/* Theme-aware */}
</div>

// ✅ Use consistent theme-aware approach
<div className="bg-theme-gradient">
  <Text c="dimmed">Content</Text>
</div>
```

#### 3. Avoid Component-Specific Color Overrides
```tsx
// ❌ Don't override component colors manually
<Button style={{ backgroundColor: '#3b82f6' }}>

// ✅ Use Mantine's color system
<Button color="blue" variant="filled">
```

### 🔧 Adding New Theme Colors

#### 1. Add to CSS Custom Properties
```css
/* In src/styles/globals.css */
:root, [data-theme="light"] {
  --theme-new-color: #your-light-color;
}

[data-theme="dark"] {
  --theme-new-color: #your-dark-color;
}
```

#### 2. Create Utility Class
```css
.bg-theme-new-color {
  background-color: var(--theme-new-color);
}
```

#### 3. Document in This File
Update the available properties list above when adding new theme colors.

### 🧪 Testing Theme Implementation

#### Always Test Both Themes
```bash
# After implementing theme-aware styling, always test:
SKIP_ENV_VALIDATION=1 bun run build  # Ensure build succeeds
SKIP_ENV_VALIDATION=1 bun run check  # Validate code quality
```

1. **Manual Testing**: Use the theme toggle to switch between light/dark modes
2. **Visual Inspection**: Ensure no mixed light/dark elements appear
3. **Build Validation**: Run build and typecheck to catch any issues

### 📚 When to Use Each Approach

| Use Case | Recommended Approach |
|----------|---------------------|
| Page backgrounds | `bg-theme-gradient` utility class |
| Decorative elements | `bg-theme-blob-*` utility classes |
| Text content | Mantine `c="dimmed"` or `c="primary"` |
| Interactive elements | Mantine color system (`color="blue"`) |
| Complex gradients | CSS custom properties |
| Status colors (green/red/yellow) | Keep hardcoded (semantic consistency) |

### 🛡️ Prevention Measures

1. **Code Review Checklist**: Always check for hardcoded colors in new code
2. **Search Before Writing**: Use existing theme utilities before creating new ones
3. **Test Early**: Switch themes during development, not just at the end
4. **Component Consistency**: Keep theming approach consistent within components

This theme system ensures a seamless user experience across light and dark modes while maintaining visual consistency and developer productivity.

## Form Development & Testing Standards

### Overview

Form components require special attention due to complexity around state management, auto-save functionality, and user experience. This project has comprehensive testing and quality standards for forms based on lessons learned from performance issues and data synchronization problems.

### Form Testing Requirements

#### Before ANY Form Changes
```bash
# Required: Run existing form test suite
bun run test:form

# Required: Manual performance check  
# Load form, check console for warnings/errors

# Required: Test primary user journey
# Fill form → Save draft → Submit workflow
```

#### After Form Changes
```bash
# Required: Comprehensive form testing
./scripts/test-form.sh

# Required: Agent-based review
/form-quality-check

# Required: Manual testing on real device
# Test on mobile (onBlur behavior different)
```

### Form Development Standards

#### Architecture Pattern: Hybrid Data Flow
```
Page Load: Server → Frontend (hydration)
User Interaction: Frontend authority (single source of truth)  
Form Submission: Frontend → Server (persistence)
```

#### Performance Requirements
- **Maximum 2 useEffects** per form component
- **Client-side validation** during editing (no server round trips)
- **onBlur saving** for text inputs (not keystroke auto-save)
- **Stable dependencies** in useEffect (no object references)

#### React Anti-Patterns to Avoid
```typescript
// ❌ Bad: Unstable useEffect dependencies
useEffect(() => {}, [existingApplication?.responses]);

// ✅ Good: Stable primitive dependencies  
useEffect(() => {}, [hasInitialized]);

// ❌ Bad: Multiple conflicting data sources
const serverData = api.getCompletion.useQuery();
const serverData2 = api.getApplication.useQuery(); 
const serverData3 = api.getStatus.useQuery();

// ✅ Good: Single source of truth during editing
const isComplete = useMemo(() => validateClientSide(), [formValues]);

// ❌ Bad: Refetching after every save
await saveField();
void refetchData(); // Causes form reset!

// ✅ Good: Trust optimistic updates
await saveField();
// No refetch needed
```

### Automated Testing

#### Test Categories
1. **Performance Tests**: Infinite loop prevention, re-render monitoring
2. **Validation Tests**: Client-side logic verification, conditional fields
3. **Scroll Tests**: Error targeting, field prioritization  
4. **Integration Tests**: Complete user workflows, data persistence

#### Test Scripts
```bash
# All form tests
bun run test:form

# Specific test suites
bun run test:form-performance     # Critical: Infinite loop detection
bun run test:form-validation      # Logic correctness
bun run test:form-scroll         # UX behavior
bun run test:form-integration    # End-to-end workflows

# Development workflow
bun run test:form-watch          # Live testing during development
./scripts/test-form.sh           # Complete test suite
```

#### Performance Monitoring
Tests automatically detect:
- Infinite re-render loops (>10 renders in test period)
- Console warnings/errors during normal use
- Memory leaks from improper cleanup
- Render timing regressions (>1 second load time)

### Quality Gates

#### Automated Quality Gates (Enforced)
- ✅ **Pre-commit hooks**: Automatically run `bun run test:form` before every commit
- ✅ **Pre-push hooks**: Run comprehensive test suite before pushing to remote
- ✅ **GitHub Actions**: Form tests run automatically on PRs affecting form components
- ✅ **Build validation**: Ensures deployment readiness before push

#### Manual Checks Before Deployment
- [ ] Build-tester agent review (`/form-quality-check`)
- [ ] Console clean (no warnings/violations in development)
- [ ] Complete user workflow tested manually
- [ ] Data integrity verified (frontend matches backend)

#### Code Review Checklist
- [ ] **Forms**: Submit workflow tested end-to-end
- [ ] **Performance**: No infinite loops or excessive re-renders
- [ ] **Data flow**: Hybrid pattern followed correctly
- [ ] **Error handling**: Graceful failure modes implemented
- [ ] **Testing**: New tests added for complex functionality

### Custom Commands

#### `/test-form`
Runs comprehensive form test suite including performance, validation, scroll behavior, and integration tests.

#### `/form-quality-check`  
Uses specialized agents to review form components for React anti-patterns, performance issues, and architectural problems.

### Common Form Issues & Prevention

#### Issue: Infinite Re-render Loops
**Prevention**: 
- Use initialization guards (`hasInitialized` state)
- Stable useEffect dependencies only
- Performance tests catch excessive renders

#### Issue: Data Disappearing During Auto-save
**Prevention**:
- No refetching after successful saves
- Optimistic updates pattern
- Data persistence tests validate behavior

#### Issue: Frontend-Backend State Mismatch  
**Prevention**:
- Hybrid data flow pattern
- Client-side validation during editing
- Integration tests verify data integrity

#### Issue: Poor Scroll-to-Error Behavior
**Prevention**:
- Shared conditional field detection logic
- Consistent filtering across validation and scroll
- Specific tests for scroll targeting

This comprehensive framework prevents the form performance and data integrity issues previously encountered while ensuring reliable, maintainable form components.

## Email Template System

### Overview

The platform uses a centralized email template system built with React Email for all automated communications. All email templates are located in `/src/server/email/templates/` and use a unified EmailService for sending.

### Email Templates Available

- **Application Status Changes**:
  - `applicationAccepted.tsx` - Congratulations email with program details
  - `applicationRejected.tsx` - Respectful rejection with future opportunities
  - `applicationWaitlisted.tsx` - Waitlist notification with timeline
  - `applicationSubmitted.tsx` - Submission confirmation
  - `applicationMissingInfo.tsx` - Request to complete missing fields

- **System Communications**:
  - `invitation.tsx` - Event role and admin invitations
  - `base.tsx` - Shared template wrapper with consistent branding

### Automatic Email Triggers

**Application Status Changes**:
- When admin updates application status to ACCEPTED/REJECTED/WAITLISTED
- Bulk status updates automatically send emails to all affected applicants
- Email sending happens asynchronously - status updates succeed even if emails fail

**Integration Points**:
- `src/server/api/routers/application.ts:448-467` - Single status updates
- `src/server/api/routers/application.ts:489-533` - Bulk status updates

### Email Service Usage

```typescript
// Import the service
import { getEmailService } from '~/server/email/emailService';

// Send status change email
const emailService = getEmailService(db);
const result = await emailService.sendApplicationStatusEmail(application, 'ACCEPTED');

// Send custom template email
const result = await emailService.sendEmail({
  to: 'user@example.com',
  templateName: 'applicationAccepted',
  templateData: {
    applicantName: 'John Doe',
    eventName: 'FtC Residency',
    // ... other props
  },
  applicationId: 'app-id',
  eventId: 'event-id'
});
```

### Database Tracking

All emails are logged in the `Email` model with:
- Template name and version used
- Template data (JSON) for reproducing emails
- Send status (QUEUED → SENT/FAILED)
- Postmark message ID for delivery tracking
- Engagement tracking fields (openedAt, clickedAt)

### Admin Panel Access

**View Sent Emails**: `/admin/emails`
- Complete email history with filters
- Preview email content and template data
- Resend failed emails
- Track delivery status via Postmark IDs

### Development & Testing

**Email Environment Modes**:
- `EMAIL_MODE=development` - Redirects to `TEST_EMAIL_OVERRIDE`
- `EMAIL_MODE=staging` - Redirects to test email with [STAGING] prefix
- `EMAIL_MODE=production` - Sends to actual recipients

**Testing Status Emails**:
1. Create test application in admin panel
2. Change status to ACCEPTED/REJECTED/WAITLISTED
3. Check `/admin/emails` to verify email was sent
4. In development mode, check `TEST_EMAIL_OVERRIDE` inbox

### Adding New Templates

1. **Create Template Component**:
   ```typescript
   // src/server/email/templates/newTemplate.tsx
   export interface NewTemplateProps {
     // Define props
   }
   
   export const NewTemplate: React.FC<NewTemplateProps> = ({ props }) => (
     <BaseTemplate previewText="Preview text">
       {/* Template content */}
     </BaseTemplate>
   );
   ```

2. **Register Template**:
   ```typescript
   // src/server/email/templates/index.ts
   export const templates = {
     // ... existing templates
     newTemplate: NewTemplate,
   };
   
   export const templateToEmailType = {
     // ... existing mappings
     newTemplate: 'NEW_EMAIL_TYPE',
   };
   ```

3. **Update EmailType Enum**:
   ```prisma
   // prisma/schema.prisma
   enum EmailType {
     // ... existing types
     NEW_EMAIL_TYPE
   }
   ```

4. **Create Migration**:
   ```bash
   bunx prisma migrate dev --name "add-new-email-type"
   ```

### Email Safety & Environment Handling

The system includes multiple safety layers:
- Development emails redirect to test address
- Staging emails clearly labeled with [STAGING] prefix
- Production emails sent to actual recipients
- Failed emails logged with error details
- Resend capability for failed deliveries

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

## Automatic ESLint Validation

**CRITICAL: Post-edit hooks automatically run `bun run check` after file changes.**

- **No manual validation needed** - hooks provide immediate ESLint feedback
- **Fast feedback loop** - catches violations instantly without slow builds
- **Build-tester integration** - use for comprehensive feature validation only

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