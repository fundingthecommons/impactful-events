# Test Application Form

Runs comprehensive testing suite for the DynamicApplicationForm component to prevent performance issues, infinite loops, and data synchronization problems.

## Usage

```
/test-form
```

## Description

This command runs a complete testing suite specifically designed for the application form component, covering:

1. **Performance Tests**: Infinite loop detection and re-render monitoring
2. **Validation Tests**: Client-side validation logic verification  
3. **Scroll Tests**: Scroll-to-error behavior validation
4. **Integration Tests**: End-to-end user workflows
5. **Code Quality**: TypeScript and ESLint validation

## When to Use

- **Before making form changes**: Establish baseline behavior
- **After form modifications**: Ensure no regressions introduced
- **Before deployment**: Validate form stability
- **When debugging**: Isolate performance or behavior issues

## What It Tests

### Performance Issues Prevention
- Infinite re-render loop detection
- Console warning monitoring  
- Memory leak prevention
- Render timing validation

### Data Integrity Validation
- Form state persistence during saves
- onBlur saving mechanism verification
- Email auto-save functionality
- Frontend-backend synchronization

### User Experience Testing
- Scroll-to-error targeting correct fields
- Conditional field handling
- Missing fields display accuracy
- Save Draft functionality

## Implementation

The command runs:
```bash
./scripts/test-form.sh
```

Which executes:
- `bun run test:form-performance` - Performance regression tests
- `bun run test:form-validation` - Logic validation tests  
- `bun run test:form-scroll` - Scroll behavior tests
- `bun run test:form-integration` - End-to-end workflow tests
- `bun run typecheck` - TypeScript validation
- `bun run lint src/app/_components/DynamicApplicationForm.tsx` - Code quality

## Background

This testing suite was created after encountering critical issues:
- Infinite re-render loops causing browser hanging
- Data disappearing during auto-save operations
- Scroll-to-error targeting wrong fields
- Frontend-backend state synchronization problems

The tests prevent regression of these issues and catch similar problems early.

## Related Files

- `src/app/_components/__tests__/DynamicApplicationForm.test.tsx`
- `src/app/_components/__tests__/performance.test.tsx`
- `src/app/_components/__tests__/form-validation.test.tsx` 
- `src/app/_components/__tests__/scroll-behavior.test.tsx`
- `form-performance-lessons-learned.md`