# EAS Integration — Implementation Summary

Complete summary of the Ethereum Attestation Service integration for on-chain GitHub activity tracking.

## What Was Built

### 1. EAS Service Layer

**File:** `src/server/services/eas.ts`

Server-side service for creating on-chain attestations on Optimism using the EAS SDK.

- Creates attestations from repository metrics
- Signs with platform wallet (server-side)
- Stores attestation records in database
- Supports both testnet (OP Sepolia) and OP mainnet

**Schema (registered on both networks):**
```
projectId: string      # Platform project ID
repositoryId: string   # Repository ID
totalCommits: uint32   # Commit count at attestation time
lastCommitDate: uint64 # Unix timestamp
weeksActive: uint16    # Weeks with activity
isActive: bool         # Active in last 30 days
snapshotDate: uint64   # When the data was captured
isRetroactive: bool    # True for historical attestations
```

**Schema UID:** `0x2a6c47616c877586c9b94bfee775d192e0017e0c454c1a300392a2375d0e5490` ([OP Sepolia EASScan](https://optimism-sepolia.easscan.org/schema/view/0x2a6c47616c877586c9b94bfee775d192e0017e0c454c1a300392a2375d0e5490) and [OP EASScan](https://optimism-sepolia.easscan.org/schema/view/0x2a6c47616c877586c9b94bfee775d192e0017e0c454c1a300392a2375d0e5490))

---

### 2. Database Model

**File:** `prisma/schema.prisma`

```prisma
model Attestation {
  id            String   @id @default(cuid())
  uid           String   @unique  // EAS attestation UID
  repositoryId  String
  schemaId      String
  chain         String   @default("optimism")
  data          Json               // Attestation payload
  snapshotDate  DateTime
  isRetroactive Boolean  @default(false)
  createdAt     DateTime @default(now())

  repository    Repository @relation(...)
}
```

**Migration:** `20250119224839_add_attestation_model`

---

### 3. Sync Script Integration

**File:** `scripts/sync-github-activity.ts`

Added attestation step to existing GitHub sync workflow:

```
GitHub API → GitHubService → DB (Repository)
                                    ↓
                          if EAS_ATTESTATIONS_ENABLED
                                    ↓
                              EASService
                                    ↓
                          EAS Contract (Optimism)
                                    ↓
                           DB (Attestation)
```

- Attestations created automatically after successful sync
- Behind `EAS_ATTESTATIONS_ENABLED` feature flag
- Attestation failure does NOT break sync (fail-safe)

---

### 4. Historical Batch Script

**File:** `scripts/attest-historical.ts`

Creates retroactive weekly attestations for any residency event:

- Accepts `--event-id` parameter to target any residency
- Reads `commitsData` timeline from DB (no GitHub API calls)
- Reconstructs weekly snapshots from commit history
- Creates attestation for each week showing activity progression
- Supports `--dry-run` flag for testing

**Usage:**
```bash
# Dry run - preview what would be attested
bunx tsx scripts/attest-historical.ts --event-id <event-id> --dry-run

# Live run - create on-chain attestations
bunx tsx scripts/attest-historical.ts --event-id funding-commons-residency-2025
bunx tsx scripts/attest-historical.ts --event-id chiang-mai-residency-2024
```

---

### 5. UI Visualization

Added attestation display to both public and event-specific project pages.

#### Overview Tab — Quick View

**Files:**
- `src/app/projects/[projectId]/ProjectDetailClient.tsx`
- `src/app/events/[eventId]/projects/[projectId]/ProjectDetailClient.tsx`

Expandable section under each repository showing:
- Date | Commit count badge | View link to EAS Explorer

#### Impact Tab — Detailed Table

**Files:**
- `src/app/projects/[projectId]/ImpactTab.tsx`
- `src/app/events/[eventId]/projects/[projectId]/ImpactTab.tsx`

Accordion item in Standard Metrics section with table showing:
| Date | Repository | Total Commits | Weeks Active | Type | Attestation |

**Type badge:** "Historical" (orange) or "Live" (green)

#### API Endpoint

**File:** `src/server/api/routers/project.ts`

New procedure: `getProjectAttestations`
- Returns all attestations for a project with repository context
- Used by Impact tab for detailed view

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/server/services/eas.ts` | NEW | EAS attestation service |
| `prisma/schema.prisma` | MODIFY | Added Attestation model |
| `scripts/sync-github-activity.ts` | MODIFY | Added attestation step |
| `scripts/attest-historical.ts` | NEW | Historical batch script (any residency) |
| `src/server/api/routers/project.ts` | MODIFY | Added attestations to queries |
| `src/app/projects/[projectId]/ProjectDetailClient.tsx` | MODIFY | Added quick-view UI |
| `src/app/projects/[projectId]/ImpactTab.tsx` | MODIFY | Added attestations table |
| `src/app/events/[eventId]/projects/[projectId]/ProjectDetailClient.tsx` | MODIFY | Added quick-view UI |
| `src/app/events/[eventId]/projects/[projectId]/ImpactTab.tsx` | MODIFY | Added attestations table |
| `prisma/seed.ts` | MODIFY | Added test data for local testing |

---

## Commits

| Commit | Description |
|--------|-------------|
| `f3ece55` | Prisma schema + migration |
| `8e326e0` | EASService + env vars + packages |
| `c47253b` | Unit tests (16 passing) |
| `8bf9237` | Integrate attestation into sync script |
| `a74611c` | BA historical batch script |
| `143ff90` | Fix EAS SDK transaction response format |
| `c3cbc0a` | Add deployment documentation |
| `f145c9f` | Add implementation spec |
| `068b1db` | Add seed data for local testing |
| `12f0ab6` | Add local testing section to deployment guide |
| `b381f18` | Add attestation visualization to project pages |

**Branch:** `feat/eas-integration`

---

## Environment Variables

```bash
# Required
EAS_PRIVATE_KEY=0x...              # Wallet private key
EAS_SCHEMA_UID=0x2a6c47616c877586c9b94bfee775d192e0017e0c454c1a300392a2375d0e5490

# Feature flags
EAS_ATTESTATIONS_ENABLED=true      # Enable in sync script
EAS_USE_MAINNET=false              # false = Sepolia, true = Mainnet
```

---

## Testing Verification

### Testnet (Optimism Sepolia)
- Schema registered and verified
- Multiple attestations created successfully
- UI displays attestations with correct links

### Test Data
Seed includes **Relay Funder** project with:
- Real commit history from BA residency
- 4 pre-created attestations for UI testing

---

## EAS Explorer Links

- **Schema (OP Sepolia):** https://optimism-sepolia.easscan.org/schema/view/0x2a6c47616c877586c9b94bfee775d192e0017e0c454c1a300392a2375d0e5490
- **Schema (OP Mainnet):** https://optimism.easscan.org/schema/view/0x2a6c47616c877586c9b94bfee775d192e0017e0c454c1a300392a2375d0e5490

---

## What Was NOT Built (Deferred)

- UI trigger button for manual sync+attest (easy to add later)
- User-signed attestations (platform signs all currently)
- Location attestations
- OSO integration

---

## Related Documentation

- [Implementation Spec](./EAS_IMPLEMENTATION_SPEC.md) — Original technical plan
- [Deployment Guide](./EAS_DEPLOYMENT.md) — How to deploy and operate
