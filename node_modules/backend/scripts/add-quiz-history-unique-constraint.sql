-- Migration: Add unique constraint to quiz_history to prevent duplicates
-- This script safely adds the constraint after removing any existing duplicates

-- First, identify and remove duplicates (keep the latest one for each user_id + session_id combination)
WITH duplicates AS (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY user_id, session_id ORDER BY played_at DESC, id DESC) as rn
    FROM quiz_history
)
DELETE FROM quiz_history 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Add the unique constraint
ALTER TABLE quiz_history ADD CONSTRAINT unique_user_session 
UNIQUE (user_id, session_id);

-- Display summary
SELECT 
    'Migration completed' as status,
    COUNT(*) as total_records
FROM quiz_history;
