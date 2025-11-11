/*
  # Add Column Template

  1. Changes
    - Add new column to [TABLE_NAME]

  2. Security
    - Maintains existing RLS policies
    - Column is nullable to avoid data issues
*/

-- Add column with IF NOT EXISTS for safety
ALTER TABLE [TABLE_NAME]
  ADD COLUMN IF NOT EXISTS [COLUMN_NAME] [DATA_TYPE] DEFAULT [DEFAULT_VALUE];

-- Add comment for documentation
COMMENT ON COLUMN [TABLE_NAME].[COLUMN_NAME] IS '[DESCRIPTION]';

-- Optional: Create index if needed for queries
-- CREATE INDEX IF NOT EXISTS idx_[TABLE_NAME]_[COLUMN_NAME]
--   ON [TABLE_NAME]([COLUMN_NAME]);
