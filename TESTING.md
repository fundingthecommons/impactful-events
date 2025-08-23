# FTC Platform Testing Documentation

## Overview

This document describes the comprehensive automated testing system for the FTC Platform, with a focus on **email safety** and **application lifecycle management**. The testing suite ensures you can deploy rapidly with confidence that no unintended emails will be sent to users.

## Quick Start

```bash
# Run all tests
bun run test:all

# Run specific test suites
bun run test:unit          # Unit tests only
bun run test:integration   # Integration tests only
bun run test:e2e           # End-to-end tests only
bun run test:email         # Email-specific tests only

# Development mode
bun run test:watch         # Watch mode for TDD
bun run test:ui            # Vitest UI for debugging

# CI/CD verification
bun run test:ci            # Full test suite with coverage
```

## Testing Architecture

### 1. Email Safety System

**CRITICAL**: The email safety system prevents any real emails from being sent during testing.

#### Mock Email Service (`tests/mocks/email.ts`)
- Captures all email send attempts
- Provides assertion helpers for email verification
- Generates audit reports of all email activity
- Simulates email failures for error handling tests

#### Key Features:
- **Complete Isolation**: All email sends are mocked, no Postmark API calls
- **Audit Trail**: Every email attempt is logged and can be verified
- **Assertion Helpers**: 
  - `assertEmailSent()` - Verify specific email was sent
  - `assertNoEmailsSent()` - Ensure no emails were sent
  - `assertEmailCount()` - Verify exact number of emails
  - `assertEmailContent()` - Check email content

#### Example Usage:
```typescript
// Verify submission email
mockEmailService.assertEmailSent({
  to: 'user@example.com',
  subject: 'Application Submitted',
  type: 'STATUS_UPDATE'
});

// Ensure no unexpected emails
mockEmailService.assertNoEmailsSent();

// Generate audit report
console.log(mockEmailService.generateAuditReport());
```

### 2. Test Database Strategy

#### Configuration
- **Isolated Test Database**: Separate PostgreSQL instance
- **Transaction Rollback**: Each test runs in a transaction
- **Seed Data**: Consistent fixtures for testing
- **Migration Testing**: Verify schema changes

#### Database Helpers (`tests/helpers/database.ts`)
- `resetDatabase()` - Clear all data between tests
- `seedTestDatabase()` - Create standard test data
- `withTestTransaction()` - Run tests in rollback transactions
- `ensureTestDatabase()` - Create test DB if needed

### 3. Test Factories

#### Factory Pattern (`tests/factories/index.ts`)
Create test data easily with sensible defaults:

```typescript
// Create a complete application scenario
const scenario = await factories.scenario.completeApplication();

// Create individual entities
const user = await factories.user.create();
const event = await factories.event.create();
const application = await factories.application.create(user.id, event.id);
```

## Test Suites

### Unit Tests (`tests/unit/`)

**Focus**: Business logic and component behavior

- **Application Lifecycle**: State transitions, completion tracking
- **Email Triggers**: When emails should/shouldn't be sent
- **Validation Logic**: Form validation, required fields
- **Permission Checks**: Role-based access control

Run with: `bun run test:unit`

### Integration Tests (`tests/integration/`)

**Focus**: API endpoints and database operations

- **tRPC Procedures**: Full API testing
- **Database Operations**: Complex queries, transactions
- **Email Integration**: Email sending with database logging
- **Authentication Flows**: Login, registration, session management

Run with: `bun run test:integration`

### E2E Tests (`tests/e2e/`)

**Focus**: Complete user journeys

- **Application Journey**: Registration → Application → Submission
- **Admin Workflows**: Review → Missing Info → Acceptance
- **Email Verification**: Ensuring correct emails at each step
- **Performance**: Auto-save, network interruptions

Run with: `bun run test:e2e`

## Email Testing Deep Dive

### Email Trigger Points

The system sends emails at these specific points:

1. **Application Submission** (Automatic)
   - Trigger: Status changes to SUBMITTED
   - Email: Confirmation with tracking info
   - Test: `email-triggers.test.ts`

2. **Missing Information** (Manual)
   - Trigger: Admin creates missing info email
   - Email: List of required fields
   - Test: `email-triggers.test.ts`

3. **Status Updates** (Automatic)
   - Trigger: ACCEPTED/REJECTED/WAITLISTED
   - Email: Decision notification
   - Test: `email-triggers.test.ts`

4. **Invitations** (Automatic)
   - Trigger: Invitation creation
   - Email: Role invitation with token
   - Test: `email-triggers.test.ts`

