# EAS Integration — Deployment Guide

Deploy on-chain attestations for GitHub activity tracking using Ethereum Attestation Service.

## Prerequisites

Before deploying, ensure:

- [ ] Access to production database
- [ ] Wallet with ETH on Optimism (for gas fees)
- [x] Schema registered (same UID on both networks):
  - **Optimism Mainnet:** [View on EAS Explorer](https://optimism.easscan.org/schema/view/0x2a6c47616c877586c9b94bfee775d192e0017e0c454c1a300392a2375d0e5490)
  - **Optimism Sepolia:** [View on EAS Explorer](https://optimism-sepolia.easscan.org/schema/view/0x2a6c47616c877586c9b94bfee775d192e0017e0c454c1a300392a2375d0e5490)

## Environment Variables

Add these to your production environment:

```bash
# Required for attestations
EAS_PRIVATE_KEY=0x...              # Wallet private key for signing attestations
EAS_SCHEMA_UID=0x2a6c47616c877586c9b94bfee775d192e0017e0c454c1a300392a2375d0e5490

# Feature flags
EAS_ATTESTATIONS_ENABLED=true      # Enable attestations in sync script
EAS_USE_MAINNET=false              # false = Optimism Sepolia, true = Optimism Mainnet
```

| Variable | Required | Description |
|----------|----------|-------------|
| `EAS_PRIVATE_KEY` | Yes | Wallet private key (with 0x prefix) |
| `EAS_SCHEMA_UID` | Yes | Registered schema ID on EAS |
| `EAS_ATTESTATIONS_ENABLED` | Yes | Set to `true` to enable |
| `EAS_USE_MAINNET` | No | Default `false` (testnet) |

## Deployment Steps

### Step 1: Run Database Migration

The `Attestation` table must exist before creating attestations.

```bash
# For production — apply existing migrations
bunx prisma migrate deploy

# For local development — apply and generate client
bunx prisma migrate dev
```

**Verify:** Check that the migration created the `Attestation` table:
```bash
bunx prisma studio
# Look for "Attestation" model in the left sidebar
```

### Step 2: Deploy Application

Deploy with the new environment variables set.

```bash
# If using Vercel
vercel env pull
vercel deploy --prod
```

### Step 3: Verify Integration

Run a sync to test attestation creation:

```bash
# Sync a single event (attestations created automatically if enabled)
bun run scripts/sync-github-activity.ts <event-id>
```

**Expected output (when working):**
```
[1/5] 🔄 Syncing: Project Name
   URL: https://github.com/org/repo
   📈 Lifetime: 142 commits, ✓ active
   🎯 Residency: 38 commits
   ✓ Attestation: 0x1234...abcd
   ✓ Success
```

**Verify on EAS Explorer:**
- Testnet: https://optimism-sepolia.easscan.org/schema/view/0x2a6c47616c877586c9b94bfee775d192e0017e0c454c1a300392a2375d0e5490
- Mainnet: https://optimism.easscan.org/schema/view/<schema-uid>

### Step 4: Run Historical Batch (Optional)

Create retroactive weekly attestations for past residency activity:

```bash
# Dry run first — see what would be attested
bun run scripts/attest-ba-historical.ts --event-id <event-id> --dry-run

# Real run — creates on-chain attestations
bun run scripts/attest-ba-historical.ts --event-id <event-id>
```

**Expected output:**
```
BA Historical Attestation Script
============================================================
Event ID: funding-commons-residency-2025
Mode: LIVE

Event: Funding Commons Residency 2025
Period: 2025-01-06 to 2025-03-28

Found 12 repositories with residency metrics

──────────────────────────────────────────────────────
Project: Astral SDK
Repository: astral-sdk
  Reconstructed 12 weekly snapshots
  Week 2025-01-06: 0xabc123...
  Week 2025-01-13: 0xdef456...
  ...

============================================================
SUMMARY
============================================================
Created: 84 attestations
```

## Troubleshooting

### "EAS_PRIVATE_KEY environment variable is required"
**Cause:** Missing wallet private key
**Fix:** Add `EAS_PRIVATE_KEY=0x...` to environment

### "Schema UID not set"
**Cause:** Missing schema configuration
**Fix:** Add `EAS_SCHEMA_UID=0x2a6c...` to environment

### "Attestation failed (sync still succeeded)"
**Cause:** Attestation error but sync completed normally
**Fix:** Check wallet has ETH for gas, verify RPC connectivity

### "Attestation model does not exist"
**Cause:** Migration not run
**Fix:** Run `bunx prisma migrate deploy` (production) or `bunx prisma migrate dev` (local)

### Attestations not appearing in EAS Explorer
**Cause:** Wrong network or transaction pending
**Fix:**
1. Check `EAS_USE_MAINNET` matches intended network
2. Wait for transaction confirmation (~2-5 seconds on Optimism)
3. Verify wallet has sufficient ETH for gas

## Rollback

To disable attestations without code changes:

```bash
# Set environment variable
EAS_ATTESTATIONS_ENABLED=false
```

Existing attestations remain on-chain (immutable), but no new ones will be created.

## Architecture Reference

```
┌─────────────────────────────────────────────────────────────┐
│ sync-github-activity.ts                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GitHub API ──► GitHubService ──► DB (Repository)           │
│                                      │                      │
│                          if EAS_ATTESTATIONS_ENABLED        │
│                                      │                      │
│                                      ▼                      │
│                              EASService                     │
│                                      │                      │
│                                      ▼                      │
│                        EAS Contract (Optimism)              │
│                                      │                      │
│                                      ▼                      │
│                           DB (Attestation)                  │
└─────────────────────────────────────────────────────────────┘
```

## Gas Costs

Optimism has low gas fees:
- Single attestation: ~$0.01-0.05
- Schema registration: ~$0.05-0.10
- Historical batch (100 attestations): ~$1-5

Ensure wallet has at least 0.01 ETH on Optimism for initial testing.

## Resources

- [EAS Documentation](https://docs.attest.org/docs/developer-tools/eas-sdk)
- [EAS Explorer (Testnet)](https://optimism-sepolia.easscan.org)
- [EAS Explorer (Mainnet)](https://optimism.easscan.org)
- [Optimism Bridge](https://app.optimism.io/bridge) — bridge ETH to Optimism
- [Implementation Spec](../EAS_IMPLEMENTATION_SPEC.md) — technical details
