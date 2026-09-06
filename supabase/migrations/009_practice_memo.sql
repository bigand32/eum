-- Add memo column to practice_records
ALTER TABLE practice_records ADD COLUMN IF NOT EXISTS memo text;
