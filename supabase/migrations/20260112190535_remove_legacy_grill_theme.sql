/*
  # Remove Legacy Grill Theme

  1. Changes
    - Delete the default "Grill" theme and its associated theme_content records
    - This was a test/demo theme that shouldn't appear in production environments
    
  2. Safety
    - Verified no placement_routines reference this theme before deletion
    - Cascading delete will remove associated theme_content records
    
  3. Notes
    - This theme was originally created for testing routine functionality
    - Removing to clean up demo/test data from production database
*/

-- Delete theme_content records for the Grill theme
DELETE FROM theme_content
WHERE theme_id IN (SELECT id FROM themes WHERE name = 'Grill');

-- Delete the Grill theme itself
DELETE FROM themes
WHERE name = 'Grill';
