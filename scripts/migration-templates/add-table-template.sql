/*
  # Add Table Template

  1. New Tables
    - `[TABLE_NAME]`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - [OTHER COLUMNS]

  2. Security
    - Enable RLS on `[TABLE_NAME]` table
    - Add policies for authenticated users
*/

-- Create table with IF NOT EXISTS for safety
CREATE TABLE IF NOT EXISTS [TABLE_NAME] (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Add your columns here
  -- [COLUMN_NAME] [DATA_TYPE] [CONSTRAINTS],

  CONSTRAINT [TABLE_NAME]_pkey PRIMARY KEY (id)
);

-- Enable Row Level Security
ALTER TABLE [TABLE_NAME] ENABLE ROW LEVEL SECURITY;

-- Create policies (customize based on your needs)
CREATE POLICY "Users can view own [TABLE_NAME]"
  ON [TABLE_NAME] FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own [TABLE_NAME]"
  ON [TABLE_NAME] FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own [TABLE_NAME]"
  ON [TABLE_NAME] FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own [TABLE_NAME]"
  ON [TABLE_NAME] FOR DELETE
  TO authenticated
  USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_[TABLE_NAME]_created_at
  ON [TABLE_NAME](created_at);

-- Add table comment
COMMENT ON TABLE [TABLE_NAME] IS '[DESCRIPTION]';
