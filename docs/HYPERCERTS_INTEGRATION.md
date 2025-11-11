# Hypercerts Integration with Custom PDS

This guide explains how to use the Hypercerts lexicon with your custom AT Proto PDS to create impact certificates for projects.

## Overview

The Hypercerts lexicon (`org.hypercerts.claim`) is a custom AT Proto record type that allows you to create **verifiable impact certificates** stored directly on your Personal Data Server (PDS).

## What is a Hypercert?

A hypercert is a record that tracks:
- **What** work was done (title, description, scope)
- **When** the work happened (time frame)
- **Where** the work was located
- **Who** contributed to the work
- **Evidence** supporting the impact claims
- **Rights** associated with the work

## Architecture

```
┌─────────────────┐
│   Your Project  │
│   (Platform)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Hypercerts     │─────▶│  Custom PDS      │
│  Service        │      │  (AT Proto)      │
└─────────────────┘      └──────────────────┘
         │
         ▼
┌─────────────────┐
│  org.hypercerts │
│  .claim Record  │
└─────────────────┘
```

## Setup

### 1. Prerequisites

✅ Custom PDS configured (already done)
✅ AT Proto account connected (via Connect AT Proto button)
✅ Environment variables set:
```bash
ATPROTO_PDS_URL="https://pds-eu-west4.test.certified.app"
ATPROTO_ENCRYPTION_KEY="<your-key>"
```

### 2. Hypercerts Service

The `HypercertsService` (in `src/server/services/hypercerts.ts`) provides methods to:
- **Create** hypercert records
- **List** all hypercerts for a user
- **Get** a specific hypercert by ID

## Usage Examples

### Example 1: Create a Hypercert for a Project

```typescript
import { createHypercertsService } from "~/server/services/hypercerts";
import { db } from "~/server/db";

const hypercertsService = createHypercertsService(db);

const result = await hypercertsService.createHypercert(userId, {
  // Required fields
  title: "The Commons - Platform",
  shortDescription: "Built an impact tracking platform for public goods funding",
  workScope: "Full-stack web development, database design, UI/UX",
  workTimeFrameFrom: "2025-01-01T00:00:00Z",
  workTimeFrameTo: "2025-11-11T00:00:00Z",

  // Optional fields
  description: "Detailed description of the impact work...",
  image: "https://example.com/project-banner.png",
});

console.log("Hypercert URI:", result.uri);
// Output: at://did:plc:63ohi2g5n5xlqgd5z3isdbyx/org.hypercerts.claim/xxxxx
```

### Example 2: List All Hypercerts

```typescript
const hypercerts = await hypercertsService.listHypercerts(userId, 20);

hypercerts.forEach(cert => {
  console.log(`${cert.value.title} (${cert.value.workTimeFrameFrom} - ${cert.value.workTimeFrameTo})`);
});
```

### Example 3: Get a Specific Hypercert

```typescript
const rkey = "3m5d5rbeajk27"; // From the URI
const hypercert = await hypercertsService.getHypercert(userId, rkey);

console.log(hypercert.value.title);
console.log(hypercert.value.workScope);
```

## Record Structure

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Title of the hypercert (max 256 chars) |
| `shortDescription` | string | Short blurb (max 300 graphemes) |
| `workScope` | string | Scope of work (max 1000 graphemes) |
| `workTimeFrameFrom` | datetime | When work began |
| `workTimeFrameTo` | datetime | When work ended |
| `createdAt` | datetime | Record creation timestamp |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Longer description (max 3000 graphemes) |
| `image` | URI or blob | Visual representation |
| `evidence` | array | Strong refs to evidence records |
| `contributions` | array | Strong refs to contributor records |
| `rights` | strongRef | Rights associated with the work |
| `location` | strongRef | Geographic location |

## Integration with Platform Projects

### Automatic Hypercert Creation

You can automatically create hypercerts when projects reach certain milestones:

```typescript
// In your project completion handler
async function onProjectComplete(projectId: string) {
  const project = await db.userProject.findUnique({
    where: { id: projectId },
    include: { event: true, author: true },
  });

  if (!project) return;

  const hypercertsService = createHypercertsService(db);

  await hypercertsService.createHypercert(project.authorId, {
    title: project.title,
    shortDescription: project.description ?? "Project completed",
    workScope: project.technologies.join(", "),
    workTimeFrameFrom: project.createdAt.toISOString(),
    workTimeFrameTo: new Date().toISOString(),
    image: project.bannerUrl ?? project.imageUrl,
  });
}
```

