# Form Testing Guide

## Overview

This document provides comprehensive testing guidelines for form components in the FTC Platform, specifically designed to prevent performance issues, infinite loops, and data synchronization problems that were encountered during development.

## Quick Start

### Run All Form Tests
```bash
# Complete test suite
./scripts/test-form.sh

# Or individual test categories
bun run test:form                 # All form tests
bun run test:form-performance     # Performance regression detection
bun run test:form-validation      # Validation logic tests
bun run test:form-scroll         # Scroll behavior tests
bun run test:form-integration    # End-to-end workflows
```

### Development Workflow
```bash
# During development (watch mode)
bun run test:form-watch

# Before making changes
bun run test:form

# Before deployment
./scripts/test-form.sh && bun run build
```

## Test Categories

### 1. Performance Tests (`performance.test.tsx`)

**Purpose**: Prevent infinite re-render loops and performance regressions

**Tests Include**:
- Infinite loop prevention (render count monitoring)
- Console warning detection
- Memory leak prevention  
- Render timing validation

**Critical Test**:
```typescript
it('should not re-render infinitely on load', async () => {
  // Monitors render count over time
  // Fails if >10 renders in test period
  // Prevents infinite loop regressions
});
```

### 2. Validation Logic Tests (`form-validation.test.tsx`)

**Purpose**: Ensure client-side validation logic works correctly

**Tests Include**:
- Conditional field detection accuracy
- Missing fields calculation correctness
- Form completion status validation
- Edge case handling (whitespace, undefined values)

**Critical Test**:
```typescript
it('should correctly identify conditional fields', () => {
  // Tests "if you answered other" field detection
  // Ensures conditional fields not treated as required
});
```

### 3. Scroll Behavior Tests (`scroll-behavior.test.tsx`)

**Purpose**: Ensure scroll-to-error targets correct fields

**Tests Include**:
- Correct field targeting (actual required fields only)
- Conditional field exclusion from scroll targets
- Focus management after scroll
- Multiple missing fields prioritization

**Critical Test**:
```typescript
it('should scroll to actual missing required field, not conditional field', async () => {
  // Ensures scroll never targets "specify other" fields
  // Validates proper required field prioritization
});
```

### 4. Integration Tests (`form-integration.test.tsx`)

**Purpose**: End-to-end workflow validation

**Tests Include**:
- Complete submission workflow
- Save Draft functionality
- Social media handle conversion
- Error recovery scenarios
- Data persistence across sessions

**Critical Test**:
```typescript
it('should complete full application submission workflow', async () => {
  // Tests entire user journey from load to submit
  // Validates data integrity throughout process
});
```

## Manual Testing Requirements

### Before ANY Form Changes

#### Performance Check
1. Load form in browser
2. Open developer console
3. Check for warnings/errors
4. Monitor render performance

#### User Journey Test
1. Fill form progressively
2. Use Save Draft functionality
3. Test complete submit workflow
4. Verify data persistence

### After Form Changes

#### Regression Testing
1. Run full test suite: `./scripts/test-form.sh`
2. Manual device testing (desktop + mobile)
3. Agent-based review: `/form-quality-check`
4. Network condition testing (slow/offline)

#### Specific Scenarios
- **Social media fields**: Test handle input converts to URLs
- **Conditional fields**: Test "specify other" logic
- **Auto-save**: Test onBlur saving works reliably
- **Draft saving**: Test explicit Save Draft button

## Common Issues & Detection

### Infinite Re-render Loops

**Symptoms**:
- Browser tab hanging/freezing
- Console spam: repeated component logs
- Performance violations: `'input' handler took 200ms+`

**Detection**:
```bash
bun run test:form-performance
```

**Prevention**:
- Use initialization guards (`hasInitialized`)
- Stable useEffect dependencies only
- Client-side validation (no server round trips)

### Data Disappearing Issues

**Symptoms**:
- Text disappears while typing
- Data reappears on page refresh
- Form resets during auto-save

**Detection**:
```bash
bun run test:form-integration
```

**Prevention**:
- No refetching after saves
- Optimistic updates pattern
- Proper error handling for failed saves

### Scroll-to-Error Problems

**Symptoms**:
- Scrolls to wrong field on validation
- Targets conditional fields instead of required ones
- User confusion about field requirements

**Detection**:
```bash
bun run test:form-scroll
```

**Prevention**:
- Shared conditional field detection
- Consistent validation and scroll logic
- Proper field prioritization

## Custom Claude Code Commands

### `/test-form`
```bash
# Usage in Claude Code
/test-form
```
Runs complete form testing suite with performance monitoring.

### `/form-quality-check`
```bash  
# Usage in Claude Code
/form-quality-check
```
Uses specialized agents for comprehensive form component review.

## Development Best Practices

### Architecture Pattern
```
Page Load: Server → Frontend (hydration)
User Interaction: Frontend authority (single source of truth)
Form Submission: Frontend → Server (persistence)
```

### Performance Standards
- Maximum 2 useEffects per component
- Client-side validation during editing
- onBlur saving for text inputs
- Stable useEffect dependencies

### Quality Gates
- All automated tests passing
- Console clean in development
- Agent review completed
- Manual workflow testing verified

## Test File Organization

```
src/app/_components/__tests__/
├── DynamicApplicationForm.test.tsx    # Main component tests
├── performance.test.tsx               # Performance monitoring
├── form-validation.test.tsx           # Logic validation
├── scroll-behavior.test.tsx           # UX behavior
├── setup.ts                          # Test environment setup
└── vitest.config.ts                  # Vitest configuration
```

## Related Documentation

- `form-performance-lessons-learned.md` - Detailed analysis of past issues
- `CLAUDE.md` - Project form development standards
- `.claude/commands/` - Custom testing commands
- `scripts/test-form.sh` - Test execution script

## Troubleshooting

### Tests Failing?
1. Check test setup in `src/app/_components/__tests__/setup.ts`
2. Verify mocks are properly configured
3. Run individual test suites to isolate issues
4. Check for dependency updates affecting test environment

### Performance Issues?
1. Run performance tests: `bun run test:form-performance`
2. Check browser console for warnings
3. Use React DevTools Profiler
4. Review component with build-tester agent

### Form Not Working?
1. Run integration tests: `bun run test:form-integration`
2. Check data flow with manual testing
3. Verify auto-save mechanisms working
4. Test on different devices/browsers

This comprehensive testing framework ensures form reliability and prevents the performance and data integrity issues previously encountered.