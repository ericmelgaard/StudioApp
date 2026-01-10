/*
  # Add Display Content Configuration Support

  1. Purpose
    - Document the configuration jsonb field structure for display content URLs
    - The existing `configuration` field in displays table will store temporary content data
    - No schema changes needed - this migration documents the structure

  2. Configuration Structure
    The `configuration` jsonb field supports:
    - `preview_url` (text) - Full live preview URL with query parameters for iframe display
    - `screenshot_url` (text) - URL to static screenshot in Supabase storage (DQ folder)
    - `is_temporary_content` (boolean) - Flag indicating temporary content assignment
    - `content_notes` (text) - Optional notes about the temporary assignment
    - `assigned_at` (timestamp) - When the temporary content was assigned
    - `assigned_by` (text) - User who assigned the temporary content

  3. Example Configuration
    {
      "preview_url": "https://trm.wandcorp.com/cms_mediafiles/preview/wandplayerjs/index.html?currentTime=2026-01-10T12:47:43Z&workingPath=...",
      "screenshot_url": "https://[project].supabase.co/storage/v1/object/public/DQ/screenshots/display-123.jpg",
      "is_temporary_content": true,
      "content_notes": "Drive Thru - Burgers display for Dairy Queen Lab",
      "assigned_at": "2026-01-10T12:47:43Z",
      "assigned_by": "operator@example.com"
    }

  4. Notes
    - This leverages the existing configuration field without schema changes
    - Screenshots should be stored in Supabase storage under the DQ folder
    - The preview_url includes all necessary parameters for the Wand player
*/

-- Add comment to the configuration column for documentation
COMMENT ON COLUMN displays.configuration IS 'Display-specific settings including temporary content URLs (preview_url, screenshot_url, is_temporary_content, content_notes, assigned_at, assigned_by)';
