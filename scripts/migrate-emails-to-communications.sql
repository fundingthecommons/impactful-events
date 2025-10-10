-- Data migration script: Copy existing Email records to Communication table
-- This script migrates existing email data to the new unified Communication model

-- Insert all existing emails as EMAIL channel communications
INSERT INTO "Communication" (
    "id",
    "applicationId", 
    "eventId",
    "toEmail",
    "channel",
    "subject",
    "htmlContent", 
    "textContent",
    "fromEmail",
    "type",
    "status",
    "missingFields",
    "createdBy",
    "sentAt",
    "failureReason", 
    "postmarkId",
    "templateName",
    "templateVersion",
    "templateData",
    "openedAt",
    "clickedAt",
    "createdAt",
    "updatedAt"
)
SELECT 
    "id",
    "applicationId",
    "eventId", 
    "toEmail",
    'EMAIL'::"CommunicationType" AS "channel",
    "subject",
    "htmlContent",
    COALESCE("textContent", '') AS "textContent", -- Ensure textContent is not null
    "fromEmail",
    CASE 
        -- Map EmailType to CommunicationContentType
        WHEN "type" = 'APPLICATION_SUBMITTED'::"EmailType" THEN 'APPLICATION_SUBMITTED'::"CommunicationContentType"
        WHEN "type" = 'APPLICATION_ACCEPTED'::"EmailType" THEN 'APPLICATION_ACCEPTED'::"CommunicationContentType"
        WHEN "type" = 'APPLICATION_REJECTED'::"EmailType" THEN 'APPLICATION_REJECTED'::"CommunicationContentType"
        WHEN "type" = 'APPLICATION_WAITLISTED'::"EmailType" THEN 'APPLICATION_WAITLISTED'::"CommunicationContentType"
        WHEN "type" = 'APPLICATION_UNDER_REVIEW'::"EmailType" THEN 'APPLICATION_UNDER_REVIEW'::"CommunicationContentType"
        WHEN "type" = 'APPLICATION_MISSING_INFO'::"EmailType" THEN 'APPLICATION_MISSING_INFO'::"CommunicationContentType"
        WHEN "type" = 'INVITATION_EVENT_ROLE'::"EmailType" THEN 'INVITATION_EVENT_ROLE'::"CommunicationContentType"
        WHEN "type" = 'INVITATION_ADMIN'::"EmailType" THEN 'INVITATION_ADMIN'::"CommunicationContentType"
        WHEN "type" = 'GENERAL'::"EmailType" THEN 'GENERAL'::"CommunicationContentType"
        WHEN "type" = 'TEST'::"EmailType" THEN 'TEST'::"CommunicationContentType"
        WHEN "type" = 'MISSING_INFO'::"EmailType" THEN 'MISSING_INFO'::"CommunicationContentType"
        WHEN "type" = 'STATUS_UPDATE'::"EmailType" THEN 'STATUS_UPDATE'::"CommunicationContentType"
        ELSE 'GENERAL'::"CommunicationContentType"
    END AS "type",
    CASE
        -- Map EmailStatus to CommunicationStatus  
        WHEN "status" = 'DRAFT'::"EmailStatus" THEN 'DRAFT'::"CommunicationStatus"
        WHEN "status" = 'QUEUED'::"EmailStatus" THEN 'QUEUED'::"CommunicationStatus"
        WHEN "status" = 'SENT'::"EmailStatus" THEN 'SENT'::"CommunicationStatus"
        WHEN "status" = 'FAILED'::"EmailStatus" THEN 'FAILED'::"CommunicationStatus"
        WHEN "status" = 'CANCELLED'::"EmailStatus" THEN 'CANCELLED'::"CommunicationStatus"
        ELSE 'DRAFT'::"CommunicationStatus"
    END AS "status",
    "missingFields",
    "createdBy",
    "sentAt",
    "failureReason",
    "postmarkId",
    "templateName",
    "templateVersion", 
    "templateData",
    "openedAt",
    "clickedAt",
    "createdAt",
    "updatedAt"
FROM "Email"
WHERE NOT EXISTS (
    -- Avoid duplicates if script is run multiple times
    SELECT 1 FROM "Communication" c WHERE c."id" = "Email"."id"
);

-- Print migration summary
SELECT 
    'Email-to-Communication Migration Complete' AS status,
    COUNT(*) AS "records_migrated"
FROM "Communication" 
WHERE "channel" = 'EMAIL';