-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "surname" TEXT;

-- Data Migration: Split existing name field into firstName and surname
-- Handle names with spaces: "John Doe" -> firstName="John", surname="Doe"
-- Handle single names: "Madonna" -> firstName="Madonna", surname=""
-- Handle nulls: keep firstName and surname as null
UPDATE "User"
SET
  "firstName" = CASE
    WHEN "name" IS NULL THEN NULL
    WHEN position(' ' in "name") > 0 THEN split_part("name", ' ', 1)
    ELSE "name"
  END,
  "surname" = CASE
    WHEN "name" IS NULL THEN NULL
    WHEN position(' ' in "name") > 0 THEN substring("name" from position(' ' in "name") + 1)
    ELSE ''
  END
WHERE "name" IS NOT NULL;
