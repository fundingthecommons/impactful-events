# Sentry + Slack Integration Setup

This guide walks you through setting up Sentry error monitoring with Slack notifications for the FTC Platform.

## Step 1: Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project:
   - Choose "Next.js" as the platform
   - Name it "ftc-platform"
   - Set organization to "ftc-platform" (or your preferred org name)
3. Copy the DSN from the project settings

## Step 2: Configure Environment Variables

Add these variables to your `.env` file:

```bash
# Sentry Error Monitoring
SENTRY_DSN="https://your-dsn@sentry.io/project-id"
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/project-id"
SENTRY_AUTH_TOKEN="your-auth-token"
```

### Getting the Auth Token:
1. Go to Sentry → Settings → Account → API → Auth Tokens
2. Create new token with scopes: `org:read`, `project:releases`
3. Copy the token to `SENTRY_AUTH_TOKEN`

## Step 3: Set Up Slack Integration

### Option A: Sentry's Built-in Slack Integration (Recommended)

1. In your Sentry project, go to **Settings → Integrations**
2. Find **Slack** and click **Install**
3. Follow OAuth flow to connect your Slack workspace
4. Configure which channel receives notifications
5. Set up **Alert Rules**:
   - Go to **Alerts → Alert Rules**
   - Create new rule with conditions like:
     - "An event is seen"
     - "An error event is seen more than 5 times in 1 minute"
   - Set action to "Send a Slack notification"

### Option B: Custom Webhook (Advanced)

If you need custom notification formatting:

1. Create a Slack app at [api.slack.com](https://api.slack.com/apps)
2. Add "Incoming Webhooks" feature
3. Create webhook for your desired channel
4. In Sentry → Settings → Integrations → Webhooks
5. Add webhook URL and configure payload

## Step 4: Configure Alert Rules

Set up intelligent alerting to avoid spam:

### Recommended Alert Rules:

1. **Critical Errors** (Immediate notification):
   - Condition: "An error event is seen"
   - Filters: "level equals error" AND "environment equals production"
   - Action: Send Slack notification

2. **High Volume Errors** (Grouped notification):
   - Condition: "An error event is seen more than 10 times in 5 minutes"
   - Action: Send Slack notification (grouped)

3. **New Issues** (Daily digest):
   - Condition: "A new issue is created"
   - Action: Send Slack notification

## Step 5: Test the Integration

### Test Error Capture:

Add this temporary route to test error capture:

```typescript
// Add to src/app/api/test-error/route.ts (REMOVE AFTER TESTING)
import { NextResponse } from 'next/server';
import { captureError } from '~/utils/errorCapture';

export async function GET() {
  try {
    throw new Error('Test error for Sentry + Slack integration');
  } catch (error) {
    captureError(error, {
      operation: 'test_error',
      severity: 'error',
      metadata: { source: 'manual_test' }
    });
    
    return NextResponse.json({ message: 'Error captured and sent to Sentry' });
  }
}
```

### Test Steps:

1. Visit `/api/test-error` in your browser
2. Check Sentry dashboard for the error
3. Verify Slack notification was sent
4. **Remove the test route after verification**

## Step 6: Production Configuration

### Sentry Configuration:

Update `sentry.server.config.ts` for production:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
  environment: process.env.NODE_ENV,
});
```

### Slack Channel Setup:

Create dedicated channels:
- `#alerts-critical` - For immediate action items
- `#alerts-errors` - For general error monitoring  
- `#alerts-warnings` - For non-critical issues

## Monitoring Best Practices

### 1. Error Categorization
Our error capture utility automatically categorizes:
- **Auth errors** → `#alerts-critical`
- **API errors** → `#alerts-errors`
- **Email errors** → `#alerts-warnings`
- **Database errors** → `#alerts-critical`

### 2. Alert Fatigue Prevention
- Use rate limiting (max 1 alert per 5 minutes per error type)
- Group similar errors together
- Set up digest notifications for low-priority issues

### 3. Context-Rich Alerts
Alerts include:
- User ID (when available)
- Operation being performed
- Request details
- Stack trace
- Environment information

## Verification Checklist

- [ ] Sentry project created and configured
- [ ] Environment variables set correctly
- [ ] Slack integration connected
- [ ] Alert rules configured
- [ ] Test error successfully captured
- [ ] Slack notification received
- [ ] Test route removed from codebase
- [ ] Production sampling rates configured

## Troubleshooting

### Common Issues:

1. **No errors appearing in Sentry**:
   - Check `SENTRY_DSN` is correct
   - Verify environment isn't being skipped
   - Check browser console for Sentry errors

2. **Slack notifications not working**:
   - Verify Slack integration is properly connected
   - Check alert rule conditions match your test
   - Ensure bot has permission to post in channel

3. **Too many notifications**:
   - Adjust alert rule thresholds
   - Add rate limiting
   - Use digest notifications for non-critical alerts

### Support:
- Sentry docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Slack integration: https://docs.sentry.io/product/integrations/notification-incidents/slack/