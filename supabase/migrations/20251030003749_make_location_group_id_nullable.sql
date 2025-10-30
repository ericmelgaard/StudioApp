/*
  # Make location_group_id nullable in stores table

  1. Changes
    - Allow `location_group_id` to be NULL in stores table
    - Some stores link directly to companies without a location group
  
  2. Notes
    - Stores can now have either:
      - location_group_id (for stores under a group)
      - Just company_id (for stores directly under a company)
*/

ALTER TABLE stores ALTER COLUMN location_group_id DROP NOT NULL;