-- Update existing ApplicationQuestion records to make most questions required
-- Keep Twitter, GitHub, and LinkedIn as optional (required = false)
-- Make all other questions required (required = true)

UPDATE "ApplicationQuestion" 
SET "required" = true 
WHERE "questionKey" NOT IN ('twitter', 'github', 'linkedin') 
AND "required" = false;

-- This migration affects the following question keys (making them required):
-- telegram, commitments, how_heard, technical_skills_other, 
-- realfi_interest, privacy_tools, funding_mechanisms, impact_measurement,
-- connections_sought, cohort_contribution, intro_video_link, 
-- additional_info, newsletter_subscription