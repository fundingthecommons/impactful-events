#!/usr/bin/env tsx
/**
 * Quick test script to verify AT Proto configuration
 * Run with: bun run scripts/test-atproto-config.ts
 */

import { env } from "~/env.js";
import { isEncryptionConfigured, encrypt, decrypt } from "~/utils/encryption";

console.log("🔍 AT Proto Configuration Test\n");
console.log("━".repeat(50));

// Test 1: Environment Variables
console.log("\n📋 Environment Variables:");
console.log(`  ATPROTO_PDS_URL: ${env.ATPROTO_PDS_URL}`);
console.log(`  ATPROTO_ENCRYPTION_KEY: ${env.ATPROTO_ENCRYPTION_KEY ? `✅ Configured (${env.ATPROTO_ENCRYPTION_KEY.length} chars)` : "❌ Not configured"}`);

// Test 2: Encryption Configuration
console.log("\n🔐 Encryption Test:");
const encryptionConfigured = isEncryptionConfigured();
console.log(`  Encryption configured: ${encryptionConfigured ? "✅ Yes" : "❌ No"}`);

// Test 3: Encryption Round-trip
if (encryptionConfigured) {
  try {
    const testData = "test-jwt-token-12345";
    console.log(`  Test data: "${testData}"`);

    const encrypted = encrypt(testData);
    console.log(`  Encrypted: ${encrypted.substring(0, 40)}...`);

    const decrypted = decrypt(encrypted);
    console.log(`  Decrypted: "${decrypted}"`);

    const testPassed = testData === decrypted;
    console.log(`  Round-trip test: ${testPassed ? "✅ PASSED" : "❌ FAILED"}`);

    if (!testPassed) {
      console.log(`    Expected: "${testData}"`);
      console.log(`    Got: "${decrypted}"`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`  ❌ Encryption test failed:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
} else {
  console.log("  ⚠️  Skipping encryption test - not configured");
  process.exit(1);
}

console.log("\n━".repeat(50));
console.log("✅ All tests passed! AT Proto is ready to use.\n");
console.log("Next steps:");
console.log("  1. Restart your dev server: bun run dev");
console.log("  2. Visit a project page you own");
console.log("  3. Click 'Connect AT Proto'");
console.log("  4. Use handle: james.pds-eu-west4.test.certified.app");