### UI Integration

Add a "Create Hypercert" button to project pages:

```tsx
<Button
  onClick={async () => {
    const result = await createHypercertMutation.mutateAsync({
      projectId: project.id,
    });

    notifications.show({
      title: "Hypercert Created!",
      message: `URI: ${result.uri}`,
    });
  }}
>
  Create Hypercert
</Button>
```

## Viewing Hypercerts

### On Your Custom PDS

You can query hypercerts directly from your PDS:

```bash
# List all hypercerts
curl "https://pds-eu-west4.test.certified.app/xrpc/com.atproto.repo.listRecords?repo=did:plc:63ohi2g5n5xlqgd5z3isdbyx&collection=org.hypercerts.claim"

# Get specific hypercert
curl "https://pds-eu-west4.test.certified.app/xrpc/com.atproto.repo.getRecord?repo=did:plc:63ohi2g5n5xlqgd5z3isdbyx&collection=org.hypercerts.claim&rkey=3m5d5rbeajk27"
```

### In Your Application

Add a "Hypercerts" tab to the project page (similar to the SDS tab) to display all hypercerts associated with the project.

## Advanced: Evidence and Contributions

### Creating Evidence Records

Evidence records support your hypercert claims:

```typescript
// First, create evidence records
const evidenceUri = await agent.com.atproto.repo.createRecord({
  repo: did,
  collection: "org.hypercerts.claim.evidence",
  record: {
    $type: "org.hypercerts.claim.evidence",
    description: "GitHub commits showing development work",
    url: "https://github.com/user/repo/commits/main",
    type: "github_commits",
    createdAt: new Date().toISOString(),
  },
});

// Then reference it in the hypercert
await hypercertsService.createHypercert(userId, {
  // ... other fields
  evidence: [
    {
      uri: evidenceUri.uri,
      cid: evidenceUri.cid,
    }
  ],
});
```

### Linking Contributors

Link team members as contributors:

```typescript
// Create contribution records for each team member
const contributions = await Promise.all(
  collaborators.map(async (collab) => {
    return agent.com.atproto.repo.createRecord({
      repo: did,
      collection: "org.hypercerts.claim.contributions",
      record: {
        $type: "org.hypercerts.claim.contributions",
        contributor: collab.did,
        role: collab.role,
        percentage: 25, // Contribution percentage
        createdAt: new Date().toISOString(),
      },
    });
  })
);

// Reference in hypercert
await hypercertsService.createHypercert(userId, {
  // ... other fields
  contributions: contributions.map(c => ({
    uri: c.uri,
    cid: c.cid,
  })),
});
```

## Testing

Run the example script to test hypercert creation:

```bash
bun run scripts/example-create-hypercert.ts
```

## Next Steps

1. **Add tRPC Router**: Create `src/server/api/routers/hypercerts.ts` for API endpoints
2. **Add UI Components**: Build hypercerts display in project pages
3. **Add Hypercerts Tab**: Similar to SDS tab, show all hypercerts
4. **Automatic Creation**: Create hypercerts on project milestones
5. **Evidence Integration**: Link project updates as evidence
6. **Team Attribution**: Link collaborators as contributors

## Resources

- [AT Proto Documentation](https://atproto.com)
- [Hypercerts Documentation](https://hypercerts.org)
- [Lexicon Spec](https://atproto.com/specs/lexicon)
- [Your Custom PDS](https://pds-eu-west4.test.certified.app)

## Troubleshooting

**Issue**: "Collection not found"
- **Solution**: Your PDS may need to register the lexicon. Check PDS configuration.

**Issue**: "Authentication failed"
- **Solution**: Ensure you're connected via the "Connect AT Proto" button.

**Issue**: "Invalid record structure"
- **Solution**: Validate your data matches the lexicon schema exactly.

## Security Notes

- ✅ Hypercerts are stored on your PDS (you control the data)
- ✅ Credentials are encrypted server-side
- ✅ All creation is authenticated via AT Proto sessions
- ⚠️  Once created, records are immutable (can't be edited, only deleted)
- ⚠️  Evidence and contribution records should be created before the hypercert