### Email Safety Verification

```typescript
describe('Email Safety', () => {
  it('should never send real emails in tests', async () => {
    // All emails go through mock
    await submitApplication();
    
    // Verify mock was used
    expect(mockEmailService.getSentEmails()).toHaveLength(1);
    
    // Verify environment safety
    expect(process.env.EMAIL_MODE).toBe('test');
  });
});
```

## CI/CD Pipeline

### GitHub Actions Workflow (`.github/workflows/test.yml`)

The CI pipeline runs automatically on:
- Push to main/develop branches
- Pull requests

#### Jobs:
1. **Lint & Type Check**: Code quality gates
2. **Unit & Integration Tests**: Core functionality
3. **E2E Tests**: User journeys
4. **Email Audit**: Email safety verification
5. **Build Verification**: Production build check
6. **Security Scan**: Dependency and secret scanning

### Pre-Deployment Checklist

✅ **Automated Checks**:
```bash
# Run full test suite
bun run test:all

# Verify no lint errors
bun run lint

# Type checking passes
bun run typecheck

# Build succeeds
bun run build
```

✅ **Email Safety Verification**:
```bash
# Run email-specific tests
bun run test:email

# Check email audit report
# (Generated after test run)
```

## Environment Variables for Testing

```env
# Test Database
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/ftc_test

# Email Safety
EMAIL_MODE=test
TEST_EMAIL_OVERRIDE=test@example.com

# Authentication (test values)
AUTH_SECRET=test-secret-for-testing-only
AUTH_URL=http://localhost:3000

# Skip validation in tests
SKIP_ENV_VALIDATION=true
```

## Writing New Tests

### 1. Unit Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { mockEmailService } from '../mocks/email';
import { factories } from '../factories';

describe('Feature Name', () => {
  beforeEach(() => {
    mockEmailService.reset();
  });

  it('should do something', async () => {
    // Arrange
    const user = await factories.user.create();
    
    // Act
    const result = await performAction(user);
    
    // Assert
    expect(result).toBe(expected);
    mockEmailService.assertNoEmailsSent();
  });
});
```

### 2. E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test('user journey', async ({ page }) => {
  // Navigate
  await page.goto('/events');
  
  // Interact
  await page.click('button:has-text("Apply")');
  
  // Verify
  await expect(page).toHaveURL('/application');
});
```

## Troubleshooting

### Common Issues

1. **Test Database Connection Failed**
   ```bash
   # Create test database
   createdb ftc_test
   
   # Run migrations
   DATABASE_URL=$TEST_DATABASE_URL bunx prisma migrate deploy
   ```

2. **Email Tests Failing**
   - Ensure `mockEmailService.reset()` in `beforeEach`
   - Check email type matches expected value
   - Verify all email fields in assertions

3. **E2E Tests Timing Out**
   - Increase timeout in playwright.config.ts
   - Check if dev server is running
   - Verify selectors are correct

## Best Practices

### 1. Email Testing
- Always reset mock email service before each test
- Verify both positive (email sent) and negative (no email) cases
- Use email audit reports for debugging
- Test email failure scenarios

### 2. Database Testing
- Use transactions for test isolation
- Create minimal required data
- Use factories for consistent test data
- Clean up after tests

### 3. E2E Testing
- Use data-testid attributes for reliable selectors
- Test happy paths and error cases
- Verify email indicators in UI
- Test with different user roles

## Performance Benchmarks

Target test execution times:
- Unit tests: < 30 seconds
- Integration tests: < 2 minutes
- E2E tests: < 5 minutes
- Full suite: < 10 minutes

## Continuous Improvement

### Coverage Goals
- Overall: 80% minimum
- Critical paths: 100% coverage
- Email system: 100% coverage
- New features: Tests required before merge

### Monitoring
- Track test execution times
- Monitor flaky tests
- Review coverage reports weekly
- Update tests with bug fixes

## Support

For test-related issues:
1. Check this documentation
2. Review existing test examples
3. Run tests with `--debug` flag
4. Check CI logs for failures

## Conclusion

This testing system provides:
- ✅ **Complete email safety** - No accidental emails to users
- ✅ **Rapid deployment** - Full suite runs in <10 minutes
- ✅ **High confidence** - Comprehensive coverage of critical paths
- ✅ **Easy debugging** - Detailed audit trails and reports
- ✅ **Scalable approach** - Easy to add new tests

With this testing infrastructure, you can deploy changes rapidly while being confident that the application lifecycle and email system work correctly without risk of unintended communications.