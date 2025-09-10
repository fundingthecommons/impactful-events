# Admin Scripts

This directory contains administrative scripts for managing application data and fixing system issues.

## Application Status Management

### analyze-draft-applications.ts

**Purpose**: Identify DRAFT applications that should have SUBMITTED status due to system bugs.

**When to use**:
- When investigating application status inconsistencies
- Before running bulk status updates
- For regular application health checks
- When users report submission issues

**How to run**:
```bash
bunx tsx scripts/admin/analyze-draft-applications.ts
```

**What it does**:
1. Finds all DRAFT applications with `submittedAt` timestamps
2. Validates each application using the same logic as "Check for Missing Information"
3. Identifies which applications should be SUBMITTED but aren't
4. Saves analysis results to `/tmp/draft-applications-analysis.json`
5. Generates a comprehensive report

**Safe to run**: ✅ Read-only analysis, no database changes

### fix-draft-applications.ts

**Purpose**: Batch update DRAFT applications to SUBMITTED status based on Phase 1 analysis.

**When to use**:
- Only after running `analyze-draft-applications.ts` first
- When analysis confirms applications need status correction
- For fixing bulk application status bugs

**How to run**:
```bash
# Dry run first (recommended)
bunx tsx scripts/admin/fix-draft-applications.ts --dry-run

# Live update (after dry run validation)
bunx tsx scripts/admin/fix-draft-applications.ts
```

**What it does**:
1. Reads analysis results from Phase 1
2. Double-validates each application before updating
3. Updates status from DRAFT → SUBMITTED with proper timestamps
4. Maintains audit trail of all changes
5. Generates batch update report

**Safety features**:
- Requires Phase 1 analysis results
- Double-validates before each update
- Supports dry-run mode
- Comprehensive error handling
- Audit trail logging

## Usage Workflow

1. **Investigation**: Run analysis script to identify issues
2. **Validation**: Review analysis results and decide if fixes are needed  
3. **Dry Run**: Test batch fix with `--dry-run` flag
4. **Execute**: Run live batch fix if dry run looks good
5. **Verify**: Check application statuses in admin panel

## Historical Context

These scripts were created to address a bug where submitted applications were incorrectly reverting to DRAFT status due to aggressive auto-reversion logic in the completion status checker.

**Root Cause**: `updateApplicationCompletionStatus` was reverting SUBMITTED → DRAFT on any field update, even from auto-save functionality.

**Fix Applied**: 
- Updated reversion logic to be context-aware (distinguishes auto-save vs intentional edits)
- Modified frontend to skip auto-save for non-DRAFT applications
- Added comprehensive validation and batch fix capabilities

**Status**: Bug resolved. These scripts remain as operational tools for future issues.

## Safety Notes

- Always run analysis script first before batch updates
- Use dry-run mode to validate changes before applying them
- These scripts respect the same validation logic as the admin panel
- All changes are logged for audit purposes
- Scripts include comprehensive error handling and validation