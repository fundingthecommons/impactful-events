# Contact Application Matching

This document describes the Contact Application Matching feature that automatically extracts contact information from event applications and syncs it with the contacts database.

## Overview

The Contact Application Matching system processes all application responses to extract contact information and intelligently match or create contact records. This eliminates manual data entry and ensures that valuable contact information from applications is preserved in the centralized contacts database.

## Architecture

### Core Components

1. **Data Extraction** (`extractContactFromApplication`)
2. **Smart Matching** (`upsertContactFromApplication`) 
3. **Batch Processing** (`matchEventApplicants` tRPC endpoint)
4. **User Interface** (Match Event Applicants button)

### Data Flow

```
Applications → Extract Contact Data → Match Existing Contacts → Create/Update → Refresh UI
```

## Implementation Details

### 1. Data Extraction (`extractContactFromApplication`)

**Location**: `src/server/api/routers/contact.ts`

Maps specific ApplicationQuestion IDs to contact fields:

| ApplicationQuestion ID | Contact Field | Processing |
|------------------------|---------------|------------|
| `cmeh86ipf000guo436knsqluc` | `full_name` | Split into firstName/lastName |
| `cmeh86isu000muo43h8ju1wit` | `twitter` | Remove @ symbol, validate format |
| `cmeh86itn000ouo43ycs8sygw` | `github` | Remove @ symbol, extract username |
| `cmeh86iuj000quo43em4nevxd` | `linkedIn` | Extract profile URL or username |
| `cmeh86ive000suo43k2edx15q` | `telegram` | Remove @ symbol, validate username |

**Data Cleaning Features**:
- Splits full names intelligently (handles multi-word surnames)
- Removes social media prefixes (@, https://, etc.)
- Validates username formats
- Handles empty/null responses gracefully

### 2. Smart Matching Logic (`upsertContactFromApplication`)

**Primary Matching Strategy**:
1. **Email Match**: Attempts to find existing contact by email address (primary key)
2. **Telegram Fallback**: If no email match, tries to match by telegram username
3. **Create New**: Creates new contact if no matches found

**Data Merging Rules**:
- Preserves existing non-empty fields
- Only overwrites empty fields with new data
- Always updates `updatedAt` timestamp
- Logs all merge decisions for debugging

**Example Merge Logic**:
```typescript
// Keep existing data if present, otherwise use new data
firstName: existingContact.firstName || contactData.firstName,
lastName: existingContact.lastName || contactData.lastName,
twitter: existingContact.twitter || contactData.twitter,
// etc.
```

### 3. Batch Processing (`matchEventApplicants`)

**Endpoint**: `POST /api/trpc/contact.matchEventApplicants`

**Process**:
1. Fetches all applications with responses and questions
2. Iterates through each application
3. Extracts contact data using mapping function
4. Attempts to match/create contact record
5. Tracks statistics and errors
6. Returns comprehensive results

**Error Handling**:
- Continues processing if individual applications fail
- Logs detailed error information
- Returns error count in final statistics

### 4. User Interface

**Location**: `src/app/contacts/ContactsClient.tsx`

**Features**:
- Prominent placement as first section on contacts page
- Loading states during processing
- Detailed success messaging with statistics
- Error display with actionable messages
- Automatic contacts list refresh after completion

**Success Message Example**:
```
Successfully processed applications!
Processed 150 applications: 45 contacts created, 32 updated, 2 errors
```

## Database Schema

### Required Tables

**Contact Model** (existing fields used):
```prisma
model Contact {
  id        String   @id @default(cuid())
  email     String   @unique
  firstName String?
  lastName  String?
  phone     String?
  twitter   String?
  github    String?
  linkedIn  String?
  telegram  String?
  // ... other fields
}
```

**Application/Response Models** (read-only):
```prisma
model Application {
  id        String @id @default(cuid())
  email     String
  responses ApplicationResponse[]
}

model ApplicationResponse {
  id         String @id @default(cuid())
  questionId String
  answer     String
  question   ApplicationQuestion @relation(fields: [questionId], references: [id])
}
```

## Usage Instructions

### For End Users

1. Navigate to `/contacts` page
2. Locate the "Match Event Applicants" section (first section)
3. Click "Match Event Applicants" button
4. Wait for processing to complete
5. Review success/error messages
6. Check updated contacts list

### For Developers

**Adding New Question Mappings**:

1. Update the `questionMapping` object in `extractContactFromApplication`:
```typescript
const questionMapping = {
  'existing-question-id': 'existing_field',
  'new-question-id': 'new_field_name',  // Add new mapping
} as const;
```

2. Add corresponding data extraction logic:
```typescript
if (questionMapping[questionId] === 'new_field_name') {
  // Add custom processing logic
  extractedData.newField = processNewFieldData(answer);
}
```

3. Ensure Contact model has the required field

**Debugging**:

All operations are logged with structured information:
- Application processing status
- Contact matching decisions  
- Data merge operations
- Error details with context

Check application logs for detailed processing information.

## Configuration

### Required ApplicationQuestion IDs

The system requires these specific question IDs to be present in your database:

- **Full Name**: `cmeh86ipf000guo436knsqluc`
- **Twitter**: `cmeh86isu000muo43h8ju1wit`  
- **GitHub**: `cmeh86itn000ouo43ycs8sygw`
- **LinkedIn**: `cmeh86iuj000quo43em4nevxd`
- **Telegram**: `cmeh86ive000suo43k2edx15q`

If your application uses different question IDs, update the `questionMapping` object in the extraction function.

### Performance Considerations

- Processing time scales with number of applications
- Large datasets (>1000 applications) may take several seconds
- Database operations are optimized with single queries per contact
- Error handling ensures processing continues even if individual records fail

## Security & Privacy

- Only processes applications the authenticated user has access to
- Contact data is handled according to existing privacy policies
- No sensitive authentication data is processed
- All operations respect existing database permissions
- Audit logging provides accountability for data changes

## Monitoring & Maintenance

**Key Metrics**:
- Applications processed per run
- Contacts created vs updated ratio  
- Error rate and types
- Processing time

**Regular Maintenance**:
- Review error logs for patterns
- Update question mappings as forms evolve
- Monitor processing performance
- Verify data quality after bulk operations

## Troubleshooting

### Common Issues

**"No contacts created"**:
- Verify ApplicationQuestion IDs match your database
- Check that applications have the expected response format
- Ensure Contact model has required fields

**"High error count"**:
- Review application logs for specific error messages
- Check for data format inconsistencies
- Verify database constraints are not violated

**"Processing takes too long"**:
- Consider adding pagination for very large datasets
- Monitor database performance during processing
- Implement progress indicators for better UX

### Error Codes

- **Extraction Error**: Failed to parse application response data
- **Matching Error**: Unable to identify or create contact record
- **Database Error**: Constraint violation or connection issue
- **Validation Error**: Contact data doesn't meet schema requirements