/*
  # Fix Theme Schema Field Types

  1. Changes
    - Change display_type_ids from bigint[] to uuid[]
    - Change daypart_ids from bigint[] to uuid[]
    - Both display_types and daypart_definitions use UUID primary keys
    
  2. Notes
    - This corrects the data types to match the actual ID types in the referenced tables
    - No data loss since the fields were just created and unused
*/

-- Drop the existing columns with wrong type
ALTER TABLE themes DROP COLUMN IF EXISTS display_type_ids;
ALTER TABLE themes DROP COLUMN IF EXISTS daypart_ids;

-- Add them back with correct UUID array type
ALTER TABLE themes ADD COLUMN display_type_ids uuid[];
ALTER TABLE themes ADD COLUMN daypart_ids uuid[];

-- Add comments for documentation
COMMENT ON COLUMN themes.display_type_ids IS 'Array of display type IDs (UUIDs) this theme supports. NULL means no restrictions.';
COMMENT ON COLUMN themes.daypart_ids IS 'Array of daypart definition IDs (UUIDs) this theme includes. NULL means no restrictions.';
