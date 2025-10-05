# Claude Code Auto-Learning Quality System

A hybrid system that learns from your actual coding mistakes to prevent future ESLint/TypeScript violations, dramatically reducing post-edit fix cycles.

## Overview

This system combines **live configuration reading** with **automated error pattern learning** to achieve ESLint compliance on first code generation. It automatically detects project types and applies appropriate rules.

## Core Innovation

Instead of manually documenting every possible ESLint rule, the system:
1. **Reads your live ESLint config** directly (`@eslint.config.js`, etc.)
2. **Learns from actual errors** you encounter during development  
3. **Prevents repeat violations** by referencing historical patterns

## Two-Level Architecture

### Global Level (`~/.claude/CLAUDE.md`)
- **Universal patterns** that apply across projects
- **Project detection logic** (Next.js, React, Vue, Node.js, etc.)
- **Cross-project error learning** from `~/.claude/logs/`
- **Zero setup** - works in any project directory

### Project Level (`./CLAUDE.md`) 
- **Project-specific rules** and context
- **Team-shareable** via git commits
- **Overrides global settings** when needed
- **Local error logs** in `.claude/logs/`

## Installation

### 1. Create Global Directory
```bash
mkdir -p ~/.claude/logs
```

### 2. Create Global Configuration
Create `~/.claude/CLAUDE.md`:

```markdown
# Global Claude Code Configuration

## HYBRID AUTO-LEARNING CODE QUALITY SYSTEM

### Live Configuration Sources (Project-Specific)
- @eslint.config.js OR @.eslintrc.cjs OR @.eslintrc.json (Auto-detects)
- @.editorconfig (Project formatting)
- @tsconfig.json (TypeScript config when present)

### Global Auto-Learning Error Patterns
- @~/.claude/logs/eslint-violations.md (Cross-project patterns)
- @~/.claude/logs/typescript-errors.md (Type error patterns)
- @~/.claude/logs/build-failures.md (Build issue patterns)
- @.claude/logs/eslint-violations.md (Project-specific, if present)

### System Mandate
Generate code that complies with detected project configuration and avoids historical error patterns. Learn from actual mistakes across all projects.

## PROJECT DETECTION & ADAPTATION

### Framework Detection
```javascript
// Check package.json dependencies:
"next" → Next.js project (strict TypeScript rules)
"react" → React project (follow project conventions)
"vue" → Vue.js project (follow project conventions)
"@angular/core" → Angular project (follow project conventions)
"express" → Node.js/Express API (follow project conventions)
```

### Package Manager Detection
```bash
# Auto-detect from lock files:
bun.lockb → use `bun` commands
yarn.lock → use `yarn` commands  
pnpm-lock.yaml → use `pnpm` commands
package-lock.json → use `npm` commands
```

## PROJECT-SPECIFIC RULES (Customize This Section)

### Next.js + TypeScript Projects Only
**Apply strict rules ONLY when:**
1. Project has `"next"` dependency in package.json
2. Project has TypeScript config or dependency

#### Strict TypeScript Patterns
- Never use `any` type - use `unknown` or proper interfaces
- Always use `??` instead of `||` for defaults
- Proper async/await with error handling
- Type-safe component props

### Other Project Types
- Follow project's existing patterns and conventions
- Respect project's linting configuration
- Use appropriate language/framework idioms
```

### 3. Create Error Log Templates
Create these files in `~/.claude/logs/`:

**`eslint-violations.md`:**
```markdown
# Global ESLint Violations Auto-Learning Log

## Format
## [Date] - Rule Name - [Project: name]
**Problem**: Description
**Project Type**: Framework + Language + Build System
**Code Context**: Actual violating code
**Fix Applied**: How it was resolved
**Prevention**: Pattern for future

## Usage
Referenced by ~/.claude/CLAUDE.md for first-try ESLint compliance.
```

**`typescript-errors.md`** and **`build-failures.md`** follow similar format.

## Usage

### Starting Work
1. `cd` into any project directory
2. Run `claude` - system automatically:
   - Detects project type and framework
   - Reads project's ESLint/TypeScript config
   - References global error patterns
   - Applies appropriate code generation rules

### Natural Development
- Ask for features naturally: "Add a user profile component"
- System generates framework-appropriate code
- Follows your specific linting rules
- No commands or templates required

