/*
  # Seed Default Template Section Settings

  1. Seed Data
    - Populate template_section_settings with default enabled state for all templates
    - Link all sections to all templates with is_enabled = true at WAND level
    - Only insert if no settings exist yet for that template-section combination

  2. Purpose
    - Ensure all existing templates have section visibility settings
    - All sections start as enabled by default
    - Settings are created at WAND level (concept_id, company_id, store_id all NULL)
*/

INSERT INTO template_section_settings (template_id, section_id, is_enabled, concept_id, company_id, store_id)
SELECT 
  t.id as template_id,
  s.id as section_id,
  true as is_enabled,
  NULL as concept_id,
  NULL as company_id,
  NULL as store_id
FROM product_attribute_templates t
CROSS JOIN attribute_sections s
ON CONFLICT (template_id, section_id, concept_id, company_id, store_id) DO NOTHING;