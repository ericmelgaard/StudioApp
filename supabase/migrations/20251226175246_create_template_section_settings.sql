/*
  # Create Template Section Settings System

  1. New Tables
    - `template_section_settings`
      - `id` (uuid, primary key)
      - `template_id` (uuid, references product_attribute_templates)
      - `section_id` (uuid, references attribute_sections)
      - `is_enabled` (boolean, default true)
      - `concept_id` (bigint, nullable, references concepts)
      - `company_id` (bigint, nullable, references companies)
      - `store_id` (bigint, nullable, references stores)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `template_section_settings` table
    - Add policies for authenticated and unauthenticated users to read and manage settings

  3. Indexes
    - Add indexes on template_id, section_id for query performance
    - Add unique constraint on template_id, section_id, location combination

  4. Functions
    - Create function to get effective section settings with CCS inheritance
*/

CREATE TABLE IF NOT EXISTS template_section_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES product_attribute_templates(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES attribute_sections(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  concept_id bigint REFERENCES concepts(id) ON DELETE CASCADE,
  company_id bigint REFERENCES companies(id) ON DELETE CASCADE,
  store_id bigint REFERENCES stores(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT template_section_settings_unique_location
    UNIQUE (template_id, section_id, concept_id, company_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_template_section_settings_template_id
  ON template_section_settings(template_id);

CREATE INDEX IF NOT EXISTS idx_template_section_settings_section_id
  ON template_section_settings(section_id);

CREATE INDEX IF NOT EXISTS idx_template_section_settings_concept_id
  ON template_section_settings(concept_id) WHERE concept_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_template_section_settings_company_id
  ON template_section_settings(company_id) WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_template_section_settings_store_id
  ON template_section_settings(store_id) WHERE store_id IS NOT NULL;

ALTER TABLE template_section_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view template section settings"
  ON template_section_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert template section settings"
  ON template_section_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update template section settings"
  ON template_section_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete template section settings"
  ON template_section_settings FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow unauthenticated users to view template section settings"
  ON template_section_settings FOR SELECT
  TO anon
  USING (true);

CREATE OR REPLACE FUNCTION get_effective_section_settings(
  p_template_id uuid,
  p_concept_id bigint DEFAULT NULL,
  p_company_id bigint DEFAULT NULL,
  p_store_id bigint DEFAULT NULL
)
RETURNS TABLE (
  section_id uuid,
  section_name text,
  section_label text,
  section_type text,
  section_order integer,
  is_enabled boolean,
  is_inherited boolean,
  inherited_from text
) AS $$
BEGIN
  RETURN QUERY
  WITH location_settings AS (
    SELECT
      tss.section_id,
      tss.is_enabled,
      CASE
        WHEN tss.store_id IS NOT NULL THEN 'store'
        WHEN tss.company_id IS NOT NULL THEN 'company'
        WHEN tss.concept_id IS NOT NULL THEN 'concept'
        ELSE 'wand'
      END as setting_level,
      CASE
        WHEN tss.store_id IS NOT NULL THEN 4
        WHEN tss.company_id IS NOT NULL THEN 3
        WHEN tss.concept_id IS NOT NULL THEN 2
        ELSE 1
      END as level_priority
    FROM template_section_settings tss
    WHERE tss.template_id = p_template_id
      AND (
        (tss.store_id IS NULL AND tss.company_id IS NULL AND tss.concept_id IS NULL)
        OR (tss.concept_id = p_concept_id AND tss.company_id IS NULL AND tss.store_id IS NULL)
        OR (tss.company_id = p_company_id AND tss.store_id IS NULL)
        OR (tss.store_id = p_store_id)
      )
  ),
  most_specific_settings AS (
    SELECT DISTINCT ON (ls.section_id)
      ls.section_id,
      ls.is_enabled,
      ls.setting_level,
      ls.level_priority
    FROM location_settings ls
    ORDER BY ls.section_id, ls.level_priority DESC
  )
  SELECT
    s.id as section_id,
    s.name as section_name,
    s.label as section_label,
    s.section_type,
    s.display_order as section_order,
    COALESCE(mss.is_enabled, true) as is_enabled,
    CASE
      WHEN mss.section_id IS NULL THEN true
      WHEN p_store_id IS NOT NULL AND mss.setting_level != 'store' THEN true
      WHEN p_company_id IS NOT NULL AND mss.setting_level NOT IN ('company', 'store') THEN true
      WHEN p_concept_id IS NOT NULL AND mss.setting_level NOT IN ('concept', 'company', 'store') THEN true
      ELSE false
    END as is_inherited,
    CASE
      WHEN mss.section_id IS NULL THEN 'default'
      ELSE mss.setting_level
    END as inherited_from
  FROM attribute_sections s
  LEFT JOIN most_specific_settings mss ON mss.section_id = s.id
  ORDER BY s.display_order;
END;
$$ LANGUAGE plpgsql STABLE;