## Enhanced Commands (Optional)

Add to your project's `.claude/commands/`:

**`fix-build-errors.md`:**
```markdown
# Fix Build Errors (with Auto-Learning)

## Description
1. Run project's build command (auto-detects npm/yarn/bun/pnpm)
2. Use log-analyzer agent to identify and fix errors
3. **Auto-log error patterns** to appropriate log files
4. Repeat until build succeeds

## Auto-Learning
Logs violations to:
- ~/.claude/logs/eslint-violations.md (global patterns)
- .claude/logs/eslint-violations.md (project-specific)
```

## How Error Learning Works

### When Errors Occur
System automatically captures:
```markdown
## 2025-01-05 14:30 - @typescript-eslint/prefer-nullish-coalescing - [Project: my-app]

**Problem**: Used || instead of ?? for defaults
**Project Type**: Next.js + TypeScript + Vercel
**File**: src/components/UserProfile.tsx:42
**Code Context**: const displayName = user.name || 'Anonymous';
**Fix Applied**: const displayName = user.name ?? 'Anonymous';
**Prevention**: Always use ?? for defaults in TypeScript projects
```

### Prevention in Future Code
Next time you ask for a component, Claude:
1. Reads your live ESLint config
2. References historical error patterns
3. Generates compliant code on first try
4. No post-edit fix cycles needed

## Benefits

### Individual Developer
- **80%+ reduction** in ESLint violations on first generation
- **Faster development** - no fix-after cycles
- **Cross-project learning** - mistakes in one project help all projects
- **Zero maintenance** - system learns automatically

### Team Benefits
- **Consistent quality** across all team members
- **Shared learning** via git-committed error logs
- **Easy onboarding** - new members see real project examples
- **Framework agnostic** - works with any tech stack

## Real-World Example

**Before Auto-Learning:**
1. Generate React component
2. ESLint fails: "Prefer nullish coalescing"
3. Fix: Change `||` to `??`
4. Re-run linting
5. Repeat for other violations

**After Auto-Learning:**
1. Generate React component
2. ✅ Passes ESLint on first try
3. Ready to commit immediately

## Customization

### For Your Team's Rules
Modify the "PROJECT-SPECIFIC RULES" section in `~/.claude/CLAUDE.md` to match your team's specific requirements:

- **Strict rules for certain frameworks** (Next.js, etc.)
- **Relaxed rules for others** (prototypes, experiments)
- **Company-specific patterns** and conventions
- **Custom ESLint rule explanations**

### Per-Project Overrides
Create project-specific `./CLAUDE.md` files for:
- Special project requirements
- Team-specific documentation  
- Project-specific error patterns
- Local development conventions

## Advanced Features

### Automatic Build Commands
System detects and runs appropriate commands:
```bash
/fix-build-errors  # Auto-detects: npm/yarn/bun/pnpm run build
```

### Cross-Framework Learning
Error patterns from Next.js projects can inform React projects, Vue projects inform Angular projects, etc.

### Smart Rule Application
- **Next.js + TypeScript**: Strict ESLint/TypeScript rules
- **Vue + JavaScript**: Follow Vue conventions
- **Python Flask**: Follow Python patterns
- **Any framework**: Respects existing linting configuration

## Installation for Teams

### Share via Git Repository
1. Create a shared repository with your `~/.claude/` setup
2. Team members clone and symlink:
   ```bash
   git clone https://github.com/yourteam/claude-config
   ln -s $(pwd)/claude-config/CLAUDE.md ~/.claude/CLAUDE.md
   ln -s $(pwd)/claude-config/logs ~/.claude/logs
   ```

### Share via Documentation
1. Share this markdown file with installation instructions
2. Each team member sets up their own global configuration
3. Project-specific `.claude/` folders get committed to project repos

## Success Metrics

After implementing this system, you should see:
- **Dramatically fewer** post-edit ESLint failures
- **Faster development velocity** through prevention-first approach
- **Consistent code quality** across different projects
- **Accelerated learning** of new frameworks and patterns
- **Growing team knowledge base** captured in learnable patterns

The system creates a positive feedback loop: the more you use it, the smarter it gets, leading to even better code generation over time.