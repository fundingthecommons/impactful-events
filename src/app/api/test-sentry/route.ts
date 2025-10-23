import { NextResponse } from 'next/server';
import { captureError } from '~/utils/errorCapture';

// TEMPORARY ROUTE FOR TESTING SENTRY INTEGRATION
// TODO: Remove this route after verifying Sentry + Slack integration works

export async function GET() {
  try {
    // Simulate different types of errors to test categorization
    const errorType = Math.random();
    
    if (errorType < 0.33) {
      // Test API error
      throw new Error('Test API error: Database connection failed');
    } else if (errorType < 0.66) {
      // Test auth error  
      throw new Error('Test Auth error: Invalid token provided');
    } else {
      // Test general error
      throw new Error('Test General error: Unexpected application state');
    }
  } catch (error) {
    // Capture error with context
    captureError(error, {
      operation: 'sentry_integration_test',
      severity: 'error',
      metadata: { 
        source: 'manual_test',
        timestamp: new Date().toISOString(),
        testType: 'sentry_slack_integration'
      }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Test error captured and sent to Sentry',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}